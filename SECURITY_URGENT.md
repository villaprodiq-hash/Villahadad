# 🚨 إجراءات أمنية عاجلة - يجب التنفيذ فوراً

## ⚠️ أسرار مكشوفة في Git - إجراءات فورية مطلوبة

### 1. إلغاء GitHub Token (عاجل جداً!)

**المشكلة:** توكن GitHub مكشوف في `.env:22`
```
GH_TOKEN=ghp_REDACTED_EXAMPLE_TOKEN
```

**الإجراءات الفورية:**

1. **ألغِ التوكن الآن:**
   - اذهب إلى: https://github.com/settings/tokens
   - ابحث عن التوكن المكشوف
   - اضغط "Delete" لإلغائه فوراً

2. **أنشئ توكن جديد:**
   - اذهب إلى: https://github.com/settings/tokens/new
   - اختر الصلاحيات المطلوبة فقط (repo)
   - انسخ التوكن الجديد
   - ضعه في `.env.local` (لا ترفعه لـ Git أبداً!)

3. **نظف Git History:**
   ```bash
   # حذف .env من تاريخ Git
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   
   # فرض الرفع (احذر!)
   git push origin --force --all
   git push origin --force --tags
   ```

---

### 2. تدوير Supabase Credentials

**المشكلة:** Supabase URL و Anon Key مكشوفة

**الإجراءات:**

1. **دوّر Anon Key:**
   - اذهب إلى: https://supabase.com/dashboard/project/rszxfllrxmqphmginklv/settings/api
   - اضغط "Reset" على Anon Key
   - انسخ المفتاح الجديد
   - حدّث `.env.local` بالمفتاح الجديد

2. **تأكد من RLS:**
   - راجع Row Level Security policies
   - تأكد من عدم وجود سياسات "allow all"

---

### 3. إعداد ZainCash Environment Variables

**المشكلة:** كانت بيانات الاختبار مضمنة في الكود (تم إصلاحها)

**الإجراءات:**

1. **أضف المتغيرات في Supabase Edge Functions:**
   ```bash
   # في لوحة تحكم Supabase -> Edge Functions -> Settings
   ZC_MERCHANT_ID=your_merchant_id
   ZC_SECRET=your_secret
   ZC_MSISDN=your_msisdn
   ZC_ENV=production  # أو test
   ```

2. **تحقق من أن الدالة تعمل:**
   ```bash
   # اختبر الدالة بعد إضافة المتغيرات
   ```

---

## ✅ الإصلاحات التي تمت

### 1. ✅ إصلاح SQL Injection
- **الملف:** `src/services/mockBackend.ts:493`
- **الإصلاح:** تم استبدال string interpolation بـ parameterized query
- **قبل:** `SELECT id FROM dashboard_tasks WHERE id = '${customId}'`
- **بعد:** `SELECT id FROM dashboard_tasks WHERE id = ?` مع `[customId]`

### 2. ✅ تعطيل DevLoginBypass في Production
- **الملف:** `src/components/shared/auth/DevLoginBypass.tsx`
- **الإصلاح:** إضافة فحص `import.meta.env.PROD`
- **النتيجة:** المكون لا يعمل في Production

### 3. ✅ إضافة فحص الصلاحيات لتحديث الحجوزات
- **الملف:** `src/services/db/services/BookingService.ts:463`
- **الإصلاح:** إضافة authorization checks
- **القواعد:**
  - المنشئ فقط يمكنه التعديل
  - أو المدير/الأدمن
  - رسالة خطأ إذا غير مصرح

### 4. ✅ إضافة التحقق من مبالغ الدفع
- **الملف:** `src/services/zaincash.ts:19`
- **الإصلاح:** 
  - فحص المبلغ > 0
  - فحص الحد الأقصى (10 مليون)
  - فحص orderId

### 5. ✅ إزالة بيانات الاختبار المضمنة
- **الملف:** `supabase/functions/zaincash/index.ts`
- **الإصلاح:** حذف `TEST_CREDENTIALS` والاعتماد على environment variables فقط
- **النتيجة:** فشل واضح إذا لم تكن المتغيرات موجودة

### 6. ✅ إضافة قفل للمزامنة (Race Condition)
- **الملف:** `src/services/sync/SyncManager.ts`
- **الإصلاح:** إضافة `syncInProgress` flag مع `try/finally`
- **النتيجة:** منع تعدد عمليات المزامنة في نفس الوقت

### 7. ✅ إزالة console.log بالبيانات الحساسة
- **الملف:** `src/services/db/services/BookingService.ts:368`
- **الإصلاح:** wrap console.log في `if (import.meta.env.DEV)`
- **النتيجة:** لا تظهر البيانات الحساسة في production

---

## 🔜 إصلاحات مطلوبة قريباً

### 1. استبدال localStorage بتخزين آمن
**الأولوية:** عالية
**الملفات المتأثرة:** 40+ ملف
**الحل المقترح:**
```typescript
// إنشاء secure storage service
import { encrypt, decrypt } from './encryption';

export const secureStorage = {
  async set(key: string, value: any) {
    const encrypted = await encrypt(JSON.stringify(value));
    sessionStorage.setItem(key, encrypted);
  },
  async get(key: string) {
    const encrypted = sessionStorage.getItem(key);
    if (!encrypted) return null;
    return JSON.parse(await decrypt(encrypted));
  }
};
```

### 2. إضافة CSRF Protection
**الأولوية:** عالية
**الحل:** استخدام CSRF tokens أو SameSite cookies

### 3. تحسين Input Sanitization
**الأولوية:** متوسطة
**الحل:** استخدام DOMPurify بدلاً من Regex
```typescript
import DOMPurify from 'dompurify';
const sanitize = (val: string) => DOMPurify.sanitize(val);
```

### 4. إضافة Database Transactions
**الأولوية:** متوسطة
**الملفات:** PaymentService.ts
**الحل:** wrap عمليات الدفع في transactions

---

## 📋 Checklist

- [ ] إلغاء GitHub Token القديم
- [ ] إنشاء GitHub Token جديد
- [ ] تنظيف Git History من .env
- [ ] تدوير Supabase Anon Key
- [ ] مراجعة RLS policies
- [ ] إضافة ZainCash env vars في Supabase
- [ ] اختبار الإصلاحات في Development
- [ ] اختبار الإصلاحات في Staging
- [ ] مراجعة أمنية شاملة قبل Production
- [ ] تحديث التوثيق الأمني

---

## 📞 جهات الاتصال

- **فريق الأمان:** أضف معلومات الاتصال
- **Supabase Support:** support@supabase.com
- **GitHub Support:** support@github.com

---

**تاريخ الإنشاء:** $(date)
**الحالة:** 🔴 عاجل - يجب التنفيذ فوراً
**المسؤول:** فريق التطوير
