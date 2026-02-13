import React, { useState } from 'react';
import { User, UserRole, RoleLabels, ROLE_PERMISSIONS, RolePermissions } from '../types';
import {
  Shield,
  Plus,
  Trash2,
  User as UserIcon,
  Camera,
  Calculator,
  X,
  CreditCard,
  Banknote,
  Landmark,
  Wallet,
  Crown,
  Settings,
} from 'lucide-react';
import ReceptionPageWrapper from './reception/layout/ReceptionPageWrapper';

interface SettingsViewProps {
  users: User[];
  onAddUser: (name: string, role: UserRole) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
  onClose: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  users,
  onAddUser,
  onDeleteUser,
  currentUser,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('users');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.RECEPTION);

  const isManager = currentUser.role === UserRole.MANAGER;

  // Financial Settings State
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 'pm_1', name: 'الدفع النقدي (Cash)', type: 'cash', enabled: true },
    { id: 'pm_2', name: 'تحويل بنكي (Bank Transfer)', type: 'bank', enabled: true },
    { id: 'pm_3', name: 'دفع إلكتروني (Online Gateway)', type: 'online', enabled: false },
  ]);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState('bank');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      onAddUser(newUserName, newUserRole);
      setNewUserName('');
    }
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMethodName.trim()) {
      setPaymentMethods(prev => [
        ...prev,
        { id: `pm_${Date.now()}`, name: newMethodName, type: newMethodType, enabled: true },
      ]);
      setNewMethodName('');
      setNewMethodType('bank');
    }
  };

  const toggleMethod = (id: string) => {
    setPaymentMethods(prev => prev.map(m => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const deleteMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(m => m.id !== id));
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.MANAGER:
        return (
          <span className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
            <Crown size={10} /> 👑 المديرة
          </span>
        );
      case UserRole.ADMIN:
        return (
          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
            <Shield size={10} /> الإدارة
          </span>
        );
      case UserRole.RECEPTION:
        return (
          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
            <UserIcon size={10} /> مسؤول الحجوزات
          </span>
        );
      case UserRole.PHOTO_EDITOR:
        return (
          <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
            <Camera size={10} /> قسم التصميم
          </span>
        );
      case UserRole.VIDEO_EDITOR:
        return (
          <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
            <Camera size={10} /> المونتير
          </span>
        );
      case UserRole.PRINTER:
        return (
          <span className="bg-gray-500/20 text-gray-300 border border-gray-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
            <Calculator size={10} /> قسم الطباعة
          </span>
        );
      default:
        return (
          <span className="bg-gray-500/20 text-gray-300 border border-gray-500/30 px-2 py-0.5 rounded text-xs font-bold">
            {role}
          </span>
        );
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote size={20} />;
      case 'bank':
        return <Landmark size={20} />;
      case 'online':
        return <CreditCard size={20} />;
      default:
        return <Wallet size={20} />;
    }
  };

  return (
    <ReceptionPageWrapper>
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="text-[#F7931E]" size={28} />
              الإعدادات والصلاحيات
            </h2>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              إدارة فريق العمل، الصلاحيات، وإعدادات النظام.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
            title="إغلاق الإعدادات"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-full lg:w-64 space-y-2 shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-0 lg:gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-right px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeTab === 'users' ? 'bg-[#F7931E] text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <UserIcon size={18} />
              <span className="flex-1">إدارة المستخدمين</span>
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`w-full text-right px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeTab === 'financial' ? 'bg-[#F7931E] text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <CreditCard size={18} />
              <span className="flex-1">الإعدادات المالية</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-[#1a1c22] border border-white/5 rounded-[2.5rem] shadow-[8px_8px_16px_#111216,-8px_-8px_16px_#23262e] p-4 md:p-8 overflow-y-auto custom-scrollbar">
            {activeTab === 'users' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Add User Section */}
                <div className="bg-[#1E1E1E] p-4 md:p-6 rounded-2xl border border-white/5">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Plus className="bg-white/10 p-1 rounded-full" size={24} />
                    إضافة عضو جديد
                  </h3>
                  <form
                    onSubmit={handleAddSubmit}
                    className="flex flex-col md:flex-row gap-4 md:items-end"
                  >
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-gray-500">اسم المستخدم</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        placeholder="الاسم الثلاثي أو الوظيفي..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#F7931E] focus:outline-none"
                      />
                    </div>
                    <div className="w-full md:w-48 space-y-2">
                      <label className="text-xs font-bold text-gray-500">الدور الوظيفي</label>
                      <select
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as UserRole)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#F7931E] outline-none appearance-none"
                      >
                        {isManager && <option value={UserRole.MANAGER}>👑 المديرة</option>}
                        <option value={UserRole.ADMIN}>الإدارة (Admin)</option>
                        <option value={UserRole.RECEPTION}>مسؤول الحجوزات</option>
                        <option value={UserRole.PHOTO_EDITOR}>قسم التصميم</option>
                        <option value={UserRole.VIDEO_EDITOR}>المونتير</option>
                        <option value={UserRole.PRINTER}>قسم الطباعة</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={!newUserName}
                      className="w-full md:w-auto px-6 py-3 bg-[#F7931E] hover:bg-[#D67D15] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      إضافة
                    </button>
                  </form>
                </div>

                {/* Users List */}
                <div>
                  <h3 className="text-gray-400 font-bold mb-4 text-sm uppercase tracking-wider">
                    قائمة المستخدمين ({users.length})
                  </h3>
                  <div className="grid gap-3">
                    {users.map(user => (
                      <div
                        key={user.id}
                        className="bg-[#1a1c22] p-4 rounded-xl border border-white/5 shadow-md flex flex-wrap sm:flex-nowrap items-center justify-between group gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-full ${user.avatar || 'bg-gray-700'} flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0`}
                          >
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-lg flex flex-wrap items-center gap-2">
                              {user.name}
                              {user.id === currentUser.id && (
                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                                  أنت
                                </span>
                              )}
                            </h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {getRoleBadge(user.role)}
                              <span className="text-gray-600 text-xs flex items-center gap-1">
                                ID: {user.id}
                              </span>
                            </div>
                          </div>
                        </div>

                        {user.id !== currentUser.id && user.role !== UserRole.MANAGER && (
                          <button
                            onClick={() => onDeleteUser(user.id)}
                            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-100 lg:opacity-0 group-hover:opacity-100 ml-auto sm:ml-0"
                            title="حذف المستخدم"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-[#1a1c22] p-4 md:p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="text-[#F7931E]" size={24} />
                    إضافة طريقة دفع جديدة
                  </h3>
                  <form
                    onSubmit={handleAddPaymentMethod}
                    className="flex flex-col md:flex-row gap-4 md:items-end"
                  >
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-white">اسم الطريقة / البنك</label>
                      <input
                        type="text"
                        value={newMethodName}
                        onChange={e => setNewMethodName(e.target.value)}
                        placeholder="مثال: تحويل بنكي (بنك بغداد)..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#F7931E] focus:outline-none"
                      />
                    </div>
                    <div className="w-full md:w-48 space-y-2">
                      <label className="text-xs font-bold text-white">النوع</label>
                      <select
                        value={newMethodType}
                        onChange={e => setNewMethodType(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#F7931E] outline-none appearance-none"
                      >
                        <option value="bank" className="bg-[#333]">
                          تحويل بنكي
                        </option>
                        <option value="online" className="bg-[#333]">
                          بوابة دفع
                        </option>
                        <option value="cash" className="bg-[#333]">
                          نقدي
                        </option>
                        <option value="custom" className="bg-[#333]">
                          أخرى
                        </option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={!newMethodName}
                      className="w-full md:w-auto px-6 py-3 bg-[#F7931E] hover:bg-[#D67D15] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      إضافة
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="text-gray-400 font-bold mb-4 text-sm uppercase tracking-wider">
                    طرق الدفع المفعلة
                  </h3>
                  <div className="grid gap-3">
                    {paymentMethods.map(method => (
                      <div
                        key={method.id}
                        className={`p-4 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition-all ${method.enabled ? 'bg-[#1a1c22] border-white/5 shadow-md' : 'bg-[#1a1a1a] border-white/5 opacity-60'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${method.enabled ? 'bg-gradient-to-br from-[#F7931E]/20 to-[#F9BE70]/20 text-[#F7931E]' : 'bg-white/5 text-gray-500'}`}
                          >
                            {getMethodIcon(method.type)}
                          </div>
                          <div>
                            <h4
                              className={`font-bold text-lg ${method.enabled ? 'text-white' : 'text-gray-500'}`}
                            >
                              {method.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {method.enabled ? 'نشط - يظهر في الفواتير' : 'غير نشط'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          <button
                            onClick={() => toggleMethod(method.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${method.enabled ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}
                          >
                            {method.enabled ? 'مفعل' : 'تفعيل'}
                          </button>
                          <button
                            onClick={() => deleteMethod(method.id)}
                            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="حذف الطريقة"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ReceptionPageWrapper>
  );
};

export default SettingsView;
