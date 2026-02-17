import React, { useState } from 'react';
import { Booking } from '../../../../types';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { Calendar, CheckSquare, Square, FileText } from 'lucide-react';

interface FinancialExportWidgetProps {
    bookings: Booking[];
}

const FinancialExportWidget: React.FC<FinancialExportWidgetProps> = ({ bookings: _bookings }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Columns Configuration
    const [columns, setColumns] = useState({
        date: true,
        client: true,
        phone: true,
        amount: true,
        paid: true,
        status: true
    });

    const toggleColumn = (key: keyof typeof columns) => {
        setColumns(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <ManagerDashboardCard title="تصدير مخصص (Custom Export)" className="h-full bg-white" noPadding>
            <div className="p-5 flex flex-col h-full gap-5">
                
                {/* 1. Date Range */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        <Calendar size={14} /> النطاق الزمني
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="flex-1 bg-gray-50  rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="self-center text-gray-400">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="flex-1 bg-gray-50  rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* 2. Columns Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        <FileText size={14} /> البيانات المطلوبة
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

export default FinancialExportWidget;
