import React from 'react';
import { motion } from 'framer-motion';
import { Droplet } from 'lucide-react';

interface Material {
  name: string;
  level: number;
  max: number;
  unit: string;
  color: string;
}

interface MaterialInventoryProps {
  materials: Material[];
}

const PrinterMaterialInventory: React.FC<MaterialInventoryProps> = ({ materials }) => {
  return (
    <div className="p-2 rounded-xl bg-linear-to-br from-white/5 to-white/10 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Droplet size={14} className="text-emerald-400" />
        <h3 className="text-white font-bold text-[10px]">مخزون المواد</h3>
      </div>

      <div className="space-y-2">
        {materials.map((mat, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-[8px]">
              <span className="text-gray-300 font-medium">{mat.name}</span>
              <span className={`font-bold ${mat.level / mat.max < 0.3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {mat.level}/{mat.max} {mat.unit}
              </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(mat.level / mat.max) * 100}%` }}
                className={`h-full bg-linear-to-r ${mat.color}`}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-bold rounded-lg transition-all">
        طلب مواد جديدة
      </button>
    </div>
  );
};

export default PrinterMaterialInventory;
