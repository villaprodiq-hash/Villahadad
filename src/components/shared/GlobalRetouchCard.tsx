import React, { useState } from 'react';
import { RetouchPreferences, RetouchStyle } from '../../types';
import { Palette, Sparkles } from 'lucide-react';

interface GlobalRetouchCardProps {
  preferences?: RetouchPreferences;
  onSave: (preferences: RetouchPreferences) => void;
}

const GlobalRetouchCard: React.FC<GlobalRetouchCardProps> = ({ preferences, onSave }) => {
  
  const [localPrefs, setLocalPrefs] = useState<RetouchPreferences>(preferences || {
    style: 'Natural',
    globalTeethWhitening: false,
    globalSkinSmoothing: false,
    globalBodySlimming: false,
    notes: ''
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  
  const handleStyleChange = (style: RetouchStyle) => {
    setLocalPrefs({ ...localPrefs, style });
    setHasChanges(true);
  };
  
  const handleToggle = (field: keyof RetouchPreferences) => {
    setLocalPrefs({ ...localPrefs, [field]: !localPrefs[field] });
    setHasChanges(true);
  };
  
  const handleNotesChange = (notes: string) => {
    setLocalPrefs({ ...localPrefs, notes });
    setHasChanges(true);
  };
  
  const handleSave = () => {
    onSave(localPrefs);
    setHasChanges(false);
  };
  
  return (
    <div className="bg-[#21242b] rounded-[2rem] p-6 shadow-[10px_10px_20px_#16181d,-10px_-10px_20px_#2c3039] border border-white/5">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Palette size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">تفضيلات التعديل العامة</h3>
            <p className="text-[10px] text-gray-500">الإعدادات الأساسية للألبوم كامل</p>
          </div>
        </div>
        
        {hasChanges && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition-all"
          >
            حفظ التغييرات
          </button>
        )}
      </div>
      
      {/* Style Selection */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 mb-3">أسلوب التعديل</label>
        <div className="grid grid-cols-3 gap-3">
          {(['Natural', 'Sura Style', 'Custom'] as RetouchStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => handleStyleChange(style)}
              className={`p-3 rounded-xl border-2 transition-all text-xs font-bold ${
                localPrefs.style === style
                  ? 'bg-pink-500/20 border-pink-500 text-pink-500'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {style === 'Natural' ? 'طبيعي' : style === 'Sura Style' ? 'أسلوب سورة' : 'مخصص'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Global Fixes */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 mb-3">التعديلات العامة</label>
        <div className="space-y-3">
          
          {/* Teeth Whitening */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400" />
              <span className="text-xs font-bold text-white">تبييض الأسنان</span>
            </div>
            <button
              onClick={() => handleToggle('globalTeethWhitening')}
              className={`w-12 h-6 rounded-full relative transition-all ${
                localPrefs.globalTeethWhitening ? 'bg-pink-500' : 'bg-gray-700'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                localPrefs.globalTeethWhitening ? 'left-[calc(100%-22px)]' : 'left-0.5'
              }`} />
            </button>
          </div>
          
          {/* Skin Smoothing */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span className="text-xs font-bold text-white">تنعيم البشرة</span>
            </div>
            <button
              onClick={() => handleToggle('globalSkinSmoothing')}
              className={`w-12 h-6 rounded-full relative transition-all ${
                localPrefs.globalSkinSmoothing ? 'bg-pink-500' : 'bg-gray-700'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                localPrefs.globalSkinSmoothing ? 'left-[calc(100%-22px)]' : 'left-0.5'
              }`} />
            </button>
          </div>
          
          {/* Body Slimming */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-pink-400" />
              <span className="text-xs font-bold text-white">تنحيف الجسم</span>
            </div>
            <button
              onClick={() => handleToggle('globalBodySlimming')}
              className={`w-12 h-6 rounded-full relative transition-all ${
                localPrefs.globalBodySlimming ? 'bg-pink-500' : 'bg-gray-700'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
                localPrefs.globalBodySlimming ? 'left-[calc(100%-22px)]' : 'left-0.5'
              }`} />
            </button>
          </div>
          
        </div>
      </div>
      
      {/* Notes */}
      <div>
        <label className="block text-xs font-bold text-gray-400 mb-2">ملاحظات عامة</label>
        <textarea
          value={localPrefs.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="أي تعليمات إضافية للمصمم..."
          className="w-full h-24 px-4 py-3 bg-[#1a1c22] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 resize-none"
        />
      </div>
      
    </div>
  );
};

export default GlobalRetouchCard;
