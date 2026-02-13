import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Booking, Expense } from '../../../types';
import { electronBackend } from '../../../services/mockBackend';
import ProductTradingDashboard from './widgets/trading/ProductTradingDashboard';
import { Printer } from 'lucide-react'; // ✅ Import Printer
import { printFinancialReport } from '../../../utils/printFinancialReport'; // ✅ Import Utility

interface FinancialViewProps {
  bookings: Booking[];
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
}

const ManagerFinancialOverview: React.FC<FinancialViewProps> = ({ bookings, onUpdateBooking }) => {
  // Mock Expenses State (Initial fallback, will be updated by loadData)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const loadExpenses = async () => {
    try {
      const data = await electronBackend.getExpenses();
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();

    // Auto-refresh expenses on change
    const unsubscribe = electronBackend.subscribe(async event => {
      if (event === 'expenses_updated') {
        loadExpenses();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    try {
      await electronBackend.addExpense(newExpense);
      toast.success('تم تنفيذ السحب بنجاح');
      loadExpenses();
    } catch (e) {
      toast.error('فشل في العملية');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await electronBackend.deleteExpense(id);
      toast.success('تم إلغاء السحب');
      loadExpenses();
    } catch (e) {
      toast.error('فشل في العملية');
    }
  };

  // Render purely the Trading Dashboard (Full Screen Mode)
  return (
    <div
      className="h-full w-full bg-gray-50 dark:bg-black overflow-y-auto custom-scrollbar relative"
      dir="ltr"
    >
      {/* Floating Print Button */}


      <ProductTradingDashboard
        bookings={bookings}
        expenses={expenses}
        onAddExpense={handleAddExpense}
        onDeleteExpense={handleDeleteExpense}
        onUpdateBooking={onUpdateBooking}
      />
    </div>
  );
};

export default ManagerFinancialOverview;
