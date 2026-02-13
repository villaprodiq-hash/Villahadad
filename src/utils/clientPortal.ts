const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');
const DEFAULT_CLIENT_PORTAL_BASE_URL = 'https://select.villahadad.org';

export const getClientPortalBaseUrl = (): string => {
  const envBaseUrl = (import.meta.env.VITE_CLIENT_PORTAL_BASE_URL as string | undefined)?.trim();
  if (envBaseUrl) return normalizeBaseUrl(envBaseUrl);

  if (typeof window !== 'undefined' && /^https?:\/\//.test(window.location.origin)) {
    return normalizeBaseUrl(window.location.origin);
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
  const path = `/select?token=${encodeURIComponent(token)}`;
  return `${base}${path}`;
};
