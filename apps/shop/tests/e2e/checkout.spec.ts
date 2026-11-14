import { expect, test } from "@playwright/test";

const API = "http://localhost:8099";

test("landing → checkout → errors → order → confirmation → tracking", async ({ page, request }) => {
  await page.goto("/?utm_source=tiktok&utm_campaign=nov&utm_content=reel-3");
  await expect(page.getByRole("heading", { level: 1, name: /Booste ta routine/i })).toBeVisible();

  // Every CTA opens the same checkout.
  await page.getByRole("button", { name: /Obtenir mon pack/i }).filter({ visible: true }).first().click();
  const dialog = page.getByRole("dialog", { name: /Finalise ta commande/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Nom & prénom/)).toBeFocused();

  // Button stays clickable and reveals errors.
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();
  await expect(dialog.getByText("3 infos à corriger avant de valider")).toBeVisible();
  await expect(dialog.getByLabel(/Nom & prénom/)).toBeFocused();

  // Escape closes, reopen keeps nothing broken.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: /Obtenir mon pack/i }).filter({ visible: true }).first().click();

  await dialog.getByLabel(/Nom & prénom/).fill("Mohamed Ben Ali");
  await dialog.getByLabel(/Numéro de téléphone/).fill("98765432");
  await expect(dialog.getByLabel(/Numéro de téléphone/)).toHaveValue("98 765 432");
  await dialog.getByLabel(/Ville \/ Gouvernorat/).selectOption("Sousse");
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();

  await page.waitForURL(/\/merci\/SC-\d+$/);
  const url = new URL(page.url());
  expect(url.search).toBe(""); // the phone never appears in a URL
  await expect(page.getByRole("heading", { name: /Commande #SC-\d+ reçue/ })).toBeVisible();
  await expect(page.getByText("+216 98 765 432")).toBeVisible();
  await expect(page.getByText("Livraison à Sousse sous 24 à 48 h.")).toBeVisible();
  const wa = page.getByRole("link", { name: "Ouvrir WhatsApp" });
  await expect(wa).toHaveAttribute("href", /^https:\/\/wa\.me\/21600000000\?text=Je%20confirme%20ma%20commande%20SC-\d+$/);

  const sent = await (await request.get(`${API}/__last`)).json();
  expect(sent).toMatchObject({
    customerName: "Mohamed Ben Ali",
    phone: "98765432",
    governorate: "Sousse",
    productSku: "PACK-BARISTA",
    quantity: 1,
    website: "",
    source: { utmSource: "tiktok", utmCampaign: "nov", utmContent: "reel-3" },
  });

  await page.getByRole("link", { name: "Suivre ma commande" }).filter({ visible: true }).last().click();
  await page.waitForURL(/\/suivi\/SC-\d+\?t=good-token$/);
  await expect(page.getByRole("heading", { name: "Ton pack est en route" })).toBeVisible();
  await expect(page.getByText("Expédiée avec Yalidine")).toBeVisible();
  await expect(page.getByText("Prépare en espèces")).toBeVisible();
});

test("API errors: 422 mapped to the field, 429 friendly message", async ({ page }) => {
  await page.goto("/#commander");
  const dialog = page.getByRole("dialog", { name: /Finalise ta commande/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Nom & prénom/).fill("Mohamed Ben Ali");
  await dialog.getByLabel(/Numéro de téléphone/).fill("31111111");
  await dialog.getByLabel(/Ville \/ Gouvernorat/).selectOption("Tunis");
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();
  await expect(dialog.getByText("Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.")).toBeVisible();

  await dialog.getByLabel(/Nom & prénom/).fill("Rate Limit");
  await dialog.getByLabel(/Numéro de téléphone/).fill("22222222");
  await dialog.getByRole("button", { name: /Confirmer ma commande/i }).click();
  await expect(dialog.getByText("Trop de tentatives. Réessaie dans quelques minutes.")).toBeVisible();
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
