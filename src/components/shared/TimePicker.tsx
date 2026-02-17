
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label: _label }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

  const [hourInput, setHourInput] = useState('12');
  const [minuteInput, setMinuteInput] = useState('00');

  useEffect(() => {
    if (value) {
      const [hStr, mStr] = value.split(':');
      let h = parseInt(hStr ?? '12', 10);
      const m = parseInt(mStr ?? '00', 10);
      if (!isNaN(h) && !isNaN(m)) {
        const p = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        
        setHour(h);
        setMinute(m);
        setPeriod(p);
        
        setHourInput(h.toString().padStart(2, '0'));
        setMinuteInput(m.toString().padStart(2, '0'));
      }
    }
  }, [value, isOpen]);

  const handleDialHourChange = (val: number) => {
      setHour(val);
      setHourInput(val.toString().padStart(2, '0'));
  };

  const handleDialMinuteChange = (val: number) => {
      setMinute(val);
      setMinuteInput(val.toString().padStart(2, '0'));
  };

  const parseInput = (val: string) => {
      return val.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');
  };

  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInput(e.target.value);
      if (val.length > 2) val = val.slice(0, 2);
      setHourInput(val);
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) setHour(num);
  };

  const handleHourBlur = () => {
      let num = parseInt(hourInput, 10);
      if (isNaN(num) || num < 1 || num > 12) num = hour;
      setHour(num);
      setHourInput(num.toString().padStart(2, '0'));
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInput(e.target.value);
      if (val.length > 2) val = val.slice(0, 2);
      setMinuteInput(val);
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && num <= 59) setMinute(num);
  };

  const handleMinuteBlur = () => {
      let num = parseInt(minuteInput, 10);
      if (isNaN(num) || num < 0 || num > 59) num = minute;
      setMinute(num);
      setMinuteInput(num.toString().padStart(2, '0'));
  };

  const handleSave = () => {
    let h24 = hour;
    if (period === 'PM' && hour !== 12) h24 += 12;
    if (period === 'AM' && hour === 12) h24 = 0;
    onChange(`${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return '--:-- --';
    try {
      const [hStr, mStr] = String(value).split(':');
      let h = parseInt(hStr ?? '12', 10);
      if (isNaN(h)) h = 12; // Fallback
      
      const p = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      
      // Handle missing minutes case safely
      const mDisplay = mStr ? mStr : '00';
      
      return `${h.toString().padStart(2, '0')}:${mDisplay} ${p}`;
    } catch (e) {
      return '--:-- --';
    }
  };

  return (
    <div className="w-full relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between shadow-inner hover:border-[#F7931E]/50 transition-all group"
      >
        <div className="flex items-center gap-3">
           <Clock className="text-gray-500 group-hover:text-[#F7931E] transition-colors" size={18} />
           <span className="text-white font-mono text-base font-bold tracking-wider pt-0.5">{getDisplayValue()}</span>
        </div>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-300000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setIsOpen(false)}>
          <div className="bg-[#1E1E1E] w-full max-w-[340px] rounded-4xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 pb-4 flex flex-col items-center justify-center bg-[#262626] border-b border-white/5 relative overflow-hidden">
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 z-10">تحديد الوقت</p>
               <div className="flex items-end gap-2 z-10 font-mono" dir="ltr">
                  <input type="text" value={hourInput} onClick={() => setMode('hours')} onChange={handleHourInputChange} onBlur={handleHourBlur} className={`w-20 text-5xl font-bold bg-transparent text-center outline-none transition-all ${mode === 'hours' ? 'text-[#F7931E]' : 'text-white/40'}`} />
                  <span className="text-5xl font-bold text-white/20 pb-2">:</span>
                  <input type="text" value={minuteInput} onClick={() => setMode('minutes')} onChange={handleMinuteInputChange} onBlur={handleMinuteBlur} className={`w-20 text-5xl font-bold bg-transparent text-center outline-none transition-all ${mode === 'minutes' ? 'text-[#F7931E]' : 'text-white/40'}`} />
               </div>
               <div className="flex bg-black/30 rounded-lg p-1 border border-white/5 mt-4 z-10" dir="ltr">
                  <button onClick={() => setPeriod('AM')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${period === 'AM' ? 'bg-[#F7931E] text-white' : 'text-gray-500'}`}>AM</button>
                  <button onClick={() => setPeriod('PM')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${period === 'PM' ? 'bg-[#F7931E] text-white' : 'text-gray-500'}`}>PM</button>
               </div>
            </div>
            <div className="p-6 flex items-center justify-center bg-[#1E1E1E]">
               <ClockFace mode={mode} value={mode === 'hours' ? hour : minute} onChange={(val) => { if (mode === 'hours') { handleDialHourChange(val); setTimeout(() => setMode('minutes'), 300); } else { handleDialMinuteChange(val); } }} />
            </div>
            <div className="flex items-center justify-between p-4 bg-[#1E1E1E] border-t border-white/5 gap-3">
               <button onClick={() => setIsOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-white bg-white/5 rounded-xl">إلغاء</button>
               <button onClick={handleSave} className="flex-1 py-3 text-sm font-bold bg-[#F7931E] text-white rounded-xl shadow-lg flex items-center justify-center gap-2"><span>تم</span></button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

interface ClockFaceProps { mode: 'hours' | 'minutes'; value: number; onChange: (val: number) => void; }
const ClockFace: React.FC<ClockFaceProps> = ({ mode, value, onChange }) => {
    const clockRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const radius = 100; const size = 240; const center = size / 2;
    const numbers = mode === 'hours' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const degrees = mode === 'hours' ? (value % 12) * 30 : value * 6;
    const updateValue = useCallback((x: number, y: number) => {
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        const cX = rect.left + rect.width / 2; const cY = rect.top + rect.height / 2;
        let angleDeg = Math.atan2(y - cY, x - cX) * (180 / Math.PI) + 90;
        if (angleDeg < 0) angleDeg += 360;
        if (mode === 'hours') { let h = Math.round(angleDeg / 30); if (h === 0) h = 12; onChange(h); }
        else { let m = Math.round(angleDeg / 6); if (m === 60) m = 0; onChange(m); }
    }, [mode, onChange]);
    const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); updateValue(e.clientX, e.clientY); };
    const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) updateValue(e.clientX, e.clientY); };
    const handleMouseUp = () => setIsDragging(false);
    return (
        <div className="relative select-none cursor-pointer" style={{ width: size, height: size }} ref={clockRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="absolute inset-0 rounded-full bg-[#262626] border border-white/5 shadow-inner" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#F7931E] rounded-full z-20" />
            <div className="absolute left-1/2 top-1/2 origin-bottom z-10 transition-transform duration-150" style={{ height: radius, width: 2, backgroundColor: '#F7931E', transform: `translate(-50%, -100%) rotate(${degrees}deg)` }}><div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#F7931E] shadow-lg" /></div>
            {numbers.map((num) => {
                const angle = (num * (360 / (mode === 'hours' ? 12 : 60)) - 90) * (Math.PI / 180);
                const x = center + radius * Math.cos(angle); const y = center + radius * Math.sin(angle);
                return <div key={num} className={`absolute w-8 h-8 flex items-center justify-center rounded-full text-xs font-black transition-colors z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 ${num === value ? 'text-white bg-[#F7931E]' : 'text-gray-500'}`} style={{ left: x, top: y }}>{num}</div>
            })}
        </div>
    );
};

export default TimePicker;
