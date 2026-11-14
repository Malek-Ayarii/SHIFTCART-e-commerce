"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Network / server error while loading the tracking: say what to do + retry. */
export default function SuiviError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <section role="alert" className="flex flex-col gap-3 px-4 pt-6 pb-4">
        <span className="grid size-12 place-items-center rounded-pill bg-danger-soft text-danger">
          <Icon name="alert" size={24} />
        </span>
        <h1 className="m-0 text-display-lg">Le suivi ne se charge pas</h1>
        <p className="m-0 text-body text-ink-muted">Vérifie ta connexion, puis réessaie. Ta commande, elle, est bien enregistrée.</p>
      </section>
      <div className="mt-auto flex flex-col gap-3 p-4">
        <Button variant="dark" size="md" block icon="refresh" onClick={() => retry()}>
          Réessayer
        </Button>
      </div>
    </div>
  );
}
