import { useFinanceStore } from '../store/finance';

export function useFinance() {
  const data = useFinanceStore((s) => s.data);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const addTransactions = useFinanceStore((s) => s.addTransactions);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const addAccount = useFinanceStore((s) => s.addAccount);

  return {
    data,
    addTransaction,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    addAccount,
  };
}
