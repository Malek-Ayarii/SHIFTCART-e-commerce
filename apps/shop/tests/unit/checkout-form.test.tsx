import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SubmitOrderResult } from "@/app/actions/submit-order";
import { CheckoutForm } from "@/components/ui/CheckoutForm";

function setup(result: SubmitOrderResult | (() => Promise<SubmitOrderResult>) = { status: "ok", ref: "SC-2951" }) {
  const onSubmit = vi.fn(typeof result === "function" ? result : async () => result);
  const onSuccess = vi.fn();
  const user = userEvent.setup();
  render(<CheckoutForm onSubmit={onSubmit} onSuccess={onSuccess} />);
  const name = screen.getByLabelText(/Nom & prénom/);
  const phone = screen.getByLabelText(/Numéro de téléphone/);
  const gov = screen.getByLabelText(/Ville \/ Gouvernorat/);
  const submit = screen.getByRole("button", { name: /Confirmer ma commande/i });
  return { user, onSubmit, onSuccess, name, phone, gov, submit };
}

describe("CheckoutForm", () => {
  it("renders the pack summary, 3 fields and the COD note", () => {
    setup();
    expect(screen.getByText("Le Pack Barista")).toBeInTheDocument();
    expect(screen.getByText("Livraison gratuite · 24–48 h")).toBeInTheDocument();
    expect(screen.getByText("89 TND")).toBeInTheDocument();
    expect(screen.getByText(/\* Pas de carte, paiement en espèces\./)).toBeInTheDocument();
    expect(screen.getByLabelText(/Numéro de téléphone/)).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText(/Numéro de téléphone/)).toHaveAttribute("autocomplete", "tel-national");
    expect(screen.getByLabelText(/Nom & prénom/)).toHaveAttribute("autocomplete", "name");
  });

  it("shows no error before interaction, then validates on blur", async () => {
    const { user, name, phone } = setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(name);
    await user.type(name, "Mo");
    await user.tab();
    expect(await screen.findByText("Écris ton nom et ton prénom.")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    // phone focused but not blurred yet → no phone error
    expect(phone).not.toHaveAttribute("aria-invalid");
    // error disappears as soon as the value becomes valid
    await user.type(name, "hamed Ben Ali");
    expect(screen.queryByText("Écris ton nom et ton prénom.")).not.toBeInTheDocument();
    // leaving the phone field empty reveals its error
    expect(screen.getByText("Ton numéro nous sert à confirmer la commande sur WhatsApp.")).toBeInTheDocument();
  });

  it("masks the phone number as 98 765 432 and keeps 8 digits", async () => {
    const { user, phone } = setup();
    await user.type(phone, "98765432199");
    expect(phone).toHaveValue("98 765 432");
  });

  it("button stays clickable: reveals every error, banner with the count, focuses the first invalid field", async () => {
    const { user, submit, onSubmit, name } = setup();
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(screen.getByText("3 infos à corriger avant de valider")).toBeInTheDocument();
    expect(screen.getByText("Ton nom aide le livreur à te trouver.")).toBeInTheDocument();
    expect(screen.getByText("Ton numéro nous sert à confirmer la commande sur WhatsApp.")).toBeInTheDocument();
    expect(screen.getByText("Choisis où te livrer.")).toBeInTheDocument();
    expect(name).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field when the name is valid (A4)", async () => {
    const { user, submit, name, phone } = setup();
    await user.type(name, "Mohamed Ben Ali");
    await user.type(phone, "98765");
    await user.click(submit);
    expect(screen.getByText("2 infos à corriger avant de valider")).toBeInTheDocument();
    expect(screen.getByText("Il manque 3 chiffres (8 au total).")).toBeInTheDocument();
    expect(phone).toHaveFocus();
  });

  it("submits valid data, shows « Envoi… » then calls onSuccess", async () => {
    let resolve!: (r: SubmitOrderResult) => void;
    const { user, submit, onSubmit, onSuccess, name, phone, gov } = setup(
      () => new Promise<SubmitOrderResult>((r) => (resolve = r)),
    );
    await user.type(name, "Mohamed Ben Ali");
    await user.type(phone, "98765432");
    await user.selectOptions(gov, "Sousse");
    await user.click(submit);
    expect(await screen.findByRole("button", { name: "Envoi…" })).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledWith({ customerName: "Mohamed Ben Ali", phone: "98765432", governorate: "Sousse", website: "" });
    resolve({ status: "ok", ref: "SC-2951" });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("SC-2951"));
  });

  it("network error: danger banner + retry, data kept", async () => {
    const results: SubmitOrderResult[] = [{ status: "error" }, { status: "ok", ref: "SC-3000" }];
    const { user, submit, onSubmit, onSuccess, name, phone, gov } = setup(async () => results.shift()!);
    await user.type(name, "Mohamed Ben Ali");
    await user.type(phone, "98765432");
    await user.selectOptions(gov, "Sousse");
    await user.click(submit);
    expect(await screen.findByText(/La commande n’est pas partie/)).toBeInTheDocument();
    expect(name).toHaveValue("Mohamed Ben Ali");
    expect(phone).toHaveValue("98 765 432");
    expect(gov).toHaveValue("Sousse");
    await user.click(screen.getByRole("button", { name: /Réessayer/ }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("SC-3000"));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("maps 422 field errors back to the fields", async () => {
    const { user, submit, name, phone, gov } = setup({ status: "invalid", errors: { phone: "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9." } });
    await user.type(name, "Mohamed Ben Ali");
    await user.type(phone, "98765432");
    await user.selectOptions(gov, "Sousse");
    await user.click(submit);
    expect(await screen.findByText("Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.")).toBeInTheDocument();
    expect(phone).toHaveFocus();
    // editing the field clears the server error
    await user.type(phone, "{backspace}2");
    expect(screen.queryByText("Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.")).not.toBeInTheDocument();
  });

  it("429: friendly message", async () => {
    const { user, submit, name, phone, gov } = setup({ status: "rate_limited", message: "Trop de tentatives. Réessaie dans quelques minutes." });
    await user.type(name, "Mohamed Ben Ali");
    await user.type(phone, "98765432");
    await user.selectOptions(gov, "Sousse");
    await user.click(submit);
    expect(await screen.findByText("Trop de tentatives. Réessaie dans quelques minutes.")).toBeInTheDocument();
  });

  it("honeypot is hidden from assistive technologies and out of the tab order", () => {
    const { container } = render(<CheckoutForm idPrefix="hp" onSubmit={async () => ({ status: "error" })} />);
    const hp = container.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(hp).toHaveAttribute("tabindex", "-1");
    expect(hp.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("governorate select lists popular first then all 24", () => {
    setup();
    const groups = screen.getAllByRole("group");
    expect(groups[0]).toHaveAttribute("label", "Les plus demandés");
    expect(groups[1]).toHaveAttribute("label", "Tous les gouvernorats");
    expect(screen.getAllByRole("option").filter((o) => (o as HTMLOptionElement).value)).toHaveLength(24);
  });
});
