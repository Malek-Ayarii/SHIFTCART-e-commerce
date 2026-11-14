import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Le Pack Barista à 89 TND : cafetière Moka, thermos LED et café tunisien offert. Livraison gratuite partout en Tunisie, paiement à la livraison.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SHIFT CART · Le Pack Barista, 89 TND livré chez toi",
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
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
