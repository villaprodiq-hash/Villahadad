import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Wand2, Sparkles, Copy, RefreshCw, Send, Check } from 'lucide-react';
import { electronBackend } from '../services/mockBackend';
import { BookingStatus } from '../types';
import Draggable from 'react-draggable';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  bookingStatus: BookingStatus;
  outstandingAmount: number;
  onSend?: (text: string) => void;
}

const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ 
  isOpen, 
  onClose, 
  clientName, 
  bookingStatus, 
  outstandingAmount,
  onSend
}) => {
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const nodeRef = useRef(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGeneratedText('');

    try {
      // Simulate AI Generation Context
      const promptContext = {
        clientName,
        bookingStatus,
        outstandingAmount
      };

      const response = await (electronBackend as unknown as { generateAiMessage: (context: unknown) => Promise<{ text: string }> }).generateAiMessage(promptContext);

      // Typewriter effect simulation
      let currentText = '';
      const fullText = response.text || '';
      const chars = String(fullText).split('');

      // Clear interval if exists from previous run (in a real app)
      // For simplicity, we just loop with delay
      for (let i = 0; i < chars.length; i++) {
        await new Promise(r => setTimeout(r, 15)); // Typing speed
        currentText += chars[i];
        setGeneratedText(currentText);
      }

    } catch (error) {
      setGeneratedText('عذراً، حدث خطأ أثناء توليد الرسالة.');
    } finally {
      setIsGenerating(false);
    }
  }, [bookingStatus, clientName, outstandingAmount]);

  useEffect(() => {
    if (isOpen) {
      void handleGenerate();
    } else {
      setGeneratedText('');
      setCopied(false);
    }
  }, [isOpen, handleGenerate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300">
      <Draggable nodeRef={nodeRef} handle=".modal-header">
        <div ref={nodeRef} className="bg-[#1E1E1E] border border-purple-500/30 w-full max-w-2xl rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden animate-in fade-in duration-300 ring-1 ring-white/5">
          
          {/* Header */}
          <div className="modal-header cursor-move bg-linear-to-l from-[#2e1065] via-[#1E1E1E] to-[#1E1E1E] p-6 flex items-center gap-4 border-b border-white/5 relative overflow-hidden">
            {/* Decorative Glow */}
            <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none" />

            <div className="p-3 bg-linear-to-br from-purple-500 to-blue-600 rounded-xl text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] relative z-10">
              <Wand2 size={24} />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                المساعد الذكي
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">AI BETA</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">توليد رسائل احترافية بناءً على سياق الحجز</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors relative z-10">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            
            {/* Context Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-500 mb-4">
               <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 flex items-center gap-2">
                 العميل: <span className="text-gray-300">{clientName}</span>
               </span>
               <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 flex items-center gap-2">
                 الحالة: <span className="text-gray-300">{bookingStatus}</span>
               </span>
               {outstandingAmount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                    مستحق: <span className="font-bold">${outstandingAmount}</span>
                  </span>
               )}
            </div>

            {/* AI Output Area */}
            <div className="relative min-h-[180px] bg-black/40 rounded-xl border border-white/10 p-6 shadow-inner group">
               {/* Text Content */}
               <p className="text-gray-200 leading-relaxed text-lg font-light whitespace-pre-wrap">
                 {generatedText}
                 {isGenerating && <span className="inline-block w-2 h-5 bg-purple-500 ml-1 animate-pulse align-middle" />}
               </p>

               {/* Placeholder / Empty State */}
               {!generatedText && !isGenerating && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
                   <Sparkles size={32} className="opacity-20" />
                   <span className="text-sm">اضغط على زر التوليد للبدء...</span>
                 </div>
               )}

               {/* Actions Overlay */}
               {!isGenerating && generatedText && (
                 <div className="absolute bottom-4 left-4 flex gap-2">
                   <button 
                     onClick={handleCopy}
                     className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all flex items-center gap-2 text-xs font-bold backdrop-blur-md border border-white/5"
                   >
                     {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                     {copied ? 'تم النسخ' : 'نسخ النص'}
                   </button>
                 </div>
               )}
            </div>

          </div>

          {/* Footer */}
          <div className="p-6 bg-[#121212]/50 flex gap-4 justify-between items-center border-t border-white/5">
            <p className="text-[10px] text-gray-600 max-w-[50%]">
              يتم توليد المحتوى بواسطة AI وقد يحتاج إلى مراجعة قبل الإرسال.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-xl"
              >
                إغلاق
              </button>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2.5 text-sm font-bold bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/5 transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generatedText ? 'إعادة الصياغة' : 'توليد الرسالة'}
              </button>
              <button 
                 onClick={() => onSend?.(generatedText)}
                 disabled={!generatedText || isGenerating}
                 className="px-6 py-2.5 text-sm font-bold bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <Send size={16} />
                 إرسال للعميل
              </button>
            </div>
          </div>
        </div>
      </Draggable>
    </div>
  );
};

export default AiAssistantModal;
