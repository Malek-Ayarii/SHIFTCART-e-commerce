import type { Metadata } from "next";
import { LogoHeader, PageColumn } from "@/components/layout/PageColumn";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { shopWhatsAppNumber, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Livraison & retours",
  description: "Livraison gratuite partout en Tunisie sous 24 à 48 h, paiement en espèces à la livraison.",
};

const BLOCKS: Array<{ icon: IconName; title: string; lines: string[] }> = [
  {
    icon: "truck",
    title: "Livraison",
    lines: [
      "Gratuite, partout en Tunisie (les 24 gouvernorats).",
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
    <PageColumn>
      <LogoHeader />
      <main className="flex flex-1 flex-col gap-5 px-4 pt-6 pb-8">
        <h1 className="m-0 text-display-lg">Livraison &amp; retours</h1>
        {BLOCKS.map((b) => (
          <section key={b.title} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-5 shadow-card">
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
        <section id="contact" className="flex scroll-mt-4 flex-col gap-3 rounded-lg bg-surface-raised p-5 shadow-card">
          <h2 className="m-0 flex items-center gap-2 text-heading">
            <span className="text-orange-ink">
              <Icon name="whatsapp" size={22} />
            </span>
            Une question ?
          </h2>
          {number ? (
            <Button variant="whatsapp" size="md" block icon="whatsapp" href={waLink(number)} target="_blank">
              Écris-nous sur WhatsApp
            </Button>
          ) : (
            <p className="m-0 text-body">Numéro WhatsApp de la boutique : [À DÉFINIR]</p>
          )}
        </section>
        <Button variant="ghost" size="md" block href="/">
          Revenir à la boutique
        </Button>
      </main>
    </PageColumn>
  );
}
