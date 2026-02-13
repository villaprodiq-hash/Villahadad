import React from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';

interface Asset {
    id: string;
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume: number;
}

interface AssetListProps {
    assets: Asset[];
    selectedAssetId: string;
    onSelectAsset: (id: string) => void;
}

const AssetList: React.FC<AssetListProps> = ({ assets, selectedAssetId, onSelectAsset }) => {
  return (
    <div className="h-full bg-[#161a1e] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#1e2026]">
            <div className="flex gap-4 text-xs font-bold text-gray-400">
                <span className="text-white border-b-2 border-[#f0b90b] pb-3 -mb-3.5">Markets</span>
                <span className="hover:text-gray-200 cursor-pointer">Favorites</span>
            </div>
        </div>
        
        {/* Table Header */}
        <div className="flex items-center px-4 py-2 text-[10px] text-gray-500 font-bold border-b border-gray-800">
            <span className="w-24 text-left">Pair</span>
            <span className="flex-1 text-right">Last Price</span>
            <span className="w-16 text-right">24h Chg%</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {assets.map((asset) => (
                <div 
                    key={asset.id}
                    onClick={() => onSelectAsset(asset.id)}
                    className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors border-l-2 ${selectedAssetId === asset.id ? 'bg-[#2b3139] border-[#f0b90b]' : 'hover:bg-[#2b3139] border-transparent'}`}
                >
                    <div className="w-24 flex items-center gap-2">
                        <Star size={10} className="text-gray-600 hover:text-[#f0b90b]" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white font-mono">{asset.symbol}</span>
                            <span className="text-[9px] text-gray-500">{asset.name}</span>
                        </div>
                    </div>
                    <div className="flex-1 text-right">
                         <span className={`text-xs font-medium font-mono ${asset.price > 0 ? 'text-gray-200' : 'text-gray-500'}`}>
                             {asset.price.toLocaleString()}
                         </span>
                    </div>
                    <div className="w-16 text-right">
                        <span className={`text-xs font-medium font-mono ${asset.change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                            {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default AssetList;
