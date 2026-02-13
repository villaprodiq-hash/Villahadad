# 🔧 الحل النهائي لمشكلة المزامنة

## المشكلة:

Supabase `.insert()` Promise معلق - ما يكمل أبداً

## الحل المقترح:

### الخيار 1: استخدام Service Role Key

```typescript
// في services/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Client للقراءة العامة
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Client للكتابة (يتجاوز RLS)
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY // احصل عليه من Supabase Dashboard
);
```

### الخيار 2: تعطيل RLS نهائياً (للاختبار فقط)

```sql
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
```

### الخيار 3: استخدام fetch() مباشرة

```typescript
const response = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
  method: "POST",
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify(dbObject),
});
```

## التوصية:

استخدم **Service Role Key** - هذا الحل الأنظف والأكثر أماناً.
