/** Footer only on public marketing / legal pages — hidden on all role dashboards. */

const PUBLIC_FOOTER_EXACT = new Set([
  '/',
  '/login',
  '/signup',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
  '/refund-policy',
  '/b2b-enquiry',
]);

export function shouldShowSiteFooter(pathname: string): boolean {
  if (PUBLIC_FOOTER_EXACT.has(pathname)) return true;
  if (pathname.startsWith('/enquiry/')) return true;
  if (pathname.startsWith('/become-referrer/')) return true;
  return false;
}
