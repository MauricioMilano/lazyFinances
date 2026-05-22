export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  accountId: string;
  type: 'income' | 'expense';
  status: 'confirmed' | 'pending';
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

export interface LMStudioConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface FinanceData {
  transactions: Transaction[];
  accounts: Account[];
  config: LMStudioConfig;
}
