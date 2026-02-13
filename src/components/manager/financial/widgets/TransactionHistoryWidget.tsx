import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Booking } from '../../../../types';
import { formatMoney } from '../../../../utils/formatMoney';
import { GlowCard } from '../../../shared/GlowCard';
import { Check, X, Edit2 } from 'lucide-react';

interface TransactionHistoryWidgetProps {
  bookings: Booking[];
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
  disableTilt?: boolean;
}

const TransactionHistoryWidget: React.FC<TransactionHistoryWidgetProps> = ({
    bookings,
    onUpdateBooking,
    disableTilt = false
}) => {
  const [editingPaidId, setEditingPaidId] = useState<string | null>(null);
  const [tempPaidAmount, setTempPaidAmount] = useState('');

  const handleStartEditPaid = (booking: Booking) => {
    setEditingPaidId(booking.id);
    setTempPaidAmount(booking.paidAmount.toString());
  };

  const handleSavePaid = (id: string) => {
      if (tempPaidAmount !== '' && !isNaN(parseFloat(tempPaidAmount)) && onUpdateBooking) {
          onUpdateBooking(id, {
              paidAmount: parseFloat(tempPaidAmount)
          });
          setEditingPaidId(null);
      }
  };

  const handleSetFullPaid = (id: string, total: number) => {
      if (onUpdateBooking) {
          onUpdateBooking(id, { paidAmount: total });
          setEditingPaidId(null);
      }
  };

  return (
    <GlowCard
        disableTilt={true}
        className="flex-1 flex flex-col bg-white dark:bg-[#1a1c22] rounded-4xl shadow-sm overflow-hidden border border-transparent dark:border-white/5 transition-colors duration-300"
    >
       <div
         className="h-full overflow-y-auto custom-scrollbar p-2 [&::-webkit-scrollbar]:hidden"
         style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
       >
          <table className="w-full text-right">
             <thead className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#1a1c22] z-10">
                <tr>
                    <th className="pb-3 pr-4 pt-3 text-right">العميل</th>
                    <th className="pb-3 pt-3 text-right">المصدر</th>
                    <th className="pb-3 pt-3 text-right">التاريخ</th>
                    <th className="pb-3 pt-3 text-right">التفاصيل (كلي/مدفوع/باقي)</th>
                    <th className="pb-3 pl-4 text-left pt-3">العربون</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {bookings.map((b, idx) => (
                   <tr
                     key={b.id}
                     className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                   >
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-200">
                         {b.title}
                         <span className="block text-[10px] text-gray-400 font-normal">{b.clientName}</span>
                      </td>
                       <td className="py-2">
                          {(() => {
                             // ✅ Must match ManagerAccountsView logic: villa = category 'location'
                             const isVilla = (b.category || '').toLowerCase() === 'location';
                             return (
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${isVilla ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/30'}`}>
                                   {isVilla ? 'فيلا حداد' : 'سرى الحداد'}
                                </span>
                             );
                          })()}
                       </td>
                      <td className="py-2 text-sm text-gray-500 dark:text-gray-400 font-mono">{b.shootDate ? b.shootDate.split('T')[0] : '-'}</td>
                       <td className="py-2">
                          {(() => {
                             // ✅ Detect mixed-currency add-ons
                             const bAny = b as any;
                             const originalPrice = bAny.originalPackagePrice || b.totalAmount;
                             const addOnTotal = bAny.addOnTotal || 0;
                             const records: any[] = bAny.paymentRecords || [];
                             const otherCurrencyPaid = records
                                .filter((r: any) => r.currency && r.currency !== b.currency)
                                .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
                             const hasMixedCurrency = otherCurrencyPaid > 0;
                             const otherCurrLabel = b.currency === 'USD' ? 'د.ع' : '$';

                             return (
                                <div className="flex flex-col gap-0.5 text-[10px]">
                                   <div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                                      <span>الكلي:</span>
                                      <div className="flex flex-col items-end">
                                         <span className="font-mono text-gray-900 dark:text-gray-300">
                                            {hasMixedCurrency ? formatMoney(originalPrice, b.currency) : formatMoney(b.totalAmount, b.currency)}
                                         </span>
                                         {hasMixedCurrency && addOnTotal > 0 && (
                                            <span className="font-mono text-blue-600 dark:text-blue-400 text-[9px]">
                                               + {addOnTotal.toLocaleString()} {otherCurrLabel}
                                            </span>
                                         )}
                                      </div>
                                   </div>
                                   <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400 font-bold group/paid relative">
                                      <div className="flex items-center gap-1">
                                          <span>المدفوع:</span>
                                          {onUpdateBooking && !editingPaidId && (
                                              <button
                                                  onClick={() => handleStartEditPaid(b)}
                                                  className="opacity-0 group-hover/paid:opacity-100 text-gray-400 hover:text-emerald-500 transition-all p-0.5"
                                              >
                                                  <Edit2 size={10} />
                                              </button>
                                          )}
                                      </div>
                                      {editingPaidId === b.id ? (
                                          <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
                                              <input
                                                  type="number"
                                                  className="w-20 h-5 text-[10px] bg-white dark:bg-black/50 border border-emerald-300 dark:border-emerald-500/50 rounded px-1 outline-none text-left font-mono text-gray-900 dark:text-white"
                                                  value={tempPaidAmount}
                                                  onChange={(e) => setTempPaidAmount(e.target.value)}
                                                  autoFocus
                                                  onKeyDown={(e) => e.key === 'Enter' && handleSavePaid(b.id)}
                                              />
                                              <button
                                                  onClick={() => handleSetFullPaid(b.id, b.totalAmount)}
                                                  className="text-[8px] bg-emerald-500 text-white px-1 rounded hover:bg-emerald-600 transition-colors"
                                                  title="دفع كامل المبلغ"
                                              >
                                                  كامل
                                              </button>
                                              <button onClick={() => handleSavePaid(b.id)} className="text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded p-0.5"><Check size={12}/></button>
                                              <button onClick={() => setEditingPaidId(null)} className="text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded p-0.5"><X size={12}/></button>
                                          </div>
                                      ) : (
                                          <span className="font-mono">{formatMoney(b.paidAmount, b.currency)}</span>
                                      )}
                                   </div>
                                   <div className="flex justify-between gap-4 text-rose-500 dark:text-rose-400 font-bold border-t border-gray-50 dark:border-white/5 mt-0.5 pt-0.5">
                                      <span>المتبقي:</span>
                                      <span className="font-mono">{formatMoney(b.totalAmount - b.paidAmount, b.currency)}</span>
                                   </div>
                                </div>
                             );
                          })()}
                       </td>
                       <td className="py-2 pl-4 text-left">
                           <div className="flex flex-col items-end">
                             <span className={`font-black font-mono ${b.currency === 'USD' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'} text-sm`}>
                                 {formatMoney(b.paidAmount, b.currency)}
                             </span>
                             {/* Show add-on payments in other currency */}
                             {(() => {
                                const records: any[] = (b as any).paymentRecords || [];
                                const otherPaid = records
                                   .filter((r: any) => r.currency && r.currency !== b.currency)
                                   .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
                                if (otherPaid > 0) {
                                   return (
                                      <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 font-bold">
                                         + {otherPaid.toLocaleString()} {b.currency === 'USD' ? 'د.ع' : '$'}
                                      </span>
                                   );
                                }
                                return null;
                             })()}
                          </div>
                      </td>
                   </tr>
                ))}
             </tbody>

             {/* Table Footer with Totals */}
             <tfoot className="border-t-2 border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
                {(() => {
                   const totalUSD = bookings.filter(b => b.currency === 'USD').reduce((sum, b) => sum + (b.paidAmount || 0), 0);
                   const totalIQD = bookings.filter(b => b.currency !== 'USD').reduce((sum, b) => sum + (b.paidAmount || 0), 0);
                   return (
                      <tr className="font-black text-gray-900 dark:text-gray-200">
                          <td colSpan={2} className="py-4 pr-4 text-right text-xs">الإجمالي لهذا العرض:</td>
                          <td className="py-4 text-xs font-mono">
                              {bookings.length} حجز
                          </td>
                          <td className="py-4"></td>
                          <td className="py-4 pl-4 text-left font-black">
                              <div className="flex flex-col items-end gap-0.5">
                                 {totalUSD > 0 && (
                                    <span className="text-sm font-mono text-amber-600 dark:text-amber-400">${totalUSD.toLocaleString()}</span>
                                 )}
                                 {totalIQD > 0 && (
                                    <span className="text-sm font-mono text-emerald-700 dark:text-emerald-400">{totalIQD.toLocaleString()} د.ع</span>
                                 )}
                              </div>
                          </td>
                      </tr>
                   );
                })()}
             </tfoot>
          </table>
       </div>
    </GlowCard>
  );
};

export default React.memo(TransactionHistoryWidget);
