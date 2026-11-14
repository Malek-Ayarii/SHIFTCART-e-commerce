import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet } from "@/components/ui/BottomSheet";

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Finalise ta commande"
        subtitle="Tu paies à la livraison"
      >
        <label htmlFor="f">Nom</label>
        <input id="f" />
        <button type="button">Dernier</button>
      </BottomSheet>
    </>
  );
}

describe("BottomSheet", () => {
  it("is hidden when closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // aria-hidden ancestor
  });

  it("opens labelled, focuses the first field, Escape closes and focus returns to the opener", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onClose = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Ouvrir" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: /Finalise ta commande/ });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByLabelText("Nom")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    vi.useRealTimers();
  });

  it("traps Tab inside the sheet", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    const last = screen.getByRole("button", { name: "Dernier" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("closes on scrim click and with the close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    await user.click(screen.getByTestId("sheet-scrim"));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
