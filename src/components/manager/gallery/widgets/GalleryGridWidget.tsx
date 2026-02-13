import React from 'react';
import { Heart, Check, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  image: string;
  likes: number;
  status: 'approved' | 'rejected' | 'pending';
  assignedTo: {
    name: string;
    avatar: string;
  };
  date: string;
  camera?: string;
  editingRequests?: string[];
}

interface GalleryGridWidgetProps {
  items: PortfolioItem[];
  onItemClick: (item: PortfolioItem) => void;
}

const GalleryGridWidget: React.FC<GalleryGridWidgetProps> = ({ items, onItemClick }) => {
  return (
    <motion.div 
       layout
       className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
       <AnimatePresence>
          {items.map((item) => (
             <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                onClick={() => onItemClick(item)}
                className={`group relative rounded-2xl overflow-hidden bg-white/5 border 
                   ${item.status === 'approved' ? 'border-green-500/30' : 
                     item.status === 'rejected' ? 'border-red-500/30' : 'border-white/5'} 
                   aspect-[4/3] cursor-pointer`}
             >
                <img 
                   src={item.image} 
                   alt={item.title} 
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                />
                
                {/* Status Badge (Top Right) */}
                 <div className="absolute top-3 right-3 z-10">
                    {item.status === 'approved' && (
                       <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg shadow-green-900/20 backdrop-blur-md">
                          <Check size={14} strokeWidth={3} />
                       </div>
                    )}
                    {item.status === 'rejected' && (
                       <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg shadow-red-900/20 backdrop-blur-md">
                          <X size={14} strokeWidth={3} />
                       </div>
                    )}
                    {item.status === 'pending' && (
                       <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg shadow-amber-900/20 backdrop-blur-md">
                          <Clock size={14} strokeWidth={3} />
                       </div>
                    )}
                 </div>

                {/* Team Member Avatar (Top Left) */}
                 <div className="absolute top-3 left-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md pl-1 pr-3 py-1 rounded-full border border-white/10">
                       <img 
                          src={item.assignedTo.avatar} 
                          alt={item.assignedTo.name} 
                          className="w-6 h-6 rounded-full border border-white/20"
                       />
                       <span className="text-[10px] text-white font-bold">{item.assignedTo.name}</span>
                    </div>
                 </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                   <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex justify-between items-end mb-2">
                         <span className="text-amber-400 text-xs font-bold uppercase tracking-wider block">
                            {item.category}
                         </span>
                         <span className="text-gray-400 text-[10px] font-mono">
                            {item.date}
                         </span>
                      </div>
                      <h3 className="text-white font-bold text-xl mb-3 leading-tight">{item.title}</h3>
                      
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-gray-300">
                               <Heart size={16} className={item.likes > 100 ? "fill-rose-500 text-rose-500" : ""} />
                               <span className="text-xs font-bold">{item.likes}</span>
                            </div>
                         </div>
                         <div className="px-3 py-1.5 rounded-lg bg-white/10 text-[10px] text-white font-bold backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                            مراجعة
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
          ))}
       </AnimatePresence>
    </motion.div>
  );
};

export default GalleryGridWidget;
