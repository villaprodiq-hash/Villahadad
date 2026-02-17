import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Percent, PlusCircle, Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DiscountCode, UserRole } from '../../../types';
import { electronBackend } from '../../../services/mockBackend';
import { useAuth } from '../../../hooks/useAuth';

type DiscountFormState = {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  startAt: string;
  endAt: string;
  neverExpire: boolean;
  isPublished: boolean;
  notes: string;
};

const toInputDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzAdjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return tzAdjusted.toISOString().slice(0, 16);
};

const nowInputMinute = (): string => {
  const now = new Date();
  now.setSeconds(0, 0);
  return toInputDateTime(now.toISOString());
};

const normalizeRole = (role: unknown): string =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

const ManagerDiscountCodesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  const [showUnpublished, setShowUnpublished] = useState(true);
  const [form, setForm] = useState<DiscountFormState>({
    code: '',
    type: 'percentage',
    value: '',
    startAt: nowInputMinute(),
    endAt: '',
    neverExpire: true,
    isPublished: true,
    notes: '',
  });

  const loadCodes = useCallback(async () => {
    try {
      const data = await electronBackend.getDiscountCodes({
        includeInactive: showInactive,
        includeUnpublished: showUnpublished,
      });
      setCodes(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل تحميل أكواد الخصم';
      if (message.includes('صلاحية الخصومات')) {
        setCodes([]);
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showInactive, showUnpublished]);

  useEffect(() => {
    setIsLoading(true);
    loadCodes();
  }, [loadCodes]);

  useEffect(() => {
    const unsubscribe = electronBackend.subscribe(event => {
      if (event === 'discount_codes_updated') {
        loadCodes();
      }
    });
    return unsubscribe;
  }, [loadCodes]);

  const activeCount = useMemo(() => codes.filter(item => item.isActive).length, [codes]);
  const canManageDiscounts = normalizeRole(currentUser?.role) === UserRole.MANAGER;

  const handleCreateCode = async () => {
    if (!canManageDiscounts) {
      toast.warning('صلاحية الخصومات متاحة للمديرة فقط');
      return;
    }

    const normalizedCode = form.code.trim().toUpperCase();
    const normalizedValue = Number(form.value || 0);
    const startAt = form.startAt;
    const endAt = form.neverExpire ? undefined : form.endAt || undefined;

    if (!normalizedCode || normalizedCode.length < 3) {
      toast.error('كود الخصم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      toast.error('قيمة الخصم يجب أن تكون أكبر من صفر');
      return;
    }
    if (!startAt) {
      toast.error('حدد وقت بداية الخصم');
      return;
    }
    if (!form.neverExpire && !form.endAt) {
      toast.error('حدد وقت انتهاء الخصم أو فعّل بدون انتهاء');
      return;
    }

    setIsSaving(true);
    try {
      await electronBackend.createDiscountCode({
        code: normalizedCode,
        type: form.type,
        value: normalizedValue,
        startAt,
        endAt,
        isPublished: form.isPublished,
        notes: form.notes.trim() || undefined,
      });
      toast.success('تم إنشاء كود الخصم');
      setForm(prev => ({
        ...prev,
        code: '',
        value: '',
        notes: '',
        startAt: nowInputMinute(),
        endAt: '',
        neverExpire: true,
      }));
      await loadCodes();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إنشاء كود الخصم';
      if (message.includes('صلاحية الخصومات')) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (item: DiscountCode) => {
    if (!canManageDiscounts) {
      toast.warning('صلاحية الخصومات متاحة للمديرة فقط');
      return;
    }

    try {
      await electronBackend.updateDiscountCode(item.id, {
        isPublished: !item.isPublished,
      });
      toast.success(item.isPublished ? 'تم إخفاء الكود' : 'تم نشر الكود');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث حالة النشر';
      if (message.includes('صلاحية الخصومات')) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    }
  };

  const handleToggleActive = async (item: DiscountCode) => {
    if (!canManageDiscounts) {
      toast.warning('صلاحية الخصومات متاحة للمديرة فقط');
      return;
    }

    try {
      await electronBackend.updateDiscountCode(item.id, {
        isActive: !item.isActive,
      });
      toast.success(item.isActive ? 'تم تعطيل الكود' : 'تم تفعيل الكود');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث حالة الكود';
      if (message.includes('صلاحية الخصومات')) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    }
  };

  const handleSoftDelete = async (item: DiscountCode) => {
    if (!canManageDiscounts) {
      toast.warning('صلاحية الخصومات متاحة للمديرة فقط');
      return;
    }

    try {
      await electronBackend.deactivateDiscountCode(item.id);
      toast.success('تم إيقاف الكود');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إيقاف الكود';
      if (message.includes('صلاحية الخصومات')) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('تم نسخ الكود');
    } catch {
      toast.error('تعذر نسخ الكود');
    }
  };

  return (
    <div className="h-full overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar text-gray-900 dark:text-white">
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#131720] p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-900 dark:text-white font-bold text-base md:text-lg">إدارة أكواد الخصم</h3>
          <span className="text-xs px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            نشط: {activeCount}
          </span>
        </div>

        {!canManageDiscounts && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300">
            وضع العرض فقط: إنشاء وتعديل أكواد الخصم متاح للمديرة فقط.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">الكود</label>
            <input
              type="text"
              value={form.code}
              onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="VIP2026"
              className="w-full bg-white dark:bg-[#0f131a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">نوع الخصم</label>
            <select
              value={form.type}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  type: e.target.value === 'fixed' ? 'fixed' : 'percentage',
                }))
              }
              className="w-full bg-white dark:bg-[#0f131a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-amber-400"
            >
              <option value="percentage">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">
              القيمة {form.type === 'percentage' ? '(%)' : '(د.ع)'}
            </label>
            <input
              type="number"
              min={0}
              value={form.value}
              onChange={e => setForm(prev => ({ ...prev, value: e.target.value }))}
              placeholder={form.type === 'percentage' ? '10' : '50000'}
              className="w-full bg-white dark:bg-[#0f131a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">ملاحظات</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="مثال: خصم الجمعة"
              className="w-full bg-white dark:bg-[#0f131a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">يبدأ من</label>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={e => setForm(prev => ({ ...prev, startAt: e.target.value }))}
              className="w-full bg-white dark:bg-[#0f131a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">ينتهي في</label>
            <input
              type="datetime-local"
              value={form.endAt}
              disabled={form.neverExpire}
              onChange={e => setForm(prev => ({ ...prev, endAt: e.target.value }))}
              className="w-full bg-white dark:bg-[#0f131a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:border-amber-400 disabled:opacity-50"
            />
          </div>

          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.neverExpire}
                onChange={e => setForm(prev => ({ ...prev, neverExpire: e.target.checked }))}
              />
              بدون انتهاء
            </label>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={e => setForm(prev => ({ ...prev, isPublished: e.target.checked }))}
              />
              منشور للاستقبال
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateCode}
          disabled={isSaving || !canManageDiscounts}
          className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <PlusCircle size={16} />
          {isSaving ? 'جارِ الإنشاء...' : 'إنشاء كود خصم'}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#131720] p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h4 className="text-gray-900 dark:text-white font-bold">الأكواد الحالية</h4>
          <div className="flex items-center gap-4">
            <label className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
              />
              عرض غير النشط
            </label>
            <label className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnpublished}
                onChange={e => setShowUnpublished(e.target.checked)}
              />
              عرض غير المنشور
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="h-32 rounded-xl border border-dashed border-gray-300 dark:border-white/15 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            جارِ تحميل الأكواد...
          </div>
        ) : codes.length === 0 ? (
          <div className="h-32 rounded-xl border border-dashed border-gray-300 dark:border-white/15 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            لا توجد أكواد خصم حتى الآن
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map(item => {
              const isExpired = item.endAt ? new Date(item.endAt).getTime() < Date.now() : false;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f131a] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white font-bold">{item.code}</span>
                      <button
                        type="button"
                        onClick={() => copyCode(item.code)}
                        className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                        title="نسخ الكود"
                      >
                        <Copy size={14} />
                      </button>
                      <span
                        className={`text-[10px] px-2 py-1 rounded-md border ${
                          item.isPublished
                            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                            : 'border-gray-500/30 bg-gray-500/10 text-gray-300'
                        }`}
                      >
                        {item.isPublished ? 'منشور' : 'مخفي'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-1 rounded-md border ${
                          item.isActive
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                        }`}
                      >
                        {item.isActive ? 'نشط' : 'موقوف'}
                      </span>
                      {isExpired && (
                        <span className="text-[10px] px-2 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300">
                          منتهي
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      {item.type === 'percentage' ? <Percent size={14} /> : <Ticket size={14} />}
                      {item.type === 'percentage'
                        ? `خصم ${item.value}%`
                        : `خصم ${Number(item.value).toLocaleString()} د.ع`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      يبدأ: {toInputDateTime(item.startAt) || '—'}
                      {item.endAt ? ` | ينتهي: ${toInputDateTime(item.endAt)}` : ' | بدون انتهاء'}
                      {` | الاستخدام: ${item.usageCount ?? 0}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(item)}
                      disabled={!canManageDiscounts}
                      className="h-9 px-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {item.isPublished ? 'إخفاء' : 'نشر'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      disabled={!canManageDiscounts}
                      className="h-9 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {item.isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSoftDelete(item)}
                      disabled={!canManageDiscounts}
                      className="h-9 px-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      إيقاف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerDiscountCodesView;
