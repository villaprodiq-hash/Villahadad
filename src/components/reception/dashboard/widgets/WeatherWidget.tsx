import React, { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudSun, CloudLightning } from 'lucide-react';

const weatherTranslations: { [key: string]: string } = {
  'Cloudy': 'غائم',
  'Partly Cloudy': 'غائم جزئياً',
  'Sunny': 'مشمس',
  'Rain': 'ممطر',
  'Clear': 'صافي',
  'Storm': 'عاصف'
};

const getWeatherIcon = (type: string, isActive: boolean) => {
  const baseClasses = "w-4 h-4 transition-all duration-300";
  if (isActive) {
    return <CloudSun className={`${baseClasses} text-orange-400 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]`} />;
  }
  switch (type) {
    case 'Sunny': return <Sun className={`${baseClasses} text-yellow-500/80`} />;
    case 'Cloudy': return <Cloud className={`${baseClasses} text-gray-400/80`} />;
    case 'Partly': return <CloudSun className={`${baseClasses} text-orange-300/80`} />;
    case 'Rain': return <CloudRain className={`${baseClasses} text-blue-400/80`} />;
    case 'Storm': return <CloudLightning className={`${baseClasses} text-purple-400/80`} />;
    default: return <Cloud className={`${baseClasses} text-gray-400/80`} />;
  }
};

const forecastData = [
  { day: 'سبت', temp: 30, type: 'Sunny' },
  { day: 'أحد', temp: 28, type: 'Partly', isToday: true, condition: 'Partly Cloudy' },
  { day: 'إثنين', temp: 26, type: 'Rain' },
  { day: 'ثلاثاء', temp: 29, type: 'Partly' },
  { day: 'أربعاء', temp: 31, type: 'Sunny' },
  { day: 'خميس', temp: 27, type: 'Cloudy' },
  { day: 'جمعة', temp: 25, type: 'Storm' },
];

interface WeatherWidgetProps {
  isManager?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ isManager = false }) => {
  const [sunPosition, setSunPosition] = useState(0);

  useEffect(() => {
    const updateSunPosition = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const sunriseMinutes = 6 * 60 + 15; 
      const sunsetMinutes = 17 * 60 + 45; 
      const totalDaylight = sunsetMinutes - sunriseMinutes;
      let percentage = ((currentMinutes - sunriseMinutes) / totalDaylight) * 100;
      if (percentage < 0) percentage = 0;
      if (percentage > 100) percentage = 100;
      setSunPosition(percentage);
    };
    updateSunPosition();
    const timer = setInterval(updateSunPosition, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`w-full h-full ${isManager ? 'bg-[#1a1c22] rounded-xl border border-white/10 shadow-2xl' : 'bg-linear-to-br from-[#2a2a2a] to-[#202020] rounded-3xl'} p-3 flex flex-col justify-between overflow-hidden relative shadow-inner`}>
      
      {/* Top Section: Recessed "Square" Container */}
      {/* هذا المربع المحفور يحتوي البيانات العلوية ليشبه مربع التقويم */}
      <div className="flex items-center justify-between z-10 mt-1 p-3 bg-[#222222] rounded-2xl shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] border-b border-white/5">
        <div className="flex items-center gap-3">
          
          {/* النص أبيض وبارز داخل المربع المحفور */}
          <h1 className="text-5xl font-bold tracking-tighter text-white drop-shadow-md">
            28°
          </h1>

          <div className="flex flex-col items-start">
            <span className="text-lg text-gray-200 font-medium">
              {weatherTranslations['Partly Cloudy']}
            </span>
            <span className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5 font-bold">
              بغداد
            </span>
          </div>
        </div>
        
        <div className="mr-1">
            <CloudSun className="w-10 h-10 text-orange-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]" />
        </div>
      </div>

      {/* Middle Section: Sun Bar (Deep Groove) */}
      <div className="w-full py-1 z-10 flex flex-col justify-center mt-3 mb-1 px-1">
        <div className="relative h-2.5 w-full bg-[#111] rounded-full overflow-hidden shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9),inset_-1px_-1px_2px_rgba(255,255,255,0.08)] border-b border-white/5">
          <div 
            className="absolute top-0 left-0 h-full bg-linear-to-r from-[#FF5722] to-[#FF8A65] opacity-90 shadow-[0_0_10px_#FF5722]"
            style={{ width: `${sunPosition}%` }}
          ></div>
        </div>
        
        {/* Sun Dot */}
        <div className="relative w-full h-0">
           <div 
            className="absolute -top-[9px] -translate-y-1/2 w-3.5 h-3.5 bg-[#FF5722] rounded-full border border-[#262626] z-20 shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
            style={{ left: `calc(${sunPosition}% - 7px)` }}
          ></div>
        </div>

        <div className="flex justify-between w-full mt-2 text-[9px] text-gray-500 font-medium px-1">
          <span>الشروق 06:15</span>
          <span>الغروب 17:45</span>
        </div>
      </div>

      {/* Bottom Section: Days */}
      <div className="grid grid-cols-7 gap-1 mt-auto z-10 w-full">
        {forecastData.map((day, idx) => (
          <div 
            key={idx}
            className={`
              flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-300 relative
              ${day.isToday 
                // زر مضغوط للداخل (Inset)
                ? 'bg-[#222222] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] border border-orange-500/10 translate-y-[1px]' 
                : 'bg-transparent hover:bg-[#252525] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]' 
              }
            `}
          >
            <span className={`text-[9px] mb-1 truncate w-full text-center font-bold ${day.isToday ? 'text-orange-400' : 'text-gray-500'}`}>
              {day.day}
            </span>
            
            <div className="mb-1">
              {getWeatherIcon(day.type, !!day.isToday)}
            </div>

            <span className={`text-[10px] font-bold ${day.isToday ? 'text-gray-300' : 'text-gray-500'}`}>
              {day.temp}°
            </span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default WeatherWidget;