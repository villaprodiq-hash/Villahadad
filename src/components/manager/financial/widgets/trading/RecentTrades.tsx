import React from 'react';
import { Booking } from '../../../../../types';

interface RecentTradesProps {
    bookings: Booking[];
}

const RecentTrades: React.FC<RecentTradesProps> = ({ bookings }) => {
  return (
    <div className="h-full bg-[#161a1e] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
       <div className="p-3 border-b border-gray-800 bg-[#1e2026]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Trades</h3>
       </div>
       
       <div className="flex items-center px-3 py-2 text-[10px] text-gray-500 font-bold border-b border-gray-800">
            <span className="w-16 text-left">Price(IQD)</span>
            <span className="w-16 text-right">Amount(USD)</span>
            <span className="flex-1 text-right">Time</span>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:hidden overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
           {bookings.slice(0, 50).map((b, idx) => (
               <div key={b.id || idx} className="flex items-center px-3 py-1 hover:bg-[#2b3139] transition-colors cursor-default animate-in fade-in slide-in-from-right-4 duration-300">
                    <span className="w-16 text-left text-[11px] font-mono text-[#0ecb81] font-bold">
                        {(b.totalAmount || 0).toLocaleString()}
                    </span>
                    <span className="w-16 text-right text-[11px] font-mono text-gray-300">
                        ${b.paidAmount?.toLocaleString() || 0}
                    </span>
                    <span className="flex-1 text-right text-[10px] font-mono text-gray-500">
                         {b.shootDate ? new Date(b.shootDate).toLocaleDateString() : 'N/A'}
                    </span>
               </div>
           ))}
       </div>
    </div>
  );
};

export default RecentTrades;
