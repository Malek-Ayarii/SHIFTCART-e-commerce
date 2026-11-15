import type { Metadata, Viewport } from "next";
import { SourceCapture } from "@/components/analytics/SourceCapture";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Des packs routine pour bosser, réviser et vivre mieux : Pack Barista, Espace Autonome et plus. Livraison partout en Tunisie, paiement à la livraison.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NEXO SHIFT · Packs routine livrés chez toi, payés à la livraison",
    template: "%s · NEXO SHIFT",
  },
  description,
  applicationName: "NEXO SHIFT",
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: "NEXO SHIFT",
    title: "Booste ta routine, sauve ton budget · NEXO SHIFT",
    description,
  },
  twitter: {
    card: "summary",
    title: "Booste ta routine, sauve ton budget · NEXO SHIFT",
    description,
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
      <head>
        {/* One variable font file for the whole shop (app/globals.css). */}
        <link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">
        <SourceCapture />
        {children}
      </body>
    </html>
  );
}
