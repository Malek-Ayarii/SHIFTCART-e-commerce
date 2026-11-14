import Link from "next/link";
import { PackCard } from "@/components/catalog/PackCard";
import { PackVisual } from "@/components/catalog/PackVisual";
import { container, GuaranteesBand, HowItWorks, ReviewsSection, SectionHeading, SiteFooter } from "@/components/catalog/Sections";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PriceTag } from "@/components/ui/PriceTag";
import { getCatalog } from "@/lib/catalog";
import { featuredPack, packHref, toSummary, type Pack } from "@/lib/catalog-map";
import { getReviews, socialLinks } from "@/lib/content";
import { cx } from "@/lib/cx";
import { contactUrl } from "@/lib/whatsapp";

/** Fonts preloaded on the home only: Syne 800 + Jakarta 400/700 (docs/STACK.md › budget). */
const CRITICAL_FONTS = ["/fonts/Syne-800.woff2", "/fonts/PlusJakartaSans-400.woff2", "/fonts/PlusJakartaSans-700.woff2"];

/**
 * `/` — catalogue home (docs/SPEC-V2.md › Boutique). Static + revalidated every 60 s through the
 * cached catalogue read; the only client islands are the header menu and nothing else.
 */
export default async function Home() {
  const catalog = await getCatalog();
  const contactHref = contactUrl();
  const packs = catalog.ok ? catalog.packs : [];
  const featured = featuredPack(packs);
  const summaries = packs.map(toSummary);

  return (
    <>
      {CRITICAL_FONTS.map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
      ))}
      <SiteHeader packs={summaries} contactHref={contactHref} />
      <main>
        {featured ? <Hero pack={featured} /> : <CatalogUnavailable contactHref={contactHref} empty={catalog.ok} />}
        <GuaranteesBand />
        {packs.length > 0 ? <Collection packs={packs} /> : null}
        <HowItWorks className="py-section" />
        <ReviewsSection reviews={getReviews()} className="pb-section" />
        <FinalCta />
      </main>
      <SiteFooter packs={summaries} contactHref={contactHref} socials={socialLinks()} />
    </>
  );
}

function Hero({ pack }: { pack: Pack }) {
  return (
    <section aria-labelledby="hero-t" className="overflow-hidden pt-6 pb-10 lg:pt-12 lg:pb-20">
      <div className={cx(container, "grid gap-6 lg:grid-cols-12 lg:grid-rows-[1fr_auto] lg:gap-x-8 lg:gap-y-8")}>
        <h1 id="hero-t" className="text-display-2xl uppercase lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:self-end">
          Booste ta routine, sauve ton budget
        </h1>

        <div className="-mx-4 sm:mx-0 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
          <Link href={packHref(pack.slug)} className="group block rounded-lg no-underline lg:h-full" tabIndex={-1} aria-hidden="true">
            <PackVisual
              image={pack.cover}
              name={pack.name}
              // object-cover renders the photo wider than its frame (tall crop on desktop): ask for that width.
              sizes="(min-width: 1024px) 1080px, 112vw"
              eager
              quality={85}
              frameRatio={[16 / 10, 0.82]}
              className="aspect-16/10 sm:rounded-lg lg:aspect-auto lg:h-full lg:min-h-130"
              imageClassName="transition-transform duration-700 ease-sc group-hover:scale-102 motion-reduce:transition-none"
            />
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-1 lg:row-start-2">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-eyebrow text-orange-ink">
              <Icon name="star" size={16} />
              {pack.badge ?? "Pack phare"} · {pack.name}
            </p>
            <p className="max-w-measure text-lead text-ink-muted">{pack.tagline}</p>
          </div>
          <PriceTag price={pack.priceTnd} />
          <div className="flex flex-col gap-3">
            <Button variant="primary" size="xl" block href={packHref(pack.slug)} iconRight="arrowRight" className="lg:max-w-100">
              Découvrir le {pack.shortName}
            </Button>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <Icon name="shield" size={16} />
              Pas de carte · Tu paies en espèces à la réception
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Collection({ packs }: { packs: Pack[] }) {
  return (
    <section id="packs" aria-labelledby="packs-t" className="scroll-mt-20 pt-section">
      <div className={cx(container, "flex flex-col gap-8 lg:gap-12")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="packs-t"
            eyebrow={`${packs.length} pack${packs.length > 1 ? "s" : ""}, un prix tout compris`}
            title="Choisis ta routine"
            intro="Chaque pack règle un vrai problème du quotidien : le café hors de prix, le dos en vrac, la chambre sans cuisine."
          />
        </div>
        <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {packs.map((p) => (
            <li key={p.slug} className="flex">
              <PackCard pack={p} className="w-full" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-orange text-on-orange">
      <div className={cx(container, "flex flex-col gap-6 py-12 lg:py-16 xl:flex-row xl:items-center xl:justify-between")}>
        {/* One promise per line (no orphan word next to the button). */}
        <p className="min-w-0 text-display-xl uppercase text-balance">
          <span className="block xl:whitespace-nowrap">Livré chez toi.</span>
          <span className="block xl:whitespace-nowrap">Payé à la porte.</span>
        </p>
        <div className="w-full sm:w-auto sm:min-w-80 sm:flex-none sm:self-start xl:min-w-0 xl:self-auto">
          <Button variant="dark" size="xl" block href="/#packs" iconRight="arrowRight">
            Voir les packs
          </Button>
        </div>
      </div>
    </section>
  );
}

function CatalogUnavailable({ contactHref, empty }: { contactHref: string; empty: boolean }) {
  const external = contactHref.startsWith("http");
  return (
    <section aria-labelledby="hero-t" className="py-section">
      <div className={cx(container, "flex flex-col gap-6")}>
        <h1 id="hero-t" className="text-display-2xl uppercase text-balance lg:max-w-[15ch]">
          Booste ta routine, sauve ton budget
        </h1>
        <div role="status" className="flex max-w-measure flex-col gap-3 rounded-lg bg-surface-raised p-5 shadow-card lg:p-6">
          <p className="flex items-center gap-2 text-heading">
            <Icon name={empty ? "package" : "alert"} size={22} className={empty ? "text-orange-ink" : "text-warning"} />
            {empty ? "Les packs arrivent bientôt" : "Catalogue indisponible"}
          </p>
          <p className="text-body text-ink-muted">
            {empty
              ? "On prépare les prochains packs. Écris-nous sur WhatsApp pour être prévenu."
              : "On n'arrive pas à charger les packs pour le moment. Réessaie dans un instant ou écris-nous sur WhatsApp."}
          </p>
          <div className="flex flex-wrap gap-3">
            {empty ? null : (
              <Button variant="dark" size="md" icon="refresh" href="/">
                Réessayer
              </Button>
            )}
            <Button variant="ghost" size="md" icon="whatsapp" href={contactHref} target={external ? "_blank" : undefined}>
              Nous écrire
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
