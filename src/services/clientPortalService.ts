import { User } from '../types';

export class ClientPortalError extends Error {
  code?: string;
  status?: number;
  payload?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; payload?: unknown }) {
    super(message);
    this.name = 'ClientPortalError';
    this.code = options?.code;
    this.status = options?.status;
    this.payload = options?.payload;
  }
}

const DEFAULT_PORTAL_GATEWAY_URL = 'https://villahadad-portal-gateway.villa-prod-iq.workers.dev';
const trimTrailingSlash = (value: string): string => value.trim().replace(/\/+$/, '');
const isSupabaseHost = (url: string): boolean => {
  const normalized = trimTrailingSlash(url);
  try {
    const parsed = new URL(normalized);
    return parsed.hostname === 'supabase.co' || parsed.hostname.endsWith('.supabase.co');
  } catch {
    return /supabase\.co/i.test(normalized);
  }
};
const isSupabaseClientPortalUrl = (url: string): boolean =>
  (() => {
    const normalized = trimTrailingSlash(url);
    try {
      const parsed = new URL(normalized);
      return (
        isSupabaseHost(normalized) &&
        parsed.pathname.toLowerCase().includes('/functions/v1/client-portal')
      );
    } catch {
      return /supabase\.co\/functions\/v1\/client-portal/i.test(normalized);
    }
})();
const ADMIN_ACTIONS = new Set(['ensure_token', 'generate_new_link']);

const readBooleanEnv = (rawValue: string | undefined): boolean | null => {
  const normalized = String(rawValue || '').trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') return true;
  if (normalized === '0' || normalized === 'false') return false;
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractPortalPassword = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) return undefined;

  const candidates = [payload.portalPassword, payload.portal_password, payload.password];
  const first = candidates.find(candidate => typeof candidate === 'string' && candidate.trim().length > 0);
  return typeof first === 'string' ? first.trim() : undefined;
};

const normalizePortalAdminPayload = <T>(payload: T): T => {
  if (!isRecord(payload)) return payload;

  const portalPassword = extractPortalPassword(payload);
  if (!portalPassword) return payload;

  return {
    ...payload,
    portalPassword,
  } as T;
};

const getGatewayBaseUrl = (): string => {
  const gatewayUrlRaw = (import.meta.env.VITE_CLIENT_PORTAL_GATEWAY_URL as string | undefined) || '';
  const gatewayUrl = trimTrailingSlash(gatewayUrlRaw);
  const chosen = gatewayUrl.length > 0 ? gatewayUrl : DEFAULT_PORTAL_GATEWAY_URL;

  // Safety guard: never treat any Supabase URL as gateway.
  if (isSupabaseHost(chosen) || isSupabaseClientPortalUrl(chosen)) {
    return DEFAULT_PORTAL_GATEWAY_URL;
  }
  return chosen;
};

const getDirectFunctionUrl = (): string => {
  const directUrlRaw = (import.meta.env.VITE_CLIENT_PORTAL_FUNCTION_URL as string | undefined) || '';
  const directUrl = trimTrailingSlash(directUrlRaw);
  if (directUrl.length > 0) {
    // Accept only direct Supabase function URLs here.
    if (isSupabaseClientPortalUrl(directUrl)) return directUrl;
    if (isSupabaseHost(directUrl)) return `${directUrl}/functions/v1/client-portal`;
    // Ignore non-supabase hosts (e.g., workers gateway); fallback to VITE_SUPABASE_URL below.
  }

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  const normalized = trimTrailingSlash(baseUrl);
  return normalized ? `${normalized}/functions/v1/client-portal` : '';
};

const getPublicPortalFunctionUrl = (): string => {
  // Client-facing actions are safe to call directly on the Edge Function
  // (token/session/password checks are enforced there).
  const directUrl = getDirectFunctionUrl();
  if (directUrl.length > 0) return directUrl;

  const gatewayUrl = getGatewayBaseUrl();
  return gatewayUrl.length > 0 ? gatewayUrl : DEFAULT_PORTAL_GATEWAY_URL;
};

const getAnonKey = (): string => (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

const shouldSendAdminKeyFromClient = (): boolean => {
  // Default: OFF. Gateway should hold admin key server-side.
  const parsed = readBooleanEnv(import.meta.env.VITE_CLIENT_PORTAL_SEND_ADMIN_KEY as string | undefined);
  return parsed === true;
};

const shouldAllowDirectAdminFallback = (): boolean => {
  // Default: OFF. Direct fallback can leak operational dependency on local env keys.
  const parsed = readBooleanEnv(
    import.meta.env.VITE_CLIENT_PORTAL_ALLOW_DIRECT_ADMIN_FALLBACK as string | undefined
  );
  return parsed === true;
};

const isElectronRuntime = (): boolean => {
  const runtime = globalThis as unknown as {
    electronAPI?: unknown;
    window?: { electronAPI?: unknown };
  };
  return Boolean(runtime?.electronAPI || runtime?.window?.electronAPI);
};

const buildAuthHeaders = (anonKey: string, headers: Record<string, string> = {}): Record<string, string> => ({
  'Content-Type': 'application/json',
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  ...headers,
});

async function invokePortal<T>(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const message =
      (typeof parsed.error === 'string' && parsed.error) ||
      raw ||
      `HTTP ${response.status}`;
    throw new ClientPortalError(message, {
      code: typeof parsed.code === 'string' ? parsed.code : undefined,
      status: response.status,
      payload: parsed,
    });
  }

  return parsed as T;
}

export async function callClientPortal<T = unknown>(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<T> {
  const action = typeof body.action === 'string' ? body.action : '';
  const isAdminAction = ADMIN_ACTIONS.has(action);
  const fnUrl = isAdminAction ? getGatewayBaseUrl() : getPublicPortalFunctionUrl();

  const anonKey = getAnonKey();
  if (!fnUrl || !anonKey) {
    throw new ClientPortalError('Supabase portal configuration missing', { code: 'CONFIG_ERROR' });
  }
  if (isAdminAction && isSupabaseHost(fnUrl)) {
    throw new ClientPortalError('Client portal gateway configuration missing', { code: 'CONFIG_ERROR' });
  }

  const requestHeaders = buildAuthHeaders(anonKey, headers);

  try {
    return await invokePortal<T>(fnUrl, body, requestHeaders);
  } catch (error) {
    // For client-facing calls only: if direct path is blocked/forbidden, retry via gateway.
    if (
      !isAdminAction &&
      error instanceof ClientPortalError &&
      error.status === 403
    ) {
      const gatewayUrl = getGatewayBaseUrl();
      if (gatewayUrl && trimTrailingSlash(gatewayUrl) !== trimTrailingSlash(fnUrl)) {
        return await invokePortal<T>(gatewayUrl, body, requestHeaders);
      }
    }
    throw error;
  }
}

export interface PortalLinkPayload {
  success: boolean;
  bookingId: string;
  token: string;
  tokenExpiresAt: string;
  portalPassword?: string;
  isNew?: boolean;
  path?: string;
}

const getPortalAdminKey = (): string => {
  const configuredKey = (
    (
      (import.meta.env.VITE_CLIENT_PORTAL_ADMIN_KEY as string | undefined) ||
      (import.meta.env.VITE_PORTAL_ADMIN_KEY as string | undefined) ||
      ''
    ).trim()
  );
  if (!configuredKey) return '';

  // Web: expose only when explicitly enabled.
  // Electron desktop: allow secure fallback by default to keep staff workflow resilient.
  const shouldExposeKey =
    shouldSendAdminKeyFromClient() || shouldAllowDirectAdminFallback() || isElectronRuntime();

  return shouldExposeKey ? configuredKey : '';
};

function buildAdminHeaders(adminKey: string): Record<string, string> {
  if (!adminKey) return {};
  return {
    'x-portal-admin-key': adminKey,
    // Legacy header kept for backward compatibility across deployed edge variants.
    'x-client-portal-admin-key': adminKey,
  };
}

function withAdminKeyPayload(payload: Record<string, unknown>, adminKey: string): Record<string, unknown> {
  if (!adminKey) return payload;
  return {
    ...payload,
    // Fallback for edge variants that validate admin key from request body.
    adminKey,
  };
}

async function callDirectAdminPortalAction<T>(
  payload: Record<string, unknown>,
  adminHeaders: Record<string, string>
): Promise<T> {
  const directUrl = getDirectFunctionUrl();
  const anonKey = getAnonKey();
  if (!directUrl || !anonKey) {
    throw new ClientPortalError('Supabase portal configuration missing', { code: 'CONFIG_ERROR' });
  }

  const requestHeaders = buildAuthHeaders(anonKey, adminHeaders);
  return await invokePortal<T>(directUrl, payload, requestHeaders);
}

async function callAdminPortalAction<T>(
  payload: Record<string, unknown>,
  adminKey: string
): Promise<T> {
  const sendAdminKey = shouldSendAdminKeyFromClient();
  const allowDirectFallback = shouldAllowDirectAdminFallback();
  const adminHeaders = buildAdminHeaders(adminKey);
  const payloadWithKey = withAdminKeyPayload(payload, adminKey);
  const action = typeof payload.action === 'string' ? payload.action : '';
  const requiresPasswordInResponse = action === 'generate_new_link';
  const directUrl = getDirectFunctionUrl();
  const gatewayUrl = getGatewayBaseUrl();
  const hasUsableDirectPath =
    directUrl.length > 0 && trimTrailingSlash(directUrl) !== trimTrailingSlash(gatewayUrl);
  const canUseDirectFallback = Boolean(adminKey) && hasUsableDirectPath;

  if (sendAdminKey || !adminKey) {
    const response = await callClientPortal<T>(
      sendAdminKey ? payloadWithKey : payload,
      sendAdminKey ? adminHeaders : {}
    );
    const normalized = normalizePortalAdminPayload(response);

    if (requiresPasswordInResponse && !extractPortalPassword(normalized) && canUseDirectFallback) {
      const directResult = await callDirectAdminPortalAction<T>(payloadWithKey, adminHeaders);
      return normalizePortalAdminPayload(directResult);
    }

    return normalized;
  }

  try {
    // Preferred path: gateway holds admin secret server-side.
    const gatewayResult = await callClientPortal<T>(payload);
    const normalizedGatewayResult = normalizePortalAdminPayload(gatewayResult);

    // Some gateway variants omit portalPassword in admin responses.
    // For "generate_new_link" we need password for share/copy actions.
    if (requiresPasswordInResponse && !extractPortalPassword(normalizedGatewayResult) && canUseDirectFallback) {
      const directResult = await callDirectAdminPortalAction<T>(payloadWithKey, adminHeaders);
      return normalizePortalAdminPayload(directResult);
    }

    return normalizedGatewayResult;
  } catch (error) {
    // Optional direct fallback for controlled environments only.
    // Default behavior avoids direct admin-key calls from the client.
    if (canUseDirectFallback && (allowDirectFallback || requiresPasswordInResponse)) {
      const canFallback =
        error instanceof TypeError ||
        (error instanceof ClientPortalError &&
          (error.status === 400 ||
            error.status === 401 ||
            error.status === 403 ||
            error.status === 404 ||
            error.status === 429 ||
            error.status === 500 ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504));
      if (canFallback) {
        const directResult = await callDirectAdminPortalAction<T>(payloadWithKey, adminHeaders);
        return normalizePortalAdminPayload(directResult);
      }
    }
    throw error;
  }
}

function actorFields(user?: User): Record<string, string | null> {
  return {
    actorId: user?.id || null,
    actorName: user?.name || null,
    actorRole: user?.role || null,
  };
}

export async function ensureClientPortalToken(
  bookingId: string,
  actor?: User
): Promise<PortalLinkPayload> {
  const adminKey = getPortalAdminKey();
  const payload: Record<string, unknown> = {
    action: 'ensure_token',
    bookingId,
    ...actorFields(actor),
  };

  return await callAdminPortalAction<PortalLinkPayload>(payload, adminKey);
}

export async function generateClientPortalToken(
  bookingId: string,
  actor?: User
): Promise<PortalLinkPayload> {
  const adminKey = getPortalAdminKey();
  const payload: Record<string, unknown> = {
    action: 'generate_new_link',
    bookingId,
    ...actorFields(actor),
  };

  return await callAdminPortalAction<PortalLinkPayload>(payload, adminKey);
}
