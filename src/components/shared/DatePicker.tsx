
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // For navigation
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Initialize from value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setCurrentDate(date);
      }
    }
  }, [value]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sun

  // Arabic Day Names
  const weekDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Adjust for timezone offset to ensure YYYY-MM-DD matches local selection
    const offset = newDate.getTimezoneOffset();
    const localDate = new Date(newDate.getTime() - (offset*60*1000));
    
    onChange(localDate.toISOString().split('T')[0]);
    setSelectedDate(newDate);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    return selectedDate && 
           selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentDate.getMonth() && 
           selectedDate.getFullYear() === currentDate.getFullYear();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentDate.getMonth() && 
           today.getFullYear() === currentDate.getFullYear();
  };

  return (
    <div className="w-full relative">
      {label && <label className="text-xs text-gray-400 font-bold mb-2 block">{label}</label>}
      
      {/* Trigger Button */}
      <button 
        data-testid="date-picker-trigger"
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between shadow-inner hover:border-[#F7931E]/50 transition-all group"
      >
        <div className="flex items-center gap-3">
           <CalendarIcon className="text-gray-500 group-hover:text-[#F7931E] transition-colors" size={18} />
           <span className={`font-mono text-base font-bold tracking-wider pt-0.5 ${value ? 'text-white' : 'text-gray-500'}`}>
             {value || 'YYYY-MM-DD'}
           </span>
        </div>
      </button>

      {/* Modal Overlay */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[500000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#1E1E1E] w-full max-w-[340px] rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="p-5 bg-[#262626] border-b border-white/5 flex items-center justify-between">
                <button onClick={handlePrevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </button>
                <div className="text-center">
                    <p className="text-white font-bold text-lg">
                        {monthNames[currentDate.getMonth()]}
                    </p>
                    <p className="text-[10px] text-[#F7931E] font-bold">
                        {currentDate.getFullYear()}
                    </p>
                </div>
                <button onClick={handleNextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={18} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-5 bg-[#1E1E1E]">
                {/* Week Days */}
                <div className="grid grid-cols-7 text-center mb-2">
                    {weekDays.map((d, i) => (
                        <span key={i} className="text-[10px] font-bold text-gray-500">{d}</span>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const selected = isSelected(day);
                        const today = isToday(day);

                        return (
                            <button
                                key={day}
                                onClick={() => handleDayClick(day)}
                                className={`
                                    h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all relative
                                    ${selected 
                                        ? 'bg-[#F7931E] text-white shadow-[0_4px_12px_rgba(247,147,30,0.4)] scale-110 z-10' 
                                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                    }
                                    ${today && !selected ? 'border border-[#F7931E] text-[#F7931E]' : ''}
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-[#1E1E1E]">
                <button 
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-sm font-bold transition-colors"
                >
                    إلغاء
                </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DatePicker;
