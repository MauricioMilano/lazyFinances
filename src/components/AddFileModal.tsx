import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileCode2,
  FileJson,
  Image as ImageIcon,
  Upload,
  X,
  ClipboardPaste,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useFinanceStore } from '@/store/finance';
import { useAIConfig } from '@/hooks/use-ai-config';
import { useFinance } from '@/hooks/use-finance';
import { useFileAttachments, sizeLabel, Attachment } from '@/hooks/use-file-attachments';
import { SupportedType } from '@/utils/file-parsers';
import { toast } from 'sonner';

const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,' +
  'application/pdf,' +
  'text/csv,application/csv,' +
  'application/json,text/json,' +
  'application/xml,text/xml,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const SUPPORTED_LABEL =
  'Supports PNG, JPEG, WebP, GIF, PDF, CSV, JSON, XML, XLS, XLSX';

function typeIcon(type: SupportedType): React.ReactNode {
  if (type === 'pdf') return <FileText className="h-5 w-5" aria-hidden />;
  if (type === 'csv' || type === 'xls' || type === 'xlsx')
    return <FileSpreadsheet className="h-5 w-5" aria-hidden />;
  if (type === 'json') return <FileJson className="h-5 w-5" aria-hidden />;
  if (type === 'xml') return <FileCode2 className="h-5 w-5" aria-hidden />;
  return <ImageIcon className="h-5 w-5" aria-hidden />;
}

function humanType(type: SupportedType): string {
  const map: Record<SupportedType, string> = {
    png: 'Image',
    jpeg: 'Image',
    webp: 'Image',
    gif: 'Image',
    pdf: 'PDF',
    csv: 'CSV',
    json: 'JSON',
    xml: 'XML',
    xls: 'Spreadsheet',
    xlsx: 'Spreadsheet',
  };
  return map[type];
}

interface AddFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controller: ReturnType<typeof useFileAttachments>;
}

export function AddFileModal({ open, onOpenChange, controller }: AddFileModalProps) {
  const { config } = useAIConfig();
  const { data } = useFinance();
  const upload = useFinanceStore((s) => s.upload);
  const accountId = data.accounts[0]?.id ?? '';
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const { attachments, addFiles, remove, clear, processAll } = controller;
  const pendingCount = attachments.filter((a) => !a.imported).length;
  const importedCount = attachments.length - pendingCount;

  const reportSkippedDuplicates = React.useCallback((names: string[]) => {
    if (names.length === 0) return;
    const prefix = names.length === 1 ? 'Duplicate skipped' : 'Duplicates skipped';
    const summary =
      names.length === 1
        ? names[0]
        : `${names[0]} (+${names.length - 1} more)`;
    toast.warning(`${prefix}: ${summary}`);
  }, []);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const result = addFiles(files);
    if (result.rejected > 0) {
      toast.error(`${result.rejected} file(s) skipped — unsupported type`);
    }
    reportSkippedDuplicates(result.skippedNames);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const result = addFiles(files);
    if (result.rejected > 0) {
      toast.error(`${result.rejected} file(s) skipped — unsupported type`);
    }
    reportSkippedDuplicates(result.skippedNames);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  React.useEffect(() => {
    if (!open) return;
    const onPaste = (ev: ClipboardEvent) => {
      const active = document.activeElement;
      const scoped = rootRef.current;
      const inModal =
        scoped !== null &&
        active !== null &&
        ((scoped === active) || scoped.contains(active) ||
          (active.tagName !== 'BODY' && active.closest('[role="dialog"]') !== null));
      if (!inModal) return;
      const items = ev.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== 'file') continue;
        const f = item.getAsFile();
        if (f) files.push(f);
      }
      if (files.length === 0) return;
      ev.preventDefault();
      const result = addFiles(files);
      if (result.rejected > 0) {
        toast.error(`${result.rejected} file(s) skipped — unsupported type`);
      }
      reportSkippedDuplicates(result.skippedNames);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open, addFiles]);

  const handleProcess = async () => {
    if (attachments.length === 0) return;
    if (!accountId) {
      toast.error('Add an account before processing files');
      return;
    }
    const result = await processAll({ aiConfig: config, accountId });
    const importedSomething = result.added > 0 || result.failed > 0;
    if (result.added === 0 && result.failed === 0) {
      toast.error('No transactions found in any file');
    } else if (result.failed > 0) {
      toast.info(
        `Imported ${result.transactions} transaction(s); ${result.failed} file(s) failed`,
      );
    } else {
      toast.success(`Imported ${result.transactions} transaction(s) from ${result.added} file(s)`);
    }
    if (importedSomething) {
      onOpenChange(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      onInteractOutside={(e) => {
        if (upload.isProcessing) e.preventDefault();
      }}
      onPointerDownOutside={(e) => {
        if (upload.isProcessing) e.preventDefault();
      }}
      dismissible={!upload.isProcessing}
    >
      <Modal.Header
        title="Add file"
        description="Drop a file, pick from your device, or paste with Ctrl/Cmd+V."
      />
      <Modal.Body>
        <div ref={rootRef} tabIndex={-1} className="grid gap-4 outline-none">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ' +
              (dragOver
                ? 'border-[#254fad] bg-[#f3f6fc]'
                : 'border-[#dddddd] bg-[#f8fafc]')
            }
          >
            <Upload className="h-6 w-6 text-[#41454d]" aria-hidden />
            <p className="text-sm text-[#41454d]">
              Drop files here
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => inputRef.current?.click()}
                disabled={upload.isProcessing}
              >
                <FolderOpen className="mr-1 h-4 w-4" aria-hidden />
                Pick from device
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-[#41454d]">
              <ClipboardPaste className="h-3 w-3" aria-hidden />
              Paste a file with Ctrl/Cmd+V
            </p>
            <p className="text-center text-[11px] uppercase tracking-wider text-[#41454d]/80">
              {SUPPORTED_LABEL}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={handlePick}
              disabled={upload.isProcessing}
            />
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {pendingCount} pending · {importedCount} imported
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-[#41454d]"
                  onClick={clear}
                  disabled={upload.isProcessing}
                >
                  Clear all
                </Button>
              </div>
              <ul className="grid gap-2">
                {attachments.map((att) => (
                  <AttachmentRow key={att.id} attachment={att} onRemove={remove} />
                ))}
              </ul>
              {upload.isProcessing && (
                <p className="flex items-center gap-2 text-xs text-[#41454d]">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Processing {upload.fileName || 'file'} ({upload.current}/{upload.total})
                </p>
              )}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          variant="ghost"
          className="rounded-lg text-[#aa2d00]"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
        <Button
          type="button"
          className="rounded-lg bg-[#181d26] text-white hover:bg-[#0d1218]"
          onClick={handleProcess}
          disabled={attachments.length === 0 || upload.isProcessing || !accountId}
        >
          {upload.isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Processing
            </>
          ) : (
            <>Process {pendingCount} file{pendingCount === 1 ? '' : 's'}</>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function AttachmentRow({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: (id: string) => void;
}) {
  const { id, name, size, type, previewUrl } = attachment;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-[#dddddd] bg-white p-2">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[#dddddd] bg-[#f8fafc] text-[#41454d]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          typeIcon(type)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#181d26]" title={name}>
          {name}
        </p>
        <p className="text-xs text-[#41454d]">
          {humanType(type)} · {sizeLabel(size)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${name}`}
        className="h-8 w-8 rounded-md text-[#aa2d00] hover:bg-[#fbeae6]"
        onClick={() => onRemove(id)}
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </li>
  );
}

export { ACCEPT, SUPPORTED_LABEL };
