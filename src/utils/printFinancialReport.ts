import { Booking } from '../types';
import { formatMoney } from './formatMoney';
import { getPaymentStatus, getPaymentStatusLabel } from './paymentStatus';

export const printFinancialReport = (bookings: Booking[], filterStatus: string) => {
  // Calculate Totals (Respecting Currencies)
  const stats = {
    total: bookings.length,
    collectedIQD: bookings
      .filter(b => b.currency === 'IQD')
      .reduce((sum, b) => sum + b.paidAmount, 0),
    collectedUSD: bookings
      .filter(b => b.currency !== 'IQD')
      .reduce((sum, b) => sum + b.paidAmount, 0),
    outstandingIQD: bookings
      .filter(b => b.currency === 'IQD')
      .reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0),
    outstandingUSD: bookings
      .filter(b => b.currency !== 'IQD')
      .reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0),
  };

  const statusLabel = filterStatus === 'all' ? 'الكل' : getPaymentStatusLabel(filterStatus as any);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }

  const rows = bookings
    .map(b => {
      const status = getPaymentStatus(b);
      const remaining = b.totalAmount - b.paidAmount;
      return `
    <tr>
      <td>
        <div style="font-weight: bold;">${b.clientName}</div>
      </td>
      <td>${b.title}</td>
      <td>${b.shootDate}</td>
      <td><span class="badge ${status}">${getPaymentStatusLabel(status)}</span></td>
      <td class="amount">${formatMoney(b.totalAmount, b.currency)}</td>
      <td class="amount received">${formatMoney(b.paidAmount, b.currency)}</td>
      <td class="amount remaining">${remaining > 0 ? formatMoney(remaining, b.currency) : '-'}</td>
    </tr>
  `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <title>التقرير المالي - Villa Hadad</title>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        body { 
          font-family: 'Cairo', system-ui, -apple-system, sans-serif; 
          padding: 40px; 
          color: #1f2937; 
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .header { 
          text-align: center; 
          margin-bottom: 40px; 
          border-bottom: 3px solid #f3f4f6; 
          padding-bottom: 30px; 
        }
        .header h1 { margin: 0 0 10px 0; color: #111827; font-size: 28px; }
        .header p { color: #6b7280; margin: 5px 0; font-size: 14px; }
        
        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 20px; 
          margin-bottom: 40px; 
        }
        .stat-card { 
          background: #f9fafb; 
          padding: 20px; 
          border-radius: 16px; 
          border: 1px solid #e5e7eb; 
          text-align: center;
        }
        .stat-label { font-size: 12px; color: #6b7280; font-weight: bold; margin-bottom: 8px; }
        .stat-value { font-size: 22px; font-weight: 900; color: #111827; direction: ltr; }
        
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
        th { 
          text-align: right; 
          padding: 12px 16px; 
          background: #f3f4f6; 
          color: #4b5563; 
          font-weight: 800; 
          border-bottom: 2px solid #e5e7eb; 
        }
        td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
        tr:nth-child(even) { background-color: #f9fafb; }
        
        .badge { padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: bold; white-space: nowrap; }
        .badge.paid_full { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge.paid_partial { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
        .badge.unpaid { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        
        .amount { font-family: monospace; font-weight: bold; font-size: 13px; direction: ltr; text-align: left; }
        .received { color: #166534; }
        .remaining { color: #991b1b; }
        
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          border-top: 1px dashed #e5e7eb;
          padding-top: 20px;
        }

        @media print {
          body { padding: 0; }
          .no-print { display: none; }
          .stat-card { border: 1px solid #000; }
          th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
          .badge { border: 1px solid #000; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>التقرير المالي - Villa Hadad</h1>
        <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-IQ')} ${new Date().toLocaleTimeString('en-US')}</p>
        <p>حالة التقرير: <strong>${statusLabel}</strong></p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">المقبوضات (IQD)</div>
          <div class="stat-value" style="color: #166534">${formatMoney(stats.collectedIQD, 'IQD')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">المقبوضات (USD)</div>
          <div class="stat-value" style="color: #166534">${formatMoney(stats.collectedUSD, 'USD')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">عدد الحجوزات</div>
          <div class="stat-value">${stats.total}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>العميل</th>
            <th>نوع الحجز</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th>المبلغ الكلي</th>
            <th>الواصل</th>
            <th>المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        تم إنشاء هذا التقرير آلياً بواسطة نظام Villa Hadad
      </div>
      
      <script>
        // Auto Print
        window.onload = () => {
          setTimeout(() => {
            window.print();
            // window.close(); // Optional: Close after print
          }, 500);
        };
      </script>
    <div class="no-print" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; background: white; padding: 10px; border-radius: 50px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; z-index: 1000;">
        <button onclick="window.print()" style="background: #111827; color: white; border: none; padding: 10px 20px; border-radius: 25px; font-family: 'Cairo', sans-serif; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
          طباعة / حفظ PDF
        </button>
        <button onclick="window.close()" style="background: #f3f4f6; color: #374151; border: none; padding: 10px 20px; border-radius: 25px; font-family: 'Cairo', sans-serif; font-weight: bold; cursor: pointer;">
          إغلاق
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
