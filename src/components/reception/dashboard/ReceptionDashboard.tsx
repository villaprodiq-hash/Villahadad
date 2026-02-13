import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Booking, BookingCategory, BookingStatus, User } from '../../../types';
import { Calendar as CalendarIcon, PlusCircle, Camera, Briefcase, Gift, Clock, MapPin, Mic, Copy, CheckCircle, AlertCircle, DollarSign, MessageCircle, Sparkles, Move, X, ChevronLeft, ChevronRight, TrendingUp, Timer, Zap, MessageSquare, Send, Image as ImageIcon, Play, Volume2, Music, Paperclip, Smile, Wallet, Building } from 'lucide-react';
import TasksProgressWidget from './widgets/TasksProgressWidget';
import ClockWidget from './widgets/NeumorphicClockWidget';
import WeeklyChartWidget from './widgets/WeeklyChartWidget';
import WeatherWidget from './widgets/WeatherWidget';
import AIConsoleWidget from './widgets/AIConsoleWidget';
import WorkflowKanbanWidget from './widgets/WorkflowKanbanWidget';
import ReceptionTimelineWidget from './ReceptionTimelineWidget';
import { motion } from 'framer-motion';
import { Responsive, WidthProvider } from 'react-grid-layout';
import ReceptionPageWrapper from '../layout/ReceptionPageWrapper';

const ResponsiveGridLayout = WidthProvider(Responsive);

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface ReceptionDashboardProps {
  bookings: Booking[];
  users?: User[];
  onSelectBooking: (booking: Booking) => void;
  onStatusUpdate?: (id: string, status: BookingStatus) => void;
  isDraggable?: boolean;
  isManager?: boolean;
  currentUser?: User;
  onLogout?: () => void;
}

// Optimized Layout: Properly distributed widgets across all screen sizes
const defaultLayouts = {
  lg: [
    // Top row: Tasks (left) | Clock, Weekly, Weather (center) | Timeline (right)
    { w: 7, h: 32, x: 0, y: 0, i: "tasks-progress", moved: false, static: false },
    { w: 8, h: 8, x: 7, y: 0, i: "clock-widget", moved: false, static: false },
    { w: 6, h: 8, x: 15, y: 0, i: "weekly-chart-widget", moved: false, static: false },
    { w: 7, h: 8, x: 21, y: 0, i: "weather-widget", moved: false, static: false },
    { w: 8, h: 32, x: 28, y: 0, i: "timeline", moved: false, static: false },
    // Middle: Workflow Kanban
    { w: 21, h: 16, x: 7, y: 8, i: "workflow-kanban", moved: false, static: false },
    // Bottom: AI Console
    { w: 21, h: 8, x: 7, y: 24, i: "ai-console", moved: false, static: false }
  ],
  md: [
    // Top row: 3 widgets side by side
    { w: 10, h: 8, x: 0, y: 0, i: "clock-widget", moved: false, static: false },
    { w: 10, h: 8, x: 10, y: 0, i: "weekly-chart-widget", moved: false, static: false },
    { w: 10, h: 8, x: 20, y: 0, i: "weather-widget", moved: false, static: false },
    // Second row: Tasks and Timeline side by side
    { w: 15, h: 14, x: 0, y: 8, i: "tasks-progress", moved: false, static: false },
    { w: 15, h: 14, x: 15, y: 8, i: "timeline", moved: false, static: false },
    // Third row: Workflow
    { w: 30, h: 12, x: 0, y: 22, i: "workflow-kanban", moved: false, static: false },
    // Bottom: AI Console
    { w: 30, h: 6, x: 0, y: 34, i: "ai-console", moved: false, static: false }
  ],
  sm: [
    // Top row: 2 widgets
    { w: 9, h: 8, x: 0, y: 0, i: "clock-widget", moved: false, static: false },
    { w: 9, h: 8, x: 9, y: 0, i: "weekly-chart-widget", moved: false, static: false },
    // Second row: Weather + Tasks
    { w: 9, h: 8, x: 0, y: 8, i: "weather-widget", moved: false, static: false },
    { w: 9, h: 12, x: 9, y: 8, i: "tasks-progress", moved: false, static: false },
    // Third row: Timeline
    { w: 18, h: 12, x: 0, y: 16, i: "timeline", moved: false, static: false },
    // Fourth row: Workflow
    { w: 18, h: 12, x: 0, y: 28, i: "workflow-kanban", moved: false, static: false },
    // Bottom: AI Console
    { w: 18, h: 6, x: 0, y: 40, i: "ai-console", moved: false, static: false }
  ],
  xs: [
    // Stack vertically but use full width
    { w: 12, h: 8, x: 0, y: 0, i: "clock-widget", moved: false, static: false },
    { w: 12, h: 8, x: 0, y: 8, i: "weekly-chart-widget", moved: false, static: false },
    { w: 12, h: 8, x: 0, y: 16, i: "weather-widget", moved: false, static: false },
    { w: 12, h: 12, x: 0, y: 24, i: "tasks-progress", moved: false, static: false },
    { w: 12, h: 12, x: 0, y: 36, i: "timeline", moved: false, static: false },
    { w: 12, h: 12, x: 0, y: 48, i: "workflow-kanban", moved: false, static: false },
    { w: 12, h: 6, x: 0, y: 60, i: "ai-console", moved: false, static: false }
  ],
  xxs: [
    // Stack vertically, full width
    { w: 6, h: 8, x: 0, y: 0, i: "clock-widget", moved: false, static: false },
    { w: 6, h: 8, x: 0, y: 8, i: "weekly-chart-widget", moved: false, static: false },
    { w: 6, h: 8, x: 0, y: 16, i: "weather-widget", moved: false, static: false },
    { w: 6, h: 12, x: 0, y: 24, i: "tasks-progress", moved: false, static: false },
    { w: 6, h: 12, x: 0, y: 36, i: "timeline", moved: false, static: false },
    { w: 6, h: 12, x: 0, y: 48, i: "workflow-kanban", moved: false, static: false },
    { w: 6, h: 6, x: 0, y: 60, i: "ai-console", moved: false, static: false }
  ]
};




const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({ bookings = [], users = [], onSelectBooking = () => {}, onStatusUpdate = () => {}, isDraggable = false, isManager = false, currentUser = null, onLogout = () => {} }) => {
  // دمج الحجوزات الحقيقية مع الوهمية
  const allBookings = bookings;
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const chatFileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Multi-chat system
  const [activeChat, setActiveChat] = useState<string | null>(null); // Active contact ID
  const [showContactsList, setShowContactsList] = useState(false); // Toggle contacts view
  
  // Rating system
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [ratingNotes, setRatingNotes] = useState('');
  const [clientRatings, setClientRatings] = useState<Record<string, {rating: number, notes: string, date: string}>>({});
  const [showChatModal, setShowChatModal] = useState(false);
  
  const [chatContacts, setChatContacts] = useState<{ id: string, name: string, lastMessage: string, time: string, unread: number, rating?: number }[]>([]);
  
  const [chatHistory] = useState<Record<string, Array<{text: string, sender: 'me' | 'client', time: string, type?: 'text' | 'image' | 'audio', url?: string}>>>({});
  
  const [chatMessages, setChatMessages] = useState(chatHistory[activeChat] || []);
  const [layouts, setLayouts] = useState(defaultLayouts);

  // Load existing rating when popup opens
  useEffect(() => {
    if (showRatingPopup) {
      const activeContact = chatContacts.find(c => c.id === activeChat);
      if (activeContact?.rating) {
        setCurrentRating(activeContact.rating);
      } else {
        setCurrentRating(0);
      }
      
      // Load notes from clientRatings if available
      if (clientRatings[activeChat]) {
        setRatingNotes(clientRatings[activeChat].notes || '');
      } else {
        setRatingNotes('');
      }
    }
  }, [showRatingPopup, activeChat, chatContacts, clientRatings]);

  const today = new Date();
  const currentDay = selectedDate.getDate().toString();
  const currentMonth = selectedDate.toLocaleDateString('ar-IQ', { month: 'short' }).toUpperCase();
  
  const stats = useMemo(() => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayBookings = allBookings.filter(b => {
      const bookingDate = new Date(b.shootDate);
      return bookingDate >= todayStart && bookingDate < todayEnd;
    });

    const pendingPayments = allBookings.filter(b => b.paidAmount < b.totalAmount);
    const totalPending = pendingPayments.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);
    const totalRevenue = todayBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalPaid = todayBookings.reduce((sum, b) => sum + b.paidAmount, 0);
    const activeSession = todayBookings.find(b => b.status === BookingStatus.SHOOTING);
    
    // Get next upcoming session
    const now = new Date();
    const upcomingSessions = todayBookings
      .filter(b => {
        const bookingDateTime = new Date(b.shootDate);
        const [hours, minutes] = (b.details?.startTime || '09:00').split(':');
        bookingDateTime.setHours(parseInt(hours), parseInt(minutes));
        return bookingDateTime > now;
      })
      .sort((a, b) => {
        const timeA = a.details?.startTime || '00:00';
        const timeB = b.details?.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
    
    return { 
      todayBookings, 
      pendingPayments, 
      totalPending, 
      totalRevenue, 
      totalPaid, 
      activeSession, 
      nextSession: upcomingSessions[0] || null 
    };
  }, [allBookings, today]);

  // Get bookings for selected date
  const selectedDateBookings = useMemo(() => {
    const dateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    return allBookings
      .filter(b => {
        const bookingDate = new Date(b.shootDate);
        return bookingDate >= dateStart && bookingDate < dateEnd;
      })
      .sort((a, b) => {
        const timeA = a.details?.startTime || '00:00';
        const timeB = b.details?.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
  }, [allBookings, selectedDate]);

  // Get week bookings
  const weekBookings = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + weekOffset * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const weekData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dayBookings = allBookings.filter(b => {
        const bookingDate = new Date(b.shootDate);
        return bookingDate.toDateString() === day.toDateString();
      });
      weekData.push({
        date: day,
        bookings: dayBookings
      });
    }
    return weekData;
  }, [allBookings, selectedDate, weekOffset]);

  // Get month bookings (full month calendar)
  const monthBookings = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    const monthData = [];
    let currentWeek = [];
    
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: null, count: 0 });
    }
    
    for (let day = 1; day <= totalDays; day++) {
      const currentDay = new Date(year, month, day);
      const dayBookings = allBookings.filter(b => {
        const bookingDate = new Date(b.shootDate);
        return bookingDate.toDateString() === currentDay.toDateString();
      });
      
      currentWeek.push({
        date: currentDay,
        count: dayBookings.length
      });
      
      if (currentWeek.length === 7) {
        monthData.push(currentWeek);
        currentWeek = [];
      }
    }
    
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push({ date: null, count: 0 });
    }
    if (currentWeek.length > 0) {
      monthData.push(currentWeek);
    }
    
    return monthData;
  }, [allBookings, selectedDate]);

  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - 2);
    
    for (let i = 0; i < 6; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push({
        date: day,
        number: day.getDate(),
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        isToday: day.toDateString() === today.toDateString(),
        isSelected: day.toDateString() === selectedDate.toDateString()
      });
    }
    return days;
  }, [today, selectedDate]);

  const handleDailyBriefing = () => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(
        `Good morning. You have ${stats.todayBookings.length} bookings today, total revenue ${stats.totalRevenue} Iraqi Dinar, and pending payments of ${stats.totalPending} Iraqi Dinar.`
      );
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Customizable Quick Replies with localStorage
  const [quickReplies, setQuickReplies] = useState(() => {
    const saved = localStorage.getItem('reception_quick_replies');
    return saved ? JSON.parse(saved) : [
      { emoji: '📍', label: 'إرسال الموقع', message: 'مرحباً! موقعنا: استديو فيلا حداد، شارع الرئيسي، بغداد.' },
      { emoji: '💰', label: 'تذكير دفع', message: 'عزيزي العميل، نذكرك بالمبلغ المتبقي من جلسة التصوير.' },
      { emoji: '⏰', label: 'تحذير تأخير', message: 'نعتذر عن التأخير الطفيف. سنكون جاهزين خلال 15 دقيقة.' },
      { emoji: '😍', label: 'ممتاز', message: 'شكراً لتقييمك الممتاز! نسعد بخدمتك دائماً ❤️' },
      { emoji: '😊', label: 'جيد جداً', message: 'شكراً لتقييمك! نسعى دائماً للأفضل' },
      { emoji: '😐', label: 'مقبول', message: 'شكراً لملاحظاتك، سنعمل على التحسين' },
      { emoji: '😞', label: 'يحتاج تحسين', message: 'نعتذر عن التقصير، سنعمل على تحسين خدماتنا' }
    ];
  });

  const [showQuickReplyEditor, setShowQuickReplyEditor] = useState(false);

  // Save quick replies to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('reception_quick_replies', JSON.stringify(quickReplies));
  }, [quickReplies]);


  const handleQuickReply = (message: string, label: string) => {
    navigator.clipboard.writeText(message);
    setCopiedMessage(label);
    setTimeout(() => setCopiedMessage(null), 2000);
  };

  const getCategoryIcon = (booking: Booking) => {
    if (booking.details?.rentalType) return <Briefcase size={18} className="text-amber-400" />;
    if (booking.category === BookingCategory.WEDDING) return <Gift size={18} className="text-[#C94557]" />;
    if (booking.category === BookingCategory.LOCATION) return <Building size={18} className="text-blue-400" />;
    return <Camera size={18} className="text-purple-400" />;
  };

  const getTimeDisplay = (booking: Booking) => {
    const startTime = booking.details?.startTime || '09:00';
    const [hours, minutes] = startTime.split(':');
    const endHour = parseInt(hours) + 1;
    return `${startTime} - ${endHour.toString().padStart(2, '0')}:${minutes}`;
  };

  const onLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
    // Layout is fixed, we don't save to localStorage to ensure stability
    setLayouts(allLayouts);
  }, []);

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  // Calculate time until next session
  const getTimeUntilSession = (booking: Booking | null) => {
    if (!booking) return null;
    const now = new Date();
    const sessionTime = new Date(booking.shootDate);
    const [hours, minutes] = (booking.details?.startTime || '09:00').split(':');
    sessionTime.setHours(parseInt(hours), parseInt(minutes));
    const diff = sessionTime.getTime() - now.getTime();
    const minutesLeft = Math.floor(diff / 60000);
    const hoursLeft = Math.floor(minutesLeft / 60);
    const minsLeft = minutesLeft % 60;
    return { hours: hoursLeft, minutes: minsLeft };
  };

  const timeUntilNext = getTimeUntilSession(stats.nextSession);

  return (
    <ReceptionPageWrapper 
      isManager={isManager} 
      isDraggable={isDraggable}
      currentUser={currentUser}
      onLogout={onLogout}
    >

      {/* Grid Layout */}
      <div 
        className="flex-1 min-h-0 overflow-hidden relative z-10 p-4" 
        dir="ltr"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none' 
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          div::-webkit-scrollbar {
            display: none;
          }
        `}} />
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 36, md: 30, sm: 18, xs: 12, xxs: 6 }}
          rowHeight={17}
          isDraggable={isDraggable}
          isResizable={isDraggable}
          margin={[10, 10]}
          onLayoutChange={onLayoutChange}
          draggableHandle=".drag-handle-zone"
          useCSSTransforms={true}
          compactType={null}
        >
          {/* Clock Widget */}
          <div key="clock-widget" className={isDraggable ? 'ring-2 ring-pink-500/30 rounded-[40px] shadow-2xl shadow-[#C94557]/10' : ''}>
            <div className="h-full w-full relative group transform-gpu transition-transform duration-300 hover:scale-[1.02]">
              {isDraggable && (
                <div className="drag-handle-zone absolute inset-0 z-50 cursor-move flex items-center justify-center bg-[#C94557]/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="bg-linear-to-br from-[#C94557] to-[#B3434F] p-2 rounded-xl shadow-2xl text-white"><Move size={16} /></div>
                </div>
              )}
              <ClockWidget />
            </div>
          </div>

          {/* Weekly Chart Widget */}
          <div key="weekly-chart-widget" className={isDraggable ? 'ring-2 ring-pink-500/30 rounded-[40px] shadow-2xl shadow-[#C94557]/10' : ''}>
            <div className="h-full w-full relative group transform-gpu transition-transform duration-300 hover:scale-[1.02]">
              {isDraggable && (
                <div className="drag-handle-zone absolute inset-0 z-50 cursor-move flex items-center justify-center bg-[#C94557]/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="bg-linear-to-br from-[#C94557] to-[#B3434F] p-2 rounded-xl shadow-2xl text-white"><Move size={16} /></div>
                </div>
              )}
              <WeeklyChartWidget bookings={allBookings} isManager={isManager} />
            </div>
          </div>

          {/* Weather Widget */}
          <div key="weather-widget" className={isDraggable ? 'ring-2 ring-pink-500/30 rounded-[40px] shadow-2xl shadow-[#C94557]/10' : ''}>
            <div className="h-full w-full relative group transform-gpu transition-transform duration-300 hover:scale-[1.02]">
              {isDraggable && (
                <div className="drag-handle-zone absolute inset-0 z-50 cursor-move flex items-center justify-center bg-[#C94557]/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="bg-linear-to-br from-[#C94557] to-[#B3434F] p-2 rounded-xl shadow-2xl text-white"><Move size={16} /></div>
                </div>
              )}
              <WeatherWidget isManager={isManager} />
            </div>
          </div>

          {/* AI Console Widget */}
          <div key="ai-console" className={isDraggable ? 'ring-2 ring-pink-500/30 rounded-[40px] shadow-2xl shadow-[#C94557]/10' : ''}>
            <div className="h-full w-full relative group transform-gpu transition-transform duration-300 hover:scale-[1.02]">
              {isDraggable && (
                <div className="drag-handle-zone absolute inset-0 z-50 cursor-move flex items-center justify-center bg-[#C94557]/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="bg-linear-to-br from-[#C94557] to-[#B3434F] p-2 rounded-xl shadow-2xl text-white"><Move size={16} /></div>
                </div>
              )}
              <AIConsoleWidget isManager={isManager} />
            </div>
          </div>

          {/* Workflow Kanban Widget */}
          <div key="workflow-kanban" className={isDraggable ? 'ring-2 ring-pink-500/30 rounded-[40px] shadow-2xl shadow-[#C94557]/10' : ''}>
            <div className="h-full w-full relative group transform-gpu transition-transform duration-300 hover:scale-[1.02]">
              {isDraggable && (
                <div className="drag-handle-zone absolute inset-0 z-50 cursor-move flex items-center justify-center bg-[#C94557]/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="bg-linear-to-br from-[#C94557] to-[#B3434F] p-3 rounded-2xl shadow-2xl text-white"><Move size={20} /></div>
                </div>
              )}
              <WorkflowKanbanWidget bookings={allBookings} onStatusUpdate={onStatusUpdate} isManager={isManager} />
            </div>
          </div>

          {/* Tasks Progress with Smart Alerts */}
          <div key="tasks-progress" className={isDraggable ? 'ring-2 ring-pink-500/30 rounded-[40px] shadow-2xl shadow-[#C94557]/10' : ''}>
            <div className="h-full w-full relative group transform-gpu transition-transform duration-300 hover:scale-[1.02]">
              {isDraggable && (
                <div className="drag-handle-zone absolute inset-0 z-50 cursor-move flex items-center justify-center bg-[#C94557]/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="bg-linear-to-br from-[#C94557] to-[#B3434F] p-3 rounded-2xl shadow-2xl text-white"><Move size={20} /></div>
                </div>
              )}
              <TasksProgressWidget isDraggable={isDraggable} bookings={allBookings} isManager={isManager} />
            </div>
          </div>

          {/* Timeline - Right Sidebar */}
          {/* Timeline Widget */}
          <div key="timeline" className={isDraggable ? 'ring-2 ring-pink-500/30 rounded-[40px] shadow-2xl shadow-[#C94557]/10' : ''}>
            <div className="h-full w-full relative group transform-gpu transition-transform duration-300 hover:scale-[1.02]">
              {isDraggable && (
                <div className="drag-handle-zone absolute inset-0 z-50 cursor-move flex items-center justify-center bg-[#C94557]/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="bg-linear-to-br from-[#C94557] to-[#B3434F] p-3 rounded-2xl shadow-2xl text-white"><Move size={20} /></div>
                </div>
              )}
              <ReceptionTimelineWidget
                bookings={allBookings}
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                weekOffset={weekOffset}
                setWeekOffset={setWeekOffset}
                weekDays={weekDays}
                selectedDateBookings={selectedDateBookings}
                weekBookings={weekBookings}
                monthBookings={monthBookings}
                currentMonth={currentMonth}
                currentDay={currentDay}
                onSelectBooking={handleBookingClick}
                isManager={isManager}
                users={users}
              />
            </div>
          </div>
        </ResponsiveGridLayout>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100000 p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-[#1a1c22] rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">تفاصيل الحجز</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                {getCategoryIcon(selectedBooking)}
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white">{selectedBooking.clientName}</h4>
                  <p className="text-sm text-gray-400">{selectedBooking.title}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* سعر الجلسة الأساسي */}
                <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-xs text-blue-400 mb-1">
                    <DollarSign size={12} />
                    <span>سعر الجلسة</span>
                  </div>
                  <div className="text-lg font-bold text-blue-300">
                    {(selectedBooking.details?.baseAmount || selectedBooking.totalAmount).toLocaleString()} {selectedBooking.currency === 'USD' ? '$' : 'د.ع'}
                  </div>
                </div>
                {/* المتبقي */}
                <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
                  <div className="flex items-center gap-2 text-xs text-rose-400 mb-1">
                    <Wallet size={12} />
                    <span>المتبقي</span>
                  </div>
                  <div className="text-lg font-bold text-rose-300">
                    {(selectedBooking.totalAmount - selectedBooking.paidAmount).toLocaleString()} {selectedBooking.currency === 'USD' ? '$' : 'د.ع'}
                  </div>
                </div>
                  {/* الخدمات الإضافية - تظهر فقط إذا وجدت */}
                  {selectedBooking.details?.extraItems && selectedBooking.details.extraItems.length > 0 && (() => {
                    const usdExtras = selectedBooking.details.extraItems.filter(i => i.currency === 'USD').reduce((s, i) => s + (i.amount || 0), 0);
                    const iqdExtras = selectedBooking.details.extraItems.filter(i => !i.currency || i.currency === 'IQD').reduce((s, i) => s + (i.amount || 0), 0);
                    return (
                      <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 col-span-2">
                        <div className="flex items-center gap-2 text-xs text-purple-400 mb-1">
                          <PlusCircle size={12} />
                          <span>إضافي</span>
                        </div>
                        <div className="text-lg font-bold text-purple-300 flex flex-col gap-1">
                          {iqdExtras > 0 && <span>+{iqdExtras.toLocaleString()} د.ع</span>}
                          {usdExtras > 0 && <span>+${usdExtras.toLocaleString()}</span>}
                        </div>
                      </div>
                    );
                  })()}
                {/* الوقت */}
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Clock size={12} />
                    <span>الوقت</span>
                  </div>
                  <div className="text-sm font-bold text-white">{getTimeDisplay(selectedBooking)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  selectedBooking.category === BookingCategory.WEDDING ? 'bg-[#C94557]/5 text-[#C94557] border border-gray-700/5' :
                  selectedBooking.details?.rentalType ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-[#C94557]/5 text-purple-400 border border-gray-700/5'
                }`}>
                  {selectedBooking.category === BookingCategory.WEDDING ? 'زفاف' :
                   selectedBooking.details?.rentalType ? 'إيجار قاعة' : 'تصوير'}
                </span>
                {selectedBooking.details?.isPhotographer && (
                  <span className="px-3 py-1.5 bg-[#C94557]/10 text-[#C94557] rounded-full text-xs font-bold border border-blue-500/20">
                    مع مصور
                  </span>
                )}
              </div>

              <button 
                onClick={() => onSelectBooking(selectedBooking)}
                className="w-full py-3 bg-linear-to-r from-[#C94557] to-[#B3434F] hover:from-[#C94557] hover:to-[#B3434F] text-white rounded-xl font-bold transition-all shadow-lg"
              >
                عرض التفاصيل الكاملة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Chat FAB */}
      <button 
        onClick={() => setShowChatModal(!showChatModal)}
        className="fixed bottom-8 left-8 w-16 h-16 bg-linear-to-br from-[#25D366] to-[#128C7E] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group z-50"
      >
        <MessageCircle size={28} className="text-white group-hover:scale-110 transition-transform" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-[#21242b] animate-pulse"></div>
      </button>

      {/* Rating Popup Modal - Outside Grid */}
      {showRatingPopup && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4 text-center">تقييم العميل</h3>
            <p className="text-sm text-gray-400 mb-6 text-center">{chatContacts.find(c => c.id === activeChat)?.name}</p>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setCurrentRating(star)}
                  onDoubleClick={() => setCurrentRating(star - 0.5)}
                  className="text-3xl transition-all hover:scale-110"
                  title={`تقييم ${star} نجوم (دبل كليك = ${star - 0.5})`}
                >
                  {currentRating >= star ? '⭐' : currentRating >= star - 0.5 ? '✨' : '☆'}
                </button>
              ))}
            </div>
            
            <p className="text-center text-sm text-[#C94557] font-bold mb-4">
              {currentRating > 0 ? `${currentRating} نجوم` : 'اختر التقييم'}
            </p>
            
            {/* Notes */}
            <div className="space-y-2 mb-6">
              <label className="text-xs text-gray-400 font-bold">ملاحظات (اختياري)</label>
              <textarea
                value={ratingNotes}
                onChange={(e) => setRatingNotes(e.target.value)}
                placeholder="أضف ملاحظات عن تعامل العميل..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none h-24 focus:outline-none focus:border-white/20"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingPopup(false);
                  setCurrentRating(0);
                  setRatingNotes('');
                }}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (currentRating > 0) {
                    // Save to clientRatings
                    setClientRatings({
                      ...clientRatings,
                      [activeChat]: {
                        rating: currentRating,
                        notes: ratingNotes,
                        date: new Date().toISOString()
                      }
                    });
                    
                    // Update chatContacts to reflect the rating in UI
                    setChatContacts(chatContacts.map(contact => 
                      contact.id === activeChat 
                        ? { ...contact, rating: currentRating }
                        : contact
                    ));
                    
                    setShowRatingPopup(false);
                    setCurrentRating(0);
                    setRatingNotes('');
                    alert(`تم حفظ التقييم: ${currentRating} ⭐`);
                  }
                }}
                disabled={currentRating === 0}
                className="flex-1 py-3 bg-linear-to-r from-[#C94557] to-[#B3434F] hover:from-pink-600 hover:to-amber-700 rounded-xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                حفظ التقييم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-999999 pointer-events-none">
          <motion.div 
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={{
              top: -window.innerHeight + 650,
              bottom: 0,
              left: -window.innerWidth + 400,
              right: window.innerWidth - 400
            }}
            initial={{ x: 0, y: 0 }}
            className="absolute bottom-24 left-8 w-96 h-[600px] bg-[#1E1E1E] rounded-2xl shadow-2xl border border-white/10 flex flex-col pointer-events-auto cursor-move" 
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-linear-to-r from-[#25D366] to-[#128C7E] rounded-t-2xl cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-white" />
                <h3 className="text-white font-bold">
                  {showContactsList ? 'المحادثات' : chatContacts.find(c => c.id === activeChat)?.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!showContactsList && (
                  <button
                    onClick={() => setShowRatingPopup(true)}
                    className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                    title="تقييم العميل"
                  >
                    <span className="text-sm">
                      {chatContacts.find(c => c.id === activeChat)?.rating ? '⭐' : '☆'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setShowContactsList(!showContactsList)}
                  className="text-xs text-white font-bold px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                >
                  {showContactsList ? 'رجوع' : `الجميع`}
                </button>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-all"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            {showContactsList ? (
              // Contacts List
              <div className="flex-1 overflow-y-auto p-3 space-y-2 cursor-auto">
                {chatContacts.length > 0 ? (
                  chatContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setActiveChat(contact.id);
                        setChatMessages(chatHistory[contact.id] || []);
                        setShowContactsList(false);
                      }}
                      className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-right"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white">{contact.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{contact.time}</span>
                          {contact.unread > 0 && (
                            <div className="bg-[#25D366] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {contact.unread}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{contact.lastMessage}</p>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 gap-2">
                    <MessageCircle size={40} className="opacity-20" />
                    <p className="text-sm font-medium">لا توجد محادثات</p>
                  </div>
                )}
              </div>
            ) : (
              // Chat Messages
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 cursor-auto no-scrollbar">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 shadow-xl ${
                          msg.sender === 'me' 
                            ? 'bg-linear-to-br from-[#25D366] to-[#128C7E] text-white rounded-tr-none' 
                            : 'bg-[#2a2d36] text-white border border-white/10 rounded-tl-none'
                        }`}>
                          {msg.type === 'image' ? (
                              <div className="space-y-2">
                                  <div className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                      <img src={msg.url || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=400"} alt="Media" className="w-full h-40 object-cover" />
                                  </div>
                                  {msg.text && <p className="text-sm">{msg.text}</p>}
                              </div>
                          ) : msg.type === 'audio' ? (
                              <div className="flex items-center gap-3 min-w-[160px] py-1">
                                  <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                      <Play size={18} fill="currentColor" />
                                  </button>
                                  <div className="flex-1 space-y-1">
                                      <div className="flex gap-0.5 h-6 items-center">
                                          {[...Array(12)].map((_, i) => (
                                              <div key={i} className="flex-1 bg-white/40 rounded-full" style={{ height: `${20 + Math.random() * 80}%` }} />
                                          ))}
                                      </div>
                                      <div className="flex justify-between items-center text-[9px] opacity-70">
                                          <span>0:14</span>
                                          <Music size={10} />
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                          )}
                          <p className="text-[10px] opacity-70 mt-1.5 flex items-center justify-end gap-1">
                              {msg.time}
                              {msg.sender === 'me' && <CheckCircle size={10} />}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 opacity-50">
                        <MessageCircle size={32} />
                        <p className="text-xs">ابدأ المحادثة...</p>
                    </div>
                  )}
                </div>

                {/* Input Area - Sleek Single Row */}
                <div className="p-4 border-t border-white/10 cursor-auto bg-[#1a1c22]">
                  <input 
                    type="file" 
                    ref={chatFileInputRef} 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const now = new Date();
                        setChatMessages([...chatMessages, {
                          text: file.name,
                          sender: 'me',
                          time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
                          type: file.type.startsWith('image/') ? 'image' : 'text',
                          url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
                        }]);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    
                    {/* Emoji Button */}
                    <button 
                      className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      title="الملصقات"
                    >
                      <Smile size={22} />
                    </button>

                    {/* Mic Button */}
                    <button 
                      onClick={() => {
                        const now = new Date();
                        setChatMessages([...chatMessages, {
                          text: '',
                          sender: 'me',
                          time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
                          type: 'audio'
                        }]);
                      }}
                      className="p-2.5 text-gray-400 hover:text-[#25D366] hover:bg-[#25D366]/5 rounded-xl transition-all"
                      title="بصمة صوتية"
                    >
                      <Mic size={22} />
                    </button>

                    {/* Paperclip Button (Real File Picker) */}
                    <button 
                      onClick={() => chatFileInputRef.current?.click()}
                      className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all rotate-45"
                      title="مرفقات"
                    >
                      <Paperclip size={22} />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && chatMessage.trim()) {
                          const now = new Date();
                          setChatMessages([...chatMessages, {
                            text: chatMessage,
                            sender: 'me',
                            time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
                            type: 'text'
                          }]);
                          setChatMessage('');
                        }
                      }}
                      placeholder="اكتب رسالة..."
                      className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-[#25D366]/40 transition-all text-sm"
                    />

                    {/* Send Button */}
                    <button 
                      onClick={() => {
                        if (chatMessage.trim()) {
                          const now = new Date();
                          setChatMessages([...chatMessages, {
                            text: chatMessage,
                            sender: 'me',
                            time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
                            type: 'text'
                          }]);
                          setChatMessage('');
                        }
                      }}
                      className="w-11 h-11 bg-[#25D366] hover:bg-[#128C7E] rounded-full flex items-center justify-center transition-all shadow-lg shadow-[#25D366]/10 active:scale-90 shrink-0"
                    >
                      <Send size={18} className="text-white ml-0.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </ReceptionPageWrapper>
  );
};

export default ReceptionDashboard;
