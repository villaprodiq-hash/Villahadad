const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');
const DEFAULT_CLIENT_PORTAL_BASE_URL = 'https://select.villahadad.org';
const BLOCKED_HOST_PATTERNS = [/\.netlify\.app$/i];
const DEFAULT_ALLOWED_PORTAL_HOSTS = new Set(['select.villahadad.org', 'localhost', '127.0.0.1']);

const getAllowedPortalHosts = (): Set<string> => {
  const hosts = new Set(DEFAULT_ALLOWED_PORTAL_HOSTS);
  const raw = (import.meta.env.VITE_CLIENT_PORTAL_ALLOWED_HOSTS as string | undefined)?.trim();
  if (!raw) return hosts;

  raw
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean)
    .forEach(host => hosts.add(host));

  return hosts;
};

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');

const sanitizePortalBaseUrl = (candidate: string): string | null => {
  const normalized = normalizeBaseUrl(candidate);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();

    if (BLOCKED_HOST_PATTERNS.some(pattern => pattern.test(hostname))) {
      return null;
    }

    const allowedHosts = getAllowedPortalHosts();
    const isAllowedVillahadadSubdomain = hostname.endsWith('.villahadad.org');
    const localHost = isLocalHost(hostname);

    if (!localHost && !isAllowedVillahadadSubdomain && !allowedHosts.has(hostname)) {
      return null;
    }

    if (url.protocol !== 'https:' && !localHost) {
      return null;
    }

    return normalizeBaseUrl(`${url.origin}${url.pathname}`);
  } catch {
    return null;
  }
};

export const getClientPortalBaseUrl = (): string => {
  const envBaseUrl = (import.meta.env.VITE_CLIENT_PORTAL_BASE_URL as string | undefined) || '';
  if (envBaseUrl.trim().length > 0) {
    const sanitized = sanitizePortalBaseUrl(envBaseUrl);
    if (sanitized) return sanitized;
    console.warn(
      '[ClientPortal] Invalid VITE_CLIENT_PORTAL_BASE_URL detected, fallback to production portal domain.'
    );
  }

  return DEFAULT_CLIENT_PORTAL_BASE_URL;
};

export const getClientPortalLinkError = (token?: string | null): string | null => {
  if (!token) return 'لا يوجد token لهذا الحجز';
  if (!getClientPortalBaseUrl()) return 'رابط بوابة العميل غير مضبوط (VITE_CLIENT_PORTAL_BASE_URL)';
  return null;
};

export const buildClientPortalUrl = (token?: string | null): string => {
  if (!token) return '';
  const base = getClientPortalBaseUrl();
  if (!base) return '';

  try {
    // Keep URL as short as possible for WhatsApp messages.
    const url = new URL('/', `${normalizeBaseUrl(base)}/`);
    url.searchParams.set('t', token);
    return url.toString();
  } catch {
    return '';
  }
};
