import React, { useMemo } from 'react';
import { Booking } from '../../../../types';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { RefreshCw, TrendingUp, Users } from 'lucide-react';

interface ClientRetentionWidgetProps {
    bookings: Booking[];
}

const ClientRetentionWidget: React.FC<ClientRetentionWidgetProps> = ({ bookings }) => {
    
    const retentionData = useMemo(() => {
        const clientCounts = new Map<string, number>();
        
        bookings.forEach(b => {
            const id = b.clientId || b.clientPhone;
            clientCounts.set(id, (clientCounts.get(id) || 0) + 1);
        });

        const totalClients = clientCounts.size;
        const returningClients = Array.from(clientCounts.values()).filter(count => count > 1).length;
        const rate = totalClients === 0 ? 0 : Math.round((returningClients / totalClients) * 100);

        return { rate, totalClients, returningClients };
    }, [bookings]);

    // Color logic based on "Healthy Studio" benchmarks
    const statusColor = retentionData.rate > 40 ? 'emerald' : retentionData.rate > 20 ? 'amber' : 'rose';

    return (
        <ManagerDashboardCard title="معدل العودة (Retention)" className="h-full bg-white" noPadding>
            <div className="p-5 flex flex-col items-center justify-center h-full text-center relative overflow-hidden">
                {/* Background Decoration */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 bg-${statusColor}-500`}></div>
                
                <div className="relative z-10">
                    <div className="flex items-center justify-center mb-2">
                         <div className={`p-3 rounded-full bg-${statusColor}-50 border border-${statusColor}-100`}>
                             <RefreshCw size={24} className={`text-${statusColor}-600`} />
                         </div>
                    </div>
                    
                    <div className="text-4xl font-black text-gray-900 tracking-tight font-mono mb-1">
                        {retentionData.rate}%
                    </div>
                    
                    <p className="text-xs text-gray-500 font-medium mb-4">
                        من الزبائن يعودون للحجز مرة أخرى
                    </p>

                    <div className="w-full bg-gray-50 rounded-lg p-3  flex justify-between items-center text-xs">
                        <div className="flex flex-col items-start">
                            <span className="text-gray-400">زبائن جدد</span>
                            <span className="font-bold text-gray-900">{retentionData.totalClients - retentionData.returningClients}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-gray-200"></div>
                        <div className="flex flex-col items-end">
                            <span className={`text-${statusColor}-600 font-bold`}>زبائن عادوا</span>
                            <span className="font-bold text-gray-900">{retentionData.returningClients}</span>
                        </div>
                    </div>

                    {retentionData.rate < 20 && (
                        <div className="mt-3 text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                             النسبة منخفضة، يرجى تحسين خدمة ما بعد البيع.
                        </div>
                    )}
                </div>
            </div>
        </ManagerDashboardCard>
    );
};

export default ClientRetentionWidget;
