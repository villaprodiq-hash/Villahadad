
import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, ShieldAlert, Award, FileText, 
  Search, AlertCircle, Plus, MoreHorizontal 
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { User, UserRole, RoleLabels } from '../../../types';
import { toast } from 'sonner';

const AdminPersonnelView = () => {
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [notesBuffer, setNotesBuffer] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPersonnel = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .is('deleted_at', null);
            
            if (error) throw error;

            if (data) {
                // Ensure preferences are parsed correctly if they come as string locally (though supabase-js usually handles JSON)
                const parsedUsers = data.map(u => ({
                    ...u,
                    preferences: typeof u.preferences === 'string' ? JSON.parse(u.preferences) : u.preferences || {}
                })) as User[];
                setPersonnel(parsedUsers);
            }
        } catch (err) {
            console.error('Error fetching personnel:', err);
            toast.error('فشل في تحميل بيانات الموظفين');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPersonnel();
    }, []);

    // Update local notes buffer when selection changes
    useEffect(() => {
        if (selectedPersonId) {
            const user = personnel.find(p => p.id === selectedPersonId);
            setNotesBuffer(user?.preferences?.hr_notes || '');
        }
    }, [selectedPersonId, personnel]);

    const handleSaveNotes = async () => {
        if (!selectedPersonId) return;

        const user = personnel.find(p => p.id === selectedPersonId);
        if (!user) return;

        const updatedPreferences = {
            ...user.preferences,
            hr_notes: notesBuffer
        };

        try {
            const { error } = await supabase
                .from('users')
                .update({ preferences: updatedPreferences })
                .eq('id', selectedPersonId);

            if (error) throw error;

            toast.success('تم حفظ الملاحظات بنجاح');
            
            // Update local state
            setPersonnel(prev => prev.map(p => 
                p.id === selectedPersonId 
                ? { ...p, preferences: updatedPreferences } 
                : p
            ));

        } catch (err) {
            console.error('Error saving notes:', err);
            toast.error('فشل في حفظ الملاحظات');
        }
    };

    const selectedPerson = personnel.find(p => p.id === selectedPersonId);
    
    const filteredPersonnel = personnel.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (RoleLabels[p.role] || p.role).includes(searchTerm)
    );

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 font-mono text-right" dir="rtl">
            
            {/* Personnel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                
                {/* List */}
                <div className="col-span-1 bg-[#0B0E14]/60 border border-white/5 rounded-4xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-black/20">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="بحث في السجلات..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-purple-500/50"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {loading ? (
                            <div className="text-center text-gray-500 py-10 text-xs">جاري التحميل...</div>
                        ) : filteredPersonnel.length === 0 ? (
                            <div className="text-center text-gray-500 py-10 text-xs">لا يوجد موظفين</div>
                        ) : (
                            filteredPersonnel.map(p => {
                                const strikes = p.preferences?.hr_strikes || 0;
                                const performance = p.preferences?.hr_performance || 100; // Default to 100 if undefined

                                return (
                                    <button 
                                        key={p.id}
                                        onClick={() => setSelectedPersonId(p.id)}
                                        className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between group
                                            ${selectedPersonId === p.id 
                                                ? 'bg-purple-500/10 border-purple-500/30' 
                                                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden ${selectedPersonId === p.id ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-gray-800 text-gray-400'}`}>
                                                {p.avatar && !p.avatar.startsWith('bg-') ? (
                                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    p.name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-sm ${selectedPersonId === p.id ? 'text-white' : 'text-gray-300'}`}>{p.name}</h4>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase truncate max-w-[100px]">
                                                    {RoleLabels[p.role] || p.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {strikes > 0 && (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20">
                                                    <ShieldAlert size={10} /> {strikes}
                                                </span>
                                            )}
                                            <span className={`text-[9px] font-black ${performance >= 90 ? 'text-emerald-500' : performance >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {performance}%
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="col-span-1 lg:col-span-2 bg-[#0B0E14]/60 border border-white/5 rounded-4xl p-8 flex flex-col relative overflow-hidden">
                    {selectedPerson ? (
                        <>
                           <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-[0_0_30px_rgba(129,140,248,0.3)] border-2 border-white/10 overflow-hidden">
                                        {selectedPerson.avatar && !selectedPerson.avatar.startsWith('bg-') ? (
                                            <img src={selectedPerson.avatar} alt={selectedPerson.name} className="w-full h-full object-cover" />
                                        ) : (
                                            selectedPerson.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tight mb-1">{selectedPerson.name}</h2>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-wider">
                                                {RoleLabels[selectedPerson.role] || selectedPerson.role}
                                            </span>
                                            <span className="text-xs font-mono text-gray-500">
                                                {selectedPerson.email || 'No Email'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl transition-all" title="تسجيل مخالفة">
                                        <ShieldAlert size={20} />
                                    </button>
                                    <button className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all" title="مكافأة">
                                        <Award size={20} />
                                    </button>
                                </div>
                           </div>

                           <div className="grid grid-cols-2 gap-6 mb-8">
                               <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
                                   <h4 className="text-[10px] text-gray-500 font-bold uppercase mb-2">مؤشر الأداء</h4>
                                   <div className="flex items-end gap-2">
                                       <span className="text-4xl font-black text-emerald-400">
                                           {selectedPerson.preferences?.hr_performance || 100}
                                       </span>
                                       <span className="text-sm text-gray-500 mb-1">/ 100</span>
                                   </div>
                               </div>
                               <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
                                   <h4 className="text-[10px] text-gray-500 font-bold uppercase mb-2">المخالفات النشطة</h4>
                                   <div className="flex items-end gap-2">
                                       <span className={`text-4xl font-black ${(selectedPerson.preferences?.hr_strikes || 0) > 0 ? 'text-rose-500' : 'text-gray-300'}`}>
                                           {selectedPerson.preferences?.hr_strikes || 0}
                                       </span>
                                       <span className="text-sm text-gray-500 mb-1">مستوى الأمان</span>
                                   </div>
                               </div>
                           </div>

                           <div className="flex-1 bg-black/20 border border-white/5 rounded-2xl p-4 relative">
                                <h4 className="text-[10px] text-purple-400 font-bold uppercase mb-4 flex items-center gap-2">
                                    <FileText size={12} />
                                    ملاحظات الإدارة الخاصة (سرية)
                                </h4>
                                <textarea 
                                    className="w-full h-full bg-transparent text-gray-300 text-sm outline-none resize-none font-sans leading-relaxed"
                                    value={notesBuffer}
                                    onChange={(e) => setNotesBuffer(e.target.value)}
                                    placeholder="اكتب ملاحظاتك عن هذا الموظف هنا..."
                                />
                                <div className="absolute bottom-4 left-4">
                                    <button 
                                        onClick={handleSaveNotes}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                                    >
                                        حفظ الملاحظات
                                    </button>
                                </div>
                           </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                            <UserIcon size={64} strokeWidth={1} className="mb-4" />
                            <p className="text-lg font-bold">اختر سجل موظف لعرض التفاصيل</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPersonnelView;
