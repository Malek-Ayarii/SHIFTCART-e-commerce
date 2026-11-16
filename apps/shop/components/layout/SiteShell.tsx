import type { ReactNode } from "react";
import { SiteFooter } from "@/components/catalog/Sections";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getCatalog } from "@/lib/catalog";
import { toSummary } from "@/lib/catalog-map";
import { socialLinks } from "@/lib/content";
import { contactUrl } from "@/lib/whatsapp";
import { LogoHeader } from "./PageColumn";

/**
 * Shell of the secondary client pages (/suivi, /merci, /livraison, 404).
 * Below 1024px: the mobile header (`nav` = menu · logo · WhatsApp, `logo` = centred wordmark only)
 * and no footer, as in the mobile mock-ups. From 1024px: the full shop header and footer.
 * The page lays out its own content (mobile column → desktop container).
 */
export async function SiteShell({ children, mobileHeader = "nav" }: { children: ReactNode; mobileHeader?: "nav" | "logo" }) {
  const catalog = await getCatalog();
  const packs = catalog.ok ? catalog.packs.map(toSummary) : [];
  const contactHref = contactUrl();
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {mobileHeader === "logo" ? <LogoHeader className="lg:hidden" /> : null}
      <SiteHeader packs={packs} contactHref={contactHref} desktopOnly={mobileHeader === "logo"} />
      <main className="flex flex-1 flex-col">{children}</main>
      <div className="hidden lg:block">
        <SiteFooter packs={packs} contactHref={contactHref} socials={socialLinks()} />
      </div>
    </div>
  );
}
