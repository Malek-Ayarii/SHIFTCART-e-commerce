import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { cx } from "@/lib/cx";

/** Header with the centred wordmark (Confirmation.dc.html). */
export function LogoHeader({ className }: { className?: string }) {
  return (
    <header className={cx("flex h-14 flex-none items-center justify-center border-b border-line", className)}>
      <Link href="/" aria-label="NEXO SHIFT, accueil" className="inline-flex min-h-11 items-center rounded-sm">
        <Wordmark src="wordmark" height={26} decorative priority />
      </Link>
    </header>
  );
}
