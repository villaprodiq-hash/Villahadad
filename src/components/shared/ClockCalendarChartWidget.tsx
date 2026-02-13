import React, { useState, useEffect, useMemo } from 'react';
import { Booking } from '../../types';
import { CheckCircle } from 'lucide-react';

interface ClockCalendarChartWidgetProps {
  bookings: Booking[];
}

const ClockCalendarChartWidget: React.FC<ClockCalendarChartWidgetProps> = ({ bookings }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate angles for clock hands
  const secondAngle = (seconds * 6) - 90;
  const minuteAngle = (minutes * 6 + seconds * 0.1) - 90;
  const hourAngle = ((hours % 12) * 30 + minutes * 0.5) - 90;

  // Calendar data
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const dayNamesShort = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  
  const year = time.getFullYear();
  const month = time.getMonth();
  const today = time.getDate();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Weekly chart data
  const weekData = useMemo(() => {
    const days = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 1) % 7));
    
    const dayNamesEn = ['S', 'S', 'M', 'T', 'W', 'T', 'F'];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      const bookingsCount = bookings.filter(b => {
        const bookingDate = new Date(b.shootDate);
        return bookingDate.toDateString() === day.toDateString();
      }).length;
      
      const isToday = day.toDateString() === today.toDateString();
      const isPast = day < today && !isToday;
      
      days.push({
        nameEn: dayNamesEn[i],
        count: bookingsCount,
        isToday,
        isPast,
        isCompleted: isPast && bookingsCount > 0
      });
    }
    
    return days;
  }, [bookings]);

  const maxCount = Math.max(...weekData.map(d => d.count), 1);

  return (
    <div className="bg-[#1E1E1E] backdrop-blur-xl rounded-2xl p-4 border border-gray-700/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] h-full flex gap-3 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" 
           style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='ncc'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23ncc)'/%3E%3C/svg%3E")`, backgroundSize: '150px'}} />
      
      {/* Left: Analog Clock with Digital Time Inside - BIGGER */}
      <div className="relative flex-shrink-0 z-10 flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Clock face */}
            <circle cx="100" cy="100" r="95" fill="#262626" stroke="#333" strokeWidth="3"/>
            
            {/* Hour markers */}
            {[0, 3, 6, 9].map((i) => {
              const angle = (i * 30) * (Math.PI / 180);
              const x1 = 100 + Math.cos(angle) * 85;
              const y1 = 100 + Math.sin(angle) * 85;
              const x2 = 100 + Math.cos(angle) * 75;
              const y2 = 100 + Math.sin(angle) * 75;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#C94557"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Hour hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(hourAngle * Math.PI / 180) * 40}
              y2={100 + Math.sin(hourAngle * Math.PI / 180) * 40}
              stroke="#fff"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Minute hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(minuteAngle * Math.PI / 180) * 60}
              y2={100 + Math.sin(minuteAngle * Math.PI / 180) * 60}
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Second hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(secondAngle * Math.PI / 180) * 70}
              y2={100 + Math.sin(secondAngle * Math.PI / 180) * 70}
              stroke="#FF6B35"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Digital time in bottom of clock - BIGGER */}
            <text
              x="100"
              y="145"
              textAnchor="middle"
              fill="#fff"
              fontSize="24"
              fontWeight="bold"
              fontFamily="system-ui"
            >
              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </text>

            {/* Center dot */}
            <circle cx="100" cy="100" r="5" fill="#FF6B35"/>
            <circle cx="100" cy="100" r="2" fill="#fff"/>
          </svg>
        </div>
      </div>

      {/* Middle: Calendar - BIGGER and ONLY ONE */}
      <div className="flex-1 bg-black/20 rounded-xl p-3 z-10 flex flex-col">
        <div className="text-xs text-center text-gray-400 mb-2 font-bold">{monthNames[month]} {year}</div>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {/* Day headers */}
          {dayNamesShort.map((day, i) => (
            <div key={i} className="text-[9px] text-center text-gray-500 font-bold flex items-center justify-center">{day}</div>
          ))}
          {/* Calendar days */}
          {calendarDays.map((day, i) => (
            <div
              key={i}
              className={`text-[10px] text-center flex items-center justify-center ${
                day === today
                  ? 'bg-[#C94557] text-white rounded font-bold'
                  : day
                  ? 'text-gray-400'
                  : ''
              }`}
            >
              {day || ''}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Weekly Chart */}
      <div className="flex-1 flex flex-col z-10">
        <div className="text-[10px] font-bold text-gray-400 mb-2">الحجوزات الأسبوعية</div>
        <div className="flex-1 flex items-end justify-between gap-1">
          {weekData.map((day, index) => {
            const height = day.count > 0 ? (day.count / maxCount) * 100 : 8;
            
            let barColor = '#444';
            if (day.isCompleted) barColor = '#25D366';
            else if (day.isToday) barColor = '#C94557';
            else if (day.count > 0) barColor = '#666';
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                {/* Checkmark */}
                <div className="h-3 flex items-center justify-center">
                  {day.isCompleted && (
                    <CheckCircle size={8} className="text-[#25D366]" />
                  )}
                </div>
                
                {/* Bar */}
                <div className="w-full flex flex-col items-center justify-end flex-1">
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{
                      height: `${height}%`,
                      backgroundColor: barColor,
                      minHeight: day.count > 0 ? '10px' : '5px'
                    }}
                  />
                </div>
                
                {/* Day label */}
                <div className={`text-[8px] font-bold ${
                  day.isToday ? 'text-[#C94557]' : 
                  day.isCompleted ? 'text-[#25D366]' : 
                  'text-gray-500'
                }`}>
                  {day.nameEn}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClockCalendarChartWidget;
