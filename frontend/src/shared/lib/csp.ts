// Only official analytics endpoints are allowed outside the application origin.
const metrikaHosts = [
  "mc.yandex.ru",
  "mc.yandex.az",
  "mc.yandex.by",
  "mc.yandex.co.il",
  "mc.yandex.com",
  "mc.yandex.com.am",
  "mc.yandex.com.ge",
  "mc.yandex.com.tr",
  "mc.yandex.ee",
  "mc.yandex.fr",
  "mc.yandex.kg",
  "mc.yandex.kz",
  "mc.yandex.lt",
  "mc.yandex.lv",
  "mc.yandex.md",
  "mc.yandex.tj",
  "mc.yandex.tm",
  "mc.yandex.uz",
  "mc.webvisor.com",
  "mc.webvisor.org",
];

export function pageCsp(nonce: string): string {
  if (!/^[A-Za-z0-9+/=_-]{22,128}$/.test(nonce))
    throw new Error("Invalid CSP nonce");
  const analytics = metrikaHosts.map((host) => `https://${host}`).join(" ");
  const sockets = metrikaHosts
    .filter((host) => host.startsWith("mc.yandex."))
    .map((host) => `wss://${host}`)
    .join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://mc.yandex.ru https://yastatic.net`,
    "script-src-attr 'none'",
    // Dynamic UI positioning/animations use style attributes; scripts stay nonce-only.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: ${analytics} https://yastatic.net`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${analytics} ${sockets} https://yastatic.net`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `frame-src 'self' blob: ${analytics}`,
    `child-src 'self' blob: ${analytics}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
