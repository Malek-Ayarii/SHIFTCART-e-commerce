import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { contactUrl } from "@/lib/whatsapp";

/** /suivi without a reference: the tracking link (with its key) arrives on WhatsApp. */
export default function SuiviIndex() {
  const contactHref = contactUrl();
  const whatsapp = contactHref.startsWith("http");
  return (
    <>
      <section className="flex flex-col gap-3 px-4 pt-6 pb-4">
        <span className="grid size-12 place-items-center rounded-pill bg-info-soft text-info">
          <Icon name="truck" size={24} />
        </span>
        <h1 className="m-0 text-display-lg">Suivre ma commande</h1>
        <p className="m-0 text-body text-ink-muted">
          Ouvre le lien de suivi reçu dans ton message WhatsApp : il t&apos;amène directement à ta commande, sans compte ni mot de passe.
        </p>
      </section>
      <div className="mt-auto flex flex-col gap-3 p-4">
        <Button variant={whatsapp ? "whatsapp" : "ghost"} size="md" block icon="whatsapp" href={contactHref} target={whatsapp ? "_blank" : undefined}>
          Une question ? Écris-nous
        </Button>
      </div>
    </>
  );
}
