import { describe, expect, it } from "vitest";
import { errorsFromZod, normalizeOrderPayload, orderInputSchema } from "@/lib/order-schema";
import {
  errorBannerText,
  formatTnPhone,
  GOVERNORATES,
  phoneDigits,
  POPULAR,
  normalizeAddress,
  validateAddress,
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

describe("validateAddress (docs/SPEC-V2.md › Checkout v2 messages)", () => {
  it("empty → the courier needs it", () => {
    expect(validateAddress("")).toBe("Ton adresse permet au livreur de te trouver.");
    expect(validateAddress("   \n  ")).toBe("Ton adresse permet au livreur de te trouver.");
    expect(validateAddress(undefined)).toBe("Ton adresse permet au livreur de te trouver.");
  });
  it("10 to 200 characters after trim", () => {
    expect(validateAddress("Rue 12")).toBe("Précise ta rue, ton quartier et ta ville.");
    expect(validateAddress("   123456789   ")).toBe("Précise ta rue, ton quartier et ta ville.");
    expect(validateAddress("1234567890")).toBeNull();
    expect(validateAddress("x".repeat(200))).toBeNull();
    expect(validateAddress("x".repeat(201))).toBe("Ton adresse est trop longue (200 caractères max).");
    expect(validateAddress(`  ${"x".repeat(200)}  `)).toBeNull();
  });
  it("normalizeAddress trims, collapses spaces and joins lines", () => {
    expect(normalizeAddress("  12  rue de Marseille,\n cité El Khadra \n\nTunis ")).toBe("12 rue de Marseille, cité El Khadra, Tunis");
  });
});

describe("validateCheckout + banner", () => {
  it("collects every error", () => {
    expect(validateCheckout({ customerName: "", phone: "98765", governorate: "", address: "" })).toEqual({
      customerName: "Ton nom aide le livreur à te trouver.",
      phone: "Il manque 3 chiffres (8 au total).",
      governorate: "Choisis où te livrer.",
      address: "Ton adresse permet au livreur de te trouver.",
    });
    expect(validateCheckout({ customerName: "Mohamed Ben Ali", phone: "98765432", governorate: "Sousse", address: "12 rue de Marseille, cité El Khadra, Tunis" })).toEqual({});
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
        address: "Ton adresse permet au livreur de te trouver.",
        productSku: "Ce pack n'est plus disponible.",
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
        address: "Ton adresse permet au livreur de te trouver.",
        productSku: "Ce pack n'est plus disponible.",
      });
    }
  });
  it("short address → its own message", () => {
    const r = orderInputSchema.safeParse(
      normalizeOrderPayload({ customerName: "Mohamed", phone: "98765432", governorate: "Tunis", address: "Tunis", productSku: "PACK-BARISTA" }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(errorsFromZod(r.error)).toEqual({ address: "Précise ta rue, ton quartier et ta ville." });
  });
  it("normalizes a valid payload", () => {
    const r = orderInputSchema.safeParse(
      normalizeOrderPayload({
        customerName: "  Mohamed   Ben Ali ",
        phone: "98 765 432",
        governorate: "Sousse",
        address: "  12 rue de Marseille,\n cité El Khadra, Tunis ",
        productSku: "pack-setup",
        website: "",
        source: { utmSource: "tiktok", utmCampaign: "x".repeat(300) },
      }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.customerName).toBe("Mohamed Ben Ali");
      expect(r.data.phone).toBe("98765432");
      expect(r.data.address).toBe("12 rue de Marseille, cité El Khadra, Tunis");
      expect(r.data.productSku).toBe("PACK-SETUP");
      expect(r.data.source?.utmSource).toBe("tiktok");
      expect(r.data.source?.utmCampaign).toHaveLength(100);
      expect(r.data.website).toBe("");
    }
  });
});

describe("orderInputSchema › address (validated after normalisation)", () => {
  const base = { customerName: "Mohamed Ben Ali", phone: "98765432", governorate: "Sousse", productSku: "PACK-SETUP" };

  it("joins lines with commas and keeps a valid address", () => {
    const r = orderInputSchema.safeParse({ ...base, address: "  12 rue de Marseille,\n cité El Khadra  " });
    expect(r.success && r.data.address).toBe("12 rue de Marseille, cité El Khadra");
  });

  it("rejects an address that normalisation pushes over 200 characters (the API would 422)", () => {
    const raw = Array.from({ length: 40 }, () => "rue a").join("\n");
    const short = raw.slice(0, 199); // ≤ 200 typed, > 200 once each newline becomes ", "
    const r = orderInputSchema.safeParse({ ...base, address: short });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Ton adresse est trop longue (200 caractères max).");
  });
});
