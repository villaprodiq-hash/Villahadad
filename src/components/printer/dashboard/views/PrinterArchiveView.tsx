import React, { useState } from 'react';
import { 
  Archive, FileCheck, DollarSign, Calendar, Search, Filter, 
  ChevronDown, ExternalLink, Building2, User 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ArchivedJob {
  id: string;
  albumName: string;
  clientName: string;
  type: 'internal' | 'external'; // 'internal' for Studio/Sura, 'external' for walk-ins/other photogs
  completionDate: string;
  cost: number;
  pages: number;
  coverType: string;
  thumbnail: string;
}

const PrinterArchiveView: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'internal' | 'external'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ PRODUCTION: Empty archive - will be populated from completed print jobs
  const archivedJobs: ArchivedJob[] = [];

  const filteredJobs = archivedJobs.filter(job => {
    const matchesType = filterType === 'all' || job.type === filterType;
    const matchesSearch = job.albumName.includes(searchQuery) || job.clientName.includes(searchQuery);
    return matchesType && matchesSearch;
  });

  // Calculate Stats
  const internalCount = archivedJobs.filter(j => j.type === 'internal').length;
  const externalCount = archivedJobs.filter(j => j.type === 'external').length;
  const totalExternalRevenue = archivedJobs.filter(j => j.type === 'external').reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden p-2">
      
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="bg-[#151a18] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs">ألبومات سرى</p>
            <h3 className="text-2xl font-bold text-white">{internalCount} <span className="text-xs text-gray-500 font-normal">ألبوم</span></h3>
          </div>
        </div>

        <div className="bg-[#151a18] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <User size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs">أعمال خارجية</p>
            <h3 className="text-2xl font-bold text-white">{externalCount} <span className="text-xs text-gray-500 font-normal">ألبوم</span></h3>
          </div>
        </div>

        <div className="bg-[#151a18] border border-white/5 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs">إيرادات الخارجي</p>
            <h3 className="text-2xl font-bold text-white font-mono">{totalExternalRevenue.toLocaleString()} <span className="text-xs text-gray-500 font-sans font-normal">د.ع</span></h3>
          </div>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex bg-[#151a18] p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            الكل
          </button>
          <button 
            onClick={() => setFilterType('internal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'internal' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
          >
            ألبومات سرى
          </button>
          <button 
            onClick={() => setFilterType('external')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'external' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'}`}
          >
            عملاء خارجيين
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأرشيف باسم الألبوم أو العميل..." 
            className="w-full pl-4 pr-10 py-2.5 bg-[#151a18] border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#151a18] border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors text-xs font-bold">
           <Filter size={16} />
           <span>تصفية متقدمة</span>
        </button>
      </div>

      {/* Archive List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#151a18] border border-white/5 rounded-[1.5rem]">
        <table className="w-full text-right">
          <thead className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-wider font-medium sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4">اسم الألبوم</th>
              <th className="px-6 py-4">الجهة / العميل</th>
              <th className="px-6 py-4">تاريخ الإنجاز</th>
              <th className="px-6 py-4">التفاصيل</th>
              <th className="px-6 py-4">الكلفة / الإيراد</th>
              <th className="px-6 py-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {filteredJobs.map((job) => (
                <motion.tr 
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-white/5 transition-colors cursor-default"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-[#0a0f0d] border border-white/5`}>
                        {job.thumbnail}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{job.albumName}</div>
                        <div className="text-[10px] text-gray-500">#{job.id.padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {job.type === 'internal' ? (
                          <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">
                             ألبومات سرى
                          </span>
                       ) : (
                          <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                             خارجي
                          </span>
                       )}
                       <span className="text-xs text-gray-300">{job.clientName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar size={14} />
                      {job.completionDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-300">
                      <span className="font-bold">{job.pages}</span> صفحة • {job.coverType}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {job.type === 'internal' ? (
                      <span className="text-gray-500 text-xs">-</span>
                    ) : (
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        {job.cost.toLocaleString()} د.ع
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        
        {filteredJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Archive size={48} className="mb-4 opacity-20" />
            <p className="text-sm">لا توجد سجلات مطابقة للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrinterArchiveView;
