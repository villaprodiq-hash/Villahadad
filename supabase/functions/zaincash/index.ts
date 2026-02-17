import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, amount, orderId, serviceType, transactionId } = await req.json();

    // 🔒 SECURITY: Get credentials from environment ONLY (no fallback)
    const MERCHANT_ID = Deno.env.get('ZC_MERCHANT_ID');
    const MERCHANT_SECRET = Deno.env.get('ZC_SECRET');
    const MSISDN = Deno.env.get('ZC_MSISDN');
    
    // Fail fast if credentials not configured
    if (!MERCHANT_ID || !MERCHANT_SECRET || !MSISDN) {
      console.error('❌ ZainCash credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Payment gateway not configured. Please contact support.' 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Determine environment
    const IS_PROD = Deno.env.get('ZC_ENV') === 'production';

    console.log(`ZainCash: Starting ${action} in ${IS_PROD ? 'PRODUCTION' : 'TEST'} mode`);

    const BASE_URL = IS_PROD
      ? 'https://api.zaincash.iq/transaction'
      : 'https://test.zaincash.iq/transaction';

    // Prepare Secret Key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(MERCHANT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    // ACTION: INIT (Start Payment)
    if (action === 'init') {
      const payload = {
        amount: amount,
        serviceType: serviceType || 'Photography Service',
        msisdn: MSISDN,
        orderId: orderId,
        redirectUrl: req.headers.get('origin') + '/payment/callback',
        iat: getNumericDate(0),
        exp: getNumericDate(60 * 60 * 4), // 4 hours
      };

      const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, key);

      console.log('ZainCash: Sending init request to', `${BASE_URL}/init`);

      const response = await fetch(`${BASE_URL}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: token,
          merchantId: MERCHANT_ID,
          lang: 'ar',
        }),
      });

      const data = await response.json();
      console.log('ZainCash Init Response:', data);

      if (data.err) {
        throw new Error(data.err.msg || 'ZainCash Init Error');
      }

      const payUrl = `${BASE_URL}/pay?id=${data.id}`;

      return new Response(JSON.stringify({ id: data.id, url: payUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: CHECK (Check Status)
    if (action === 'check') {
      const payload = {
        id: transactionId,
        msisdn: MSISDN,
        iat: getNumericDate(0),
        exp: getNumericDate(60 * 60 * 4),
      };

      const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, key);

      const response = await fetch(`${BASE_URL}/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: token,
          merchantId: MERCHANT_ID,
        }),
      });

      const data = await response.json();
      console.log('ZainCash Check Response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (error: unknown) {
    console.error('ZainCash Function Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
