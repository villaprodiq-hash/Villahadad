import React, { useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ErrorBar } from 'recharts';

interface OHLCChartProps {
    data: any[];
}

// Custom Shape for Candlestick
const CandlestickShape = (props: any) => {
    const { x, y, width, height, low, high, open, close } = props;
    const isGreen = close > open;
    const color = isGreen ? '#089981' : '#F23645';
    
    // Calculate candle body
    // In Recharts, y is top, height is height downwards.
    // We need to map values to pixels manually or rely on the payload if passed correctly.
    // However, a simpler trick with Recharts Bar chart:
    // The "Bar" is the body (Open-Close). We use ErrorBar for the Wicks (High-Low).
    
    // But since customized shapes are hard with standard data props, let's use the standard "Bar" for the body
    // and just style it.
    
    return <rect x={x} y={y} width={width} height={height} fill={color} />;
};

const OHLCChart: React.FC<OHLCChartProps> = ({ data }) => {
    // Transform data for the "Bar" to represent the Body (Open to Close)
    // We need [min, max] for the bar value.
    const processedData = useMemo(() => {
        return data.map(d => ({
            ...d,
            // The Bar chart will convert [min, max] array to a bar
            body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
            color: d.close > d.open ? '#089981' : '#F23645',
            // Middle point for the error bar to sprout from? 
            // Actually, ErrorBar expects a single value + error array. 
            // A common trick is: 
            // barValue: (open + close) / 2
            // error: [high - barValue, barValue - low]
            // But visually simple: Just draw a thin line for High-Low separately?
        }));
    }, [data]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-[#1e222d] border border-gray-700 p-2 rounded shadow-xl text-xs font-mono">
                   <div className="mb-1 text-gray-400">{label}</div>
                   <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                       <span className="text-gray-500">O</span> <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>{d.open.toLocaleString()}</span>
                       <span className="text-gray-500">H</span> <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>{d.high.toLocaleString()}</span>
                       <span className="text-gray-500">L</span> <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>{d.low.toLocaleString()}</span>
                       <span className="text-gray-500">C</span> <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>{d.close.toLocaleString()}</span>
                   </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full bg-[#131722] relative">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={processedData} margin={{ top: 20, right: 50, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#2b2b43" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#787b86', fontSize: 10 }} 
                        minTickGap={30}
                    />
                    <YAxis 
                        orientation="right"
                        domain={['auto', 'auto']}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#787b86', fontSize: 10 }}
                        tickFormatter={val => `${val/1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#787b86', strokeWidth: 1, strokeDasharray: '4 4' }}/>
                    
                    {/* The Wicks (High/Low) - Simulated using a very thin Bar behind */}
                    <Bar 
                        dataKey="high" // This is actually wrong for a bar. 
                        // Let's use Composed Chart's powerful shape props instead.
                        fillOpacity={0}
                    />

                    {/* Trick: We render two bars. 
                        1. The wick (High to Low). Thin width.
                        2. The body (Open to Close). Thicker width.
                    */}
                     
                    {/* 1. Wick Layer */}
                     <Bar 
                        dataKey="wickRange" // [low, high]
                        barSize={1}
                        shape={(props: any) => {
                             const { x, y, width, height, payload } = props;
                             // We need pixel coordinates for Low and High. 
                             // Recharts passes 'y' as the top-most point of the bar, and height as length.
                             // By passing [low, high] as data, y corresponds to 'high', and y+height to 'low'.
                             return <rect x={x + width/2 - 0.5} y={y} width={1} height={height} fill={payload.color} />
                        }}
                    />

                    {/* 2. Body Layer */}
                    <Bar 
                        dataKey="body" // [min(o,c), max(o,c)]
                        barSize={8}
                        shape={(props: any) => {
                            const { x, y, width, height, payload } = props;
                            return <rect x={x} y={y} width={width} height={height} fill={payload.color} />
                        }}
                    />

                </ComposedChart>
            </ResponsiveContainer>
            
            {/* Watermark */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-5">
                <span className="text-6xl font-black text-white font-mono">VILLA HADDAD</span>
            </div>
        </div>
    );
};

export default OHLCChart;
