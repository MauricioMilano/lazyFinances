import { useState, useEffect } from 'react';
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

export function useFinance() {
  const [data, setData] = useState<FinanceData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse finance data', e);
      }
    }
    return {
      transactions: [],
      accounts: DEFAULT_ACCOUNTS,
      config: DEFAULT_CONFIG,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
    };
    setData((prev) => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
    }));
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  };

  const deleteTransaction = (id: string) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const updateConfig = (config: LMStudioConfig) => {
    setData((prev) => ({ ...prev, config }));
  };

  const addAccount = (account: Omit<Account, 'id'>) => {
    const newAccount = {
      ...account,
      id: crypto.randomUUID(),
    };
    setData((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }));
  };

  return {
    data,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateConfig,
    addAccount,
  };
}
