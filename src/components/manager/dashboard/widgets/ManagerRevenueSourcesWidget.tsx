import React from 'react';
import { DollarSign } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import ManagerDashboardCard from './ManagerDashboardCard';

interface ManagerRevenueSourcesWidgetProps {
  bookings: any[];
}

const ManagerRevenueSourcesWidget: React.FC<ManagerRevenueSourcesWidgetProps> = ({ bookings = [] }) => {

  // Calculate revenue per category - USD and IQD separated
  const revenueMapUSD: Record<string, number> = {};
  const revenueMapIQD: Record<string, number> = {};
  let maxRevenue = 0;

  try {
    const activeBookings = bookings.filter(b => !b.deletedAt);

    activeBookings.forEach(b => {
        const amount = b.paidAmount || 0;
        const cat = b.category || 'other';
        if (b.currency === 'USD') {
            revenueMapUSD[cat] = (revenueMapUSD[cat] || 0) + amount;
        } else {
            revenueMapIQD[cat] = (revenueMapIQD[cat] || 0) + amount;
        }
    });
  } catch (error) {
    console.error('[Revenue Widget] Error calculating revenue:', error);
  }

  // Use IQD map if it has more data, otherwise USD
  const hasMoreIQD = Object.keys(revenueMapIQD).length >= Object.keys(revenueMapUSD).length;
  const revenueMap = hasMoreIQD ? revenueMapIQD : revenueMapUSD;
  const currencyLabel = hasMoreIQD ? 'د.ع' : '$';

  // Mapping internal category keys to Display Labels
  const categoryLabels: Record<string, string> = {
      'wedding': 'زفاف',
      'Wedding': 'زفاف',
      'studio': 'جلسات',
      'Studio': 'جلسات',
      'commercial': 'تجاري',
      'Commercial': 'تجاري',
      'video': 'فيديو',
      'Video': 'فيديو',
      'location': 'تأجير موقع',
      'Location': 'تأجير موقع',
      'other': 'أخرى',
  };

  const data = Object.keys(revenueMap).map(key => ({
      subject: categoryLabels[key] || key,
      value: revenueMap[key],
      fullMark: 0
  }));

  maxRevenue = Math.max(...data.map(d => d.value), 1000);
  data.forEach(d => d.fullMark = maxRevenue);

  // Fallback if empty
  if (data.length === 0) {
      data.push({ subject: 'No Data', value: 0, fullMark: 100 });
  }

  return (
    <ManagerDashboardCard className="bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md text-gray-900 dark:text-white flex flex-col h-[220px] relative overflow-hidden" dir="rtl">
       <div className="flex items-center justify-between mb-2 relative z-10 px-2 pt-2">
         <div>
           <h3 className="text-sm font-bold font-tajawal text-amber-500">مصادر الدخل</h3>
           <p className="text-[10px] text-gray-400 font-tajawal">تحليل الأداء المالي</p>
         </div>
         <div className="bg-amber-500/10 p-1.5 rounded-lg">
           <DollarSign size={16} className="text-amber-500" />
         </div>
       </div>
       
       <div className="flex-1 w-full relative z-10 -ml-2 -mt-2">
         <ResponsiveContainer width="100%" height="100%">
           <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
             <PolarGrid stroke="#374151" />
             <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'Tajawal', fontWeight: 'bold' }} />
             <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
             <Radar
               name="Revenue"
               dataKey="value"
               stroke="#f59e0b"
               strokeWidth={3}
               fill="#f59e0b"
               fillOpacity={0.5}
             />
             <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                itemStyle={{ color: '#fbbf24' }}
             />
           </RadarChart>
         </ResponsiveContainer>
       </div>
       
       {/* Background Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
    </ManagerDashboardCard>
  );
};

export default ManagerRevenueSourcesWidget;
