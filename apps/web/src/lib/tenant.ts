export function getTenantSlugFromClient(): string {
  if (typeof window === 'undefined') return 'demo';

  const host = window.location.host;
  const parts = host.split('.');

  if (parts.length >= 3) {
    return parts[0];
  }

  // Dev fallback: check URL param or use default
  const params = new URLSearchParams(window.location.search);
  return params.get('tenant') || 'demo';
}
