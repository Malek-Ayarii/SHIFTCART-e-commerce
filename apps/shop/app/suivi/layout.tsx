import type { Metadata } from "next";
import { PageColumn } from "@/components/layout/PageColumn";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getCatalog } from "@/lib/catalog";
import { toSummary } from "@/lib/catalog-map";
import { contactUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
};

/** A7 shell: navbar (menu with the packs · logo · WhatsApp) above the tracking content. */
export default async function SuiviLayout({ children }: LayoutProps<"/suivi">) {
  const catalog = await getCatalog();
  const packs = catalog.ok ? catalog.packs.map(toSummary) : [];
  return (
    <PageColumn>
      <SiteHeader packs={packs} contactHref={contactUrl()} compact />
      <main className="flex flex-1 flex-col">{children}</main>
    </PageColumn>
  );
}
