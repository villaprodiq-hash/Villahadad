import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CheckCircle, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ManagerTopStatsBarProps {
  bookings: any[];
}

const ManagerTopStatsBar: React.FC<ManagerTopStatsBarProps> = ({ bookings = [] }) => {
    // Filter active (non-deleted) bookings only
    const activeBookings = bookings.filter(b => !b.deletedAt);

    // Calculate Stats from Real Data
    const totalSessions = activeBookings.length;
    const completedWorks = activeBookings.filter(b => b.status === 'delivered' || b.status === 'completed').length;
    const totalClients = new Set(activeBookings.map(b => b.clientName)).size;

    // Calculate Categories for Progress Pills
    const categories = activeBookings.reduce((acc: any, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
    }, {});
    
    // Normalize category counts to percentages (mock logic for demo purposes, can be refined)
    const getPercent = (count: number) => count ? Math.round((count / totalSessions) * 100) + '%' : '0%';

    // Villa = category 'Location', Sura = everything else
    const villaCount = Object.entries(categories)
      .filter(([key]) => key.toLowerCase() === 'location')
      .reduce((sum, [, count]) => sum + (count as number), 0);
    const suraCount = totalSessions - villaCount;

    const progressItems = [
      { label: 'جلسات سرى', value: getPercent(suraCount), color: 'bg-gray-900 text-white' },
      { label: 'حجوزات فيلا', value: getPercent(villaCount), color: 'bg-amber-200 text-amber-900' },
      { label: 'الطباعة', value: '---', color: 'bg-gray-100 text-gray-600' },
      { label: 'قسم الفوتوشوب', value: '---', color: 'bg-gray-100 text-gray-600' },
      { label: 'المالية', value: '---', color: 'bg-green-100 text-green-700' },
    ];
  
    // ويدجت الآية القرآنية (Quran Verse Widget)
    const QuranVerseWidget = () => {
      const [isVisible, setIsVisible] = useState(true);
      const [verse, setVerse] = useState('');
  
      const verses = [
        "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
        "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
        "وَاصْبِرْ لِحُكْمِ رَبِّكَ فَإِنَّكَ بِأَعْيُنِنَا",
        "وَفِي السَّمَاءِ رِزْقُكُمْ وَمَا تُوعَدُونَ",
        "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ",
        "قُل لَّن يُصِيبَنَا إِلَّا مَا كَتَبَ اللَّهُ لَنَا",
        "رَبِّ اشْرَحْ لِي صَدْرِي * وَيَسِّرْ لِي أَمْرِي",
        "وَأُفَوِّضُ أَمْرِي إِلَى اللَّهِ ۚ إِنَّ اللَّهَ بَصِيرٌ بِالْعِبَادِ",
        "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ",
        "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
        "وَقُل رَّبِّ زِدْنِي عِلْمًا",
        "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
        "وَاللَّهُ يَرْزُقُ مَن يَشَاءُ بِغَيْرِ حِسَابٍ",
        "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
        "إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ",
        "فَبَشِّرِ الصَّابِرِينَ",
        "لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا",
        "وَتَوَكَّلْ عَلَى الْحَيِّ الَّذِي لَا يَمُوتُ",
        "وَقَالُوا الْحَمْدُ لِلَّهِ الَّذِي أَذْهَبَ عَنَّا الْحَزَنَ",
        "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ"
      ];
  
      const [showClock, setShowClock] = useState(false);
      const [currentTime, setCurrentTime] = useState(new Date());
  
      useEffect(() => {
        // Select random verse on mount
        const randomVerse = verses[Math.floor(Math.random() * verses.length)];
        setVerse(randomVerse);
  
        // Hide verse and show clock after 5 seconds
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => setShowClock(true), 800); // Wait for verse exit animation
        }, 5000);
  
        const clockInterval = setInterval(() => {
          setCurrentTime(new Date());
        }, 1000);
  
        return () => {
          clearTimeout(timer);
          clearInterval(clockInterval);
        };
      }, []);
  
      return (
        <div className="flex flex-col items-center justify-center absolute left-1/2 top-0 -translate-x-1/2 h-full w-auto min-w-[300px]">
          <AnimatePresence mode="wait">
            {isVisible ? (
              <motion.div
                key="verse"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                 <div className="bg-linear-to-r from-amber-500/10 to-transparent p-4 rounded-full blur-xl absolute inset-0" />
                 <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-amber-600 to-amber-800 font-quran relative z-10 leading-loose py-2 whitespace-nowrap">
                   {verse}
                 </h2>
              </motion.div>
            ) : (
              showClock && (
                <motion.div
                  key="clock"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1 }}
                  className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/10 shadow-xl"
                >
                  <div className="flex flex-col items-center">
                     <div className="text-2xl font-black text-gray-800 tracking-wider font-mono">
                        {format(currentTime, 'hh:mm:ss')}
                        <span className="text-sm ml-2 text-amber-600 font-bold uppercase">{format(currentTime, 'a')}</span>
                     </div>
                     <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">
                        {format(currentTime, 'EEEE, MMMM do')}
                     </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      );
    };
    
    return (
      <div className="mb-4 px-1 -mt-2 relative">
        
        <div className="flex items-center justify-between h-14 relative">
          {/* Progress Pills */}
          <div className="flex items-center gap-3">
            {progressItems.map((item, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
                <span className={`px-4 py-2 text-xs font-bold rounded-full ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          
          {/* Center: Dynamic Verse */}
          <QuranVerseWidget />
          
          {/* Stats */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="flex items-center gap-1 mb-1">
                <Camera size={16} className="text-gray-400" />
                <p className="text-4xl font-bold text-gray-900">{totalSessions}</p>
              </div>
              <p className="text-xs text-gray-400">عدد الجلسات</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle size={16} className="text-gray-400" />
                <p className="text-4xl font-bold text-gray-900">{completedWorks}</p>
              </div>
              <p className="text-xs text-gray-400">أعمال منجزة</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 mb-1">
                <Users size={16} className="text-gray-400" />
                <p className="text-4xl font-bold text-gray-900">{totalClients}</p>
              </div>
              <p className="text-xs text-gray-400">العملاء</p>
            </div>
          </div>
        </div>
      </div>
    );
};

export default ManagerTopStatsBar;
