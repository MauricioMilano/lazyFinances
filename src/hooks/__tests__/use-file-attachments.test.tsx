import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFileAttachments } from '../use-file-attachments';
import { useFinanceStore } from '@/store/finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';

vi.mock('@/utils/ai-extraction', () => ({
  extractTransactions: vi.fn().mockResolvedValue([]),
  fetchModels: vi.fn(),
}));

const initialUpload = { isProcessing: false, current: 0, total: 0, fileName: '' };

const originalActions = {
  addTransaction: useFinanceStore.getState().addTransaction,
  addTransactions: useFinanceStore.getState().addTransactions,
  updateTransaction: useFinanceStore.getState().updateTransaction,
  deleteTransaction: useFinanceStore.getState().deleteTransaction,
  deleteTransactions: useFinanceStore.getState().deleteTransactions,
  addAccount: useFinanceStore.getState().addAccount,
  startProcessing: useFinanceStore.getState().startProcessing,
  updateProgress: useFinanceStore.getState().updateProgress,
  endProcessing: useFinanceStore.getState().endProcessing,
};

function makeFile(name: string, type: string, body = 'x'): File {
  return new File([body], name, { type });
}

describe('useFileAttachments', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: {
        transactions: [],
        accounts: DEFAULT_ACCOUNTS,
        config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
      },
      upload: initialUpload,
    });
  });
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useFinanceStore.setState({
      data: {
        transactions: [],
        accounts: DEFAULT_ACCOUNTS,
        config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
      },
      upload: initialUpload,
      ...originalActions,
    });
  });

  it('addFiles classifies MIME and extensions; rejects unsupported', () => {
    const { result } = renderHook(() => useFileAttachments());
    const files = [
      makeFile('a.png', 'image/png'),
      makeFile('b.pdf', 'application/pdf'),
      makeFile('c.csv', 'text/csv'),
      makeFile('d.zip', 'application/zip'),
    ];
    let summary = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      summary = result.current.addFiles(files);
    });
    expect(summary.added).toBe(3);
    expect(summary.rejected).toBe(1);
    expect(summary.skippedNames).toEqual([]);
    expect(result.current.attachments).toHaveLength(3);
  });

  it('deduplicates files with identical names within the same call and across calls', () => {
    const { result } = renderHook(() => useFileAttachments());
    let first = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      first = result.current.addFiles([
        makeFile('test.json', 'application/json'),
      ]);
    });
    expect(first.skippedNames).toEqual([]);

    let second = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      second = result.current.addFiles([
        makeFile('test.json', 'application/json'),
        makeFile('other.csv', 'text/csv'),
      ]);
    });
    expect(second.added).toBe(1);
    expect(second.rejected).toBe(0);
    expect(second.skippedNames).toEqual(['test.json']);
    expect(result.current.attachments).toHaveLength(2);

    let third = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      third = result.current.addFiles([
        makeFile('test.json', 'application/json'),
        makeFile('test.json', 'application/json'),
      ]);
    });
    expect(third.added).toBe(0);
    expect(third.skippedNames).toEqual(['test.json', 'test.json']);
  });

  it('treats filenames that differ only in case or NFC form as duplicates', () => {
    const { result } = renderHook(() => useFileAttachments());
    let summary = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      summary = result.current.addFiles([
        makeFile('test.json', 'application/json'),
      ]);
    });
    expect(summary.added).toBe(1);

    let caseDiff = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      caseDiff = result.current.addFiles([makeFile('TEST.json', 'application/json')]);
    });
    expect(caseDiff.added).toBe(0);
    expect(caseDiff.skippedNames).toEqual(['TEST.json']);
    expect(result.current.attachments).toHaveLength(1);
  });

  it('treats precomposed and decomposed Unicode filenames as duplicates', () => {
    const { result } = renderHook(() => useFileAttachments());
    let summary = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      summary = result.current.addFiles([
        // "café.json" precomposed (U+00E9)
        makeFile('caf\u00e9.json', 'application/json'),
      ]);
    });
    expect(summary.added).toBe(1);

    let decomposed = { added: 0, rejected: 0, skippedNames: [] as string[] };
    act(() => {
      decomposed = result.current.addFiles([
        // "café.json" decomposed (e + U+0301) — visually identical, codepoints differ
        makeFile('cafe\u0301.json', 'application/json'),
      ]);
    });
    expect(decomposed.added).toBe(0);
    expect(decomposed.skippedNames).toEqual(['cafe\u0301.json']);
    expect(result.current.attachments).toHaveLength(1);
  });

  it('remove revokes object URL on image attachments and drops the row', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const { result } = renderHook(() => useFileAttachments());
    act(() => {
      result.current.addFiles([makeFile('a.png', 'image/png')]);
    });
    expect(result.current.attachments).toHaveLength(1);
    const id = result.current.attachments[0].id;
    expect(result.current.attachments[0].previewUrl).toBeTruthy();
    act(() => {
      result.current.remove(id);
    });
    expect(result.current.attachments).toHaveLength(0);
    expect(revoke).toHaveBeenCalled();
  });

  it('processAll drives upload slice and marks attachments imported instead of removing them', async () => {
    const startProcessing = vi.fn();
    const updateProgress = vi.fn();
    const endProcessing = vi.fn();
    const addTransactions = vi.fn();
    useFinanceStore.setState((prev) => ({
      ...prev,
      startProcessing,
      updateProgress,
      endProcessing,
      addTransactions,
    }));

    const { result } = renderHook(() => useFileAttachments());
    act(() => {
      result.current.addFiles([makeFile('a.csv', 'text/csv', 'date,description,amount\n2026-07-23,Coffee,4.5\n')]);
    });
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].imported).toBeUndefined();

    await act(async () => {
      const r = await result.current.processAll({
        aiConfig: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'x' },
        accountId: DEFAULT_ACCOUNTS[0].id,
      });
      expect(r.transactions).toBe(1);
    });

    expect(startProcessing).toHaveBeenCalledWith(1);
    expect(addTransactions).toHaveBeenCalledTimes(1);
    expect(endProcessing).toHaveBeenCalled();
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].imported).toBe(true);
  });

  it('clear revokes all URLs and empties the list', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const { result } = renderHook(() => useFileAttachments());
    act(() => {
      result.current.addFiles([makeFile('a.png', 'image/png'), makeFile('b.png', 'image/png')]);
    });
    expect(result.current.attachments).toHaveLength(2);
    act(() => {
      result.current.clear();
    });
    expect(result.current.attachments).toHaveLength(0);
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('clear() during an in-flight processAll stops further processing for that batch', async () => {
    const addTransactions = vi.fn();
    useFinanceStore.setState((prev) => ({
      ...prev,
      startProcessing: vi.fn(),
      updateProgress: vi.fn(),
      endProcessing: vi.fn(),
      addTransactions,
    }));

    const { result } = renderHook(() => useFileAttachments());
    act(() => {
      result.current.addFiles([
        makeFile('a.csv', 'text/csv', 'date,description,amount\n2026-07-23,A,1\n'),
        makeFile('b.csv', 'text/csv', 'date,description,amount\n2026-07-24,B,2\n'),
      ]);
    });

    const processPromise = result.current.processAll({
      aiConfig: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'x' },
      accountId: DEFAULT_ACCOUNTS[0].id,
    });
    act(() => {
      result.current.clear();
    });
    await act(async () => {
      await processPromise;
    });

    expect(addTransactions).not.toHaveBeenCalled();
    expect(result.current.attachments).toHaveLength(0);
  });

  it('remove(id) deletes the imported transactions associated with that attachment', async () => {
    const { result } = renderHook(() => useFileAttachments());
    act(() => {
      result.current.addFiles([
        makeFile('a.csv', 'text/csv', 'date,description,amount\n2026-07-23,Coffee,4.5\n'),
      ]);
    });

    await act(async () => {
      await result.current.processAll({
        aiConfig: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'x' },
        accountId: DEFAULT_ACCOUNTS[0].id,
      });
    });

    expect(useFinanceStore.getState().data.transactions).toHaveLength(1);
    act(() => {
      result.current.remove(result.current.attachments[0].id);
    });
    expect(result.current.attachments).toHaveLength(0);
    expect(useFinanceStore.getState().data.transactions).toHaveLength(0);
  });

  it('clear() deletes every imported transaction associated with the queue', async () => {
    const { result } = renderHook(() => useFileAttachments());
    act(() => {
      result.current.addFiles([
        makeFile('a.csv', 'text/csv', 'date,description,amount\n2026-07-23,A,1\n'),
        makeFile('b.csv', 'text/csv', 'date,description,amount\n2026-07-24,B,2\n'),
      ]);
    });

    await act(async () => {
      await result.current.processAll({
        aiConfig: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'x' },
        accountId: DEFAULT_ACCOUNTS[0].id,
      });
    });

    expect(useFinanceStore.getState().data.transactions).toHaveLength(2);
    act(() => {
      result.current.clear();
    });
    expect(useFinanceStore.getState().data.transactions).toHaveLength(0);
    expect(result.current.attachments).toHaveLength(0);
  });

  it('clears the attachment queue when every transaction in the store is removed', async () => {
    const deleteTransaction = useFinanceStore.getState().deleteTransaction;
    const { result } = renderHook(() => useFileAttachments());
    act(() => {
      result.current.addFiles([
        makeFile('a.csv', 'text/csv', 'date,description,amount\n2026-07-23,A,1\n'),
      ]);
    });

    await act(async () => {
      await result.current.processAll({
        aiConfig: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'x' },
        accountId: DEFAULT_ACCOUNTS[0].id,
      });
    });
    expect(useFinanceStore.getState().data.transactions).toHaveLength(1);
    expect(result.current.attachments).toHaveLength(1);

    await act(async () => {
      for (const t of useFinanceStore.getState().data.transactions) {
        deleteTransaction(t.id);
      }
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(useFinanceStore.getState().data.transactions).toHaveLength(0);
    expect(result.current.attachments).toHaveLength(0);
  });
});
