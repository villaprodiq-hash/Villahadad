import React from 'react';
import { Phone, Star, Mail, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatMoney } from '../../../../utils/formatMoney';

interface ClientData {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  totalSpent: number;
  bookingsCount: number;
  lastBooking: string;
  type: string;
  status: string;
}

interface ClientsTableWidgetProps {
  clients: ClientData[];
}

const ClientsTableWidget: React.FC<ClientsTableWidgetProps> = ({ clients }) => {
  return (
    <div className="flex-1 overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a]/40 relative group">
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
        <table className="w-full text-right border-collapse">
          <thead className="sticky top-0 z-10 bg-[#09090b] text-xs font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="p-4 border-b border-white/5">العميل</th>
              <th className="p-4 border-b border-white/5">التصنيف</th>
              <th className="p-4 border-b border-white/5">المصروفات</th>
              <th className="p-4 border-b border-white/5">عدد الحجوزات</th>
              <th className="p-4 border-b border-white/5 text-left">آخر ظهور</th>
              <th className="p-4 border-b border-white/5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clients.map((client, idx) => (
              <motion.tr 
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <td className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white
                      ${client.type === 'VIP' ? 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#1a1c22] border border-white/10'}
                    `}>
                      {client.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-amber-500 transition-colors text-base">{client.name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-1">
                         <Phone size={10} /> {client.phone}
                      </p>
                    </div>
                  </div>
                </td>
                
                <td className="p-4">
                  {client.type === 'VIP' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold">
                      <Star size={10} fill="currentColor" /> VIP Member
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs">
                      عميل عادي
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <p className="font-mono font-bold text-white">{formatMoney(client.totalSpent, 'IQD')}</p>
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-2">
                     <div className="w-full bg-gray-800 h-1.5 rounded-full w-24 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(client.bookingsCount * 10, 100)}%` }} />
                     </div>
                     <span className="text-xs text-gray-400">{client.bookingsCount}</span>
                  </div>
                </td>

                <td className="p-4 text-left">
                  <p className="text-sm text-gray-400">{new Date(client.lastBooking).toLocaleDateString('en-US')}</p>
                  <p className="text-[10px] text-gray-600">منذ 3 أيام</p>
                </td>

                <td className="p-4">
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Mail size={16} />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsTableWidget;
