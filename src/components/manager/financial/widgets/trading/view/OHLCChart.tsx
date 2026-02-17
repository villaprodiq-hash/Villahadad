import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface OHLCDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ProcessedOHLCDataPoint extends OHLCDataPoint {
  body: [number, number];
  wickRange: [number, number];
  color: string;
}

interface TooltipEntry {
  payload: ProcessedOHLCDataPoint;
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ProcessedOHLCDataPoint;
}

interface OHLCChartProps {
  data: OHLCDataPoint[];
}

const OHLCChart: React.FC<OHLCChartProps> = ({ data }) => {
  const processedData = useMemo<ProcessedOHLCDataPoint[]>(() => {
    return data.map((d) => ({
      ...d,
      body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
      wickRange: [d.low, d.high],
      color: d.close > d.open ? '#089981' : '#F23645',
    }));
  }, [data]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const firstPayload = payload[0];
      if (!firstPayload?.payload) return null;
      const d = firstPayload.payload;
      return (
        <div className="bg-[#1e222d] border border-gray-700 p-2 rounded shadow-xl text-xs font-mono">
          <div className="mb-1 text-gray-400">{label}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-500">O</span>
            <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>
              {d.open.toLocaleString()}
            </span>
            <span className="text-gray-500">H</span>
            <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>
              {d.high.toLocaleString()}
            </span>
            <span className="text-gray-500">L</span>
            <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>
              {d.low.toLocaleString()}
            </span>
            <span className="text-gray-500">C</span>
            <span className={d.color === '#089981' ? 'text-[#089981]' : 'text-[#F23645]'}>
              {d.close.toLocaleString()}
            </span>
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
            tickFormatter={(val: number) => `${val / 1000}k`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#787b86', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          <Bar dataKey="high" fillOpacity={0} />

          <Bar
            dataKey="wickRange"
            barSize={1}
            shape={(props: BarShapeProps) => {
              const { x, y, width, height, payload } = props;
              return (
                <rect
                  x={(x ?? 0) + (width ?? 0) / 2 - 0.5}
                  y={y ?? 0}
                  width={1}
                  height={height ?? 0}
                  fill={payload?.color ?? '#089981'}
                />
              );
            }}
          />

          <Bar
            dataKey="body"
            barSize={8}
            shape={(props: BarShapeProps) => {
              const { x, y, width, height, payload } = props;
              return (
                <rect
                  x={x ?? 0}
                  y={y ?? 0}
                  width={width ?? 0}
                  height={height ?? 0}
                  fill={payload?.color ?? '#089981'}
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-5">
        <span className="text-6xl font-black text-white font-mono">VILLA HADDAD</span>
      </div>
    </div>
  );
};

export default OHLCChart;
