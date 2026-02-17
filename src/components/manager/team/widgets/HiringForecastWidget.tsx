import React from 'react';
import { UserPlus, ArrowUpRight } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';

const HiringForecastWidget: React.FC = () => {
    return (
        <ManagerDashboardCard title="التوظيف التنبئي" className="h-full bg-white" noPadding>
            <div className="p-5 h-full flex flex-col justify-between relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
                
                <div>
                   <div className="flex items-center gap-2 mb-4">
                       <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                           <UserPlus size={18} />
                       </div>
                       <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">+42% Growth</span>
                   </div>

                   <div className="mb-2">
                        <span className="text-3xl font-bold text-gray-900 tracking-tight">2</span>
                        <span className="text-lg font-medium text-gray-500 mx-2">مصور فيديو</span>
                   </div>
                   
                   <p className="text-xs text-gray-500 leading-relaxed">
                        زيادة متوقعة في حجوزات الصيف. يُنصح بالبدء قبل <span className="font-bold text-gray-900 border-b border-blue-200">1 مايو</span>.
                   </p>
                </div>

                <button className="w-full mt-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <span>بدء التوظيف</span>
                    <ArrowUpRight size={14} />
                </button>
            </div>
        </ManagerDashboardCard>
    );
};

export default HiringForecastWidget;
