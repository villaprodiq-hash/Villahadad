# 🔄 تعليمات تفعيل تزامن المستخدمين

## ✅ تم التعديل على الكود (تلقائياً)

التعديلات اللي سويتها:
1. ✅ `mockBackend.ts` - الآن يحفظ ويقرأ المستخدمين من Supabase
2. ✅ `AuthProvider.tsx` - الآن يستقبل التحديثات الفورية (Real-time)

---

## 📋 الخطوة المتبقية: تنفيذ SQL في Supabase

### اذهب إلى:
```
https://supabase.com/dashboard/project/rszxfllrxmqphmginklv/sql/new
```

### والصق هذا الكود ونفذه:

```sql
-- إنشاء جدول المستخدمين
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'RECEPTION',
    password TEXT,
    job_title TEXT,
    avatar TEXT,
    email TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- تفعيل RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "Allow public insert access" ON public.users;
DROP POLICY IF EXISTS "Allow public update access" ON public.users;
DROP POLICY IF EXISTS "Allow public delete access" ON public.users;

CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Allow public insert access" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.users FOR DELETE USING (true);

-- تفعيل Real-time (مهم!)
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- إضافة المديرة الافتراضية
INSERT INTO public.users (id, name, role, password, job_title, email)
SELECT 'default_manager', 'المديرة', 'MANAGER', '1234', 'مديرة الاستوديو', 'manager@villahaddad.local'
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'MANAGER');
```

---

## 🚀 بعد التنفيذ

1. **أعد تشغيل التطبيق** على كل الأجهزة
2. **جرب إضافة موظف** من أي جهاز
3. **لاحظ** أنه يظهر فوراً في باقي الأجهزة! ⚡

---

## 🎯 النتيجة المتوقعة

```
Mac 1: المديرة تضيف "سارة"
         ↓ (فوراً)
Mac 2, 3, 4, 5, 6, 7: يشوفون "سارة" ⚡
```

---

## 🔧 إذا واجهت مشاكل

### "relation users does not exist"
→ لم تنفذ SQL بعد. اذهب لـ Supabase SQL Editor ونفذه.

### "RLS policy violation"
→ نفذ هذا الكود:
```sql
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
CREATE POLICY "Allow all" ON public.users FOR ALL USING (true) WITH CHECK (true);
```

### Real-time لا يعمل
→ اذهب إلى: Database → Replication → تأكد من تفعيل `users` table

---

**🎉 مبروك! الآن كل الأجهزة متزامنة!**
