type Command =
  | [number, "init", Record<string, unknown>]
  | [number, "hit", string, Record<string, unknown>]
  | [number, "destruct"];
type Counter = ((...args: Command) => void) & { a?: Command[]; l?: number };

declare global {
  interface Window {
    ym?: Counter;
    dataLayer?: unknown[];
  }
}

let activeId: number | null = null;
let lastUrl: string | null = null;
let stub: Counter | null = null;
let sdkLoaded = false;
const scriptId = "yandex-metrika-sdk";

function cleanUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return url.origin + url.pathname;
  } catch {
    return "";
  }
}

export function startMetrika(id: number): void {
  if (activeId === id) return;
  if (activeId !== null) stopMetrika();
  if (!window.ym) {
    const queue: Counter = (...args) => {
      (queue.a ??= []).push(args);
    };
    queue.l = Date.now();
    stub = queue;
    window.ym = queue;
  }
  window.dataLayer ??= [];
  activeId = id;
  window.ym(id, "init", {
    ssr: true,
    defer: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    accurateTrackBounce: true,
    trackLinks: true,
    referrer: cleanUrl(document.referrer),
    url: cleanUrl(window.location.href),
  });
  if (sdkLoaded || document.getElementById(scriptId)) return;
  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;
  script.onload = () => {
    sdkLoaded = true;
  };
  script.onerror = () => {
    // A blocked counter must not prevent navigation or leave a duplicate queue.
    if (window.ym === stub && stub) stub.a = [];
    activeId = null;
    lastUrl = null;
    script.remove();
  };
  document.head.append(script);
}

export function trackMetrikaPage(pathname: string): void {
  if (activeId === null || !window.ym) return;
  const url = cleanUrl(pathname);
  if (url === lastUrl) return;
  window.ym(activeId, "hit", url, {
    referer: lastUrl ?? cleanUrl(document.referrer),
    title: document.title,
  });
  lastUrl = url;
}

export function stopMetrika(): void {
  if (activeId !== null) window.ym?.(activeId, "destruct");
  if (window.ym === stub && stub) stub.a = [];
  document.getElementById(scriptId)?.remove();
  activeId = null;
  lastUrl = null;
}
