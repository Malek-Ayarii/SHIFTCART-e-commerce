/**
 * Tracking pages (/suivi, /suivi/[ref]): a 480px column on mobile; from 1024px a 12-column grid
 * in the shop container — content on the left (7), a sticky aside on the right (5).
 * DOM order is the mobile reading order, so the grid never reorders focus.
 */
export const trackingGrid =
  "mx-auto flex w-full max-w-120 flex-1 flex-col gap-4 px-4 pt-5 pb-6 " +
  "lg:grid lg:max-w-container lg:grid-cols-12 lg:items-start lg:gap-8 lg:px-8 lg:pt-12 lg:pb-section";

export const trackingMain = "flex flex-col gap-4 lg:col-span-7 lg:gap-6";

/** flex-1 on mobile lets the help card sit at the bottom of the screen (mt-auto). */
export const trackingAside = "flex flex-1 flex-col gap-4 lg:sticky lg:top-24 lg:col-span-5 lg:flex-none";
