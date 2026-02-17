import React, { useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';

type RangeType = 'daily' | 'weekly' | 'monthly';

const chartData = {
  daily: [
    { label: '12:00', value: 120 },
    { label: '13:00', value: 135 },
    { label: '14:00', value: 110 },
    { label: '15:00', value: 155 },
    { label: '16:00', value: 140 },
    { label: '17:00', value: 175 },
    { label: '18:00', value: 195 },
  ],
  weekly: [
    { label: 'السبت', value: 240 },
    { label: 'الأحد', value: 180 },
    { label: 'الاثنين', value: 320 },
    { label: 'الثلاثاء', value: 250 },
    { label: 'الأربعاء', value: 290 },
    { label: 'الخميس', value: 380 },
    { label: 'الجمعة', value: 310 },
  ],
  monthly: [
    { label: 'أسبوع 1', value: 950 },
    { label: 'أسبوع 2', value: 1200 },
    { label: 'أسبوع 3', value: 1100 },
    { label: 'أسبوع 4', value: 1450 },
  ]
};

const labels: Record<RangeType, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري'
};

const LineChartDark = () => {
  const [range, setRange] = useState<RangeType>('weekly');

  // Calculate stats based on current range
  const currentData = chartData[range];
  const maxValue = Math.max(...currentData.map(d => d.value));

  return (
    <div className="bg-[#1E1E1E] rounded-4xl p-5 h-full border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
      
      {/* Header with Tabs */}
      <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <TrendingUp className="text-[#F4BE37]" size={18} />
                  تحليل الأداء
              </h3>
              <p className="text-[10px] text-gray-500 font-bold mt-1">
                 {range === 'daily' ? 'نشاط الساعات (Real-time)' : range === 'weekly' ? 'ملخص الأسبوع الحالي' : 'الأداء الشهري العام'}
              </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
              {/* Range Selector */}
              <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/5">
                 {(Object.keys(labels) as RangeType[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setRange(key)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        range === key 
                        ? 'bg-[#F4BE37] text-black shadow-lg' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {labels[key]}
                    </button>
                 ))}
              </div>
          </div>
      </div>

      <div className="flex-1 w-full min-h-0 relative z-10" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={currentData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C5E38" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#161819" stopOpacity={0} />
                    </linearGradient>
                </defs>

                <ReferenceLine y={maxValue / 2} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />

                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    height={25}
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={10}
                    tickMargin={8}
                    interval="preserveStartEnd"
                />

                <YAxis
                    orientation="left"
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                />

                <Tooltip
                    contentStyle={{ backgroundColor: '#161819', border: '1px solid #F4BE37', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', padding: '8px' }}
                    labelStyle={{ color: '#F4BE37', marginBottom: '0.25rem', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff', fontSize: '11px', padding: 0 }}
                    cursor={{ stroke: '#F4BE37', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                <Area
                    type="monotone"
                    dataKey="value"
                    stroke="transparent"
                    fill="url(#colorValue)"
                    animationDuration={500}
                />

                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#F4BE37"
                    strokeWidth={2}
                    dot={{ r: 3, stroke: '#F4BE37', strokeWidth: 2, fill: '#161819' }}
                    activeDot={{ r: 5, fill: '#F4BE37', stroke: '#161819', strokeWidth: 2 }}
                    animationDuration={500}
                />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChartDark;
