import React from 'react';
import { Camera, CheckCircle2, AlertTriangle, Laptop } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';

const AssetCustodyWidget: React.FC = () => {
  const assets = [
    { id: 1, user: 'أحمد', item: 'Sony A7S III', lens: '24-70mm GM', status: 'In Use', time: '10:00 AM', icon: <Camera size={14} /> },
    { id: 2, user: 'سارة', item: 'MacBook Pro M3', lens: '-', status: 'In Use', time: '09:30 AM', icon: <Laptop size={14} /> },
    { id: 3, user: 'علي', item: 'DJI Ronin RS3', lens: '-', status: 'In Use', time: '11:15 AM', icon: <Camera size={14} /> },
    { id: 4, user: 'نور', item: 'Canon R5', lens: '85mm f/1.2', status: 'Warning', time: 'Overdue', icon: <Camera size={14} /> },
  ];

  return (
    <ManagerDashboardCard title="سجل العُهَد" className="h-full bg-white" noPadding>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
           {assets.map((asset, idx) => (
              <div key={asset.id} className={`group p-3 flex justify-between items-center cursor-pointer transition-colors hover:bg-gray-50 ${idx !== assets.length -1 ? 'border-b border-gray-50' : ''}`}>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500  group-hover:text-blue-500 transition-colors">
                        {asset.icon}
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-900">{asset.user}</div>
                        <div className="text-[10px] text-gray-400">{asset.item}</div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-1">
                    {asset.status === 'Warning' ? (
                       <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          <AlertTriangle size={10} /> متأخر
                       </span>
                    ) : (
                       <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <CheckCircle2 size={10} /> نشط
                       </span>
                    )}
                    <span className="text-[9px] text-gray-400 font-mono">{asset.time}</span>
                 </div>
              </div>
           ))}
            <div className="p-2 text-center">
                 <button className="text-[10px] text-blue-500 font-bold hover:underline">+ تسجيل استلام</button>
            </div>
      </div>
    </ManagerDashboardCard>
  );
};

export default AssetCustodyWidget;
