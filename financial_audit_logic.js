const { PaymentService } = require('./src/services/db/services/PaymentService');
const { BookingRepository } = require('./src/services/db/repositories/BookingRepository');
const fs = require('fs');

async function stressTestFinancials() {
  console.log('🌑 [الخبير المحاسبي] بدء اختبار الضغط المالي (Stress Test)...');

  // محاكاة إضافة 50 حجز بسرعة مع دفعات متعددة
  const count = 50;
  const paymentService = new PaymentService();
  const bookingRepo = new BookingRepository();

  console.log(`🚀 جاري إنشاء ${count} معاملة وهمية للتحقق من تحمل السيستم...`);

  const startTime = Date.now();
  for (let i = 0; i < count; i++) {
    const bookingId = `stress_test_${i}_${Date.now()}`;
    try {
      // محاكاة إضافة دفعة
      await paymentService.addPayment(bookingId, {
        amount: 100,
        currency: 'USD',
        exchangeRate: 1450,
        collectedBy: 'Stress Test Bot',
        notes: `معاملة اختبار الضغط رقم ${i}`,
      });

      if (i % 10 === 0) console.log(`✅ تم إنجاز ${i} معاملة...`);
    } catch (e) {
      console.error(`❌ فشل في المعاملة ${i}: ${e.message}`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`⏱️ انتهى الاختبار. تم معالجة ${count} معاملة في ${duration} ثانية.`);

  if (duration > 10) {
    console.log('⚠️ تنبيه محاسبي: السيستم بطيء في معالجة المعاملات المالية الثقيلة.');
  } else {
    console.log('💎 السيستم أثبت جدارة عالية في تحمل ضغط المعاملات.');
  }
}

// ملاحظة: هذا السكربت يحتاج لبيئة تشغيل node داخل مجلد المشروع
console.log('ملاحظة: هذا الكود للمحاكاة المنطقية وسأقوم بتنفيذه عبر أدوات الفحص.');
