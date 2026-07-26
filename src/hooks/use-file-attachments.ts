import * as React from 'react';
import { inferSupportedType, isImage, SupportedType, parseFile } from '@/utils/file-parsers';
import { LMStudioConfig } from '@/types/finance';
import { useFinanceStore } from '@/store/finance';

export interface Attachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: SupportedType;
  previewUrl?: string;
  imported?: boolean;
  transactionIds?: string[];
}

export interface AddOptions {
  aiConfig: LMStudioConfig;
  accountId: string;
}

export interface UseFileAttachments {
  attachments: Attachment[];
  addFiles: (
    files: FileList | File[],
  ) => { added: number; rejected: number; skippedNames: string[] };
  remove: (id: string) => void;
  clear: () => void;
  processAll: (options: AddOptions) => Promise<{
    added: number;
    failed: number;
    transactions: number;
    warnings: string[];
  }>;
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeName(name: string): string {
  return name.normalize('NFC').toLowerCase();
}

function buildPreview(file: File, type: SupportedType): string | undefined {
  if (!isImage(type)) return undefined;
  return URL.createObjectURL(file);
}

export function useFileAttachments(): UseFileAttachments {
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const previewUrlsRef = React.useRef<Set<string>>(new Set());
  const attachmentsRef = React.useRef<Attachment[]>([]);
  const clearGenerationRef = React.useRef(0);

  React.useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const revoke = React.useCallback((url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  }, []);

  const transactionCount = useFinanceStore((s) => s.data.transactions.length);
  const prevTransactionCountRef = React.useRef<number>(-1);
  React.useEffect(() => {
    if (
      prevTransactionCountRef.current > 0 &&
      transactionCount === 0 &&
      attachments.length > 0
    ) {
      setAttachments((prev) => {
        prev.forEach((a) => revoke(a.previewUrl));
        return [];
      });
    }
    prevTransactionCountRef.current = transactionCount;
  }, [transactionCount, attachments.length, revoke]);

  React.useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const addFiles = React.useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      let added = 0;
      let rejected = 0;
      const skippedNames: string[] = [];
      const next: Attachment[] = [];
      const seenNames = new Set(
        attachmentsRef.current.map((a) => normalizeName(a.name)),
      );
      for (const file of list) {
        const type = inferSupportedType(file);
        if (!type) {
          rejected++;
          continue;
        }
        const resolvedName =
          file.name || `pasted-${crypto.randomUUID()}.${type}`;
        const normalized = normalizeName(resolvedName);
        if (seenNames.has(normalized)) {
          skippedNames.push(resolvedName);
          continue;
        }
        seenNames.add(normalized);
        const previewUrl = buildPreview(file, type);
        if (previewUrl) previewUrlsRef.current.add(previewUrl);
        next.push({
          id: crypto.randomUUID(),
          file,
          name: resolvedName,
          size: file.size,
          type,
          previewUrl,
        });
        added++;
      }
      if (next.length > 0) {
        setAttachments((prev) => [...prev, ...next]);
      }
      return { added, rejected, skippedNames };
    },
    [],
  );

  const remove = React.useCallback(
    (id: string) => {
      const deleteTransactions = useFinanceStore.getState().deleteTransactions;
      setAttachments((prev) => {
        const target = prev.find((a) => a.id === id);
        if (target?.previewUrl) revoke(target.previewUrl);
        if (target?.transactionIds && target.transactionIds.length > 0) {
          deleteTransactions(target.transactionIds);
        }
        return prev.filter((a) => a.id !== id);
      });
    },
    [revoke],
  );

  const clear = React.useCallback(() => {
    const deleteTransactions = useFinanceStore.getState().deleteTransactions;
    setAttachments((prev) => {
      prev.forEach((a) => revoke(a.previewUrl));
      const ids = prev.flatMap((a) => a.transactionIds ?? []);
      if (ids.length > 0) deleteTransactions(ids);
      return [];
    });
    clearGenerationRef.current += 1;
  }, [revoke]);

  const processAll = React.useCallback(
    async (options: AddOptions) => {
      const startProcessing = useFinanceStore.getState().startProcessing;
      const updateProgress = useFinanceStore.getState().updateProgress;
      const endProcessing = useFinanceStore.getState().endProcessing;
      const addTransactions = useFinanceStore.getState().addTransactions;

      const current = attachmentsRef.current;
      if (current.length === 0) {
        return { added: 0, failed: 0, transactions: 0, warnings: [] };
      }
      const startGen = clearGenerationRef.current;
      startProcessing(current.length);
      let added = 0;
      let failed = 0;
      let totalTransactions = 0;
      const warnings: string[] = [];

      for (let i = 0; i < current.length; i++) {
        if (clearGenerationRef.current !== startGen) break;
        const att = current[i];
        updateProgress(i + 1, att.name);
        try {
          const result = await parseFile(att.file, { aiConfig: options.aiConfig });
          if (clearGenerationRef.current !== startGen) break;
          if (result.warnings.length > 0) {
            warnings.push(`${att.name}: ${result.warnings.join('; ')}`);
          }
          const rows = result.transactions.map((t) => ({
            ...t,
            accountId: options.accountId,
          }));
          if (rows.length > 0) {
            const beforeIds = new Set(
              useFinanceStore.getState().data.transactions.map((t) => t.id),
            );
            addTransactions(rows);
            const afterIds = useFinanceStore
              .getState()
              .data.transactions
              .slice(0, rows.length)
              .map((t) => t.id)
              .filter((id) => !beforeIds.has(id));
            totalTransactions += rows.length;
            added++;
            if (afterIds.length > 0) {
              att.transactionIds = (att.transactionIds ?? []).concat(afterIds);
            }
          }
        } catch (error) {
          failed++;
          console.error(`Failed to process ${att.name}`, error);
          warnings.push(`${att.name}: ${(error as Error).message ?? String(error)}`);
        }
        if (clearGenerationRef.current === startGen) {
          setAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, imported: true } : a)),
          );
        }
      }

      endProcessing();
      return { added, failed, transactions: totalTransactions, warnings };
    },
    [revoke],
  );

  return { attachments, addFiles, remove, clear, processAll };
}

export { sizeLabel };
