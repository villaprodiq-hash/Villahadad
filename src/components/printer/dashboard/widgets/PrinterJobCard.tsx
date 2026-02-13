import React from 'react';
import { motion } from 'framer-motion';

interface PrintJob {
  id: string;
  clientName: string;
  productType: string;
  quantity: number;
  status: 'queue' | 'printing' | 'quality-check' | 'packaging' | 'ready';
  priority: 'high' | 'normal' | 'low';
  deadline: string;
  progress: number;
  thumbnail: string;
  paperType?: string;
  inkLevel?: number;
}

interface JobCardProps {
  job: PrintJob;
  index: number;
  onSelect: (job: PrintJob) => void;
}

const PrinterJobCard: React.FC<JobCardProps> = ({ job, index, onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onSelect(job)}
      className="group p-2 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 hover:border-emerald-400/50 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2">
        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30 flex items-center justify-center text-xl shadow-lg">
          {job.thumbnail}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-[10px] truncate">{job.productType}</h3>
            {job.priority === 'high' && (
              <span className="px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[7px] font-bold rounded-full">
                عاجل
              </span>
            )}
          </div>
          <p className="text-gray-400 text-[8px]">{job.clientName} • {job.quantity} قطعة</p>
          
          {/* Progress */}
          {job.status === 'printing' && (
            <div className="mt-1">
              <div className="flex justify-between text-[7px] text-gray-400 mb-0.5">
                <span>جاري الطباعة...</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="text-right">
          <span className={`text-[7px] font-bold px-2 py-1 rounded-full ${
            job.status === 'ready' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
            job.status === 'printing' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' :
            job.status === 'quality-check' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
            job.status === 'packaging' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {job.status === 'ready' ? 'جاهز' :
             job.status === 'printing' ? 'طباعة' :
             job.status === 'quality-check' ? 'فحص' :
             job.status === 'packaging' ? 'تغليف' :
             'انتظار'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PrinterJobCard;
