import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../../services/db/index';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';

// ... (interfaces)

// ... (interfaces)

interface DailyFinancialStats {
  totalReceivables: number;
  receivedToday: number;
  pendingPayments: number;
  overdueClients: number;
}

interface PaymentAlert {
  clientName: string;
  bookingId: string;
  amountDue: number;
  dueDate: string;
  daysOverdue: number;
}

interface ClientSession {
  id: string;
  clientName: string;
  sessionDate: string;
  sessionTime: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  isDepositOnly: boolean;
  paymentReceivedBy?: string;
  paymentReceivedAt?: string;
}

const AdminFinancialView: React.FC = () => {
  const [stats, setStats] = useState<DailyFinancialStats>({
    totalReceivables: 0,
    receivedToday: 0,
    pendingPayments: 0,
    overdueClients: 0,
  });
  
  const [paymentAlerts, setPaymentAlerts] = useState<PaymentAlert[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<ClientSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<ClientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const loadFinancialData = async (isBackground: boolean = false) => {
    try {
      if (!isBackground) setLoading(true);
      
      // Get today's date

      
      interface BookingRow {
        id: string;
        client_name: string;
        total_amount: number;
        paid_amount: number;
        shoot_date: string;
        status: string;
        details: string | any;
        paymentReceivedBy?: string;
        paymentReceivedAt?: string;
      }

      // Fetch bookings with payment info and details
      let bookings: BookingRow[] = [];
      try {
           const result = await db
            .selectFrom('bookings')
            .selectAll()
            .where('deletedAt', 'is', null)
            .orderBy('shootDate', 'asc')
            .execute();

           bookings = result.map(b => ({
             id: b.id,
             client_name: b.clientName,
             total_amount: b.totalAmount,
             paid_amount: b.paidAmount,
             shoot_date: b.shootDate,
             status: b.status,
             details: b.details,
             paymentReceivedBy: b.paymentReceivedBy || undefined,
             paymentReceivedAt: b.paymentReceivedAt || undefined
           }));
      } catch(e) {
           console.error('Query failed', e);
           bookings = [];
      }
      
// Bookings are already fetched into `bookings` variable above
      
      // Calculate stats
      let totalReceivables = 0;
      let receivedToday = 0;
      let pendingPayments = 0;
      const alerts: PaymentAlert[] = [];
      const upcoming: ClientSession[] = [];
      const todayList: ClientSession[] = [];
      
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      bookings.forEach((booking) => {
        const total = booking.total_amount || 0;
        const paid = booking.paid_amount || 0;
        const remaining = total - paid;
        
        const shootDate = new Date(booking.shoot_date);
        shootDate.setHours(0, 0, 0, 0);
        
        const daysUntil = Math.floor((shootDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Parse details for start time
        let startTime = '10:00';
        try {
          const details = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details;
          startTime = details?.startTime || '10:00';
        } catch (e) {
          // Use default
        }
        
        const session: ClientSession = {
          id: booking.id,
          clientName: booking.client_name || 'عميل غير معروف',
          sessionDate: booking.shoot_date,
          sessionTime: startTime,
          totalAmount: total,
          paidAmount: paid,
          remainingAmount: remaining,
          status: booking.status,
          isDepositOnly: paid > 0 && remaining > 0 && paid < total * 0.5, // Less than 50% = deposit only
          paymentReceivedBy: booking.paymentReceivedBy,
          paymentReceivedAt: booking.paymentReceivedAt,
        };
        
        // Categorize by date
        if (daysUntil === 0) {
          // Today's session
          todayList.push(session);
          if (paid > 0) {
            receivedToday += paid;
          }
        } else if (daysUntil > 0 && daysUntil <= 7) {
          // Upcoming (next 7 days)
          upcoming.push(session);
        }
        
        // Track receivables and alerts
        if (remaining > 0) {
          totalReceivables += remaining;
          pendingPayments++;
          
          // Check if overdue
          if (daysUntil < 0 && booking.status !== 'COMPLETED') {
            alerts.push({
              clientName: booking.client_name || 'عميل غير معروف',
              bookingId: booking.id,
              amountDue: remaining,
              dueDate: booking.shoot_date,
              daysOverdue: Math.abs(daysUntil),
            });
          }
        }
      });
      
      setStats({
        totalReceivables,
        receivedToday,
        pendingPayments,
        overdueClients: alerts.length,
      });
      
      setPaymentAlerts(alerts.sort((a, b) => b.daysOverdue - a.daysOverdue));
      setUpcomingSessions(upcoming);
      setTodaySessions(todayList);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  const { lastRefreshTime, isRefreshing } = useAutoRefresh(
    () => loadFinancialData(true), // Run silently
    30000, 
    autoRefreshEnabled
  );

  useEffect(() => {
    loadFinancialData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              🎯 الرقابة المالية اليومية
            </h1>
            <p className="text-blue-300 text-sm">
              مراقبة شاملة للحالة المالية - للمشرف فقط
            </p>
          </div>
          
          {/* Auto-refresh controls */}
          <div className="flex items-center gap-4">
            {/* Last update time */}
            <div className="text-right">
              <div className="text-xs text-blue-400 mb-1">آخر تحديث</div>
              <div className="text-sm text-white font-bold">
                {isRefreshing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span>
                    جاري التحديث...
                  </span>
                ) : (
                  new Date(lastRefreshTime).toLocaleTimeString('ar-IQ')
                )}
              </div>
            </div>
            
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                autoRefreshEnabled
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-400/30 hover:bg-gray-500/30'
              }`}
            >
              {autoRefreshEnabled ? '⏸️ إيقاف التحديث التلقائي' : '▶️ تفعيل التحديث التلقائي'}
            </button>
            
            {/* Manual refresh button */}
            <button
              onClick={() => loadFinancialData(false)}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 تحديث الآن
            </button>
          </div>
        </div>
        
        {/* Auto-refresh indicator */}
        {autoRefreshEnabled && (
          <div className="text-xs text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            التحديث التلقائي مفعّل (كل 30 ثانية)
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Receivables */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-linear-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-400/30 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/30 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-xs text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full">
              إجمالي
            </div>
          </div>
          <div className="text-3xl font-black text-white mb-1" dir="ltr">
            {formatCurrency(stats.totalReceivables)}
          </div>
          <div className="text-sm text-blue-200">المبالغ المستحقة</div>
        </motion.div>

        {/* Received Today */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-linear-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-400/30 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/30 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div className="text-xs text-green-300 bg-green-500/20 px-3 py-1 rounded-full">
              اليوم
            </div>
          </div>
          <div className="text-3xl font-black text-white mb-1" dir="ltr">
            {formatCurrency(stats.receivedToday)}
          </div>
          <div className="text-sm text-green-200">المبالغ المستلمة</div>
        </motion.div>

        {/* Pending Payments */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-linear-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-400/30 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500/30 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="text-xs text-yellow-300 bg-yellow-500/20 px-3 py-1 rounded-full">
              قيد الانتظار
            </div>
          </div>
          <div className="text-3xl font-black text-white mb-1">
            {stats.pendingPayments}
          </div>
          <div className="text-sm text-yellow-200">دفعات معلقة</div>
        </motion.div>

        {/* Overdue Alerts */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-linear-to-br from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-400/30 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-500/30 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="text-xs text-red-300 bg-red-500/20 px-3 py-1 rounded-full">
              تنبيه
            </div>
          </div>
          <div className="text-3xl font-black text-white mb-1">
            {stats.overdueClients}
          </div>
          <div className="text-sm text-red-200">عملاء متأخرين</div>
        </motion.div>
      </div>

      {/* Payment Alerts */}
      {paymentAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-linear-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl border border-red-400/20 rounded-3xl p-6 shadow-2xl mb-8"
        >
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            تنبيهات الدفع
          </h2>
          
          <div className="space-y-4">
            {paymentAlerts.map((alert, index) => (
              <motion.div
                key={alert.bookingId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-white/5 border border-red-400/20 rounded-2xl p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-bold text-lg mb-1">
                      {alert.clientName}
                    </div>
                    <div className="text-red-300 text-sm">
                      متأخر {alert.daysOverdue} يوم • تاريخ الاستحقاق: {new Date(alert.dueDate).toLocaleDateString('ar-IQ')}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-black text-red-400" dir="ltr">
                      {formatCurrency(alert.amountDue)}
                    </div>
                    <div className="text-xs text-red-300">دينار</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Today's Sessions */}
      {todaySessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-linear-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-400/20 rounded-3xl p-6 shadow-2xl mb-8"
        >
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <span className="text-3xl">📅</span>
            جلسات اليوم
          </h2>
          
          <div className="space-y-4">
            {todaySessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className={`border rounded-2xl p-4 transition-all ${
                  session.remainingAmount > 0
                    ? 'bg-orange-500/10 border-orange-400/30 hover:bg-orange-500/20'
                    : 'bg-green-500/10 border-green-400/30 hover:bg-green-500/20'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-black text-lg">{session.clientName}</span>
                      {session.isDepositOnly && (
                        <span className="text-xs bg-orange-500/30 text-orange-300 px-2 py-1 rounded-full font-bold">
                          عربون فقط
                        </span>
                      )}
                      {session.remainingAmount === 0 && (
                        <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded-full font-bold">
                          مدفوع كامل
                        </span>
                      )}
                    </div>
                    <div className="text-cyan-300 text-sm">
                      الساعة {session.sessionTime}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-white/10">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">المبلغ الكلي</div>
                    <div className="text-white font-bold" dir="ltr">{formatCurrency(session.totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">المدفوع</div>
                    <div className="text-green-400 font-bold" dir="ltr">{formatCurrency(session.paidAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">الباقي</div>
                    <div className={`font-bold ${session.remainingAmount > 0 ? 'text-orange-400' : 'text-green-400'}`} dir="ltr">
                      {formatCurrency(session.remainingAmount)}
                    </div>
                  </div>
                </div>
                
                {session.paymentReceivedBy && session.paidAmount > 0 && (
                  <div className="mt-3 pt-3 border-t border-cyan-400/20">
                    <div className="flex items-center gap-2 text-cyan-300 text-sm">
                      <span>👤</span>
                      <span>قبضها: <span className="font-bold">{session.paymentReceivedBy}</span></span>
                      {session.paymentReceivedAt && (
                        <span className="text-xs text-gray-400">
                          • {new Date(session.paymentReceivedAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {session.remainingAmount > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-400/20">
                    <div className="flex items-center gap-2 text-orange-300 text-sm font-bold">
                      <span>⚠️</span>
                      <span>تنبيه: استلم الباقي قبل انتهاء الجلسة!</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-linear-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-indigo-400/20 rounded-3xl p-6 shadow-2xl mb-8"
        >
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <span className="text-3xl">🔮</span>
            الجلسات القادمة (7 أيام)
          </h2>
          
          <div className="space-y-4">
            {upcomingSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="bg-white/5 border border-indigo-400/20 rounded-2xl p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-white font-bold text-lg mb-1">{session.clientName}</div>
                    <div className="text-indigo-300 text-sm">
                      {new Date(session.sessionDate).toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {session.sessionTime}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-white/10">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">المبلغ الكلي</div>
                    <div className="text-white font-bold" dir="ltr">{formatCurrency(session.totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">المدفوع</div>
                    <div className="text-green-400 font-bold" dir="ltr">{formatCurrency(session.paidAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">الباقي</div>
                    <div className={`font-bold ${session.remainingAmount > 0 ? 'text-yellow-400' : 'text-green-400'}`} dir="ltr">
                      {formatCurrency(session.remainingAmount)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminFinancialView;
