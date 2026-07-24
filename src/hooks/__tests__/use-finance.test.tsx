import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFinance } from '../use-finance';
import { useFinanceStore } from '@/store/finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';
import type { FinanceData } from '@/types/finance';

const emptyData: FinanceData = {
  transactions: [],
  accounts: DEFAULT_ACCOUNTS,
  config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
};

const initialUpload = { isProcessing: false, current: 0, total: 0, fileName: '' };

describe('useFinance', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: { ...emptyData, transactions: [] },
      upload: initialUpload,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exposes the expected shape from the store', () => {
    const { result } = renderHook(() => useFinance());
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('addTransaction');
    expect(result.current).toHaveProperty('addTransactions');
    expect(result.current).toHaveProperty('updateTransaction');
    expect(result.current).toHaveProperty('deleteTransaction');
    expect(result.current).toHaveProperty('addAccount');
    expect(typeof result.current.addTransaction).toBe('function');
  });

  it('reflects the current store data on first render', () => {
    const { result } = renderHook(() => useFinance());
    expect(result.current.data.accounts).toEqual(DEFAULT_ACCOUNTS);
    expect(result.current.data.transactions).toEqual([]);
  });

  it('updates `data` when the store changes', () => {
    const { result } = renderHook(() => useFinance());
    act(() => {
      result.current.addTransaction({
        date: '2026-07-23',
        description: 'Test',
        amount: 1,
        category: 'X',
        accountId: '1',
        type: 'expense',
        status: 'confirmed',
      });
    });
    expect(result.current.data.transactions).toHaveLength(1);
    expect(result.current.data.transactions[0].description).toBe('Test');
  });

  it('addAccount appends a new account', () => {
    const { result } = renderHook(() => useFinance());
    const before = result.current.data.accounts.length;
    act(() => {
      result.current.addAccount({ name: 'New', balance: 0, currency: 'USD' });
    });
    expect(result.current.data.accounts).toHaveLength(before + 1);
  });
});
