import React from 'react';
import { CheckCircle2, Clock, Sparkles, ArrowRight } from 'lucide-react';

interface ClientDashboardOverviewProps {
  selectedCount: number;
  totalLimit: number;
  deadlineDays: number;
  onSubmit: () => void;
}

const ClientDashboardOverview: React.FC<ClientDashboardOverviewProps> = ({ 
  selectedCount, 
  totalLimit, 
  deadlineDays,
  onSubmit 
}) => {
  const percentage = Math.min(100, Math.round((selectedCount / totalLimit) * 100));
  const isComplete = selectedCount >= totalLimit;
  const isOverLimit = selectedCount > totalLimit;

  // Workflow Steps
  const steps = [
    { id: 1, label: 'المشاهدة الأولية', status: 'completed' },
    { id: 2, label: 'تحديد الصور', status: 'current' },
    { id: 3, label: 'التنقيح والمعالجة', status: 'upcoming' },
    { id: 4, label: 'الاستلام النهائي', status: 'upcoming' },
  ];

  return (
    <div className="w-full bg-linear-to-br from-indigo-900 via-slate-900 to-black rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl mb-8">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center justify-between">
        
        {/* 1. Progress Ring Section */}
        <div className="flex items-center gap-8 shrink-0">
            <div className="relative w-40 h-40 flex items-center justify-center">
                 {/* Glow */}
                 <div className={`absolute inset-0 blur-[30px] rounded-full opacity-40 ${isOverLimit ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-indigo-500'}`} />
                 
                 <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                     <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" strokeLinecap="round" />
                     <circle 
                        cx="80" cy="80" r="70" 
                        stroke={isOverLimit ? '#ef4444' : isComplete ? '#22c55e' : '#6366f1'} 
                        strokeWidth="12" fill="none"
                        strokeDasharray="440" 
                        strokeDashoffset={440 - (440 * percentage) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                     />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                     <span className={`text-4xl font-black tracking-tight ${isOverLimit ? 'text-red-400' : 'text-white'}`}>
                        {selectedCount}
                     </span>
                     <span className="text-xs font-bold text-white/50 uppercase tracking-widest mt-0.5">من أصل {totalLimit}</span>
                 </div>
            </div>

            <div>
                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                    {isComplete ? 'اكتمل الاختيار!' : 'قيد الاختيار...'}
                    {isComplete && <Sparkles className="text-yellow-400 fill-yellow-400 animate-pulse" />}
                </h2>
                <p className="text-white/60 text-sm leading-relaxed max-w-[280px]">
                    {isOverLimit 
                        ? <span className="text-red-400 font-bold">تنبيه: لقد تجاوزت العدد المسموح. يرجى إزالة بعض الصور للإرسال.</span>
                        : 'قم باختيار صورك المفضلة لنقوم بمعالجتها وتسليمها بأعلى دقة.'
                    }
                </p>
                
                {/* Deadline Badge */}
                <div className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <Clock size={16} className={deadlineDays < 3 ? 'text-red-400' : 'text-indigo-300'} />
                    <span className="text-xs font-bold">
                        باقي <span className={deadlineDays < 3 ? 'text-red-400 text-sm mx-1' : 'text-white text-sm mx-1'}>{deadlineDays} أيام</span> للتسليم
                    </span>
                </div>
            </div>
        </div>

        {/* 2. Workflow Stepper */}
        <div className="flex-1 w-full max-w-2xl">
            <div className="flex justify-between relative mb-8">
                 {/* Connecting Line */}
                 <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 rounded-full" />
                 
                 {steps.map((step, i) => (
                     <div key={step.id} className="relative z-10 flex flex-col items-center gap-3 group">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                             step.status === 'completed' ? 'bg-green-500 border-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' :
                             step.status === 'current' ? 'bg-indigo-600 border-indigo-900 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110' :
                             'bg-slate-800 border-slate-700 text-slate-500'
                         }`}>
                             {step.status === 'completed' ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{i + 1}</span>}
                         </div>
                         <span className={`text-xs font-bold whitespace-nowrap transition-colors ${
                             step.status === 'current' ? 'text-white' : 
                             step.status === 'completed' ? 'text-green-400' : 'text-slate-500'
                         }`}>
                             {step.label}
                         </span>
                     </div>
                 ))}
            </div>

            {/* Action Area */}
            <div className="flex justify-end pt-4 border-t border-white/5">
                <button 
                  onClick={onSubmit}
                  disabled={selectedCount === 0 || isOverLimit}
                  className="flex items-center gap-3 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                >
                    <span>إرسال الاختيارات للمصور</span>
                    <ArrowRight size={20} className={isComplete ? "animate-pulse" : ""} />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ClientDashboardOverview;
