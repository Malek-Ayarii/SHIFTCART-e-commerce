import { trackingAside, trackingGrid, trackingMain } from "@/components/tracking/layout";

/** Skeleton at the final dimensions of the tracking page (no full-screen spinner). */
export default function SuiviLoading() {
  const bar = "animate-pulse rounded-sm bg-surface-sunken";
  return (
    <div aria-busy="true" aria-label="Chargement du suivi" className={trackingGrid}>
      <div className={trackingMain}>
        <div className="flex flex-col gap-3 rounded-lg bg-ink p-5 lg:p-8">
          <span className="h-4 w-36 animate-pulse rounded-sm bg-ink-inverse/15" />
          <span className="h-8 w-64 animate-pulse rounded-sm bg-ink-inverse/15" />
          <span className="h-4 w-48 animate-pulse rounded-sm bg-ink-inverse/15" />
          <span className="h-2 w-full animate-pulse rounded-pill bg-ink-inverse/15" />
        </div>
        <span className={`h-22 rounded-lg ${bar}`} />
        <div className="flex flex-col gap-5 rounded-lg bg-surface-raised p-5 shadow-card">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <span className="size-10 flex-none animate-pulse rounded-pill bg-surface-sunken" />
              <div className="flex flex-1 flex-col justify-center gap-1.5">
                <span className={`h-5 w-3/5 ${bar}`} />
                <span className={`h-3.5 w-2/5 ${bar}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={trackingAside}>
        <span className={`h-20 rounded-lg ${bar}`} />
      </div>
    </div>
  );
}
