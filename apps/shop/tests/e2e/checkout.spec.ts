import { expect, test } from "@playwright/test";

const API = "http://localhost:8099";
const ADDRESS = "12 rue de Marseille, cité El Khadra, Sousse (près de la pharmacie)";

test("home → pack page → checkout (4 fields) → order → confirmation → tracking", async ({ page, request }) => {
  await page.goto("/?utm_source=tiktok&utm_campaign=nov&utm_content=reel-3");
  await expect(page.getByRole("heading", { level: 1, name: /Booste ta routine/i })).toBeVisible();

  // Collection: every active pack, the one without photo gets the branded visual.
  const collection = page.locator("#packs");
  await expect(collection.getByRole("heading", { name: "Le Pack Barista" })).toBeVisible();
  await expect(collection.getByRole("heading", { name: "Le Pack Setup & Productivité" })).toBeVisible();
  await expect(collection.getByTestId("pack-fallback")).toHaveCount(1);
  await expect(page.getByText("Le Pack Meal Prep")).toHaveCount(0); // draft: not public

  await collection.getByRole("link", { name: "Le Pack Espace Autonome" }).click();
  await page.waitForURL(/\/packs\/pack-espace-autonome$/);
  await expect(page.getByRole("heading", { level: 1, name: "Le Pack Espace Autonome" })).toBeVisible();
  await expect(page.getByTestId("availability")).toHaveText("En stock — expédié sous 24 h");
  // Photos load through the same-origin /media rewrite.
  const photo = page.getByTestId("gallery-track").locator("img").first();
  await expect(photo).toHaveJSProperty("complete", true);
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // Hotspots: 3 pins, the card follows the active pin.
  const pins = page.getByTestId("hotspot-pin");
  await expect(pins).toHaveCount(3);
  await pins.nth(1).click();
  await expect(page.getByTestId("hotspot-card")).toContainText("Multiprise « Cube » design");

  await page.getByRole("button", { name: /Obtenir mon pack/i }).filter({ visible: true }).first().click();
  const dialog = page.getByRole("dialog", { name: /Finalise ta commande/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Nom & prénom/)).toBeFocused();
  await expect(dialog.getByTestId("checkout-recap")).toContainText("Le Pack Espace Autonome");
  await expect(dialog.getByTestId("checkout-recap")).toContainText("79 TND");

  // Button stays clickable and reveals the 4 errors.
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();
  await expect(dialog.getByText("4 infos à corriger avant de valider")).toBeVisible();
  await expect(dialog.getByText("Ton adresse permet au livreur de te trouver.")).toBeVisible();
  await expect(dialog.getByLabel(/Nom & prénom/)).toBeFocused();

  // Escape closes, reopen keeps nothing broken.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: /Obtenir mon pack/i }).filter({ visible: true }).first().click();

  await dialog.getByLabel(/Nom & prénom/).fill("Mohamed Ben Ali");
  await dialog.getByLabel(/Numéro de téléphone/).fill("98765432");
  await expect(dialog.getByLabel(/Numéro de téléphone/)).toHaveValue("98 765 432");
  await dialog.getByLabel(/Ville \/ Gouvernorat/).selectOption("Sousse");
  const address = dialog.getByLabel("Adresse exacte");
  await expect(address).toHaveAttribute("autocomplete", "street-address");
  await address.fill("Sousse");
  await address.blur();
  await expect(dialog.getByText("Précise ta rue, ton quartier et ta ville.")).toBeVisible();
  await address.fill(ADDRESS);
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();

  await page.waitForURL(/\/merci\/SC-\d+$/);
  const url = new URL(page.url());
  expect(url.search).toBe(""); // neither the phone nor the address appears in a URL
  await expect(page.getByRole("heading", { name: /Commande #SC-\d+ reçue/ })).toBeVisible();
  await expect(page.getByText("+216 98 765 432")).toBeVisible();
  await expect(page.getByTestId("merci-pack")).toContainText("Le Pack Espace Autonome");
  await expect(page.getByTestId("merci-pack")).toContainText("Livraison à Sousse");
  await expect(page.getByTestId("merci-pack").locator("img")).toHaveCount(1);
  // never the full address — not even in the hidden, still-mounted pack page: the form is wiped
  // once the order succeeds (CheckoutRoot), so « back » shows an empty checkout.
  await expect(page.getByText(/rue de Marseille/).filter({ visible: true })).toHaveCount(0);
  // (the empty form keeps its « 12 rue de Marseille, cité El Khadra, Tunis » placeholder: match the typed value)
  await expect.poll(async () => (await page.content()).includes("El Khadra, Sousse")).toBe(false);
  await expect(page.getByTestId("merci-pack")).not.toContainText("rue de Marseille");
  const wa = page.getByRole("link", { name: "Ouvrir WhatsApp" });
  await expect(wa).toHaveAttribute("href", /^https:\/\/wa\.me\/21600000000\?text=Je%20confirme%20ma%20commande%20SC-\d+$/);

  const sent = await (await request.get(`${API}/__last`)).json();
  expect(sent).toMatchObject({
    customerName: "Mohamed Ben Ali",
    phone: "98765432",
    governorate: "Sousse",
    address: ADDRESS,
    productSku: "PACK-ESPACE",
    quantity: 1,
    website: "",
    source: { utmSource: "tiktok", utmCampaign: "nov", utmContent: "reel-3" },
  });

  await page.getByRole("link", { name: "Suivre ma commande" }).filter({ visible: true }).last().click();
  await page.waitForURL(/\/suivi\/SC-\d+\?t=good-token$/);
  await expect(page.getByRole("heading", { name: "Ton pack est en route" })).toBeVisible();
  await expect(page.getByTestId("tracking-pack")).toContainText("Le Pack Barista");
  await expect(page.getByText("Expédiée avec Yalidine")).toBeVisible();
  await expect(page.getByText("Prépare en espèces")).toBeVisible();
});

test("API errors: 422 mapped to the field, 429 friendly message", async ({ page }) => {
  await page.goto("/packs/pack-barista#commander");
  const dialog = page.getByRole("dialog", { name: /Finalise ta commande/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Nom & prénom/).fill("Mohamed Ben Ali");
  await dialog.getByLabel(/Numéro de téléphone/).fill("31111111");
  await dialog.getByLabel(/Ville \/ Gouvernorat/).selectOption("Tunis");
  await dialog.getByLabel("Adresse exacte").fill(ADDRESS);
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();
  await expect(dialog.getByText("Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.")).toBeVisible();

  await dialog.getByLabel(/Nom & prénom/).fill("Rate Limit");
  await dialog.getByLabel(/Numéro de téléphone/).fill("22222222");
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();
  await expect(dialog.getByText("Trop de tentatives. Réessaie dans quelques minutes.")).toBeVisible();
});

test("pack page: gallery lightbox (Escape) and unknown pack → 404", async ({ page }) => {
  await page.goto("/packs/pack-barista");
  await page.getByRole("button", { name: /Agrandir la photo 1 sur 2/ }).click();
  const lightbox = page.getByTestId("lightbox");
  await expect(lightbox).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(lightbox).toContainText("2 / 2");
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();

  const res = await page.goto("/packs/pack-inconnu");
  expect(res?.status()).toBe(404);
});

test("tracking: invalid token and unknown order", async ({ page }) => {
  await page.goto("/suivi/SC-2951?t=bad");
  await expect(page.getByRole("heading", { name: "Ce lien de suivi ne marche pas" })).toBeVisible();
  await page.goto("/suivi/SC-404?t=good-token");
  await expect(page.getByRole("heading", { name: "Commande introuvable" })).toBeVisible();
});

test("confirmation without cookie: graceful fallback, no phone", async ({ page }) => {
  await page.goto("/merci/SC-1234");
  await expect(page.getByRole("heading", { name: /Commande #SC-1234 reçue/ })).toBeVisible();
  await expect(page.getByText(/On t'envoie un message WhatsApp pour confirmer ta commande/)).toBeVisible();
  await expect(page.getByText(/\+216/)).toHaveCount(0);
});
