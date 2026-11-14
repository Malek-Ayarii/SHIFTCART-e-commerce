import type { OrderSource } from "./types";

const UTM_KEY = "sc_utm";

/**
 * Reads utm_* from the current URL and keeps them for the session, so a visitor landing on the
 * home (ad link) still attributes the order placed later on a pack page. Browser only.
 */
export function captureSource(): OrderSource | undefined {
  try {
    const q = new URLSearchParams(window.location.search);
    const fromUrl: OrderSource = {
      utmSource: q.get("utm_source") ?? undefined,
      utmCampaign: q.get("utm_campaign") ?? undefined,
      utmContent: q.get("utm_content") ?? undefined,
    };
    if (Object.values(fromUrl).some(Boolean)) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(UTM_KEY);
    return stored ? (JSON.parse(stored) as OrderSource) : undefined;
  } catch {
    return undefined;
  }
}
