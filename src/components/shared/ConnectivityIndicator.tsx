import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Globe, Server } from 'lucide-react';
import { offlineManager } from '../../services/offline/OfflineManager';

const ConnectivityIndicator: React.FC = () => {
  const [status, setStatus] = useState(offlineManager.getStatus());
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<'checked-in' | 'pending' | 'none'>('none');
  const [networkName, setNetworkName] = useState<string | null>(null);

  useEffect(() => {
    // Initial sync
    setStatus(offlineManager.getStatus());

    // Subscribe to updates
    const unsubscribe = offlineManager.subscribe((_event) => {
      setStatus(offlineManager.getStatus());
    });

    return () => unsubscribe();
  }, []);

  const isOnline = status.isOnline;
  const queueLength = status.queueLength;

  // Mock checking wifi network
  useEffect(() => {
    // Simulate network check
    if (isOnline) {
       // Randomly simulate being on correct network or not for demo
       setNetworkName('Studio_Guest_WiFi'); // Not Studio_5G
    }
  }, [isOnline]);

  const handleManualRequest = () => {
      // Mock sending request
      setAttendanceStatus('pending');
      setShowAttendanceModal(false);
      // toast.success('تم إرسال طلب الحضور اليدوي للمشرف');
  };

  return (
    <>
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/20 group relative cursor-pointer" onClick={() => setShowAttendanceModal(true)}>
      
      {/* Indicator Dot */}
      <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-colors duration-500 ${isOnline ? 'bg-emerald-500 shadow-emerald-500/50 animate-pulse' : 'bg-rose-500 shadow-rose-500/50'}`} />
      
      {/* Icon & Text */}
      <div className="flex flex-col leading-none">
         <span className={`text-[10px] font-bold tracking-wider ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isOnline ? 'متصل' : 'غير متصل'}
         </span>
         <span className="text-[8px] text-gray-400 font-mono">
            {isOnline ? 'النظام متصل' : 'وضع محلي'}
         </span>
      </div>

      {/* Sync Queue Warning */}
      {queueLength > 0 && (
          <div className="ml-2 px-1.5 py-0.5 bg-amber-500/20 rounded text-[9px] font-mono text-amber-400 border border-amber-500/30 flex items-center gap-1">
             <Server size={10} />
             {queueLength} بالانتظار
          </div>
      )}

      {/* Attendance Status Badge (Mini) */}
      <div className={`ml-2 px-2 py-0.5 rounded text-[8px] font-black uppercase ${
          attendanceStatus === 'checked-in' ? 'bg-emerald-500 text-black' :
          attendanceStatus === 'pending' ? 'bg-amber-500 text-black' : 
          'bg-gray-700 text-gray-400'
      }`}>
          {attendanceStatus === 'checked-in' ? 'IN' : attendanceStatus === 'pending' ? 'WAIT' : 'OUT'}
      </div>

      {/* Tooltip Wrapper with Bridge */}
      {/* Tooltip Wrapper with Bridge */}
      <div className="absolute top-full end-0 pt-2 w-72 max-w-[calc(100vw-2rem)] opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-1000 start-auto">
          <div className="p-4 bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl">
              <div className="space-y-3">
                 <div className="flex items-center justify-between pb-3 border-b border-white/5">
                     <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">حالة الاتصال</span>
                     {isOnline ? <Wifi size={14} className="text-emerald-500"/> : <WifiOff size={14} className="text-rose-500"/>}
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">الشبكة:</span>
                        <span className="text-white font-mono">{networkName || 'غير معروف'}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">زمن الاستجابة:</span>
                        <span className="text-gray-300 font-mono">{isOnline ? '12ms' : '0ms'}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">قائمة المزامنة:</span>
                        <span className={`${queueLength > 0 ? 'text-amber-400' : 'text-emerald-400'} font-mono`}>{queueLength} عنصر</span>
                    </div>
                 </div>

                 {/* Offline Mode Info */}
                 {!isOnline && (
                     <div className="pt-3 border-t border-white/5">
                         <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                             <p className="text-xs text-blue-200 font-bold mb-1.5 flex items-center gap-1.5">
                                 <Globe size={12} />
                                 وضع عدم الاتصال: عرض البيانات المحفوظة مؤقتاً
                             </p>
                             <p className="text-[10px] text-blue-400/80 leading-relaxed">
                                 يتم عرض البيانات المحفوظة محلياً. جميع التغييرات سيتم حفظها وسيتم مزامنتها تلقائياً عند استعادة الاتصال بالسيرفر.
                             </p>
                         </div>
                     </div>
                 )}

                 <div className="pt-3 border-t border-white/5">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">الحضور</span>
                        <span className={`text-[10px] font-black ${attendanceStatus === 'checked-in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {attendanceStatus === 'checked-in' ? 'تم التسجيل' : 'لم يتم التسجيل'}
                        </span>
                     </div>
                     {attendanceStatus === 'none' && (
                         <div className="text-[9px] text-gray-500 mb-1">
                             اضغط لطلب تسجيل الحضور
                         </div>
                     )}
                 </div>
              </div>
          </div>
      </div>
    </div>

    {/* Attendance Modal */}
    {showAttendanceModal && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowAttendanceModal(false)}>
            <div className="bg-[#1e1e24] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                    <Wifi size={20} className={networkName === 'Studio_5G' ? 'text-emerald-500' : 'text-amber-500'} />
                    تسجيل الحضور
                </h3>

                {networkName === 'Studio_5G' ? (
                     <div className="text-center py-6">
                         <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500 animate-pulse">
                             <Wifi size={32} />
                         </div>
                         <p className="text-emerald-400 font-bold mb-2">تم التحقق من الشبكة!</p>
                         <p className="text-xs text-gray-400 mb-6 font-mono">You are connected to Studio_5G secure network.</p>
                         <button 
                            onClick={() => { setAttendanceStatus('checked-in'); setShowAttendanceModal(false); }}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition-all"
                         >
                             تسجيل دخول فوري
                         </button>
                     </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                            <p className="text-xs text-amber-200 font-bold mb-1">شبكة غير مطابقة!</p>
                            <p className="text-[10px] text-amber-500/70">أنت متصل بـ &quot;{networkName}&quot;. يجب الاتصال بـ &quot;Studio_5G&quot; للتسجيل التلقائي.</p>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 block mb-2 font-bold">طلب تسجيل يدوي (يتطلب موافقة المشرف)</label>
                            <textarea 
                                value={requestReason}
                                onChange={e => setRequestReason(e.target.value)}
                                placeholder="اكتب سبب عدم الاتصال بالشبكة (مثال: نسيت الهاتف، مشكلة في الواي فاي...)"
                                className="w-full h-24 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-white/30 resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setShowAttendanceModal(false)}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-xl text-xs"
                            >
                                إلغاء
                            </button>
                            <button 
                                onClick={handleManualRequest}
                                disabled={!requestReason}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all"
                            >
                                إرسال الطلب
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )}
    </>
  );
};

export default ConnectivityIndicator;
