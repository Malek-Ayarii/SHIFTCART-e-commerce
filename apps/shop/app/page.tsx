import { CheckoutRoot } from "@/components/checkout/CheckoutRoot";
import { DesktopLanding } from "@/components/landing/DesktopLanding";
import { MobileLanding } from "@/components/landing/MobileLanding";
import { getReviews, socialLinks, storyVideo } from "@/lib/content";
import { contactUrl } from "@/lib/whatsapp";

/** Fonts preloaded on the landing only: Syne 800 + Jakarta 400/700 (docs/STACK.md › budget). */
const CRITICAL_FONTS = ["/fonts/Syne-800.woff2", "/fonts/PlusJakartaSans-400.woff2", "/fonts/PlusJakartaSans-700.woff2"];

/**
 * Landing (SPEC A1 mobile / B1 desktop). Fully static: the client islands are the
 * checkout dialog + sticky CTA (CheckoutRoot), the calculator, the video and the menu.
 */
export default function Home() {
  const content = { reviews: getReviews(), video: storyVideo(), contactHref: contactUrl() };
  return (
    <CheckoutRoot>
      {/* React hoists these <link> elements into <head>. */}
      {CRITICAL_FONTS.map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
      ))}
      <MobileLanding {...content} />
      <DesktopLanding {...content} socials={socialLinks()} />
    </CheckoutRoot>
  );
}
