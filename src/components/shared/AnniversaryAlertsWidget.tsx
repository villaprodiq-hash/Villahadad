import React from 'react';
import { Heart, Calendar, Cake, Phone, MessageCircle, AlertCircle } from 'lucide-react';
import { AnniversaryEvent } from '../../utils/anniversaryCalculator';

interface AnniversaryAlertsWidgetProps {
  events: AnniversaryEvent[];
  onCallClient: (phone: string) => void;
  onSendWhatsApp: (event: AnniversaryEvent) => void;
}

const AnniversaryAlertsWidget: React.FC<AnniversaryAlertsWidgetProps> = ({
  events,
  onCallClient,
  onSendWhatsApp
}) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'wedding': return <Heart size={16} className="text-[#C94557]" />;
      case 'birthday_groom': return <Cake size={16} className="text-blue-400" />;
      case 'birthday_bride': return <Cake size={16} className="text-pink-400" />;
      default: return <Calendar size={16} />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'wedding': return '💑 عيد زواج';
      case 'birthday_groom': return '🎂 عيد ميلاد';
      case 'birthday_bride': return '🎂 عيد ميلاد';
      default: return 'مناسبة';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500/30 bg-red-500/5';
      case 'normal': return 'border-yellow-500/30 bg-yellow-500/5';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  const getDaysText = (days: number) => {
    if (days === 0) return 'اليوم!';
    if (days === 1) return 'غداً';
    return `بعد ${days} ${days <= 10 ? 'أيام' : 'يوم'}`;
  };

  return (
    <div className="bg-[#1E1E1E] backdrop-blur-xl rounded-2xl p-5 border border-gray-700/5 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.4)] h-full overflow-hidden relative group">
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '150px'}} />
      
      <div className="relative z-10">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-[#C94557]" />
          مناسبات قادمة 🎉
        </h3>

        {events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">لا توجد مناسبات خلال الأسبوعين القادمين</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {events.map(event => (
              <div 
                key={event.id}
                className={`${getPriorityColor(event.priority)} border rounded-xl p-3 transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getEventIcon(event.eventType)}
                    <div>
                      <p className="text-white text-sm font-bold">{event.clientName}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        {getEventLabel(event.eventType)}  
                        <span className="text-[#C94557] font-bold">{getDaysText(event.daysUntil)}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Days Badge */}
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                    event.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    event.priority === 'normal' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {event.daysUntil}
                  </div>
                </div>

                {/* Suggestion */}
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                  {event.suggestion}
                </p>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onSendWhatsApp(event)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 text-[10px] font-bold transition-all"
                  >
                    <MessageCircle size={12} />
                    واتساب
                  </button>
                  <button
                    onClick={() => onCallClient(event.clientPhone)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-[10px] font-bold transition-all"
                  >
                    <Phone size={12} />
                    اتصال
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnniversaryAlertsWidget;
