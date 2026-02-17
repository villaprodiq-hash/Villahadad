import React, { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Booking } from '../../../types';
import { formatMoney } from '../../../utils/formatMoney';
import ScrollReveal from '../../shared/ScrollReveal';
import ReceptionPageWrapper from '../layout/ReceptionPageWrapper';
import ReceptionWidgetCard from '../dashboard/ReceptionWidgetCard';
import ElectronicPaymentsWidget from '../../shared/widgets/ElectronicPaymentsWidget';

interface FinancialViewProps {
  bookings: Booking[];
  isManager?: boolean;
}

const ReceptionFinancialView: React.FC<FinancialViewProps> = ({ bookings, isManager = false }) => {
  const stats = useMemo(() => {
    let totalRevenueUSD = 0;
    let totalCollectedUSD = 0;
    let totalOutstandingUSD = 0;

    let totalRevenueIQD = 0;
    let totalCollectedIQD = 0;
    let totalOutstandingIQD = 0;

    bookings.forEach(b => {
      if (b.currency === 'IQD') {
        totalRevenueIQD += b.totalAmount;
        totalCollectedIQD += b.paidAmount;
        totalOutstandingIQD += b.totalAmount - b.paidAmount;
      } else {
        // Default to USD
        totalRevenueUSD += b.totalAmount;
        totalCollectedUSD += b.paidAmount;
        totalOutstandingUSD += b.totalAmount - b.paidAmount;
      }
    });

    return {
      totalRevenueUSD,
      totalCollectedUSD,
      totalOutstandingUSD,
      totalRevenueIQD,
      totalCollectedIQD,
      totalOutstandingIQD,
    };
  }, [bookings]);

  return (
    <ReceptionPageWrapper isManager={isManager}>
      <div className="flex flex-col h-full animate-in fade-in duration-300 space-y-6 overflow-y-auto custom-scrollbar pb-6">
        <div className="flex items-center justify-between shrink-0">
          <h2
            className={`text-2xl font-bold ${isManager ? 'text-gray-800' : 'text-white'} flex items-center gap-3`}
          >
            <div
              className={`p-2 ${isManager ? 'bg-amber-50 text-amber-500' : 'bg-[#F7931E]/10 text-[#F7931E]'} rounded-lg`}
            >
              <DollarSign size={24} />
            </div>
            الإدارة المالية
          </h2>
        </div>

        {/* USD Drawer Stats (Simplified) */}
        <ScrollReveal delay={0}>
          <div>
            <h3 className="text-sm text-gray-400 font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#F7931E] rounded-full"></span>
              الصندوق بالدولار ($)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue Chart Removed - Focusing on Drawer */}
              <ReceptionWidgetCard
                className={`p-6 ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-white/40 ring-1 ring-white/60 text-gray-800' : ''}`}
                rounded={isManager ? 'rounded-4xl' : undefined}
              >
                <p className="text-gray-500 text-xs font-bold uppercase mb-2">
                  المقبوضات (في الدرج)
                </p>
                <p className="text-4xl font-bold text-green-400">
                  {formatMoney(stats.totalCollectedUSD, 'USD')}
                </p>
              </ReceptionWidgetCard>
              <ReceptionWidgetCard
                className={`p-6 relative overflow-hidden ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-white/40 ring-1 ring-white/60 text-gray-800' : ''}`}
                rounded={isManager ? 'rounded-4xl' : undefined}
              >
                <p className="text-gray-500 text-xs font-bold uppercase mb-2">ديون بذمة العملاء</p>
                <p className="text-4xl font-bold text-red-400">
                  {formatMoney(stats.totalOutstandingUSD, 'USD')}
                </p>
                {stats.totalOutstandingUSD > 0 && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                )}
              </ReceptionWidgetCard>
            </div>
          </div>
        </ScrollReveal>

        {/* IQD Drawer Stats (Simplified) */}
        <ScrollReveal delay={0.1}>
          <div>
            <h3 className="text-sm text-gray-400 font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              الصندوق بالدينار (IQD)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue Chart Removed - Focusing on Drawer */}
              <ReceptionWidgetCard
                className={`p-6 ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-white/40 ring-1 ring-white/60 text-gray-800' : ''}`}
                rounded={isManager ? 'rounded-4xl' : undefined}
              >
                <p className="text-gray-500 text-xs font-bold uppercase mb-2">
                  المقبوضات (في الدرج)
                </p>
                <p className="text-3xl font-bold text-green-400 font-mono">
                  {formatMoney(stats.totalCollectedIQD, 'IQD')}
                </p>
              </ReceptionWidgetCard>
              <ReceptionWidgetCard
                className={`p-6 relative overflow-hidden ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-white/40 ring-1 ring-white/60 text-gray-800' : ''}`}
                rounded={isManager ? 'rounded-4xl' : undefined}
              >
                <p className="text-gray-500 text-xs font-bold uppercase mb-2">ديون بذمة العملاء</p>
                <p className="text-3xl font-bold text-red-400 font-mono">
                  {formatMoney(stats.totalOutstandingIQD, 'IQD')}
                </p>
                {stats.totalOutstandingIQD > 0 && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                )}
              </ReceptionWidgetCard>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="flex-1">
          <ElectronicPaymentsWidget isManager={isManager} />
        </ScrollReveal>

        <ScrollReveal delay={0.3} className="flex-1">
          <ReceptionWidgetCard
            className={`flex flex-col min-h-[300px] ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-white/40 ring-1 ring-white/60 text-gray-800' : ''}`}
            title={
              isManager ? <span className="text-gray-800">آخر المعاملات</span> : 'آخر المعاملات'
            }
            rounded={isManager ? 'rounded-[2.5rem]' : undefined}
          >
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-right">
                <thead
                  className={`text-xs text-gray-500 font-bold uppercase border-b ${isManager ? 'border-gray-200 bg-white/50' : 'border-white/10 bg-[#1a1c22]'} sticky top-0 z-10`}
                >
                  <tr>
                    <th className="pb-3 pr-2">الحجز</th>
                    <th className="pb-3">التاريخ</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3 pl-2 text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isManager ? 'divide-gray-100' : 'divide-white/5'}`}>
                  {bookings.map(b => (
                    <tr
                      key={b.id}
                      className={`group ${isManager ? 'hover:bg-amber-50/50' : 'hover:bg-white/5'} transition-colors`}
                    >
                      <td
                        className={`py-4 pr-2 font-medium ${isManager ? 'text-gray-800' : 'text-white'}`}
                      >
                        {b.title}
                      </td>
                      <td className="py-4 text-sm text-gray-400">{b.shootDate}</td>
                      <td className="py-4">
                        <span
                          className={`text-[10px] px-2 py-1 rounded border ${b.totalAmount === b.paidAmount ? 'border-green-500/20 text-green-400 bg-green-500/5' : 'border-red-500/20 text-red-400 bg-red-500/5'}`}
                        >
                          {b.totalAmount === b.paidAmount ? 'مدفوع بالكامل' : 'متبقي أقساط'}
                        </span>
                      </td>
                      <td
                        className={`py-4 pl-2 text-left font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}
                      >
                        {formatMoney(b.totalAmount, b.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReceptionWidgetCard>
        </ScrollReveal>
      </div>
    </ReceptionPageWrapper>
  );
};

export default ReceptionFinancialView;
