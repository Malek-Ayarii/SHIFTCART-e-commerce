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
import { formatAmount } from "@/lib/format";
import { contactUrl } from "@/lib/whatsapp";

/** Inline CSS custom property for staggered entrances (`enter` utility). */
const delay = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

/**
 * `/` — catalogue home (docs/SPEC-V2.md › Boutique). Static + revalidated every 60 s through the
 * cached catalogue read; client islands: the header menu and the « Comment ça marche » stepper.
 */
export default async function Home() {
  const catalog = await getCatalog();
  const contactHref = contactUrl();
  const packs = catalog.ok ? catalog.packs : [];
  const featured = featuredPack(packs);
  const summaries = packs.map(toSummary);
  const example = featured ? { name: featured.name.replace(/^(le|la|les)\s+/i, ""), price: featured.priceTnd } : undefined;

  return (
    <>
      <SiteHeader packs={summaries} contactHref={contactHref} />
      <main>
        {featured ? <Hero pack={featured} /> : <CatalogUnavailable contactHref={contactHref} empty={catalog.ok} />}
        <GuaranteesBand />
        {packs.length > 0 ? <Collection packs={packs} /> : null}
        <HowItWorks className="py-section" example={example} />
        <ReviewsSection reviews={getReviews()} className="pb-section" />
        <FinalCta />
      </main>
      <SiteFooter packs={summaries} contactHref={contactHref} socials={socialLinks()} />
    </>
  );
}

function Hero({ pack }: { pack: Pack }) {
  return (
    <section aria-labelledby="hero-t" className="relative overflow-hidden pt-6 pb-12 lg:pt-14 lg:pb-24">
      {/* Soft brand glow behind the hero (decorative). */}
      <span className="pointer-events-none absolute -top-40 -right-40 size-144 rounded-pill bg-orange/10 blur-3xl" aria-hidden="true" />
      <div className={cx(container, "relative grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-x-12")}>
        <div className="flex flex-col gap-6 lg:col-span-6 lg:gap-7">
          <p className="inline-flex items-center gap-2 self-start rounded-pill bg-surface-raised py-1 pr-3.5 pl-1 text-sm font-semibold text-ink shadow-card ring-inset-line enter">
            <span className="inline-flex h-7 items-center gap-1 rounded-pill bg-orange px-2.5 text-xs font-bold text-on-orange">
              <Icon name="star" size={12} />
              {pack.badge ?? "Pack phare"}
            </span>
            {pack.name}
          </p>
          <h1 id="hero-t" className="text-display-2xl text-balance enter" style={delay(80)}>
            Booste ta routine, <span className="text-orange-ink">sauve ton budget.</span>
          </h1>
          <p className="max-w-measure text-lead text-ink-muted enter" style={delay(160)}>
            {pack.tagline}
          </p>
          <div className="enter" style={delay(240)}>
            <PriceTag price={pack.priceTnd} />
          </div>
          <div className="flex flex-col gap-4 enter" style={delay(320)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="primary" size="xl" href={packHref(pack.slug)} iconRight="arrowRight" className="w-full sm:w-auto sm:min-w-80">
                Découvrir le {pack.shortName}
              </Button>
              <Button variant="ghost" size="md" href="/#packs" className="h-15 w-full sm:w-auto">
                Voir tous les packs
              </Button>
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm font-medium text-ink-muted">
              <li className="inline-flex items-center gap-1.5">
                <Icon name="shield" size={16} className="text-success" />
                Pas de carte bancaire
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="whatsapp" size={16} className="text-success" />
                Confirmé sur WhatsApp
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={16} className="text-success" />
                24–48 h partout
              </li>
            </ul>
          </div>
        </div>

        <div className="relative -mx-4 enter sm:mx-0 lg:col-span-6" style={delay(120)}>
          <Link href={packHref(pack.slug)} className="group block overflow-hidden no-underline sm:rounded-lg sm:shadow-hover" tabIndex={-1} aria-hidden="true">
            <PackVisual
              image={pack.cover}
              name={pack.name}
              // object-cover renders the photo wider than its frame (tall crop on desktop): ask for that width.
              sizes="(min-width: 1024px) 720px, 112vw"
              eager
              quality={85}
              frameRatio={[4 / 3, 1]}
              className="aspect-4/3 lg:aspect-square"
              imageClassName="transition-transform duration-700 ease-sc group-hover:scale-104 motion-reduce:transition-none"
            />
          </Link>
          {/* Floating proof chips (decorative: the same facts are in text on the left). */}
          <div
            className="pointer-events-none absolute bottom-4 left-4 hidden animate-float items-center gap-3 rounded-md bg-surface-raised/95 p-3 pr-4 shadow-lift backdrop-blur-sm sm:flex lg:bottom-10 lg:-left-6"
            aria-hidden="true"
          >
            <span className="grid size-10 place-items-center rounded-sm bg-success-soft text-success">
              <Icon name="banknote" size={20} />
            </span>
            <span className="flex flex-col">
              <span className="text-sm leading-5 font-bold">{formatAmount(pack.priceTnd)} TND à la livraison</span>
              <span className="text-xs leading-4 text-ink-muted">Rien à payer avant</span>
            </span>
          </div>
          <div
            className="pointer-events-none absolute top-4 right-4 hidden animate-float items-center gap-2 rounded-pill bg-surface-raised/95 py-2 pr-4 pl-2 shadow-lift backdrop-blur-sm [animation-delay:1.2s] sm:flex lg:top-10 lg:-right-4"
            aria-hidden="true"
          >
            <span className="grid size-8 place-items-center rounded-pill bg-whatsapp text-on-whatsapp">
              <Icon name="whatsapp" size={16} />
            </span>
            <span className="text-sm font-semibold">Réponds OUI, c&apos;est parti</span>
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
        <SectionHeading
          id="packs-t"
          eyebrow={`${packs.length} pack${packs.length > 1 ? "s" : ""}, un prix tout compris`}
          title="Choisis ta routine"
          intro="Chaque pack règle un vrai problème du quotidien : le café hors de prix, le dos en vrac, la chambre sans cuisine."
          className="reveal"
        />
        <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
          {packs.map((p, i) => (
            <li key={p.slug} className="flex enter" style={delay(i * 90)}>
              <PackCard pack={p} className="reveal w-full" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-orange text-on-orange">
      <span className="pointer-events-none absolute inset-0 story-stripes opacity-25 mix-blend-multiply" aria-hidden="true" />
      <div className={cx(container, "relative flex flex-col gap-8 py-14 lg:py-20 xl:flex-row xl:items-center xl:justify-between")}>
        <div className="reveal flex flex-col gap-3">
          <p className="m-0 text-display-xl text-balance">
            <span className="block">Livré chez toi.</span>
            <span className="block">Payé à la porte.</span>
          </p>
          <p className="m-0 max-w-measure text-lead font-medium opacity-80">Pas de carte, pas de compte : tu commandes en 30 secondes, tu paies en espèces au livreur.</p>
        </div>
        <div className="reveal w-full sm:w-auto sm:min-w-80 sm:flex-none sm:self-start xl:min-w-0 xl:self-auto">
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
        <h1 id="hero-t" className="text-display-2xl text-balance lg:max-w-[15ch]">
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
            <Button variant="whatsapp" size="md" icon="whatsapp" href={contactHref} target={external ? "_blank" : undefined}>
              Nous écrire
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
