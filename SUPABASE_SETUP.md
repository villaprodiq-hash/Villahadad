# 🔧 إعداد Supabase للتطبيق

## المشكلة التي تم حلها

كان التطبيق يواجه مشكلة في المزامنة مع Supabase حيث كانت الـ Promise تتعلق (`hanging`) عند محاولة إرسال البيانات. السبب الرئيسي هو **Row Level Security (RLS)** الذي يمنع الكتابة باستخدام `ANON_KEY`.

## الحل

تم إضافة دعم لـ **Service Role Key** الذي يتجاوز RLS ويسمح بعمليات المزامنة بنجاح.

---

## خطوات الإعداد

### 1. الحصول على Service Role Key

1. افتح Supabase Dashboard: https://supabase.com/dashboard
2. اختر مشروعك (rszxfllrxmqphmginklv)
3. اذهب إلى: **Settings** → **API**
4. انسخ `service_role` key (تحت قسم "Project API keys")

⚠️ **تحذير مهم:** Service Role Key هو **سري جداً** ولا يجب مشاركته أو رفعه على GitHub!

### 2. إضافة الـ Key للتطبيق

افتح ملف `.env` في جذر المشروع وأضف السطر التالي:

```bash
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # الـ key الذي نسخته
```

### 3. إعادة تشغيل التطبيق

```bash
# أوقف التطبيق (Ctrl+C) ثم شغله من جديد
npm run dev
```

---

## التحقق من نجاح الإعداد

افتح Console في التطبيق (Developer Tools) وابحث عن الرسائل التالية:

✅ **نجح الإعداد:**
```
✅ SyncManager: Connected to Supabase Cloud!
🔄 SyncManager: Starting Data Sync...
✅ Successfully synced item...
```

❌ **فشل الإعداد:**
```
⚠️ VITE_SUPABASE_SERVICE_KEY is missing - Sync operations may fail due to RLS!
❌ Sync failed for item: ...
```

---

## البدائل (إذا لم ترد استخدام Service Key)

### الخيار 1: تعطيل RLS (للتطوير فقط - غير آمن)

قم بتشغيل هذا الأمر في Supabase SQL Editor:

```sql
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflicts DISABLE ROW LEVEL SECURITY;
```

⚠️ **تحذير:** هذا يجعل البيانات متاحة للجميع - لا تستخدمه في الإنتاج!

### الخيار 2: إضافة RLS Policies

أضف policies تسمح بالكتابة:

```sql
-- السماح بالكتابة لجميع المستخدمين المصادق عليهم
CREATE POLICY "Allow authenticated writes"
ON public.bookings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

---

## ملاحظات إضافية

- الآن التطبيق يستخدم `supabaseAdmin` للمزامنة فقط
- `supabase` العادي ما يزال يُستخدم للقراءة والعمليات العادية
- المزامنة تتم في الخلفية تلقائياً عند الاتصال بالإنترنت

---

**آخر تحديث:** يناير 2026
**النسخة:** 1.0.4
