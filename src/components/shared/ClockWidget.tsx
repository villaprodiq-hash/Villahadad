import React, { useState, useEffect } from 'react';

const ClockWidget: React.FC = () => {
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

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const currentDay = dayNames[time.getDay()];

  return (
    <div className="bg-[#1E1E1E] backdrop-blur-xl rounded-2xl p-3 border border-gray-700/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] h-full flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" 
           style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '150px'}} />
      
      <div className="relative z-10 flex items-center gap-3">
        {/* Analog Clock - Smaller */}
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Clock face */}
            <circle cx="100" cy="100" r="95" fill="#262626" stroke="#333" strokeWidth="2"/>
            
            {/* Hour markers - only 12, 3, 6, 9 */}
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
              x2={100 + Math.cos(hourAngle * Math.PI / 180) * 45}
              y2={100 + Math.sin(hourAngle * Math.PI / 180) * 45}
              stroke="#C94557"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Minute hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(minuteAngle * Math.PI / 180) * 65}
              y2={100 + Math.sin(minuteAngle * Math.PI / 180) * 65}
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Second hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(secondAngle * Math.PI / 180) * 70}
              y2={100 + Math.sin(secondAngle * Math.PI / 180) * 70}
              stroke="#C94557"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="100" cy="100" r="5" fill="#C94557"/>
            <circle cx="100" cy="100" r="2" fill="#fff"/>
          </svg>
        </div>

        {/* Digital Time */}
        <div className="text-right">
          <div className="text-2xl font-bold text-white leading-none mb-1">
            {hours.toString().padStart(2, '0')}
            <span className="text-[#C94557] mx-0.5">:</span>
            {minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-[10px] text-[#C94557] font-bold">{currentDay}</div>
        </div>
      </div>
    </div>
  );
};

export default ClockWidget;
