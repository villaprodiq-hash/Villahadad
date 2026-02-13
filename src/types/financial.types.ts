import { Currency } from './shared.types';

// Expense Category
export type ExpenseCategory =
  | 'rent'
  | 'salaries'
  | 'equipment'
  | 'marketing'
  | 'services'
  | 'printing'
  | 'other';

// Expense Interface
export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  date: string;
  note?: string;
  exchangeRate?: number; // Exchange rate at time of creation (IQD per USD)
}

// Package Data Interface
export interface PackageData {
  id: string;
  categoryId: string;
  title: string;
  price: number;
  currency: Currency;
  features: string[];
}

// Album Print Cost Constant
export const ALBUM_PRINT_COST = 50000; // Cost in IQD
