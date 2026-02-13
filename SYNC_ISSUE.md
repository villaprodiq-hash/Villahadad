# حل مشكلة المزامنة مع Supabase

## المشكلة:

- التطبيق يرسل البيانات لـ Supabase
- الـ Promise معلق (hanging) - ما يكمل
- ما في رسالة نجاح أو فشل

## السبب المحتمل:

استخدام `ANON_KEY` يتطلب RLS صحيح، لكن حتى بعد تعطيل RLS، المشكلة مستمرة.

## الحل المقترح:

استخدام **Service Account Key** بدلاً من Anon Key للمزامنة.

### الخطوات:

1. احصل على `SERVICE_ROLE_KEY` من Supabase Dashboard
2. أضفه في `.env`:
   ```
   VITE_SUPABASE_SERVICE_KEY=your_service_role_key_here
   ```
3. عدّل `services/supabase.ts` لاستخدام Service Key للمزامنة

## البديل (الحل السريع):

تحقق من Browser Console - ممكن الخطأ موجود لكن ما يطبع في اللوجات.

افتح Developer Tools (F12) → Console → شوف إذا في أخطاء.
