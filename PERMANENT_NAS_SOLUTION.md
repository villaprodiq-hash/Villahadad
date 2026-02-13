# الحل الدائم لتوصيل NAS - VillaHadad

## 🔧 الخطوة 1: إعدادات داخل جهاز Synology NAS

يجب أن تدخل على واجهة NAS من المتصفح:
1. افتح المتصفح واكتب: `http://192.168.68.113:5000`
2. سجل الدخول (admin أو mohamed)
3. اذهب إلى: **Control Panel** → **File Services**
4. تأكد من تفعيل:
   - ✅ **Enable SMB service**
   - ✅ **Enable Bonjour service** (للـ .local)

### إعدادات SMB المهمة:
```
Maximum SMB protocol: SMB 3
Minimum SMB protocol: SMB 2
Enable Bonjour broadcast: ✅
```

---

## 🔧 الخطوة 2: إعدادات الماك (Auto-mount عند تشغيل الجهاز)

### الطريقة A: Login Items (أسهل)

1. **أولاً، وصل الـ NAS يدوياً مرة واحدة:**
   - Finder → Go → Connect to Server
   - `smb://mohamed@192.168.68.113/Gallery`
   - (ضع علامة "Remember password")

2. **أضف للـ Login Items:**
   - System Settings → General → Login Items
   - اضغط **+**
   - اذهب إلى `/Volumes` واختر `VillaHadad`
   - (أو اسحب VillaHadad من Finder للقائمة)

### الطريقة B: Launch Agent (تلقائي 100%)

أنشئ ملف يعمل تلقائياً:

```bash
# افتح Terminal واكتب:
mkdir -p ~/Library/LaunchAgents

cat > ~/Library/LaunchAgents/com.villahadad.mount.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.villahadad.mount</string>
    <key>RunAtLoad</key>
    <true/>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>-c</string>
        <string>sleep 10 &amp;&amp; mount_smbfs //mohamed@192.168.68.113/Gallery /Volumes/VillaHadad-Gallery 2&gt;/dev/null || true</string>
    </array>
</dict>
</plist>
EOF

# فعل الخدمة:
launchctl load ~/Library/LaunchAgents/com.villahadad.mount.plist
```

---

## 🔧 الخطوة 3: تحديث التطبيق (Auto-connect)

سأضيف كود يحاول الاتصال تلقائياً عند فتح التطبيق.

### ملف: `electron/services/NasConfig.cjs`

أضف هذه الدالة:

```javascript
/**
 * Try to auto-mount NAS on startup
 * Returns true if successful or already mounted
 */
async autoMountOnStartup() {
  console.log('[NasConfig] Auto-mount check on startup...');
  
  // Check if already mounted
  const basePath = this.getNasBasePath();
  if (basePath) {
    console.log('[NasConfig] ✅ NAS already mounted at:', basePath);
    return { success: true, path: basePath, method: 'already-mounted' };
  }
  
  // Try to mount using IP
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  const mountPoint = '/Volumes/VillaHadad-Gallery';
  const smbUrl = `//mohamed@${this.config.nasIpAddress}/Gallery`;
  
  try {
    // Create mount point if not exists
    await execPromise(`mkdir -p "${mountPoint}"`);
    
    // Try to mount
    await execPromise(`mount_smbfs "${smbUrl}" "${mountPoint}"`);
    
    console.log('[NasConfig] ✅ Auto-mounted successfully at:', mountPoint);
    
    // Refresh config
    this.refreshPaths();
    
    return { success: true, path: mountPoint, method: 'auto-mounted' };
  } catch (error) {
    console.log('[NasConfig] ⚠️ Auto-mount failed:', error.message);
    return { success: false, error: error.message };
  }
}
```

### ملف: `electron/main.cjs`

أضف في `app.whenReady()`:

```javascript
// Auto-mount NAS on startup
console.log('[Main] 🔌 Attempting to auto-mount NAS...');
const nasMountResult = await nasConfig.autoMountOnStartup();
if (nasMountResult.success) {
  console.log('[Main] ✅ NAS ready:', nasMountResult.path);
} else {
  console.log('[Main] ⚠️ NAS auto-mount failed, will use local cache');
}
```

---

## 🔧 الخطوة 4: Header Status Bar دائم

سأضيف مؤشر دائم في رأس التطبيق.

### ملف: `src/components/shared/NASStatusIndicator.tsx`

سيتغير لون المؤشر حسب الحالة:
- 🟢 أخضر: NAS متصل
- 🟠 برتقالي: يحاول الاتصال
- 🔴 أحمر: غير متصل (Offline)

---

## 🔧 الخطوة 5: إعدادات سريعة يمكنك فعلها الآن

### A. في جهاز NAS (Synology):
1. ادخل على `http://192.168.68.113:5000`
2. Control Panel → Network
3. تأكد من:
   - **Server name**: VillaHadad
   - **Enable Bonjour**: ✅
   - **Workgroup**: WORKGROUP

### B. في الماك (Terminal):
```bash
# جرب هذا الأمر للتوصيل الدائم:
echo '//mohamed@192.168.68.113/Gallery' > ~/.nsmbrc
chmod 600 ~/.nsmbrc

# ثم أضف للـ Keychain:
sudo security add-internet-password -a mohamed -s 192.168.68.113 -w "your-password" -r "smb "
```

### C. اختبار الاتصال:
```bash
# جرب هذا الأمر:
open 'smb://mohamed@192.168.68.113/Gallery'

# إذا نجح، اجعله تلقائي:
echo 'open "smb://mohamed@192.168.68.113/Gallery"' >> ~/.bash_profile
```

---

## 📊 ما ستراه في التطبيق بعد التحديث

```
┌────────────────────────────────────────────┐
│  VillaHadad App          [🟢 NAS متصل]     │  ← Header دائم
│                              أو            │
│                            [🟠 جاري الاتصال]
├────────────────────────────────────────────┤
│                                            │
│  محتوى التطبيق...                          │
│                                            │
└────────────────────────────────────────────┘
```

عند فتح التطبيق:
1. يحاول الاتصال تلقائياً (3 ثواني)
2. إذا نجح → يصبح لونه أخضر
3. إذا فشل → يصبح لونه أحمر + زر "توصيل"

---

## ❓ هل تحتاج مساعدة في إعدادات NAS؟

إذا تريد، أرسل لي:
1. هل تستطيع الدخول على `http://192.168.68.113:5000`؟
2. ما هو نوع جهاز Synology (DS220+, DS920+, etc)؟
3. هل تريد كلمة مرور للـ NAS تُحفظ تلقائياً؟

أستطيع أن أكتب لك سكربت كامل يفعل كل شيء تلقائياً!
