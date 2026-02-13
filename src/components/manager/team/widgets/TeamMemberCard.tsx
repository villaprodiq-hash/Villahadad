import React from 'react';
import { MoreHorizontal, Star, CheckCircle2, MessageCircle, Phone, Edit3, Video, Printer, Camera, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { User, UserRole } from '../../../../types';
import { GlowCard } from '../../../shared/GlowCard';

interface TeamMemberCardProps {
  user: User;
  index: number;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ user, index }) => {
  const getRoleStyle = (role: UserRole) => {
    switch (role) {
      case UserRole.PHOTO_EDITOR: return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Edit3 };
      case UserRole.VIDEO_EDITOR: return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Video };
      case UserRole.PRINTER: return { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: Printer };
      case UserRole.RECEPTION: return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Users };
      default: return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Camera };
    }
  };

  const style = getRoleStyle(user.role);
  const Icon = style.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <GlowCard className="h-full p-5 flex flex-col group relative overflow-hidden hover:border-white/20 transition-all">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-linear-to-br from-gray-800 to-black border border-white/10 shadow-lg group-hover:scale-105 transition-transform`}>
                  {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl object-cover" /> : user.name.charAt(0)}
               </div>
               <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#121212] ${Math.random() > 0.3 ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors">{user.name}</h3>
              <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md w-fit mt-1 ${style.bg} ${style.color} border ${style.border}`}>
                <Icon size={10} />
                <span>{user.role}</span>
              </div>
            </div>
          </div>
          <button className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"><MoreHorizontal size={18} /></button>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
           <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5 group-hover:bg-white/10 transition-colors">
              <div className="text-amber-400 font-black text-lg font-mono">4.9</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1 font-bold">
                 <Star size={10} fill="currentColor" /> التقييم
              </div>
           </div>
           <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5 group-hover:bg-white/10 transition-colors">
              <div className="text-white font-black text-lg font-mono">12</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1 font-bold">
                 <CheckCircle2 size={10} /> مهام منجزة
              </div>
           </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-4 border-t border-white/5 relative z-10">
           <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-white/10">
              <MessageCircle size={14} /> محادثة
           </button>
           <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-white/10">
              <Phone size={14} /> اتصال
           </button>
        </div>

        {/* Decorative Glow */}
        <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${String(style.bg).replace('/10', '')}`} />
      </GlowCard>
    </motion.div>
  );
};

export default React.memo(TeamMemberCard);
