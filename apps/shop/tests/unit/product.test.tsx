import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Gallery } from "@/components/product/Gallery";
import { PackHotspots } from "@/components/product/PackHotspots";
import type { Img, PackItem } from "@/lib/catalog-map";

const cover: Img = { id: 1, src: "/media/1", width: 1024, height: 572, alt: "Le Pack Barista sur un bureau" };
const second: Img = { id: 4, src: "/media/4", width: 1024, height: 572, alt: "La cafetière Moka de près" };
const items: PackItem[] = [
  { id: 1, name: "Café local de spécialité 250 g", description: "Torréfaction artisanale", quantity: 1, gift: true, photo: null, hotspot: { x: 63, y: 68 } },
  { id: 2, name: "Cafetière italienne (Moka)", description: "Acier inoxydable noir mat", quantity: 1, gift: false, photo: null, hotspot: { x: 72, y: 76 } },
  { id: 3, name: "Thermos intelligent", description: "Affichage LED", quantity: 1, gift: false, photo: { ...second, id: 9, src: "/media/9" }, hotspot: { x: 84, y: 66 } },
  { id: 4, name: "Notice", description: "", quantity: 1, gift: false, photo: null, hotspot: null },
];

describe("PackHotspots", () => {
  it("places a numbered pin per hotspot, at its position", () => {
    render(<PackHotspots image={cover} name="Le Pack Barista" items={items} />);
    const pins = screen.getAllByTestId("hotspot-pin");
    expect(pins).toHaveLength(3); // the item without hotspot is listed only
    expect(pins[2]).toHaveStyle({ left: "84%", top: "66%" });
    expect(pins[0]).toHaveAccessibleName("1 : Café local de spécialité 250 g");
  });

  it("keyboard: one pin in the Tab order, arrows move the active pin and the card follows", async () => {
    const user = userEvent.setup();
    render(<PackHotspots image={cover} name="Le Pack Barista" items={items} />);
    const pins = screen.getAllByTestId("hotspot-pin");
    expect(pins.map((p) => p.tabIndex)).toEqual([0, -1, -1]);
    await user.tab();
    expect(pins[0]).toHaveFocus();
    expect(pins[0]).toHaveAttribute("aria-pressed", "true");
    const card = screen.getByTestId("hotspot-card");
    expect(card).toHaveTextContent("Café local de spécialité 250 g");
    expect(card).toHaveTextContent("Offert");

    await user.keyboard("{ArrowRight}");
    expect(pins[1]).toHaveFocus();
    expect(pins[1]).toHaveAttribute("aria-pressed", "true");
    expect(pins[0]).toHaveAttribute("aria-pressed", "false");
    expect(card).toHaveTextContent("Cafetière italienne (Moka)");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(pins[2]).toHaveFocus(); // wraps around
    // the item photo is used when provided
    expect(card.querySelector("img")).toHaveAttribute("src", "/media/9");
    await user.keyboard("{Home}");
    expect(pins[0]).toHaveFocus();
  });

  it("list ↔ pin sync, cover zoomed on the hotspot when the item has no photo", async () => {
    const user = userEvent.setup();
    render(<PackHotspots image={cover} name="Le Pack Barista" items={items} />);
    await user.hover(screen.getByRole("button", { name: "Cafetière italienne (Moka)" }));
    const pins = screen.getAllByTestId("hotspot-pin");
    expect(pins[1]).toHaveAttribute("aria-pressed", "true");
    const zoomed = screen.getByTestId("hotspot-card").querySelector("img")!;
    expect(zoomed).toHaveAttribute("src", "/media/1");
    expect(zoomed.style.objectPosition).toBe("72% 76%");
    await user.click(screen.getByRole("button", { name: "Notice" }));
    expect(pins.every((p) => p.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(pins[0].tabIndex).toBe(0); // still reachable with Tab
  });
});

describe("Gallery + lightbox", () => {
  it("opens the lightbox on a photo, arrows change photo, Escape closes and returns focus", async () => {
    const user = userEvent.setup();
    render(<Gallery images={[cover, second]} name="Le Pack Barista" />);
    const first = screen.getByRole("button", { name: /Agrandir la photo 1 sur 2/ });
    await user.click(first);
    const dialog = screen.getByRole("dialog", { name: /Le Pack Barista/ });
    expect(dialog).toHaveTextContent("1 / 2");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(screen.getByRole("button", { name: "Fermer la galerie" })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(dialog).toHaveTextContent("2 / 2");
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(dialog).toHaveTextContent("1 / 2");

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("lightbox")).not.toBeInTheDocument();
    expect(first).toHaveFocus();
  });

  it("swipe left goes to the next photo", async () => {
    const user = userEvent.setup();
    render(<Gallery images={[cover, second]} name="Le Pack Barista" />);
    await user.click(screen.getByRole("button", { name: /Agrandir la photo 1 sur 2/ }));
    const dialog = screen.getByTestId("lightbox");
    const stage = screen.getByRole("button", { name: "Zoomer sur la photo" });
    fireEvent.pointerDown(stage, { clientX: 300, clientY: 200 });
    fireEvent.pointerUp(stage, { clientX: 150, clientY: 210 });
    expect(dialog).toHaveTextContent("2 / 2");
  });

  it("no photo: branded fallback instead of a broken image", () => {
    render(<Gallery images={[]} name="Le Pack Setup & Productivité" />);
    expect(screen.getByTestId("pack-fallback")).toHaveAccessibleName(/Le Pack Setup & Productivité/);
    expect(document.querySelector("img[src^='/media']")).toBeNull();
  });
});
