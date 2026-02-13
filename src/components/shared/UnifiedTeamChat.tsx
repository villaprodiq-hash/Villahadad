import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { 
  MessageSquare, CheckSquare, Send, User as UserIcon, 
  MoreVertical, CheckCircle2, Plus, Hash, Sparkles, Smile,
  Mic, FileText, Download, Play, Music, Paperclip, Users, Trash2, Edit2, X, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReceptionPageWrapper from '../reception/layout/ReceptionPageWrapper';
import ReceptionWidgetCard from '../reception/dashboard/ReceptionWidgetCard';
import { taskService, ChatTask } from '../../services/db/services/TaskService';
import { chatService, ChatMessage } from '../../services/db/services/ChatService';
import { presenceService } from '../../services/db/services/PresenceService';

interface UnifiedTeamChatProps {
  currentUser?: User;
  users: User[];
  isManager?: boolean; 
  isDesigner?: boolean; 
  isSelection?: boolean;
}

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

const UnifiedTeamChat: React.FC<UnifiedTeamChatProps> = ({ currentUser, users = [] }) => {
  // Role Detection
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;
  const isDesigner = currentUser?.role === UserRole.PHOTO_EDITOR || currentUser?.role === UserRole.VIDEO_EDITOR;
  const isSelection = false; // Selection role uses dark theme like default
  const isReception = currentUser?.role === UserRole.RECEPTION;

  const getAssignableRoles = () => {
    if (!currentUser) return AVAILABLE_ROLES;
    
    // Supervisor (Admin) cannot assign to Manager AND cannot assign to Self (Admin)
    if (currentUser.role === UserRole.ADMIN) {
        return AVAILABLE_ROLES.filter(r => r.value !== UserRole.MANAGER && r.value !== UserRole.ADMIN);
    }
    
    // Manager cannot assign to Manager (Self)
    if (currentUser.role === UserRole.MANAGER) {
         return AVAILABLE_ROLES.filter(r => r.value !== UserRole.MANAGER);
    }

    return AVAILABLE_ROLES;
  };

  // -- STATE --
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tasks, setTasks] = useState<ChatTask[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  // -- REFS --
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- EFFECTS --
  useEffect(() => {
    // 1. Subscribe to Offline Presence
    const unsubPresence = presenceService.subscribe((users) => {
        setOnlineUsers(users);
    });

    // 2. Subscribe to Realtime Chat
    const unsubChat = chatService.subscribe((msg) => {
        // DEDUPLICATION LOGIC:
        // Ensure we don't already have a message with this content + sender recently (e.g. from optimistic update)
        // Or if we do, update the temp ID with the real ID.
        setMessages(prev => {
            // Check if this message ID already exists
            if (prev.some(m => m.id === msg.id)) return prev;

            // Check if we have an OPTIMISTIC message (temp ID) that matches this content/sender/recipient
            // If so, replace it.
            const optimisticIndex = prev.findIndex(m => 
                m.senderId === msg.senderId && 
                m.content === msg.content && 
                m.recipientId === msg.recipientId &&
                (Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000) // Within 5s window
            );

            if (optimisticIndex !== -1) {
                const newMessages = [...prev];
                newMessages[optimisticIndex] = msg; // Replace optimistic with real
                return newMessages;
            }

            return [...prev, msg];
        });
    });

    // 3. Load initial history
    chatService.getRecentMessages().then(data => {
        setMessages(data);
    });

    // 4. Tasks Subscription & Fetch
    taskService.getTasks().then(setTasks);
    const unsubTasks = taskService.subscribe((payload) => {
        console.log('Task update:', payload);
        taskService.getTasks().then(setTasks); // Simple refresh strategy
    });

    return () => {
        unsubPresence();
        unsubChat();
        unsubTasks();
    };
  }, []);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskRole, setNewTaskRole] = useState<string>('all');
  const [sidebarTab, setSidebarTab] = useState<'tasks' | 'members'>('tasks');
  
  // Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
      // Optimistic update
      setTasks(tasks.filter(t => t.id !== taskId));
      await taskService.deleteTask(taskId);
    }
  };

  const handleStartEdit = (task: ChatTask) => { // Use proper type
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editingTaskText.trim()) return;
    
    // Optimistic
    setTasks(tasks.map(t => t.id === taskId ? { ...t, text: editingTaskText } : t));
    setEditingTaskId(null);
    setEditingTaskText('');
    
    await taskService.updateTask(taskId, editingTaskText);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const selectedRoleLabel = AVAILABLE_ROLES.find(r => r.value === newTaskRole)?.label || 'الكل';
    
    // Creating temp optimistic
    const tempId = Date.now().toString();
    const newTaskOpt: ChatTask = {
        id: tempId,
        text: newTaskText,
        assignee: selectedRoleLabel,
        targetRole: newTaskRole,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    setTasks([newTaskOpt, ...tasks]);
    setNewTaskText('');
    setNewTaskRole('all');
    setIsAddingTask(false);

    try {
        await taskService.addTask(newTaskText, selectedRoleLabel, newTaskRole, currentUser?.id);
        // Note: The subscription will naturally refresh the list with the real ID
    } catch (e) {
        console.error("Failed to add task", e);
    }
  };

  const activeUser = users.find(u => u.id === selectedUserId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    try {
      // Optimistic update
      const tempId = Date.now().toString();
      const optimisticMsg: ChatMessage = {
        id: tempId,
        content: newMessage,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        recipientId: selectedUserId || null,
        type: 'text',
        createdAt: new Date().toISOString(),
        isRead: false
      };
      
      setMessages([...messages, optimisticMsg]);
      setNewMessage('');
      setShowEmojiPicker(false);

      // Actual send
      await chatService.sendMessage(optimisticMsg.content, currentUser, selectedUserId);
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Handle error (remove optimistic message or show error)
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    // Optimistic
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    await taskService.toggleTask(id, !task.completed, currentUser?.id);
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  // Filter messages: either group (to === null) or private (isMe and matching to, or not isMe and matching from)
  // For mock simulation, we'll just check if it belongs to the current "thread"
  // Filter messages: either group (recipientId is null) or private (match selectedUserId)
  const filteredMessages = messages.filter(msg => {
    if (!selectedUserId) return !msg.recipientId; // Group chat
    // Private chat: Strict check for (Me -> Them) OR (Them -> Me)
    return (msg.senderId === currentUser?.id && msg.recipientId === selectedUserId) || 
           (msg.senderId === selectedUserId && msg.recipientId === currentUser?.id);
  });

  return (
    <ReceptionPageWrapper isReception={isReception} allowOverflow hideBackground={isManager || isSelection} noPadding={true}>
        <div className="flex flex-col h-full animate-in fade-in duration-300">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && currentUser) {
                // TODO: Implement actual file upload via separate service if needed
                // For now, handling as text message with file name
                const tempId = Date.now().toString();
                 const optimisticMsg: ChatMessage = {
                  id: tempId,
                  content: `📎 ${file.name}`, // Placeholder for file content
                  senderId: currentUser.id,
                  senderName: currentUser.name,
                  senderRole: currentUser.role,
                  recipientId: selectedUserId || null,
                  type: file.type.startsWith('image/') ? 'image' : 'file',
                  createdAt: new Date().toISOString(),
                  isRead: false
                };
                setMessages([...messages, optimisticMsg]);
                await chatService.sendMessage(optimisticMsg.content, currentUser, selectedUserId, optimisticMsg.type);
              }
            }}
          />
      <div className={`flex-1 flex flex-col lg:flex-row min-h-0 overflow-visible ${isSelection ? 'gap-6' : 'gap-4'}`}>
         
         {/* Main Content Area (Chat) */}
         <ReceptionWidgetCard 
            className={`flex-1 relative flex flex-col transition-all overflow-hidden ${
              isManager 
                ? 'bg-white dark:bg-[#1a1c22] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-white/5' 
                : isAdmin 
                  ? 'bg-[#14161c]/60 backdrop-blur-xl shadow-inner border border-white/5'
                  : isDesigner
                    ? 'bg-[#1E1E1E] border border-[#3E3E42] shadow-none' // Premiere Pro Panel
                    : isSelection
                      ? 'bg-white shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-gray-100' // Kivi Light
                      : isReception
                        ? 'shadow-2xl border-none' // Reception: No border, high shadow
                        : 'shadow-2xl'
            }`} 
            rounded={isManager ? 'rounded-[2.5rem]' : isDesigner ? 'rounded-sm' : isSelection ? 'rounded-[30px]' : isReception ? 'rounded-[3rem]' : 'rounded-4xl'}
            noPadding
         >
            {/* Top Bar */}
             <div className={`relative shrink-0 overflow-hidden ${
              isManager 
                ? 'rounded-t-[2.5rem] bg-white/40 dark:bg-white/5 border-b border-white/20 dark:border-white/5' 
                : isAdmin
                  ? 'rounded-t-4xl bg-white/5 border-b border-white/5'
                  : isDesigner 
                    ? 'bg-[#252526] border-b border-[#3E3E42]' 
                    : isSelection
                      ? 'rounded-t-[30px] bg-white border-b border-gray-100 shadow-sm'
                      : isReception
                        ? 'rounded-t-[3rem]'
                        : 'rounded-t-xl'
            }`}>
                {/* Background Gradient & Mesh */}
                {!isManager && !isDesigner && !isSelection && <div className="absolute inset-0 bg-linear-to-r from-[#2a2d36] via-[#21242b] to-[#1a1c22]"></div>}
                {!isManager && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>}
                
                <div className={`relative z-10 flex items-center justify-between ${isDesigner ? 'px-3 py-2' : 'px-6 py-5'}`}>
                   <div className="flex items-center gap-3">
                      {/* Icon Container */}
                      <div className={`relative group ${isDesigner ? 'hidden' : ''}`}>
                          <div className={`absolute inset-0 rounded-xl blur-lg opacity-40 ${
                            isManager 
                              ? 'bg-amber-400'                                : isAdmin
                                ? 'bg-[#ff6d00]'
                              : isDesigner ? 'bg-blue-600' 
                              : isSelection ? 'bg-pink-400'
                              : (selectedUserId ? 'bg-pink-500' : 'bg-blue-500')
                          }`}></div>
                          <div className={`relative p-2.5 rounded-xl border ${
                            isManager 
                              ? 'bg-white shadow-md border-white/60 text-amber-500' 
                              : isAdmin
                                ? 'bg-[#ff6d00]/10 border-[#ff6d00]/20 text-[#ff6d00] shadow-[0_0_15px_rgba(255,109,0,0.2)]'
                                : isDesigner
                                  ? 'bg-[#3E3E42] text-gray-300'
                                  : isSelection
                                    ? 'bg-pink-50 border-pink-100 border text-pink-500 shadow-sm'
                                    : 'border-white/10 shadow-xl bg-linear-to-br'
                          } flex items-center justify-center transition-all duration-300
                              ${!isManager && !isAdmin && !isDesigner && !isSelection ? (selectedUserId 
                                ? 'from-pink-500/20 to-pink-900/40 text-pink-500' 
                                : 'from-blue-500/20 to-blue-900/40 text-blue-500') : ''
                              } group-hover:scale-105`}>
                             {selectedUserId ? <UserIcon size={20} /> : <Hash size={20} />}
                          </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <h3 className={`text-lg font-bold ${isManager ? 'text-gray-800 dark:text-white' : isDesigner ? 'text-[#D4D4D4] text-sm' : isSelection ? 'text-gray-800' : 'text-white'} tracking-normal flex items-center gap-2`}>
                           {isDesigner && <span className="text-blue-500 font-black">#</span>}
                           {selectedUserId ? activeUser?.name : 'Team Chat'}
                           {!selectedUserId && <span className={`px-1 rounded-sm ${
                              isManager 
                                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-500' 
                                : isAdmin
                                  ? 'bg-[#ff6d00]/10 border border-[#ff6d00]/30 text-[#ff6d00]'
                                  : isDesigner
                                    ? 'bg-[#3E3E42] text-[#AAAAAA] text-[10px]'
                                    : isSelection
                                      ? 'bg-rose-50 border border-rad-100 text-rose-500'
                                      : 'bg-white/5 border border-white/10 text-gray-400'
                            } text-[10px] font-normal`}>All</span>}
                        </h3>
                        {!isDesigner && (
                            <p className={`text-[11px] ${isManager || isSelection ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'} font-medium flex items-center gap-1.5`}>
                              <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isManager ? 'bg-emerald-500 text-emerald-500' : isSelection ? 'bg-pink-500 text-pink-500' : selectedUserId ? 'bg-green-500 text-green-500' : 'bg-blue-500 text-blue-500 animate-pulse'}`}></span>
                              {selectedUserId ? 'متصل الآن' : `${onlineUsers.length > 0 ? onlineUsers.length : 1} متصل الآن`}
                            </p>
                        )}
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      {selectedUserId && (
                          <button 
                            onClick={() => setSelectedUserId(null)}
                            className={`p-2 rounded-lg ${isManager || isSelection ? 'bg-gray-100/50 text-gray-500 hover:bg-white hover:text-amber-500 border border-gray-200/50' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'} transition-all flex items-center gap-2 text-[10px] font-bold`}
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

            <div className={`flex-1 overflow-y-auto ${isDesigner ? 'p-2 space-y-2' : 'p-4 space-y-4'} ${isSelection ? '[&::-webkit-scrollbar]:hidden -ms-overflow-style-none scrollbar-width-none' : 'custom-scrollbar'} ${
              isManager 
                ? 'bg-white/30 dark:bg-black/20' 
                : isAdmin
                  ? 'bg-transparent' // Transparent for Admin
                  : isDesigner
                    ? 'bg-[#1E1E1E]'
                    : isSelection
                      ? 'bg-gray-50/50'
                      : 'bg-[#1a1c22]/50'
              }`}>
                {filteredMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;
                  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {/* Sender Name (Group Only) */}
                            {!selectedUserId && !isMe && (
                                <span className={`text-[10px] font-bold mb-1 px-1 ${
                                    isManager ? 'text-gray-500 dark:text-gray-400' : isSelection ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                    {msg.senderName} 
                                    <span className="opacity-50 font-normal mx-1">({msg.senderRole})</span>
                                </span>
                            )}

                            <div className="flex items-end gap-2">
                                {/* Avatar for others */}
                                {!isMe && (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ${
                                        isManager ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-pink-500 text-white'
                                    }`}>
                                        {msg.senderName.charAt(0)}
                                    </div>
                                )}

                                <div className={`px-4 py-2.5 shadow-sm backdrop-blur-md transition-all duration-300 ${
                                    isMe 
                                    ? (isManager 
                                        ? 'bg-amber-500 text-white rounded-[20px] rounded-tr-none shadow-amber-500/20' 
                                        : isAdmin
                                          ? 'bg-linear-to-br from-[#ff6d00] to-primary-dark text-white rounded-[20px] rounded-tr-none shadow-lg shadow-[#ff6d00]/20'
                                          : isDesigner
                                            ? 'bg-[#3577EF] text-white rounded-sm' // Premiere Blue
                                            : isSelection
                                              ? 'bg-pink-500 text-white rounded-[20px] rounded-tr-none shadow-lg shadow-pink-500/20'
                                              : isReception
                                                ? 'bg-pink-600 text-white rounded-4xl rounded-tr-none' 
                                                : 'bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-[20px] rounded-tr-none') 
                                    : (isManager 
                                        ? 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-[20px] rounded-tl-none shadow-sm' 
                                        : isAdmin
                                          ? 'bg-background-subtle text-gray-200 border border-white/5 rounded-[20px] rounded-tl-none shadow-sm'
                                          : isDesigner
                                            ? 'bg-[#333333] text-[#CCCCCC] rounded-sm' // Dark Gray Message
                                            : isSelection
                                              ? 'bg-gray-50 text-gray-700 border border-gray-100 rounded-[20px] rounded-tl-none shadow-sm'
                                              : isReception
                                                ? 'bg-[#2a2d36] text-white rounded-4xl rounded-tl-none'
                                              : 'bg-[#18181b] text-gray-200 rounded-[20px] rounded-tl-none border border-white/5 hover:border-white/10')
                                }`}>
                                    {msg.type === 'image' ? (
                                        <div className="space-y-2 max-w-[280px]">
                                            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl group/img relative">
                                                <img src={msg.content || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=400"} alt="Media" className="w-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Download size={20} className="text-white" />
                                                </div>
                                            </div>
                                            {msg.content && !msg.content.startsWith('http') && <p className="text-sm font-medium">{msg.content}</p>}
                                        </div>
                                    ) : msg.type === 'audio' ? (
                                        <div className="flex items-center gap-3 min-w-[220px] py-1">
                                            <button className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'}`}>
                                                <Play size={18} fill="currentColor" />
                                            </button>
                                            <div className="flex-1 space-y-1.5">
                                                <div className="flex gap-0.5 h-7 items-center">
                                                    {[...Array(18)].map((_, i) => (
                                                        <div key={i} className={`flex-1 rounded-full ${isMe ? 'bg-white/40' : 'bg-blue-500/40'}`} style={{ height: `${20 + Math.random() * 80}%` }} />
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold opacity-70 italic">
                                                    <span>0:14</span>
                                                    <Music size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    ) : msg.type === 'file' ? (
                                        <div className={`flex items-center gap-4 p-3 rounded-xl border min-w-[240px] ${isMe ? 'bg-black/20 border-white/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${isMe ? 'bg-white/10 text-white' : 'bg-blue-500/20 text-blue-400'}`}>
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black truncate">{msg.content}</p>
                                                <p className="text-[10px] opacity-60 font-mono">2.4 MB • PDF</p>
                                            </div>
                                            <a 
                                                href="#" 
                                                className={`p-2 rounded-lg transition-all ${isMe ? 'hover:bg-white/10 text-white' : 'hover:bg-blue-500/20 text-blue-400'}`}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  alert('جاري التحميل...');
                                                }}
                                            >
                                                <Download size={18} />
                                            </a>
                                        </div>
                                    ) : (
                                      msg.content
                                    )}
                                </div>
                                <span className={`text-[9px] text-gray-600 font-mono mt-0.5 ${isMe ? 'text-left ml-1' : 'text-right mr-1'}`}>{time}</span>
                            </div>
                        </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Smart Suggestions Bar */}
            <div className={`px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t ${
              isManager 
                ? 'border-gray-100 dark:border-white/5 bg-white/40 dark:bg-[#1a1c22]' 
                : isAdmin
                  ? 'border-white/5 bg-[#14161c]/30'
                  : isDesigner
                    ? 'border-[#3E3E42] bg-[#252526]'
                    : isSelection
                      ? 'border-gray-100 bg-white'
                      : 'border-white/5 bg-[#21242b]'
              }`}>
                <div className="flex items-center gap-1 text-pink-500 shrink-0 opacity-70">
                    <Sparkles size={12} />
                    <span className="text-[9px] font-bold">اقتراحات:</span>
                </div>
                {SMART_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                        key={idx}
                        onClick={() => setNewMessage(suggestion)}
                        className={`shrink-0 px-3 py-1.5 rounded-full ${
                          isManager 
                            ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-500 hover:border-amber-200 dark:hover:border-amber-500/20' 
                            : isAdmin
                              ? 'bg-background-subtle border-white/10 text-gray-400 hover:bg-[#ff6d00]/10 hover:text-[#ff6d00] hover:border-[#ff6d00]/30'
                              : isDesigner
                                ? 'bg-[#333333] border-[#3E3E42] text-[#CCCCCC] hover:bg-[#3E3E42] rounded-md'
                                : isSelection
                                  ? 'bg-white/60 border-white/40 text-gray-600 hover:bg-white hover:text-pink-600'
                              : 'bg-[#2a2d36] border border-white/10 text-gray-400 hover:bg-pink-500 hover:text-white hover:border-pink-500/50'
                          } border text-[10px] transition-all whitespace-nowrap`}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>

             {/* Input Area */}
             <div className={`p-3 border-t ${
                isManager 
                  ? 'border-gray-100 dark:border-white/5 bg-white/60 dark:bg-[#1a1c22]' 
                  : isAdmin
                    ? 'border-white/5 bg-[#14161c]/60'
                    : isDesigner
                      ? 'border-[#3E3E42] bg-[#252526]'
                      : isSelection
                        ? 'border-gray-100 bg-white'
                      : 'border-white/5 bg-[#1a1c22]'
                } ${isDesigner ? 'rounded-none' : isSelection ? 'rounded-b-[30px]' : 'rounded-b-4xl'}`}>
                <form onSubmit={handleSendMessage} className="space-y-4">
                    <div className="relative">
                    <textarea 
                      data-testid="chat-input"
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
                      className={`w-full ${
                        isManager 
                          ? 'bg-white dark:bg-[#1a1c22] border-gray-200 dark:border-white/10 text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 dark:focus:ring-amber-500/20' 
                          : isAdmin
                            ? 'bg-background-subtle border-white/10 text-white placeholder:text-gray-600 focus:border-[#ff6d00] focus:shadow-lg'
                            : isDesigner
                              ? 'bg-[#1E1E1E] border-[#3E3E42] text-[#CCCCCC] focus:border-[#3577EF] rounded-sm'
                              : isSelection
                                ? 'bg-white border-white/60 text-gray-800 placeholder:text-gray-400 focus:border-pink-300 focus:ring-1 focus:ring-pink-100'
                              : 'bg-black/20 border-white/10 text-white focus:border-pink-500'
                        } border rounded-2xl px-4 py-3 outline-none transition-all text-sm shadow-inner min-h-[48px] resize-none`}
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
                        onClick={async () => {
                          if (!currentUser) return;
                          const tempId = Date.now().toString();
                          const optimisticMsg: ChatMessage = {
                            id: tempId,
                            content: '🎤 رسالة صوتية', // Placeholder
                            senderId: currentUser.id,
                            senderName: currentUser.name,
                            senderRole: currentUser.role,
                            recipientId: selectedUserId || null,
                            type: 'text', // treating audio as text for now or 'file' if supported
                            createdAt: new Date().toISOString(),
                            isRead: false
                          };
                          setMessages([...messages, optimisticMsg]);
                          await chatService.sendMessage(optimisticMsg.content, currentUser, selectedUserId, 'text');
                        }}
                        className="p-2.5 text-gray-400 hover:text-pink-500 hover:bg-pink-500/5 rounded-xl transition-all"
                        title="بصمة صوتية"
                      >
                        <Mic size={22} />
                      </button>

                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all rotate-45"
                        title="إرفاق ملف أو صورة"
                      >
                        <Paperclip size={22} />
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      data-testid="chat-send-btn"
                      disabled={!newMessage.trim()}
                      className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${newMessage.trim() ? (isManager ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95' : isDesigner ? 'bg-[#3577EF] text-white rounded-sm shadow-none' : isSelection ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20 active:scale-95' : 'bg-pink-600 text-white shadow-lg active:scale-95') : (isManager ? 'bg-gray-100 text-gray-400' : isDesigner ? 'bg-[#3E3E42] text-[#666666] rounded-sm' : isSelection ? 'bg-gray-100 text-gray-300' : 'bg-white/5 text-gray-600')}`}
                    >
                      <span>إرسال</span>
                      <Send size={16} />
                    </button>
                  </div>
                </form>
             </div>
         </ReceptionWidgetCard>

         {/* Sidebar Area - Unified Widget with Tabs */}
          <div className={`w-full lg:w-80 ${isDesigner ? 'border-l border-[#3E3E42]' : ''}`}>
               <ReceptionWidgetCard 
                 rounded={isManager ? 'rounded-[2.5rem]' : isDesigner ? 'rounded-none' : isSelection ? 'rounded-[30px]' : isReception ? 'rounded-[2.5rem]' : 'rounded-xl'}
                 className={`flex flex-col h-full overflow-visible! ${
                    isManager 
                      ? 'bg-white dark:bg-[#1a1c22] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-white/5' 
                      : isAdmin
                        ? 'bg-[#14161c]/60 backdrop-blur-xl border border-white/5 shadow-inner'
                        : isDesigner
                          ? 'bg-[#1E1E1E] shadow-none border-t border-[#3E3E42]'
                          : isSelection
                            ? 'bg-white border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]'
                            : ''
                    }`}
                 noPadding
              >
                  {/* Tabs Header */}
                  <div className={`flex border-b shrink-0 ${
                    isManager 
                      ? 'bg-white/40 dark:bg-white/5 border-gray-100 dark:border-white/5' 
                      : isAdmin
                        ? 'bg-white/5 border-white/5'
                        : isDesigner
                          ? 'bg-[#252526] border-[#3E3E42]'
                          : isSelection
                            ? 'bg-white/5 border-white/10'
                          : 'bg-linear-to-r from-[#22242b] to-[#1e1e24] border-white/5'
                    }`}>
                      <button
                          onClick={() => setSidebarTab('tasks')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all duration-300 relative ${
                              sidebarTab === 'tasks'
                              ? (isManager 
                                  ? 'text-amber-600 font-bold' 
                                  : isDesigner
                                    ? 'text-[#3577EF] font-bold'
                                    : isSelection
                                      ? 'text-pink-600 font-bold'
                                    : 'text-orange-400 font-bold')
                              : (isManager || isSelection ? 'text-gray-400 hover:text-gray-600' : isDesigner ? 'text-[#AAAAAA] hover:text-white' : 'text-gray-500 hover:text-gray-300')
                          }`}
                      >
                          <CheckSquare size={18} />
                          <span className="text-sm">المهام</span>
                          {sidebarTab === 'tasks' && (
                              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isManager ? 'bg-amber-500' : isDesigner ? 'bg-[#3577EF]' : isSelection ? 'bg-pink-500' : 'bg-orange-500'}`} />
                          )}
                      </button>
                      <button
                          onClick={() => setSidebarTab('members')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all duration-300 relative ${
                              sidebarTab === 'members'
                              ? (isManager 
                                  ? 'text-amber-600 font-bold' 
                                  : isDesigner
                                    ? 'text-[#3577EF] font-bold'
                                    : isSelection
                                      ? 'text-pink-600 font-bold'
                                    : 'text-blue-400 font-bold')
                              : (isManager || isSelection ? 'text-gray-400 hover:text-gray-600' : isDesigner ? 'text-[#AAAAAA] hover:text-white' : 'text-gray-500 hover:text-gray-300')
                          }`}
                      >
                          <Users size={18} />
                          <span className="text-sm">الأعضاء</span>
                          {sidebarTab === 'members' && (
                              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isManager ? 'bg-amber-500' : isDesigner ? 'bg-[#3577EF]' : isSelection ? 'bg-pink-500' : 'bg-blue-500'}`} />
                          )}
                      </button>
                  </div>

                  {/* Content Area - overflow-visible to allow popup */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-visible">
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
                                  <div className={`p-5 border-b relative z-20 shadow-sm ${
                                    isManager 
                                      ? 'bg-white/40 dark:bg-[#1a1c22] border-gray-100 dark:border-white/5' 
                                      : isAdmin
                                        ? 'bg-white/5 border-white/5'
                                        : isDesigner
                                          ? 'bg-[#252526] border-[#3E3E42]'
                                          : isSelection
                                            ? 'bg-white/5 border-white/10'
                                          : 'bg-linear-to-r from-[#22242b] to-[#1e1e24] border-white/5'
                                    }`}>
                                      <div className="flex items-center justify-between relative z-10">
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-xl ${
                                                isManager 
                                                  ? 'bg-amber-50 border border-amber-100' 
                                                  : isAdmin
                                                    ? 'bg-[#ff6d00]/10 border border-[#ff6d00]/30'
                                                    : isDesigner
                                                      ? 'bg-[#1E1E1E] border-[#3E3E42]'
                                                      : isSelection
                                                        ? 'bg-pink-500/10 border border-pink-500/20'
                                                    : 'bg-linear-to-br from-orange-500/20 to-red-500/20 border border-white/10'
                                                } shadow-inner`}>
                                                  <CheckSquare size={16} className={isManager ? "text-amber-500" : isAdmin ? "text-[#ff6d00]" : isDesigner ? "text-[#3577EF]" : isSelection ? "text-pink-500" : "text-orange-300"} />
                                              </div>
                                              <div>
                                                  <h3 className={`text-base font-bold ${isManager ? 'text-gray-800' : isDesigner ? 'text-[#D4D4D4]' : isSelection ? 'text-zinc-200' : 'text-white'}`}>المهام السريعة</h3>
                                                  <p className="text-[10px] text-gray-400">Todo List</p>
                                              </div>
                                          </div>
                                          {(currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN ) && (
                                              <div className="relative z-50">
                                              <button 
                                                      onClick={() => setIsAddingTask(!isAddingTask)}
                                                      className={`p-2 rounded-lg border border-transparent hover:border-white/10 transition-all shadow-sm active:scale-95 ${isAddingTask ? (isManager ? 'bg-amber-500 text-white shadow-amber-500/20' : isDesigner ? 'bg-[#3577EF] text-white shadow-none' : isSelection ? 'bg-pink-500 text-white shadow-pink-500/20' : 'bg-orange-500 text-white shadow-orange-500/20') : (isManager ? 'bg-gray-100 text-amber-500 hover:bg-white' : isDesigner ? 'bg-[#3E3E42] text-[#3577EF] hover:text-white' : isSelection ? 'bg-white/50 text-pink-500 hover:bg-white' : 'bg-black/20 hover:bg-white/5 text-orange-400')}`}
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
                                                              className={`absolute top-full left-0 mt-2 w-64 p-3 rounded-xl border shadow-2xl z-1000 origin-top-left
                                                                ${isManager 
                                                                  ? 'bg-white dark:bg-[#1a1c22] border-gray-200 dark:border-white/10 shadow-xl' 
                                                                  : 'bg-[#2a2d36] border-white/10'
                                                                }`}
                                                          >
                                                              <form onSubmit={handleAddTask} className="space-y-3">
                                                                  <div>
                                                                      <label className={`text-[10px] font-bold mb-1 block ${isManager ? 'text-gray-600' : 'text-gray-400'}`}>مهمة جديدة</label>
                                                                      <input 
                                                                          autoFocus
                                                                          type="text" 
                                                                          value={newTaskText}
                                                                          onChange={(e) => setNewTaskText(e.target.value)}
                                                                          placeholder="أدخل عنوان المهمة..."
                                                                          className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all shadow-inner
                                                                            ${isManager 
                                                                              ? 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:border-amber-400 focus:bg-white dark:focus:bg-black/20 placeholder:text-gray-400' 
                                                                              : 'bg-[#18181b] border-white/10 text-white focus:border-orange-500 placeholder:text-gray-600'
                                                                            }`}
                                                                      />
                                                                  </div>
                                                                  
                                                                  <div>
                                                                      <label className={`text-[10px] font-bold mb-1 block ${isManager ? 'text-gray-600' : 'text-gray-400'}`}>تعيين إلى</label>
                                                                      <div className="grid grid-cols-2 gap-1.5">
                                                                          {getAssignableRoles().map(role => (
                                                                              <button
                                                                                  key={role.value}
                                                                                  type="button"
                                                                                  onClick={() => setNewTaskRole(role.value)}
                                                                                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all text-center border
                                                                                      ${newTaskRole === role.value 
                                                                                          ? (isManager 
                                                                                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-500 border-amber-300 dark:border-amber-500/30' 
                                                                                              : 'bg-orange-500/20 text-orange-500 border-orange-500/30 font-bold')
                                                                                          : (isManager 
                                                                                              ? 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 border-gray-200 dark:border-white/10' 
                                                                                              : 'bg-[#18181b] text-gray-300 hover:bg-[#202025] border-white/5')
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
                                                                      className={`w-full py-2 rounded-lg text-xs font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
                                                                        ${isManager 
                                                                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' 
                                                                          : 'bg-linear-to-r from-orange-600 to-red-600 text-white hover:shadow-orange-500/20'
                                                                        }`}
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
                                  <div className={`flex-1 space-y-3 p-4 overflow-y-auto ${isSelection || isManager ? '[&::-webkit-scrollbar]:hidden -ms-overflow-style-none scrollbar-width-none' : 'custom-scrollbar'}`}>
                                      {tasks
                                          .filter(task => {
                                              // Unified Visibility Logic:
                                              
                                              // 1. Manager (Top Level): Sees EVERYTHING
                                              if (currentUser?.role === UserRole.MANAGER ) return true;

                                              // 2. Admin (Supervisor):
                                              // - Sees tasks assigned to 'all'
                                              // - Sees tasks assigned to 'admin'
                                              // - Sees tasks CREATED BY admin (to track what they assigned)
                                              // - DOES NOT SEE tasks created by Manager for others
                                              if (currentUser?.role === UserRole.ADMIN) {
                                                  if (!task.targetRole || task.targetRole === 'all') return true;
                                                  if (task.targetRole === UserRole.ADMIN) return true;
                                                  if (task.createdBy === currentUser.id) return true;
                                                  return false; // Hide Manager's tasks to others
                                              }

                                              // 3. Regular Users: See tasks assigned to 'all' or their specific role
                                              if (!task.targetRole || task.targetRole === 'all') return true;
                                              return task.targetRole === currentUser?.role;
                                          })
                                          .sort((a, b) => Number(a.completed) - Number(b.completed)) // Active first
                                          .map(task => (
                                              <div 
                                                  key={task.id} 
                                                  onClick={() => {
                                                      // Permission Check: Can only complete if assigned to YOU (or All)
                                                      // Manager/Admin cannot complete tasks assigned to unqiue roles unless it's their own.
                                                      const isAssignedToMe = task.targetRole === currentUser?.role || task.targetRole === 'all';
                                                      
                                                      // If I am the creator, maybe I can? User implies NO. "Why can manager strike?"
                                                      // So Strict Rule: Only Assignee can complete.
                                                      if (isAssignedToMe) {
                                                          toggleTask(task.id);
                                                      }
                                                  }}
                                                  className={`p-3 rounded-xl flex items-center gap-3 transition-all duration-300 relative group overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-0.5 border border-white/5
                                                      ${(task.targetRole === currentUser?.role || task.targetRole === 'all') ? 'cursor-pointer' : 'cursor-default opacity-90'}
                                                      ${task.completed 
                                                      ? (isManager ? 'bg-emerald-50 dark:bg-emerald-900/10 opacity-60' : isSelection ? 'bg-emerald-50/50 opacity-60' : 'bg-linear-to-br from-green-900/10 to-emerald-900/20 opacity-70') 
                                                          : (isManager ? 'bg-white dark:bg-[#1a1c22] hover:bg-amber-50/50 dark:hover:bg-amber-500/5 hover:border-amber-200 dark:hover:border-amber-500/20' : isDesigner ? 'bg-[#1E1E1E] border-[#3E3E42] hover:border-[#3577EF]' : isSelection ? 'bg-white/60 hover:bg-white border-white/40' : 'bg-linear-to-br from-[#2a2d36] to-[#21242b] hover:from-blue-900/20 hover:to-purple-900/20 hover:border-blue-500/30')
                                                      }
                                                  `}
                                              >
                                                  {/* Distinctive Glow for incomplete tasks */}
                                                  {!task.completed && !isDesigner && <div className={`absolute inset-0 ${isManager ? 'bg-amber-400/5' : isSelection ? 'bg-pink-400/5' : 'bg-blue-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}></div>}
                                                  
                                                  {/* 3D Checkbox */}
                                                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner relative z-10
                                                      ${task.completed 
                                                          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' 
                                                          : (isManager ? 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 group-hover:border-amber-400 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]' : isDesigner ? 'bg-[#252526] border-[#3E3E42] group-hover:border-[#3577EF]' : isSelection ? 'bg-white border-white/60 group-hover:border-pink-300' : 'bg-black/40 border border-white/10 group-hover:border-blue-500/50 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]')
                                                      }
                                                  `}>
                                                      {task.completed && <CheckCircle2 size={16} className="text-green-400 drop-shadow-[0_0_5px_currentColor]" />}
                                                  </div>
                                                  
                                                  <div className="flex-1 min-w-0 z-10">
                                                      {editingTaskId === task.id ? (
                                                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                              <input 
                                                                  autoFocus
                                                                  type="text" 
                                                                  value={editingTaskText}
                                                                  onChange={(e) => setEditingTaskText(e.target.value)}
                                                                  className={`w-full text-xs font-bold bg-transparent border-b ${isManager ? 'border-amber-400 text-gray-800' : 'border-white/20 text-white'} outline-none pb-1`}
                                                                  onKeyDown={(e) => {
                                                                      if (e.key === 'Enter') handleSaveEdit(task.id);
                                                                      if (e.key === 'Escape') handleCancelEdit();
                                                                  }}
                                                              />
                                                              <button onClick={() => handleSaveEdit(task.id)} className="text-green-500 hover:text-green-400"><Check size={14} /></button>
                                                              <button onClick={handleCancelEdit} className="text-red-500 hover:text-red-400"><X size={14} /></button>
                                                          </div>
                                                      ) : (
                                                          <div className="flex justify-between items-start gap-2">
                                                              <div>
                                                                  <p className={`text-xs font-bold truncate transition-all ${task.completed ? 'text-gray-500 line-through' : (isManager ? 'text-gray-800 dark:text-gray-200 group-hover:text-amber-700 dark:group-hover:text-amber-500' : isDesigner ? 'text-gray-200 group-hover:text-[#3577EF]' : isSelection ? 'text-gray-800 group-hover:text-pink-600' : 'text-gray-100 group-hover:text-blue-200')}`}>{task.text}</p>
                                                                  <div className="flex items-center gap-2 mt-1">
                                                                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${task.completed ? (isManager ? 'bg-gray-100 dark:bg-white/10 text-gray-500' : 'bg-white/5 text-gray-600') : (isManager ? 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-500 group-hover:border-amber-200 dark:group-hover:border-amber-500/30' : isDesigner ? 'bg-[#252526] border-[#3E3E42] text-gray-400 group-hover:text-white' : isSelection ? 'bg-white text-gray-500 border border-white/60' : 'bg-black/30 text-gray-400 border border-white/5 shadow-sm group-hover:border-blue-500/20 group-hover:text-blue-300')}`}>
                                                                          {task.assignee}
                                                                      </span>
                                                                      {task.completed && task.completedBy && (
                                                                          <span className="text-[9px] text-emerald-600/70 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                              • {users.find(u => u.id === task.completedBy)?.name?.split(' ')[0] || 'مستخدم'} ({task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US') : ''})
                                                                          </span>
                                                                      )}
                                                                  </div>
                                                              </div>

                                                              {(currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN ) && (
                                                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                      <button 
                                                                          onClick={() => handleStartEdit(task)}
                                                                          className={`p-1.5 rounded-lg transition-colors ${isManager ? 'hover:bg-amber-100 text-gray-400 hover:text-amber-600' : 'hover:bg-white/10 text-gray-500 hover:text-blue-400'}`}
                                                                      >
                                                                          <Edit2 size={12} />
                                                                      </button>
                                                                      <button 
                                                                          onClick={() => handleDeleteTask(task.id)}
                                                                          className={`p-1.5 rounded-lg transition-colors ${isManager ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' : 'hover:bg-white/10 text-gray-500 hover:text-red-400'}`}
                                                                      >
                                                                          <Trash2 size={12} />
                                                                      </button>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      )}
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
                                  <div className={`p-5 border-b shrink-0 ${isManager ? 'bg-white/40 border-gray-100' : isDesigner ? 'bg-[#252526] border-[#3E3E42]' : isSelection ? 'bg-white/30 border-white/40' : 'bg-linear-to-r from-[#22242b] to-[#1e1e24] border-white/5'}`}>
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-xl ${isManager ? 'bg-amber-50 border border-amber-100' : isDesigner ? 'bg-[#1E1E1E] border-[#3E3E42]' : isSelection ? 'bg-pink-50 border border-pink-100' : 'bg-linear-to-br from-blue-500/20 to-purple-500/20 border border-white/10'} shadow-inner`}>
                                                  <Users size={16} className={isManager ? "text-amber-500" : isDesigner ? "text-[#3577EF]" : isSelection ? "text-pink-500" : "text-blue-300"} />
                                              </div>
                                              <div>
                                                  <h3 className={`text-base font-bold ${isManager ? 'text-gray-800' : isDesigner ? 'text-[#D4D4D4]' : isSelection ? 'text-gray-800' : 'text-white'}`}>الأعضاء</h3>
                                                  <p className="text-[10px] text-gray-400">Team Members</p>
                                              </div>
                                          </div>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isManager ? 'bg-amber-100 text-amber-600' : isSelection ? 'bg-pink-100 text-pink-600' : 'bg-white/10 text-gray-300'}`}>
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
                                              ? (isManager ? 'bg-amber-50 border-amber-100' : isDesigner ? 'bg-[#3577EF]/10 border-[#3577EF] text-white' : isSelection ? 'bg-pink-50 border-pink-100' : 'bg-linear-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30') 
                                              : (isManager ? 'bg-transparent border-transparent hover:bg-gray-50' : isDesigner ? 'bg-transparent hover:bg-[#2A2A2A]' : isSelection ? 'bg-transparent hover:bg-white/50' : 'bg-transparent border-transparent hover:bg-white/5')
                                          }`}
                                      >
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                              selectedUserId === null ? (isSelection ? 'bg-pink-500 text-white shadow-lg' : 'bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg') : 'bg-gray-700/50 text-gray-400'
                                          }`}>
                                              <Hash size={20} />
                                          </div>
                                          <div className="flex-1 text-right">
                                              <p className={`text-sm font-bold ${isManager ? 'text-gray-800' : isDesigner ? 'text-[#D4D4D4]' : isSelection ? 'text-gray-800' : 'text-white'}`}>الغرفة العامة</p>
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
                                                  ? (isManager ? 'bg-amber-50 border-amber-100' : isDesigner ? 'bg-[#3577EF]/10 border-[#3577EF]' : isSelection ? 'bg-pink-50 border-pink-100' : 'bg-linear-to-r from-pink-600/20 to-rose-600/20 border-pink-500/30') 
                                                  : (isManager ? 'bg-transparent border-transparent hover:bg-gray-50' : isDesigner ? 'bg-transparent border-transparent hover:bg-[#2A2A2A]' : isSelection ? 'bg-transparent hover:bg-white/50' : 'bg-transparent border-transparent hover:bg-white/5')
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
                                                      <p className={`text-sm font-bold truncate ${isManager ? 'text-gray-800' : isDesigner ? 'text-[#D4D4D4]' : isSelection ? 'text-gray-800' : 'text-white'}`}>{user.name}</p>
                                                      {onlineUsers.find(o => o.id === user.id) && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_currentColor]" title="Online"></span>}
                                                  </div>
                                                  <p className="text-[10px] text-gray-500 truncate text-right flex items-center gap-1 justify-end">
                                                      <span className={`w-1.5 h-1.5 rounded-full ${isManager ? 'bg-amber-400' : isSelection ? 'bg-pink-400' : 'bg-pink-500'}`}></span>
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

export default UnifiedTeamChat;
