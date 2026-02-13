import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Share2, User, Sparkles, Instagram, PenTool, Zap, PartyPopper, Settings, Save, X, RefreshCw, HeartHandshake, Wand2 } from 'lucide-react';

// --- 1. نصوص "بداية الخير" (دعاء + تحفيز) ---
const STARTUP_DB = [
  "بسم الله.. اللهم إني أسألك رزقاً واسعاً وعملاً متقبلاً 🤲",
  "سبحان الله وبحمده.. بداية موفقة بإذن الله ✨",
  "يا فتاح يا عليم، افتح لنا أبواب الخير.",
  "اللهم بارك في هذا اليوم واجعلنا من الموفقين.",
  "يوم جديد، فرصة جديدة للإبداع! 💪",
  "ثق بنفسك، لمساتك تصنع الفرق دائماً 📸",
  "أنت فنان، وشغلك يحجي عنك.. استمر!",
];

// --- 2. المكتبة العراقية الشاملة (النسخة الكاملة الدسمة) ---
const IRAQI_DB = {
  customer: {
    auto: [
      "يا هلا بيكم! نورتوا الاستوديو 🌸", 
      "على راسي، تدللون! أهم شي تطلعون راضين.", 
      "نورتونا اليوم، ان شاء الله تكون تجربة حلوة.", 
      "يا مية هلا، المكان مكانكم، اخذوا راحتكم.",
      "كل الهلا، نورتوا المكان بطلتكم الحلوة.",
      "حياكم الله، خطوة عزيزة وشرفتونا.",
      "أهلا وسهلا، الاستوديو نور بوجودكم.",
      "يا هلا ومرحبا، ان شاء الله نكون عند حسن ظنكم.",
      "هلا بيكم، نورتوا الاستوديو، تفضلوا استريحوا.",
      "اغاتي نورت، اي استفسار احنا موجودين.",
    ],
    new: [
      "أول مرة يمنا؟ يا هلا! نورتونا.", 
      "كل الهلا بيكم، شرفتونا باختياركم النا.",
      "يا هلا بالوجوه الجديدة، ان شاء الله نبيض وجهكم.",
      "بداية معرفة خير ان شاء الله، نورتوا.",
      "شرف كبير النا اختياركم لاستوديونا، تدللون.",
      "نورتوا الاستوديو، ان شاء الله تجربتكم ويانا تكون مميزة.",
    ],
    angry: [
      "حقكم علينا، والي يرضيكم يصير.", 
      "على راسي، امسحوها بينا.",
      "لا تضوجون ابد، حقكم يوصلكم وزيادة.",
      "أعتذر جداً، جل من لا يسهو، وتدللون.",
      "حقك وما يصير خاطرك الا طيب.",
      "ولا يهمك، اللي تريده يصير، أهم شي رضاتك.",
    ],
    vip: [
      "يا هلا بالغاليين، المكان منور بوجودكم.", 
      "زبائنا الذهب، الكم معاملة خاصة.",
      "عاش من شافكم، الاستوديو مشتاق لهيج طلة.",
      "يا مية هلا بالمعاميل الذهب، مكانكم بالقلب.",
      "اهلا باهل الذوق، نورتونا من جديد.",
    ]
  },
  social: {
    story: [
      "كواليس شغل اليوم نار 🔥", 
      "نتائج جلسة اليوم تخبل 😍", 
      "جمال الصور يحجي عن نفسه ✨",
      "كل صورة وراها قصة، وهاي قصة اليوم 📸",
      "من قلب الحدث.. كواليس جلسة تصوير تخبل.",
      "الابداع ماله حدود ويانا.. لقطات من اليوم.",
      "أجواء التصوير اليوم تجنن، شوفوا الجمال.",
      "لقطات عفوية من جلسة اليوم، شنو رأيكم؟",
      "الشغل الحلو يحتاج تعب، بس النتيجة تستاهل.",
    ],
    post: [
      "تفاصيل صغيرة تسوي فرق جبير 📸", 
      "توثيق ذكرياتكم مسؤوليتنا ❤️",
      "شكراً لثقتكم بينا، انتوا سبب نجاحنا.",
      "الصورة الحلوة تبقى ذكرى للعمر.",
      "تميز بلقطات احترافية تعكس شخصيتك.",
      "لأنكم تستاهلون الأفضل، نسعى دائماً للتميز.",
      "الذكرى الحلوة تبدي بصورة، والصورة الحلوة تبدي يمنا.",
      "كل صورة الها حكاية، خلينه نوثق حكايتكم.",
    ],
    birthday: [
      "سنة خير وسعادة يا رب! 🎂", 
      "ميلاد سعيد! 🥳",
      "كل عام وانتوا بألف خير ✨",
      "عيد ميلاد سعيد، يا رب تحقيق الاماني.",
      "اليوم عيد ميلاد شخص مميز، كل عام وانت بخير.",
      "سنة جديدة من عمرك، ان شاء الله تكون سنة خير.",
      "العمر كله فرح وسعادة وانجازات.",
    ]
  }
};

interface SmartAIWidgetProps {
  userName?: string;
  userGender?: 'male' | 'female';
  isManager?: boolean;
}

const SmartAIWidget: React.FC<SmartAIWidgetProps> = ({ userName = "المبدع", userGender = "male", isManager = false }) => {
  // ✅ التعديل هنا: الافتراضي صار 'customer'
  const [mode, setMode] = useState<'customer' | 'social'>('customer');
  const [displayedText, setDisplayedText] = useState('');
  const [copied, setCopied] = useState(false);
  
  // المتغيرات
  const [occasionInput, setOccasionInput] = useState('');
  const [selectedType, setSelectedType] = useState<'story' | 'post'>('story');
  
  // إعدادات الـ AI
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) { setApiKey(savedKey); setUseAI(true); }
    const randomMsg = STARTUP_DB[Math.floor(Math.random() * STARTUP_DB.length)];
    const greeting = `${randomMsg} \n(منور ${userGender === 'male' ? 'استاذ' : 'ست'} ${userName})`;
    typeText(greeting);
  }, []);

  const saveApiKey = () => {
      if (!apiKey.trim()) return;
      localStorage.setItem('gemini_api_key', apiKey);
      setUseAI(true);
      setShowSettings(false);
  };

  const typeText = (text: string) => {
    if (typingTimeoutRef.current) clearInterval(typingTimeoutRef.current);
    setDisplayedText(''); setCopied(false);
    let i = 0;
    const speed = 10;
    typingTimeoutRef.current = setInterval(() => {
      setDisplayedText((prev) => {
        if (i >= text.length) {
            if (typingTimeoutRef.current) clearInterval(typingTimeoutRef.current);
            return text;
        }
        return prev + text.charAt(i++);
      });
    }, speed);
  };

  const handleGenerateClick = () => {
      const topic = occasionInput.trim() ? occasionInput : "شي عام";
      generateContent(selectedType, topic);
  };

  const handleCustomerClick = (type: string) => {
      generateContent(type, "كلام مباشر لزبون");
  };

  const generateContent = async (category: string, topic: string) => {
    if (loading) return;
    if (useAI && apiKey) {
        setLoading(true);
        try {
            const userTitle = userGender === 'male' ? 'أخوكم المصور' : 'أختكم المصورة';
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ 
                        parts: [{ 
                            text: `أنت نظام توليد نصوص عراقي. المهمة: اكتب نصاً واحداً فقط.
                            المدخلات: النوع: ${mode === 'customer' ? 'كلام شفهي لزبون' : category} | الموضوع: ${topic}
                            القواعد: اكتب النص فقط. بدون مقدمات. جملة كاملة. لهجة بغدادية. الطول: سطر واحد.
                            ` 
                        }] 
                    }],
                    generationConfig: { temperature: 1.1, maxOutputTokens: 500 }
                })
            });
            if (!response.ok) throw new Error("API Error");
            const data = await response.json();
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const aiText = data.candidates[0].content.parts[0].text.trim().replace(/^["']|["']$/g, '');
                setLoading(false);
                typeText(aiText);
                return;
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    }
    const list = IRAQI_DB[mode][category] || IRAQI_DB.customer.auto;
    const randomText = list[Math.floor(Math.random() * list.length)];
    typeText(randomText);
  };

  const handleCopy = () => {
    if (!displayedText) return;
    navigator.clipboard.writeText(displayedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`w-full h-full ${isManager ? 'bg-[#1a1c22] rounded-xl border border-white/10 shadow-2xl' : 'bg-[#1e1e20] rounded-2xl p-3'} flex flex-col relative font-sans overflow-hidden group ${isManager ? 'p-4' : ''}`}>
      
      {/* Settings Modal */}
      {showSettings && (
          <div className="absolute inset-0 z-50 bg-[#1e1e20]/95 backdrop-blur-sm p-4 flex flex-col justify-center items-center text-right rounded-2xl">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><Sparkles className="text-[#F43F5E] w-4 h-4" /> إعدادات AI</h3>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key..." className="w-full bg-[#27272a] border border-white/10 rounded-lg p-2 text-white text-xs mb-3 focus:border-[#F43F5E] outline-none" />
              <div className="flex gap-2 w-full">
                  <button onClick={saveApiKey} className="flex-1 bg-[#F43F5E] text-white py-1.5 rounded-lg text-xs font-bold">حفظ</button>
                  <button onClick={() => setShowSettings(false)} className="px-3 bg-gray-700 text-white rounded-lg"><X size={14} /></button>
              </div>
          </div>
      )}

      {/* 1. Slim Header */}
      <div className="flex items-center justify-between mb-2 shrink-0 h-8">
        <div className="flex bg-[#27272a] p-0.5 rounded-lg border border-white/5">
            <button onClick={() => setMode('customer')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5 ${mode === 'customer' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                <User size={12} /> زبائن
            </button>
            <button onClick={() => setMode('social')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5 ${mode === 'social' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                <Share2 size={12} /> نشر
            </button>
        </div>
        <button onClick={() => setShowSettings(true)} className={`p-1.5 rounded-lg border transition-colors ${useAI ? 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]' : 'bg-[#27272a] border-white/5 text-gray-500'}`}>
            <Settings size={14} />
        </button>
      </div>

      {/* 2. Compact Content Area */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        
        {/* Input (يظهر فقط عند النشر) */}
        {mode === 'social' && (
            <div className="relative group shrink-0">
                <input 
                    type="text" 
                    value={occasionInput}
                    onChange={(e) => setOccasionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()} 
                    placeholder="المناسبة (مثلاً: ميلاد زينب)"
                    className="w-full bg-[#27272a] text-white text-[11px] rounded-lg py-2 px-3 pr-8 outline-none border border-white/5 focus:border-[#F43F5E] focus:bg-[#3f3f46] transition-all placeholder-gray-500 text-right shadow-inner h-8"
                />
                <PenTool className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 group-focus-within:text-[#F43F5E]" />
            </div>
        )}

        {/* Display Screen */}
        <div onClick={handleCopy} className="flex-1 bg-[#151516] rounded-xl border border-white/5 relative cursor-pointer group hover:border-[#F43F5E]/30 transition-all p-3 flex items-center justify-center text-center overflow-y-auto custom-scrollbar">
            <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-gray-500" />}
            </div>
            {loading ? (
                <div className="flex flex-col items-center gap-1 text-[#F43F5E] text-[10px] font-medium animate-pulse">
                    <RefreshCw size={16} className="animate-spin" /> 
                    <span>جاري الكتابة...</span>
                </div>
            ) : (
                <p className={`text-xs font-medium leading-relaxed dir-rtl ${mode === 'social' ? 'text-blue-50' : 'text-gray-100'}`}>
                    "{displayedText}"
                </p>
            )}
        </div>

        {/* 3. Small Footer Buttons */}
        {mode === 'social' ? (
            <div className="grid grid-cols-3 gap-1.5 shrink-0 h-9">
                 <button onClick={() => setSelectedType('story')} className={`rounded-lg flex items-center justify-center gap-1.5 transition-all border ${selectedType === 'story' ? 'bg-[#3f3f46] border-[#F43F5E] text-[#F43F5E]' : 'bg-[#27272a] border-white/5 text-gray-400 hover:bg-[#3f3f46]'}`}>
                    <Instagram size={14} /> <span className="text-[10px] font-bold">ستوري</span>
                </button>
                <button onClick={() => setSelectedType('post')} className={`rounded-lg flex items-center justify-center gap-1.5 transition-all border ${selectedType === 'post' ? 'bg-[#3f3f46] border-blue-500 text-blue-500' : 'bg-[#27272a] border-white/5 text-gray-400 hover:bg-[#3f3f46]'}`}>
                    <Share2 size={14} /> <span className="text-[10px] font-bold">بوست</span>
                </button>
                <button onClick={handleGenerateClick} disabled={loading} className="bg-[#F43F5E] hover:bg-[#be123c] text-white rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95">
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />} 
                    <span className="text-[10px] font-bold">إنشاء</span>
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-1.5 shrink-0 h-16">
                <button onClick={() => handleCustomerClick('auto')} className="bg-[#27272a] hover:bg-[#3f3f46] border border-white/5 hover:border-[#F43F5E]/50 text-white rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all">
                    <Zap size={12} className="text-[#F43F5E]" /> <span className="text-[9px] font-bold">ترحيب</span>
                </button>
                <button onClick={() => handleCustomerClick('new')} className="bg-[#27272a] hover:bg-[#3f3f46] border border-white/5 hover:border-blue-500/50 text-white rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all">
                    <Sparkles size={12} className="text-blue-500" /> <span className="text-[9px] font-bold">جديد</span>
                </button>
                <button onClick={() => handleCustomerClick('angry')} className="bg-[#27272a] hover:bg-[#3f3f46] border border-white/5 hover:border-red-500/50 text-white rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all">
                    <HeartHandshake size={12} className="text-red-500" /> <span className="text-[9px] font-bold">اعتذار</span>
                </button>
                <button onClick={() => handleCustomerClick('vip')} className="bg-[#27272a] hover:bg-[#3f3f46] border border-white/5 hover:border-amber-500/50 text-white rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all">
                    <PartyPopper size={12} className="text-amber-500" /> <span className="text-[9px] font-bold">VIP</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SmartAIWidget;