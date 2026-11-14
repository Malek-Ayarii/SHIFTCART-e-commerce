import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { SavingsCalculator } from "@/components/ui/SavingsCalculator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StickyCta } from "@/components/ui/StickyCta";
import { StoryVideo } from "@/components/ui/StoryVideo";
import { __queuedEvents, __resetAnalytics, track } from "@/lib/analytics";

describe("SavingsCalculator", () => {
  it("shows the result, payback and the formula; updates with the slider", () => {
    const onChange = vi.fn();
    render(<SavingsCalculator packPrice={89} onChange={onChange} />);
    expect(screen.getByTestId("savings-amount")).toHaveTextContent("165 DT / mois");
    expect(screen.getByText(/Pack remboursé en 17 jours/)).toBeInTheDocument();
    expect(screen.getByText("Calcul : (dépense/jour − 0,5 DT de café maison) × 30 jours.")).toBeInTheDocument();
    const slider = screen.getByLabelText("Dépense café par jour, en dinars");
    expect(slider).toHaveAttribute("aria-valuetext", "6 dinars par jour");
    fireEvent.change(slider, { target: { value: "10" } });
    expect(screen.getByTestId("savings-amount")).toHaveTextContent("285 DT / mois");
    expect(onChange).toHaveBeenCalledWith(10, 285);
  });
});

describe("ReviewCard", () => {
  it("shows « Achat vérifié » only when verified", () => {
    const { rerender } = render(<ReviewCard name="Yasmine" city="Sousse" text="Top" />);
    expect(screen.queryByText("Achat vérifié")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "5 sur 5" })).toBeInTheDocument();
    rerender(<ReviewCard name="Yasmine" city="Sousse" text="Top" verified />);
    expect(screen.getByText("Achat vérifié")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("always word + icon", () => {
    const { container } = render(<StatusBadge status="shipped" />);
    expect(screen.getByText("Expédiée")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("StickyCta", () => {
  it("is inert and hidden from AT when not visible", () => {
    const { rerender } = render(<StickyCta visible={false} />);
    expect(screen.getByTestId("sticky-cta")).toHaveAttribute("aria-hidden", "true");
    rerender(<StickyCta visible />);
    expect(screen.getByTestId("sticky-cta")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByRole("button", { name: /Obtenir mon pack/ })).toBeInTheDocument();
  });
});

describe("StoryVideo", () => {
  it("placeholder without src; video uses preload=none", () => {
    const { rerender, container } = render(<StoryVideo author="Sarra K" />);
    expect(screen.getByText("Vidéo UGC · 9:16")).toBeInTheDocument();
    expect(screen.getByText("SK")).toBeInTheDocument();
    rerender(<StoryVideo src="/v.mp4" poster="/p.webp" />);
    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("preload", "none");
    expect(video.muted).toBe(true);
    expect(screen.getByRole("button", { name: "Lire la vidéo" })).toBeInTheDocument();
  });
});

describe("analytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    __resetAnalytics();
  });
  it("is a no-op without NEXT_PUBLIC_META_PIXEL_ID", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");
    track("ViewContent");
    expect(__queuedEvents()).toHaveLength(0);
    expect(document.querySelector('script[src*="fbevents"]')).toBeNull();
  });
  it("queues events and loads the pixel only after the first interaction", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123");
    track("ViewContent", { value: 89 });
    expect(__queuedEvents()).toHaveLength(1);
    expect(document.querySelector('script[src*="fbevents"]')).toBeNull();
    window.dispatchEvent(new Event("pointerdown"));
    expect(document.querySelector('script[src*="fbevents"]')).not.toBeNull();
    expect(__queuedEvents()).toHaveLength(0);
    expect(window.fbq?.queue?.length).toBeGreaterThanOrEqual(3); // init, PageView, ViewContent
  });
});
