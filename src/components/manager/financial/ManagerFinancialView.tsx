import React, { useState } from 'react';
import { Booking } from '../../../types';
import ManagerFinancialOverview from './ManagerFinancialOverview';
import ManagerAccountsView from './ManagerAccountsView';
import ManagerPackagesView from './ManagerPackagesView';
import ManagerPaymentGatewayView from './ManagerPaymentGatewayView'; // ✅ New Import
import { LayoutDashboard, TableProperties, Package, CreditCard } from 'lucide-react'; // Added CreditCard

interface FinancialViewProps {
  bookings: Booking[];
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
}

const ManagerFinancialView: React.FC<FinancialViewProps> = ({ bookings, onUpdateBooking }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'accounts' | 'packages' | 'payment_gateway'
  >('overview'); // Changed default to overview to be safe

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Navigation Tabs - Floating Island Design */}
      <div className="px-6 pb-2 pt-0 flex justify-center">
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl flex items-center gap-1 shadow-sm border border-white/50 dark:border-white/5 mx-auto overflow-x-auto max-w-full">
          <button
            data-testid="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'overview' ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg shadow-gray-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <LayoutDashboard size={14} />
            النظرة المالية
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'accounts' ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg shadow-gray-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <TableProperties size={14} />
            الحسابات
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'packages' ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg shadow-gray-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Package size={14} />
            الباقات
          </button>
          <button
            onClick={() => setActiveTab('payment_gateway')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'payment_gateway' ? 'bg-[#C94557] text-white shadow-lg shadow-rose-500/20' : 'text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400'}`}
          >
            <CreditCard size={14} />
            بوابة الدفع
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'overview' ? (
          <ManagerFinancialOverview bookings={bookings} onUpdateBooking={onUpdateBooking} />
        ) : activeTab === 'accounts' ? (
          <ManagerAccountsView bookings={bookings} onUpdateBooking={onUpdateBooking} />
        ) : activeTab === 'packages' ? (
          <ManagerPackagesView />
        ) : (
          <ManagerPaymentGatewayView />
        )}
      </div>
    </div>
  );
};

export default ManagerFinancialView;
