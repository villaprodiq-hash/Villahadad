import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ShieldAlert, Activity, Siren,
  RefreshCcw, CheckCircle, Database,
  Wifi, WifiOff, DollarSign
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../../../services/supabase';

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  source: string;
  message: string;
  time: string;
  icon: LucideIcon;
}

interface SystemMetric {
  label: string;
  value: number;
  max: number;
  status: 'good' | 'warning' | 'critical';
  unit: string;
}

interface BookingStatsRow {
  id: string;
  status: string;
  shootDate?: string;
  totalAmount?: number | string | null;
  paidAmount?: number | string | null;
  deliveryDeadline?: string | null;
}

interface CountRow {
  count: number | string;
}

const AdminWarRoomView = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    overdueBookings: 0,
    unpaidBookings: 0,
    onlineUsers: 0,
    totalUsers: 0,
    todayBookings: 0,
    syncStatus: 'unknown' as 'online' | 'offline' | 'unknown',
    dbSize: '...',
    lastSync: '...',
  });
  const [loading, setLoading] = useState(true);

  const fetchSystemData = useCallback(async () => {
    setLoading(true);
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    const newAlerts: SystemAlert[] = [];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    try {
      // 1. Fetch booking stats
      let totalBookings = 0, overdueBookings = 0, unpaidBookings = 0, todayBookings = 0;
      if (api?.db) {
        try {
          const allBookings = (await api.db.query(
            "SELECT id, status, shootDate, totalAmount, paidAmount, deliveryDeadline FROM bookings WHERE deletedAt IS NULL"
          )) as BookingStatsRow[];
          totalBookings = allBookings.length;
          const today = now.toISOString().slice(0, 10);
          todayBookings = allBookings.filter(b => b.shootDate === today).length;

          // Overdue: past delivery deadline and not delivered
          overdueBookings = allBookings.filter(b => {
            if (!b.deliveryDeadline) return false;
            return b.deliveryDeadline < today && b.status !== 'Delivered' && b.status !== 'Archived';
          }).length;

          // Unpaid: balance > 0
          unpaidBookings = allBookings.filter(b => {
            const total = Number(b.totalAmount) || 0;
            const paid = Number(b.paidAmount) || 0;
            return total > 0 && paid < total && b.status !== 'Delivered' && b.status !== 'Archived';
          }).length;

          // Generate alerts from real data
          if (overdueBookings > 0) {
            newAlerts.push({
              id: 'overdue',
              type: 'critical',
              source: 'المواعيد',
              message: `${overdueBookings} حجوزات تجاوزت موعد التسليم`,
              time: timeStr,
              icon: Clock,
            });
          }

          if (unpaidBookings > 3) {
            newAlerts.push({
              id: 'unpaid',
              type: 'warning',
              source: 'المالية',
              message: `${unpaidBookings} حجوزات بمبالغ مستحقة غير مدفوعة`,
              time: timeStr,
              icon: DollarSign,
            });
          }
        } catch (e) { console.error('War Room: booking stats failed', e); }
      }

      // 2. Fetch user stats
      let totalUsers = 0;
      if (api?.db) {
        try {
          const usersResult = (await api.db.query(
            "SELECT COUNT(*) as count FROM users WHERE deletedAt IS NULL"
          )) as CountRow[];
          totalUsers = Number(usersResult[0]?.count || 0);
        } catch { /* ignore */ }
      }

      // 3. Check Supabase connectivity
      let syncStatus: 'online' | 'offline' = 'offline';
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (!error) syncStatus = 'online';
      } catch {
        syncStatus = 'offline';
      }

      if (syncStatus === 'offline') {
        newAlerts.push({
          id: 'sync',
          type: 'critical',
          source: 'الاتصال',
          message: 'فقدان الاتصال بالخادم السحابي - العمل في وضع عدم الاتصال',
          time: timeStr,
          icon: WifiOff,
        });
      }

      // 4. Check sync queue
      if (api?.db) {
        try {
          const pendingSync = (await api.db.query(
            "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'"
          )) as CountRow[];
          const pendingCount = Number(pendingSync[0]?.count || 0);
          if (pendingCount > 10) {
            newAlerts.push({
              id: 'sync-queue',
              type: 'warning',
              source: 'المزامنة',
              message: `${pendingCount} عملية في انتظار المزامنة`,
              time: timeStr,
              icon: RefreshCcw,
            });
          }
        } catch { /* ignore */ }
      }

      // 5. Check activity logs for unusual activity
      if (api?.db) {
        try {
          const recentLogs = (await api.db.query(
            "SELECT COUNT(*) as count FROM activity_logs WHERE createdAt > datetime('now', '-1 hour')"
          )) as CountRow[];
          const logCount = Number(recentLogs[0]?.count || 0);
          if (logCount > 100) {
            newAlerts.push({
              id: 'activity',
              type: 'warning',
              source: 'النشاط',
              message: `نشاط مرتفع غير عادي: ${logCount} عملية في الساعة الأخيرة`,
              time: timeStr,
              icon: Activity,
            });
          }
        } catch { /* ignore */ }
      }

      // 6. Build system metrics
      const newMetrics: SystemMetric[] = [
        {
          label: 'اتصال الخادم',
          value: syncStatus === 'online' ? 100 : 0,
          max: 100,
          status: syncStatus === 'online' ? 'good' : 'critical',
          unit: '%',
        },
        {
          label: 'الحجوزات النشطة',
          value: totalBookings,
          max: Math.max(totalBookings, 100),
          status: totalBookings > 0 ? 'good' : 'warning',
          unit: 'حجز',
        },
        {
          label: 'المتأخرة',
          value: overdueBookings,
          max: totalBookings || 1,
          status: overdueBookings === 0 ? 'good' : overdueBookings > 3 ? 'critical' : 'warning',
          unit: 'حجز',
        },
        {
          label: 'المستحقات',
          value: unpaidBookings,
          max: totalBookings || 1,
          status: unpaidBookings === 0 ? 'good' : unpaidBookings > 5 ? 'critical' : 'warning',
          unit: 'حجز',
        },
      ];

      setAlerts(newAlerts);
      setMetrics(newMetrics);
      setStats({
        totalBookings,
        overdueBookings,
        unpaidBookings,
        onlineUsers: 0,
        totalUsers,
        todayBookings,
        syncStatus,
        dbSize: '...',
        lastSync: syncStatus === 'online' ? 'الآن' : 'غير متصل',
      });
    } catch (e) {
      console.error('War Room: system data fetch failed', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchSystemData]);

  const handleResolve = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const metricColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-rose-500';
      default: return 'bg-zinc-500';
    }
  };

  const metricTextColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'critical': return 'text-rose-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="h-full flex flex-col font-mono p-4 gap-4" dir="rtl">

      {/* Header */}
      <div className="bg-rose-950/20 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(244,63,94,0.05)_10px,rgba(244,63,94,0.05)_20px)] pointer-events-none" />
        <div className="absolute top-4 left-4 animate-pulse">
          <div className="w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_15px_#f43f5e]" />
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 rounded-xl text-rose-500 border border-rose-500/30">
              <Siren size={28} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-rose-500 tracking-tighter uppercase">غرفة العمليات</h2>
              <p className="text-[10px] text-rose-400/60 font-bold tracking-[0.15em] uppercase">
                WAR ROOM &bull; LIVE MONITORING &bull; {stats.syncStatus === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'}
              </p>
            </div>
          </div>
          <button onClick={fetchSystemData} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-zinc-300 flex items-center gap-1 transition-colors">
            <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-3 mt-4 relative z-10">
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-2xl font-black text-white">{stats.totalBookings}</p>
            <p className="text-[9px] text-zinc-500 uppercase">إجمالي الحجوزات</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-2xl font-black text-cyan-400">{stats.todayBookings}</p>
            <p className="text-[9px] text-zinc-500 uppercase">حجوزات اليوم</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
            <p className={`text-2xl font-black ${stats.overdueBookings > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{stats.overdueBookings}</p>
            <p className="text-[9px] text-zinc-500 uppercase">متأخرة</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-2xl font-black text-white">{stats.totalUsers}</p>
            <p className="text-[9px] text-zinc-500 uppercase">الموظفين</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">

        {/* Alerts Column */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-rose-500/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-rose-950/10 flex justify-between items-center">
            <h3 className="text-sm font-black text-rose-400 uppercase flex items-center gap-2">
              <ShieldAlert size={14} />
              التنبيهات ({alerts.length})
            </h3>
            <span className="flex items-center gap-2 text-[9px] font-mono text-gray-500">
              <Activity size={10} className="text-rose-500 animate-bounce" />
              مراقبة مباشرة
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-emerald-500 opacity-50">
                <CheckCircle size={48} className="mb-4" />
                <p className="text-lg font-bold">كل الأنظمة مستقرة</p>
                <p className="text-xs text-zinc-600 mt-1">لا توجد تنبيهات حالياً</p>
              </div>
            ) : (
              alerts.map(alert => {
                const AlertIcon = alert.icon;
                return (
                  <div key={alert.id} className={`relative overflow-hidden rounded-xl border p-4 flex items-center justify-between group transition-all duration-300
                    ${alert.type === 'critical'
                      ? 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10'
                      : alert.type === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                      : 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-white/5
                        ${alert.type === 'critical' ? 'bg-rose-500/20 text-rose-500' : alert.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}
                      >
                        <AlertIcon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            alert.type === 'critical' ? 'bg-rose-500 text-white' : alert.type === 'warning' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
                          }`}>
                            {alert.source}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">{alert.time}</span>
                        </div>
                        <h4 className="font-bold text-gray-200 text-sm">{alert.message}</h4>
                      </div>
                    </div>

                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-2 bg-white/5 hover:bg-emerald-500 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1 relative z-10"
                    >
                      <CheckCircle size={12} />
                      تجاهل
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System Status Column */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col overflow-hidden">
          <h3 className="text-sm font-black text-white uppercase flex items-center gap-2 mb-4">
            <Activity size={14} className="text-blue-400" />
            حالة النظام
          </h3>

          <div className="space-y-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
            {metrics.map((metric, idx) => (
              <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{metric.label}</span>
                  <span className={`text-[10px] font-mono ${metricTextColor(metric.status)}`}>
                    {metric.value} {metric.unit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${metricColor(metric.status)} ${metric.status === 'critical' ? 'animate-pulse' : ''}`}
                    style={{ width: `${Math.min((metric.value / metric.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Connection Status */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Supabase</span>
                <div className="flex items-center gap-1.5">
                  {stats.syncStatus === 'online' ? (
                    <><Wifi size={12} className="text-emerald-400" /><span className="text-[10px] text-emerald-400 font-mono">متصل</span></>
                  ) : (
                    <><WifiOff size={12} className="text-rose-400" /><span className="text-[10px] text-rose-400 font-mono">غير متصل</span></>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">SQLite</span>
                <div className="flex items-center gap-1.5">
                  <Database size={12} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-mono">نشط</span>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">آخر مزامنة</span>
                <span className="text-[10px] text-zinc-400 font-mono">{stats.lastSync}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWarRoomView;
