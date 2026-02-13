import React, { useState, useEffect } from 'react';
import { Timer, Plus, Minus } from 'lucide-react';

const NeumorphicClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [isTimerOn, setIsTimerOn] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerMinutesSet, setTimerMinutesSet] = useState(30); // Default 30 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isTimerOn && timerSeconds > 0) {
      const countdown = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerOn(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [isTimerOn, timerSeconds]);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate angles for clock hands
  const secondAngle = (seconds * 6) - 90;
  const minuteAngle = (minutes * 6 + seconds * 0.1) - 90;
  const hourAngle = ((hours % 12) * 30 + minutes * 0.5) - 90;

  // Calendar data
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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

  // Format time for display
  const displayHours = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Format timer display
  const timerMinutes = Math.floor(timerSeconds / 60);
  const timerSecondsDisplay = timerSeconds % 60;

  const handleTimerToggle = () => {
    if (!isTimerOn) {
      setTimerSeconds(timerMinutesSet * 60);
      setIsTimerOn(true);
    } else {
      setIsTimerOn(false);
      setTimerSeconds(0);
    }
  };

  const increaseTimer = () => {
    if (!isTimerOn && timerMinutesSet < 60) {
      setTimerMinutesSet(prev => prev + 5); // Increase by 5 minutes
    }
  };

  const decreaseTimer = () => {
    if (!isTimerOn && timerMinutesSet > 5) {
      setTimerMinutesSet(prev => prev - 5); // Decrease by 5 minutes
    }
  };

  return (
    <div className="w-full h-full bg-[#262626] rounded-2xl p-4 flex gap-4 items-center overflow-hidden">
      {/* Left Section: Analog Clock + Digital Time */}
      <div className="shrink-0 flex flex-col items-center gap-2">
        {/* Inset Clock Container - SMALLER */}
        <div 
          className="w-24 h-24 rounded-full bg-[#262626] flex items-center justify-center relative"
          style={{
            boxShadow: 'inset 8px 8px 16px #1a1a1a, inset -8px -8px 16px #323232'
          }}
        >
          <svg viewBox="0 0 200 200" className="w-20 h-20">
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
                  stroke="#404040"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Clock numbers */}
            <text x="100" y="35" textAnchor="middle" fill="#808080" fontSize="16" fontWeight="bold" fontFamily="system-ui">12</text>
            <text x="165" y="108" textAnchor="middle" fill="#808080" fontSize="16" fontWeight="bold" fontFamily="system-ui">3</text>
            <text x="100" y="178" textAnchor="middle" fill="#808080" fontSize="16" fontWeight="bold" fontFamily="system-ui">6</text>
            <text x="35" y="108" textAnchor="middle" fill="#808080" fontSize="16" fontWeight="bold" fontFamily="system-ui">9</text>

            {/* Hour hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(hourAngle * Math.PI / 180) * 45}
              y2={100 + Math.sin(hourAngle * Math.PI / 180) * 45}
              stroke="#e0e0e0"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Minute hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(minuteAngle * Math.PI / 180) * 65}
              y2={100 + Math.sin(minuteAngle * Math.PI / 180) * 65}
              stroke="#e0e0e0"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Second hand - ORANGE */}
            <line
              x1="100"
              y1="100"
              x2={100 + Math.cos(secondAngle * Math.PI / 180) * 70}
              y2={100 + Math.sin(secondAngle * Math.PI / 180) * 70}
              stroke="#FF5722"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="100" cy="100" r="5" fill="#FF5722"/>
          </svg>
        </div>

        {/* Digital Time - Under Clock */}
        <div className="text-center">
          <div className="text-base font-bold text-white leading-none">
            {displayHours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-[9px] text-gray-500 font-medium mt-0.5">{ampm}</div>
        </div>
      </div>

      {/* Right Section: Calendar + Timer */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Mini Calendar with Neumorphic Shadow */}
        <div 
          className="bg-[#262626] rounded-xl p-1.5"
          style={{
            boxShadow: 'inset 4px 4px 8px #1a1a1a, inset -4px -4px 8px #323232'
          }}
        >
          <div className="text-[9px] text-gray-500 mb-0.5 text-center font-medium">
            {monthNames[month]} {year}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-[6px] text-gray-600 text-center w-3.5 h-3.5 flex items-center justify-center font-bold">
                {day}
              </div>
            ))}
            {calendarDays.map((day, i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 flex items-center justify-center text-[7px] relative"
              >
                {day && (
                  <>
                    <span className={day === today ? 'text-white font-bold z-10 relative' : 'text-gray-500'}>
                      {day}
                    </span>
                    {day === today && (
                      <div 
                        className="absolute inset-0 rounded-full bg-[#FF5722]"
                        style={{
                          boxShadow: '0 0 6px #FF5722'
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timer Section */}
        <div 
          className="bg-[#262626] rounded-xl px-2 py-1.5 flex flex-col gap-1.5"
          style={{
            boxShadow: 'inset 4px 4px 8px #1a1a1a, inset -4px -4px 8px #323232'
          }}
        >
          {/* Timer Display */}
          <div className="flex items-center justify-between">
            <Timer size={12} className={`shrink-0 ${isTimerOn ? 'text-[#FF5722]' : 'text-gray-500'}`} />
            
            {isTimerOn ? (
              <span className="text-base font-bold text-[#FF5722]">
                {timerMinutes.toString().padStart(2, '0')}:{timerSecondsDisplay.toString().padStart(2, '0')}
              </span>
            ) : (
              <span className="text-xs font-bold text-white">
                {timerMinutesSet} دقيقة
              </span>
            )}

            {/* Toggle Switch */}
            <button
              onClick={handleTimerToggle}
              className={`w-7 h-3.5 rounded-full relative transition-all duration-300 shrink-0 ${
                isTimerOn ? 'bg-[#FF5722]' : 'bg-[#1a1a1a]'
              }`}
              style={{
                boxShadow: isTimerOn 
                  ? '0 0 6px rgba(255, 87, 34, 0.5)' 
                  : 'inset 2px 2px 4px #0d0d0d, inset -2px -2px 4px #272727'
              }}
              title={isTimerOn ? 'إيقاف التايمر' : `تشغيل تايمر ${timerMinutesSet} دقيقة`}
            >
              <div
                className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${
                  isTimerOn ? 'right-0.5' : 'left-0.5'
                }`}
                style={{
                  boxShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
                }}
              />
            </button>
          </div>

          {/* Timer Controls (when not running) */}
          {!isTimerOn && (
            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={decreaseTimer}
                className="w-5 h-5 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#FF5722] transition-colors"
                style={{ boxShadow: 'inset 2px 2px 4px #0d0d0d, inset -2px -2px 4px #272727' }}
              >
                <Minus size={10} className="text-gray-400" />
              </button>
              <span className="text-[8px] text-gray-600 font-medium">5 دقائق لكل ضغطة</span>
              <button
                onClick={increaseTimer}
                className="w-5 h-5 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#FF5722] transition-colors"
                style={{ boxShadow: 'inset 2px 2px 4px #0d0d0d, inset -2px -2px 4px #272727' }}
              >
                <Plus size={10} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NeumorphicClockWidget;
