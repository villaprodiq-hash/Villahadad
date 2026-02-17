import React, { useMemo, useState } from 'react';
import { Booking } from '../../../../types';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { Search, Phone, User as UserIcon, Calendar } from 'lucide-react';
import { formatMoney } from '../../../../utils/formatMoney';

interface ClientsLogWidgetProps {
    bookings: Booking[];
}

const ClientsLogWidget: React.FC<ClientsLogWidgetProps> = ({ bookings }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const clientsList = useMemo(() => {
        const clientMap = new Map();

        bookings.forEach(b => {
             const id = b.clientId || b.clientPhone;
             if (!clientMap.has(id)) {
                 clientMap.set(id, {
                     id,
                     name: b.clientName,
                     phone: b.clientPhone,
                     totalSpent: 0,
                     bookings: 0,
                     lastDate: b.shootDate,
                     category: b.category
                 });
             }
             const client = clientMap.get(id);
             client.totalSpent += b.totalAmount;
             client.bookings += 1;
             if (new Date(b.shootDate) > new Date(client.lastDate)) {
                 client.lastDate = b.shootDate;
             }
        });

        return Array.from(clientMap.values()).sort((a,b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
    }, [bookings]);

    const filteredList = clientsList.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
    );

    return (
        <ManagerDashboardCard title="سجل العملاء الشامل (Clients Log)" className="h-full bg-white" noPadding>
            <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="p-4 border-b  bg-gray-50/50 flex flex-col md:flex-row gap-3 justify-between items-center">
                    <div className="relative w-full md:w-64">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="بحث عن اسم أو رقم هاتف..." 
                            className="w-full pl-3 pr-9 py-2 bg-white  rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                        Showing {filteredList.length} Clients
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-gray-400 font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3">العميل</th>
                                <th className="px-4 py-3">رقم الهاتف</th>
                                <th className="px-4 py-3">آخر تواجد</th>
                                <th className="px-4 py-3">التصنيف</th>
                                <th className="px-4 py-3">إجمالي الصرف</th>
                                <th className="px-4 py-3 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredList.map((client) => {
                                const isVIP = client.totalSpent > 1000000;
                                const isLost = (new Date().getTime() - new Date(client.lastDate).getTime()) / (1000 * 3600 * 24) > 180; // > 6 months

                                return (
                                    <tr key={client.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500  group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
                                                    <UserIcon size={14} />
                                                </div>
                                                <span className="font-bold text-gray-900">{client.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-600">{client.phone}</td>
                                        <td className="px-4 py-3 text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                {client.lastDate}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isVIP ? (
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-bold text-[10px]">VIP</span>
                                            ) : isLost ? (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full  text-[10px]">Inactive</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px]">Active</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-900 font-mono">
                                            {formatMoney(client.totalSpent)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                             <button className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover: text-blue-600 transition-all">
                                                 <Phone size={14} />
                                             </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {filteredList.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Search size={24} className="mb-2 opacity-50" />
                            <p>لا توجد نتائج</p>
                        </div>
                    )}
                </div>
            </div>
        </ManagerDashboardCard>
    );
};

export default ClientsLogWidget;
