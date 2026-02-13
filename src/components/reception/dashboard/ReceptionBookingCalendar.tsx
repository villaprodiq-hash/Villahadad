
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, MapPin, MoreHorizontal, Phone, Plus, Pencil, Trash2, MessageCircle, Camera, Check, Loader2, DollarSign, PlusCircle, Wallet } from 'lucide-react';

// --- بيانات وهمية (Mock Data) ---
interface BookingCalendarProps {
  searchQuery?: string;
  onEditBooking?: (bookingId: string) => void;
  onDeleteBooking?: (bookingId: string) => Promise<void> | void;
  bookings?: any[];
  onDateClick?: (date: Date) => void;
  onViewBooking?: (id: string) => void;
  users?: any[]; // List of all users for photographer selection
  onUpdateBooking?: (id: string, updates: any) => void; // Callback to update booking
  isLoading?: boolean; // Loading flag for async data fetch
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ searchQuery = '', onEditBooking, onDeleteBooking, bookings = [], onDateClick, onViewBooking, users = [], onUpdateBooking, isLoading = false }) => {
  // استخدام الحجوزات الحقيقية فقط
  const [localBookings, setLocalBookings] = useState<any[]>([]);

  // Sync with props
  useEffect(() => {
    setLocalBookings(bookings || []);
  }, [bookings]);

  const [currentDate, setCurrentDate] = useState(new Date()); // Current month dynamically
  const [selectedDate, setSelectedDate] = useState(new Date()); // Today dynamically
  
  // --- حالة القائمة المنسدلة ---
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // --- حالة مبدل المصور ---
  const [photographerMenuId, setPhotographerMenuId] = useState<string | null>(null);
  const photographerMenuRef = useRef<HTMLDivElement>(null);
  const [flashingBookingId, setFlashingBookingId] = useState<string | null>(null);

  // --- إغلاق القائمة عند النقر في أي مكان خارجها ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // إذا كانت القائمة مفتوحة، والضغطة ليست داخل القائمة (Dropdown) نفسها
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- دوال التاريخ المساعدة ---
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const formatDateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isToday = (year: number, month: number, day: number) => { const today = new Date(); return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year; };
  const isSelected = (year: number, month: number, day: number) => selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  


  // Memoized filtered bookings for global search

  // Memoized filtered bookings for global search
  const filteredBookingsGlobal = React.useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return localBookings.filter(b => 
      b.clientName.toLowerCase().includes(query) || 
      b.category.toLowerCase().includes(query)
    );
  }, [localBookings, searchQuery]);

  // Updated usage for grid
  const getBookingsForDate = (dateStr: string) => {
    return localBookings.filter(b => b.shootDate && b.shootDate.trim() === dateStr);
  };

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  // --- رسم الشبكة (Calendar Grid) ---
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const totalDaysShown = firstDay + daysInMonth;
    const rowsNeeded = Math.ceil(totalDaysShown / 7);
    const totalSlots = rowsNeeded * 7; 
    const days = [];

    for (let i = 0; i < totalSlots; i++) {
        const dayNumber = i - firstDay + 1;
        if (i < firstDay || dayNumber > daysInMonth) {
            days.push(<div key={`empty-${i}`} className="bg-transparent/5 rounded-xl border border-white/0"></div>);
            continue;
        }
        const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
        const dayBookings = getBookingsForDate(dateKey);
        const pressure = dayBookings.length;
        
        // تلوين المربعات (Color Logic Update)
        let bgClass = "bg-white/5 hover:bg-white/10 border border-white/5 shadow-inner transition-all duration-300 backdrop-blur-sm"; // Default (Empty)
        
        if (isSelected(currentDate.getFullYear(), currentDate.getMonth(), dayNumber)) {
            // Selected Day
            bgClass = "bg-[#C94557] border-[#C94557] text-white shadow-2xl shadow-[#C94557]/40 ring-1 ring-white/20 z-10 scale-[1.02]";
        } else if (pressure >= 3) {
            // Heavy Load (Red)
            bgClass = "bg-red-500/20 border border-red-500/30 hover:bg-red-500/30";
        } else if (pressure >= 1) {
            // Light Load (Orange)
            bgClass = "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-100";
        }

        const handleDayClick = (e: React.MouseEvent) => {
            // FIX: Only trigger Add Booking if day is empty
            if (dayBookings.length === 0 && onDateClick) {
                e.stopPropagation();
                onDateClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber));
            } else {
                // Otherwise just select the date
                setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber));
            }
        };

        days.push(
            <div 
                key={i} 
                onClick={handleDayClick}
                className={`rounded-xl p-2 cursor-pointer transition-all duration-200 flex flex-col h-full relative group ${bgClass}`}
            >
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold ${isSelected(currentDate.getFullYear(), currentDate.getMonth(), dayNumber) ? 'text-white' : 'text-gray-400'}`}>{dayNumber}</span>
                    {isToday(currentDate.getFullYear(), currentDate.getMonth(), dayNumber) && (<span className={`w-2 h-2 rounded-full ${isSelected(currentDate.getFullYear(), currentDate.getMonth(), dayNumber) ? 'bg-white' : 'bg-[#C94557]'}`}></span>)}
                </div>
                
                {/* أيقونة + للأيام الفارغة فقط عند الهوفر */}
                {dayBookings.length === 0 && onDateClick && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-green-500/5 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                            <span className="text-green-400 text-xl font-bold">+</span>
                        </div>
                    </div>
                )}
                
                <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                    {dayBookings.slice(0, 3).map((booking, idx) => (
                        <div key={idx} className={`rounded p-1 text-[9px] flex items-center justify-between gap-1 border-r-2 ${isSelected(currentDate.getFullYear(), currentDate.getMonth(), dayNumber) ? 'bg-white/20 border-white text-white' : 'bg-[#18181b] border-l-0 text-gray-300'} ${booking.category === 'زفاف' || booking.category === 'Wedding' || booking.category === 'Venue' ? 'border-amber-500' : 'border-emerald-500'}`}>
                            <span className="truncate font-medium flex-1">{booking.clientName}</span>
                            <span className="opacity-70 text-[8px]">{booking.details?.startTime}</span>
                        </div>
                    ))}
                    {dayBookings.length > 3 && (<div className={`text-[9px] text-center mt-auto ${isSelected(currentDate.getFullYear(), currentDate.getMonth(), dayNumber) ? 'text-white/80' : 'text-gray-500'}`}>+{dayBookings.length - 3} المزيد</div>)}
                </div>
            </div>
        );
    }
    return { days, rowsNeeded };
  };

  const { days, rowsNeeded } = renderCalendarDays();
  
  // Decide what to show in sidebar: Search results OR Selected day bookings
  const isSearching = searchQuery && searchQuery.trim().length > 0;
  const sidebarBookings = isSearching 
    ? filteredBookingsGlobal 
    : getBookingsForDate(formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));

  // Navigation handlers
  const nextDay = () => setSelectedDate(new Date(selectedDate.getTime() + 86400000));
  const prevDay = () => setSelectedDate(new Date(selectedDate.getTime() - 86400000));

  // --- التعامل مع الأزرار ---
  const toggleMenu = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      // هنا نفتح أو نغلق بناءً على الحالة الحالية
      setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
      // ✅ SECURITY FIX: Always require confirmation before delete
      const booking = localBookings.find(b => b.id === id);
      const clientName = booking?.clientName || 'هذا الحجز';
      
      if (!window.confirm(`⚠️ تحذير!\n\nهل أنت متأكد من حذف حجز "${clientName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه!`)) {
          setActiveMenuId(null);
          return; // ❌ User cancelled - do nothing
      }
      
      // 🔄 Show loading state
      const deleteButton = document.activeElement as HTMLButtonElement;
      if (deleteButton) {
          deleteButton.disabled = true;
          deleteButton.style.opacity = '0.5';
      }
      
      try {
          // ✅ User confirmed - proceed with delete
          if (onDeleteBooking) {
              await onDeleteBooking(id);
          }
          
          // UI Update only after successful delete
          setLocalBookings(prev => prev.filter(b => b.id !== id));
          
          // 🎉 Show success feedback
          console.log(`✅ Booking ${id} deleted successfully`);
      } catch (error) {
          console.error('❌ Failed to delete booking:', error);
          alert('فشل حذف الحجز. يرجى المحاولة مرة أخرى.');
      } finally {
          setActiveMenuId(null);
          if (deleteButton) {
              deleteButton.disabled = false;
              deleteButton.style.opacity = '1';
          }
      }
  };

  const handleEdit = (id: string) => {
      if (onEditBooking) {
          onEditBooking(id);
      }
      setActiveMenuId(null);
  };
  
  // --- Photographer Switcher Logic ---
  const getPhotographerName = (userId?: string) => {
    if (!userId) return 'غير محدد';
    const user = users.find(u => u.id === userId);
    return user?.name || 'غير محدد';
  };
  
  const handlePhotographerChange = (bookingId: string, newPhotographerId: string) => {
    if (onUpdateBooking) {
      onUpdateBooking(bookingId, { assignedShooter: newPhotographerId });
      
      // Flash green effect
      setFlashingBookingId(bookingId);
      setTimeout(() => setFlashingBookingId(null), 1000);
    }
    setPhotographerMenuId(null);
  };
  
  // Filter photographers (users who can shoot)
  const photographers = (users || []).filter(u =>
    u.role === 'manager' || u.role === 'admin' || u.name?.includes('سورة') || u.name?.includes('مريم')
  );

  return (
    <div className="flex flex-col lg:flex-row gap-5 w-full h-full text-right font-sans p-5 bg-[#1A1C22]/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl" dir="rtl">
      
      {/* 1. الويدجيت الجانبي (يمين) */}
      <div className="w-full lg:w-[360px] bg-black/20 rounded-3xl border border-white/5 flex flex-col overflow-hidden shrink-0">
         <div className="relative pt-8 pb-6 px-6 border-b border-white/5 overflow-hidden bg-linear-to-b from-[#27272a] to-[#1a1c22]">
             {/* Decorative Elements */}
             <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#C94557]/5 rounded-full blur-[60px]"></div>
             <div className="absolute top-4 right-4 text-[#C94557]/10 transform rotate-12">
                <CalendarIcon size={64} />
             </div>

             {/* Date Content OR Search Header */}
             {isSearching ? (
                <div className="relative z-10 flex flex-col gap-1">
                    <h3 className="text-2xl font-black text-white tracking-tight">نتائج البحث</h3>
                    <p className="text-gray-400 text-sm font-medium">
                        تم العثور على {sidebarBookings.length} حجز
                    </p>
                </div>
             ) : (
                <div className="relative z-10 flex flex-col gap-1">
                     <div className="flex items-center justify-between w-full">
                        <button onClick={prevDay} className="p-1.5 rounded-lg bg-black/20 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <ChevronRight size={18} />
                        </button>
                        <h3 className="text-5xl font-black text-white tracking-tight flex items-baseline gap-2">
                           {selectedDate.getDate()}
                           <span className="text-lg font-medium text-[#C94557] opacity-80 uppercase tracking-widest">
                               {monthNames[selectedDate.getMonth()]}
                           </span>
                        </h3>
                        <button onClick={nextDay} className="p-1.5 rounded-lg bg-black/20 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                     </div>
                   
                   <p className="text-gray-400 text-sm font-medium flex items-center justify-center gap-2 mt-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-[#C94557] inline-block"></span>
                       {weekDays[selectedDate.getDay()]}، {selectedDate.getFullYear()}
                   </p>
                </div>
             )}
         </div>

         <div className="flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-2 pb-20">
            {sidebarBookings.length > 0 ? (
                sidebarBookings.map((booking) => (
                    <div 
                        key={booking.id} 
                        onClick={() => onViewBooking ? onViewBooking(booking.id) : handleEdit(booking.id)}
                        className="bg-[#27272a] p-3 rounded-xl border border-white/5 hover:border-[#C94557]/30 transition-all group relative cursor-pointer"
                    >
                        
                        {/* زر النقاط الثلاث */}
                        <div className="absolute top-3 left-3 z-50">
                            <button 
                                onClick={(e) => toggleMenu(e, booking.id)}
                                // 👇👇👇 هذا هو الحل السحري: منع انتشار حدث الماوس، حتى لا يغلق الـ useEffect القائمة فوراً
                                onMouseDown={(e) => e.stopPropagation()} 
                                className={`p-1 rounded-lg transition-colors duration-200 ${
                                    activeMenuId === booking.id 
                                    ? 'bg-[#C94557] text-white opacity-100' // إذا القائمة مفتوحة، الزر يبقى أحمر وظاهر
                                    : 'text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100' // بالوضع الطبيعي يظهر عند الهوفر
                                }`}
                            >
                                <MoreHorizontal size={16} />
                            </button>

                            {/* القائمة المنسدلة */}
                            {activeMenuId === booking.id && (
                                <div 
                                    ref={menuRef} // ربط الريفرنس بالقائمة
                                    className="absolute left-0 top-full mt-1 w-32 bg-[#27272a] border border-white/10 rounded-xl shadow-2xl z-60 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                    onMouseDown={(e) => e.stopPropagation()} // منع إغلاق القائمة عند الضغط داخلها
                                >
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(booking.id); }} className="w-full text-right px-3 py-2.5 text-xs font-medium text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 flex items-center gap-2 transition-colors border-b border-white/5">
                                        <Pencil size={12} /> تعديل
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(booking.id); }} className="w-full text-right px-3 py-2.5 text-xs font-medium text-gray-300 hover:bg-red-500/10 hover:text-red-400 flex items-center gap-2 transition-colors">
                                        <Trash2 size={12} /> حذف
                                    </button>
                                </div>
                            )}
                        </div>

                         <div className="flex justify-between items-start mb-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${booking.category === 'زفاف' || booking.category === 'Wedding' || booking.category === 'Venue' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{booking.category}</span>
                          </div>
                         <h4 className="text-white font-bold text-sm mb-1 ml-6">{booking.clientName}</h4>
                         <div className="flex justify-between items-start text-[10px] text-gray-400 mt-2">
                              <span className="flex items-center gap-1 bg-[#18181b] px-2 py-1 rounded"><Clock size={10} className="text-[#C94557]" /> {booking.details?.startTime || '00:00'}</span>
                              <div className="flex flex-col items-end gap-1.5">
                                 {/* سعر الجلسة الأساسي */}
                                 <div className="flex items-center gap-1.5 text-blue-400 font-bold bg-blue-400/10 px-2 py-1 rounded">
                                    <DollarSign size={10} />
                                    <span>سعر الجلسة:</span>
                                    <span>{(booking.details?.baseAmount || booking.totalAmount).toLocaleString()} {booking.currency}</span>
                                 </div>
                                  {/* الخدمات الإضافية - تظهر فقط إذا وجدت */}
                                  {booking.details?.extraItems && booking.details.extraItems.length > 0 && (() => {
                                     const usdExtras = booking.details.extraItems.filter(i => i.currency === 'USD').reduce((s, i) => s + (i.amount || 0), 0);
                                     const iqdExtras = booking.details.extraItems.filter(i => !i.currency || i.currency === 'IQD').reduce((s, i) => s + (i.amount || 0), 0);
                                     return (<>
                                       {iqdExtras > 0 && (
                                         <div className="flex items-center gap-1.5 text-purple-400 font-bold bg-purple-400/10 px-2 py-1 rounded">
                                           <PlusCircle size={10} />
                                           <span>إضافي:</span>
                                           <span>+{iqdExtras.toLocaleString()} د.ع</span>
                                         </div>
                                       )}
                                       {usdExtras > 0 && (
                                         <div className="flex items-center gap-1.5 text-purple-400 font-bold bg-purple-400/10 px-2 py-1 rounded">
                                           <PlusCircle size={10} />
                                           <span>إضافي:</span>
                                           <span>+${usdExtras.toLocaleString()}</span>
                                         </div>
                                       )}
                                     </>);
                                  })()}
                                 {/* المتبقي */}
                                 <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-400/10 px-2 py-1 rounded">
                                    <Wallet size={10} />
                                    <span>المتبقي:</span>
                                    <span>{(booking.totalAmount - (booking.paidAmount || 0)).toLocaleString()} {booking.currency}</span>
                                 </div>
                              </div>
                         </div>
                         
                         {/* Photographer Switcher Badge */}
                         <div className="mt-2 relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotographerMenuId(photographerMenuId === booking.id ? null : booking.id);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                flashingBookingId === booking.id 
                                  ? 'bg-emerald-500 text-white animate-pulse' 
                                  : 'bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white border border-pink-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Camera size={12} />
                                <span>📷 {getPhotographerName(booking.assignedShooter)}</span>
                              </div>
                              <span className="text-[8px] opacity-70">تبديل</span>
                            </button>
                            
                            {/* Photographer Dropdown */}
                            {photographerMenuId === booking.id && photographers.length > 0 && (
                              <div 
                                ref={photographerMenuRef}
                                className="absolute top-full left-0 right-0 mt-1 bg-[#27272a] border border-pink-500/20 rounded-xl shadow-2xl z-70 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-1 max-h-40 overflow-y-auto">
                                  {photographers.map(photographer => (
                                    <button
                                      key={photographer.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePhotographerChange(booking.id, photographer.id);
                                      }}
                                      className={`w-full text-right px-3 py-2 text-[10px] font-medium rounded-lg transition-colors flex items-center justify-between ${
                                        booking.assignedShooter === photographer.id
                                          ? 'bg-pink-500/20 text-pink-400'
                                          : 'text-gray-300 hover:bg-pink-500/10 hover:text-pink-400'
                                      }`}
                                    >
                                      <span>{photographer.name}</span>
                                      {booking.assignedShooter === photographer.id && (
                                        <Check size={12} className="text-pink-400" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                         </div>
                         
                         {/* Audit Trail Info */}
                         <div className="mt-2 flex items-center justify-between text-[8px] text-gray-500 px-1">
                            <div className="flex items-center gap-1" title="تم الانشاء بواسطة">
                                <span>✨</span>
                                <span>{users.find(u => u.id === booking.createdBy)?.name || 'System'}</span>
                            </div>
                            {booking.updatedBy && booking.updatedBy !== booking.createdBy && (
                                <div className="flex items-center gap-1" title="آخر تعديل">
                                    <span>✏️</span>
                                    <span>{users.find(u => u.id === booking.updatedBy)?.name || 'System'}</span>
                                </div>
                            )}
                         </div>
                         
                         <div className="mt-3 pt-2 border-t border-white/10 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            {/* Actions: WhatsApp Message, WhatsApp Call (as requested), Location */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const phone = booking.clientPhone?.replace(/^0/, '964').replace(/\D/g, '') || '';
                                    if(phone) window.open(`https://web.whatsapp.com/send?phone=${phone}`, 'whatsapp_popup', 'width=1000,height=700,menubar=no,toolbar=no,location=no,status=no');
                                }} 
                                className="flex-1 bg-[#18181b] hover:bg-green-600 hover:text-white text-gray-400 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                                title="رسالة واتساب"
                            >
                                <MessageCircle size={10} /> رسالة
                            </button>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const phone = booking.clientPhone?.replace(/^0/, '964').replace(/\D/g, '') || '';
                                    if(phone) window.open(`https://web.whatsapp.com/send?phone=${phone}`, 'whatsapp_popup', 'width=1000,height=700,menubar=no,toolbar=no,location=no,status=no');
                                }} 
                                className="flex-1 bg-[#18181b] hover:bg-green-600 hover:text-white text-gray-400 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                                title="اتصال واتساب"
                            >
                                <Phone size={10} /> اتصال
                            </button>

                            {booking.details?.notes?.match(/Mapped Location: (.*)/)?.[1] && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const loc = booking.details?.notes?.match(/Mapped Location: (.*)/)?.[1];
                                        if(loc) window.open(loc, '_blank');
                                    }} 
                                    className="flex-1 bg-[#18181b] hover:bg-blue-600 hover:text-white text-gray-400 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                                >
                                    <MapPin size={10} /> موقع
                                </button>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#27272a] flex items-center justify-center border border-white/5"><CalendarIcon size={24} className="opacity-30" /></div>
                    <p className="text-xs">لا توجد حجوزات</p>
                </div>
            )}
         </div>
         <div className="p-3 border-t border-white/5 bg-[#27272a]">
             {!isSearching && sidebarBookings.length === 0 && (
               <button 
                 onClick={() => onDateClick && onDateClick(selectedDate)} 
                 className="w-full py-2.5 bg-[#C94557] text-white rounded-xl text-xs font-bold hover:bg-[#be123c] transition-colors shadow-lg shadow-[#C94557]/20 flex items-center justify-center gap-2"
               >
                 <Plus size={14} /> إضافة حجز جديد
               </button>
             )}
         </div>
      </div>

      {/* 2. التقويم الكبير (يسار) */}
      <div className="flex-1 bg-black/10 rounded-3xl border border-white/5 flex flex-col min-h-0 overflow-hidden relative">
        {/* Background Depth */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C94557]/5 blur-[100px] pointer-events-none" />
        
        {/* Header Section */}
        <div className="p-6 border-b border-white/5 relative z-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-linear-to-b from-[#C94557] to-pink-600 rounded-full shadow-[0_0_15px_rgba(201,69,87,0.5)]"></div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">حجوزات الشهر</h2>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 opacity-50">Monthly Booking View</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-xl border border-white/5 shadow-inner z-50 relative">
                    <button onClick={(e) => { e.stopPropagation(); prevMonth(); }} className="p-2 hover:bg-white/10 rounded-lg text-white transition-all duration-300 cursor-pointer"><ChevronRight size={16} /></button>
                    <span className="px-4 text-xs font-bold text-white min-w-[120px] text-center tracking-wide cursor-default">
                        {monthNames[currentDate.getMonth()]} <span className="text-[#C94557] underline decoration-2 underline-offset-4 decoration-[#C94557]/30">{currentDate.getFullYear()}</span>
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); nextMonth(); }} className="p-2 hover:bg-white/10 rounded-lg text-white transition-all duration-300 cursor-pointer"><ChevronLeft size={16} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-3 text-center">
                {weekDays.map(d => (
                    <div key={d} className="bg-black/20 py-3 rounded-xl border border-white/5 shadow-lg text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        {d}
                    </div>
                ))}
            </div>
        </div>

        {/* Days Grid */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className={`grid grid-cols-7 gap-3 h-full ${rowsNeeded === 5 ? 'grid-rows-5' : 'grid-rows-6'}`}>{days}</div>
        </div>
      </div>
    {isLoading && (!bookings || bookings.length === 0) && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <Loader2 className="animate-spin text-white" size={48} />
  </div>
)}
</div>
  );
};

export default BookingCalendar;