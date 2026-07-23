import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Transaction, Account, FinanceData } from '../types/finance';
import { DEFAULT_ACCOUNTS } from '../lib/defaults';

const STORAGE_KEY = 'aether_finance_data';

interface UploadState {
  isProcessing: boolean;
  current: number;
  total: number;
  fileName: string;
}

interface FinanceStore {
  data: FinanceData;
  upload: UploadState;

  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;

  startProcessing: (total: number) => void;
  updateProgress: (current: number, fileName: string) => void;
  endProcessing: () => void;
}

const initialUpload: UploadState = {
  isProcessing: false,
  current: 0,
  total: 0,
  fileName: '',
};

const initialData: FinanceData = {
  transactions: [],
  accounts: DEFAULT_ACCOUNTS,
};

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      data: initialData,
      upload: initialUpload,

      addTransaction: (transaction) =>
        set((state) => ({
          data: {
            ...state.data,
            transactions: [
              { ...transaction, id: crypto.randomUUID() },
              ...state.data.transactions,
            ],
          },
        })),

      addTransactions: (transactions) =>
        set((state) => {
          const newTransactions = transactions.map((t) => ({
            ...t,
            id: crypto.randomUUID(),
          }));
          return {
            data: {
              ...state.data,
              transactions: [...newTransactions, ...state.data.transactions],
            },
          };
        }),

      updateTransaction: (id, updates) =>
        set((state) => ({
          data: {
            ...state.data,
            transactions: state.data.transactions.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          },
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          data: {
            ...state.data,
            transactions: state.data.transactions.filter((t) => t.id !== id),
          },
        })),

      addAccount: (account) =>
        set((state) => ({
          data: {
            ...state.data,
            accounts: [
              ...state.data.accounts,
              { ...account, id: crypto.randomUUID() },
            ],
          },
        })),

      startProcessing: (total) =>
        set({ upload: { isProcessing: true, current: 0, total, fileName: '' } }),

      updateProgress: (current, fileName) =>
        set((state) => ({
          upload: { ...state.upload, current, fileName },
        })),

      endProcessing: () => set({ upload: initialUpload }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ data: state.data }),
    }
  )
);
