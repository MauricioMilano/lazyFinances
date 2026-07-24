import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useFinanceStore } from '../finance';
import { DEFAULT_ACCOUNTS } from '@/lib/defaults';
import type { FinanceData, Transaction } from '@/types/finance';

const STORAGE_KEY = 'aether_finance_data';

const emptyData: FinanceData = {
  transactions: [],
  accounts: DEFAULT_ACCOUNTS,
  config: { baseUrl: 'http://localhost:1234/v1', apiKey: 'lm-studio', model: 'llama-3.2-vision' },
};

const initialUpload = { isProcessing: false, current: 0, total: 0, fileName: '' };

const buildTx = (overrides: Partial<Omit<Transaction, 'id'>> = {}) => ({
  date: '2026-07-23',
  description: 'Test purchase',
  amount: 12.5,
  category: 'Food',
  accountId: DEFAULT_ACCOUNTS[0].id,
  type: 'expense' as const,
  status: 'confirmed' as const,
  ...overrides,
});

describe('useFinanceStore', () => {
  beforeEach(() => {
    useFinanceStore.setState({
      data: { ...emptyData, transactions: [] },
      upload: initialUpload,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('addTransaction', () => {
    it('prepends a transaction with a UUID', () => {
      useFinanceStore.getState().addTransaction(buildTx({ description: 'Coffee' }));
      const txs = useFinanceStore.getState().data.transactions;
      expect(txs).toHaveLength(1);
      expect(txs[0]).toMatchObject({ description: 'Coffee', amount: 12.5 });
      expect(typeof txs[0].id).toBe('string');
      expect(txs[0].id.length).toBeGreaterThan(0);
    });

    it('keeps newer transactions at the head of the list', () => {
      useFinanceStore.getState().addTransaction(buildTx({ description: 'First' }));
      useFinanceStore.getState().addTransaction(buildTx({ description: 'Second' }));
      const txs = useFinanceStore.getState().data.transactions;
      expect(txs.map((t) => t.description)).toEqual(['Second', 'First']);
    });
  });

  describe('addTransactions', () => {
    it('prepends N transactions, all with UUIDs', () => {
      useFinanceStore.getState().addTransactions([
        buildTx({ description: 'A' }),
        buildTx({ description: 'B' }),
      ]);
      const txs = useFinanceStore.getState().data.transactions;
      expect(txs).toHaveLength(2);
      expect(txs.map((t) => t.description)).toEqual(['A', 'B']);
      expect(new Set(txs.map((t) => t.id)).size).toBe(2);
    });

    it('is a no-op on an empty array', () => {
      useFinanceStore.getState().addTransactions([]);
      expect(useFinanceStore.getState().data.transactions).toHaveLength(0);
    });
  });

  describe('updateTransaction', () => {
    it('patches only the matching id', () => {
      useFinanceStore.getState().addTransaction(buildTx({ description: 'A' }));
      const id = useFinanceStore.getState().data.transactions[0].id;
      useFinanceStore.getState().updateTransaction(id, { amount: 99 });
      const updated = useFinanceStore.getState().data.transactions[0];
      expect(updated.amount).toBe(99);
      expect(updated.description).toBe('A');
    });

    it('is a no-op for an unknown id', () => {
      useFinanceStore.getState().addTransaction(buildTx({ description: 'A' }));
      useFinanceStore.getState().updateTransaction('not-real', { amount: 99 });
      expect(useFinanceStore.getState().data.transactions[0].amount).toBe(12.5);
    });
  });

  describe('deleteTransaction', () => {
    it('removes the matching id', () => {
      useFinanceStore.getState().addTransaction(buildTx({ description: 'A' }));
      const id = useFinanceStore.getState().data.transactions[0].id;
      useFinanceStore.getState().deleteTransaction(id);
      expect(useFinanceStore.getState().data.transactions).toHaveLength(0);
    });
  });

  describe('addAccount', () => {
    it('appends a new account with a UUID', () => {
      const before = useFinanceStore.getState().data.accounts.length;
      useFinanceStore.getState().addAccount({
        name: 'Crypto',
        balance: 0,
        currency: 'USD',
      });
      const accounts = useFinanceStore.getState().data.accounts;
      expect(accounts).toHaveLength(before + 1);
      expect(accounts[accounts.length - 1].name).toBe('Crypto');
      expect(accounts[accounts.length - 1].id).toBeTruthy();
    });
  });

  describe('upload lifecycle', () => {
    it('startProcessing sets isProcessing + total', () => {
      useFinanceStore.getState().startProcessing(3);
      expect(useFinanceStore.getState().upload).toEqual({
        isProcessing: true,
        current: 0,
        total: 3,
        fileName: '',
      });
    });

    it('updateProgress updates current + fileName', () => {
      useFinanceStore.getState().startProcessing(3);
      useFinanceStore.getState().updateProgress(2, 'receipt.jpg');
      expect(useFinanceStore.getState().upload).toEqual({
        isProcessing: true,
        current: 2,
        total: 3,
        fileName: 'receipt.jpg',
      });
    });

    it('endProcessing resets the upload slice', () => {
      useFinanceStore.getState().startProcessing(3);
      useFinanceStore.getState().updateProgress(2, 'receipt.jpg');
      useFinanceStore.getState().endProcessing();
      expect(useFinanceStore.getState().upload).toEqual({
        isProcessing: false,
        current: 0,
        total: 0,
        fileName: '',
      });
    });
  });

  describe('persistence', () => {
    it('persists only the data slice (upload is excluded)', async () => {
      useFinanceStore.getState().addTransaction(buildTx({ description: 'persisted' }));
      useFinanceStore.getState().startProcessing(5);

      // Wait for the persist middleware to flush
      await new Promise((r) => setTimeout(r, 0));

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.data.transactions).toHaveLength(1);
      expect(parsed.state.upload).toBeUndefined();
    });
  });
});
