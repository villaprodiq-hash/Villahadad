import React from 'react';
import ElectronicPaymentsWidget from '../../shared/widgets/ElectronicPaymentsWidget';
import { CreditCard, History, ShieldCheck } from 'lucide-react';

const ManagerPaymentGatewayView: React.FC = () => {
  return (
    <div
      className="h-full w-full bg-gray-50 dark:bg-black p-6 overflow-y-auto custom-scrollbar"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#C94557]" />
            بوابة الدفع الإلكتروني
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            إدارة وتفعيل بوابات الدفع الرقمية (Zain Cash, Qi Card, Neo Pay) ومتابعة العمليات.
          </p>
        </div>

        {/* Main Widget Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Status Widget - Full Width on Mobile, 2/3 on Desktop */}
          <div className="lg:col-span-2">
            <ElectronicPaymentsWidget isManager={true} />
          </div>

          {/* Side Info / Security Status */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1c22] p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-500/10 rounded-full text-green-500">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">حالة الأمان</h3>
                  <p className="text-xs text-gray-500">تشفير E2EE مفعل</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">بروتوكول الاتصال</span>
                  <span className="font-mono text-green-500 font-bold">HTTPS/TLS 1.3</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">حالة API</span>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs rounded-full border border-amber-500/20">
                    قيد التطوير
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-br from-[#C94557] to-rose-600 p-6 rounded-[2rem] text-white shadow-xl shadow-rose-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-2">هل تحتاج مساعدة؟</h3>
                <p className="text-white/80 text-sm mb-4 leading-relaxed">
                  فريق الدعم التقني جاهز لمساعدتك في ربط بوابات الدفع وتوثيق الحسابات التجارية.
                </p>
                <button className="bg-white text-rose-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors">
                  تواصل مع الدعم
                </button>
              </div>
              {/* Decoration */}
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Transaction Log Placeholder */}
        <div className="bg-white dark:bg-[#1a1c22] rounded-[2.5rem] border border-gray-200 dark:border-white/5 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              سجل العمليات الإلكترونية
            </h3>
            <button className="text-xs text-[#C94557] font-bold hover:underline">عرض الكل</button>
          </div>

          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center min-h-[200px]">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-gray-300" />
            </div>
            <p>لا توجد عمليات دفع إلكتروني مسجلة بعد.</p>
            <p className="text-xs mt-2 opacity-60">ستظهر العمليات هنا فور تفعيل البوابات.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerPaymentGatewayView;
