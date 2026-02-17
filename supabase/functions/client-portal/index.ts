/**
 * client-portal Edge Function (Security Hardened)
 *
 * Features:
 * - Signed booking token validation (HMAC)
 * - Token expiry (default 14 days)
 * - Password verification (one-time per browser session token)
 * - Password rate limiting (5 wrong attempts -> 15 min block)
 * - Access logging (IP, action, success/fail)
 * - Staff link rotation (Generate New Link / Ensure Link)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-admin-key, x-client-portal-admin-key',
};

type SupabaseEdgeClient = ReturnType<typeof createClient>;

type PortalAction =
  | 'get_access_state'
  | 'request_otp'
  | 'verify_access'
  | 'verify_otp'
  | 'generate_new_link'
  | 'ensure_token'
  | 'get_photo_count'
  | 'get_selected_names'
  | 'get_photos'
  | 'update_selection'
  | 'confirm_selection'
  | 'get_download_urls';

interface PortalRequest {
  action?: PortalAction | string;
  token?: string;
  phone?: string;
  otp?: string;
  password?: string;
  sessionToken?: string;
  bookingId?: string;
  adminKey?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  selections?: Array<{ imageId: string; status: string; liked?: boolean; notes?: string | null }>;
}

interface SessionImageRow {
  id: string;
  file_name?: string;
  cloud_url?: string;
  thumbnail_url?: string | null;
  status?: string;
  liked?: boolean | number;
  notes?: string | null;
  sort_order?: number;
  is_selected?: boolean;
}

interface QueryResult {
  data: Array<Record<string, unknown>> | null;
  error: { message?: string } | null;
  count?: number | null;
}

interface QueryChain {
  select(columns: string, options?: { count?: 'exact'; head?: boolean }): QueryChain;
  order(column: string, options?: { ascending?: boolean }): QueryChain;
  eq(column: string, value: unknown): QueryChain;
  in(column: string, values: unknown[]): QueryChain;
  not(column: string, operator: string, value: unknown): QueryChain;
  limit(count: number): QueryChain;
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

interface BookingRow {
  id: string;
  client_name: string;
  title: string;
  category: string;
  status: string;
  phone?: string | null;
  details?: unknown;
  client_token?: string | null;
  client_token_expires_at?: string | null;
  client_portal_password_hash?: string | null;
  client_portal_password_set_at?: string | null;
  client_portal_password_attempts?: number | null;
  client_portal_password_blocked_until?: string | null;
  otp_attempts?: number | null;
  otp_blocked_until?: string | null;
  otp_code_hash?: string | null;
  otp_code_expires_at?: string | null;
  otp_verified_at?: string | null;
  otp_last_sent_at?: string | null;
}

interface TokenPayload {
  v: number;
  bookingId: string;
  iat: number;
  exp: number;
  nonce: string;
}

interface SessionPayload {
  v: number;
  bookingId: string;
  tokenHash: string;
  iat: number;
  exp: number;
  nonce: string;
}

const TOKEN_PREFIX = 'vh';
const SESSION_PREFIX = 'vhs';

const TOKEN_TTL_DAYS = Number(Deno.env.get('CLIENT_PORTAL_TOKEN_TTL_DAYS') || 14);
const PASSWORD_MAX_ATTEMPTS = Number(Deno.env.get('CLIENT_PORTAL_PASSWORD_MAX_ATTEMPTS') || 5);
const PASSWORD_BLOCK_MINUTES = Number(Deno.env.get('CLIENT_PORTAL_PASSWORD_BLOCK_MINUTES') || 15);
const PASSWORD_LENGTH = 6;
const PASSWORD_REGEX = new RegExp(`^\\d{${PASSWORD_LENGTH}}$`);
const PORTAL_SESSION_TTL_DAYS = Number(Deno.env.get('CLIENT_PORTAL_SESSION_TTL_DAYS') || 30);

type TokenValidationResult =
  | { ok: true; booking: BookingRow; expiresAtIso: string; payload: TokenPayload }
  | { ok: false; response: Response };

type SessionValidationResult =
  | { ok: true; payload: SessionPayload }
  | { ok: false; reason: string; code: string };

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const serviceRoleKey =
    Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const tokenSecret =
    Deno.env.get('CLIENT_PORTAL_TOKEN_SECRET') ||
    Deno.env.get('PORTAL_TOKEN_SECRET') ||
    Deno.env.get('TOKEN_SECRET') ||
    '';
  const passwordSecret = Deno.env.get('CLIENT_PORTAL_PASSWORD_SECRET') || tokenSecret;
  const sessionSecret = Deno.env.get('CLIENT_PORTAL_SESSION_SECRET') || tokenSecret;
  const adminActionKey = Deno.env.get('CLIENT_PORTAL_ADMIN_KEY') || '';

  if (!serviceRoleKey || !supabaseUrl) {
    return errorResponse(500, 'Missing Supabase server configuration', 'CONFIG_ERROR');
  }

  if (!tokenSecret || !passwordSecret || !sessionSecret) {
    return errorResponse(500, 'Missing portal security secrets', 'CONFIG_ERROR');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: PortalRequest;
  try {
    payload = (await req.json()) as PortalRequest;
  } catch {
    return errorResponse(400, 'Invalid JSON body', 'INVALID_BODY');
  }

  const action = String(payload.action || '').trim();
  if (!action) {
    return errorResponse(400, 'Missing action', 'MISSING_ACTION');
  }

  if (action === 'generate_new_link') {
    return await handleGenerateNewLink(req, supabase, payload, adminActionKey, passwordSecret);
  }

  if (action === 'ensure_token') {
    return await handleEnsureToken(req, supabase, payload, tokenSecret, adminActionKey, passwordSecret);
  }

  const token = String(payload.token || '').trim();
  if (!token) {
    await logAccess(supabase, {
      bookingId: null,
      req,
      action,
      success: false,
      reason: 'MISSING_TOKEN',
    });
    return errorResponse(400, 'Missing client token', 'MISSING_TOKEN');
  }

  const tokenResult = await validateBookingToken(req, supabase, token, tokenSecret, action);
  if (!tokenResult.ok) return tokenResult.response;

  const { booking, expiresAtIso } = tokenResult;

  switch (action) {
    case 'get_access_state':
      return await handleGetAccessState(req, supabase, booking, token, payload.sessionToken, sessionSecret, expiresAtIso);

    case 'request_otp':
      return errorResponse(410, 'تم إيقاف OTP. استخدم رقم الهاتف + كلمة المرور', 'OTP_DISABLED');

    case 'verify_access':
    case 'verify_otp':
      return await handleVerifyAccess(
        req,
        supabase,
        booking,
        token,
        payload.phone,
        payload.password ?? payload.otp,
        passwordSecret,
        sessionSecret
      );

    case 'get_photo_count':
      return await handleGetPhotoCount(req, supabase, booking);

    case 'get_selected_names':
      return await handleGetSelectedNames(req, supabase, booking);

    case 'get_download_urls':
      return await handleGetDownloadUrls(req, supabase, booking);

    case 'get_photos':
    case 'update_selection':
    case 'confirm_selection': {
      const sessionCheck = await validateSessionToken(payload.sessionToken, booking.id, token, sessionSecret);
      if (!sessionCheck.ok) {
        await logAccess(supabase, {
          bookingId: booking.id,
          req,
          action,
          success: false,
          reason: sessionCheck.reason,
        });
        return errorResponse(401, 'يتطلب تسجيل الدخول بكلمة المرور', sessionCheck.code, {
          requiresPassword: true,
          requiresOtp: false,
        });
      }

      if (action === 'get_photos') {
        await logAccess(supabase, { bookingId: booking.id, req, action, success: true });
        return await handleGetPhotos(supabase, booking);
      }

      if (action === 'update_selection') {
        await logAccess(supabase, { bookingId: booking.id, req, action, success: true });
        return await handleUpdateSelection(supabase, booking, payload.selections || []);
      }

      await logAccess(supabase, { bookingId: booking.id, req, action, success: true });
      return await handleConfirmSelection(supabase, booking);
    }

    default:
      await logAccess(supabase, {
        bookingId: booking.id,
        req,
        action,
        success: false,
        reason: 'UNKNOWN_ACTION',
      });
      return errorResponse(400, `Unknown action: ${action}`, 'UNKNOWN_ACTION');
  }
});

async function validateBookingToken(
  req: Request,
  supabase: SupabaseEdgeClient,
  token: string,
  tokenSecret: string,
  action: string
): Promise<TokenValidationResult> {
  const parsed = await verifySignedToken(token, tokenSecret, TOKEN_PREFIX);
  const nowMs = Date.now();

  // Legacy signed token path (backward-compatible).
  if (parsed.ok) {
    const tokenExpiryMs = parsed.payload.exp * 1000;
    if (tokenExpiryMs <= nowMs) {
      await logAccess(supabase, {
        bookingId: parsed.payload.bookingId,
        req,
        action,
        success: false,
        reason: 'TOKEN_EXPIRED',
      });
      return {
        ok: false,
        response: errorResponse(
          410,
          'انتهت صلاحية الرابط. تواصل مع الاستوديو للحصول على رابط جديد',
          'TOKEN_EXPIRED'
        ),
      };
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(
        'id, client_name, title, category, status, phone, details, client_token, client_token_expires_at, client_portal_password_hash, client_portal_password_set_at, client_portal_password_attempts, client_portal_password_blocked_until, otp_attempts, otp_blocked_until, otp_code_hash, otp_code_expires_at, otp_verified_at, otp_last_sent_at'
      )
      .eq('id', parsed.payload.bookingId)
      .is('deleted_at', null)
      .maybeSingle();

    if (bookingErr || !booking) {
      await logAccess(supabase, {
        bookingId: parsed.payload.bookingId,
        req,
        action,
        success: false,
        reason: 'BOOKING_NOT_FOUND',
      });
      return { ok: false, response: errorResponse(404, 'الرابط غير صالح', 'INVALID_TOKEN') };
    }

    if ((booking.client_token || '') !== token) {
      await logAccess(supabase, {
        bookingId: booking.id,
        req,
        action,
        success: false,
        reason: 'TOKEN_REVOKED',
      });
      return { ok: false, response: errorResponse(404, 'الرابط غير صالح', 'INVALID_TOKEN') };
    }

    const dbExpiryMs = booking.client_token_expires_at
      ? new Date(booking.client_token_expires_at).getTime()
      : Number.NaN;
    const effectiveExpiryMs = Number.isFinite(dbExpiryMs)
      ? Math.min(tokenExpiryMs, dbExpiryMs)
      : tokenExpiryMs;

    if (effectiveExpiryMs <= nowMs) {
      await logAccess(supabase, {
        bookingId: booking.id,
        req,
        action,
        success: false,
        reason: 'TOKEN_EXPIRED',
      });
      return {
        ok: false,
        response: errorResponse(
          410,
          'انتهت صلاحية الرابط. تواصل مع الاستوديو للحصول على رابط جديد',
          'TOKEN_EXPIRED'
        ),
      };
    }

    return {
      ok: true,
      booking: booking as BookingRow,
      expiresAtIso: new Date(effectiveExpiryMs).toISOString(),
      payload: parsed.payload,
    };
  }

  // New opaque short-token path: token is random and expiry is DB-driven.
  const { data: opaqueBooking, error: opaqueErr } = await supabase
    .from('bookings')
    .select(
      'id, client_name, title, category, status, phone, details, client_token, client_token_expires_at, client_portal_password_hash, client_portal_password_set_at, client_portal_password_attempts, client_portal_password_blocked_until, otp_attempts, otp_blocked_until, otp_code_hash, otp_code_expires_at, otp_verified_at, otp_last_sent_at'
    )
    .eq('client_token', token)
    .is('deleted_at', null)
    .maybeSingle();

  if (opaqueErr || !opaqueBooking) {
    await logAccess(supabase, {
      bookingId: null,
      req,
      action,
      success: false,
      reason: parsed.reason,
    });
    return { ok: false, response: errorResponse(404, 'الرابط غير صالح', 'INVALID_TOKEN') };
  }

  const dbExpiryMs = opaqueBooking.client_token_expires_at
    ? new Date(opaqueBooking.client_token_expires_at).getTime()
    : Number.NaN;
  if (!Number.isFinite(dbExpiryMs) || dbExpiryMs <= nowMs) {
    await logAccess(supabase, {
      bookingId: opaqueBooking.id,
      req,
      action,
      success: false,
      reason: 'TOKEN_EXPIRED',
    });
    return {
      ok: false,
      response: errorResponse(
        410,
        'انتهت صلاحية الرابط. تواصل مع الاستوديو للحصول على رابط جديد',
        'TOKEN_EXPIRED'
      ),
    };
  }

  return {
    ok: true,
    booking: opaqueBooking as BookingRow,
    expiresAtIso: new Date(dbExpiryMs).toISOString(),
    payload: {
      v: 1,
      bookingId: opaqueBooking.id,
      iat: Math.floor(nowMs / 1000),
      exp: Math.floor(dbExpiryMs / 1000),
      nonce: 'opaque',
    },
  };
}

async function handleGetAccessState(
  req: Request,
  supabase: SupabaseEdgeClient,
  booking: BookingRow,
  token: string,
  sessionToken: string | undefined,
  sessionSecret: string,
  expiresAtIso: string
) {
  const sessionCheck = await validateSessionToken(sessionToken, booking.id, token, sessionSecret);
  const requiresPassword = !sessionCheck.ok;
  const requiresPhone = getBookingPhoneCandidates(booking).length > 0;

  await logAccess(supabase, {
    bookingId: booking.id,
    req,
    action: 'get_access_state',
    success: true,
    reason: requiresPassword ? sessionCheck.reason : null,
  });

  return jsonResponse({
    booking: {
      id: booking.id,
      clientName: booking.client_name,
      title: booking.title,
      category: booking.category,
      status: booking.status,
    },
    tokenExpiresAt: expiresAtIso,
    requiresPassword,
    requiresPhone,
    requiresOtp: false,
    hasSession: !requiresPassword,
  });
}

async function handleVerifyAccess(
  req: Request,
  supabase: SupabaseEdgeClient,
  booking: BookingRow,
  token: string,
  phoneInput: string | undefined,
  passwordInput: string | undefined,
  passwordSecret: string,
  sessionSecret: string
) {
  const normalizedInputPhone = normalizePhone(phoneInput || '');
  const bookingPhoneCandidates = getBookingPhoneCandidates(booking);
  const requiresPhone = bookingPhoneCandidates.length > 0;
  const hasMatchingBookingPhone = bookingPhoneCandidates.some((candidate) =>
    phonesMatch(normalizedInputPhone, candidate)
  );

  if (requiresPhone && (!normalizedInputPhone || !hasMatchingBookingPhone)) {
    await logAccess(supabase, {
      bookingId: booking.id,
      req,
      action: 'verify_access',
      success: false,
      reason: 'PHONE_MISMATCH',
      metadata: {
        inputPhone: maskPhone(normalizedInputPhone),
        registeredPhonesCount: bookingPhoneCandidates.length,
      },
    });
    return errorResponse(400, 'رقم الهاتف غير مطابق لبيانات الحجز', 'PHONE_MISMATCH');
  }

  const blockUntilMs = parseDateMs(
    booking.client_portal_password_blocked_until || booking.otp_blocked_until || null
  );
  if (blockUntilMs && blockUntilMs > Date.now()) {
    const remainingSec = Math.ceil((blockUntilMs - Date.now()) / 1000);
    await logAccess(supabase, {
      bookingId: booking.id,
      req,
      action: 'verify_access',
      success: false,
      reason: 'PASSWORD_BLOCKED',
      metadata: { remainingSec },
    });
    return errorResponse(429, 'تم حظر المحاولة مؤقتًا. حاول لاحقًا', 'PASSWORD_BLOCKED', { remainingSec });
  }

  const password = String(passwordInput || '').trim();
  if (!PASSWORD_REGEX.test(password)) {
    return errorResponse(400, `يرجى إدخال كلمة مرور رقمية من ${PASSWORD_LENGTH} أرقام`, 'PASSWORD_INVALID_FORMAT');
  }

  const storedHash = String(booking.client_portal_password_hash || '');
  if (!storedHash) {
    await logAccess(supabase, {
      bookingId: booking.id,
      req,
      action: 'verify_access',
      success: false,
      reason: 'PASSWORD_NOT_SET',
    });
    return errorResponse(
      428,
      'لم يتم إعداد كلمة مرور لهذا الرابط. اطلب من الاستوديو توليد رابط جديد',
      'PASSWORD_NOT_SET'
    );
  }

  const providedHash = await sha256Hex(`${token}:${password}:${passwordSecret}`);
  if (!safeEqual(storedHash, providedHash)) {
    const attempts = Number(booking.client_portal_password_attempts ?? booking.otp_attempts ?? 0) + 1;
    const shouldBlock = attempts >= PASSWORD_MAX_ATTEMPTS;
    const blockedUntilIso = shouldBlock
      ? new Date(Date.now() + PASSWORD_BLOCK_MINUTES * 60 * 1000).toISOString()
      : null;

    await supabase
      .from('bookings')
      .update({
        client_portal_password_attempts: attempts,
        client_portal_password_blocked_until: blockedUntilIso,
        otp_attempts: attempts,
        otp_blocked_until: blockedUntilIso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    await logAccess(supabase, {
      bookingId: booking.id,
      req,
      action: 'verify_access',
      success: false,
      reason: shouldBlock ? 'PASSWORD_BLOCKED' : 'PASSWORD_INVALID',
      metadata: {
        attempts,
        maxAttempts: PASSWORD_MAX_ATTEMPTS,
      },
    });

    if (shouldBlock) {
      return errorResponse(429, 'تم حظر المحاولة لمدة 15 دقيقة', 'PASSWORD_BLOCKED', {
        remainingSec: PASSWORD_BLOCK_MINUTES * 60,
      });
    }

    return errorResponse(401, 'كلمة المرور غير صحيحة', 'PASSWORD_INVALID', {
      attemptsRemaining: Math.max(0, PASSWORD_MAX_ATTEMPTS - attempts),
    });
  }

  const nowIso = new Date().toISOString();
  const sessionToken = await generateSignedToken(
    {
      v: 1,
      bookingId: booking.id,
      tokenHash: await sha256Hex(token),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + PORTAL_SESSION_TTL_DAYS * 24 * 60 * 60,
      nonce: crypto.randomUUID(),
    } satisfies SessionPayload,
    sessionSecret,
    SESSION_PREFIX
  );

  await supabase
    .from('bookings')
    .update({
      client_portal_password_attempts: 0,
      client_portal_password_blocked_until: null,
      otp_attempts: 0,
      otp_blocked_until: null,
      otp_verified_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', booking.id);

  await logAccess(supabase, {
    bookingId: booking.id,
    req,
    action: 'verify_access',
    success: true,
  });

  return jsonResponse({
    success: true,
    sessionToken,
    sessionExpiresAt: new Date(Date.now() + PORTAL_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    message: 'تم تسجيل الدخول بنجاح',
  });
}

async function handleGenerateNewLink(
  req: Request,
  supabase: SupabaseEdgeClient,
  payload: PortalRequest,
  adminActionKey: string,
  passwordSecret: string
) {
  const auth = authorizeAdminAction(req, payload, adminActionKey);
  if (!auth.ok) {
    await logAccess(supabase, {
      bookingId: payload.bookingId || null,
      req,
      action: 'generate_new_link',
      success: false,
      reason: auth.reason,
    });
    return auth.response;
  }

  const bookingId = String(payload.bookingId || '').trim();
  if (!bookingId) return errorResponse(400, 'Missing bookingId', 'MISSING_BOOKING_ID');

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !booking) {
    return errorResponse(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  }

  const issued = await issuePortalToken(supabase, bookingId, passwordSecret);
  if (!issued.ok) return issued.response;

  await logAccess(supabase, {
    bookingId,
    req,
    action: 'generate_new_link',
    success: true,
    metadata: {
      actorId: payload.actorId || null,
      actorName: payload.actorName || null,
      actorRole: payload.actorRole || null,
      expiresAt: issued.expiresAt,
    },
  });

  return jsonResponse({
    success: true,
    bookingId,
    token: issued.token,
    tokenExpiresAt: issued.expiresAt,
    portalPassword: issued.portalPassword,
    path: `/?t=${encodeURIComponent(issued.token)}`,
  });
}

async function handleEnsureToken(
  req: Request,
  supabase: SupabaseEdgeClient,
  payload: PortalRequest,
  tokenSecret: string,
  adminActionKey: string,
  passwordSecret: string
) {
  const auth = authorizeAdminAction(req, payload, adminActionKey);
  if (!auth.ok) {
    await logAccess(supabase, {
      bookingId: payload.bookingId || null,
      req,
      action: 'ensure_token',
      success: false,
      reason: auth.reason,
    });
    return auth.response;
  }

  const bookingId = String(payload.bookingId || '').trim();
  if (!bookingId) return errorResponse(400, 'Missing bookingId', 'MISSING_BOOKING_ID');

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, client_token, client_token_expires_at, client_portal_password_hash')
    .eq('id', bookingId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !booking) {
    return errorResponse(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  }

  const existingToken = String(booking.client_token || '');
  const dbExpiryMs = parseDateMs(booking.client_token_expires_at);
  const parsedExisting =
    existingToken.length > 0 ? await verifySignedToken(existingToken, tokenSecret, TOKEN_PREFIX) : null;
  const nowMs = Date.now();
  const isSignedTokenValid =
    !!parsedExisting?.ok &&
    parsedExisting.payload.bookingId === bookingId &&
    parsedExisting.payload.exp * 1000 > nowMs &&
    (!dbExpiryMs || dbExpiryMs > nowMs);
  const isOpaqueTokenValid =
    existingToken.length > 0 &&
    !parsedExisting?.ok &&
    !!dbExpiryMs &&
    dbExpiryMs > nowMs;
  const isExistingValid = isSignedTokenValid || isOpaqueTokenValid;
  const shouldRotateLegacySignedToken = isSignedTokenValid;
  const hasPassword = String(booking.client_portal_password_hash || '').length > 0;

  if (isExistingValid && hasPassword && !shouldRotateLegacySignedToken) {
    const expiresAtMs = isSignedTokenValid
      ? Math.min(parsedExisting.payload.exp * 1000, dbExpiryMs || parsedExisting.payload.exp * 1000)
      : (dbExpiryMs as number);
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    await logAccess(supabase, {
      bookingId,
      req,
      action: 'ensure_token',
      success: true,
      reason: 'REUSED',
      metadata: { expiresAt: expiresAtIso },
    });

    return jsonResponse({
      success: true,
      bookingId,
      token: existingToken,
      tokenExpiresAt: expiresAtIso,
      isNew: false,
      path: `/?t=${encodeURIComponent(existingToken)}`,
    });
  }

  if (isExistingValid && !hasPassword && !shouldRotateLegacySignedToken) {
    const portalPassword = generatePortalPassword();
    const passwordHash = await sha256Hex(`${existingToken}:${portalPassword}:${passwordSecret}`);
    const repairedAt = new Date().toISOString();
    const { error: repairError } = await supabase
      .from('bookings')
      .update({
        client_portal_password_hash: passwordHash,
        client_portal_password_set_at: repairedAt,
        client_portal_password_attempts: 0,
        client_portal_password_blocked_until: null,
        otp_attempts: 0,
        otp_blocked_until: null,
        updated_at: repairedAt,
      })
      .eq('id', bookingId);

    if (repairError) {
      return errorResponse(500, 'Failed to prepare password for existing link', 'PASSWORD_SETUP_FAILED');
    }

    const expiresAtMs = isSignedTokenValid
      ? Math.min(parsedExisting.payload.exp * 1000, dbExpiryMs || parsedExisting.payload.exp * 1000)
      : (dbExpiryMs as number);
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    await logAccess(supabase, {
      bookingId,
      req,
      action: 'ensure_token',
      success: true,
      reason: 'REUSED_PASSWORD_RESET',
      metadata: { expiresAt: expiresAtIso },
    });

    return jsonResponse({
      success: true,
      bookingId,
      token: existingToken,
      tokenExpiresAt: expiresAtIso,
      portalPassword,
      isNew: false,
      path: `/?t=${encodeURIComponent(existingToken)}`,
    });
  }

  const issued = await issuePortalToken(supabase, bookingId, passwordSecret);
  if (!issued.ok) return issued.response;

  await logAccess(supabase, {
    bookingId,
    req,
    action: 'ensure_token',
    success: true,
    reason: shouldRotateLegacySignedToken ? 'ROTATED_LEGACY_SIGNED_TOKEN' : 'ROTATED',
    metadata: { expiresAt: issued.expiresAt },
  });

  return jsonResponse({
    success: true,
    bookingId,
    token: issued.token,
    tokenExpiresAt: issued.expiresAt,
    portalPassword: issued.portalPassword,
    isNew: true,
    path: `/?t=${encodeURIComponent(issued.token)}`,
  });
}

async function issuePortalToken(
  supabase: SupabaseEdgeClient,
  bookingId: string,
  passwordSecret: string
): Promise<
  | { ok: true; token: string; expiresAt: string; portalPassword: string }
  | { ok: false; response: Response }
> {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + TOKEN_TTL_DAYS * 24 * 60 * 60;
  const token = await generateUniqueOpaquePortalToken(supabase);
  const expiresAt = new Date(expSec * 1000).toISOString();
  const portalPassword = generatePortalPassword();
  const passwordHash = await sha256Hex(`${token}:${portalPassword}:${passwordSecret}`);

  const { error } = await supabase
    .from('bookings')
    .update({
      client_token: token,
      client_token_expires_at: expiresAt,
      client_portal_password_hash: passwordHash,
      client_portal_password_set_at: new Date().toISOString(),
      client_portal_password_attempts: 0,
      client_portal_password_blocked_until: null,
      otp_attempts: 0,
      otp_blocked_until: null,
      otp_verified_at: null,
      otp_code_hash: null,
      otp_code_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) {
    return { ok: false, response: errorResponse(500, 'Failed to rotate token', 'TOKEN_ROTATE_FAILED') };
  }

  return { ok: true, token, expiresAt, portalPassword };
}

function authorizeAdminAction(
  req: Request,
  payload: PortalRequest,
  expectedKey: string
): { ok: true } | { ok: false; reason: string; response: Response } {
  const normalizedExpected = String(expectedKey || '').trim();

  if (!normalizedExpected) {
    return {
      ok: false,
      reason: 'MISSING_ADMIN_KEY_CONFIG',
      response: errorResponse(500, 'Missing CLIENT_PORTAL_ADMIN_KEY secret', 'CONFIG_ERROR'),
    };
  }

  const headerKeyPrimary = req.headers.get('x-portal-admin-key') || '';
  const headerKeyLegacy = req.headers.get('x-client-portal-admin-key') || '';
  const bodyKey = String(payload.adminKey || '');
  const provided = (headerKeyPrimary || headerKeyLegacy || bodyKey).trim();

  if (!provided || !safeEqual(provided, normalizedExpected)) {
    return {
      ok: false,
      reason: 'UNAUTHORIZED_ADMIN_ACTION',
      response: errorResponse(403, 'Forbidden admin action', 'FORBIDDEN'),
    };
  }

  return { ok: true };
}

async function handleGetPhotoCount(req: Request, supabase: SupabaseEdgeClient, booking: BookingRow) {
  const countRes = await runSessionImagesQuery(supabase, booking.id, q =>
    q.select('id', { count: 'exact', head: true }).not('cloud_url', 'is', null)
  );

  const count = Number(countRes.count || 0);
  await logAccess(supabase, {
    bookingId: booking.id,
    req,
    action: 'get_photo_count',
    success: !countRes.error,
    reason: countRes.error ? String(countRes.error.message || 'QUERY_FAILED') : null,
  });

  if (countRes.error) return errorResponse(500, 'Failed to read photo count', 'QUERY_FAILED');

  return jsonResponse({ success: true, totalCount: count });
}

async function handleGetSelectedNames(req: Request, supabase: SupabaseEdgeClient, booking: BookingRow) {
  let images: SessionImageRow[] = [];
  let error: QueryResult['error'] = null;

  let res = await runSessionImagesQuery(supabase, booking.id, q =>
    q.select('id, file_name, status').eq('status', 'selected')
  );

  images = res.data || [];
  error = res.error;

  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, is_selected').eq('is_selected', true)
    );
    images = res.data || [];
    error = res.error;
  }

  await logAccess(supabase, {
    bookingId: booking.id,
    req,
    action: 'get_selected_names',
    success: !error,
    reason: error ? String(error.message || 'QUERY_FAILED') : null,
  });

  if (error) return errorResponse(500, 'Failed to read selected names', 'QUERY_FAILED');

  const names = Array.from(
    new Set(
      images
        .map(img => String(img.file_name || '').trim())
        .filter(name => name.length > 0)
    )
  );

  return jsonResponse({ success: true, names, totalCount: names.length });
}

/**
 * Fetch all photos for a booking's session from session_images.
 */
async function handleGetPhotos(
  supabase: SupabaseEdgeClient,
  booking: { id: string; client_name: string; title: string; category: string; status: string }
) {
  let images: SessionImageRow[] = [];
  let error: QueryResult['error'] = null;

  // Try full schema first.
  let res = await runSessionImagesQuery(supabase, booking.id, q =>
    q
      .select('id, file_name, cloud_url, thumbnail_url, status, liked, notes, sort_order')
      .order('sort_order', { ascending: true })
  );

  images = res.data || [];
  error = res.error;

  // Fallback for older production schemas missing thumbnail_url / liked / notes / sort_order.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url, is_selected')
    );

    images = res.data || [];
    error = res.error;
  }

  // Final fallback for very old schemas missing status as well.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url')
    );

    images = res.data || [];
    error = res.error;
  }

  if (error) throw error;

  // Map snake_case → camelCase for the frontend
  const mappedImages = (images || []).map((img: SessionImageRow) => ({
    id: img.id,
    fileName: img.file_name,
    cloudUrl: img.cloud_url,
    thumbnailUrl: img.thumbnail_url || null,
    status: img.status || (img.is_selected ? 'selected' : 'pending'),
    liked: img.liked ? 1 : 0,
    notes: img.notes || null,
    sortOrder: img.sort_order ?? 0,
  }));

  return jsonResponse({
    booking: {
      clientName: booking.client_name,
      title: booking.title,
      category: booking.category,
      status: booking.status,
    },
    images: mappedImages,
    totalCount: mappedImages.length,
  });
}

/**
 * Update selection status for multiple images.
 * selections: [{ imageId: string, status: 'selected' | 'rejected' | 'pending', liked?: boolean, notes?: string | null }]
 */
async function handleUpdateSelection(
  supabase: SupabaseEdgeClient,
  booking: { id: string },
  selections: Array<{ imageId: string; status: string; liked?: boolean; notes?: string | null }>
) {
  if (!Array.isArray(selections) || selections.length === 0) {
    return errorResponse(400, 'No selections provided', 'NO_SELECTIONS');
  }

  const now = new Date().toISOString();
  let updated = 0;

  for (const sel of selections) {
    const ownership = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id').eq('id', sel.imageId).limit(1)
    );

    if (ownership.error || !ownership.data || ownership.data.length === 0) {
      continue;
    }

    const updateData: Record<string, unknown> = {
      status: sel.status,
      selected_by: 'client',
      selected_at: now,
      updated_at: now,
    };

    if (sel.liked !== undefined) updateData.liked = sel.liked;
    if (sel.notes !== undefined) updateData.notes = sel.notes;

    let updateRes = await supabase.from('session_images').update(updateData).eq('id', sel.imageId);

    if (updateRes.error && isMissingColumnError(updateRes.error)) {
      updateRes = await supabase
        .from('session_images')
        .update({ is_selected: sel.status === 'selected' })
        .eq('id', sel.imageId);
    }

    if (!updateRes.error) updated++;
  }

  return jsonResponse({ success: true, updated });
}

/**
 * Confirm final selection — locks in the client's choices.
 * Updates booking status, session status, and records
 * selection_confirmed_at for the 45-day R2 cleanup countdown.
 */
async function handleConfirmSelection(
  supabase: SupabaseEdgeClient,
  booking: { id: string; status: string }
) {
  const now = new Date().toISOString();

  // Count selected images
  let countRes = await runSessionImagesQuery(supabase, booking.id, q =>
    q.select('id', { count: 'exact', head: true }).eq('status', 'selected')
  );

  // Old schema fallback with boolean selection flag.
  if (countRes.error) {
    countRes = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id', { count: 'exact', head: true }).eq('is_selected', true)
    );
  }

  // Final fallback: count all linked images.
  if (countRes.error) {
    countRes = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id', { count: 'exact', head: true })
    );
  }

  const count = countRes.count || 0;

  // Calculate R2 cleanup date (45 days from now)
  const cleanupDate = new Date();
  cleanupDate.setDate(cleanupDate.getDate() + 45);

  // Update session — record confirmation timestamp + scheduled cleanup
  const sessionUpdate = {
    status: 'editing',
    selected_images: count,
    updated_at: now,
    selection_confirmed_at: now,
    r2_cleanup_after: cleanupDate.toISOString(),
  };

  let sessionRes = await supabase
    .from('sessions')
    .update(sessionUpdate)
    .eq('booking_id', booking.id);

  if (sessionRes.error && isMissingColumnError(sessionRes.error)) {
    sessionRes = await supabase.from('sessions').update(sessionUpdate).eq('bookingId', booking.id);
  }
  if (sessionRes.error && isMissingColumnError(sessionRes.error)) {
    sessionRes = await supabase.from('sessions').update(sessionUpdate).eq('bookingid', booking.id);
  }

  const sessionErr = sessionRes.error;
  if (sessionErr) console.error('Session update error:', sessionErr);

  // Always mark selection date, and advance status when still in selection pipeline.
  const bookingUpdate: Record<string, unknown> = {
    actual_selection_date: now,
    updated_at: now,
  };
  if (booking.status === 'Selection' || booking.status === 'Shooting Completed') {
    bookingUpdate.status = 'Editing';
  }

  const { error: bookingErr } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', booking.id);

  if (bookingErr) console.error('Booking status update error:', bookingErr);

  return jsonResponse({
    success: true,
    selectedCount: count,
    r2CleanupAfter: cleanupDate.toISOString(),
    message:
      'Selection confirmed — photos sent to editing. Cloud photos will be removed after 45 days.',
  });
}

/**
 * Get full-resolution download URLs for SELECTED session photos only.
 */
async function handleGetDownloadUrls(
  req: Request,
  supabase: SupabaseEdgeClient,
  booking: { id: string; client_name: string; title: string }
) {
  let images: SessionImageRow[] = [];
  let error: QueryResult['error'] = null;

  // Try with sort_order first.
  let res = await runSessionImagesQuery(supabase, booking.id, q =>
    q
      .select('id, file_name, cloud_url')
      .eq('status', 'selected')
      .not('cloud_url', 'is', null)
      .order('sort_order', { ascending: true })
  );

  images = res.data || [];
  error = res.error;

  // If selected list is empty but query succeeded, fallback to all cloud images.
  if (!error && images.length === 0) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').not('cloud_url', 'is', null)
    );
    images = res.data || [];
    error = res.error;
  }

  // Fallback for schemas without sort_order.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').eq('status', 'selected').not('cloud_url', 'is', null)
    );

    images = res.data || [];
    error = res.error;
  }

  // Fallback for legacy schemas using is_selected boolean.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').eq('is_selected', true).not('cloud_url', 'is', null)
    );

    images = res.data || [];
    error = res.error;
  }

  // Final fallback: return all cloud images.
  if (error) {
    res = await runSessionImagesQuery(supabase, booking.id, q =>
      q.select('id, file_name, cloud_url').not('cloud_url', 'is', null)
    );

    images = res.data || [];
    error = res.error;
  }

  if (error) {
    await logAccess(supabase, {
      bookingId: booking.id,
      req,
      action: 'get_download_urls',
      success: false,
      reason: String(error.message || 'QUERY_FAILED'),
    });
    return errorResponse(500, 'Failed to load download URLs', 'QUERY_FAILED');
  }

  const downloads = (images || []).map((img: SessionImageRow) => ({
    id: img.id,
    fileName: img.file_name,
    url: img.cloud_url,
  }));

  await logAccess(supabase, {
    bookingId: booking.id,
    req,
    action: 'get_download_urls',
    success: true,
    metadata: { totalCount: downloads.length },
  });

  return jsonResponse({
    clientName: booking.client_name,
    title: booking.title,
    downloads,
    totalCount: downloads.length,
  });
}

// ─── Crypto helpers ───────────────────────────────────────

async function generateSignedToken<T extends Record<string, unknown>>(
  payload: T,
  secret: string,
  prefix: string
): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadPart = base64UrlEncode(payloadJson);
  const signature = await hmacHex(secret, payloadPart);
  return `${prefix}.${payloadPart}.${signature}`;
}

async function verifySignedToken<T extends Record<string, unknown>>(
  token: string,
  secret: string,
  expectedPrefix: string
): Promise<{ ok: true; payload: T } | { ok: false; reason: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'TOKEN_FORMAT_INVALID' };

  const [prefix, payloadPart, signature] = parts;
  if (prefix !== expectedPrefix) return { ok: false, reason: 'TOKEN_PREFIX_INVALID' };

  const expectedSignature = await hmacHex(secret, payloadPart);
  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, reason: 'TOKEN_SIGNATURE_INVALID' };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as T;
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'TOKEN_PAYLOAD_INVALID' };
  }
}

async function validateSessionToken(
  sessionToken: string | undefined,
  bookingId: string,
  token: string,
  sessionSecret: string
): Promise<SessionValidationResult> {
  const raw = String(sessionToken || '').trim();
  if (!raw) return { ok: false, reason: 'SESSION_MISSING', code: 'PASSWORD_REQUIRED' };

  const parsed = await verifySignedToken<SessionPayload>(raw, sessionSecret, SESSION_PREFIX);
  if (!parsed.ok) return { ok: false, reason: parsed.reason, code: 'SESSION_INVALID' };

  if (parsed.payload.bookingId !== bookingId) {
    return { ok: false, reason: 'SESSION_BOOKING_MISMATCH', code: 'SESSION_INVALID' };
  }

  if (parsed.payload.exp * 1000 <= Date.now()) {
    return { ok: false, reason: 'SESSION_EXPIRED', code: 'SESSION_EXPIRED' };
  }

  const tokenHash = await sha256Hex(token);
  if (!safeEqual(parsed.payload.tokenHash, tokenHash)) {
    return { ok: false, reason: 'SESSION_TOKEN_MISMATCH', code: 'SESSION_INVALID' };
  }

  return { ok: true, payload: parsed.payload };
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toHex(new Uint8Array(signature));
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function base64UrlEncode(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(text: string): string {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

// ─── Portal password helpers ─────────────────────────────

async function generateUniqueOpaquePortalToken(supabase: SupabaseEdgeClient): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const token = generateOpaquePortalToken();
    const { count, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_token', token);

    if (!error && Number(count || 0) === 0) {
      return token;
    }
  }

  // Extremely unlikely fallback, but still deterministic and unique enough.
  return `${TOKEN_PREFIX}-${crypto.randomUUID().replace(/-/g, '')}`;
}

function generateOpaquePortalToken(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let randomPart = '';

  for (let i = 0; i < bytes.length; i += 1) {
    randomPart += alphabet[bytes[i] % alphabet.length];
  }

  return `${TOKEN_PREFIX}-${randomPart}`;
}

function generatePortalPassword(): string {
  const chars = '0123456789';
  const random = crypto.getRandomValues(new Uint8Array(PASSWORD_LENGTH));
  let result = '';
  for (let i = 0; i < random.length; i += 1) {
    result += chars[random[i] % chars.length];
  }
  return result;
}

function parseDateMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function extractPhoneStrings(value: unknown): string[] {
  if (typeof value === 'number') return [String(value)];
  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];

  const split = raw
    .split(/[\n,،;/|]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  return split.length > 0 ? split : [raw];
}

function getBookingPhoneCandidates(booking: BookingRow): string[] {
  const details = parseJsonRecord(booking.details);
  const detailsPhoneKeys = [
    'secondaryPhone',
    'groomPhone',
    'bridePhone',
    'genericPhone',
    'clientPhone',
    'phone',
    'phone2',
    'altPhone',
    'alternatePhone',
  ] as const;

  const rawCandidates: string[] = [];
  rawCandidates.push(...extractPhoneStrings(booking.phone ?? ''));
  for (const key of detailsPhoneKeys) {
    rawCandidates.push(...extractPhoneStrings(details[key]));
  }

  const detailsPhonesArray = details.phones;
  if (Array.isArray(detailsPhonesArray)) {
    for (const item of detailsPhonesArray) {
      rawCandidates.push(...extractPhoneStrings(item));
    }
  }

  const uniqueByNormalized = new Map<string, string>();
  for (const raw of rawCandidates) {
    const normalized = normalizePhone(raw);
    if (!normalized) continue;
    if (!uniqueByNormalized.has(normalized)) {
      uniqueByNormalized.set(normalized, normalized);
    }
  }
  return Array.from(uniqueByNormalized.values());
}

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  if (digits.length === 10) return `964${digits}`;
  return digits;
}

function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.slice(-10) === nb.slice(-10);
}

function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length < 4) return '***';
  const tail = normalized.slice(-3);
  return `${'*'.repeat(Math.max(0, normalized.length - 3))}${tail}`;
}

// ─── Access logging ──────────────────────────────────────

async function logAccess(
  supabase: SupabaseEdgeClient,
  input: {
    bookingId: string | null;
    req: Request;
    action: string;
    success: boolean;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const ip = resolveClientIp(input.req);

  const payload = {
    booking_id: input.bookingId,
    ip_address: ip,
    action: input.action,
    success: input.success,
    reason: input.reason || null,
    metadata: input.metadata || null,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('access_logs').insert(payload);
  } catch (error) {
    console.warn('Failed to persist access log', error);
  }
}

function resolveClientIp(req: Request): string {
  const candidates = [
    req.headers.get('cf-connecting-ip'),
    req.headers.get('x-real-ip'),
    req.headers.get('x-forwarded-for'),
  ].filter(Boolean) as string[];

  if (candidates.length === 0) return 'unknown';
  const first = candidates[0];
  return first.includes(',') ? first.split(',')[0].trim() : first.trim();
}

// ─── Shared query helpers ────────────────────────────────

function isMissingColumnError(error: unknown) {
  const msg = String((error as { message?: string } | null)?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes('does not exist');
}

async function resolveSessionIdsForBooking(
  supabase: SupabaseEdgeClient,
  bookingId: string
): Promise<string[]> {
  const attempts = ['booking_id', 'bookingId', 'bookingid'];
  for (const column of attempts) {
    const res = await supabase.from('sessions').select('id').eq(column, bookingId);

    if (!res.error) {
      return (res.data || []).map((s: { id?: string }) => s.id).filter((id): id is string => Boolean(id));
    }

    if (!isMissingColumnError(res.error)) {
      return [];
    }
  }
  return [];
}

async function runSessionImagesQuery(
  supabase: SupabaseEdgeClient,
  bookingId: string,
  builder: (q: QueryChain) => QueryChain
) {
  let lastResult: QueryResult | null = null;

  const directAttempts = ['booking_id', 'bookingId'];
  const directAttemptsLegacy = [...directAttempts, 'bookingid'];
  for (const column of directAttemptsLegacy) {
    const res = (await builder(supabase.from('session_images') as unknown as QueryChain).eq(
      column,
      bookingId
    )) as QueryResult;
    lastResult = res;
    if (!res.error) return res;
    if (!isMissingColumnError(res.error)) return res;
  }

  const sessionIds = await resolveSessionIdsForBooking(supabase, bookingId);
  const candidateSessionIds = sessionIds.length > 0 ? sessionIds : [bookingId];

  const sessionAttempts = ['session_id', 'sessionId', 'sessionid'];
  for (const column of sessionAttempts) {
    const res = (await builder(supabase.from('session_images') as unknown as QueryChain).in(
      column,
      candidateSessionIds
    )) as QueryResult;
    lastResult = res;
    if (!res.error) return res;
    if (!isMissingColumnError(res.error)) return res;
  }

  return lastResult || { data: [], error: null, count: 0 };
}

// ─── Response helpers ────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  status: number,
  message: string,
  code = 'ERROR',
  extra: Record<string, unknown> = {}
) {
  return new Response(
    JSON.stringify({
      error: message,
      code,
      ...extra,
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
