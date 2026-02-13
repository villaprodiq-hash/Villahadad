# ✅ تم إعداد GitHub Releases بنجاح!

## 📋 ما تم تغييره:

### 1. electron-builder.cjs
```javascript
// تم التبديل من Synology إلى GitHub:
publish: {
  provider: "github",
  owner: "YOUR_GITHUB_USERNAME", // ⚠️ غيّر هذا!
  repo: "villahadad",
  releaseType: "release"
}
```

### 2. .env
```bash
# تم إزالة:
UPDATE_SERVER_URL=http://192.168.68.120/update

# تم إضافة:
GH_TOKEN=YOUR_GITHUB_TOKEN_HERE
```

---

## 🚀 الخطوات القادمة (مطلوبة منك):

### الخطوة 1: إنشاء Repository في GitHub

```bash
# اذهب إلى: https://github.com/new
# اسم الـ Repo: villahadad
# النوع: Private (خاص) أو Public (عام)
# اضغط "Create repository"
```

### الخطوة 2: الحصول على GitHub Token

```bash
# 1. اذهب إلى: https://github.com/settings/tokens
# 2. اضغط "Generate new token" → "Generate new token (classic)"
# 3. اسم الـ Token: "Villa Hadad Auto-Update"
# 4. اختر Scopes:
#    ✅ repo (كامل)
# 5. اضغط "Generate token"
# 6. انسخ الـ Token (يظهر مرة واحدة فقط!)
```

### الخطوة 3: إضافة الـ Token في .env

```bash
# افتح ملف .env وغيّر:
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # ضع الـ Token الحقيقي
```

### الخطوة 4: تحديث electron-builder.cjs

```bash
# افتح ملف electron-builder.cjs وغيّر:
owner: "YOUR_GITHUB_USERNAME",  # ضع اسم المستخدم حقك
```

### الخطوة 5: رفع الكود إلى GitHub

```bash
# في Terminal:
cd /Users/mohamedaljaff/Desktop/villahadad

# إضافة Remote (غيّر YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/villahadad.git

# رفع الكود
git push -u origin main
```

---

## 📦 نشر أول تحديث

بعد ما تكمل الخطوات الـ 5 فوق:

```bash
# استخدم الـ Script التلقائي:
./publish-release.sh

# أو يدوياً:
npm run build:production
npx electron-builder --mac --publish always
```

---

## 📚 الملفات المهمة:

1. **اقرأني_التحديثات.md** - دليل سريع (ابدأ من هنا!)
2. **GITHUB_RELEASES_GUIDE.md** - دليل شامل ومفصل
3. **publish-release.sh** - Script تلقائي للنشر

---

## ⚠️ ملاحظات مهمة:

1. **GH_TOKEN سري جداً** - لا تشاركه مع أحد!
2. **لا ترفع .env إلى GitHub** - موجود في .gitignore
3. **اختبر قبل النشر** - تأكد إن التطبيق يشتغل

---

## ✅ Checklist

قبل ما تنشر أول تحديث:

- [ ] Repository موجود في GitHub
- [ ] GH_TOKEN مضاف في .env
- [ ] electron-builder.cjs معدّل (owner)
- [ ] الكود مرفوع على GitHub (git push)
- [ ] البناء يشتغل (npm run build)

إذا كل شي ✅ → شغّل `./publish-release.sh` وانطلق! 🚀

---

**بالتوفيق! إذا عندك أي سؤال، راجع الملفات الموجودة أو اسأل.** 💪
