import React from 'react';
import { Search, Filter } from 'lucide-react';

interface ClientsFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const ClientsFilterBar: React.FC<ClientsFilterBarProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-[#121212]/50 p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
      <div className="relative flex-1 w-full">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input 
          type="text" 
          placeholder="بحث عن عميل بالاسم أو الرقم..." 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder-gray-600"
        />
      </div>
      <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
        {['الكل', 'عرسان VIP', 'شركات', 'جدد'].map((f) => (
          <button key={f} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-sm whitespace-nowrap transition-colors border border-transparent hover:border-white/10">
            {f}
          </button>
        ))}
        <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10">
          <Filter size={18} />
        </button>
      </div>
    </div>
  );
};

export default ClientsFilterBar;
