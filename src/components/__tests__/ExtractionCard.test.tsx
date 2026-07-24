import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtractionCard } from '../ExtractionCard';
import { useFinanceStore } from '@/store/finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';
import type { FinanceData } from '@/types/finance';

const emptyData: FinanceData = {
  transactions: [],
  accounts: DEFAULT_ACCOUNTS,
  config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
};

const initialUpload = { isProcessing: false, current: 0, total: 0, fileName: '' };

// Mock sonner to keep the toast portal out of jsdom
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock the AI extraction so the test does not hit the network
const extractTransactionsMock = vi.fn();
vi.mock('@/utils/ai-extraction', () => ({
  extractTransactions: (...args: unknown[]) => extractTransactionsMock(...args),
  fetchModels: vi.fn(),
}));

// Use a deterministic AI config to avoid LM Studio network calls
vi.mock('@/hooks/use-ai-config', () => ({
  useAIConfig: () => ({
    config: {
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'lm-studio',
      model: 'llama-3.2-vision',
    },
    updateConfig: vi.fn(),
  }),
}));

describe('ExtractionCard', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: emptyData,
      upload: initialUpload,
    });
    extractTransactionsMock.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('disables the upload button while isProcessing is true', () => {
    useFinanceStore.setState({
      data: emptyData,
      upload: { isProcessing: true, current: 1, total: 3, fileName: 'x.png' },
    });
    render(<ExtractionCard />);
    const label = screen.getByText(/Processing\.\.\./);
    expect(label).toBeInTheDocument();
  });

  it('calls extractTransactions once and addTransactions once for a single file', async () => {
    extractTransactionsMock.mockResolvedValueOnce([
      { date: '2026-07-23', amount: 10, description: 'Burger', type: 'expense' },
    ]);

    render(<ExtractionCard />);
    const file = new File(['dummy'], 'receipt.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(extractTransactionsMock).toHaveBeenCalledTimes(1);
    });

    const txs = useFinanceStore.getState().data.transactions;
    expect(txs).toHaveLength(1);
    expect(txs[0].description).toBe('Burger');

    // upload slice reset
    expect(useFinanceStore.getState().upload.isProcessing).toBe(false);
  });

  it('continues past a failing file and processes the next one', async () => {
    extractTransactionsMock
      .mockRejectedValueOnce(new Error('LM Studio down'))
      .mockResolvedValueOnce([{ date: '2026-07-23', amount: 1, description: 'OK' }]);

    render(<ExtractionCard />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const f1 = new File(['a'], 'a.png', { type: 'image/png' });
    const f2 = new File(['b'], 'b.png', { type: 'image/png' });

    await userEvent.upload(input, [f1, f2]);

    await waitFor(() => {
      expect(extractTransactionsMock).toHaveBeenCalledTimes(2);
    });

    const txs = useFinanceStore.getState().data.transactions;
    expect(txs).toHaveLength(1);
    expect(txs[0].description).toBe('OK');
  });
});
