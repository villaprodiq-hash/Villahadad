/**
 * NASSettingsTab
 * 
 * Settings panel for NAS/Storage configuration
 * Allows users to configure NAS connection and view status
 */

import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Cloud, 
  CloudOff, 
  FolderOpen, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Settings,
  Wifi,
  Database,
  Loader2,
  Save,
  ExternalLink,
} from 'lucide-react';
import { useNASStatus } from '../../hooks/useNASStatus';

interface NASConfig {
  smbUrl: string;
  macosMountPath: string;
  appSubfolder: string;
  appFolderPath: string;
  nasRootPath: string;
  currentPath: string;
  isLocalCache: boolean;
  platform: string;
}

export const NASSettingsTab: React.FC = () => {
  const nasStatus = useNASStatus(5000); // Check every 5 seconds while on this page
  
  const [config, setConfig] = useState<NASConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSubfolder, setEditedSubfolder] = useState('');

  // Load current config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI?.nasConfig?.getConfig?.();
      if (result) {
        setConfig(result);
        setEditedSubfolder(result.appSubfolder || 'VillaApp');
      }
    } catch (error) {
      console.error('Failed to load NAS config:', error);
    }
    setLoading(false);
  };

  const handleSaveSubfolder = async () => {
    if (!editedSubfolder.trim()) return;
    
    setSaving(true);
    try {
      await window.electronAPI?.nasConfig?.setAppSubfolder?.(editedSubfolder.trim());
      await loadConfig();
      await nasStatus.refresh();
    } catch (error) {
      console.error('Failed to save subfolder:', error);
    }
    setSaving(false);
  };

  const handleOpenFolder = async () => {
    try {
      await window.electronAPI?.nasConfig?.openAppFolder?.();
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleInitializeFolder = async () => {
    try {
      const result = await window.electronAPI?.nasConfig?.initializeAppFolder?.();
      if (result?.success) {
        await nasStatus.refresh();
      }
    } catch (error) {
      console.error('Failed to initialize folder:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#F7931E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Connection Status Card */}
      <div className={`
        p-6 rounded-2xl border 
        ${nasStatus.connected 
          ? 'bg-green-500/5 border-green-500/20' 
          : 'bg-orange-500/5 border-orange-500/20'
        }
      `}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {nasStatus.connected ? (
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Cloud className="text-green-400" size={24} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <CloudOff className="text-orange-400" size={24} />
              </div>
            )}
            <div>
              <h3 className={`font-bold text-lg ${nasStatus.connected ? 'text-green-400' : 'text-orange-400'}`}>
                {nasStatus.connected ? 'NAS متصل' : 'وضع Offline'}
              </h3>
              <p className="text-gray-500 text-sm">
                {nasStatus.connected 
                  ? 'الملفات تُحفظ على Synology NAS' 
                  : 'الملفات تُحفظ محلياً وستتم مزامنتها لاحقاً'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => nasStatus.refresh()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            title="تحديث الحالة"
          >
            <RefreshCw 
              size={18} 
              className={`text-gray-400 ${nasStatus.loading ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1">نوع التخزين</p>
            <p className="text-white font-medium flex items-center gap-2">
              {nasStatus.isLocalCache ? (
                <>
                  <Database size={14} className="text-orange-400" />
                  ذاكرة محلية
                </>
              ) : (
                <>
                  <HardDrive size={14} className="text-green-400" />
                  Synology NAS
                </>
              )}
            </p>
          </div>
          
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1">المنصة</p>
            <p className="text-white font-medium">
              {config?.platform === 'darwin' ? 'macOS' : config?.platform}
            </p>
          </div>
        </div>

        {/* Pending Sync Warning */}
        {nasStatus.pendingSync > 0 && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-orange-400" size={20} />
            <div>
              <p className="text-orange-400 font-medium text-sm">
                {nasStatus.pendingSync} ملف في انتظار المزامنة
              </p>
              <p className="text-orange-400/70 text-xs">
                ستتم المزامنة تلقائياً عند اتصال NAS
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Path Configuration */}
      <div className="bg-[#1a1c22] p-6 rounded-2xl border border-white/5">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <FolderOpen className="text-[#F7931E]" size={20} />
          إعدادات المسار
        </h3>

        <div className="space-y-4">
          {/* NAS Root Path (Read Only) */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-2">
              مسار NAS الأساسي
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config?.nasRootPath || '/Volumes/VillaHadad'}
                readOnly
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-gray-400 text-sm"
              />
            </div>
            <p className="text-gray-600 text-xs mt-1">
              /Volumes/VillaHadad/Gallery
            </p>
          </div>

          {/* App Subfolder (Editable) */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-2">
              مجلد التطبيق
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editedSubfolder}
                onChange={(e) => setEditedSubfolder(e.target.value)}
                placeholder="VillaApp"
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#F7931E] focus:outline-none"
              />
              <button
                onClick={handleSaveSubfolder}
                disabled={saving || editedSubfolder === config?.appSubfolder}
                className="px-4 py-2 bg-[#F7931E] hover:bg-[#D67D15] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                حفظ
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-1">
              اسم المجلد الذي ستُحفظ فيه جلسات التصوير
            </p>
          </div>

          {/* Current Full Path */}
          <div className="pt-4 border-t border-white/5">
            <label className="text-xs font-bold text-gray-500 block mb-2">
              المسار الكامل للحفظ
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-green-400 text-sm font-mono overflow-x-auto">
                {nasStatus.appFolderPath || config?.appFolderPath || 'غير محدد'}
              </code>
              <button
                onClick={handleOpenFolder}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                title="فتح في Finder"
              >
                <ExternalLink size={18} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Folder Status */}
      <div className="bg-[#1a1c22] p-6 rounded-2xl border border-white/5">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Settings className="text-[#F7931E]" size={20} />
          حالة المجلدات
        </h3>

        <div className="space-y-3">
          {/* Photo Folder */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
            <div className="flex items-center gap-3">
              <FolderOpen size={18} className="text-gray-400" />
              <span className="text-gray-300">مجلد Gallery</span>
            </div>
            {nasStatus.photoFolderStatus?.exists ? (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle2 size={14} />
                موجود
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-400 text-sm">
                <AlertCircle size={14} />
                غير موجود
              </span>
            )}
          </div>

          {/* App Folder */}
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Database size={18} className="text-gray-400" />
              <span className="text-gray-300">مجلد التطبيق ({editedSubfolder})</span>
            </div>
            {nasStatus.appFolderStatus?.initialized ? (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle2 size={14} />
                جاهز
              </span>
            ) : (
              <button
                onClick={handleInitializeFolder}
                className="px-3 py-1 bg-[#F7931E]/20 text-[#F7931E] hover:bg-[#F7931E]/30 rounded-lg text-sm transition-colors"
              >
                إنشاء المجلد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Help Info */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
        <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
          <Wifi size={16} />
          كيفية الاتصال بـ NAS
        </h4>
        <ol className="text-blue-400/80 text-sm space-y-1 list-decimal list-inside">
          <li>تأكد من أن Synology متصل بنفس الشبكة</li>
          <li>افتح Finder ثم اضغط ⌘+K</li>
          <li>أدخل: <code className="bg-blue-500/20 px-1.5 py-0.5 rounded text-xs">smb://VillaHadad</code></li>
          <li>اختر مجلد Gallery للاتصال</li>
        </ol>
      </div>
    </div>
  );
};

export default NASSettingsTab;
