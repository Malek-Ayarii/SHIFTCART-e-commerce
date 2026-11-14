// Minimal stand-in for apps/api used by the Playwright e2e (docs/CONTRACT.md shapes).
// The shop calls the API server-side (Server Action), so browser route interception
// cannot mock it: this tiny server is started by playwright.config.ts instead.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT || 8099);
let last = null;
let seq = 2951;

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && url.pathname === "/__last") return send(res, 200, last);

  if (req.method === "POST" && url.pathname === "/api/orders") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      last = body;
      if (body.customerName === "Rate Limit") {
        return send(res, 429, { error: "RATE_LIMITED", message: "Trop de tentatives. Réessaie dans quelques minutes." });
      }
      if (body.phone === "31111111") {
        return send(res, 422, { errors: { phone: "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9." } });
      }
      const ref = `SC-${seq++}`;
      const d = body.phone;
      return send(res, 201, {
        ref,
        amountTnd: 89,
        status: "NEW",
        productName: "Le Pack Barista",
        customerFirstName: String(body.customerName).trim().split(/\s+/)[0],
        phoneDisplay: `+216 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`,
        governorate: body.governorate,
        trackingToken: "good-token",
        whatsappConfirmUrl: `https://wa.me/21600000000?text=${encodeURIComponent(`Je confirme ma commande ${ref}`)}`,
        trackingUrl: `http://localhost:3100/suivi/${ref}?t=good-token`,
      });
    });
    return;
  }

  const m = url.pathname.match(/^\/api\/orders\/(SC-\d+)\/tracking$/);
  if (req.method === "GET" && m) {
    if (m[1] === "SC-404") return send(res, 404, { error: "NOT_FOUND", message: "Commande introuvable" });
    if (url.searchParams.get("t") !== "good-token") return send(res, 403, { error: "FORBIDDEN", message: "Jeton invalide" });
    return send(res, 200, {
      ref: m[1],
      status: "SHIPPED",
      productName: "Le Pack Barista",
      amountTnd: 89,
      governorate: "Sousse",
      customerFirstName: "Mohamed",
      carrier: "YALIDINE",
      trackingNumber: "YAL-88213",
      eta: "2026-11-16",
      steps: [
        { key: "RECEIVED", label: "Commande reçue", state: "done", at: "2026-11-14T10:32:00Z" },
        { key: "CONFIRMED", label: "Confirmée sur WhatsApp", state: "done", at: "2026-11-14T10:41:00Z" },
        { key: "SHIPPED", label: "Expédiée avec Yalidine", state: "current", at: "2026-11-15T08:10:00Z", detail: "N° de suivi YAL-88213" },
        { key: "DELIVERED", label: "Livrée & payée", state: "upcoming", at: null },
      ],
    });
  }
  send(res, 404, { error: "NOT_FOUND", message: "?" });
});

server.listen(PORT, () => console.log(`mock api on :${PORT}`));
