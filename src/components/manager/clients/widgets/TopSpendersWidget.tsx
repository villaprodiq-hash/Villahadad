import React, { useMemo } from 'react';
import { Booking, BookingCategory } from '../../../../types';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { formatMoney } from '../../../../utils/formatMoney';
import { Crown, Sparkles, TrendingUp } from 'lucide-react';

interface TopSpendersWidgetProps {
    bookings: Booking[];
}

const TopSpendersWidget: React.FC<TopSpendersWidgetProps> = ({ bookings }) => {
    
    // Logic to calculate top spenders (only active bookings)
    const topSpenders = useMemo(() => {
        const clientMap = new Map<string, {
            id: string;
            name: string;
            phone: string;
            totalSpent: number;
            bookingsCount: number;
            avatar: string;
            isVIP: boolean;
        }>();

        // Filter active bookings only
        const activeBookings = bookings.filter(b => !b.deletedAt);

        activeBookings.forEach(booking => {
            const clientId = booking.clientId || booking.clientPhone; // Fallback to phone if ID missing
            const existing = clientMap.get(clientId);
            
            if (existing) {
                existing.totalSpent += booking.totalAmount;
                existing.bookingsCount += 1;
                // Upgrade to VIP if spent > 2M (Example logic)
                if (existing.totalSpent > 2000000) existing.isVIP = true;
            } else {
                clientMap.set(clientId, {
                    id: clientId,
                    name: booking.clientName,
                    phone: booking.clientPhone,
                    totalSpent: booking.totalAmount,
                    bookingsCount: 1,
                    avatar: booking.clientName.charAt(0),
                    isVIP: booking.category === BookingCategory.WEDDING || booking.totalAmount > 1000000
                });
            }
        });

        // Convert to array and sort
        return Array.from(clientMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10); // Top 10 only

    }, [bookings]);

    return (
        <ManagerDashboardCard title="قائمة الحيتان (Top Spenders)" className="h-full bg-white" noPadding>
            <div className="flex flex-col h-full">
                {/* Header Stats */}
                <div className="px-5 py-3 border-b  bg-gray-50/50 flex items-center justify-between">
                    <span className="text-xs text-gray-500">أعلى 10 عملاء إنفاقاً هذا العام</span>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-amber-600">القائمة الحية</span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-0">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-center w-12">#</th>
                                <th className="px-4 py-3">العميل</th>
                                <th className="px-4 py-3 text-center">الحجوزات</th>
                                <th className="px-4 py-3 text-left">إجمالي الصرف</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {topSpenders.map((client, index) => (
                                <tr key={client.id} className="group hover:bg-gray-50/80 transition-colors">
                                    <td className="px-4 py-3 text-center">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono mx-auto ${
                                            index === 0 ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200' :
                                            index === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' :
                                            index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                            'text-gray-400 bg-gray-50'
                                        }`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100 group-hover:border-indigo-200 transition-colors">
                                                    {client.avatar}
                                                </div>
                                                {index === 0 && (
                                                    <Crown size={12} className="absolute -top-1.5 -right-1.5 text-amber-500 fill-amber-500 drop-shadow-sm" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                    {client.name}
                                                    {client.isVIP && <Sparkles size={10} className="text-amber-500" />}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono tracking-wider">{client.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold ">
                                            {client.bookingsCount}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-left">
                                        <div className="flex items-center justify-end gap-2">
                                            <TrendingUp size={12} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <span className="font-bold font-mono text-gray-900">{formatMoney(client.totalSpent)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ManagerDashboardCard>
    );
};

export default TopSpendersWidget;
