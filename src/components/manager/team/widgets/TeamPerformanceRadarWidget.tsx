import React from 'react';
import { Zap } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { GlowCard } from '../../../shared/GlowCard';

// بيانات وهمية لرادار الأداء
const performanceData = [
  { subject: 'السرعة', A: 120, B: 110, fullMark: 150 },
  { subject: 'الجودة', A: 98, B: 130, fullMark: 150 },
  { subject: 'الالتزام', A: 86, B: 130, fullMark: 150 },
  { subject: 'الإبداع', A: 99, B: 100, fullMark: 150 },
  { subject: 'التعاون', A: 85, B: 90, fullMark: 150 },
  { subject: 'التقنية', A: 65, B: 85, fullMark: 150 },
];

const TeamPerformanceRadarWidget: React.FC = () => {
  return (
    <GlowCard className="lg:col-span-1 p-0 flex flex-col relative overflow-hidden h-[320px] bg-[#0c0c0e]">
      <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center z-10">
        <h3 className="font-bold text-white text-sm">بصمة الأداء العام</h3>
        <Zap size={16} className="text-amber-400" />
      </div>
      <div className="flex-1 w-full relative z-10 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={performanceData}>
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
            <Radar name="فريق التصوير" dataKey="A" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.2} />
            <Radar name="فريق المونتاج" dataKey="B" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
    </GlowCard>
  );
};

export default TeamPerformanceRadarWidget;
