import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevGallery } from "./DevGallery";

export const metadata: Metadata = {
  title: "Composants (dev)",
  robots: { index: false, follow: false },
};

/** Component gallery — development only. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevGallery />;
}
