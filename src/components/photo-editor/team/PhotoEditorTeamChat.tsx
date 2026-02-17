
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../../../types';
import { 
  MessageSquare, CheckSquare, Send, User as UserIcon, 
  MoreVertical, CheckCircle2, Plus, Hash, Sparkles, Smile,
  Mic, FileText, Download, Play, Music, Paperclip, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReceptionPageWrapper from '../../reception/layout/ReceptionPageWrapper';
import ReceptionWidgetCard from '../../reception/dashboard/ReceptionWidgetCard';

interface PhotoEditorTeamChatProps {
  currentUser?: User;
  users: User[];
  isManager?: boolean;
}

interface Message {
  id: number;
  user: string;
  text: string;
  time: string;
  isMe: boolean;
  to?: string | null;
  type?: 'image' | 'file' | 'audio';
  url?: string;
}

// Mock Data
const INITIAL_MESSAGES = [
  { id: 1, user: 'أحمد حداد', text: 'السلام عليكم، شباب لا تنسون تسليم ألبوم عرس محمد اليوم.', time: '10:00 AM', isMe: false },
  { id: 2, user: 'ماي (محاسبة)', text: 'تم استلام الدفعة الثانية من العميل، الفاتورة جاهزة.', time: '10:15 AM', isMe: false },
  { id: 3, user: 'أحمد (مصور)', text: 'جاري رفع الصور للسيرفر، النت شوية بطيء اليوم 😅', time: '10:30 AM', isMe: false },
];

const INITIAL_TASKS = [
  { id: 't1', text: 'شحن بطاريات الكاميرا A7IV', assignee: 'أحمد (مصور)', targetRole: UserRole.PHOTO_EDITOR, completed: false },
  { id: 't2', text: 'تفريغ كروت الذاكرة (جلسة أمس)', assignee: 'الكل', targetRole: 'all', completed: true },
  { id: 't3', text: 'تنظيف عدسة 85mm', assignee: 'أحمد حداد', targetRole: UserRole.MANAGER, completed: false },
  { id: 't4', text: 'إرسال العقد للعميل الجديد', assignee: 'ماي', targetRole: UserRole.ADMIN, completed: false },
];

const AVAILABLE_ROLES = [
  { label: 'عام (للجميع)', value: 'all' },
  { label: 'مدير', value: UserRole.MANAGER },
  { label: 'أدمن', value: UserRole.ADMIN },
  { label: 'استقبال', value: UserRole.RECEPTION },
  { label: 'مصور', value: UserRole.PHOTO_EDITOR },
  { label: 'مونتير', value: UserRole.VIDEO_EDITOR },
  { label: 'طابعة', value: UserRole.PRINTER },
];

const SMART_SUGGESTIONS = [
  "تم الاستلام ✅",
  "جاري العمل عليها 👨‍💻",
  "عاشت الأيادي 👏",
  "أوك، تم 👍",
  "ممكن تفاصيل أكثر؟ 🤔",
  "أنا في استراحة ☕️",
  "تم الانتهاء من المهمة 🎉"
];

const EMOJI_LIST = [
  "😀", "😂", "😍", "😎", "🤔", "😅", "😭", "😡", 
  "👍", "👎", "👏", "🙌", "🤝", "💪", "🙏", "👋",
  "🎉", "🔥", "❤️", "✅", "❌", "📷", "🎥", "💻"
];

const PhotoEditorTeamChat: React.FC<PhotoEditorTeamChatProps> = ({ currentUser, users, isManager = true }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // New Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskRole, setNewTaskRole] = useState<string>('all');
  const [sidebarTab, setSidebarTab] = useState<'tasks' | 'members'>('tasks');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const selectedRoleLabel = AVAILABLE_ROLES.find(r => r.value === newTaskRole)?.label || 'الكل';

    const newTask = {
      id: Date.now().toString(),
      text: newTaskText,
      assignee: selectedRoleLabel, // Display text
      targetRole: newTaskRole, // Logic key
      completed: false
    };

    setTasks([newTask, ...tasks]);
    setNewTaskText('');
    setNewTaskRole('all');
    setIsAddingTask(false);
  };

  const activeUser = users.find(u => u.id === selectedUserId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUserId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const msg = {
      id: Date.now(),
      user: currentUser?.name || 'أنا',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      to: selectedUserId // null for group
    };
    
    setMessages([...messages, msg]);
    setNewMessage('');
    setShowEmojiPicker(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  // Filter messages: either group (to === null) or private (isMe and matching to, or not isMe and matching from)
  // For mock simulation, we'll just check if it belongs to the current "thread"
  const filteredMessages = messages.filter(msg => {
    if (!selectedUserId) return !msg.to; // Group
    return msg.to === selectedUserId || (msg.user === activeUser?.name && !msg.to); // Simplified mock logic
  });

  return (
    <ReceptionPageWrapper isManager={isManager} allowOverflow>
        <div className="flex flex-col h-full animate-in fade-in duration-300 space-y-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const messageType: Message['type'] = file.type.startsWith('image/') ? 'image' : 'file';
                const msg: Message = {
                  id: Date.now(),
                  user: currentUser?.name || 'أنا',
                  text: file.name,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isMe: true,
                  to: selectedUserId,
                  type: messageType
                };
                setMessages([...messages, msg]);
              }
            }}
          />
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-visible pt-4 px-2">
         
         {/* Main Content Area (Chat) */}
         <ReceptionWidgetCard 
            className={`flex-1 relative flex flex-col transition-all ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white/40 ring-1 ring-white/60' : !isManager ? 'border border-white/5 shadow-sm' : 'shadow-2xl'}`} 
            rounded={isManager ? 'rounded-[2.5rem]' : isManager ? 'rounded-[3rem]' : 'rounded-xl'}
            noPadding
         >
            {/* 3D Modern Top Bar */}
            <div className={`relative shrink-0 overflow-hidden ${isManager ? 'rounded-t-[2.5rem] bg-white/40 border-b border-white/20' : isManager ? 'rounded-t-[3rem]' : 'rounded-t-xl'}`}>
                {/* Background Gradient & Mesh */}
                {!isManager && <div className="absolute inset-0 bg-linear-to-r from-[#2a2d36] via-[#21242b] to-[#1a1c22]"></div>}
                {!isManager && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>}
                {!isManager && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-linear-to-r from-transparent via-white/10 to-transparent"></div>}
                
                <div className="relative z-10 flex items-center justify-between px-6 py-5">
                   <div className="flex items-center gap-4">
                      {/* 3D Icon Container */}
                      <div className={`relative group`}>
                          <div className={`absolute inset-0 rounded-xl blur-lg opacity-40 ${isManager ? 'bg-amber-400' : selectedUserId ? 'bg-pink-500' : 'bg-blue-500'}`}></div>
                          <div className={`relative p-2.5 rounded-xl border ${isManager ? 'bg-white shadow-md border-white/60 text-amber-500' : 'border-white/10 shadow-xl bg-linear-to-br'} flex items-center justify-center transition-all duration-300
                              ${!isManager ? (selectedUserId 
                                ? 'from-pink-500/20 to-pink-900/40 text-pink-500' 
                                : 'from-blue-500/20 to-blue-900/40 text-blue-500') : ''
                              } group-hover:scale-105`}>
                             {selectedUserId ? <UserIcon size={20} /> : <Hash size={20} />}
                          </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <h3 className={`text-lg font-bold ${isManager ? 'text-gray-800' : 'text-white'} tracking-wide drop-shadow-md flex items-center gap-2`}>
                           {selectedUserId ? activeUser?.name : 'غرفة الفريق العامة'}
                           {!selectedUserId && <span className={`px-1.5 py-0.5 rounded-md ${isManager ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-white/5 border border-white/10 text-gray-400'} text-[10px] font-normal`}>Global</span>}
                        </h3>
                        <p className={`text-[11px] ${isManager ? 'text-gray-500' : 'text-gray-400'} font-medium flex items-center gap-1.5`}>
                          <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isManager ? 'bg-emerald-500 text-emerald-500' : selectedUserId ? 'bg-green-500 text-green-500' : 'bg-blue-500 text-blue-500 animate-pulse'}`}></span>
                          {selectedUserId ? 'متصل الآن' : `${users.length} أعضاء نشطون`}
                        </p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      {selectedUserId && (
                          <button 
                            onClick={() => setSelectedUserId(null)}
                            className={`p-2 rounded-lg ${isManager ? 'bg-gray-100/50 text-gray-500 hover:bg-white hover:text-amber-500 border border-gray-200/50' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'} transition-all flex items-center gap-2 text-[10px] font-bold`}
                          >
                            <MessageSquare size={12} /> العودة للعامة
                          </button>
                      )}
                      <button className={`p-2 rounded-lg ${isManager ? 'bg-gray-100/50 text-gray-400 hover:text-amber-500 hover:bg-white' : 'bg-black/20 text-gray-400 hover:text-white hover:bg-white/5'} border border-transparent hover:border-white/10 transition-all`}>
                          <MoreVertical size={18} />
                      </button>
                   </div>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isManager ? 'bg-white/30' : 'bg-[#1a1c22]/50'} no-scrollbar`}>
                {filteredMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} group/msg animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`flex items-end gap-3 max-w-[85%] ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!msg.isMe && (
                                <div className="h-9 w-9 rounded-full bg-linear-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 flex items-center justify-center text-xs font-black border border-blue-500/10 shrink-0 shadow-lg group-hover/msg:scale-110 transition-transform">
                                    {msg.user.charAt(0)}
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                {!msg.isMe && !selectedUserId && (
                                  <span className="text-[10px] text-gray-500 font-black mr-1 uppercase tracking-wider">{msg.user}</span>
                                )}
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xl backdrop-blur-sm transition-all ${
                                    msg.isMe 
                                    ? (isManager ? 'bg-amber-500 text-white rounded-tr-none shadow-amber-500/20' : 'bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none') 
                                    : (isManager ? 'bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-sm' : 'bg-[#18181b] text-gray-200 rounded-tl-none border border-white/5 hover:border-white/10')
                                }`}>
                                    {msg.type === 'image' ? (
                                        <div className="space-y-2 max-w-[280px]">
                                            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl group/img relative">
                                                <img src={msg.url || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=400"} alt="Media" className="w-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Download size={20} className="text-white" />
                                                </div>
                                            </div>
                                            {msg.text && <p className="text-sm font-medium">{msg.text}</p>}
                                        </div>
                                    ) : msg.type === 'audio' ? (
                                        <div className="flex items-center gap-3 min-w-[220px] py-1">
                                            <button className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${msg.isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'}`}>
                                                <Play size={18} fill="currentColor" />
                                            </button>
                                            <div className="flex-1 space-y-1.5">
                                                <div className="flex gap-0.5 h-7 items-center">
                                                    {[...Array(18)].map((_, i) => (
                                                        <div key={i} className={`flex-1 rounded-full ${msg.isMe ? 'bg-white/40' : 'bg-blue-500/40'}`} style={{ height: `${20 + Math.random() * 80}%` }} />
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold opacity-70 italic">
                                                    <span>0:14</span>
                                                    <Music size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    ) : msg.type === 'file' ? (
                                        <div className={`flex items-center gap-4 p-3 rounded-xl border min-w-[240px] ${msg.isMe ? 'bg-black/20 border-white/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${msg.isMe ? 'bg-white/10 text-white' : 'bg-blue-500/20 text-blue-400'}`}>
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black truncate">{msg.text}</p>
                                                <p className="text-[10px] opacity-60 font-mono">2.4 MB • PDF</p>
                                            </div>
                                            <a 
                                                href="#" 
                                                className={`p-2 rounded-lg transition-all ${msg.isMe ? 'hover:bg-white/10 text-white' : 'hover:bg-blue-500/20 text-blue-400'}`}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  alert('جاري التحميل...');
                                                }}
                                            >
                                                <Download size={18} />
                                            </a>
                                        </div>
                                    ) : (
                                      msg.text
                                    )}
                                </div>
                                <span className={`text-[9px] text-gray-600 font-mono mt-0.5 ${msg.isMe ? 'text-left ml-1' : 'text-right mr-1'}`}>{msg.time}</span>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Smart Suggestions Bar */}
            <div className={`px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t ${isManager ? 'border-gray-100 bg-white/40' : 'border-white/5 bg-[#21242b]'}`}>
                <div className="flex items-center gap-1 text-pink-500 shrink-0 opacity-70">
                    <Sparkles size={12} />
                    <span className="text-[9px] font-bold">اقتراحات:</span>
                </div>
                {SMART_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                        key={idx}
                        onClick={() => setNewMessage(suggestion)}
                        className={`shrink-0 px-3 py-1.5 rounded-full ${isManager ? 'bg-white border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200' : 'bg-[#2a2d36] border border-white/10 text-gray-400 hover:bg-pink-500 hover:text-white hover:border-pink-500/50'} border text-[10px] transition-all whitespace-nowrap`}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>

             {/* Input Area */}
             <div className={`p-4 border-t ${isManager ? 'border-gray-100 bg-white/60' : 'border-white/5 bg-[#1a1c22]'} rounded-b-[2rem]`}>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="relative">
                    <textarea 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={selectedUserId ? `أرسل رسالة خاصة إلى ${activeUser?.name}...` : "اكتب رسالتك في الغرفة العامة..."} 
                      rows={1}
                      className={`w-full ${isManager ? 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200' : 'bg-black/20 border-white/10 text-white focus:border-pink-500'} border rounded-2xl px-4 py-3 outline-none transition-all text-sm shadow-inner min-h-[48px] resize-none`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-2.5 rounded-xl transition-all ${showEmojiPicker ? (isManager ? 'bg-amber-500 text-white shadow-lg' : 'bg-pink-500 text-white shadow-lg') : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'}`}
                          title="إيموجي"
                        >
                          <Smile size={22} />
                        </button>

                        <AnimatePresence>
                          {showEmojiPicker && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full right-0 mb-4 p-3 bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl grid grid-cols-6 gap-2 z-50 w-72 max-w-[90vw] cursor-default"
                              onClick={(e) => e.stopPropagation()}
                            >
                               {EMOJI_LIST.map((emoji) => (
                                 <button
                                   key={emoji}
                                   type="button"
                                   onClick={() => {
                                     addEmoji(emoji);
                                     setShowEmojiPicker(false);
                                   }}
                                   className="p-2 hover:bg-white/10 rounded-lg text-xl transition-colors flex items-center justify-center"
                                 >
                                   {emoji}
                                 </button>
                               ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <button 
                        type="button"
                        onClick={() => {
                          const msg: Message = {
                            id: Date.now(),
                            user: currentUser?.name || 'أنا',
                            text: '',
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            isMe: true,
                            to: selectedUserId,
                            type: 'audio'
                          };
                          setMessages([...messages, msg]);
                        }}
                        className="p-2.5 text-gray-400 hover:text-pink-500 hover:bg-pink-500/5 rounded-xl transition-all"
                        title="بصمة صوتية"
                      >
                        <Mic size={22} />
                      </button>

                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all rotate-[45deg]"
                        title="إرفاق ملف أو صورة"
                      >
                        <Paperclip size={22} />
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${newMessage.trim() ? (isManager ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95' : 'bg-pink-600 text-white shadow-lg active:scale-95') : (isManager ? 'bg-gray-100 text-gray-400' : 'bg-white/5 text-gray-600')}`}
                    >
                      <span>إرسال</span>
                      <Send size={16} />
                    </button>
                  </div>
                </form>
             </div>
         </ReceptionWidgetCard>

         {/* Sidebar Area - Unified Widget with Tabs */}
          <div className="w-full lg:w-80">
               <ReceptionWidgetCard 
                 rounded={isManager ? 'rounded-[2.5rem]' : isManager ? 'rounded-[2.5rem]' : 'rounded-xl'}
                 className={`flex flex-col h-full !overflow-visible ${isManager ? 'bg-white/60 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white/40 ring-1 ring-white/60' : ''}`}
                 noPadding
              >
                  {/* Tabs Header */}
                  <div className={`flex border-b shrink-0 ${isManager ? 'bg-white/40 border-gray-100' : 'bg-linear-to-r from-[#22242b] to-[#1e1e24] border-white/5'}`}>
                      <button
                          onClick={() => setSidebarTab('tasks')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all duration-300 relative ${
                              sidebarTab === 'tasks'
                              ? (isManager 
                                  ? 'text-amber-600 font-bold' 
                                  : 'text-orange-400 font-bold')
                              : (isManager ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300')
                          }`}
                      >
                          <CheckSquare size={18} />
                          <span className="text-sm">المهام</span>
                          {sidebarTab === 'tasks' && (
                              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isManager ? 'bg-amber-500' : 'bg-orange-500'}`} />
                          )}
                      </button>
                      <button
                          onClick={() => setSidebarTab('members')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all duration-300 relative ${
                              sidebarTab === 'members'
                              ? (isManager 
                                  ? 'text-amber-600 font-bold' 
                                  : 'text-blue-400 font-bold')
                              : (isManager ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300')
                          }`}
                      >
                          <Users size={18} />
                          <span className="text-sm">الأعضاء</span>
                          {sidebarTab === 'members' && (
                              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isManager ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          )}
                      </button>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      <AnimatePresence mode="wait">
                          {sidebarTab === 'tasks' ? (
                              <motion.div
                                  key="tasks"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-1 flex flex-col min-h-0"
                              >
                                  {/* Tasks Header */}
                                  <div className={`p-5 border-b relative shadow-sm ${isManager ? 'bg-white/40 border-gray-100' : 'bg-linear-to-r from-[#22242b] to-[#1e1e24] border-white/5'}`}>
                                      <div className="flex items-center justify-between relative z-10">
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-xl ${isManager ? 'bg-amber-50 border border-amber-100' : 'bg-linear-to-br from-orange-500/20 to-red-500/20 border border-white/10'} shadow-inner`}>
                                                  <CheckSquare size={16} className={isManager ? "text-amber-500" : "text-orange-300"} />
                                              </div>
                                              <div>
                                                  <h3 className={`text-base font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}>المهام السريعة</h3>
                                                  <p className="text-[10px] text-gray-400">Todo List</p>
                                              </div>
                                          </div>
                                          {currentUser?.role !== UserRole.RECEPTION && (
                                              <div className="relative">
                                                  <button 
                                                      onClick={() => setIsAddingTask(!isAddingTask)}
                                                      className={`p-2 rounded-lg border border-transparent hover:border-white/10 transition-all shadow-sm active:scale-95 ${isAddingTask ? (isManager ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-orange-500 text-white shadow-orange-500/20') : (isManager ? 'bg-gray-100 text-amber-500 hover:bg-white' : 'bg-black/20 hover:bg-white/5 text-orange-400')}`}
                                                  >
                                                      <Plus size={16} className={`transition-transform duration-300 ${isAddingTask ? 'rotate-45' : ''}`} />
                                                  </button>

                                                  {/* Dropdown for adding task */}
                                                  <AnimatePresence>
                                                      {isAddingTask && (
                                                          <motion.div
                                                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                              animate={{ opacity: 1, scale: 1, y: 0 }}
                                                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                              className="absolute top-full left-0 mt-2 w-64 p-3 bg-[#2a2d36] rounded-xl border border-white/10 shadow-2xl z-100 origin-top-left"
                                                          >
                                                              <form onSubmit={handleAddTask} className="space-y-3">
                                                                  <div>
                                                                      <label className="text-[10px] text-gray-400 font-bold mb-1 block">مهمة جديدة</label>
                                                                      <input 
                                                                          autoFocus
                                                                          type="text" 
                                                                          value={newTaskText}
                                                                          onChange={(e) => setNewTaskText(e.target.value)}
                                                                          placeholder="أدخل عنوان المهمة..."
                                                                          className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 outline-none transition-all placeholder:text-gray-600 shadow-inner"
                                                                      />
                                                                  </div>
                                                                  
                                                                  <div>
                                                                      <label className="text-[10px] text-gray-400 font-bold mb-1 block">تعيين إلى</label>
                                                                      <div className="grid grid-cols-2 gap-1.5">
                                                                          {AVAILABLE_ROLES.map(role => (
                                                                              <button
                                                                                  key={role.value}
                                                                                  type="button"
                                                                                  onClick={() => setNewTaskRole(role.value)}
                                                                                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all text-center
                                                                                      ${newTaskRole === role.value 
                                                                                          ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' 
                                                                                          : 'bg-[#18181b] text-gray-300 hover:bg-[#202025] border border-white/5'
                                                                                      }`}
                                                                              >
                                                                                  {role.label}
                                                                              </button>
                                                                          ))}
                                                                      </div>
                                                                  </div>

                                                                  <button 
                                                                      type="submit"
                                                                      disabled={!newTaskText.trim()} 
                                                                      className="w-full py-2 bg-linear-to-r from-orange-600 to-red-600 text-white rounded-lg text-xs font-bold shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                  >
                                                                      إضافة المهمة
                                                                  </button>
                                                              </form>
                                                          </motion.div>
                                                      )}
                                                  </AnimatePresence>
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  {/* Tasks List */}
                                  <div className="flex-1 space-y-3 p-4 overflow-y-auto custom-scrollbar">
                                      {tasks
                                          .filter(task => {
                                              if (!task.targetRole || task.targetRole === 'all') return true;
                                              return task.targetRole === currentUser?.role;
                                          })
                                          .map(task => (
                                              <div 
                                                  key={task.id} 
                                                  onClick={() => toggleTask(task.id)}
                                                  className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-300 relative group overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-0.5 border border-white/5
                                                      ${task.completed 
                                                      ? (isManager ? 'bg-emerald-50 opacity-60' : 'bg-linear-to-br from-green-900/10 to-emerald-900/20 opacity-70') 
                                                          : (isManager ? 'bg-white hover:bg-amber-50/50 hover:border-amber-200' : 'bg-linear-to-br from-[#2a2d36] to-[#21242b] hover:from-blue-900/20 hover:to-purple-900/20 hover:border-blue-500/30')
                                                      }
                                                  `}
                                              >
                                                  {/* Distinctive Glow for incomplete tasks */}
                                                  {!task.completed && <div className={`absolute inset-0 ${isManager ? 'bg-amber-400/5' : 'bg-blue-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}></div>}
                                                  
                                                  {/* 3D Checkbox */}
                                                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner relative z-10
                                                      ${task.completed 
                                                          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' 
                                                          : (isManager ? 'bg-white border border-gray-200 group-hover:border-amber-400 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-black/40 border border-white/10 group-hover:border-blue-500/50 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]')
                                                      }
                                                  `}>
                                                      {task.completed && <CheckCircle2 size={16} className="text-green-400 drop-shadow-[0_0_5px_currentColor]" />}
                                                  </div>
                                                  
                                                  <div className="flex-1 min-w-0 z-10">
                                                      <p className={`text-xs font-bold truncate transition-all ${task.completed ? 'text-gray-500 line-through' : (isManager ? 'text-gray-800 group-hover:text-amber-700' : 'text-gray-100 group-hover:text-blue-200')}`}>{task.text}</p>
                                                      <div className="flex items-center gap-2 mt-1">
                                                          <span className={`text-[9px] px-2 py-0.5 rounded-full ${task.completed ? (isManager ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-600') : (isManager ? 'bg-gray-50 border border-gray-200 text-gray-500 group-hover:text-amber-600 group-hover:border-amber-200' : 'bg-black/30 text-gray-400 border border-white/5 shadow-sm group-hover:border-blue-500/20 group-hover:text-blue-300')}`}>
                                                              {task.assignee}
                                                          </span>
                                                      </div>
                                                  </div>
                                              </div>
                                          ))}
                                  </div>
                              </motion.div>
                          ) : (
                              <motion.div
                                  key="members"
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-1 flex flex-col min-h-0"
                              >
                                  {/* Members Header */}
                                  <div className={`p-5 border-b shrink-0 ${isManager ? 'bg-white/40 border-gray-100' : 'bg-linear-to-r from-[#22242b] to-[#1e1e24] border-white/5'}`}>
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-xl ${isManager ? 'bg-amber-50 border border-amber-100' : 'bg-linear-to-br from-blue-500/20 to-purple-500/20 border border-white/10'} shadow-inner`}>
                                                  <Users size={16} className={isManager ? "text-amber-500" : "text-blue-300"} />
                                              </div>
                                              <div>
                                                  <h3 className={`text-base font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}>الأعضاء</h3>
                                                  <p className="text-[10px] text-gray-400">Team Members</p>
                                              </div>
                                          </div>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isManager ? 'bg-amber-100 text-amber-600' : 'bg-white/10 text-gray-300'}`}>
                                              {users.length}
                                          </span>
                                      </div>
                                  </div>

                                  {/* Users List */}
                                  <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                      {/* Global Room Item */}
                                      <button
                                          onClick={() => setSelectedUserId(null)}
                                          className={`w-full p-2 rounded-xl flex items-center gap-3 transition-all duration-300 border ${
                                              selectedUserId === null 
                                              ? (isManager ? 'bg-amber-50 border-amber-200 shadow-md' : 'bg-linear-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30') 
                                              : (isManager ? 'bg-white border-transparent hover:bg-gray-50' : 'bg-transparent border-transparent hover:bg-white/5')
                                          }`}
                                      >
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                              selectedUserId === null ? 'bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg' : 'bg-gray-700/50 text-gray-400'
                                          }`}>
                                              <Hash size={20} />
                                          </div>
                                          <div className="flex-1 text-right">
                                              <p className={`text-sm font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}>الغرفة العامة</p>
                                              <p className="text-[10px] text-gray-400">Join the discussion</p>
                                          </div>
                                      </button>

                                      <div className={`h-px w-full my-2 ${isManager ? 'bg-gray-200' : 'bg-white/5'}`}></div>
                                      
                                      {/* Individual Users */}
                                      {(users || []).filter(u => u.id !== currentUser?.id).map(user => (
                                          <button
                                              key={user.id}
                                              onClick={() => setSelectedUserId(user.id)}
                                              className={`w-full p-2 rounded-xl flex items-center gap-3 transition-all duration-300 border group ${
                                                  selectedUserId === user.id 
                                                  ? (isManager ? 'bg-amber-50 border-amber-200 shadow-md' : 'bg-linear-to-r from-pink-600/20 to-rose-600/20 border-pink-500/30') 
                                                  : (isManager ? 'bg-white border-transparent hover:bg-gray-50' : 'bg-transparent border-transparent hover:bg-white/5')
                                              }`}
                                          >
                                              <div className="relative">
                                                  {user.avatar && (user.avatar.startsWith('bg-') || user.avatar.includes('gradient')) ? (
                                                      <div className={`w-10 h-10 rounded-full ${user.avatar} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                                                          {user.name.charAt(0)}
                                                      </div>
                                                  ) : (
                                                      <img src={user.avatar || 'https://i.pravatar.cc/150'} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                                  )}
                                                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1c22] bg-emerald-500 shadow-sm"></div>
                                              </div>
                                              
                                              <div className="flex-1 text-right min-w-0">
                                                  <div className="flex justify-between items-center mb-0.5">
                                                      <p className={`text-sm font-bold truncate ${isManager ? 'text-gray-800' : 'text-gray-200 group-hover:text-white'}`}>{user.name}</p>
                                                      {/* Last message time mock */}
                                                      <span className="text-[9px] text-gray-500 hidden group-hover:block">10:30m</span>
                                                  </div>
                                                  <p className="text-[10px] text-gray-500 truncate text-right flex items-center gap-1">
                                                      <span className={`w-1.5 h-1.5 rounded-full ${isManager ? 'bg-amber-400' : 'bg-pink-500'}`}></span>
                                                      {AVAILABLE_ROLES.find(r => r.value === user.role)?.label || user.role}
                                                  </p>
                                              </div>
                                          </button>
                                      ))}
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
              </ReceptionWidgetCard>
          </div>
       </div>
        </div>
    </ReceptionPageWrapper>
  );
};

export default PhotoEditorTeamChat;
