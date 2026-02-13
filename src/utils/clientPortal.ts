const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');

export const getClientPortalBaseUrl = (): string => {
  const envBaseUrl = (import.meta.env.VITE_CLIENT_PORTAL_BASE_URL as string | undefined)?.trim();
  if (envBaseUrl) return normalizeBaseUrl(envBaseUrl);

  if (typeof window !== 'undefined' && /^https?:\/\//.test(window.location.origin)) {
    return normalizeBaseUrl(window.location.origin);
  }

  return '';
};

export const buildClientPortalUrl = (token?: string | null): string => {
  if (!token) return '';
  const base = getClientPortalBaseUrl();
  const path = `/select?token=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
};
