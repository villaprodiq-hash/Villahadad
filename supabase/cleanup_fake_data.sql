-- ============================================
-- تنظيف البيانات الوهمية والقديمة من Villa Hadad
-- ============================================

-- 1. حذف الحجوزات المُعلَّمة كمحذوفة نهائياً (36 حجز من يناير)
DELETE FROM bookings 
WHERE deleted_at IS NOT NULL;

-- 2. حذف الرسائل القديمة غير المقروءة (من شهر يناير)  
DELETE FROM messages 
WHERE created_at < '2026-02-01' 
  AND status = 'unread';

-- 3. حذف المهام القديمة غير المكتملة المرتبطة بحجوزات محذوفة
-- (يتم تنفيذها عبر التطبيق لأن المهام في SQLite)

-- 4. التحقق من النتائج بعد التنظيف
SELECT 
  'الحجوزات المتبقية' as item,
  COUNT(*) as count
FROM bookings
UNION ALL
SELECT 
  'الحجوزات المحذوفة',
  COUNT(*)
FROM bookings  
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 
  'الرسائل غير المقروءة',
  COUNT(*)
FROM messages 
WHERE status = 'unread';
