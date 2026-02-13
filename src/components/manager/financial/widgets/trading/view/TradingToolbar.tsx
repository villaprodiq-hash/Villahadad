import React from 'react';
import { MousePointer2, PenTool, Type, Move, Ruler, Eraser, TrendingUp, Circle, Square, Minus } from 'lucide-react';

const Tools = [
    { icon: MousePointer2, label: 'Cursor' },
    { icon: TrendingUp, label: 'Trend Line' },
    { icon: PenTool, label: 'Brush' },
    { icon: Type, label: 'Text' },
    { icon: Square, label: 'Shapes' },
    { icon:   Ruler, label: 'Measure' },
    { icon:   Eraser, label: 'Remove' }
];

const TradingToolbar: React.FC = () => {
  return (
    <div className="w-[50px] bg-[#161a1e] border-r border-gray-800 flex flex-col items-center py-4 gap-4 h-full"> 
        {Tools.map((t, idx) => (
             <div key={idx} className="group relative">
                <button className={`p-2 rounded hover:bg-[#2b3139] text-gray-400 hover:text-white transition-colors ${idx === 0 ? 'text-[#2962FF]' : ''}`}>
                    <t.icon size={18} />
                </button>
                <div className="absolute left-12 top-2 bg-black text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                    {t.label}
                </div>
             </div>
        ))}
    </div>
  );
};

export default TradingToolbar;
