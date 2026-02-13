import React, { useEffect, useState } from 'react';
import { ConflictService, ConflictRecord } from '../../services/sync/ConflictService';
import { X, Check, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface ModalProps {
    onClose: () => void;
    managerName?: string;
}

export const ConflictResolverModal: React.FC<ModalProps> = ({ onClose, managerName = "Manager" }) => {
    const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentBooking, setCurrentBooking] = useState<any>(null);

    useEffect(() => {
        loadConflicts();
    }, []);

    const loadConflicts = async () => {
        setLoading(true);
        const data = await ConflictService.fetchPendingConflicts();
        setConflicts(data);
        setLoading(false);
        
        if (data.length > 0) {
             fetchCurrentVersion(data[0].booking_id);
        }
    };

    const fetchCurrentVersion = async (bookingId: string) => {
        const { data } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
        setCurrentBooking(data);
    };

    const handleResolve = async (id: string, decision: 'ACCEPT' | 'REJECT') => {
        try {
            await ConflictService.resolveConflict(id, decision, managerName);
            // Remove from list
            const remaining = conflicts.filter(c => c.id !== id);
            setConflicts(remaining);
            
            if (remaining.length > 0) {
                fetchCurrentVersion(remaining[0].booking_id);
            } else {
                onClose();
            }
        } catch (e) {
            alert("فشل في تنفيذ العملية. تأكد من الاتصال.");
        }
    };

    if (loading) return null;

    const activeConflict = conflicts[0];
    if (!activeConflict) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#1F1F1F]">
                    <div>
                         <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            غرفة التدقيق وفض التضارب
                         </h2>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                             يوجد {conflicts.length} حالات تضارب تحتاج لقرارك.
                         </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Body - Comparison View */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* LEFT: Current Version (Cloud) */}
                    <div className="flex-1 p-6 overflow-y-auto border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151515]">
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                النسخة الحالية (السحابية)
                            </span>
                            <span className="text-xs text-gray-500">
                                آخر تعديل: {currentBooking?.updated_by_name || 'غير معروف'}
                            </span>
                        </div>
                        
                        <BookingCard data={currentBooking} isProposed={false} />
                    </div>

                    {/* CENTER: Arrow */}
                    <div className="w-12 flex items-center justify-center bg-white dark:bg-[#1A1A1A] z-10">
                        <ArrowRight className="text-gray-300 dark:text-gray-600" />
                    </div>

                    {/* RIGHT: Proposed Version (Conflict) */}
                    <div className="flex-1 p-6 overflow-y-auto bg-amber-50/30 dark:bg-amber-900/10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                المقترح الجديد
                            </span>
                             <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                المقترح من: {activeConflict.proposed_by_name} ({activeConflict.proposed_by_rank})
                            </span>
                        </div>

                        <BookingCard data={activeConflict.proposed_data} isProposed={true} original={currentBooking} />
                    </div>
                </div>

                {/* Footer - Decisions */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1F1F1F] flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        بقبولك للتعديل، سيتم اعتماده كحقيقة نهائية ومسح النسخة القديمة.
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => handleResolve(activeConflict.id, 'REJECT')}
                            className="px-6 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20 font-medium flex items-center gap-2 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            رفض (إبقاء الحالي)
                        </button>
                        
                        <button 
                            onClick={() => handleResolve(activeConflict.id, 'ACCEPT')}
                            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 font-bold flex items-center gap-2 transition-all"
                        >
                            <Check className="w-5 h-5" />
                            قبول التعديل المقترح
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Component to display booking data
const BookingCard = ({ data, isProposed, original }: { data: any, isProposed: boolean, original?: any }) => {
    if (!data) return <div className="p-10 text-center text-gray-400">جاري التحميل...</div>;

    const fields = [
        { key: 'client_name', label: 'العميل' },
        { key: 'phone', label: 'الهاتف' },
        { key: 'title', label: 'عنوان المناسبة' },
        { key: 'shoot_date', label: 'تاريخ التصوير', isTime: true },
        { key: 'total_amount', label: 'المبلغ الكلي', isMoney: true },
        { key: 'status', label: 'الحالة' },
        { key: 'notes', label: 'ملاحظات' },
    ];

    return (
        <div className="space-y-4">
            {fields.map(f => {
                const val = data[f.key];
                const originalVal = original ? original[f.key] : null;
                const isChanged = isProposed && original && val != originalVal;

                return (
                    <div key={f.key} className={`p-3 rounded-lg border ${isChanged ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' : 'border-transparent hover:bg-white dark:hover:bg-gray-800'} transition-all`}>
                        <div className="text-xs text-gray-400 mb-1">{f.label}</div>
                        <div className={`font-medium ${isChanged ? 'text-amber-800 dark:text-amber-200' : 'text-gray-800 dark:text-gray-200'}`}>
                            {val || '-'}
                        </div>
                        {isChanged && (
                            <div className="mt-1 text-xs text-red-400 line-through">
                                كان: {originalVal || '(فارغ)'}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
}
