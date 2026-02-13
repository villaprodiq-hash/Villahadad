import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, DollarSign, Users, CalendarCheck, Image, ChevronRight, MoreVertical, HardDrive, CheckCircle, Clock } from 'lucide-react';
import { GlowCard } from './GlowCard';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- 1. StatCards (البطاقات الأربعة العلوية) ---
interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = React.memo(({
  title, value, icon: Icon, trend, trendUp, description, delay = 0
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: delay }}
    className="h-full"
  >
    <GlowCard className="h-full p-6 flex flex-col justify-between relative overflow-hidden group min-h-[160px]">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1 z-10">
          <span className="text-gray-400 text-xs font-bold tracking-wider uppercase">{title}</span>
          <h3 className="text-3xl font-bold text-white tracking-tight mt-1">{value}</h3>
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-500 ease-out">
          <Icon size={24} className="text-white/90 drop-shadow-lg" />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-auto z-10">
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${trendUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend}</span>
          </div>
        )}
        {description && <span className="text-xs text-gray-500 font-medium truncate">{description}</span>}
      </div>
    </GlowCard>
  </motion.div>
));

export const StatCards = () => {
  const stats = [
    { title: 'الإيرادات', value: '18.5M', icon: DollarSign, trend: '+12.5%', trendUp: true, description: 'مقارنة بالشهر السابق' },
    { title: 'الحجوزات', value: '124', icon: CalendarCheck, trend: '+4.2%', trendUp: true, description: 'حجز مؤكد' },
    { title: 'العملاء', value: '48', icon: Users, trend: '-2.1%', trendUp: false, description: 'عميل جديد' },
    { title: 'المعالجة', value: '86%', icon: Image, trend: '+18%', trendUp: true, description: 'كفاءة العمل' }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
      {stats.map((s, i) => <StatCard key={i} {...s} delay={i * 0.1} />)}
    </div>
  );
};


// --- 2. ProjectAnalyticsChart (تشارت الإحصائيات) ---
export const ProjectAnalyticsChart = () => {
  const data = [
    { name: 'S', uv: 4000 }, { name: 'M', uv: 3000 }, { name: 'T', uv: 2000 },
    { name: 'W', uv: 2780 }, { name: 'T', uv: 1890 }, { name: 'F', uv: 2390 }, { name: 'S', uv: 3490 },
  ];

  return (
    <GlowCard className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">تحليل المشاريع</h3>
      </div>
      <div className="h-[250px] w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C94557" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#C94557" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="uv" stroke="#C94557" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  );
};


// --- 3. MiniCalendar (تقويم مصغر) ---
export const MiniCalendar = () => {
  const days = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);
  const today = new Date().getDate();

  return (
    <GlowCard className="p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">نوفمبر 2025</h3>
        <button className="p-1 hover:bg-white/5 rounded-lg"><ChevronRight size={16} className="text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center mb-2">
        {days.map(d => <span key={d} className="text-[10px] text-gray-500 font-medium">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {dates.slice(0, 28).map(d => (
          <button 
            key={d} 
            className={`
              h-8 w-8 rounded-lg text-xs flex items-center justify-center transition-all
              ${d === today 
                ? 'bg-[#C94557] text-white shadow-[0_0_15px_rgba(201,69,87,0.4)]' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'}
            `}
          >
            {d}
          </button>
        ))}
      </div>
    </GlowCard>
  );
};


// --- 4. StorageCard (بطاقة التخزين) ---
export const StorageCard = () => {
  return (
    <GlowCard className="p-6 h-full flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <HardDrive size={100} />
      </div>
      <div className="z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
             <HardDrive size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">مساحة السيرفر</h3>
            <span className="text-xs text-gray-400">Synology DS920+</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">المستخدم</span>
            <span className="text-white font-bold">7.2 TB</span>
          </div>
          <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 w-[75%]" />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>75% ممتلئ</span>
            <span>الإجمالي 10 TB</span>
          </div>
        </div>
      </div>
    </GlowCard>
  );
};


// --- 5. ProfileCard (بطاقة البروفايل المصغرة) ---
export const ProfileCard = () => {
  return (
    <GlowCard className="p-6 h-full flex flex-col items-center justify-center text-center relative">
       <div className="absolute top-2 right-2">
          <button className="text-gray-500 hover:text-white"><MoreVertical size={16}/></button>
       </div>
       <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-br from-[#C94557] to-purple-600 mb-4 shadow-[0_0_20px_rgba(201,69,87,0.3)]">
          <div className="w-full h-full rounded-full bg-zinc-900 border-2 border-zinc-800 overflow-hidden">
             {/* Avatar Image Placeholder */}
             <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-2xl">👩‍💼</div>
          </div>
       </div>
       <h3 className="text-xl font-bold text-white">سُرى محمد</h3>
       <span className="text-sm text-[#C94557] font-medium mb-4">مدير عام</span>
       
       <div className="flex gap-4 w-full mt-2">
          <div className="flex-1 p-2 rounded-xl bg-white/5 border border-white/5">
             <CheckCircle size={16} className="text-emerald-400 mx-auto mb-1"/>
             <span className="text-xs text-gray-400 block">المهام</span>
             <span className="text-sm font-bold text-white">12</span>
          </div>
          <div className="flex-1 p-2 rounded-xl bg-white/5 border border-white/5">
             <Clock size={16} className="text-amber-400 mx-auto mb-1"/>
             <span className="text-xs text-gray-400 block">ساعات</span>
             <span className="text-sm font-bold text-white">8.5</span>
          </div>
       </div>
    </GlowCard>
  );
};

export default StatCards;