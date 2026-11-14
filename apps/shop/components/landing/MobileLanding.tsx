import Link from "next/link";
import { CheckoutCta } from "@/components/checkout/CheckoutContext";
import { Icon } from "@/components/ui/Icon";
import { IncludedList } from "@/components/ui/IncludedList";
import { ProductCard } from "@/components/ui/ProductCard";
import { ReviewCard, type ReviewCardProps } from "@/components/ui/ReviewCard";
import { SavingsCalculator } from "@/components/ui/SavingsCalculator";
import { StoryVideo } from "@/components/ui/StoryVideo";
import { Wordmark } from "@/components/ui/Wordmark";
import { PRODUCT } from "@/lib/product";
import { SAVINGS_DEFAULTS } from "@/lib/savings";
import { SiteHeader } from "./SiteHeader";

export interface LandingContent {
  reviews: ReviewCardProps[];
  video: { src?: string; poster?: string; author: string; handle: string; caption: string };
  contactHref: string;
}

const section = "border-t border-line px-4 py-6 scroll-mt-14";
const h2 = "m-0 flex items-center gap-2 text-heading";

export const STEPS = [
  { title: "Commande en 30 secondes", text: "Nom, téléphone, gouvernorat. Pas de compte, pas de carte." },
  { title: "Confirme sur WhatsApp", text: "Tu reçois un message : réponds OUI et on lance la livraison." },
  { title: "Paie à la livraison", text: "En espèces, au livreur, sous 24 à 48 h partout en Tunisie." },
];

/** Landing mobile (Main.dc.html, SPEC A1) — section order is fixed. Hidden from 1024px. */
export function MobileLanding({ reviews, video, contactHref }: LandingContent) {
  const contactExternal = contactHref.startsWith("http");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-120 flex-col bg-surface lg:hidden">
      <SiteHeader count={1} contactHref={contactHref} showReviews={reviews.length > 0} />

      <main className="flex flex-col">
        {/* Hero + offer: the StickyCta appears once this whole zone (down to the ProductCard CTA) has left the screen. */}
        <div data-sticky-anchor="">
        {/* 2. Hero */}
        <section className="flex flex-col px-4 pt-6 pb-4">
          <p className="m-0 mb-3 flex items-center gap-1.5 text-label uppercase text-orange-ink">
            <Icon name="zap" size={14} />
            Pour les étudiants qui bossent dur
          </p>
          <h1 className="m-0 mb-5 text-display-xl uppercase">
            Booste ta routine, <span className="text-orange-ink">sauve ton budget</span>
          </h1>
          <StoryVideo {...video} />
        </section>

        {/* 3. Offer */}
        <section id="m-pack" className={section}>
          <ProductCard name={PRODUCT.name} pitch={PRODUCT.pitch} price={PRODUCT.priceTnd} />
        </section>
        </div>

        {/* 4. Savings */}
        <section id="m-economies" className={`${section} flex flex-col gap-4`}>
          <h2 className={h2}>
            <Icon name="banknote" size={22} />
            Calcule tes économies
          </h2>
          <SavingsCalculator defaultValue={SAVINGS_DEFAULTS.defaultValue} packPrice={PRODUCT.priceTnd} />
        </section>

        {/* 5. Content */}
        <section className={`${section} flex flex-col gap-4`}>
          <h2 className={h2}>
            <Icon name="package" size={22} />
            Qu&apos;y a-t-il dans ton pack ?
          </h2>
          <IncludedList />
        </section>

        {/* 6. How it works */}
        <section className={`${section} flex flex-col gap-4`}>
          <h2 className={h2}>Comment ça marche</h2>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-start gap-3">
                <span
                  className={`grid size-8 flex-none place-items-center rounded-pill text-sm font-extrabold ${
                    i === 2 ? "bg-orange text-on-orange" : "bg-ink text-ink-inverse"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="m-0 text-title">{s.title}</p>
                  <p className="m-0 text-sm leading-5 text-ink-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 7. Reviews (real reviews only; placeholders are hidden in production) */}
        {reviews.length > 0 ? (
          <section id="m-avis" className={`${section} flex flex-col gap-3`}>
            <h2 className={`${h2} mb-1`}>Ils ont choisi de changer</h2>
            {reviews.map((r) => (
              <ReviewCard key={`${r.name}-${r.city}`} {...r} />
            ))}
          </section>
        ) : null}

        {/* 8. Final CTA */}
        <section className="flex flex-col gap-4 border-t border-line px-4 pt-6 pb-8">
          <p className="m-0 text-center text-display-lg">{PRODUCT.priceTnd} TND, livré chez toi.</p>
          <CheckoutCta variant="primary" size="xl" block iconRight="zap">
            Obtenir mon pack
          </CheckoutCta>
          <p className="m-0 flex items-center justify-center gap-2 text-sm leading-5 font-semibold text-ink-muted">
            <Icon name="shield" size={16} />
            Paiement en espèces à la livraison
          </p>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className="mt-auto flex flex-col gap-4 bg-ink px-4 pt-8 pb-28 text-ink-inverse">
        <div className="flex items-center gap-3">
          <span className="grid size-12 flex-none place-items-center rounded-pill bg-surface-raised">
            <Wordmark src="mark" height={34} decorative />
          </span>
          <span className="font-display text-lg font-extrabold tracking-[0.1em]">SHIFT CART</span>
        </div>
        <nav aria-label="Liens utiles" className="flex flex-wrap gap-x-5 text-sm font-semibold">
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
            Nous contacter sur WhatsApp
          </a>
        </nav>
        <p className="m-0 text-xs leading-4 opacity-70">© 2026 SHIFT CART · Paiement à la livraison partout en Tunisie</p>
      </footer>
    </div>
  );
}
