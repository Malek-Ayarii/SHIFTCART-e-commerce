import { HelpCard } from "@/components/tracking/TrackingView";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { contactUrl } from "@/lib/whatsapp";

const HOW: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "whatsapp", title: "Ouvre WhatsApp", text: "Retrouve notre message de confirmation de commande." },
  { icon: "tap", title: "Touche le lien de suivi", text: "Il contient la clé de ta commande, rien à saisir." },
  { icon: "truck", title: "Suis ton colis", text: "Confirmation, expédition, livraison : tout est là, en direct." },
];

/** /suivi without a reference: the tracking link (with its key) arrives on WhatsApp. */
export default function SuiviIndex() {
  const contactHref = contactUrl();
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-lg bg-ink p-5 text-ink-inverse enter">
        <span className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-pill bg-orange/30 blur-3xl" aria-hidden="true" />
        <span className="relative grid size-12 place-items-center rounded-md bg-orange text-on-orange">
          <Icon name="packageCheck" size={24} />
        </span>
        <h1 className="relative m-0 text-display-lg">Suivre ma commande</h1>
        <p className="relative m-0 text-body opacity-80">
          Ton lien de suivi personnel est dans ton message WhatsApp : il t&apos;amène directement à ta commande, sans compte ni mot de passe.
        </p>
      </section>

      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {HOW.map((s, i) => (
          <li
            key={s.title}
            className="flex items-start gap-4 rounded-lg bg-surface-raised p-4 shadow-card ring-inset-line enter"
            style={{ ["--d" as string]: `${100 + i * 90}ms` }}
          >
            <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-sunken text-ink">
              <Icon name={s.icon} size={22} />
            </span>
            <span className="flex flex-col">
              <span className="text-step-num text-orange-ink uppercase">Étape {i + 1}</span>
              <span className="text-title">{s.title}</span>
              <span className="text-small text-ink-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-3">
        <HelpCard contactHref={contactHref} />
        <Button variant="ghost" size="md" block icon="home" href="/">
          Revenir à la boutique
        </Button>
      </div>
    </div>
  );
}
