import React from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { AvatarTooltip } from '../../../shared/AnimatedTooltip';

const TeamGrowthWidget: React.FC = () => {
    // Mock skills data
    const growthPlans = [
        { 
          user: 'أحمد', 
          designation: 'مصور فوتوغرافي',
          level: 3, 
          nextMilestone: 'Master Lighting', 
          progress: 75,
          aiTip: 'يحتاج للتركيز على توزيع الإضاءة.',
          element: '⚡'
        },
        { 
          user: 'سُرَى',
          designation: 'مونتير فيديو',
          level: 5, 
          nextMilestone: 'Team Lead', 
          progress: 40,
          aiTip: 'جاهزة لقيادة فريق صغير.',
          element: '🔥'
        },
    ];

    return (
        <ManagerDashboardCard title="التطوير والتدريب" className="h-full bg-white" noPadding>
            <div className="flex-1 space-y-4 p-4 overflow-y-auto custom-scrollbar">
                {growthPlans.map((plan, idx) => (
                    <div key={idx} className="relative group p-3 bg-gray-50 rounded-xl  hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <AvatarTooltip 
                                  name={plan.user}
                                  designation={plan.designation}
                                  size="sm"
                                  delay={idx * 50}
                                />
                                <div>
                                    <h4 className="font-bold text-gray-900 text-xs">{plan.user}</h4>
                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 rounded font-bold">Lvl {plan.level}</span>
                                </div>
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono">{plan.progress}% XP</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                             <div 
                                className="h-full bg-purple-600 rounded-full transition-all duration-1000" 
                                style={{ width: `${plan.progress}%` }} 
                             />
                        </div>

                        {/* AI Tip Bubble */}
                        <div className="relative p-2 bg-linear-to-r from-amber-50 to-transparent border-l-2 border-amber-400 rounded-r-md">
                            <div className="flex gap-2 items-start">
                                <Zap size={12} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-gray-600 leading-snug">
                                    <span className="text-amber-700 font-bold block text-[9px]">AI COACH</span>
                                    {plan.aiTip}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <button className="w-full py-2 bg-gray-50 text-[10px] text-gray-500 hover:text-gray-900 transition-colors border-t  flex items-center justify-center gap-1">
                عرض المسار الكامل <ChevronRight size={10} />
            </button>
        </ManagerDashboardCard>
    );
};

export default TeamGrowthWidget;

