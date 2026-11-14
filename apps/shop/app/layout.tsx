import type { Metadata, Viewport } from "next";
import { SourceCapture } from "@/components/analytics/SourceCapture";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Des packs routine pour bosser, réviser et vivre mieux : Pack Barista, Espace Autonome et plus. Livraison gratuite partout en Tunisie, paiement à la livraison.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SHIFT CART · Packs routine livrés chez toi, payés à la livraison",
    template: "%s · SHIFT CART",
  },
  description,
  applicationName: "SHIFT CART",
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: "SHIFT CART",
    title: "Booste ta routine, sauve ton budget · SHIFT CART",
    description,
    images: [{ url: "/logos/shiftcart-logo.png", width: 1045, height: 688, alt: "SHIFT CART — E-SHOP & ROUTINE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Booste ta routine, sauve ton budget · SHIFT CART",
    description,
    images: ["/logos/shiftcart-logo.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F8F9FA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-theme="light">
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">
        <SourceCapture />
        {children}
      </body>
    </html>
  );
}
