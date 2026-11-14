import type { Metadata } from "next";
import { PageColumn } from "@/components/layout/PageColumn";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getReviews } from "@/lib/content";
import { contactUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
};

/** A7 shell: navbar (menu · logo · cart) above the tracking content. */
export default function SuiviLayout({ children }: LayoutProps<"/suivi">) {
  const showReviews = getReviews().length > 0;
  return (
    <PageColumn>
      <SiteHeader contactHref={contactUrl()} showReviews={showReviews} />
      <main className="flex flex-1 flex-col">{children}</main>
    </PageColumn>
  );
}
