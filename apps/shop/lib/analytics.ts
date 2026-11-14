/**
 * Meta Pixel, loaded only after the first user interaction (docs/STACK.md › shop).
 * No-op when NEXT_PUBLIC_META_PIXEL_ID is unset ([À DÉFINIR]). Never send personal data.
 */
export type PixelEvent = "ViewContent" | "InitiateCheckout" | "Lead";
type Params = Record<string, string | number>;

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...a: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

let queue: Array<[PixelEvent, Params | undefined]> = [];
let loaded = false;
let listening = false;

export function pixelId(): string | null {
  const id = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();
  return id ? id : null;
}

function loadPixel(id: string) {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue!.push(args);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    window.fbq = n;
    window._fbq = n;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  const fbq = window.fbq!;
  fbq("init", id);
  fbq("track", "PageView");
  for (const [event, params] of queue) fbq("track", event, params);
  queue = [];
}

function onFirstInteraction() {
  for (const e of INTERACTION_EVENTS) window.removeEventListener(e, onFirstInteraction);
  const id = pixelId();
  if (id) loadPixel(id);
}

/** Installs the "load on first interaction" listeners (idempotent). */
export function initAnalytics() {
  if (listening || typeof window === "undefined" || !pixelId()) return;
  listening = true;
  for (const e of INTERACTION_EVENTS) window.addEventListener(e, onFirstInteraction, { once: true, passive: true });
}

/** Queues the event until the pixel is loaded (after the first interaction). */
export function track(event: PixelEvent, params?: Params) {
  if (typeof window === "undefined" || !pixelId()) return;
  if (loaded && window.fbq) {
    window.fbq("track", event, params);
    return;
  }
  queue.push([event, params]);
  initAnalytics();
}

/** Test helpers. */
export function __resetAnalytics() {
  queue = [];
  loaded = false;
  listening = false;
}
export function __queuedEvents() {
  return queue.slice();
}
