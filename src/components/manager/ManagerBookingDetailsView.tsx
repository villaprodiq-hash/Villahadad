
import React, { useState } from 'react';
import { Booking, BookingStatus, Reminder, ReminderType, StatusLabels, BookingCategory, Currency } from '../../types';
import {
  Calendar, DollarSign, Package, CheckCircle2, Clock, User, Bell, Plus,
  Camera, Monitor, Truck, Sparkles, Wand2, Users, Building, Shirt, Trash2,
  ArrowRight, Edit2, Copy, Check, MoreHorizontal, Phone, Mail,
  ExternalLink, PhoneCall, FileText, Gift, Heart, Home, MessageCircle,
  Image as ImageIcon, MapPin, Music, Star, Video, Zap, AlertTriangle, Briefcase,
  Mic, Smile, Meh, Frown, Sun, Sunset, Timer, ListChecks, Wallet, HardDrive, Crown,
  Cake, Globe as Global, Coins, Grid3X3, Printer
} from 'lucide-react';
import { ClientTransactionModal, ClientTransactionHistory } from '../client';
import AddExtraItemModal from '../AddExtraItemModal';
import { SelectionModal } from '../session/SelectionModal';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatMoney } from '../../utils/formatMoney';
import { printReceipt, ReceiptType } from '../../utils/printReceipt';
import { toast } from 'sonner';
import ClientBadge from '../shared/ClientBadge';
import { buildClientPortalUrl } from '../../utils/clientPortal';

interface ManagerBookingDetailsViewProps {
  booking: Booking;
  reminders: Reminder[];
  onBack: () => void;
  allBookings?: Booking[];
  initialTab?: DetailsTab;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
}

type DetailsTab = 'client' | 'logistics' | 'financials' | 'workflow';

const ICON_MAP: Record<string, any> = {
    'Bell': Bell,
    'DollarSign': DollarSign,
    'Camera': Camera,
    'Monitor': Monitor,
    'Truck': Truck,
    'Calendar': Calendar,
    'FileText': FileText,
    'Gift': Gift,
    'Heart': Heart,
    'Home': Home,
    'Image': ImageIcon,
    'MapPin': MapPin,
    'Music': Music,
    'Phone': Phone,
    'Star': Star,
    'User': User,
    'Video': Video,
    'Zap': Zap,
    'AlertTriangle': AlertTriangle,
    'Briefcase': Briefcase,
};

const ManagerBookingDetailsView: React.FC<ManagerBookingDetailsViewProps> = ({
  booking,
  reminders,
  onBack,
  allBookings = [],
  initialTab,
  onUpdateBooking
}) => {
  const [activeTab, setActiveTab] = useState<DetailsTab>(initialTab || 'client');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
  const [showAddExtraItemModal, setShowAddExtraItemModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  // Outdoor Detection
  const isOutdoor = booking.servicePackage.includes('خارجي') || booking.details?.weather !== undefined;
  
  // Current user (in real app, get from auth context)
  const currentUser = { id: 'current-user', name: 'المستخدم الحالي' };

  const getSentiment = (clientId: string) => {
     const val = String(clientId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3;
     if (val === 0) return { label: 'سعيد جداً', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Smile, borderColor: 'border-emerald-100' };
     if (val === 1) return { label: 'محايد', color: 'text-amber-600', bg: 'bg-amber-50', icon: Meh, borderColor: 'border-amber-100' };
     return { label: 'عميل حساس', color: 'text-rose-600', bg: 'bg-rose-50', icon: Frown, borderColor: 'border-rose-100' };
  };
  
  const handleAddExtraItem = (amount: number, description: string, itemCurrency: Currency) => {
    if (!onUpdateBooking) {
      toast.error('لا يمكن تحديث الحجز في وضع العرض فقط');
      return;
    }

    const currentExtraItems = booking.details?.extraItems || [];
    const newItem = {
      id: Date.now().toString(),
      amount,
      currency: itemCurrency, // ✅ Save original currency
      description,
    };
    const updatedExtraItems = [...currentExtraItems, newItem];

    // ✅ Same currency → add to totalAmount; different currency → add to addOnTotal
    const isSameCurrency = booking.currency === itemCurrency;

    if (isSameCurrency) {
      onUpdateBooking(booking.id, {
        totalAmount: booking.totalAmount + amount,
        paidAmount: booking.paidAmount + amount, // ✅ المبلغ الإضافي مستلم فوراً
        details: { ...booking.details, extraItems: updatedExtraItems },
      });
    } else {
      // Different currency: store separately (do NOT mix into totalAmount)
      const currentAddOnTotal = (booking as any).addOnTotal || 0;
      onUpdateBooking(booking.id, {
        addOnTotal: currentAddOnTotal + amount,
        originalPackagePrice: booking.originalPackagePrice || booking.totalAmount,
        details: { ...booking.details, extraItems: updatedExtraItems },
      } as any);
    }

    toast.success('تم إضافة الخدمة الإضافية بنجاح');
  };
  
  const clientSentiment = getSentiment(booking.clientId);
  const SentimentIcon = clientSentiment.icon;
  const remainingBalance = booking.totalAmount - booking.paidAmount;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12" dir="rtl">
      
      {/* 🚀 Header (Light Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-4">
           <button onClick={onBack} className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all border border-gray-100 shadow-sm">
             <ArrowRight size={18} />
           </button>
           
           <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-black text-gray-900 truncate tracking-tight">{booking.title}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold">عرض فقط</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100"><Package size={8} className="text-blue-500" /> {booking.servicePackage}</span>
                    <span className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100"><Calendar size={8} className="text-blue-500" /> {booking.shootDate}</span>
                    <span className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100"><Clock size={8} className="text-blue-500" /> {booking.details?.startTime} - {booking.details?.endTime}</span>
                </div>
           </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
            <div className="bg-white border border-gray-100 rounded-xl p-1.5 px-4 flex items-center gap-3 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">حالة الحجز الحالية</span>
                <span className="text-blue-600 font-black text-xs">{StatusLabels[booking.status]}</span>
            </div>
        </div>
      </div>

      {/* 📊 Tab Navigation (Light Theme) */}
      <div className="bg-gray-100/50 p-1 rounded-2xl border border-gray-100 flex gap-1 shadow-inner overflow-x-auto no-scrollbar">
          {[
            { id: 'client', label: 'بيانات العميل', icon: Users, color: 'text-blue-600' },
            { id: 'logistics', label: 'اللوجستيات', icon: ListChecks, color: 'text-amber-600' },
            { id: 'financials', label: 'المالية', icon: Wallet, color: 'text-emerald-600' },
            { id: 'workflow', label: 'سير العمل', icon: HardDrive, color: 'text-indigo-600' }
          ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailsTab)}
                className={`flex-1 min-w-fit px-3 py-2 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <tab.icon size={12} className={activeTab === tab.id ? tab.color : 'text-gray-300'} />
                <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
      </div>

      {/* 📦 Content Area */}
      <div className="min-h-[400px]">
          {activeTab === 'client' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 🌟 Premium Client Header Card (Manager Light Style) */}
                <div className="relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm">
                    {/* Soft Ambient Orbs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 blur-[60px] rounded-full -ml-24 -mb-24"></div>

                    <div className="relative p-4 flex flex-col md:flex-row items-center gap-5">
                        {/* Avatar & Sentiment */}
                        <div className="relative">
                            <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/20">
                                {booking.clientName.charAt(0)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-lg ${clientSentiment.bg} ${clientSentiment.borderColor} border shadow-sm backdrop-blur-md`}>
                                <SentimentIcon size={14} className={clientSentiment.color} />
                            </div>
                        </div>

                        {/* Name & Quick Stats */}
                        <div className="flex-1 text-center md:text-right space-y-2">
                            <div className="space-y-0.5">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                                    <h4 className="text-lg font-black text-gray-900 tracking-tight">{booking.clientName}</h4>
                                    <div className="flex gap-1.5 justify-center">
                                        <ClientBadge booking={booking} allBookings={allBookings} compact />
                                        {booking.isFamous && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-full">
                                                <Crown size={10} className="text-amber-600 fill-amber-600" />
                                                <span className="text-[8px] font-black text-amber-700 uppercase">مشاهير</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 justify-center md:justify-start text-gray-400 font-bold uppercase tracking-widest text-[8px]">
                                    <Star size={10} className="text-blue-500" />
                                    <span>{booking.category === BookingCategory.WEDDING ? 'زفاف' : (booking.category === BookingCategory.STUDIO ? 'ستوديو' : (booking.category === BookingCategory.LOCATION ? 'حجز فيلا' : 'عائلي'))}</span>
                                    <span className="mx-1 opacity-20">|</span>
                                    <span>عضو منذ {format(parseISO(booking.createdAt || booking.shootDate), 'MMMM yyyy', { locale: ar })}</span>
                                </div>
                            </div>

                            {/* Loyalty Progress */}
                            <div className="max-w-xs space-y-1.5">
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                                    <span className="text-blue-600">مستوى الولاء: بلاتيني</span>
                                    <span className="text-gray-400">85% نحو الجائزة القادمة</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full p-px">
                                    <div className="h-full bg-linear-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📱 Grid of Details */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                    {/* Contact Stats Column */}
                    <div className="lg:col-span-1 space-y-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                            <h5 className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Phone size={9} className="text-blue-500" /> قنوات التواصل
                            </h5>
                            
                            <div className="space-y-2">
                                <SocialContactItem icon={Phone} label="رقم الموبايل" value={booking.clientPhone} color="blue" />
                                <SocialContactItem icon={MessageCircle} label="واتساب" value={booking.clientPhone} color="emerald" />
                                <SocialContactItem icon={Mail} label="الإيميل" value={booking.clientEmail || 'غير متوفر'} color="blue" />
                                {booking.client_token && (
                                    <SocialContactItem 
                                        icon={ExternalLink} 
                                        label="بوابة العميل" 
                                        value={buildClientPortalUrl(booking.client_token)} 
                                        color="rose" 
                                    />
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm relative group">
                            <div className="flex items-center justify-between mb-2.5">
                                <h5 className="text-[8px] font-black text-gray-400 uppercase tracking-widest">إحصائيات التعامل</h5>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowAddExtraItemModal(true)}
                                        className="flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-[10px] font-bold transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                        إضافة خدمة
                                    </button>
                                    <button
                                        onClick={() => setShowTransactionModal(true)}
                                        className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-[10px] font-bold transition-colors"
                                    >
                                        <Coins className="w-3 h-3" />
                                        إضافة رصيد
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <MiniStat label="إجمالي الحجوزات" value={(allBookings.filter(b => b.clientId === booking.clientId).length || 1).toString()} icon={Calendar} />
                                <MiniStat label="إجمالي الإنفاق" value={formatMoney(allBookings.filter(b => b.clientId === booking.clientId).reduce((acc, b) => acc + b.totalAmount, 0) || booking.totalAmount, booking.currency)} icon={DollarSign} />
                            </div>
                        </div>
                    </div>

                    {/* Preferences & Bio Column */}
                    <div className="lg:col-span-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Personal Info / Events */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <h5 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Sparkles size={9} className="text-amber-500" /> معلومات الخدمة
                                </h5>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <InfoRow label="تاريخ الحجز" value={format(parseISO(booking.shootDate), 'dd MMMM yyyy', { locale: ar })} icon={Calendar} />
                                        <InfoRow label="نوع المناسبة" value={booking.category} icon={Star} />
                                        <InfoRow label="الباقة المختارة" value={booking.servicePackage} icon={Package} />
                                        <InfoRow label="الموقع" value={booking.details?.hallName || 'ستوديو فيلا حداد'} icon={MapPin} />
                                    </div>
                                </div>
                            </div>

                            {/* Preferences / Bio */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                <h5 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <ListChecks size={9} className="text-blue-500" /> التفضيلات والملاحظات
                                </h5>
                                <div className="space-y-3">
                                     <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                         <p className="text-[9px] font-black text-blue-600 uppercase mb-1.5">ستايل التصوير المفضل</p>
                                         <div className="flex flex-wrap gap-1.5">
                                             {['كلاسيك', 'سينمائي', 'إضاءة خافتة'].map(tag => (
                                                 <span key={tag} className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-full border border-blue-100">{tag}</span>
                                             ))}
                                         </div>
                                     </div>
                                     <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                         <p className="text-[9px] font-black text-gray-400 uppercase mb-1.5">ملاحظات العميل الخاصة</p>
                                         <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
                                             {booking.details?.notes || 'لا توجد ملاحظات إضافية لهذا العميل.'}
                                         </p>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Client Transaction History */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <ClientTransactionHistory
                                key={transactionRefreshKey}
                                clientId={booking.clientId}
                                clientName={booking.clientName}
                                currentUser={currentUser}
                                currency={booking.currency}
                                compact
                            />
                        </div>
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'logistics' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2">
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 mb-5 flex items-center gap-3"><ListChecks className="text-amber-500" size={18} /> التفاصيل واللوجستيات</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 font-bold">
                            {booking.details?.hallName && <InfoItem label="القاعة" value={booking.details.hallName} icon={<Building size={14}/>} color="blue" />}
                            {booking.details?.university && <InfoItem label="الجامعة" value={booking.details.university} icon={<Building size={14}/>} color="amber" />}
                            {booking.details?.gownColor && <InfoItem label="الرداء" value={booking.details.gownColor} icon={<Shirt size={14}/>} color="emerald" />}
                            <InfoItem label="تاريخ التنفيذ" value={booking.shootDate} icon={<Calendar size={14}/>} color="blue" />
                            <InfoItem label="وقت البدء" value={booking.details?.startTime || '--:--'} icon={<Clock size={14}/>} color="amber" />
                            <InfoItem label="وقت الانتهاء" value={booking.details?.endTime || '--:--'} icon={<Clock size={14}/>} color="rose" />
                        </div>
                        
                        <div className="space-y-3 pt-6 border-t border-gray-100">
                            <CheckItem label="توقيع العقد الرقمي" done={true} />
                            <CheckItem label="استلام العربون التأكيدي" done={true} />
                            <CheckItem label="اكتمال جلسة التصوير" done={booking.status !== BookingStatus.INQUIRY && booking.status !== BookingStatus.CONFIRMED} />
                            <CheckItem label="تجهيز مساحة العمل والفرز" done={booking.status === BookingStatus.EDITING || booking.status === BookingStatus.SELECTION || booking.status === BookingStatus.DELIVERED} />
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    {isOutdoor && (
                        <div className="bg-white rounded-2xl p-5 border border-amber-500/10 shadow-sm relative overflow-hidden">
                            <h4 className="text-xs font-black text-amber-600 mb-5 flex items-center gap-2"><Sun size={14} /> حالة الطقس المتوقعة</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-xl font-black text-gray-900">{booking.details?.weather?.temp || 24}°</p><p className="text-[7px] font-black text-gray-400 uppercase">درجة الحرارة</p></div>
                                <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-[10px] font-black text-gray-900">{booking.details?.weather?.condition || 'صافي'}</p><p className="text-[7px] font-black text-gray-400 uppercase">الحالة</p></div>
                            </div>
                            <div className="mt-3 p-3 bg-amber-50 rounded-xl flex items-center justify-between border border-amber-100">
                                <div><p className="text-[10px] font-black text-amber-700">ساعة ذهبية</p><p className="text-base font-black text-gray-900">{booking.details?.weather?.sunset || '17:45'}</p></div>
                                <Sunset size={28} className="text-amber-500" />
                            </div>
                        </div>
                    )}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs font-black text-gray-400 mb-4 uppercase">موقع التصوير</h4>
                        {booking.location ? (
                            <a href={booking.location} target="_blank" className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all group" rel="noreferrer">
                                <div className="p-2 bg-blue-500 rounded-xl text-white shadow-sm"><MapPin size={20} /></div>
                                <span className="text-xs font-black text-blue-600">فتح في خرائط جوجل</span>
                            </a>
                        ) : (
                            <p className="text-xs text-gray-400 font-bold italic">لا يوجد رابط موقع محدد لهذا الحجز</p>
                        )}
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'financials' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2">
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-3"><Wallet className="text-emerald-500" size={18} /> الحالة المالية</h3>
                            {remainingBalance > 0 && <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100">بانتظار التسوية</span>}
                        </div>

                        {/* سعر الجلسة الأساسي + الخدمات الإضافية */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <FinancialStat 
                                label="سعر الجلسة الأساسي" 
                                value={formatMoney(booking.details?.baseAmount || booking.totalAmount, booking.currency)} 
                                color="text-blue-600" 
                            />
                            {booking.details?.extraItems && booking.details.extraItems.length > 0 && (
                                <FinancialStat 
                                    label="الخدمات الإضافية" 
                                    value={formatMoney(
                                        booking.details.extraItems.reduce((sum, item) => sum + (item.amount || 0), 0),
                                        booking.currency
                                    )} 
                                    color="text-purple-600" 
                                />
                            )}
                        </div>

                        {/* الإجمالي + المدفوع + المتبقي */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                            <FinancialStat label="المبلغ الواصل" value={formatMoney(booking.totalAmount, booking.currency)} color="text-gray-900" />
                            <FinancialStat label="المدفوع" value={formatMoney(booking.paidAmount, booking.currency)} color="text-emerald-600" />
                            <FinancialStat label="المتبقي" value={formatMoney(remainingBalance, booking.currency)} color={remainingBalance > 0 ? "text-rose-600" : "text-gray-400"} />
                        </div>

                        {/* قائمة الخدمات الإضافية */}
                        {booking.details?.extraItems && booking.details.extraItems.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-purple-400 uppercase mb-2">الخدمات الإضافية</p>
                                {booking.details.extraItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                        <span className="text-xs font-black text-purple-700">{item.description}</span>
                                        <span className="text-xs font-black text-purple-900">
                                          +{formatMoney(item.amount, item.currency || booking.currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm font-bold">
                        <h4 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">إحصائيات الإيراد</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[11px]"><span className="text-gray-500">نسبة التحصيل</span><span className="text-emerald-600">{Math.round((booking.paidAmount/booking.totalAmount)*100)}%</span></div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(booking.paidAmount/booking.totalAmount)*100}%` }}></div></div>
                            <p className="text-[9px] text-gray-400 leading-relaxed font-bold">تم تحصيل العربون وتأكيد الحجز مالياً في نظام الحسابات المركزي.</p>
                        </div>
                    </div>

                    {/* Receipt Printing */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm font-bold">
                        <h4 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <Printer size={12} />
                            طباعة وصل استلام
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => printReceipt({
                                    booking,
                                    type: 'deposit',
                                    amount: booking.paidAmount,
                                    currency: booking.currency,
                                    description: 'عربون تأكيد الحجز',
                                })}
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black transition-colors border border-emerald-100"
                            >
                                <Printer size={11} />
                                العربون
                            </button>
                            <button
                                onClick={() => printReceipt({
                                    booking,
                                    type: 'full',
                                    amount: booking.totalAmount,
                                    currency: booking.currency,
                                    description: 'استلام المبلغ الكامل',
                                })}
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black transition-colors border border-blue-100"
                            >
                                <Printer size={11} />
                                كامل
                            </button>
                            <button
                                onClick={() => printReceipt({
                                    booking,
                                    type: 'addon',
                                    amount: (booking as any).addOnTotal || 0,
                                    currency: booking.currency,
                                    description: 'مبلغ الخدمات الإضافية',
                                })}
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black transition-colors border border-purple-100"
                            >
                                <Printer size={11} />
                                إضافي
                            </button>
                            <button
                                onClick={() => printReceipt({
                                    booking,
                                    type: 'partial',
                                    amount: remainingBalance > 0 ? booking.paidAmount : booking.totalAmount,
                                    currency: booking.currency,
                                    description: `دفعة جزئية - ${formatMoney(booking.paidAmount, booking.currency)} من ${formatMoney(booking.totalAmount, booking.currency)}`,
                                })}
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black transition-colors border border-amber-100"
                            >
                                <Printer size={11} />
                                دفعة
                            </button>
                        </div>
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'workflow' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2 font-bold">
                <div className="lg:col-span-2 space-y-3">
                    {/* Session Selection Card */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2.5"><Grid3X3 className="text-rose-600" size={16} /> اختيار الصور</h3>
                            <button
                                onClick={() => setShowSelectionModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black transition-colors border border-rose-100"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                فتح مود الاختيار
                            </button>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-3">
                             <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center"><Grid3X3 size={24} /></div>
                             <div className="space-y-1">
                                <p className="text-sm font-black text-gray-900">إدارة الجلسة واختيار الصور</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">رفع، عرض، واختيار الصور</p>
                             </div>
                             <button
                                onClick={() => setShowSelectionModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-colors shadow-sm"
                             >
                                <Grid3X3 size={14} />
                                فتح لوحة الاختيار
                             </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
                        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2.5"><HardDrive className="text-indigo-600" size={16} /> المجلد وسيرفر التخزين</h3>
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-3">
                             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center"><HardDrive size={24} /></div>
                             <div className="space-y-1">
                                <p className="text-sm font-black text-gray-900">مسار المجلد: {booking.folderPath || 'لم يتم الربط'}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{booking.nasStatus === 'synced' ? 'تمت المزامنة بالكامل' : 'قيد المزامنة'}</p>
                             </div>
                             <div className="h-1.5 w-48 bg-gray-200 rounded-full mx-auto overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${booking.nasProgress || 0}%` }}></div></div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2.5"><Clock className="text-amber-500" size={16} /> سجل سير العمل (تاريخ الحالات)</h3>
                        <div className="max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            <div className="space-y-3 relative before:absolute before:inset-y-0 before:right-[9px] before:w-px before:bg-gray-100">
                                {booking.statusHistory && booking.statusHistory.length > 0 ? (
                                    [...booking.statusHistory].reverse().map((h, i) => (
                                        <div key={i} className="relative pr-6">
                                            <div className="absolute right-0 top-1 w-5 h-5 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center z-10 shadow-sm">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-[9px] font-black text-amber-600 font-tajawal">{StatusLabels[h.status]}</span>
                                                    <span className="text-[8px] font-black text-gray-400">{format(parseISO(h.timestamp), 'yyyy/MM/dd - HH:mm', { locale: ar })}</span>
                                                </div>
                                                {h.notes && <p className="text-[9px] text-gray-500 font-bold">{h.notes}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-gray-400 font-bold italic py-4 text-center">لا يوجد سجل حركات حالياً</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2.5"><Bell className="text-blue-500" size={16} /> التذكيرات والملاحظات</h3>
                        <div className="space-y-2">
                            {reminders.length === 0 ? (
                                <p className="text-[10px] text-gray-400 font-bold italic py-2 text-center">لا توجد تذكيرات مجدولة</p>
                            ) : (
                                reminders.map(r => (
                                    <div key={r.id} className={`flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 ${r.completed ? 'opacity-50' : ''}`}>
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${r.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {r.completed ? <Check size={14} /> : <Bell size={14} />}
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black text-gray-800 ${r.completed ? 'line-through' : ''}`}>{r.title}</p>
                                            <p className="text-[7px] text-gray-400 uppercase">{r.dueDate}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
             </div>
          )}
      </div>

     {/* Client Transaction Modal */}
     <ClientTransactionModal
       isOpen={showTransactionModal}
       onClose={() => setShowTransactionModal(false)}
       clientId={booking.clientId}
       clientName={booking.clientName}
       bookingId={booking.id}
       currentUser={currentUser}
       currency={booking.currency}
       onTransactionAdded={() => setTransactionRefreshKey((prev: number) => prev + 1)}
      />

      {/* Add Extra Item Modal */}
      <AddExtraItemModal
        isOpen={showAddExtraItemModal}
        onClose={() => setShowAddExtraItemModal(false)}
        onAdd={handleAddExtraItem}
        bookingCurrency={booking.currency}
      />

      {/* Session Selection Modal */}
      <SelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        bookingId={booking.id}
        clientName={booking.clientName}
        onComplete={() => {
          toast.success('تم اكتمال اختيار الصور');
          setShowSelectionModal(false);
        }}
      />
    </div>
  );
};

// --- Subcomponents (Light Theme Versions) ---

const SocialContactItem = ({ icon: Icon, label, value, color, isWhatsApp }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    };

    return (
        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 group/social hover:bg-gray-100 transition-all font-bold">
            <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg ${colors[color] || colors.blue}`}>
                    <Icon size={12} />
                </div>
                <div className="min-w-0">
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5">{label}</p>
                    <p className="text-[10px] font-black text-gray-900 truncate" dir="ltr">{value}</p>
                </div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(value); }} className="p-1 text-gray-400 hover:text-gray-900 rounded-lg opacity-0 group-hover/social:opacity-100">
                <Copy size={10} />
            </button>
        </div>
    );
};

const MiniStat = ({ label, value, icon: Icon }: any) => (
    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex flex-col items-center text-center font-bold">
        <Icon size={12} className="text-gray-400 mb-1" />
        <p className="text-[9px] font-black text-gray-900 font-mono">{value}</p>
        <p className="text-[6px] font-black text-gray-400 uppercase tracking-tighter leading-none">{label}</p>
    </div>
);

const InfoRow = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center gap-2 font-bold">
        <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
            <Icon size={12} />
        </div>
        <div>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5">{label}</p>
            <p className="text-[10px] font-black text-gray-700">{value}</p>
        </div>
    </div>
);

const ActivityRow = ({ icon: Icon, title, date, status, isMissed, color }: any) => {
    const colorClasses: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100'
    };
    return (
        <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all group/activity font-bold">
            <div className={`p-2 rounded-lg ${isMissed ? 'bg-rose-50 text-rose-500' : 'bg-gray-100 text-gray-500'}`}>
                <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-800 truncate">{title}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase">{date}</p>
            </div>
            <div className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isMissed ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                {status}
            </div>
        </div>
    );
};

const FinancialStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-inner flex flex-col items-center justify-center font-bold">
        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-base font-black ${color} truncate max-w-full`}>{value}</p>
    </div>
);

const InfoItem = ({ label, value, icon, color }: { label: string, value: string, icon: any, color: 'blue' | 'amber' | 'emerald' | 'rose' }) => {
    const iconColors: any = {
        blue: 'text-blue-600 bg-blue-50',
        amber: 'text-amber-600 bg-amber-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        rose: 'text-rose-600 bg-rose-50'
    };
    return (
        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2.5 shadow-inner">
           <div className={`p-1.5 rounded-lg ${iconColors[color]}`}>{icon}</div>
           <div className="min-w-0">
             <p className="text-[8px] font-black text-gray-400 uppercase truncate">{label}</p>
             <p className="text-[11px] font-black text-gray-900 truncate">{value}</p>
           </div>
        </div>
    );
};

const CheckItem = ({ label, done }: { label: string, done: boolean }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${done ? 'border-emerald-100 bg-emerald-50/50' : 'border-gray-100 bg-gray-50'}`}>
    {done ? (
      <div className="h-5 w-5 rounded-md bg-emerald-500 flex items-center justify-center shadow-sm"><Check size={12} className="text-white" strokeWidth={4} /></div>
    ) : (
      <div className="h-5 w-5 rounded-md border-2 border-gray-200" />
    )}
    <span className={`text-[11px] font-black ${done ? 'text-emerald-700' : 'text-gray-400'}`}>{label}</span>
  </div>
);

export default ManagerBookingDetailsView;
