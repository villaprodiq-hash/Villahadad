import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsChartProps {
    data: Array<{ date: string; close: number }>;
    color?: string;
}

const AnalyticsAreaChart: React.FC<AnalyticsChartProps> = ({ data, color = "#10b981" }) => { // Default to Emerald-500
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                    <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis 
                        stroke="#9ca3af" 
                        fontSize={10}
                        tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: '#1f2937'
                        }}
                        itemStyle={{ color: color, fontWeight: 'bold' }}
                        labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '11px' }}
                        formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value), 'Revenue']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="close" 
                        stroke={color} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={3}
                        name="Booking Revenue"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AnalyticsAreaChart;
