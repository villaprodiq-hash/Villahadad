import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Server, HardDrive, Calendar } from 'lucide-react';
import { conflictManager } from '../../../services/offline/ConflictManager';
import { ConflictRecord } from '../../../services/db/schema';
import { toast } from 'sonner';

const ConflictResolutionView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // Load conflicts
    setConflicts(conflictManager.getConflicts());
  }, []);

  const handleResolve = (id: string, resolution: 'local' | 'server') => {
    conflictManager.resolveConflict(id, resolution);
    setConflicts(prev => prev.filter(c => c.id !== id));
    toast.success(resolution === 'local' ? 'تم اعتماد النسخة المحلية ✅' : 'تم اعتماد نسخة السيرفر ✅');
    
    if (activeId === id) setActiveId(null);
  };

  const activeConflict = conflicts.find(c => c.id === activeId) || conflicts[0];

  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <Check size={40} className="text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">All Clear!</h3>
        <p className="text-gray-500 max-w-md">جميع البيانات متزامنة بنجاح. لا توجد تعارضات معلقة.</p>
        <button onClick={onBack} className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
            العودة للوحة التحكم
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                   <AlertTriangle className="text-amber-500" />
                   حل تعارض البيانات
                </h2>
                <p className="text-gray-500 mt-1">يوجد {conflicts.length} حالات تتطلب التدخل اليدوي</p>
            </div>
            <button onClick={onBack} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900">
                إغلاق
            </button>
        </div>

        <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-80 border-l border-gray-100 flex flex-col gap-2 overflow-y-auto pr-2">
                {conflicts.map(conflict => (
                    (() => {
                      const localData = parseComparisonData(conflict.localData);
                      return (
                    <button
                        key={conflict.id}
                        onClick={() => setActiveId(conflict.id)}
                        className={`p-4 rounded-xl text-right transition-all border ${activeConflict?.id === conflict.id ? 'bg-amber-50 border-amber-500/30 ring-2 ring-amber-500/10' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                {localData.title || 'حجز بدون عنوان'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(conflict.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-800 font-bold mb-1">{localData.clientName || 'عميل غير معروف'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <AlertTriangle size={12} className="text-amber-500" />
                            <span>تضارب في البيانات</span>
                        </div>
                    </button>
                      );
                    })()
                ))}
            </div>

            {/* Comparison Area */}
            {activeConflict && (
                <div className="flex-1 bg-gray-50 rounded-2xl p-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-8 h-full">
                        
                        {/* Server Version */}
                        <div className="flex flex-col gap-4">
                            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                        <Server size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-blue-900">نسخة السيرفر</h3>
                                        <p className="text-xs text-blue-500">الموجودة حالياً في قاعدة البيانات</p>
                                    </div>
                                </div>
                            </div>
                            
                            <ComparisonCard data={parseComparisonData(activeConflict.serverData)} type="server" />

                            <button 
                                onClick={() => handleResolve(activeConflict.id, 'server')}
                                className="mt-auto w-full py-4 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
                            >
                                اعتماد السيرفر وإلغاء المحلي
                            </button>
                        </div>

                        {/* Local Version */}
                        <div className="flex flex-col gap-4">
                            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                        <HardDrive size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-emerald-900">النسخة المحلية</h3>
                                        <p className="text-xs text-emerald-500">التي تحاول حفظها الآن</p>
                                    </div>
                                </div>
                            </div>

                            <ComparisonCard data={parseComparisonData(activeConflict.localData)} type="local" />

                            <button 
                                onClick={() => handleResolve(activeConflict.id, 'local')}
                                className="mt-auto w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                اعتماد النسخة المحلية
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

const ComparisonCard: React.FC<{ data: { clientName?: string; title?: string; shootDate?: string; status?: string }, type: 'server' | 'local' }> = ({ data, type }) => {
  const isLocal = type === 'local';
  
  return (
    <div className={`p-6 rounded-2xl border flex-1 space-y-4 ${isLocal ? 'bg-white border-emerald-100' : 'bg-white border-blue-100'}`}>
        <div className="space-y-1">
            <label className="text-xs text-gray-400">اسم العميل</label>
            <p className="font-bold text-lg text-gray-800">{data.clientName}</p>
        </div>

        <div className="space-y-1">
            <label className="text-xs text-gray-400">نوع الحجز</label>
            <p className="font-medium text-gray-700">{data.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12}/> التاريخ</label>
                <p className="font-mono text-gray-700">{data.shootDate || 'غير محدد'}</p>
            </div>
            <div className="space-y-1">
                <label className="text-xs text-gray-400">الحالة</label>
                <Badge status={data.status ?? ''} />
            </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
             <div className="space-y-1">
                <label className="text-xs text-gray-400">آخر تعديل</label>
                <p className="text-xs font-mono text-gray-500">
                    {new Date().toLocaleString()} 
                    {/* Simulator timestamp */}
                </p>
            </div>
        </div>
    </div>
  );
};

const Badge: React.FC<{ status: string }> = ({ status }) => {
    return (
        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold">
            {status}
        </span>
    );
}

export default ConflictResolutionView;
  interface ComparisonData {
    clientName?: string;
    title?: string;
    shootDate?: string;
    status?: string;
  }

  const parseComparisonData = (value: unknown): ComparisonData => {
    if (typeof value !== 'object' || value === null) return {};
    const record = value as Record<string, unknown>;
    return {
      clientName: typeof record.clientName === 'string' ? record.clientName : undefined,
      title: typeof record.title === 'string' ? record.title : undefined,
      shootDate: typeof record.shootDate === 'string' ? record.shootDate : undefined,
      status: typeof record.status === 'string' ? record.status : undefined,
    };
  };
