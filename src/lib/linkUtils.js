/**
 * Utility for parsing and serializing user profile links (Instagram handle + Custom Shopping Links)
 * stored seamlessly in Supabase.
 */

export function parseProfileLinksData(raw) {
  if (!raw) return { instagramHandle: '', customLinks: [] };

  if (typeof raw === 'object' && raw !== null) {
    return {
      instagramHandle: raw.ig || raw.instagram || '',
      customLinks: Array.isArray(raw.links) ? raw.links : []
    };
  }

  const str = String(raw).trim();
  if (!str) return { instagramHandle: '', customLinks: [] };

  // Check if formatted as JSON
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      return {
        instagramHandle: parsed.ig || parsed.instagram || '',
        customLinks: Array.isArray(parsed.links) ? parsed.links : []
      };
    } catch (e) {
      console.warn('[linkUtils] Failed to parse JSON link payload:', e);
    }
  }

  // Legacy plain string format (e.g., "@rishideep_mallick" or "https://instagram.com/...")
  return {
    instagramHandle: str,
    customLinks: []
  };
}

export function serializeProfileLinksData(instagramHandle, customLinks) {
  const cleanIg = typeof instagramHandle === 'string' ? instagramHandle.trim() : '';
  const cleanLinks = Array.isArray(customLinks) ? customLinks : [];

  return JSON.stringify({
    ig: cleanIg,
    links: cleanLinks
  });
}
