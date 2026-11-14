import { LogoHeader, PageColumn } from "@/components/layout/PageColumn";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <PageColumn>
      <LogoHeader />
      <main className="flex flex-1 flex-col">
        <section className="flex flex-col gap-3 px-4 pt-8 pb-4">
          <span className="grid size-12 place-items-center rounded-pill bg-surface-sunken text-ink">
            <Icon name="package" size={24} />
          </span>
          <p className="m-0 text-label uppercase text-ink-muted">Erreur 404</p>
          <h1 className="m-0 text-display-lg">Cette page n&apos;existe pas</h1>
          <p className="m-0 text-body text-ink-muted">Le lien est peut-être incomplet. Ton pack, lui, t&apos;attend sur la page d&apos;accueil.</p>
        </section>
        <div className="mt-auto flex flex-col gap-3 p-4">
          <Button variant="dark" size="md" block href="/">
            Revenir à la boutique
          </Button>
        </div>
      </main>
    </PageColumn>
  );
}
