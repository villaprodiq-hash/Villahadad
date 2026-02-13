import React from 'react';
import { CreditCard, Smartphone, Wallet, Lock, Construction } from 'lucide-react';
import ReceptionWidgetCard from '../../reception/dashboard/ReceptionWidgetCard';

interface Props {
  isManager?: boolean;
}

const ElectronicPaymentsWidget: React.FC<Props> = ({ isManager }) => {
  const methods = [
    {
      id: 'zaincash',
      name: 'Zain Cash',
      icon: <Smartphone className="w-6 h-6" />,
      color: 'bg-rose-500',
      description: 'الدفع المباشر عبر محفظة زين كاش',
      status: 'coming_soon',
    },
    {
      id: 'qicard',
      name: 'Qi Card',
      icon: <CreditCard className="w-6 h-6" />,
      color: 'bg-yellow-500',
      description: 'بطاقة كي كارد والماستر كارد',
      status: 'coming_soon',
    },
    {
      id: 'neopay',
      name: 'Neo Pay',
      icon: <Wallet className="w-6 h-6" />,
      color: 'bg-indigo-500',
      description: 'بوابة الدفع الإلكتروني نيو',
      status: 'coming_soon',
    },
  ];

  return (
    <ReceptionWidgetCard
      className={`p-6 ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-white/40 ring-1 ring-white/60 text-gray-800' : ''}`}
      rounded={isManager ? 'rounded-[2.5rem]' : undefined}
      title={
        <div className="flex items-center gap-3">
          <span className={isManager ? 'text-gray-800' : 'text-white'}>المدفوعات الإلكترونية</span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full flex items-center gap-1">
            <Construction className="w-3 h-3" />
            قيد التطوير
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {methods.map(method => (
          <div
            key={method.id}
            className={`relative group overflow-hidden rounded-xl border p-4 transition-all ${
              isManager ? 'bg-gray-50/50 border-gray-200' : 'bg-white/5 border-white/10'
            }`}
          >
            {/* Disabled Overlay */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center bg-black/5 backdrop-blur-[1px] z-10 opacity-70 group-hover:opacity-100 transition-opacity`}
            >
              <div className="bg-black/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <Lock className="w-3 h-3" />
                قريباً
              </div>
            </div>

            <div className="flex items-start justify-between mb-3 opacity-60">
              <div className={`p-2 rounded-lg text-white ${method.color}`}>{method.icon}</div>
              <div
                className={`w-2 h-2 rounded-full ${isManager ? 'bg-gray-300' : 'bg-white/20'}`}
              />
            </div>

            <h3
              className={`font-bold mb-1 opacity-60 ${isManager ? 'text-gray-800' : 'text-white'}`}
            >
              {method.name}
            </h3>
            <p className="text-xs text-gray-500 opacity-60">{method.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-dashed border-gray-500/20 text-center">
        <p className="text-xs text-gray-400">
          سيتم تفعيل بوابات الدفع الإلكتروني قريباً لتمكين استلام الدفعات عبر المحافظ الرقمية
          والبطاقات المصرفية مباشرة.
        </p>
      </div>
    </ReceptionWidgetCard>
  );
};

export default ElectronicPaymentsWidget;
