import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phone: string;
  clientName: string;
  bookingDate: string;
  amount: number;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  clientName,
  bookingDate,
  amount,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (!cleanPhone.startsWith('964')) cleanPhone = '964' + cleanPhone;

    const message = `مرحبا ${clientName}،
تأكيد حجزك بتاريخ ${bookingDate}.
المبلغ الكلي: ${amount.toLocaleString()} د.ع.
شكراً لاختياركم فيلا حداد.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    // Use Integrated WhatsApp Window (Electron)
    if ((window as any).electronAPI && (window as any).electronAPI.openWhatsApp) {
      (window as any).electronAPI.openWhatsApp(url);
    } else {
      // Fallback for web browser mode
      window.open(url, '_blank');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center group"
      title="إرسال تأكيد عبر واتساب"
    >
      <MessageCircle size={18} fill="white" className="text-green-500" />
    </button>
  );
};

export default WhatsAppButton;
