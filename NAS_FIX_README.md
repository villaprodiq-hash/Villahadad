# إصلاح مسار NAS - VillaHadad

## المشكلة
التطبيق كان يبحث عن NAS في `/Volumes/Gallery` لكن الـ NAS الفعلي متصل في `/Volumes/VillaHadad` ومجلد `Gallery` موجود داخله.

## التغييرات التي تم إجراؤها

### 1. تحديث `electron/services/NasConfig.cjs`
- تغيير المسار الرئيسي من `/Volumes/Gallery` إلى `/Volumes/VillaHadad/Gallery`
- تحديث قائمة المسارات البديلة لتشمل المسارات الجديدة
- زيادة رقم نسخة الإعدادات إلى 4 لإجبار التطبيق على تجاهل الإعدادات القديمة
- إضافة تسجيلات (logs) لتشخيص المشاكل

### 2. تحديث `electron/main.cjs`
- إصلاح استدعاء `checkNasAvailability()` - استخدام `getNasBasePath()` المتزامن بدلاً منه
- إصلاح خطأ `nasInfo.path` - استخدام `nasInfo.photoFolderPath` أو `nasBasePath`
- إصلاح `getNasPath()` غير الموجودة - استخدام `getNasBasePath()`
- إضافة `/Volumes/VillaHadad/Gallery` إلى قائمة المسارات المحتملة

## خطوات التطبيق

1. **إعادة بناء التطبيق:**
   ```bash
   cd villahadadMacos
   npm run build
   ```

2. **حذف الإعدادات القديمة (اختياري ولكن موصى به):**
   ```bash
   rm ~/Library/Application\ Support/villahadad-desktop/nas-config.json
   ```
   أو على المسار الصحيح لتطبيقك.

3. **تشغيل التطبيق:**
   ```bash
   npm run electron:dev
   # أو
   npm run electron:preview
   ```

4. **التحقق من Console:**
   افتح Developer Tools (Cmd+Option+I) وتحقق من الرسائل:
   - `[NasConfig] ✅ Using primary path: /Volumes/VillaHadad/Gallery`
   - `[NasConfig] Path accessible: /Volumes/VillaHadad/Gallery`

## المسارات المتوقعة

بعد الإصلاح، سيتم إنشاء المجلدات في:
```
/Volumes/VillaHadad/Gallery/VillaApp/2026/02/ClientName_session/
├── 01_RAW/
├── 02_SELECTED/
├── 03_EDITED/
└── 04_FINAL/
```

## استكشاف الأخطاء

إذا استمرت المشكلة:

1. **تحقق من وجود المسار:**
   ```bash
   ls -la /Volumes/VillaHadad/Gallery
   ```

2. **تحقق من الصلاحيات:**
   ```bash
   ls -la /Volumes/VillaHadad/
   ```

3. **افتح Console في التطبيق** وابحث عن رسائل `[NasConfig]`

4. **تحقق من الإعدادات المحفوظة:**
   ```bash
   cat ~/Library/Application\ Support/villahadad-desktop/nas-config.json
   ```

## دعم فني

إذا استمرت المشكلة، يرجى مشاركة:
- نسخة من logs من Console
- محتوى ملف `nas-config.json`
- ناتج أمر `ls -la /Volumes/VillaHadad/`
