import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { cx } from "@/lib/cx";

/** Client views: 480px column on mobile, 560px centred column from 1024px (SPEC B2). */
export function PageColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto flex min-h-dvh w-full max-w-120 flex-col bg-surface lg:max-w-140", className)}>{children}</div>;
}

/** Header with the centred wordmark (Confirmation.dc.html). */
export function LogoHeader() {
  return (
    <header className="flex h-14 flex-none items-center justify-center border-b border-line">
      <Link href="/" aria-label="NEXO SHIFT, accueil" className="inline-flex min-h-11 items-center rounded-sm">
        <Wordmark src="wordmark" height={26} decorative priority />
      </Link>
    </header>
  );
}
