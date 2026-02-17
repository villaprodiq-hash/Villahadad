import React from 'react';
import { Plus } from 'lucide-react';
import ReceptionPageWrapper from './reception/layout/ReceptionPageWrapper';

interface SimpleBookingsViewProps {
  title: string;
  onAddBooking: () => void;
  icon?: React.ReactNode;
  isManager?: boolean;
}

const SimpleBookingsView: React.FC<SimpleBookingsViewProps> = ({ 
  title, 
  onAddBooking,
  icon,
  isManager = false
}) => {
  return (
    <ReceptionPageWrapper isReception={!isManager} isManager={isManager}>
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in" dir="rtl">
      <div className="flex flex-col items-center gap-6 max-w-md">
        {/* Icon/Illustration */}
        {icon && (
          <div className={`w-24 h-24 rounded-3xl ${isManager ? 'bg-amber-50 border border-amber-100 text-amber-500' : 'bg-linear-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20'} flex items-center justify-center`}>
            {icon}
          </div>
        )}
        
        {/* Title */}
        <h2 className={`text-2xl font-black ${isManager ? 'text-gray-800' : 'text-gray-200'} text-center`}>
          {title}
        </h2>
        
        {/* Add Booking Button */}
        <button
          onClick={onAddBooking}
          className={`group relative px-8 py-4 ${isManager ? 'bg-linear-to-br from-amber-500 to-orange-600 hover:shadow-[0_10px_40px_rgba(245,158,11,0.4)]' : 'bg-linear-to-br from-pink-500 to-purple-600 hover:shadow-[0_10px_40px_rgba(236,72,153,0.4)]'} rounded-2xl 
                     transition-all duration-300 
                     hover:scale-105 active:scale-95 border border-white/10`}
        >
          <div className="flex items-center gap-3">
            <Plus size={24} className="text-white" />
            <span className="text-white font-black text-lg">حجز جديد</span>
          </div>
          
          {/* Shine effect */}
          <div className="absolute inset-0 bg-linear-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
        </button>
        
        {/* Subtitle/Description */}
        <p className="text-gray-500 text-sm text-center max-w-xs">
          اضغط على الزر أعلاه لإنشاء حجز جديد
        </p>
      </div>
        </div>
    </ReceptionPageWrapper>
  );
};

export default SimpleBookingsView;
