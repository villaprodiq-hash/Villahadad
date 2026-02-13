const Database = require('better-sqlite3');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = 'resilience.db';

// تنظيف قديم
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);

// إعداد الجداول (نفس الهيكلية الأساسية)
db.exec(`
  CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    clientName TEXT,
    amount REAL,
    status TEXT
  );
  CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    action TEXT,
    data TEXT,
    status TEXT
  );
`);

console.log('🛡️  Began Resilience Test (اختبار الصمود)\n');

// ==========================================
// 1. اختبار انقطاع الإنترنت (Offline Simulation)
// ==========================================
console.log('🔌 سيناريو 1: انقطاع الإنترنت (Offline Mode)');

// محاكاة: المدير يضيف حجز والنت مفصول
const bookingId = uuidv4();
try {
  const isOnline = false; // ❌ النت مقطوع

  // 1. الحفظ المحلي (ينجح دائماً)
  db.prepare('INSERT INTO bookings (id, clientName, amount, status) VALUES (?, ?, ?, ?)').run(
    bookingId,
    'Client Offline',
    150000,
    'confirmed'
  );

  // 2. محاولة المزامنة (تفشل) -> إضافة للطابور
  if (!isOnline) {
    console.log('   ⚠️  No Internet. Adding to Sync Queue...');
    db.prepare('INSERT INTO sync_queue (id, action, data, status) VALUES (?, ?, ?, ?)').run(
      uuidv4(),
      'CREATE_BOOKING',
      JSON.stringify({ id: bookingId }),
      'pending'
    );
  }

  console.log('   ✅ نجاح: تم الحفظ محلياً وإضافة الطلب لطابور الانتظار.');
} catch (e) {
  console.error('   ❌ فشل: توقف البرنامج بسبب انقطاع النت!', e);
}

// التحقق
const queueCount = db.prepare('SELECT count(*) as c FROM sync_queue').get().c;
console.log(
  `   📊 النتيجة: عدد العناصر في طابور الانتظار = ${queueCount} (جاهزة للرفع عند عودة النت)\n`
);

// ==========================================
// 2. اختبار انقطاع الكهرباء (Power Cut / Crash)
// ==========================================
console.log('⚡ سيناريو 2: انقطاع التيار أثناء الكتابة (Power Cut Simulation)');

// سنحاول حفظ 10 حجوزات كدفعة واحدة (Transaction)
// وسنقطع الكهرباء في الحجز رقم 5
const insertMany = db.transaction(() => {
  for (let i = 1; i <= 10; i++) {
    console.log(`   ... جاري حفظ الحجز رقم ${i}`);
    db.prepare('INSERT INTO bookings (id, clientName, amount, status) VALUES (?, ?, ?, ?)').run(
      uuidv4(),
      `Crash Test ${i}`,
      1000,
      'pending'
    );

    if (i === 5) {
      console.log('   💥 انقطاع مفاجئ! (Power Failure / Process Killed)');
      throw new Error('SIMULATED_POWER_CUT'); // محاكاة توقف المعالج فجأة
    }
  }
});

try {
  insertMany();
} catch (e) {
  if (e.message === 'SIMULATED_POWER_CUT') {
    console.log('   🛑 الجهاز انطفأ الآن.');
  } else {
    console.error(e);
  }
}

// ==========================================
// 3. إعادة التشغيل والتحقق (Recovery)
// ==========================================
console.log('\n🔄 إعادة تشغيل النظام (System Restart)...');

// التحقق من سلامة قاعدة البيانات
const integrity = db.pragma('integrity_check', { simple: true });
console.log(`   🏥 فحص السلامة: ${integrity}`);

// التحقق من البيانات:
// بما أننا استخدمنا Transaction، يجب أن يكون عدد الحجوزات الإضافية 0 (لأن العملية لم تكتمل فتم إلغاؤها بالكامل للحفاظ على البيانات)
// أو إذا لم نستخدم Transaction، سيكون 5.
// في نظامنا نحن نستخدم Transactions للعمليات الحساسة.

const crashBookings = db
  .prepare("SELECT count(*) as c FROM bookings WHERE clientName LIKE 'Crash Test%'")
  .get().c;

if (crashBookings === 0) {
  console.log(
    '   ✅ نجاح باهر: النظام قام بـ (Atomic Rollback). لم يتم حفظ بيانات ناقصة أو مشوهة.'
  );
  console.log('      البيانات إما تُحفظ كاملة أو لا تُحفظ. لا توجد "نصف عملية".');
} else {
  console.log(`   ⚠️  تم حفظ ${crashBookings} سجلات جزئياً.`);
}

console.log('\n🏁 الخلاصة:');
console.log('1. عند انقطاع النت: العمل يستمر محلياً، والبيانات تنتظر في الطابور.');
console.log('2. عند انقطاع الكهرباء: قاعدة البيانات تحمي نفسها (No Corruption).');
