import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CheckoutRoot } from "@/components/checkout/CheckoutRoot";
import { PackCard } from "@/components/catalog/PackCard";
import { container, HowItWorks, ReviewsSection, SectionHeading, SiteFooter } from "@/components/catalog/Sections";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { BuyBox } from "@/components/product/BuyBox";
import { Gallery } from "@/components/product/Gallery";
import { PackHotspots } from "@/components/product/PackHotspots";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SavingsCalculator } from "@/components/ui/SavingsCalculator";
import { StoryVideo } from "@/components/ui/StoryVideo";
import { getCatalog, getPack } from "@/lib/catalog";
import { toSummary, type Pack } from "@/lib/catalog-map";
import { getReviews, socialLinks, storyVideo } from "@/lib/content";
import { cx } from "@/lib/cx";
import { coverPosition } from "@/lib/focus";
import { contactUrl } from "@/lib/whatsapp";

const FLAGSHIP_SLUG = "pack-barista";

/**
 * The whole page must be static output (cached catalogue reads only): an unlisted slug waits for
 * its static render on first request instead of getting the fallback shell, so an unknown or
 * inactive pack answers a real HTTP 404 and a new pack is cached like ISR.
 */
export const ensureStatic = "navigation";
/** Blocking on purpose (slug resolved before streaming, see above): no instant-shell validation. */
export const instant = false;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/**
 * Packs prerendered at build. With Cache Components the list must not be empty: when the API is
 * down at build time the flagship slug stands in (its page then shows the « indisponible » state
 * and revalidates); unlisted slugs are rendered on first visit and cached (ISR).
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const catalog = await getCatalog();
  const slugs = catalog.ok ? catalog.packs.map((p) => p.slug) : [];
  return (slugs.length > 0 ? slugs : [FLAGSHIP_SLUG]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/packs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPack(slug);
  if (res.kind !== "ok") return { title: "Pack", robots: res.kind === "not_found" ? { index: false } : undefined };
  const p = res.pack;
  const title = `${p.name} · ${p.priceTnd} TND livré chez toi`;
  const images = p.cover ? [{ url: p.cover.src, width: p.cover.width, height: p.cover.height, alt: p.cover.alt }] : undefined;
  return {
    title,
    description: `${p.tagline} Livraison gratuite partout en Tunisie, paiement à la livraison.`,
    alternates: { canonical: `/packs/${p.slug}` },
    openGraph: { type: "website", title, description: p.tagline, url: `/packs/${p.slug}`, images },
    twitter: { card: "summary_large_image", title, description: p.tagline, images: images?.map((i) => i.url) },
  };
}

/**
 * `/packs/[slug]` — product page (docs/SPEC-V2.md › Page produit). The slug is resolved before
 * any streaming so an unknown or inactive pack answers a real HTTP 404 (cached reads: the
 * listed packs stay fully static, the others are rendered once then cached like ISR).
 */
export default async function PackPage({ params }: PageProps<"/packs/[slug]">) {
  const { slug } = await params;
  const res = await getPack(slug);
  if (res.kind === "not_found") notFound();
  return (
    <Suspense fallback={<PackSkeleton />}>
      <PackContent params={params} />
    </Suspense>
  );
}

async function PackContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [res, catalog] = await Promise.all([getPack(slug), getCatalog()]);
  const contactHref = contactUrl();
  const others = catalog.ok ? catalog.packs : [];
  const summaries = others.map(toSummary);

  if (res.kind === "not_found") notFound();
  if (res.kind === "error") return <PackUnavailable packs={summaries} contactHref={contactHref} />;

  const pack = res.pack;
  const related = others.filter((p) => p.slug !== pack.slug);
  const isBarista = pack.slug === FLAGSHIP_SLUG;
  const reviews = getReviews();

  return (
    <CheckoutRoot product={{ sku: pack.sku, name: pack.name, priceTnd: pack.priceTnd, image: pack.cover ? { src: pack.cover.src, alt: pack.cover.alt, position: coverPosition(pack.cover.focus, pack.cover.width / pack.cover.height, 1) } : null }}>
      <ProductJsonLd pack={pack} />
      <SiteHeader packs={summaries} contactHref={contactHref} />
      <main>
        <nav aria-label="Fil d'Ariane" className={cx(container, "hidden py-3 sm:block lg:py-5")}>
          <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-small text-ink-muted">
            <li>
              <Link href="/" className="inline-flex min-h-11 items-center text-ink-muted underline-offset-4 hover:underline">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">
              <Icon name="chevronRight" size={14} />
            </li>
            <li>
              <Link href="/#packs" className="inline-flex min-h-11 items-center text-ink-muted underline-offset-4 hover:underline">
                Packs
              </Link>
            </li>
            <li aria-hidden="true">
              <Icon name="chevronRight" size={14} />
            </li>
            <li aria-current="page" className="font-bold text-ink">
              {pack.name}
            </li>
          </ol>
        </nav>

        <div className={cx(container, "grid gap-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-16")}>
          <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
            <Gallery images={pack.images} name={pack.name} items={pack.items.map((it) => it.name)} />
          </div>

          <aside aria-label="Commander" className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
            <div className="lg:sticky lg:top-24">
              <BuyBox pack={pack} />
            </div>
          </aside>

          <div className="flex flex-col gap-section pt-6 lg:col-span-7 lg:col-start-1 lg:row-start-2 lg:gap-16 lg:pt-0">
            {pack.items.length > 0 ? (
              <section aria-labelledby="contenu-t" className="flex flex-col gap-6">
                <SectionHeading id="contenu-t" title="Qu'y a-t-il dans ton pack ?" intro={
                    pack.cover && pack.items.some((it) => it.hotspot)
                      ? "Touche un numéro sur la photo pour voir chaque produit de près."
                      : "Chaque produit, et à quoi il te sert au quotidien."
                  } />
                <PackHotspots image={pack.cover} name={pack.name} items={pack.items} />
              </section>
            ) : null}

            {pack.audience || pack.description ? (
              <section aria-labelledby="pour-qui-t" className="flex flex-col gap-4">
                <SectionHeading id="pour-qui-t" title="Pour qui ?" />
                {pack.audience ? (
                  <p className="flex max-w-measure items-start gap-3 text-lead">
                    <span className="mt-1 grid size-10 flex-none place-items-center rounded-pill bg-orange-soft text-orange-ink">
                      <Icon name="users" size={20} />
                    </span>
                    {pack.audience}
                  </p>
                ) : null}
                {pack.description ? <p className="max-w-measure text-body text-ink-muted whitespace-pre-line">{pack.description}</p> : null}
              </section>
            ) : null}
          </div>
        </div>

        {pack.savings ? (
          <section id="economies" aria-labelledby="economies-t" className="scroll-mt-20 pt-section">
            <div className={cx(container, "grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-x-12 lg:gap-y-8")}>
              <SectionHeading
                id="economies-t"
                title={pack.savings.title}
                intro="Bouge le curseur : le calcul est juste en dessous, rien n'est caché."
                className={isBarista ? "lg:col-span-7 lg:row-start-1" : "lg:col-span-5 lg:row-start-1"}
              />
              <div className={isBarista ? "lg:col-span-7 lg:col-start-1 lg:row-start-2" : "lg:col-span-7 lg:col-start-6 lg:row-start-1"}>
                <SavingsCalculator config={pack.savings} packPrice={pack.priceTnd} />
              </div>
              {isBarista ? (
                <div className="mx-auto w-full max-w-100 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:mr-0 lg:max-w-80">
                  <StoryVideo {...storyVideo()} />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <HowItWorks className="py-section" />

        <section aria-labelledby="faq-t" className="pb-section">
          <div className={cx(container, "grid gap-8 lg:grid-cols-12 lg:gap-12")}>
            <SectionHeading id="faq-t" title="Questions fréquentes" className="lg:col-span-5" />
            <Faq className="lg:col-span-7" />
          </div>
        </section>

        <ReviewsSection reviews={reviews} className="pb-section" />

        {related.length > 0 ? (
          <section aria-labelledby="related-t" className="border-t border-line py-section">
            <div className={cx(container, "flex flex-col gap-8")}>
              <SectionHeading id="related-t" title="Complète ta routine" intro="Les autres packs, même promesse : livrés gratuitement, payés à la livraison." />
              <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {related.map((p) => (
                  <li key={p.slug} className="flex">
                    <PackCard pack={p} className="w-full" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter packs={summaries} contactHref={contactHref} socials={socialLinks()} />
    </CheckoutRoot>
  );
}

const FAQ: Array<{ q: string; a: ReactNode }> = [
  { q: "Combien coûte la livraison ?", a: "Rien : la livraison est gratuite partout en Tunisie, sous 24 à 48 h après ta confirmation sur WhatsApp." },
  { q: "Comment je paie ?", a: "En espèces, au livreur, à la réception du colis. Pas de carte, pas de paiement en ligne, rien à payer avant." },
  {
    q: "Pourquoi une adresse exacte ?",
    a: "Pour que le livreur te trouve du premier coup : rue, numéro, quartier, ville et un repère si besoin. Elle sert uniquement à ta livraison.",
  },
  {
    q: "Et si le pack ne me convient pas ?",
    a: (
      <>
        Tout est expliqué sur la page{" "}
        <Link href="/livraison" className="font-bold text-ink underline underline-offset-4">
          Livraison &amp; retours
        </Link>
        .
      </>
    ),
  },
];

function Faq({ className }: { className?: string }) {
  return (
    <div className={cx("flex flex-col border-t border-line", className)}>
      {FAQ.map((f) => (
        <details key={f.q} className="group border-b border-line">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-title [&::-webkit-details-marker]:hidden">
            {f.q}
            <Icon name="chevronDown" size={22} className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <p className="max-w-measure pb-5 text-body text-ink-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

function ProductJsonLd({ pack }: { pack: Pack }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pack.name,
    sku: pack.sku,
    description: pack.tagline,
    brand: { "@type": "Brand", name: "SHIFT CART" },
    ...(pack.images.length > 0 ? { image: pack.images.map((i) => `${siteUrl}${i.src}`) } : {}),
    url: `${siteUrl}/packs/${pack.slug}`,
    offers: {
      "@type": "Offer",
      price: String(pack.priceTnd),
      priceCurrency: "TND",
      availability: pack.availability === "IN_STOCK" ? "https://schema.org/InStock" : "https://schema.org/BackOrder",
      url: `${siteUrl}/packs/${pack.slug}`,
    },
  };
  // `<` escaped so the JSON can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

function PackUnavailable({ packs, contactHref }: { packs: ReturnType<typeof toSummary>[]; contactHref: string }) {
  const external = contactHref.startsWith("http");
  return (
    <>
      <SiteHeader packs={packs} contactHref={contactHref} />
      <main className={cx(container, "flex min-h-[60dvh] flex-col justify-center gap-5 py-section")}>
        <span className="grid size-12 place-items-center rounded-pill bg-warning-soft text-warning">
          <Icon name="alert" size={24} />
        </span>
        <h1 className="text-display-section">Ce pack ne se charge pas</h1>
        <p role="status" className="max-w-measure text-lead text-ink-muted">
          On n&apos;arrive pas à afficher ce pack pour le moment. Réessaie dans un instant ou écris-nous sur WhatsApp.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="dark" size="md" icon="refresh" href="/">
            Revenir à la boutique
          </Button>
          <Button variant="ghost" size="md" icon="whatsapp" href={contactHref} target={external ? "_blank" : undefined}>
            Nous écrire
          </Button>
        </div>
      </main>
    </>
  );
}

function PackSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du pack">
      <div className="h-14 border-b border-line bg-surface lg:h-17" />
      <div className={cx(container, "grid gap-6 py-6 lg:grid-cols-12 lg:gap-12 lg:py-12")}>
        <div className="-mx-4 aspect-4/3 animate-pulse bg-surface-sunken sm:mx-0 sm:rounded-lg lg:col-span-7 lg:aspect-16/11" />
        <div className="flex flex-col gap-4 lg:col-span-5">
          <span className="h-10 w-3/4 animate-pulse rounded-sm bg-surface-sunken" />
          <span className="h-6 w-full animate-pulse rounded-sm bg-surface-sunken" />
          <span className="h-12 w-1/2 animate-pulse rounded-sm bg-surface-sunken" />
          <span className="h-16 w-full animate-pulse rounded-lg bg-surface-sunken" />
        </div>
      </div>
    </div>
  );
}
