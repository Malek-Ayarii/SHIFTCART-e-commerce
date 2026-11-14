import Link from "next/link";
import { CheckoutCta } from "@/components/checkout/CheckoutContext";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IncludedList } from "@/components/ui/IncludedList";
import { PriceTag } from "@/components/ui/PriceTag";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { SavingsCalculator } from "@/components/ui/SavingsCalculator";
import { StoryVideo } from "@/components/ui/StoryVideo";
import { Wordmark } from "@/components/ui/Wordmark";
import { PRODUCT } from "@/lib/product";
import { SAVINGS_DEFAULTS } from "@/lib/savings";
import type { LandingContent } from "./MobileLanding";

const container = "mx-auto max-w-300 px-8";
const navLink = "inline-flex min-h-11 items-center text-body-md font-bold text-ink no-underline hover:text-orange-ink";
const h2 = "m-0 text-display-md";

const GUARANTEES: Array<{ icon: IconName; label: string }> = [
  { icon: "truck", label: "Livraison gratuite partout en Tunisie" },
  { icon: "banknote", label: "Paiement en espèces à la livraison" },
  { icon: "whatsapp", label: "Confirmation en un message WhatsApp" },
  { icon: "clock", label: "Chez toi en 24 à 48 h" },
];

const STEPS = [
  { n: "01", title: "Commande en 30 secondes", text: "Nom, téléphone, gouvernorat. Pas de compte, pas de carte bancaire." },
  { n: "02", title: "Confirme sur WhatsApp", text: "Un message arrive sur ton téléphone : réponds OUI, on prépare ton colis." },
  { n: "03", title: "Paie à la livraison", text: `${PRODUCT.priceTnd} TND en espèces au livreur. Rien à payer avant.` },
];

export interface DesktopLandingProps extends LandingContent {
  socials: Array<{ label: string; href: string }>;
}

/** Landing desktop ≥ 1024px (WebLanding.dc.html, SPEC B1). */
export function DesktopLanding({ reviews, video, contactHref, socials }: DesktopLandingProps) {
  const contactExternal = contactHref.startsWith("http");
  const floating = reviews[0];
  return (
    <div className="hidden bg-surface text-ink lg:block">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className={`${container} flex flex-wrap items-center gap-8 py-3.5`}>
          <Link href="/" aria-label="SHIFT CART, accueil" className="flex min-h-11 items-center gap-2.5 rounded-sm no-underline">
            <Wordmark src="mark" height={40} decorative priority />
            <Wordmark src="wordmark" height={20} decorative priority />
          </Link>
          <nav aria-label="Menu principal" className="flex flex-wrap gap-6">
            <a href="#pack" className={navLink}>
              Le pack
            </a>
            <a href="#economies" className={navLink}>
              Économies
            </a>
            {reviews.length > 0 ? (
              <a href="#avis" className={navLink}>
                Avis
              </a>
            ) : null}
            <Link href="/suivi" className={navLink}>
              Suivre ma commande
            </Link>
          </nav>
          <div className="ml-auto">
            <CheckoutCta variant="primary" size="md" iconRight="zap">
              Obtenir mon pack · {PRODUCT.priceTnd} TND
            </CheckoutCta>
          </div>
        </div>
      </header>

      <main>
        <section className={`${container} flex flex-wrap items-center gap-12 pt-14 pb-16`}>
          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
            <p className="m-0 flex items-center gap-1.5 text-label uppercase text-orange-ink">
              <Icon name="zap" size={14} />
              Pour les étudiants et jeunes actifs qui bossent dur
            </p>
            <h1 className="m-0 text-display-2xl uppercase">
              Booste ta routine, <span className="text-orange-ink">sauve ton budget</span>
            </h1>
            <p className="m-0 max-w-130 text-lead text-ink-muted">
              Le Pack Barista : une cafetière Moka, un thermos LED et du café tunisien offert. Le coffee shop chez toi, pour le prix de 3
              semaines de buvette.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <PriceTag price={PRODUCT.priceTnd} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-85 max-w-full">
                <CheckoutCta variant="primary" size="xl" block iconRight="zap">
                  Obtenir mon pack
                </CheckoutCta>
              </div>
              <span className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <Icon name="shield" size={16} />
                Pas de carte · tu paies au livreur
              </span>
            </div>
          </div>
          <div className="relative max-w-100 flex-[1_1_340px]">
            <StoryVideo {...video} />
            {floating ? (
              <div className="absolute bottom-24 -left-12 w-65">
                <ReviewCard {...floating} className="shadow-lift" />
              </div>
            ) : null}
          </div>
        </section>

        <section className="bg-ink text-ink-inverse">
          <ul className={`${container} m-0 flex list-none flex-wrap justify-between gap-x-12 gap-y-4 py-5 text-body-md font-bold`}>
            {GUARANTEES.map((g) => (
              <li key={g.label} className="flex items-center gap-2.5">
                <span className="text-orange">
                  <Icon name={g.icon} size={22} />
                </span>
                {g.label}
              </li>
            ))}
          </ul>
        </section>

        <section id="economies" className={`${container} flex scroll-mt-20 flex-wrap items-start gap-12 py-18`}>
          <div id="pack" className="flex min-w-0 flex-[1_1_420px] scroll-mt-20 flex-col gap-5">
            <h2 className={h2}>Qu&apos;y a-t-il dans ton pack ?</h2>
            <IncludedList />
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
            <h2 className={h2}>Calcule tes économies</h2>
            <SavingsCalculator defaultValue={SAVINGS_DEFAULTS.defaultValue} packPrice={PRODUCT.priceTnd} />
          </div>
        </section>

        <section className="border-t border-line">
          <div className={`${container} flex flex-col gap-8 py-18`}>
            <h2 className={h2}>Comment ça marche</h2>
            <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 p-0">
              {STEPS.map((s, i) => {
                const dark = i === 2;
                return (
                  <li key={s.n} className={`flex flex-col gap-3 rounded-lg p-6 ${dark ? "bg-ink text-ink-inverse" : "bg-surface-raised shadow-card"}`}>
                    <span className={`text-step-num ${dark ? "text-orange" : "text-orange-ink"}`}>{s.n}</span>
                    <p className="m-0 text-xl leading-6.5 font-extrabold">{s.title}</p>
                    <p className={`m-0 text-body-md ${dark ? "opacity-80" : "text-ink-muted"}`}>{s.text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {reviews.length > 0 ? (
          <section id="avis" className="scroll-mt-20 border-t border-line">
            <div className={`${container} flex flex-col gap-8 py-18`}>
              <h2 className={h2}>Ils ont choisi de changer</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                {reviews.map((r) => (
                  <ReviewCard key={`${r.name}-${r.city}`} {...r} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-orange text-on-orange">
          <div className={`${container} flex flex-wrap items-center justify-between gap-6 py-14`}>
            <p className="m-0 max-w-160 text-display-band uppercase">{PRODUCT.priceTnd} TND, livré chez toi. Payé à la porte.</p>
            <div className="w-85 max-w-full">
              <CheckoutCta variant="dark" size="xl" block iconRight="zap">
                Obtenir mon pack
              </CheckoutCta>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-ink-inverse">
        <div className={`${container} flex flex-wrap items-center justify-between gap-6 py-10`}>
          <div className="flex items-center gap-3">
            <span className="grid size-13 place-items-center rounded-pill bg-surface-raised">
              <Wordmark src="mark" height={38} decorative />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-extrabold tracking-[0.1em]">SHIFT CART</span>
              <span className="text-xs font-bold tracking-[0.12em] opacity-70">E-SHOP &amp; ROUTINE</span>
            </div>
          </div>
          <nav aria-label="Liens utiles" className="flex flex-wrap gap-x-6 text-sm font-semibold">
            <Link href="/suivi" className="inline-flex min-h-11 items-center text-ink-inverse underline">
              Suivre ma commande
            </Link>
            <Link href="/livraison" className="inline-flex min-h-11 items-center text-ink-inverse underline">
              Livraison &amp; retours
            </Link>
            <a
              href={contactHref}
              className="inline-flex min-h-11 items-center text-ink-inverse underline"
              target={contactExternal ? "_blank" : undefined}
              rel={contactExternal ? "noopener noreferrer" : undefined}
            >
              Contact WhatsApp
            </a>
            {socials.map((s) => (
              <a key={s.label} href={s.href} className="inline-flex min-h-11 items-center text-ink-inverse underline" target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </nav>
          <p className="m-0 w-full text-xs opacity-70">© 2026 SHIFT CART · Tunisie</p>
        </div>
      </footer>
    </div>
  );
}
