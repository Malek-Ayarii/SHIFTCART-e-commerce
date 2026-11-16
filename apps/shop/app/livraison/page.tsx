import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { shopWhatsAppNumber, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Livraison & retours",
  description: "Livraison partout en Tunisie sous 24 à 48 h, paiement en espèces à la livraison.",
};

const BLOCKS: Array<{ icon: IconName; title: string; lines: string[] }> = [
  {
    icon: "truck",
    title: "Livraison",
    lines: [
      "Partout en Tunisie (les 24 gouvernorats).",
      "Chez toi en 24 à 48 h après ta confirmation sur WhatsApp.",
      "Le livreur t'appelle avant de passer.",
      "Transporteur et zones particulières : [À DÉFINIR]",
    ],
  },
  {
    icon: "banknote",
    title: "Paiement",
    lines: [
      "En espèces, au livreur, à la réception du colis : le prix affiché sur la page du pack, livraison comprise.",
      "Pas de carte, pas de paiement en ligne, rien à payer avant.",
    ],
  },
  {
    icon: "undo",
    title: "Retours & échanges",
    lines: ["Conditions de retour, délai et frais : [À DÉFINIR]", "Produit abîmé à la livraison : [À DÉFINIR]"],
  },
];

/** Static help page. Business rules that are not decided yet stay [À DÉFINIR]. */
export default function LivraisonPage() {
  const number = shopWhatsAppNumber();
  return (
    <SiteShell mobileHeader="logo">
      <div className="mx-auto flex w-full max-w-120 flex-1 flex-col gap-5 px-4 pt-6 pb-8 lg:max-w-container lg:gap-8 lg:px-8 lg:pt-12 lg:pb-section">
        <h1 className="m-0 text-display-lg lg:text-display-xl">Livraison &amp; retours</h1>
        {/* One column on mobile; a 2 × 2 grid from 1024px (rows share their height). */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-6">
          {BLOCKS.map((b) => (
            <section key={b.title} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-5 shadow-card lg:p-6">
              <h2 className="m-0 flex items-center gap-2 text-heading">
                <span className="text-orange-ink">
                  <Icon name={b.icon} size={22} />
                </span>
                {b.title}
              </h2>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-body">
                {b.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </section>
          ))}
          <section id="contact" className="flex scroll-mt-4 flex-col gap-3 rounded-lg bg-surface-raised p-5 shadow-card lg:scroll-mt-24 lg:p-6">
            <h2 className="m-0 flex items-center gap-2 text-heading">
              <span className="text-orange-ink">
                <Icon name="whatsapp" size={22} />
              </span>
              Une question ?
            </h2>
            {number ? (
              <Button variant="whatsapp" size="md" block icon="whatsapp" href={waLink(number)} target="_blank" className="lg:mt-auto">
                Écris-nous sur WhatsApp
              </Button>
            ) : (
              <p className="m-0 text-body">Numéro WhatsApp de la boutique : [À DÉFINIR]</p>
            )}
          </section>
        </div>
        <div className="flex flex-col lg:max-w-90">
          <Button variant="ghost" size="md" block href="/">
            Revenir à la boutique
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
