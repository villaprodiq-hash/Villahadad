import React, { useState, useMemo } from 'react';
import { Booking } from '../../../../types';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { CheckSquare, Square, FileText, UserCheck } from 'lucide-react';

interface ClientExportWidgetProps {
    bookings: Booking[];
}

const ClientExportWidget: React.FC<ClientExportWidgetProps> = ({ bookings }) => {
    // Columns Configuration
    const [columns, setColumns] = useState({
        name: true,
        phone: true,
        category: true,
        visits: true,
        totalSpent: true,
        lastDate: true
    });

    const toggleColumn = (key: keyof typeof columns) => {
        setColumns(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Prepare Client Data
    const clientsData = useMemo(() => {
        const clientMap = new Map();
        bookings.forEach(b => {
             const id = b.clientId || b.clientPhone;
             if (!clientMap.has(id)) {
                 clientMap.set(id, {
                     name: b.clientName,
                     phone: Array.isArray(b.clientPhone) ? b.clientPhone.join(' | ') : b.clientPhone,
                     category: b.category,
                     visits: 0,
                     totalSpent: 0,
                     lastDate: b.shootDate
                 });
             }
             const client = clientMap.get(id);
             client.totalSpent += b.totalAmount;
             client.visits += 1;
             if (b.shootDate > client.lastDate) client.lastDate = b.shootDate;
        });
        return Array.from(clientMap.values());
    }, [bookings]);

    return (
        <ManagerDashboardCard title="تصدير قاعدة البيانات (Database Export)" className="h-full bg-white" noPadding>
            <div className="p-5 flex flex-col h-full gap-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl mb-2">
                    <UserCheck size={18} />
                    <span className="text-xs font-bold">جاهز لتصدير {clientsData.length} عميل</span>
                </div>

                {/* Columns Selection */}
                <div className="space-y-2 flex-1">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        <FileText size={14} /> اختر الأعمدة
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(columns).map(([key, checked]) => (
                            <button 
                                key={key}
                                onClick={() => toggleColumn(key as keyof typeof columns)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${checked ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white  text-gray-400 hover:bg-gray-50'}`}
                            >
                                {checked ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span className="capitalize">{key}</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </ManagerDashboardCard>
    );
};

export default ClientExportWidget;
