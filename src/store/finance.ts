import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Transaction, Account, LMStudioConfig, FinanceData } from '../types/finance';

const STORAGE_KEY = 'aether_finance_data';

const DEFAULT_CONFIG: LMStudioConfig = {
  baseUrl: 'http://localhost:1234/v1',
  apiKey: 'lm-studio',
  model: 'llama-3.2-vision',
};

const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: 'Main Checking', balance: 0, currency: 'USD' },
  { id: '2', name: 'Savings', balance: 0, currency: 'USD' },
];

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
  updateConfig: (config: LMStudioConfig) => void;
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

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      data: {
        transactions: [],
        accounts: DEFAULT_ACCOUNTS,
        config: DEFAULT_CONFIG,
      },
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

      updateConfig: (config) =>
        set((state) => ({
          data: { ...state.data, config },
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
