import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// next/navigation is not available outside the Next runtime.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// next/image → plain <img> in jsdom.
vi.mock("next/image", async () => {
  const React = await import("react");
  return {
    default: ({ priority, preload, fill, quality, placeholder, blurDataURL, ...props }: Record<string, unknown>) => {
      void [priority, preload, fill, quality, placeholder, blurDataURL];
      return React.createElement("img", props);
    },
  };
});
