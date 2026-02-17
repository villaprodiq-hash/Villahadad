import React from 'react';
import { User as UserIcon, DollarSign, Star } from 'lucide-react';
import { GlowCard } from '../../../shared/GlowCard';

interface ClientsStatsWidgetProps {
  totalClients: number;
}

const ClientsStatsWidget: React.FC<ClientsStatsWidgetProps> = ({ totalClients }) => {
  return (
    <>
      <GlowCard className="p-4 flex items-center gap-4 border-amber-500/10 bg-linear-to-r from-amber-500/5 to-transparent">
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <UserIcon size={24} />
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase font-bold">إجمالي العملاء</p>
          <p className="text-2xl font-black text-white">{totalClients}</p>
        </div>
      </GlowCard>

      <GlowCard className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <DollarSign size={24} />
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase font-bold">متوسط الصرف (LTV)</p>
          <p className="text-2xl font-black text-white">$1,250</p>
        </div>
      </GlowCard>

      <GlowCard className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
          <Star size={24} />
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase font-bold">عملاء VIP</p>
          <p className="text-2xl font-black text-white">24</p>
        </div>
      </GlowCard>
    </>
  );
};

export default ClientsStatsWidget;
