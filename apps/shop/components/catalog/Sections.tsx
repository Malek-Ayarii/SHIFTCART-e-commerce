import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ReviewCard, type ReviewCardProps } from "@/components/ui/ReviewCard";
import { Wordmark } from "@/components/ui/Wordmark";
import { HowItWorksStepper } from "./HowItWorks";
import { packHref, type PackSummary } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { SHOP_PHONE_DISPLAY } from "@/lib/whatsapp";

/** Page gutter + max width shared by every v2 section. */
export const container = "mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8";

export function SectionHeading({ eyebrow, title, intro, id, className }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; id?: string; className?: string }) {
  return (
    <div className={cx("flex max-w-measure flex-col gap-3", className)}>
      {eyebrow ? <p className="text-eyebrow text-orange-ink">{eyebrow}</p> : null}
      <h2 id={id} className="text-display-section text-balance">
        {title}
      </h2>
      {intro ? <p className="text-lead text-ink-muted">{intro}</p> : null}
    </div>
  );
}

export const GUARANTEES: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "pin", title: "Livré partout", text: "Les 24 gouvernorats de Tunisie." },
  { icon: "banknote", title: "Paiement en espèces", text: "Tu paies au livreur, à la réception." },
  { icon: "clock", title: "24–48 h partout", text: "Le livreur t'appelle avant de passer." },
  { icon: "whatsapp", title: "Confirmation WhatsApp", text: "Un message, tu réponds OUI, c'est parti." },
];

/** Reassurance band (ink): delivery, cash, delay, WhatsApp. */
export function GuaranteesBand({ className }: { className?: string }) {
  return (
    <section aria-label="Nos garanties" className={cx("bg-ink text-ink-inverse", className)}>
      <ul className={cx(container, "m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 py-8 lg:grid-cols-4 lg:gap-8 lg:py-10")}>
        {GUARANTEES.map((g, i) => (
          <li key={g.title} className="group flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 enter" style={{ ["--d" as string]: `${i * 90}ms` }}>
            <span className="grid size-11 flex-none place-items-center rounded-md bg-ink-inverse/10 text-orange transition-transform duration-300 ease-sc group-hover:-translate-y-0.5 group-hover:scale-105 motion-reduce:transition-none">
              <Icon name={g.icon} size={22} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-title">{g.title}</span>
              <span className="text-small opacity-70">{g.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { STEPS } from "./HowItWorks";

/** The 3 steps: an interactive stepper with a live preview of each step. */
export function HowItWorks({ id = "comment-ca-marche", className, example }: { id?: string; className?: string; example?: { name: string; price: number } }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={cx("scroll-mt-20", className)}>
      <div className={cx(container, "flex flex-col gap-8 lg:gap-12")}>
        <SectionHeading
          id={`${id}-t`}
          eyebrow="3 étapes, zéro prise de tête"
          title="Comment ça marche"
          intro="Pas de compte, pas de panier, pas de carte : tu choisis ton pack, on te l'apporte."
          className="reveal"
        />
        <div className="reveal">
          <HowItWorksStepper example={example} />
        </div>
      </div>
    </section>
  );
}

/** Reviews (placeholders hidden in production: no fake reviews). */
export function ReviewsSection({ reviews, className }: { reviews: ReviewCardProps[]; className?: string }) {
  if (reviews.length === 0) return null;
  return (
    <section id="avis" aria-labelledby="avis-t" className={cx("scroll-mt-20", className)}>
      <div className={cx(container, "flex flex-col gap-8")}>
        <SectionHeading id="avis-t" title="Ils ont choisi de changer" className="reveal" />
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <ReviewCard key={`${r.name}-${r.city}`} {...r} className="reveal" />
          ))}
        </div>
      </div>
    </section>
  );
}

const footLink = "inline-flex min-h-11 items-center text-ink-inverse underline decoration-1 underline-offset-4 hover:text-orange";

export function SiteFooter({ packs, contactHref, socials = [] }: { packs: PackSummary[]; contactHref: string; socials?: Array<{ label: string; href: string }> }) {
  const external = contactHref.startsWith("http");
  return (
    <footer className="bg-ink pb-28 text-ink-inverse lg:pb-0">
      <div className={cx(container, "grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] lg:py-16")}>
        <div className="flex flex-col gap-4">
          <Wordmark src="wordmarkLight" height={34} className="self-start" />
          <p className="max-w-80 text-small opacity-75">Des packs routine pour bosser, réviser et vivre mieux, livrés partout en Tunisie. Tu paies à la livraison.</p>
          <a
            href={contactHref}
            className="inline-flex min-h-11 items-center gap-2 self-start font-bold text-ink-inverse no-underline hover:text-orange"
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            <Icon name="whatsapp" size={20} />
            WhatsApp {SHOP_PHONE_DISPLAY}
          </a>
        </div>
        {packs.length > 0 ? (
          <nav aria-label="Nos packs" className="flex flex-col">
            <p className="mb-1 text-eyebrow opacity-70">Nos packs</p>
            {packs.map((p) => (
              <Link key={p.slug} href={packHref(p.slug)} className={footLink}>
                {p.name}
              </Link>
            ))}
          </nav>
        ) : null}
        <nav aria-label="Liens utiles" className="flex flex-col">
          <p className="mb-1 text-eyebrow opacity-70">Aide</p>
          <Link href="/suivi" className={footLink}>
            Suivre ma commande
          </Link>
          <Link href="/livraison" className={footLink}>
            Livraison &amp; retours
          </Link>
          <a href={contactHref} className={footLink} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
            Nous contacter sur WhatsApp
          </a>
          {socials.map((s) => (
            <a key={s.label} href={s.href} className={footLink} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="border-t border-ink-inverse/15">
        <p className={cx(container, "py-5 text-xs opacity-70")}>© 2026 NEXO SHIFT · Paiement à la livraison partout en Tunisie</p>
      </div>
    </footer>
  );
}
