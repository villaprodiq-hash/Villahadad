-- جرب هذا الكود البسيط
-- اذا ما ضبط، يمكن الجدول ما موجود

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_all" ON public.bookings;

CREATE POLICY "bookings_all"
ON public.bookings
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);
