interface WhatsAppTarget {
  appUrl: string;
  webUrl: string;
}

const normalizeWhatsAppPhone = (phone: string): string => {
  if (!phone) return '';

  let cleaned = phone.replace(/\D/g, '');

  // Iraq default normalization:
  // 0770xxxxxxx -> 964770xxxxxxx
  if (cleaned.startsWith('07') && cleaned.length >= 10) {
    cleaned = `964${cleaned.substring(1)}`;
  } else if (cleaned.startsWith('7') && cleaned.length === 10) {
    // 770xxxxxxx -> 964770xxxxxxx
    cleaned = `964${cleaned}`;
  }

  return cleaned;
};

const parseIncomingWhatsAppUrl = (url: string): { phone: string; text: string } => {
  if (!url) return { phone: '', text: '' };

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    if (protocol === 'whatsapp:') {
      return {
        phone: normalizeWhatsAppPhone(parsed.searchParams.get('phone') || ''),
        text: parsed.searchParams.get('text') || '',
      };
    }

    if (hostname === 'wa.me') {
      return {
        phone: normalizeWhatsAppPhone(parsed.pathname.replace(/^\/+/, '')),
        text: parsed.searchParams.get('text') || '',
      };
    }

    if ((hostname === 'api.whatsapp.com' || hostname === 'web.whatsapp.com') && parsed.pathname === '/send') {
      return {
        phone: normalizeWhatsAppPhone(parsed.searchParams.get('phone') || ''),
        text: parsed.searchParams.get('text') || '',
      };
    }
  } catch {
    // Ignore invalid URL and fallback below.
  }

  return { phone: '', text: '' };
};

const buildWhatsAppTargets = (phone: string, message?: string): WhatsAppTarget => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const text = message || '';

  const params = new URLSearchParams();
  if (normalizedPhone) params.set('phone', normalizedPhone);
  if (text) params.set('text', text);

  const query = params.toString();
  const appUrl = query ? `whatsapp://send?${query}` : 'whatsapp://send';

  let webUrl = 'https://wa.me/';
  if (normalizedPhone && text) {
    webUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
  } else if (normalizedPhone) {
    webUrl = `https://wa.me/${normalizedPhone}`;
  } else if (text) {
    webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return { appUrl, webUrl };
};

/**
 * Formats a phone number for WhatsApp and returns a wa.me link.
 */
export const getWhatsAppUrl = (phone: string, message?: string) => {
  return buildWhatsAppTargets(phone, message).webUrl;
};

const isLikelyMobile = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

/**
 * Open WhatsApp app first (whatsapp://), with safe fallback to web link.
 * - Electron/macOS: handled by main process via shell.openExternal.
 * - Browser/mobile: tries app protocol first, then falls back.
 */
export const openWhatsAppUrl = async (url: string) => {
  if (!url) return;

  const parsed = parseIncomingWhatsAppUrl(url);
  const { appUrl, webUrl } = buildWhatsAppTargets(parsed.phone, parsed.text);

  if (window.electronAPI?.openWhatsApp) {
    try {
      // Electron main will try app protocol first and then fallback to web.
      const appResult = await window.electronAPI.openWhatsApp(appUrl);
      if (!appResult || typeof appResult !== 'object') return;
      if ((appResult as { success?: boolean }).success !== false) return;

      const webResult = await window.electronAPI.openWhatsApp(webUrl);
      if (
        webResult &&
        typeof webResult === 'object' &&
        'success' in webResult &&
        (webResult as { success?: boolean }).success === false
      ) {
        throw new Error((webResult as { error?: string }).error || 'Failed to open WhatsApp');
      }
      return;
    } catch {
      // Continue to browser fallback.
    }
  }

  let fallbackTimer: number | undefined;
  const cancelFallback = () => {
    if (fallbackTimer !== undefined) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
  };

  const visibilityHandler = () => {
    if (document.hidden) cancelFallback();
  };

  document.addEventListener('visibilitychange', visibilityHandler, { once: true });
  fallbackTimer = window.setTimeout(() => {
    document.removeEventListener('visibilitychange', visibilityHandler);
    if (isLikelyMobile()) {
      window.location.href = webUrl;
    } else {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  }, 900);

  // Try native WhatsApp app first.
  window.location.href = appUrl;
};
