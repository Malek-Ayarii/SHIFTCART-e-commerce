import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";

export const metadata: Metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
};

/** A7 shell: navbar (menu with the packs · logo · WhatsApp) on mobile, full shop header/footer on desktop. */
export default function SuiviLayout({ children }: LayoutProps<"/suivi">) {
  return <SiteShell>{children}</SiteShell>;
}
