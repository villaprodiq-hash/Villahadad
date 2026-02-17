
import React, { useState } from 'react';
import { 
  Settings, Shield, Database, Users, Lock, 
  Cpu, Activity, RefreshCw, Server, ShieldAlert, Trash2,
  type LucideIcon,
} from 'lucide-react';
import { User, UserRole, RoleLabels } from '../../../types';

interface AdminSystemViewProps {
  users?: User[];
  onUpdateUser?: (id: string, updates: Partial<User>) => void;
}

type ToggleState = {
  maintenance: boolean;
  tracking: boolean;
  backup: boolean;
  mfa: boolean;
  encryption: boolean;
};

const AdminSystemView: React.FC<AdminSystemViewProps> = ({ users = [], onUpdateUser: _onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState('general');
    
    // Toggle State Map
    const [toggles, setToggles] = useState<ToggleState>({
        maintenance: false,
        tracking: true,
        backup: true,
        mfa: true,
        encryption: true
    });

    const toggleSetting = (key: keyof ToggleState) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const modules = [
        { 
            id: 'general', 
            label: 'الإعدادات العامة', 
            icon: Settings,
            description: 'تكوين النظام الأساسي وبروتوكولات Sentinel',
            stats: [
                { label: 'إصدار النظام', value: 'v2.4.0 (Sentinel)' },
                { label: 'آخر تحديث', value: '02.01.2026' }
            ] 
        },
        { 
            id: 'users',
            label: 'بروتوكول الأفراد (Staff)',
            icon: Users,
            description: 'إدارة الطاقم والصلاحيات الأمنية',
            stats: [
                { label: 'إجمالي الطاقم', value: (users || []).length.toString() },
                { label: 'المشرفين', value: (users || []).filter(u => u.role === UserRole.ADMIN || u.role === UserRole.MANAGER).length.toString() }
            ]
        },
        { 
             id: 'security', 
             label: 'الحماية والأمان', 
             icon: Shield,
             description: 'إدارة الصلاحيات وتشفير البيانات',
             stats: [
                 { label: 'مستوى التشفير', value: 'AES-256' },
                 { label: 'حالة الجدار الناري', value: 'نشط' }
             ]
         },
         { 
             id: 'database', 
             label: 'قواعد البيانات', 
             icon: Database,
             description: 'إدارة النسخ الاحتياطي وفهرسة البيانات',
             stats: [
                 { label: 'حجم القاعدة', value: '2.4 GB' },
                 { label: 'آخر نسخة', value: 'منذ 2 ساعة' }
             ]
         },
    ];

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 font-mono" dir="rtl">
            
            {/* Header */}
            <div className="bg-[#0B0E14]/60 backdrop-blur-3xl border border-cyan-500/20 rounded-[2.5rem] p-8 mb-6 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                 <div className="flex items-center gap-6 relative z-10">
                    <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.2)]">
                        <Cpu size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">تكوين النظام المركزي</h2>
                        <p className="text-[12px] text-cyan-400/50 font-mono tracking-[0.2em] uppercase">System Configuration / Node_Zero</p>
                    </div>
                 </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden min-h-0">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-80 flex flex-col gap-3 overflow-y-auto no-scrollbar pb-6 shrink-0">
                    {modules.map((module) => (
                        <button
                            key={module.id}
                            onClick={() => setActiveTab(module.id)}
                            className={`p-6 rounded-3xl text-right transition-all group relative overflow-hidden border ${activeTab === module.id ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className={`p-2 rounded-xl transition-colors ${activeTab === module.id ? 'bg-cyan-500 text-black' : 'bg-white/10 text-gray-400 group-hover:text-white'}`}>
                                    <module.icon size={20} />
                                </div>
                                <span className={`text-sm font-black uppercase ${activeTab === module.id ? 'text-cyan-400' : 'text-gray-400 group-hover:text-white'}`}>
                                    {module.label}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed mb-4 font-sans">{module.description}</p>
                            
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                {module.stats.map((stat, i) => (
                                    <div key={i} className="bg-black/40 p-2 rounded-lg border border-white/5">
                                        <p className="text-[8px] text-gray-600 mb-1">{stat.label}</p>
                                        <p className="text-[10px] font-bold text-gray-300">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {activeTab === module.id && (
                                <div className="absolute inset-y-0 right-0 w-1 bg-cyan-500 shadow-[0_0_15px_#00F2FF]"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-[#0B0E14]/60 border border-cyan-500/10 rounded-[3rem] p-8 overflow-y-auto custom-scrollbar relative shadow-inner">
                    <div className="absolute top-8 left-8 text-cyan-500/20">
                         {toggles.tracking && <Activity className="animate-pulse" size={24} />}
                    </div>

                    {activeTab === 'general' && (
                        <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SectionHeader title="معلمات النظام الأساسية" icon={Server} />
                            
                            <div className="space-y-4">
                                <SettingToggle 
                                    label="وضع الصيانة (Maintenance Mode)" 
                                    desc="إيقاف جميع العمليات وحصر الدخول للمشرف" 
                                    active={toggles.maintenance} 
                                    onToggle={() => toggleSetting('maintenance')}
                                />
                                <SettingToggle 
                                    label="سجل تتبع المستخدمين (User Tracking)" 
                                    desc="تسجيل جميع تحركات المستخدمين في قاعدة البيانات" 
                                    active={toggles.tracking} 
                                    onToggle={() => toggleSetting('tracking')}
                                />
                                <SettingToggle 
                                    label="نسخ احتياطي تلقائي (Auto-Backup)" 
                                    desc="إجراء نسخ احتياطي كل 12 ساعة" 
                                    active={toggles.backup} 
                                    onToggle={() => toggleSetting('backup')}
                                />
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <button className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-black hover:bg-red-500 hover:text-white transition-all">
                                    <RefreshCw size={14} />
                                    إعادة تشغيل النظام
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                            <SectionHeader title="قائمة الطاقم المصرح لهم (Authorized Personnel)" icon={Users} />
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                {users.map((user) => (
                                    <div key={user.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:border-cyan-500/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-black">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                                    {user.name}
                                                    {user.role === UserRole.ADMIN && <Shield size={12} className="text-cyan-400" />}
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase">{user.jobTitle || RoleLabels[user.role]}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="px-3 py-1 bg-black/40 rounded-lg border border-white/5">
                                                <p className="text-[9px] text-gray-500">مستوى الوصول</p>
                                                <p className="text-[10px] font-bold text-cyan-400">{user.role.toUpperCase()}</p>
                                            </div>
                                            <button className="p-2 text-gray-500 hover:text-white transition-colors">
                                                <Settings size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <SectionHeader title="صلاحيات الوصول" icon={Lock} />
                             <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-4">
                                <ShieldAlert className="text-amber-500 shrink-0" size={24} />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-500 mb-1">تنبيه أمني</h4>
                                    <p className="text-[10px] text-gray-400 leading-relaxed">تم رصد محاولة دخول غير مصرح بها من IP غير معروف في 2026-01-01 04:20:00.</p>
                                </div>
                             </div>
                             
                             <div className="space-y-4">
                                <SettingToggle 
                                    label="مصادقة ثنائية (2FA) للمشرفين" 
                                    desc="تطلب رمز تحقق عند تسجيل الدخول" 
                                    active={toggles.mfa} 
                                    onToggle={() => toggleSetting('mfa')}
                                />
                                <SettingToggle 
                                    label="تشفير البيانات الحساسة" 
                                    desc="تشفير بيانات العملاء المالية في قاعدة البيانات" 
                                    active={toggles.encryption} 
                                    onToggle={() => toggleSetting('encryption')}
                                />
                             </div>
                        </div>
                    )}

                     {activeTab === 'database' && (
                        <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <SectionHeader title="صحة البيانات" icon={Database} />
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase mb-2">حالة الاتصال</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-xl font-black text-white">متصل</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                    <p className="text-[10px] text-blue-500 font-bold uppercase mb-2">زمن الاستجابة</p>
                                    <span className="text-xl font-black text-white">24ms</span>
                                </div>
                             </div>

                             <div className="pt-8 border-t border-white/5 space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">أدوات الصيانة المتقدمة</h4>
                                
                                <div className="flex gap-4">
                                     <button 
                                       onClick={async () => {
                                          if (confirm('هل أنت متأكد من تنظيف البيانات الوهمية؟ (Test/Demo)')) {
                                              try {
                                                  // Dynamically import service to avoid circular deps if needed, or assume global availability
                                                  // For now, using direct import as it's safe in component
                                                  const { bookingService } = await import('../../../services/db/services/BookingService');
                                                  const count = await bookingService.deleteTestBookings();
                                                  alert(`✅ تم تنظيف ${count} سجل وهمي بنجاح.`);
                                              } catch (e) {
                                                  alert('❌ حدث خطأ أثناء التنظيف.');
                                                  console.error(e);
                                              }
                                          }
                                       }}
                                       className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-xs font-black hover:bg-amber-500 hover:text-white transition-all group"
                                    >
                                        <Trash2 size={16} />
                                        <span>تنظيف البيانات الوهمية (Smart Clean)</span>
                                    </button>

                                     <button className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl text-xs font-black hover:bg-cyan-500 hover:text-black transition-all">
                                        <RefreshCw size={16} />
                                        <span>إعادة فهرسة البيانات</span>
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    * &quot;تنظيف البيانات الوهمية&quot; سيقوم بحذف الحجوزات التي تحتوي على أسماء &quot;Test&quot;, &quot;Demo&quot; أو أرقام هواتف غير صحيحة فقط. هذا الإجراء آمن للاستخدام.
                                </p>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SectionHeaderProps {
  title: string;
  icon: LucideIcon;
}

interface SettingToggleProps {
  label: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
        <Icon size={18} className="text-cyan-400" />
        <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
    </div>
);

const SettingToggle: React.FC<SettingToggleProps> = ({ label, desc, active, onToggle }) => (
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-cyan-500/20 transition-all group cursor-pointer text-right">
        <div>
            <h4 className="text-xs font-bold text-gray-200 mb-1 group-hover:text-cyan-400 transition-colors">{label}</h4>
            <p className="text-[10px] text-gray-500">{desc}</p>
        </div>
        <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${active ? 'bg-cyan-500/20 border border-cyan-500/50 justify-end' : 'bg-white/5 border border-white/10 justify-start'}`}>
            <div className={`w-3.5 h-3.5 rounded-full transition-colors shadow-sm ${active ? 'bg-cyan-500 shadow-[0_0_10px_#00F2FF]' : 'bg-gray-500'}`}></div>
        </div>
    </button>
);

export default AdminSystemView;
