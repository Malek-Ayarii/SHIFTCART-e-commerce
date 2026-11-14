"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import type { SubmitOrderResult } from "@/app/actions/submit-order";
import {
  CHECKOUT_FIELDS,
  errorBannerText,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutValues,
} from "@/lib/validation";
import { AddressField } from "./AddressField";
import { Button } from "./Button";
import { GovernorateSelect } from "./GovernorateSelect";
import { Icon } from "./Icon";
import { PhoneInput } from "./PhoneInput";
import { TextField } from "./TextField";

export interface CheckoutSubmission extends CheckoutValues {
  /** Honeypot: always empty for humans. */
  website: string;
}

export interface CheckoutFormProps {
  price?: number;
  productName?: string;
  /** Pack thumbnail of the recap (`/media/{id}`); a branded tile when absent. */
  productImage?: { src: string; alt: string; /** Square crop on the products (lib/focus.ts). */ position?: string } | null;
  /** Sends the order (Server Action in the shop). */
  onSubmit: (order: CheckoutSubmission) => Promise<SubmitOrderResult>;
  /** Called once the order exists (the shop navigates to /merci/[ref]). */
  onSuccess?: (ref: string) => void;
  /** Prefix of the field ids (several forms on one page, e.g. /dev/ui). */
  idPrefix?: string;
  /** Initial values (previews / tests). */
  initialValues?: Partial<CheckoutValues>;
  /** Reveal errors immediately (previews / tests). */
  initialTouched?: boolean;
}

type Status = "idle" | "sending" | "network" | "rate_limited";

const ALL_TOUCHED: Record<CheckoutField, boolean> = { customerName: true, phone: true, governorate: true, address: true };
const NONE_TOUCHED: Record<CheckoutField, boolean> = { customerName: false, phone: false, governorate: false, address: false };

/**
 * Express checkout (v2): 4 fields (name, phone, governorate, exact address) + pack summary + giant CTA + COD note.
 * Validates on blur; the button stays clickable and reveals every error, then focuses the
 * first field to fix. While sending: disabled + « Envoi… ». Network error: danger-soft
 * banner + retry, the typed data is kept.
 */
export function CheckoutForm({
  price = 89,
  productName = "Le Pack Barista",
  productImage = null,
  onSubmit,
  onSuccess,
  idPrefix = "sc-f",
  initialValues,
  initialTouched = false,
}: CheckoutFormProps) {
  const [customerName, setName] = useState(initialValues?.customerName ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [governorate, setGov] = useState(initialValues?.governorate ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [productError, setProductError] = useState("");
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState(initialTouched ? ALL_TOUCHED : NONE_TOUCHED);
  const [serverErrors, setServerErrors] = useState<CheckoutErrors>({});
  const [attempted, setAttempted] = useState(initialTouched);
  const [status, setStatus] = useState<Status>("idle");
  const [rateMessage, setRateMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const ids: Record<CheckoutField, string> = {
    customerName: `${idPrefix}-name`,
    phone: `${idPrefix}-phone`,
    governorate: `${idPrefix}-gov`,
    address: `${idPrefix}-address`,
  };

  const clientErrors = validateCheckout({ customerName, phone, governorate, address });
  const errors: CheckoutErrors = {};
  for (const f of CHECKOUT_FIELDS) {
    const e = clientErrors[f] ?? serverErrors[f];
    if (e) errors[f] = e;
  }
  const shown = (f: CheckoutField) => (touched[f] ? errors[f] : undefined);
  const invalidCount = CHECKOUT_FIELDS.filter((f) => shown(f)).length;
  const sending = status === "sending";

  function touch(f: CheckoutField) {
    setTouched((t) => (t[f] ? t : { ...t, [f]: true }));
  }
  function clearServer(f: CheckoutField) {
    setServerErrors((s) => (s[f] ? { ...s, [f]: undefined } : s));
  }
  function focusField(f: CheckoutField) {
    const el = formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(ids[f])}`);
    el?.focus();
  }

  async function send() {
    if (sending) return;
    setTouched(ALL_TOUCHED);
    setAttempted(true);
    const current = validateCheckout({ customerName, phone, governorate, address });
    const firstBad = CHECKOUT_FIELDS.find((f) => current[f] ?? serverErrors[f]);
    if (firstBad) {
      focusField(firstBad);
      return;
    }
    setStatus("sending");
    setProductError("");
    let result: SubmitOrderResult;
    try {
      result = await onSubmit({ customerName: customerName.trim(), phone, governorate, address: address.trim(), website });
    } catch {
      result = { status: "error" };
    }
    switch (result.status) {
      case "ok":
        onSuccess?.(result.ref);
        return; // stay in "sending" while navigating away
      case "invalid": {
        setServerErrors(result.errors);
        setProductError(result.errors.productSku ?? "");
        setStatus("idle");
        const first = CHECKOUT_FIELDS.find((f) => result.errors[f]);
        if (first) focusField(first);
        return;
      }
      case "rate_limited":
        setRateMessage(result.message);
        setStatus("rate_limited");
        return;
      default:
        setStatus("network");
    }
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  return (
    <form ref={formRef} className="grid gap-4" noValidate onSubmit={onFormSubmit} aria-busy={sending || undefined}>
      {attempted && invalidCount > 0 ? (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-danger-soft p-3 text-sm leading-5 font-bold text-danger">
          <Icon name="alert" size={18} />
          {errorBannerText(invalidCount)}
        </div>
      ) : null}

      {status === "network" ? (
        <div role="alert" className="grid gap-3 rounded-md bg-danger-soft p-3 text-sm leading-5 font-bold text-danger">
          <p className="m-0 flex items-start gap-2">
            <Icon name="alert" size={18} className="mt-px" />
            La commande n’est pas partie : vérifie ta connexion. Tes infos sont gardées.
          </p>
          <Button variant="dark" size="md" icon="refresh" onClick={() => void send()}>
            Réessayer
          </Button>
        </div>
      ) : null}

      {productError ? (
        <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm leading-5 font-bold text-danger">
          <Icon name="alert" size={18} className="mt-px" />
          {productError}
        </div>
      ) : null}

      {status === "rate_limited" ? (
        <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm leading-5 font-bold text-danger">
          <Icon name="clock" size={18} className="mt-px" />
          {rateMessage}
        </div>
      ) : null}

      <div className="flex items-center gap-3 rounded-md bg-surface-sunken p-3" data-testid="checkout-recap">
        {productImage ? (
          <span className="relative size-14 flex-none overflow-hidden rounded-sm bg-surface-raised">
            <Image src={productImage.src} alt={productImage.alt} fill sizes="56px" className="object-cover" style={productImage.position ? { objectPosition: productImage.position } : undefined} />
          </span>
        ) : (
          <span className="grid size-14 flex-none place-items-center rounded-sm bg-ink text-orange">
            <Icon name="package" size={24} />
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="text-item">{productName}</span>
          {/* Two units that wrap whole (no dangling « · » on a narrow sheet). */}
          <span className="flex flex-wrap items-center gap-x-2 text-meta">
            <span className="text-success">Livraison gratuite</span>
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Icon name="clock" size={14} />
              24–48 h
            </span>
          </span>
        </div>
        <span className="ml-auto font-display text-xl font-extrabold whitespace-nowrap">{price} TND</span>
      </div>

      <TextField
        id={ids.customerName}
        name="customerName"
        label="Nom & prénom"
        autoComplete="name"
        placeholder="Mohamed Ben Ali"
        maxLength={80}
        value={customerName}
        error={shown("customerName")}
        onValueChange={(v) => {
          setName(v);
          clearServer("customerName");
        }}
        onBlur={() => touch("customerName")}
      />
      <PhoneInput
        id={ids.phone}
        value={phone}
        error={shown("phone")}
        onChange={(v) => {
          setPhone(v);
          clearServer("phone");
        }}
        onBlur={() => touch("phone")}
      />
      <GovernorateSelect
        id={ids.governorate}
        value={governorate}
        error={shown("governorate")}
        onChange={(v) => {
          setGov(v);
          clearServer("governorate");
          touch("governorate");
        }}
        onBlur={() => touch("governorate")}
      />
      <AddressField
        id={ids.address}
        value={address}
        error={shown("address")}
        onChange={(v) => {
          setAddress(v);
          clearServer("address");
        }}
        onBlur={() => touch("address")}
      />

      {/* Honeypot « website »: invisible to people and to assistive technologies. */}
      <div className="sr-only" aria-hidden="true" inert>
        <label htmlFor={`${idPrefix}-website`}>Site web</label>
        <input
          id={`${idPrefix}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Button type="submit" variant="primary" size="xl" block disabled={sending}>
        {sending ? "Envoi…" : "Confirmer ma commande 🚀"}
      </Button>
      <p className="m-0 flex items-center justify-center gap-2 text-sm leading-5 font-bold text-ink-muted">
        <Icon name="banknote" size={18} />* Pas de carte, paiement en espèces.
      </p>
    </form>
  );
}
