import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Booking, Expense, RecurringExpense } from '../../../types';
import { Wallet, TrendingUp, DollarSign, Search, X, Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import PremiumStatCard from './widgets/PremiumStatCard';
import TransactionHistoryWidget from './widgets/TransactionHistoryWidget';
import FinancialExportWidget from './widgets/FinancialExportWidget';
import ExpenseTrackerWidget from './widgets/ExpenseTrackerWidget';
// Currency conversion removed - USD stays USD, IQD stays IQD
import { electronBackend } from '../../../services/mockBackend';


import { GlowCard } from '../../shared/GlowCard';

interface FinancialViewProps {
  bookings: Booking[];
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
}

const ManagerAccountsView: React.FC<FinancialViewProps> = ({ bookings, onUpdateBooking }) => {
  // Filter & Search State
  const [dateRangeFilter, setDateRangeFilter] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'sura' | 'villa'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  

  // Mock Expenses State (Initial fallback, will be updated by loadData)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const loadExpenses = async () => {
    try {
        const [expData, recData] = await Promise.all([
            electronBackend.getExpenses(),
            electronBackend.getRecurringExpenses(),
        ]);
        setExpenses(expData);
        setRecurringExpenses(recData);
    } catch (e) {
        console.error(e);
    } finally {
        setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();

    // Auto-refresh expenses on change
    const unsubscribe = electronBackend.subscribe(async (event) => {
        if (event === 'expenses_updated') {
             loadExpenses();
        }
    });
    return () => unsubscribe();
  }, []);


  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
      try {
          await electronBackend.addExpense(newExpense);
          toast.success('تم إضافة المصروف بنجاح');
          loadExpenses();
      } catch (e) {
          toast.error('فشل في إضافة المصروف');
      }
  };

  const handleDeleteExpense = async (id: string) => {
      try {
          await electronBackend.deleteExpense(id);
          toast.success('تم حذف المصروف');
          loadExpenses();
      } catch (e) {
          toast.error('فشل في حذف المصروف');
      }
  };

  // 1. Calculate Unified Stats with Filtering
  const stats = React.useMemo(() => {
    let revenueSuraUSD = 0;
    let revenueSuraIQD = 0;
    let revenueVillaUSD = 0;
    let revenueVillaIQD = 0;
    
    let expensesUSD = 0;
    let expensesIQD = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Helper for filter range
    const matchesDateRange = (dateStr: string) => {
        if (dateRangeFilter === 'all') return true;
        if (!dateStr) return false;
        
        const d = new Date(dateStr);
        const now = new Date();
        
        if (dateRangeFilter === 'day') {
            return d.toDateString() === now.toDateString();
        } else if (dateRangeFilter === 'week') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            return d >= oneWeekAgo;
        } else if (dateRangeFilter === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (dateRangeFilter === 'year') {
            return d.getFullYear() === now.getFullYear();
        }
        return true;
    };

    // Filter Logic
    const matchesSource = (item: any) => {
        if (sourceFilter === 'all') return true;
        
        // ✅ LOCATION = تأجير موقع/فيلا (case insensitive)
        const category = (item.category || '').toLowerCase();
        const isVilla = category === 'location';
                       
        if (sourceFilter === 'villa') return isVilla;
        if (sourceFilter === 'sura') return !isVilla;
        
        return true;
    };

    const matchesSearch = (item: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (item.clientName && item.clientName.toLowerCase().includes(q)) || 
            (item.title && item.title.toLowerCase().includes(q)) ||
            (item.clientPhone && item.clientPhone.toString().includes(q)) ||
            (item.amount && item.amount.toString().includes(q)) ||
            (item.totalAmount && item.totalAmount.toString().includes(q))
        );
    };

    // Process Bookings (exclude deleted)
    const filteredBookings = bookings.filter(b => {
        return !b.deletedAt && matchesDateRange(b.shootDate) && matchesSearch(b) && matchesSource(b);
    });

    filteredBookings.forEach(b => {
        const amount = b.paidAmount || 0;
        // ✅ LOCATION = تأجير موقع/فيلا (case insensitive)
        const isVilla = (b.category || '').toLowerCase() === 'location';

        if (isVilla) {
            if (b.currency === 'USD') revenueVillaUSD += amount;
            else revenueVillaIQD += amount;
        } else {
            if (b.currency === 'USD') revenueSuraUSD += amount;
            else revenueSuraIQD += amount;
        }

        // ✅ Include cross-currency add-ons (stored in addOnTotal)
        // addOnTotal is always in the OTHER currency from booking.currency
        if (b.addOnTotal && b.addOnTotal > 0) {
            const addOnCurrency = b.currency === 'USD' ? 'IQD' : 'USD';
            if (isVilla) {
                if (addOnCurrency === 'USD') revenueVillaUSD += b.addOnTotal;
                else revenueVillaIQD += b.addOnTotal;
            } else {
                if (addOnCurrency === 'USD') revenueSuraUSD += b.addOnTotal;
                else revenueSuraIQD += b.addOnTotal;
            }
        }
    });

    // Process Expenses
    const filteredExpenses = expenses.filter(e => {
        return matchesDateRange(e.date) && matchesSearch(e);
    });

    filteredExpenses.forEach(e => {
        if (e.currency === 'USD') expensesUSD += e.amount;
        else expensesIQD += e.amount;
    });

    // ✅ Include active recurring expenses in totals
    recurringExpenses.filter(r => r.isActive).forEach(r => {
        if (r.currency === 'USD') expensesUSD += r.amount;
        else expensesIQD += r.amount;
    });

    // ✅ No currency conversion - USD stays USD, IQD stays IQD
    const netUSD = (revenueSuraUSD + revenueVillaUSD) - expensesUSD;
    const netIQD = (revenueSuraIQD + revenueVillaIQD) - expensesIQD;

    return {
        revenueSuraUSD,
        revenueSuraIQD,
        revenueVillaUSD,
        revenueVillaIQD,
        expensesUSD,
        expensesIQD,
        netUSD,
        netIQD,
        filteredBookings,
        filteredExpenses
    };
  }, [bookings, expenses, recurringExpenses, dateRangeFilter, sourceFilter, searchQuery]);

  // ✅ Professional Export Handler
  const fileNameMap: Record<string, string> = {
      day: 'يومي',
      week: 'أسبوعي',
      month: 'شهري',
      year: 'سنوي',
      all: 'كامل'
  };

  const getReportData = () => {
      let totalB_TotalUSD = 0, totalB_TotalIQD = 0;
      let totalB_PaidUSD = 0, totalB_PaidIQD = 0;
      let totalE_USD = 0, totalE_IQD = 0;

      const bookingRows = stats.filteredBookings.map(b => {
          const isVilla = (b.category || '').toLowerCase() === 'location';
          const remaining = (b.totalAmount || 0) - (b.paidAmount || 0);
          if (b.currency === 'USD') { totalB_TotalUSD += b.totalAmount || 0; totalB_PaidUSD += b.paidAmount || 0; }
          else { totalB_TotalIQD += b.totalAmount || 0; totalB_PaidIQD += b.paidAmount || 0; }
          return {
              date: b.shootDate ? b.shootDate.split('T')[0] : '',
              source: isVilla ? 'فيلا حداد' : 'سرى الحداد',
              category: b.category || '',
              client: b.clientName || '',
              phone: b.clientPhone || '',
              title: b.title || '',
              total: b.totalAmount || 0,
              paid: b.paidAmount || 0,
              remaining,
              currency: b.currency || 'IQD',
              status: b.status || '',
          };
      });

      const expenseRows = stats.filteredExpenses.map(e => {
          if (e.currency === 'USD') totalE_USD += e.amount;
          else totalE_IQD += e.amount;
          return {
              date: e.date || '',
              title: e.title,
              category: e.category,
              amount: e.amount,
              currency: e.currency,
          };
      });

      return { bookingRows, expenseRows, totalB_TotalUSD, totalB_TotalIQD, totalB_PaidUSD, totalB_PaidIQD, totalE_USD, totalE_IQD };
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
      const data = getReportData();
      const rangeLabel = fileNameMap[dateRangeFilter];
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `تقرير_فيلا_حداد_${rangeLabel}_${dateStr}`;

      if (format === 'csv' || format === 'excel') {
          const sep = format === 'excel' ? '\t' : ',';
          const headers = ['التاريخ', 'المصدر', 'النوع', 'العميل', 'الهاتف', 'العنوان', 'الكلي', 'المدفوع', 'المتبقي', 'العملة', 'الحالة'];
          const rows: string[] = [];

          // Bookings
          data.bookingRows.forEach(b => {
              rows.push([b.date, b.source, b.category, b.client, b.phone, b.title, b.total, b.paid, b.remaining, b.currency, b.status].join(sep));
          });
          rows.push('');
          rows.push(['', '', '', '', '', 'مجموع الإيرادات ($)', data.totalB_PaidUSD, '', '', 'USD', ''].join(sep));
          rows.push(['', '', '', '', '', 'مجموع الإيرادات (د.ع)', data.totalB_PaidIQD, '', '', 'IQD', ''].join(sep));
          rows.push('');

          // Expenses
          rows.push(['التاريخ', 'مصروفات', 'الفئة', '', '', 'العنوان', 'المبلغ', '', '', 'العملة', ''].join(sep));
          data.expenseRows.forEach(e => {
              rows.push([e.date, 'مصروفات', e.category, '', '', e.title, e.amount, '', '', e.currency, ''].join(sep));
          });
          rows.push('');
          rows.push(['', '', '', '', '', 'مجموع المصروفات ($)', data.totalE_USD, '', '', 'USD', ''].join(sep));
          rows.push(['', '', '', '', '', 'مجموع المصروفات (د.ع)', data.totalE_IQD, '', '', 'IQD', ''].join(sep));
          rows.push('');
          rows.push(['', '', '', '', '', 'صافي الربح ($)', data.totalB_PaidUSD - data.totalE_USD, '', '', 'USD', ''].join(sep));
          rows.push(['', '', '', '', '', 'صافي الربح (د.ع)', data.totalB_PaidIQD - data.totalE_IQD, '', '', 'IQD', ''].join(sep));

          const content = [headers.join(sep), ...rows].join('\n');
          const ext = format === 'excel' ? 'xls' : 'csv';
          const mimeType = format === 'excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
          const blob = new Blob(['\uFEFF' + content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `${fileName}.${ext}`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

      } else if (format === 'pdf') {
          // Generate professional HTML report and open in new window for print-to-PDF
          const html = generateProfessionalReport(data, rangeLabel, dateStr);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
              printWindow.document.write(html);
              printWindow.document.close();
              setTimeout(() => printWindow.print(), 500);
          }
      }

      setIsExportOpen(false);
      toast.success(`تم تصدير تقرير (${rangeLabel}) بصيغة ${format === 'pdf' ? 'PDF' : format === 'excel' ? 'Excel' : 'CSV'}`);
  };

  const generateProfessionalReport = (data: ReturnType<typeof getReportData>, rangeLabel: string, dateStr: string) => {
      const netUSD = data.totalB_PaidUSD - data.totalE_USD;
      const netIQD = data.totalB_PaidIQD - data.totalE_IQD;

      return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>تقرير مالي - فيلا حداد</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a2e; background: #fff; font-size: 11px; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 900; color: #1a1a2e; }
  .logo span { color: #e11d48; }
  .report-info { text-align: left; font-size: 10px; color: #666; }
  .report-info strong { color: #1a1a2e; font-size: 12px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; }
  .summary-card .label { font-size: 9px; color: #888; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
  .summary-card .value { font-size: 16px; font-weight: 900; }
  .summary-card .sub { font-size: 10px; color: #666; margin-top: 2px; }
  .card-green .value { color: #059669; }
  .card-blue .value { color: #2563eb; }
  .card-amber .value { color: #d97706; }
  .card-red .value { color: #dc2626; }
  h2 { font-size: 13px; font-weight: 800; color: #1a1a2e; margin: 20px 0 8px; padding: 6px 12px; background: #f8f9fa; border-radius: 6px; border-right: 4px solid #1a1a2e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
  th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: right; font-weight: 700; font-size: 9px; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .total-row { background: #f0f9ff !important; font-weight: 800; border-top: 2px solid #1a1a2e; }
  .total-row td { padding: 10px; }
  .currency-usd { color: #d97706; font-weight: 700; }
  .currency-iqd { color: #1a1a2e; font-weight: 700; }
  .net-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; padding: 16px; border: 2px solid #1a1a2e; border-radius: 12px; }
  .net-box { text-align: center; padding: 12px; }
  .net-box .label { font-size: 10px; color: #666; font-weight: 700; }
  .net-box .amount { font-size: 22px; font-weight: 900; margin-top: 4px; }
  .net-positive { color: #059669; }
  .net-negative { color: #dc2626; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #aaa; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">فيلا <span>حداد</span></div>
    <div class="report-info">
      <strong>تقرير مالي ${rangeLabel}</strong><br>
      تاريخ التقرير: ${dateStr}<br>
      عدد الحجوزات: ${data.bookingRows.length} | المصروفات: ${data.expenseRows.length}
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card card-green">
      <div class="label">صافي الأرباح</div>
      <div class="value">${netUSD >= 0 ? '' : '-'}$${Math.abs(netUSD).toLocaleString()}</div>
      <div class="sub">${netIQD.toLocaleString()} د.ع</div>
    </div>
    <div class="summary-card card-blue">
      <div class="label">إيرادات سرى</div>
      <div class="value">$${stats.revenueSuraUSD.toLocaleString()}</div>
      <div class="sub">${stats.revenueSuraIQD.toLocaleString()} د.ع</div>
    </div>
    <div class="summary-card card-amber">
      <div class="label">إيرادات فيلا</div>
      <div class="value">$${stats.revenueVillaUSD.toLocaleString()}</div>
      <div class="sub">${stats.revenueVillaIQD.toLocaleString()} د.ع</div>
    </div>
    <div class="summary-card card-red">
      <div class="label">المصروفات</div>
      <div class="value">$${data.totalE_USD.toLocaleString()}</div>
      <div class="sub">${data.totalE_IQD.toLocaleString()} د.ع</div>
    </div>
  </div>

  <h2>الحجوزات والإيرادات</h2>
  <table>
    <thead>
      <tr><th>التاريخ</th><th>المصدر</th><th>العميل</th><th>العنوان</th><th>الكلي</th><th>المدفوع</th><th>المتبقي</th><th>العملة</th></tr>
    </thead>
    <tbody>
      ${data.bookingRows.map(b => `<tr>
        <td>${b.date}</td>
        <td>${b.source}</td>
        <td>${b.client}</td>
        <td>${b.title}</td>
        <td>${b.total.toLocaleString()}</td>
        <td>${b.paid.toLocaleString()}</td>
        <td>${b.remaining.toLocaleString()}</td>
        <td class="${b.currency === 'USD' ? 'currency-usd' : 'currency-iqd'}">${b.currency === 'USD' ? '$' : 'د.ع'}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="4">المجموع</td>
        <td>$${data.totalB_TotalUSD.toLocaleString()} | ${data.totalB_TotalIQD.toLocaleString()} د.ع</td>
        <td>$${data.totalB_PaidUSD.toLocaleString()} | ${data.totalB_PaidIQD.toLocaleString()} د.ع</td>
        <td></td><td></td>
      </tr>
    </tbody>
  </table>

  <h2>المصروفات</h2>
  <table>
    <thead>
      <tr><th>التاريخ</th><th>العنوان</th><th>الفئة</th><th>المبلغ</th><th>العملة</th></tr>
    </thead>
    <tbody>
      ${data.expenseRows.map(e => `<tr>
        <td>${e.date ? new Date(e.date).toLocaleDateString('ar-IQ') : ''}</td>
        <td>${e.title}</td>
        <td>${e.category}</td>
        <td>${e.amount.toLocaleString()}</td>
        <td class="${e.currency === 'USD' ? 'currency-usd' : 'currency-iqd'}">${e.currency === 'USD' ? '$' : 'د.ع'}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="3">المجموع</td>
        <td>$${data.totalE_USD.toLocaleString()} | ${data.totalE_IQD.toLocaleString()} د.ع</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="net-section">
    <div class="net-box">
      <div class="label">صافي الربح (دولار)</div>
      <div class="amount ${netUSD >= 0 ? 'net-positive' : 'net-negative'}">${netUSD >= 0 ? '' : '-'}$${Math.abs(netUSD).toLocaleString()}</div>
    </div>
    <div class="net-box">
      <div class="label">صافي الربح (دينار)</div>
      <div class="amount ${netIQD >= 0 ? 'net-positive' : 'net-negative'}">${netIQD.toLocaleString()} د.ع</div>
    </div>
  </div>

  <div class="footer">
    فيلا حداد - تقرير مالي تلقائي | ${dateStr}
  </div>
</body>
</html>`;
  };

  return (
    <div className="h-full flex flex-col px-4 lg:px-6 pt-0 pb-4 space-y-4 overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:hidden" dir="rtl" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-white dark:bg-[#1a1c22] border border-transparent dark:border-white/5 px-3 py-1.5 rounded-xl shadow-sm transition-colors">
         <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
             <h1 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg shadow-gray-900/20">
                  <Wallet size={14} />
                </span>
                {!isSearchOpen && <span className="hidden md:inline">المالية</span>}
             </h1>

             {/* Smart Search Bar */}
             <div className="flex-1 max-w-xs relative">
                 <motion.div 
                    initial={false}
                    animate={{ width: isSearchOpen ? '100%' : '32px' }}
                    className={`flex items-center overflow-hidden h-9 rounded-lg transition-all outline-none focus:outline-none ${isSearchOpen ? 'bg-gray-100 dark:bg-white/5 px-2 ' : 'bg-transparent cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    onClick={() => !isSearchOpen && setIsSearchOpen(true)}
                 >
                     <div className="min-w-[16px] flex items-center justify-center text-gray-400">
                        <Search size={14} />
                     </div>
                     {isSearchOpen && (
                         <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="بحث..."
                            autoFocus
                             className="w-full bg-transparent border-none text-[12px] font-bold text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-0 focus:outline-none outline-none px-2"
                            onBlur={() => !searchQuery && setIsSearchOpen(false)}
                         />
                     )}
                 </motion.div>
             </div>
         </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
                onClick={() => setDateRangeFilter(dateRangeFilter === 'all' ? 'month' : 'all')}
                className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap ${dateRangeFilter === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-gray-900/20' : 'bg-white dark:bg-[#1a1c22] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
                {dateRangeFilter === 'all' ? 'الكل' : 'الشهر'}
            </button>
         </div>
      </div>

      {/* Row 1: 4 Stat Cards */}
      {/* Row 1: 4 Premium Stat Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
      >
          {/* 1. Net Profit Master (3 Numbers Display) */}
          <PremiumStatCard
             title="صافي الأرباح"
             value={
                <div className="flex flex-col gap-3 w-full">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col border-l border-gray-100 px-1">
                            <span className="text-[8px] text-gray-400 uppercase font-black">صافي ($)</span>
                            <span className={`text-sm font-black truncate ${stats.netUSD >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
                                {stats.netUSD < 0 ? `-$${Math.abs(stats.netUSD).toLocaleString()}` : `$${stats.netUSD.toLocaleString()}`}
                            </span>
                        </div>
                        <div className="flex flex-col px-1">
                            <span className="text-[8px] text-gray-400 uppercase font-black">صافي (د.ع)</span>
                            <span className={`text-sm font-black truncate ${stats.netIQD >= 0 ? 'text-gray-700' : 'text-rose-600'}`}>
                                {stats.netIQD.toLocaleString()} د.ع
                            </span>
                        </div>
                    </div>
                </div>
             }
             variant="wave"
             data={[{value: 10}, {value: 15}, {value: 12}, {value: 20}]}
             color={stats.netUSD >= 0 && stats.netIQD >= 0 ? "emerald" : "rose"}
          />

          {/* 2. Sura AlHaddad Revenue */}
          <PremiumStatCard
             title="إيرادات سرى الحداد"
             value={
                <div className="flex flex-col gap-0.5">
                    {stats.revenueSuraUSD > 0 && <span>${stats.revenueSuraUSD.toLocaleString()}</span>}
                    {stats.revenueSuraIQD > 0 && <span>{stats.revenueSuraIQD.toLocaleString()} د.ع</span>}
                    {stats.revenueSuraUSD === 0 && stats.revenueSuraIQD === 0 && <span>0</span>}
                </div>
             }
             variant="wave"
             data={[{value: 30}, {value: 45}, {value: 35}, {value: 60}, {value: 50}, {value: 75}]}
             color="violet"
          />

          {/* 3. Villa Hadad Revenue */}
          <PremiumStatCard
             title="إيرادات فيلا حداد"
             value={
                <div className="flex flex-col gap-0.5">
                    {stats.revenueVillaUSD > 0 && <span>${stats.revenueVillaUSD.toLocaleString()}</span>}
                    {stats.revenueVillaIQD > 0 && <span>{stats.revenueVillaIQD.toLocaleString()} د.ع</span>}
                    {stats.revenueVillaUSD === 0 && stats.revenueVillaIQD === 0 && <span>0</span>}
                </div>
             }
             variant="wave"
             data={[{value: 20}, {value: 35}, {value: 40}, {value: 30}, {value: 55}, {value: 45}]}
             color="amber"
          />

          {/* 4. Total Expenses */}
          <PremiumStatCard
             title="إجمالي المصروفات"
             value={
                <div className="flex flex-col gap-0.5">
                    {stats.expensesUSD > 0 && <span>${stats.expensesUSD.toLocaleString()}</span>}
                    {stats.expensesIQD > 0 && <span>{stats.expensesIQD.toLocaleString()} د.ع</span>}
                    {stats.expensesUSD === 0 && stats.expensesIQD === 0 && <span>0</span>}
                </div>
             }
             variant="bar"
             data={[{value: 5}, {value: 8}, {value: 7}, {value: 12}]}
             color="rose"
          />
      </motion.div>

      {/* Row 2: Split View (Main Chart/Table vs Side List) */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
          {/* Side Content (1/3) - Expense Tracker */}
          <div className="xl:col-span-1 h-full min-h-0">
              <ExpenseTrackerWidget
                expenses={stats.filteredExpenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                disableTilt={true}
              />
          </div>

          {/* Main Content (2/3) - Transaction History */}
          <div className="xl:col-span-2 h-full min-h-0">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm h-full overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
                  <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">
                        سجل المبيعات والمعاملات
                        {searchQuery && (
                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-900">
                                نتائج البحث: {stats.filteredBookings.length}
                            </span>
                        )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Source Filter */}
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 p-1 rounded-xl border border-gray-100 dark:border-gray-600">
                            {[
                                { id: 'all', label: 'الكل' },
                                { id: 'sura', label: 'سرى' },
                                { id: 'villa', label: 'فيلا' }
                            ].map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSourceFilter(filter.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${sourceFilter === filter.id ? (filter.id === 'sura' ? 'bg-violet-600 text-white' : filter.id === 'villa' ? 'bg-amber-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600') : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100'}`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 p-1 rounded-xl border border-gray-100 dark:border-gray-600">
                            {[
                                { id: 'day', label: 'يومي' },
                                { id: 'week', label: 'أسبوعي' },
                                { id: 'month', label: 'شهري' },
                                { id: 'year', label: 'سنوي' },
                                { id: 'all', label: 'الكل' }
                            ].map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setDateRangeFilter(filter.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${dateRangeFilter === filter.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100'}`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="text-xs font-mono bg-gray-900 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-white font-bold flex items-center gap-1.5">
                            <TrendingUp size={12}/>
                            {stats.filteredBookings.length} عملية
                        </span>

                        {/* Export Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsExportOpen(!isExportOpen)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                                <Download size={12} />
                                تصدير
                                <ChevronDown size={10} className={`transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isExportOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                                    <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#1a1c22] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                                        <button
                                            onClick={() => handleExport('pdf')}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <FileText size={14} className="text-rose-500" />
                                            تصدير PDF
                                        </button>
                                        <button
                                            onClick={() => handleExport('excel')}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <FileSpreadsheet size={14} className="text-emerald-500" />
                                            تصدير Excel
                                        </button>
                                        <button
                                            onClick={() => handleExport('csv')}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-t border-gray-100 dark:border-white/5"
                                        >
                                            <FileText size={14} className="text-blue-500" />
                                            تصدير CSV
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                  </div>
                 <div className="flex-1 p-2 flex flex-col min-h-0">
                    <TransactionHistoryWidget bookings={stats.filteredBookings} onUpdateBooking={onUpdateBooking} />
                 </div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default ManagerAccountsView;
