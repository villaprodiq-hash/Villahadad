import React from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const PrinterStatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, color: _color, bg }) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-2 rounded-xl bg-linear-to-br from-white/5 to-white/10 border border-white/10 backdrop-blur-xl hover:border-emerald-400/30 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-linear-to-br ${bg} shadow-lg`}>
          <Icon size={12} className="text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-[7px] font-bold uppercase">{label}</p>
          <p className="text-white text-lg font-black">{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default PrinterStatsCard;
