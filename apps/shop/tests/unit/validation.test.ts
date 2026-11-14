import { describe, expect, it } from "vitest";
import { errorsFromZod, normalizeOrderPayload, orderInputSchema } from "@/lib/order-schema";
import {
  errorBannerText,
  formatTnPhone,
  GOVERNORATES,
  phoneDigits,
  POPULAR,
  validateCheckout,
  validateGovernorate,
  validateName,
  validateTnPhone,
} from "@/lib/validation";

describe("formatTnPhone", () => {
  it.each([
    ["", ""],
    ["9", "9"],
    ["98", "98"],
    ["987", "98 7"],
    ["98765", "98 765"],
    ["987654", "98 765 4"],
    ["98765432", "98 765 432"],
    ["98 765 432", "98 765 432"],
    ["987654321", "98 765 432"],
    ["+216 98 765 432", "98 765 432"],
    ["0021698765432", "98 765 432"],
    ["ab98-76", "98 76"],
  ])("%j → %j", (input, expected) => {
    expect(formatTnPhone(input)).toBe(expected);
  });
});

describe("validateTnPhone (docs/API.md messages)", () => {
  it("empty", () => {
    expect(validateTnPhone("")).toBe("Ton numéro nous sert à confirmer la commande sur WhatsApp.");
    expect(validateTnPhone("   ")).toBe("Ton numéro nous sert à confirmer la commande sur WhatsApp.");
  });
  it("missing digits, singular and plural", () => {
    expect(validateTnPhone("9876543")).toBe("Il manque 1 chiffre (8 au total).");
    expect(validateTnPhone("98765")).toBe("Il manque 3 chiffres (8 au total).");
    expect(validateTnPhone("9")).toBe("Il manque 7 chiffres (8 au total).");
  });
  it("wrong first digit", () => {
    for (const first of ["0", "1", "6", "8"]) {
      expect(validateTnPhone(`${first}8765432`)).toBe("Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.");
    }
  });
  it("accepts every valid first digit and spaces", () => {
    for (const first of ["2", "3", "4", "5", "7", "9"]) expect(validateTnPhone(`${first}8765432`)).toBeNull();
    expect(validateTnPhone("98 765 432")).toBeNull();
    expect(validateTnPhone("+216 98 765 432")).toBeNull();
  });
  it("too many digits (only reachable by bypassing the input)", () => {
    expect(validateTnPhone("987654321")).toBe("Ton numéro doit avoir 8 chiffres (sans le +216).");
  });
  it("phoneDigits strips the country code only around a full number", () => {
    expect(phoneDigits("+21698765432")).toBe("98765432");
    expect(phoneDigits("21612345")).toBe("21612345");
    // A local number starting with 216 + one extra typed digit must not lose its first 3 digits.
    expect(phoneDigits("216123459")).toBe("216123459");
    expect(phoneDigits("216123459").slice(0, 8)).toBe("21612345");
    expect(phoneDigits("0021698765432")).toBe("98765432");
  });
});

describe("validateName", () => {
  it("empty → hint for the courier", () => {
    expect(validateName("")).toBe("Ton nom aide le livreur à te trouver.");
    expect(validateName("   ")).toBe("Ton nom aide le livreur à te trouver.");
  });
  it("3 to 80 characters after trim", () => {
    expect(validateName("Mo")).toBe("Écris ton nom et ton prénom.");
    expect(validateName("  Mo  ")).toBe("Écris ton nom et ton prénom.");
    expect(validateName("x".repeat(81))).toBe("Écris ton nom et ton prénom.");
    expect(validateName("Moh")).toBeNull();
    expect(validateName("x".repeat(80))).toBeNull();
    expect(validateName("Mohamed Ben Ali")).toBeNull();
  });
});

describe("governorates", () => {
  it("lists the 24 governorates, popular first set included", () => {
    expect(GOVERNORATES).toHaveLength(24);
    expect(new Set(GOVERNORATES).size).toBe(24);
    for (const g of POPULAR) expect(GOVERNORATES).toContain(g);
    expect(POPULAR).toEqual(["Tunis", "Sousse", "Sfax", "Ariana", "Ben Arous"]);
  });
  it("validates", () => {
    expect(validateGovernorate("")).toBe("Choisis où te livrer.");
    expect(validateGovernorate("Paris")).toBe("Choisis où te livrer.");
    expect(validateGovernorate("sousse")).toBe("Choisis où te livrer.");
    expect(validateGovernorate("Médenine")).toBeNull();
  });
});

describe("validateCheckout + banner", () => {
  it("collects every error", () => {
    expect(validateCheckout({ customerName: "", phone: "98765", governorate: "" })).toEqual({
      customerName: "Ton nom aide le livreur à te trouver.",
      phone: "Il manque 3 chiffres (8 au total).",
      governorate: "Choisis où te livrer.",
    });
    expect(validateCheckout({ customerName: "Mohamed Ben Ali", phone: "98765432", governorate: "Sousse" })).toEqual({});
  });
  it("banner copy", () => {
    expect(errorBannerText(1)).toBe("1 info à corriger avant de valider");
    expect(errorBannerText(2)).toBe("2 infos à corriger avant de valider");
  });
});

describe("server schema (zod) uses the same rules", () => {
  it("returns field messages", () => {
    const r = orderInputSchema.safeParse(normalizeOrderPayload({ customerName: "M", phone: "18765432", governorate: "X" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(errorsFromZod(r.error)).toEqual({
        customerName: "Écris ton nom et ton prénom.",
        phone: "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.",
        governorate: "Choisis où te livrer.",
      });
    }
  });
  it("handles garbage payloads with our messages", () => {
    const r = orderInputSchema.safeParse(normalizeOrderPayload(42));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(errorsFromZod(r.error)).toEqual({
        customerName: "Ton nom aide le livreur à te trouver.",
        phone: "Ton numéro nous sert à confirmer la commande sur WhatsApp.",
        governorate: "Choisis où te livrer.",
      });
    }
  });
  it("normalizes a valid payload", () => {
    const r = orderInputSchema.safeParse(
      normalizeOrderPayload({
        customerName: "  Mohamed   Ben Ali ",
        phone: "98 765 432",
        governorate: "Sousse",
        website: "",
        source: { utmSource: "tiktok", utmCampaign: "x".repeat(300) },
      }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.customerName).toBe("Mohamed Ben Ali");
      expect(r.data.phone).toBe("98765432");
      expect(r.data.source?.utmSource).toBe("tiktok");
      expect(r.data.source?.utmCampaign).toHaveLength(100);
      expect(r.data.website).toBe("");
    }
  });
});
