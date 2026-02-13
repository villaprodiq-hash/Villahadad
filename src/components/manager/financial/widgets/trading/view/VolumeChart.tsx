import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VolumeChartProps {
    data: any[];
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  return (
    <div className="w-full h-full bg-[#131722] border-t border-gray-800/50">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 50, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#2b2b43" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="date" 
                    height={0} 
                    axisLine={false} 
                    tick={false}
                />
                <YAxis 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#787b86', fontSize: 9 }} 
                    width={40}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e222d', borderColor: '#2b2b43', color: '#d1d4dc' }}
                    itemStyle={{ color: '#d1d4dc' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar 
                    dataKey="volume" 
                    fill="#2962FF" 
                    opacity={0.5} 
                    barSize={4}
                />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default VolumeChart;
