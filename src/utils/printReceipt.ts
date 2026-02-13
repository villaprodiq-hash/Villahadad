import { Booking, Currency } from '../types';
import { formatMoney } from './formatMoney';

export type ReceiptType = 'deposit' | 'addon' | 'full' | 'partial';

interface ReceiptData {
  booking: Booking;
  type: ReceiptType;
  amount: number;
  currency: Currency;
  description?: string;
  receivedBy?: string;
  date?: string;
}

const getReceiptTypeLabel = (type: ReceiptType): string => {
  switch (type) {
    case 'deposit': return 'وصل استلام عربون';
    case 'addon': return 'وصل استلام مبلغ إضافي';
    case 'full': return 'وصل استلام المبلغ الكامل';
    case 'partial': return 'وصل استلام دفعة';
    default: return 'وصل استلام';
  }
};

export const printReceipt = (data: ReceiptData) => {
  const {
    booking,
    type,
    amount,
    currency,
    description,
    receivedBy = 'فيلا حداد',
    date = new Date().toISOString(),
  } = data;

  const receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;
  const formattedDate = new Date(date).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = new Date(date).toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const remaining = booking.totalAmount - booking.paidAmount;
  const isVilla = (booking.category || '').toLowerCase() === 'location' ||
    (booking.title || '').toLowerCase().includes('فيلا') ||
    (booking.title || '').toLowerCase().includes('villa');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>${getReceiptTypeLabel(type)} - ${booking.clientName}</title>
<style>
  @page {
    size: A5 portrait;
    margin: 10mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    color: #1a1a2e;
    background: #fff;
    font-size: 11px;
    line-height: 1.5;
    width: 148mm;
    min-height: 210mm;
    padding: 8mm;
  }

  .receipt-container {
    border: 2px solid #1a1a2e;
    border-radius: 12px;
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .receipt-header {
    text-align: center;
    padding-bottom: 12px;
    border-bottom: 2px solid #1a1a2e;
    margin-bottom: 12px;
  }
  .receipt-logo {
    font-size: 24px;
    font-weight: 900;
    color: #1a1a2e;
    margin-bottom: 2px;
  }
  .receipt-logo span { color: #e11d48; }
  .receipt-subtitle {
    font-size: 9px;
    color: #888;
    font-weight: 600;
  }
  .receipt-type {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 16px;
    background: #1a1a2e;
    color: #fff;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 800;
  }

  /* Receipt Info */
  .receipt-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    font-size: 9px;
    color: #666;
  }
  .receipt-meta .receipt-num {
    font-family: monospace;
    font-weight: 700;
    font-size: 10px;
    color: #1a1a2e;
  }

  /* Client Info */
  .client-section {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 14px;
    border: 1px solid #e5e7eb;
  }
  .client-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .client-row:last-child { margin-bottom: 0; }
  .client-label {
    font-size: 9px;
    color: #888;
    font-weight: 700;
  }
  .client-value {
    font-size: 10px;
    font-weight: 800;
    color: #1a1a2e;
  }

  /* Amount Section */
  .amount-section {
    text-align: center;
    padding: 16px;
    margin: 14px 0;
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
    border: 2px solid #059669;
    border-radius: 12px;
  }
  .amount-label {
    font-size: 10px;
    color: #059669;
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .amount-value {
    font-size: 28px;
    font-weight: 900;
    color: #059669;
    direction: ltr;
  }
  .amount-desc {
    font-size: 9px;
    color: #666;
    margin-top: 4px;
    font-weight: 600;
  }

  /* Financial Details */
  .financial-details {
    margin: 14px 0;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }
  .fin-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 10px;
    border-bottom: 1px solid #f0f0f0;
  }
  .fin-row:last-child { border-bottom: none; }
  .fin-row.total-row {
    background: #f8f9fa;
    font-weight: 900;
    font-size: 11px;
  }
  .fin-label { color: #666; font-weight: 700; }
  .fin-value { font-weight: 800; color: #1a1a2e; font-family: monospace; }
  .fin-value.paid { color: #059669; }
  .fin-value.remaining { color: #dc2626; }

  /* Signatures */
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 20px;
  }
  .sig-box {
    text-align: center;
    width: 40%;
  }
  .sig-line {
    border-top: 1px solid #ccc;
    margin-top: 30px;
    padding-top: 4px;
    font-size: 9px;
    color: #888;
    font-weight: 700;
  }

  /* Footer */
  .receipt-footer {
    text-align: center;
    padding-top: 10px;
    border-top: 1px dashed #ccc;
    margin-top: 14px;
    font-size: 8px;
    color: #aaa;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt-container { border-color: #1a1a2e; }
  }
</style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <div class="receipt-logo">فيلا <span>حداد</span></div>
      <div class="receipt-subtitle">${isVilla ? 'فيلا حداد للمناسبات' : 'ستوديو سرى الحداد للتصوير'}</div>
      <div class="receipt-type">${getReceiptTypeLabel(type)}</div>
    </div>

    <div class="receipt-meta">
      <div>
        <span>رقم الوصل: </span>
        <span class="receipt-num">${receiptNumber}</span>
      </div>
      <div>${formattedDate} - ${formattedTime}</div>
    </div>

    <div class="client-section">
      <div class="client-row">
        <span class="client-label">اسم العميل</span>
        <span class="client-value">${booking.clientName || '-'}</span>
      </div>
      <div class="client-row">
        <span class="client-label">رقم الهاتف</span>
        <span class="client-value" style="direction:ltr">${booking.clientPhone || '-'}</span>
      </div>
      <div class="client-row">
        <span class="client-label">نوع الخدمة</span>
        <span class="client-value">${booking.title || booking.servicePackage || '-'}</span>
      </div>
      <div class="client-row">
        <span class="client-label">تاريخ الموعد</span>
        <span class="client-value">${booking.shootDate ? new Date(booking.shootDate).toLocaleDateString('ar-IQ') : '-'}</span>
      </div>
    </div>

    <div class="amount-section">
      <div class="amount-label">المبلغ المستلم</div>
      <div class="amount-value">${formatMoney(amount, currency)}</div>
      ${description ? `<div class="amount-desc">${description}</div>` : ''}
    </div>

    <div class="financial-details">
      <div class="fin-row">
        <span class="fin-label">المبلغ الكلي للحجز</span>
        <span class="fin-value">${formatMoney(booking.totalAmount, booking.currency)}</span>
      </div>
      <div class="fin-row">
        <span class="fin-label">إجمالي المدفوع</span>
        <span class="fin-value paid">${formatMoney(booking.paidAmount, booking.currency)}</span>
      </div>
      <div class="fin-row total-row">
        <span class="fin-label">المبلغ المتبقي</span>
        <span class="fin-value ${remaining > 0 ? 'remaining' : 'paid'}">${formatMoney(remaining, booking.currency)}</span>
      </div>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line">توقيع المستلم</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">توقيع العميل</div>
      </div>
    </div>

    <div class="receipt-footer">
      فيلا حداد - وصل رسمي | هذا الوصل يثبت استلام المبلغ المذكور أعلاه
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  }
};
