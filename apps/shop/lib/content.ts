import reviewsFile from "@/data/reviews.json";
import type { ReviewCardProps } from "@/components/ui/ReviewCard";

export interface ReviewsData {
  placeholder: boolean;
  reviews: ReviewCardProps[];
}

const data = reviewsFile as ReviewsData;

/**
 * Reviews of the landing. Placeholder reviews (mockup texts) are shown in development only:
 * no fake reviews in production (CLAUDE.md).
 */
export function getReviews(): ReviewCardProps[] {
  if (data.placeholder && process.env.NODE_ENV === "production") return [];
  return data.reviews.map((r) => ({ ...r, verified: r.verified === true }));
}

export const reviewsArePlaceholder = data.placeholder;

/** UGC story video (env, [À DÉFINIR] until the real clip exists). */
export function storyVideo() {
  return {
    src: process.env.NEXT_PUBLIC_STORY_VIDEO_SRC || undefined,
    poster: process.env.NEXT_PUBLIC_STORY_VIDEO_POSTER || undefined,
    author: "Sarra K",
    handle: "@sarra.shift",
    caption: "Pourquoi j'ai arrêté de jeter 120 DT/mois",
  };
}

/** Optional social links of the desktop footer (hidden while unset). */
export function socialLinks(): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = [];
  if (process.env.NEXT_PUBLIC_INSTAGRAM_URL) out.push({ label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL });
  if (process.env.NEXT_PUBLIC_TIKTOK_URL) out.push({ label: "TikTok", href: process.env.NEXT_PUBLIC_TIKTOK_URL });
  return out;
}
