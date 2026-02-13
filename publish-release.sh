#!/bin/bash

# 🚀 Villa Hadad - GitHub Release Publisher
# هذا الـ Script ينشر تحديث جديد تلقائياً إلى GitHub Releases

set -e  # Stop on error

echo "🚀 Villa Hadad - GitHub Release Publisher"
echo "=========================================="
echo ""

# Check if GH_TOKEN exists
if [ -z "$GH_TOKEN" ]; then
    echo "❌ خطأ: GH_TOKEN غير موجود!"
    echo ""
    echo "الحل:"
    echo "1. اذهب إلى: https://github.com/settings/tokens"
    echo "2. أنشئ Token جديد مع صلاحية 'repo'"
    echo "3. أضفه في .env:"
    echo "   echo 'GH_TOKEN=ghp_xxxx' >> .env"
    echo ""
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 الإصدار الحالي: v$CURRENT_VERSION"
echo ""

# Ask for version bump type
echo "🔢 نوع التحديث:"
echo "  1) patch (إصلاح أخطاء)     1.0.4 → 1.0.5"
echo "  2) minor (ميزة جديدة)       1.0.4 → 1.1.0"
echo "  3) major (تغيير كبير)       1.0.4 → 2.0.0"
echo ""
read -p "اختر (1/2/3): " bump_type

case $bump_type in
    1)
        BUMP="patch"
        ;;
    2)
        BUMP="minor"
        ;;
    3)
        BUMP="major"
        ;;
    *)
        echo "❌ خيار غير صحيح!"
        exit 1
        ;;
esac

# Bump version
echo ""
echo "⬆️  رفع الإصدار ($BUMP)..."
npm version $BUMP --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ الإصدار الجديد: v$NEW_VERSION"
echo ""

# Ask for release notes
echo "📝 ملاحظات التحديث (اضغط Enter مرتين للإنهاء):"
echo "مثال: إصلاح مشكلة إضافة الموظفين + تحسين الأداء"
echo ""
RELEASE_NOTES=""
while IFS= read -r line; do
    [ -z "$line" ] && break
    RELEASE_NOTES="$RELEASE_NOTES$line"$'\n'
done

if [ -z "$RELEASE_NOTES" ]; then
    RELEASE_NOTES="تحديث v$NEW_VERSION"
fi

echo ""
echo "📋 ملخص التحديث:"
echo "  الإصدار: v$NEW_VERSION"
echo "  الملاحظات: $RELEASE_NOTES"
echo ""
read -p "هل تريد المتابعة؟ (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ تم الإلغاء"
    exit 0
fi

# Commit version bump
echo ""
echo "💾 حفظ التغييرات..."
git add package.json package-lock.json
git commit -m "chore: bump version to v$NEW_VERSION" || true

# Build the app
echo ""
echo "🔨 بناء التطبيق..."
npm run build:production

# Publish to GitHub
echo ""
echo "📤 نشر إلى GitHub Releases..."
export GH_TOKEN
npx electron-builder --mac --publish always

# Push to git
echo ""
echo "⬆️  رفع إلى GitHub..."
git push origin main

echo ""
echo "✅ تم النشر بنجاح!"
echo ""
echo "🔗 رابط الإصدار:"
REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//')
echo "   $REPO_URL/releases/tag/v$NEW_VERSION"
echo ""
echo "📱 المستخدمون سيستلمون الإشعار خلال ساعة!"
echo ""
