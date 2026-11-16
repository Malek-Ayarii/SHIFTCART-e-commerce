import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PackFallback } from "@/components/catalog/PackVisual";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { decodeOrderCookie, ORDER_COOKIE } from "@/lib/order-cookie";
import { getCatalog } from "@/lib/catalog";
import { packHref } from "@/lib/catalog-map";
import { coverPosition } from "@/lib/focus";
import { parseRef } from "@/lib/types";
import { confirmOrderUrl, isSafeWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Commande reçue",
  robots: { index: false, follow: false },
};

/** A6 — Commande confirmée (Confirmation.dc.html). */
export default function MerciPage({ params }: PageProps<"/merci/[ref]">) {
  return (
    <SiteShell mobileHeader="logo">
      <Suspense fallback={<ConfirmationSkeleton />}>
        <Confirmation params={params} />
      </Suspense>
    </SiteShell>
  );
}

/**
 * Mobile: the 480px column of the mock-up. From 1024px: confirmation + next steps on the left (7),
 * recap + actions in a sticky aside on the right (5). DOM order = mobile reading order.
 */
const grid =
  "mx-auto flex w-full max-w-120 flex-1 flex-col " +
  "lg:grid lg:max-w-container lg:grid-cols-12 lg:items-start lg:gap-8 lg:px-8 lg:pt-12 lg:pb-section";

async function Confirmation({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: rawRef } = await params;
  const ref = parseRef(rawRef);
  if (!ref) notFound();

  const jar = await cookies();
  const saved = decodeOrderCookie(jar.get(ORDER_COOKIE)?.value);
  const order = saved && saved.ref === ref ? saved : null;

  const amount = order?.amountTnd;
  // Crop the thumbnail on the pack's products (cached catalogue read, no personal data involved).
  const catalog = order?.productSlug && order.productCoverSrc ? await getCatalog() : null;
  const cover = catalog?.ok ? catalog.packs.find((p) => p.slug === order?.productSlug)?.cover : null;
  const coverPos = cover?.focus ? coverPosition(cover.focus, cover.width / cover.height, 4 / 3) : null;
  const productName = order?.productName;
  const whatsappUrl = order?.whatsappConfirmUrl && isSafeWhatsAppUrl(order.whatsappConfirmUrl) ? order.whatsappConfirmUrl : confirmOrderUrl(ref);
  const trackingHref = order ? `/suivi/${encodeURIComponent(ref)}?t=${encodeURIComponent(order.trackingToken)}` : "/suivi";

  const steps = [
    "Réponds OUI sur WhatsApp pour confirmer.",
    order?.governorate ? `Livraison à ${order.governorate} sous 24 à 48 h.` : "Livraison sous 24 à 48 h.",
    amount !== undefined ? `Tu paies ${amount} TND en espèces au livreur.` : "Tu paies en espèces au livreur.",
  ];

  return (
    <div className={grid}>
      <div className="flex flex-col lg:col-span-7 lg:gap-6">
        <section className="flex flex-col items-center gap-3 px-5 pt-8 pb-5 text-center lg:items-start lg:rounded-lg lg:bg-surface-raised lg:p-8 lg:text-left lg:shadow-card">
          <span className="grid size-20 place-items-center rounded-pill bg-success-soft text-success">
            <Icon name="check" size={40} strokeWidth={3} />
          </span>
          <StatusBadge status="new" />
          <h1 className="m-0 text-display-lg lg:text-display-xl">Commande #{ref} reçue&nbsp;🚀</h1>
          {order && order.phoneDisplay ? (
            <p className="m-0 text-body text-ink-muted">
              Merci{order.customerFirstName ? ` ${order.customerFirstName}` : ""} ! On t&apos;envoie un message WhatsApp au{" "}
              <strong className="whitespace-nowrap text-ink">{order.phoneDisplay}</strong>.
            </p>
          ) : (
            <p className="m-0 text-body text-ink-muted">Merci ! On t&apos;envoie un message WhatsApp pour confirmer ta commande.</p>
          )}
        </section>

        <ol className="m-0 flex list-none flex-col gap-2 px-5 lg:px-0">
          {steps.map((text, i) => (
            <li
              key={text}
              className={`flex items-center gap-3 rounded-md p-3 text-sm leading-5 ${i === 0 ? "bg-orange-soft font-bold" : "bg-surface-sunken font-semibold"}`}
            >
              <span
                className={`grid size-7 flex-none place-items-center rounded-pill text-meta font-extrabold ${
                  i === 0 ? "bg-orange text-on-orange" : "bg-ink text-ink-inverse"
                }`}
              >
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-1 flex-col lg:sticky lg:top-24 lg:col-span-5 lg:flex-none lg:gap-4">
        {order ? (
          // One recap card: what you ordered, then what you pay (was two stacked cards).
          <div className="mx-5 mt-5 overflow-hidden rounded-md bg-surface-raised ring-inset-line lg:mx-0 lg:mt-0 lg:rounded-lg lg:shadow-card">
            {productName ? (
              <div className="flex items-center gap-3 p-3" data-testid="merci-pack">
                <span className="relative aspect-4/3 w-20 flex-none overflow-hidden rounded-sm bg-surface-sunken">
                  {order.productCoverSrc ? (
                    <Image src={order.productCoverSrc} alt="" fill sizes="80px" className="object-cover" style={coverPos ? { objectPosition: coverPos } : undefined} />
                  ) : (
                    <PackFallback name={productName} compact />
                  )}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  {order.productSlug ? (
                    <Link href={packHref(order.productSlug)} className="text-item text-ink underline-offset-4 hover:underline">
                      {productName}
                    </Link>
                  ) : (
                    <span className="text-item">{productName}</span>
                  )}
                  {order.governorate ? (
                    <span className="flex items-center gap-1 text-meta text-ink-muted">
                      <Icon name="pin" size={14} />
                      Livraison à {order.governorate}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
            <dl className={`m-0 flex flex-col gap-2 p-4 text-sm leading-5 ${productName ? "border-t border-line" : ""}`}>
              <div className="flex items-baseline justify-between">
                <dt className="font-semibold text-ink-muted">Livraison</dt>
                <dd className="m-0 font-bold text-success">Gratuite</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="font-bold">À payer à la livraison</dt>
                <dd className="m-0 font-display text-xl font-extrabold">{amount !== undefined ? `${amount} TND` : "—"}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 p-5 lg:mt-0 lg:p-0">
          {whatsappUrl ? (
            <Button variant="whatsapp" size="xl" block icon="whatsapp" href={whatsappUrl} target="_blank">
              Ouvrir WhatsApp
            </Button>
          ) : (
            <p className="m-0 rounded-md bg-warning-soft p-3 text-sm leading-5 font-semibold text-warning" role="note">
              Numéro WhatsApp de la boutique : [À DÉFINIR] (NEXT_PUBLIC_WHATSAPP_NUMBER)
            </p>
          )}
          <Button variant="ghost" size="md" block href={trackingHref}>
            Suivre ma commande
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-120 flex-1 flex-col items-center gap-3 px-5 pt-8 lg:max-w-container lg:items-start lg:px-8 lg:pt-12"
      aria-busy="true"
      aria-label="Chargement"
    >
      <span className="size-20 animate-pulse rounded-pill bg-surface-sunken" />
      <span className="h-6 w-24 animate-pulse rounded-sm bg-surface-sunken" />
      <span className="h-8 w-4/5 animate-pulse rounded-sm bg-surface-sunken" />
      <span className="h-12 w-full animate-pulse rounded-md bg-surface-sunken" />
      <span className="mt-2 h-38 w-full animate-pulse rounded-md bg-surface-sunken" />
    </div>
  );
}
