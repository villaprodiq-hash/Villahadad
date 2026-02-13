import { Currency } from './shared.types';

// Transaction Type for client card additions
export type ClientTransactionType = 'credit_addition' | 'credit_deduction' | 'refund' | 'adjustment';

// Transaction Status
export type ClientTransactionStatus = 'active' | 'reversed' | 'pending';

// Main Client Transaction Interface
export interface ClientTransaction {
  id: string;
  clientId: string;
  bookingId?: string; // Optional: if related to a specific booking
  amount: number;
  currency: Currency;
  type: ClientTransactionType;
  note: string;
  status: ClientTransactionStatus;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // User info
  createdBy: string;
  createdByName: string;
  
  // Reversal info (for undo functionality)
  canReverseUntil: string; // ISO timestamp - 5 minutes from creation
  reversedAt?: string;
  reversedBy?: string;
  reversedByName?: string;
  reversalReason?: string;
  
  // Running balance snapshot
  balanceAfter: number;
}

// Client Balance Summary
export interface ClientBalance {
  clientId: string;
  totalAdditions: number;
  totalDeductions: number;
  currentBalance: number;
  currency: Currency;
  lastTransactionAt?: string;
}

// DTO for creating a new transaction
export interface CreateClientTransactionDTO {
  clientId: string;
  bookingId?: string;
  amount: number;
  currency: Currency;
  type: ClientTransactionType;
  note: string;
  createdBy: string;
  createdByName: string;
}

// DTO for reversing a transaction
export interface ReverseClientTransactionDTO {
  transactionId: string;
  reversedBy: string;
  reversedByName: string;
  reason?: string;
}

// Transaction with display info (for UI)
export interface ClientTransactionWithDisplay extends ClientTransaction {
  formattedAmount: string;
  formattedDate: string;
  formattedTime: string;
  isReversible: boolean;
  timeUntilExpiry: string; // "4:30" format
}

// Transaction summary for client card
export interface ClientTransactionSummary {
  totalTransactions: number;
  totalAdditions: number;
  totalDeductions: number;
  recentTransactions: ClientTransaction[];
}
