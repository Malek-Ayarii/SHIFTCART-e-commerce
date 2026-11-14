import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAmount, formatDecimal, formatEta, formatStepDate } from "@/lib/format";
import { paybackDays, savingsFor, treatFor } from "@/lib/savings";
import { confirmOrderUrl, contactUrl, isSafeWhatsAppUrl, waLink } from "@/lib/whatsapp";
import { decodeOrderCookie, encodeOrderCookie } from "@/lib/order-cookie";

describe("savings formula: (dépense − 0,5) × 30", () => {
  it("default value 6 DT/day", () => {
    expect(savingsFor(6)).toBe(165);
    expect(paybackDays(89, 6)).toBe(17);
    expect(treatFor(165)).toBe("une place de concert");
  });
  it("bounds of the slider", () => {
    expect(savingsFor(4)).toBe(105);
    expect(savingsFor(10)).toBe(285);
    expect(paybackDays(89, 10)).toBe(10);
    expect(treatFor(285)).toBe("un concert + le resto d'après");
  });
  it("never negative; custom parameters", () => {
    expect(savingsFor(0.2)).toBe(0);
    expect(savingsFor(5, 1, 20)).toBe(80);
    expect(treatFor(80)).toBe("une sortie ciné entre potes");
    expect(treatFor(100)).toBe("un jeu vidéo neuf");
  });
});

describe("format", () => {
  it("amounts with thin spaces, decimals with comma", () => {
    expect(formatAmount(12638)).toBe("12 638");
    expect(formatAmount(89)).toBe("89");
    expect(formatAmount(165.4)).toBe("165");
    expect(formatDecimal(6.5)).toBe("6,5");
  });
  it("step dates in Tunis time", () => {
    // 2026-11-16 is a Monday; 13:32 UTC = 14:32 in Tunis (UTC+1)
    expect(formatStepDate("2026-11-16T13:32:00Z")).toBe("Lun. 14:32");
    expect(formatStepDate("nope")).toBe("");
  });
  it("eta relative to today", () => {
    const now = new Date("2026-11-15T10:00:00Z");
    expect(formatEta("2026-11-15", now)).toBe("aujourd'hui");
    expect(formatEta("2026-11-16", now)).toBe("demain");
    expect(formatEta("2026-11-18", now)).toBe("mercredi 18 novembre");
  });
});

describe("whatsapp", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("builds wa.me links", () => {
    expect(waLink("21612345678", "Je confirme ma commande SC-2951")).toBe(
      "https://wa.me/21612345678?text=Je%20confirme%20ma%20commande%20SC-2951",
    );
    expect(confirmOrderUrl("SC-1", "21612345678")).toBe("https://wa.me/21612345678?text=Je%20confirme%20ma%20commande%20SC-1");
  });
  it("falls back while the number is [À DÉFINIR]", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    expect(confirmOrderUrl("SC-1")).toBeNull();
    expect(contactUrl()).toBe("/livraison#contact");
  });
  it("only trusts wa.me URLs from the API", () => {
    expect(isSafeWhatsAppUrl("https://wa.me/21698765432?text=x")).toBe(true);
    expect(isSafeWhatsAppUrl("https://api.whatsapp.com/send?phone=21698765432&text=x")).toBe(true);
    // Number-less link returned by the API while WHATSAPP_SHOP_NUMBER is [À DÉFINIR].
    expect(isSafeWhatsAppUrl("https://wa.me/?text=Je%20confirme%20ma%20commande%20SC-3023")).toBe(false);
    expect(isSafeWhatsAppUrl("http://wa.me/21698765432")).toBe(false);
    expect(isSafeWhatsAppUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeWhatsAppUrl("https://evil.example/wa.me")).toBe(false);
  });
});

describe("sc_order cookie", () => {
  it("round-trips and rejects tampered values", () => {
    const v = encodeOrderCookie({
      ref: "SC-2951",
      customerFirstName: "Mohamed",
      phoneDisplay: "+216 98 765 432",
      trackingToken: "tok",
      whatsappConfirmUrl: null,
      governorate: "Sousse",
      amountTnd: 89,
    });
    expect(decodeOrderCookie(v)?.customerFirstName).toBe("Mohamed");
    expect(decodeOrderCookie("not-base64-json")).toBeNull();
    expect(decodeOrderCookie(Buffer.from(JSON.stringify({ ref: "<script>", trackingToken: "x" })).toString("base64url"))).toBeNull();
  });
});
