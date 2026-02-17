import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface SparklineProps {
    data: Array<Record<string, number | string>>;
    dataKey: string;
    color: string;
    height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, dataKey, color, height = 40 }) => {
    return (
        <div style={{ width: '100%', height: height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                     <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area 
                        type="monotone" 
                        dataKey={dataKey} 
                        stroke={color} 
                        fill={`url(#gradient-${color})`} 
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default Sparkline;
