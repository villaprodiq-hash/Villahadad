import React from 'react';
import { Palette, Sparkles, Sun, Moon } from 'lucide-react';

const PresetsView: React.FC = () => {
  const presets = [
    { id: '1', name: 'Sura Style (Natural)', category: 'Wedding', icon: Sparkles, color: 'from-pink-500 to-purple-500' },
    { id: '2', name: 'Wedding Warm', category: 'Wedding', icon: Sun, color: 'from-amber-500 to-orange-500' },
    { id: '3', name: 'Studio Cool', category: 'Portrait', icon: Moon, color: 'from-blue-500 to-cyan-500' },
    { id: '4', name: 'Vintage Film', category: 'Creative', icon: Palette, color: 'from-emerald-500 to-teal-500' },
    { id: '5', name: 'High Contrast B&W', category: 'Creative', icon: Palette, color: 'from-gray-500 to-gray-700' },
    { id: '6', name: 'Soft Portrait', category: 'Portrait', icon: Sparkles, color: 'from-rose-500 to-pink-500' },
  ];

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-6 justify-between">
          <div>
            <h2 className="text-white font-bold">Presets</h2>
            <p className="text-gray-500 text-xs">Editing templates & styles</p>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-all">
            Create New Preset
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {presets.map((preset) => (
              <button
                key={preset.id}
                className="group p-6 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d] hover:border-blue-600/50 transition-all text-right"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${preset.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <preset.icon size={28} className="text-white" />
                </div>
                
                <h3 className="text-white font-bold mb-1">{preset.name}</h3>
                <p className="text-gray-500 text-xs">{preset.category}</p>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-all">
                    Apply
                  </button>
                  <button className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-400 text-xs font-bold rounded transition-all">
                    Edit
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Quick Actions */}
      <div className="w-64 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col">
        <div className="h-10 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-3">
          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Quick Actions</span>
        </div>
        
        <div className="flex-1 p-3 space-y-2">
          <button className="w-full px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white text-xs font-bold rounded transition-all text-right">
            Crop 4:3
          </button>
          <button className="w-full px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white text-xs font-bold rounded transition-all text-right">
            Crop 16:9
          </button>
          <button className="w-full px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white text-xs font-bold rounded transition-all text-right">
            Straighten
          </button>
          <button className="w-full px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white text-xs font-bold rounded transition-all text-right">
            Auto Enhance
          </button>
          <button className="w-full px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white text-xs font-bold rounded transition-all text-right">
            B&W Convert
          </button>
          <button className="w-full px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white text-xs font-bold rounded transition-all text-right">
            Vintage Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresetsView;
