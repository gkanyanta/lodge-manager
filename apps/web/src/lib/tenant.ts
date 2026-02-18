const HOSTING_DOMAINS = ['vercel.app', 'vercel.sh', 'netlify.app'];

export function getTenantSlugFromClient(): string {
  if (typeof window === 'undefined') return 'demo';

  const host = window.location.host;
  const isHostingDomain = HOSTING_DOMAINS.some((d) => host.endsWith(d));

  if (!isHostingDomain) {
    const parts = host.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
  }

  // Dev / hosting fallback: check URL param or use default
  const params = new URLSearchParams(window.location.search);
  return params.get('tenant') || 'demo';
}
