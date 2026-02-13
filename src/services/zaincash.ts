import { supabase } from './supabase';

export interface ZainCashInitResponse {
  id: string;
  url: string;
}

export interface ZainCashStatusResponse {
  status: 'success' | 'pending' | 'failed' | 'completed';
  id: string;
  orderid: string;
  msg?: string;
}

export const zainCashService = {
  /**
   * Start a payment process and get the payment URL
   */
  initiatePayment: async (
    amount: number,
    orderId: string,
    serviceType: string = 'Photography Service'
  ): Promise<ZainCashInitResponse> => {
    // 🔒 SECURITY: Validate payment amount
    if (!amount || amount <= 0) {
      throw new Error('المبلغ يجب أن يكون أكبر من صفر');
    }
    
    // Prevent extremely large amounts (10 million IQD max)
    if (amount > 10000000) {
      throw new Error('المبلغ كبير جداً - الحد الأقصى 10 مليون دينار');
    }
    
    // Validate orderId format
    if (!orderId || orderId.trim().length === 0) {
      throw new Error('معرّف الطلب مطلوب');
    }
    
    // TODO: Add duplicate order check against database
    // const existingOrder = await checkExistingOrder(orderId);
    // if (existingOrder) throw new Error('الطلب موجود مسبقاً');

    const { data, error } = await supabase.functions.invoke('zaincash', {
      body: {
        action: 'init',
        amount,
        orderId,
        serviceType,
      },
    });

    if (error) {
      console.error('ZainCash Init Error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Check the status of a transaction
   */
  checkStatus: async (transactionId: string): Promise<ZainCashStatusResponse> => {
    const { data, error } = await supabase.functions.invoke('zaincash', {
      body: {
        action: 'check',
        transactionId,
      },
    });

    if (error) {
      console.error('ZainCash Check Error:', error);
      throw error;
    }
    return data;
  },
};
