/** Skeleton at the final dimensions of the tracking page (no full-screen spinner). */
export default function SuiviLoading() {
  const bar = "animate-pulse rounded-sm bg-surface-sunken";
  return (
    <div aria-busy="true" aria-label="Chargement du suivi" className="flex flex-1 flex-col">
      <div className="flex flex-col gap-2 px-4 pt-6 pb-4">
        <span className={`h-4 w-36 ${bar}`} />
        <span className={`h-7.5 w-64 ${bar}`} />
        <span className={`h-6 w-48 ${bar}`} />
      </div>
      <div className="mx-4 flex flex-col gap-4 rounded-lg bg-surface-raised px-4 py-5 shadow-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <span className="size-7 flex-none animate-pulse rounded-pill bg-surface-sunken" />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className={`h-5 w-3/5 ${bar}`} />
              <span className={`h-3.5 w-2/5 ${bar}`} />
            </div>
          </div>
        ))}
      </div>
      <span className={`mx-4 mt-4 h-19 rounded-md ${bar}`} />
    </div>
  );
}
