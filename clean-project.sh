#!/bin/bash
# 🧹 تنظيف المشروع من الملفات الزائدة
# Clean Project Script

echo "🧹 بدء تنظيف المشروع..."
echo ""

# الحجم الحالي
echo "📊 الحجم الحالي:"
du -sh .

echo ""
echo "🗑️  حذف الملفات الزائدة..."

# 1. حذف إصدارات Build القديمة (أكبر مشكلة - 9GB)
echo "1️⃣  حذف مجلد release (الإصدارات القديمة)..."
rm -rf release/
echo "   ✅ تم حذف release/"

# 2. حذف مجلدات Build المؤقتة
echo "2️⃣  حذف مجلدات Build المؤقتة..."
rm -rf dist/
rm -rf build/
rm -rf out/
echo "   ✅ تم حذف dist/, build/, out/"

# 3. حذف ملفات macOS الزائدة
echo "3️⃣  حذف ملفات macOS الزائدة (.DS_Store)..."
find . -name ".DS_Store" -type f -delete
echo "   ✅ تم حذف ملفات .DS_Store"

# 4. حذف ملفات IDE الزائدة
echo "4️⃣  حذف ملفات IDE المؤقتة..."
rm -rf .idea/
rm -rf .vscode/.history/
rm -rf *.log
echo "   ✅ تم حذف ملفات IDE"

# 5. تنظيف node_modules (اختياري - سنعيد تثبيتها)
echo "5️⃣  تنظيف node_modules..."
rm -rf node_modules/
echo "   ✅ تم حذف node_modules/"

# 6. حذف ملفات الاختبار المؤقتة
echo "6️⃣  حذف ملفات الاختبار المؤقتة..."
rm -rf coverage/
rm -rf .nyc_output/
echo "   ✅ تم حذف ملفات الاختبار"

# 7. حذف ملفات Cache
echo "7️⃣  حذف ملفات Cache..."
rm -rf .cache/
rm -rf .parcel-cache/
rm -rf .vite/
echo "   ✅ تم حذف ملفات Cache"

# 8. حذف Git LFS objects القديمة (إن وجدت)
echo "8️⃣  تنظيف Git..."
git gc --aggressive --prune=now 2>/dev/null || echo "   ⚠️  تخطي git gc"
echo "   ✅ تم تنظيف Git"

# 9. تنظيف مجلد .git الداخلي المكرر
echo "9️⃣  حذف .git المكررة..."
rm -rf .git/.git/
rm -rf .git/node_modules/
echo "   ✅ تم حذف .git المكررة"

echo ""
echo "📊 الحجم بعد التنظيف:"
du -sh .

echo ""
echo "✅ تم التنظيف بنجاح!"
echo ""
echo "🔄 الآن قم بتثبيت dependencies:"
echo "   npm install"
echo ""
echo "📦 ثم قم بعمل build:"
echo "   npm run package:mac"
