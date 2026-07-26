import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AirtableTable } from '../AirtableTable';
import { useFinanceStore } from '@/store/finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';
import type { FinanceData, Transaction } from '@/types/finance';

const baseTx: Transaction = {
  id: 'tx-1',
  date: '2026-07-23',
  description: 'Coffee',
  amount: 4.5,
  category: 'Food',
  accountId: '1',
  type: 'expense',
  status: 'confirmed',
};

const initialData: FinanceData = {
  transactions: [baseTx],
  accounts: DEFAULT_ACCOUNTS,
  config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
};

const initialUpload = { isProcessing: false, current: 0, total: 0, fileName: '' };

describe('AirtableTable', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: initialData,
      upload: initialUpload,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the empty state when there are no transactions and no upload is in progress', () => {
    useFinanceStore.setState({
      data: { ...initialData, transactions: [] },
      upload: initialUpload,
    });
    render(
      <AirtableTable
        transactions={[]}
        accounts={DEFAULT_ACCOUNTS}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(
      screen.getByText(/no transactions yet/i)
    ).toBeInTheDocument();
  });

  it('does NOT show the progress ribbon when isProcessing is false', () => {
    render(
      <AirtableTable
        transactions={[baseTx]}
        accounts={DEFAULT_ACCOUNTS}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText(/Processing/)).not.toBeInTheDocument();
  });

  it('shows the progress ribbon with file name + counter + percent when isProcessing is true', () => {
    useFinanceStore.setState({
      data: initialData,
      upload: { isProcessing: true, current: 3, total: 5, fileName: 'receipt-3.jpg' },
    });
    render(
      <AirtableTable
        transactions={[baseTx]}
        accounts={DEFAULT_ACCOUNTS}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/receipt-3\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    // 3/5 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('rounds the percent value (1/3 = 33%)', () => {
    useFinanceStore.setState({
      data: initialData,
      upload: { isProcessing: true, current: 1, total: 3, fileName: 'x.png' },
    });
    render(
      <AirtableTable
        transactions={[baseTx]}
        accounts={DEFAULT_ACCOUNTS}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('closes the bulk-delete confirm modal after the user confirms', async () => {
    const user = userEvent.setup();
    const txA: Transaction = { ...baseTx, id: 'tx-a', description: 'A' };
    const txB: Transaction = { ...baseTx, id: 'tx-b', description: 'B' };
    const txC: Transaction = { ...baseTx, id: 'tx-c', description: 'C' };
    useFinanceStore.setState({
      data: { ...initialData, transactions: [txA, txB, txC] },
      upload: initialUpload,
    });
    const onDelete = vi.fn();
    render(
      <AirtableTable
        transactions={[txA, txB, txC]}
        accounts={DEFAULT_ACCOUNTS}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />
    );

    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select transaction /i,
    });
    await user.click(rowCheckboxes[0]);
    await user.click(rowCheckboxes[1]);

    const bulkBtn = await screen.findByRole('button', { name: /remove 2 rows/i });
    await user.click(bulkBtn);

    const confirmBtn = await screen.findByRole('button', { name: /^delete$/i });
    await user.click(confirmBtn);

    expect(onDelete).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /^delete$/i }),
      ).not.toBeInTheDocument();
    });
  });
});
