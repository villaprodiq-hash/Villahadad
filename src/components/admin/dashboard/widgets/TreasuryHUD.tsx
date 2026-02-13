
import React from 'react';
import { DollarSign, TrendingUp, CornerDownLeft } from 'lucide-react';

const TreasuryHUD: React.FC = () => {
    return (
        <div className="h-full w-full bg-[#0B0E14]/60 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cyan-500/5 blur-[40px] rounded-full group-hover:bg-cyan-500/10 transition-all"></div>
            
            <div className="flex justify-between items-start mb-8">
                <div>
                     <h3 className="text-[10px] font-black tracking-widest text-cyan-400/50 uppercase mb-1">الخزينة المركزية</h3>
                     <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">18.2M</span>
                        <span className="text-cyan-400 text-xs font-mono font-bold">د.ع</span>
                     </div>
                </div>
                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                    <DollarSign className="text-cyan-400" size={24} />
                </div>
            </div>

            <div className="space-y-4 mt-auto">
                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-cyan-500/20 transition-all cursor-pointer group/stat bg-slate-950/30">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">إجمالي المحصل</span>
                        <TrendingUp size={12} className="text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-emerald-400">+850,000</span>
                        <span className="text-[10px] text-emerald-400/50">مؤمن</span>
                    </div>
                 </div>

                 <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl hover:border-rose-500/30 transition-all cursor-pointer group/stat">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">الديون المستحقة</span>
                        <CornerDownLeft size={12} className="text-rose-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-rose-400">4,200,000</span>
                        <span className="text-[10px] text-rose-400/50">معلق</span>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default TreasuryHUD;
