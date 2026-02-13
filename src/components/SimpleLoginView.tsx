import React, { useState } from 'react';
import { Shield, ShieldCheck, Crown, Code2, CalendarClock, Palette, Video, Printer, Eye } from 'lucide-react';

interface SimpleLoginViewProps {
  onLogin: (roleId: number, isSafeMode?: boolean) => void;
}

// Internal RoleCard Component
const RoleCard = ({ title, subtitle, icon: Icon, color, onClick, mini = false }: any) => (
  <button 
    onClick={onClick}
    className={`relative group overflow-hidden bg-[#18181b] border border-white/5 rounded-2xl p-6 text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/10
      ${mini ? 'flex items-center gap-4 p-4' : 'flex flex-col items-center gap-4'}
    `}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
    
    <div className={`
      relative z-10 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-lg
      ${mini ? 'w-10 h-10' : 'w-16 h-16 mb-2'}
      bg-gradient-to-br ${color}
    `}>
      <Icon size={mini ? 20 : 32} className="text-white drop-shadow-md" />
    </div>

    <div className="relative z-10 flex flex-col items-center">
      <h3 className={`font-black text-white ${mini ? 'text-sm' : 'text-xl'}`}>{title}</h3>
      <p className={`text-gray-500 font-medium ${mini ? 'text-[10px]' : 'text-xs'}`}>{subtitle}</p>
    </div>
  </button>
);

export default function SimpleLoginView({ onLogin }: SimpleLoginViewProps) {
  const [showSafeMode, setShowSafeMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSafeModeLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // Hardcoded credentials for Safe Mode
      if (username === 'Admin' && password === '11335599') {
          onLogin(3, true); // 3 = Admin Role, true = Safe Mode
      } else {
          alert('بيانات الدخول غير صحيحة');
      }
  };

  if (showSafeMode) {
      return (
          <div className="h-screen bg-[#050505] flex items-center justify-center font-sans" dir="rtl">
              <div className="w-full max-w-md p-8 bg-[#1a1d21] rounded-2xl border border-red-500/20 shadow-2xl shadow-red-900/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-red-600 to-orange-600" />
                  
                  <div className="flex flex-col items-center mb-8 relative z-10">
                      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10">
                          <ShieldCheck size={40} className="text-red-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1">الوضع الآمن (Safe Mode)</h2>
                      <p className="text-gray-500 text-sm">للإدارة العليا واستعادة النظام فقط</p>
                  </div>

                  <form onSubmit={handleSafeModeLogin} className="space-y-5 relative z-10">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 mr-1">اسم المستخدم</label>
                          <input 
                              type="text" 
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500/50 outline-none transition-all placeholder:text-gray-700"
                              placeholder="Admin"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 mr-1">كلمة المرور</label>
                          <input 
                              type="password" 
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500/50 outline-none transition-all placeholder:text-gray-700 font-mono tracking-widest"
                              placeholder="••••••••"
                          />
                          <div className="flex justify-end">
                              <button 
                                type="button" 
                                onClick={() => alert('لإستعادة كلمة مرور وضع الأمان، يرجى التواصل مع المطور مباشرة.')}
                                className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                              >
                                نسيت كلمة المرور؟
                              </button>
                          </div>
                      </div>
                      <button 
                          type="submit"
                          className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 mt-4 active:scale-[0.98]"
                      >
                          دخول للوحة التحكم
                      </button>
                      <button 
                          type="button"
                          onClick={() => setShowSafeMode(false)}
                          className="w-full py-2 text-gray-500 hover:text-white text-sm transition-colors"
                      >
                          العودة للقائمة الرئيسية
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen bg-[#0a0f0d] flex items-center justify-center overflow-hidden relative font-sans" dir="rtl">
      
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-8 relative z-10 max-w-7xl w-full">
        <RoleCard 
          title="👑 المديرة" 
          subtitle="Manager Dashboard"
          icon={Crown} 
          color="from-rose-500 to-pink-600"
          onClick={() => onLogin(2)}
        />
        <RoleCard 
          title="👩‍💻 المطور" 
          subtitle="Developer Tools"
          icon={Code2} 
          color="from-purple-600 to-indigo-600"
          onClick={() => onLogin(1)}
        />
        <RoleCard 
          title="📅 الرسبشن" 
          subtitle="Front Desk"
          icon={CalendarClock} 
          color="from-emerald-500 to-teal-600"
          onClick={() => onLogin(4)}
        />
        <RoleCard 
          title="⚙️ الإدارة" 
          subtitle="Admin Panel"
          icon={ShieldCheck} 
          color="from-amber-500 to-orange-600"
          onClick={() => onLogin(3)}
        />
        
        {/* Editors Group */}
        <div className="space-y-4">
             <RoleCard 
              title="🎨 المصممين" 
              subtitle="Photo Editors"
              icon={Palette} 
              color="from-blue-500 to-cyan-600"
              onClick={() => onLogin(5)}
              mini
            />
             <RoleCard 
              title="🎬 المونتير" 
              subtitle="Video Editor"
              icon={Video} 
              color="from-red-500 to-orange-600"
              onClick={() => onLogin(6)}
              mini
            />
             <RoleCard 
              title="🖨️ الطباعة" 
              subtitle="Print Station"
              icon={Printer} 
              color="from-gray-500 to-slate-600"
              onClick={() => onLogin(7)}
              mini
            />
            {/* New Selector Role */}
             <RoleCard 
              title="👁️ العرض" 
              subtitle="Selection Gallery"
              icon={Eye} 
              color="from-amber-500 to-yellow-600"
              onClick={() => onLogin(8)}
              mini
            />
        </div>
      </div>

      {/* Safe Mode Trigger */}
      <button 
          onClick={() => setShowSafeMode(true)}
          className="absolute bottom-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all backdrop-blur-sm border border-white/5 hover:border-white/10"
          title="Safe Mode Access"
      >
          <ShieldCheck size={20} />
      </button>

      <div className="absolute bottom-8 text-center w-full pointer-events-none">
         <p className="text-white/20 text-sm font-mono tracking-widest">VILLA HADAD SYSTEM v4.0</p>
      </div>
    </div>
  );
}
