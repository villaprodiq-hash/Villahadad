import React, { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle, XCircle, FileText, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '../../utils/formatMoney';
import { addOnService } from '../../services/db/services/AddOnService';
import {
  AddOnItem,
  AddOnSummary,
  AddOnStatus,
  AddOnCategory,
  AddOnCategoryLabels,
  AddOnStatusLabels,
  CreateAddOnData,
  InvoiceEntry,
} from '../../types/addon.types';
import { Booking, User, UserRole, Currency } from '../../../types';

interface AddOnManagerProps {
  booking: Booking;
  currentUser: User;
  onAddOnCreated?: (addOn: AddOnItem) => void;
  onAddOnApproved?: (addOn: AddOnItem) => void;
  onInvoiceGenerated?: (invoice: InvoiceEntry) => void;
}

export const AddOnManager: React.FC<AddOnManagerProps> = ({
  booking,
  currentUser,
  onAddOnCreated,
  onAddOnApproved,
  onInvoiceGenerated,
}) => {
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [summary, setSummary] = useState<AddOnSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const canApprove = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;

  const loadAddOns = useCallback(async () => {
    setLoading(true);
    try {
      const addOnSummary = await addOnService.getAddOnSummary(booking.id);
      setAddOns(addOnSummary.items);
      setSummary(addOnSummary);
    } catch (error) {
      console.error('Failed to load add-ons:', error);
      toast.error('فشل تحميل الخدمات الإضافية');
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    void loadAddOns();
  }, [loadAddOns]);

  const handleCreateAddOn = async (data: CreateAddOnData) => {
    try {
      const addOn = await addOnService.createAddOn(
        booking.id,
        data,
        { id: currentUser.id, name: currentUser.name }
      );
      
      toast.success('تم إنشاء طلب الخدمة الإضافية بنجاح');
      setShowCreateModal(false);
      await loadAddOns();
      onAddOnCreated?.(addOn);
    } catch (error) {
      console.error('Failed to create add-on:', error);
      toast.error('فشل إنشاء الخدمة الإضافية');
    }
  };

  const handleApproveAddOn = async (addOnId: string) => {
    try {
      const addOn = await addOnService.approveAddOn(addOnId, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });
      
      toast.success('تمت الموافقة على الخدمة الإضافية');
      await loadAddOns();
      onAddOnApproved?.(addOn);
    } catch (error) {
      console.error('Failed to approve add-on:', error);
      toast.error('فشل الموافقة على الخدمة الإضافية');
    }
  };

  const handleRejectAddOn = async (addOnId: string) => {
    const reason = window.prompt('سبب الرفض:');
    if (!reason) return;

    try {
      await addOnService.rejectAddOn(addOnId, reason, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });
      
      toast.success('تم رفض الخدمة الإضافية');
      await loadAddOns();
    } catch (error) {
      console.error('Failed to reject add-on:', error);
      toast.error('فشل رفض الخدمة الإضافية');
    }
  };

  const handleDeleteAddOn = async (addOnId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة الإضافية؟')) return;

    try {
      await addOnService.deleteAddOn(addOnId, {
        id: currentUser.id,
        name: currentUser.name,
      });
      
      toast.success('تم حذف الخدمة الإضافية');
      await loadAddOns();
    } catch (error) {
      console.error('Failed to delete add-on:', error);
      toast.error('فشل حذف الخدمة الإضافية');
    }
  };

  const handleGenerateInvoice = async () => {
    if (selectedAddOns.length === 0) {
      toast.error('يرجى اختيار خدمة إضافية واحدة على الأقل');
      return;
    }

    try {
      const invoice = await addOnService.generateUpdatedInvoice(
        booking.id,
        selectedAddOns,
        { id: currentUser.id, name: currentUser.name }
      );
      
      toast.success('تم إنشاء الفاتورة بنجاح');
      setSelectedAddOns([]);
      await loadAddOns();
      onInvoiceGenerated?.(invoice);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast.error('فشل إنشاء الفاتورة');
    }
  };

  const toggleAddOnSelection = (addOnId: string) => {
    setSelectedAddOns(prev =>
      prev.includes(addOnId)
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const getStatusColor = (status: AddOnStatus) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'invoiced':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Original Package Price Display */}
      <div className="bg-linear-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-600">سعر الباقة الأصلي</span>
            <p className="text-xs text-gray-400 mt-1">غير قابل للتغيير</p>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {formatMoney(summary?.originalPackagePrice || booking.totalAmount, booking.currency)}
          </span>
        </div>
      </div>

      {/* Add-Ons Summary */}
      {summary && summary.totalAddOns > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-700">{summary.totalAddOns}</p>
            <p className="text-xs text-blue-600">خدمات إضافية</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-center">
            <p className="text-lg font-bold text-emerald-700">
              {formatMoney(summary.totalAddOnAmount, booking.currency)}
            </p>
            <p className="text-xs text-emerald-600">قيمة الإضافات</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-center">
            <p className="text-lg font-bold text-amber-700">
              {formatMoney(summary.remainingBalance, booking.currency)}
            </p>
            <p className="text-xs text-amber-600">المتبقي</p>
          </div>
        </div>
      )}

      {/* Add-On List */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900">الخدمات الإضافية</h3>
        
        {addOns.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">لا توجد خدمات إضافية مسجلة</p>
          </div>
        ) : (
          addOns.map(addOn => (
            <div
              key={addOn.id}
              className={`p-4 rounded-xl border transition-all ${
                selectedAddOns.includes(addOn.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Selection Checkbox */}
                  {addOn.status === 'approved' && (
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(addOn.id)}
                      onChange={() => toggleAddOnSelection(addOn.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(addOn.status)}`}>
                        {AddOnStatusLabels[addOn.status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {AddOnCategoryLabels[addOn.category]}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mt-1">{addOn.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>بواسطة: {addOn.requestedByName}</span>
                      <span>التاريخ: {new Date(addOn.requestedAt).toLocaleDateString('ar-IQ')}</span>
                    </div>
                    {addOn.approvedByName && (
                      <p className="text-sm text-gray-500 mt-1">
                        تمت الموافقة بواسطة: {addOn.approvedByName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <p className="text-lg font-bold text-gray-900">
                    {formatMoney(addOn.amount, addOn.currency)}
                  </p>
                  <p className="text-xs text-gray-400">
                    سعر الصرف: {addOn.exchangeRate.toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {formatMoney(addOn.convertedAmount, 'IQD')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                {addOn.status === 'pending' && canApprove && (
                  <>
                    <button
                      onClick={() => handleApproveAddOn(addOn.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      موافقة
                    </button>
                    <button
                      onClick={() => handleRejectAddOn(addOn.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      رفض
                    </button>
                  </>
                )}
                
                {(addOn.status === 'pending' || currentUser.role === UserRole.MANAGER) && (
                  <button
                    onClick={() => handleDeleteAddOn(addOn.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-rose-600 text-sm hover:bg-rose-50 rounded-lg transition-colors mr-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة خدمة جديدة
        </button>
        
        {selectedAddOns.length > 0 && (
          <button
            onClick={handleGenerateInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            إنشاء فاتورة ({selectedAddOns.length})
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <AddOnCreateModal
          booking={booking}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAddOn}
        />
      )}
    </div>
  );
};

// Add-On Create Modal Component
interface AddOnCreateModalProps {
  booking: Booking;
  onClose: () => void;
  onSubmit: (data: CreateAddOnData) => void;
}

const AddOnCreateModal: React.FC<AddOnCreateModalProps> = ({
  booking,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CreateAddOnData>({
    category: 'custom_request',
    description: '',
    amount: 0,
    currency: booking.currency,
    exchangeRate: 1450,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || formData.amount <= 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">إضافة خدمة إضافية</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as AddOnCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(AddOnCategoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="وصف الخدمة الإضافية..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
              <input
                type="number"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العملة</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
          </div>

          {formData.currency === 'USD' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر الصرف (دينار/دولار)</label>
              <input
                type="number"
                value={formData.exchangeRate}
                onChange={e => setFormData({ ...formData, exchangeRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">معاينة:</p>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">المبلغ بالدينار:</span>
              <span className="font-bold text-emerald-600">
                {formatMoney(
                  formData.currency === 'USD'
                    ? formData.amount * formData.exchangeRate
                    : formData.amount,
                  'IQD'
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              إنشاء الطلب
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOnManager;
