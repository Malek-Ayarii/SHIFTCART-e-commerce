import { notFound } from "next/navigation";
import { TrackingProblem, TrackingView } from "@/components/tracking/TrackingView";
import { getTracking } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { coverPosition } from "@/lib/focus";
import { parseRef } from "@/lib/types";
import { contactUrl } from "@/lib/whatsapp";

const FORBIDDEN = {
  title: "Ce lien de suivi ne marche pas",
  text: "Ouvre le lien de suivi reçu dans ton message WhatsApp : il contient la clé de ta commande.",
};
const NOT_FOUND = {
  title: "Commande introuvable",
  text: "On ne trouve pas cette commande. Vérifie le lien reçu sur WhatsApp ou écris-nous.",
};

/** A7 — Suivi de commande (Suivi.dc.html): server-fetches GET /api/orders/{ref}/tracking?t=. */
export default async function SuiviPage({ params, searchParams }: PageProps<"/suivi/[ref]">) {
  const { ref: rawRef } = await params;
  const ref = parseRef(rawRef);
  if (!ref) notFound();

  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const contactHref = contactUrl();
  if (!token) return <TrackingProblem {...FORBIDDEN} contactHref={contactHref} />;

  const result = await getTracking(ref, token);
  if (result.kind === "forbidden") return <TrackingProblem {...FORBIDDEN} contactHref={contactHref} />;
  if (result.kind === "not_found") return <TrackingProblem {...NOT_FOUND} contactHref={contactHref} />;
  const { tracking } = result;
  // Thumbnail crop on the pack's products (cached public catalogue; nothing personal involved).
  const catalog = tracking.productSlug ? await getCatalog() : null;
  const cover = catalog?.ok ? catalog.packs.find((p) => p.slug === tracking.productSlug)?.cover : null;
  const coverPos = cover?.focus ? coverPosition(cover.focus, cover.width / cover.height, 4 / 3) : null;
  return <TrackingView tracking={tracking} contactHref={contactHref} coverPosition={coverPos} />;
}
