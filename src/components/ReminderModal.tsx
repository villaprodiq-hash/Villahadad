import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Calendar, X, DollarSign, Camera, Monitor, Truck, CheckCircle2, 
  FileText, Gift, Heart, Home, Image as ImageIcon, MapPin, Music, Phone, 
  Star, User, Video, Zap, AlertTriangle, Briefcase 
} from 'lucide-react';
import { ReminderType, ReminderTypeLabels, Reminder } from '../types';
import Draggable from 'react-draggable';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, date: string, type: ReminderType, customIcon?: string) => void;
  initialType?: ReminderType;
  initialData?: Reminder | null;
  initialTitle?: string;
}

const ICONS = [
    { id: 'Bell', icon: Bell },
    { id: 'DollarSign', icon: DollarSign },
    { id: 'Camera', icon: Camera },
    { id: 'Monitor', icon: Monitor },
    { id: 'Truck', icon: Truck },
    { id: 'Calendar', icon: Calendar },
    { id: 'FileText', icon: FileText },
    { id: 'Gift', icon: Gift },
    { id: 'Heart', icon: Heart },
    { id: 'Home', icon: Home },
    { id: 'Image', icon: ImageIcon },
    { id: 'MapPin', icon: MapPin },
    { id: 'Music', icon: Music },
    { id: 'Phone', icon: Phone },
    { id: 'Star', icon: Star },
    { id: 'User', icon: User },
    { id: 'Video', icon: Video },
    { id: 'Zap', icon: Zap },
    { id: 'AlertTriangle', icon: AlertTriangle },
    { id: 'Briefcase', icon: Briefcase },
];

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSubmit, initialType = 'general', initialData, initialTitle = '' }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<ReminderType>('general');
  const [customIcon, setCustomIcon] = useState<string | undefined>(undefined);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const nodeRef = useRef(null);

  // Reset form and set initial type when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDate(initialData.dueDate);
        setType(initialData.type);
        setCustomIcon(initialData.customIcon);
        setShowIconPicker(false);
      } else {
        setType(initialType);
        setTitle(initialTitle); // Set initial title (e.g. from Voice Transcription)
        setDate('');
        setCustomIcon(undefined);
        setShowIconPicker(false);
      }
    }
  }, [isOpen, initialType, initialData, initialTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && date) {
      onSubmit(title, date, type, customIcon);
      onClose();
    }
  };

  const types: { id: ReminderType; icon: React.ReactNode; color: string; defaultIconName: string }[] = [
    { id: 'general', icon: <Bell size={18} />, color: 'from-gray-500 to-gray-600', defaultIconName: 'Bell' },
    { id: 'payment', icon: <DollarSign size={18} />, color: 'from-green-500 to-emerald-600', defaultIconName: 'DollarSign' },
    { id: 'shooting', icon: <Camera size={18} />, color: 'from-orange-500 to-red-500', defaultIconName: 'Camera' },
    { id: 'editing', icon: <Monitor size={18} />, color: 'from-blue-500 to-indigo-600', defaultIconName: 'Monitor' },
    { id: 'delivery', icon: <Truck size={18} />, color: 'from-purple-500 to-violet-600', defaultIconName: 'Truck' },
  ];

  // Get current displayed icon (either custom or default for type)
  const currentIconId = customIcon || types.find(t => t.id === type)?.defaultIconName || 'Bell';
  const CurrentIconComponent = ICONS.find(i => i.id === currentIconId)?.icon || Bell;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300">
      <Draggable nodeRef={nodeRef} handle=".modal-header">
        <div ref={nodeRef} className="bg-[#1E1E1E] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-300 ring-1 ring-white/5">
          
          {/* Header */}
          <div className="modal-header cursor-move bg-gradient-to-l from-[#262626] to-[#1E1E1E] p-6 flex items-center gap-4 border-b border-white/5">
            <div className="p-3 bg-gradient-to-br from-[#F7931E] to-[#F9BE70] rounded-xl text-white shadow-[0_0_15px_rgba(247,147,30,0.3)]">
              <Bell size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">{initialData ? 'تعديل التذكير' : 'إضافة تذكير'}</h3>
              <p className="text-gray-400 text-xs mt-0.5">تنبيهات للمدفوعات أو سير العمل</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Type Selection */}
            <div className="space-y-3">
               <div className="flex justify-between items-center">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">نوع التذكير</label>
               </div>
               
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                 {types.map((t) => (
                   <button
                     key={t.id}
                     type="button"
                     onClick={() => {
                       setType(t.id);
                       if (!initialData) setCustomIcon(undefined); // Reset custom icon on type change only for new
                     }}
                     className={`relative group flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                       type === t.id 
                         ? 'bg-white/10 border-white/20 shadow-inner' 
                         : 'bg-black/20 border-white/5 hover:bg-white/5'
                     }`}
                   >
                     <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white shadow-lg ${type === t.id ? 'scale-110' : 'scale-100 grayscale group-hover:grayscale-0'} transition-all duration-300`}>
                       {t.icon}
                     </div>
                     <span className={`text-xs font-bold ${type === t.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                       {ReminderTypeLabels[t.id]}
                     </span>
                     {type === t.id && !customIcon && (
                       <div className="absolute top-2 left-2 text-[#F7931E]">
                         <CheckCircle2 size={12} />
                       </div>
                     )}
                   </button>
                 ))}
               </div>
            </div>

            {/* Custom Icon Selection */}
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">أيقونة مخصصة</label>
                  <button 
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="text-xs font-bold text-[#F7931E] hover:underline"
                  >
                    {showIconPicker ? 'إخفاء الأيقونات' : 'تغيير الأيقونة'}
                  </button>
               </div>
               
               {showIconPicker ? (
                  <div className="grid grid-cols-6 gap-2 p-3 bg-black/20 rounded-xl border border-white/5 max-h-[120px] overflow-y-auto custom-scrollbar">
                      {ICONS.map((item) => (
                          <button
                              key={item.id}
                              type="button"
                              onClick={() => setCustomIcon(item.id)}
                              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                                  currentIconId === item.id 
                                  ? 'bg-[#F7931E] text-white' 
                                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
                              }`}
                              title={item.id}
                          >
                              <item.icon size={18} />
                          </button>
                      ))}
                  </div>
               ) : (
                  <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                      <div className="p-2 bg-white/5 rounded-lg text-white">
                          <CurrentIconComponent size={20} />
                      </div>
                      <span className="text-sm text-gray-400">الأيقونة الحالية: {currentIconId}</span>
                  </div>
               )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">العنوان / الوصف</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'payment' ? "مثال: استحقاق الدفعة الثانية" : "مثال: مراجعة الصور مع العميل"}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F7931E]/50 focus:ring-1 focus:ring-[#F7931E]/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">تاريخ الاستحقاق</label>
              <div className="relative">
                {/* RTL: Icon position */}
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl pr-12 pl-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F7931E]/50 focus:ring-1 focus:ring-[#F7931E]/50 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-4 justify-end border-t border-white/5 mt-4">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-semibold text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-xl"
              >
                إلغاء
              </button>
              <button 
                type="submit"
                disabled={!title || !date}
                className="px-8 py-3 text-sm font-bold bg-gradient-to-r from-[#F7931E] to-[#F9BE70] text-white rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-[0_0_20px_rgba(247,147,30,0.5)] transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {initialData ? 'حفظ التغييرات' : 'حفظ التذكير'}
              </button>
            </div>
          </form>
        </div>
      </Draggable>
    </div>
  );
};

export default ReminderModal;