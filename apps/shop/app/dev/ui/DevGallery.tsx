"use client";

import { useState, type ReactNode } from "react";
import type { SubmitOrderResult } from "@/app/actions/submit-order";
import { MenuOverlay } from "@/components/landing/MenuOverlay";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { CheckoutForm } from "@/components/ui/CheckoutForm";
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";
import { Icon, ICONS, type IconName } from "@/components/ui/Icon";
import { IncludedList } from "@/components/ui/IncludedList";
import { MobileFrame } from "@/components/ui/MobileFrame";
import { Navbar } from "@/components/ui/Navbar";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductCard } from "@/components/ui/ProductCard";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { SavingsCalculator } from "@/components/ui/SavingsCalculator";
import { StatusBadge, STATUS_META } from "@/components/ui/StatusBadge";
import { StickyCta } from "@/components/ui/StickyCta";
import { StoryVideo } from "@/components/ui/StoryVideo";
import { TextField } from "@/components/ui/TextField";
import { Wordmark } from "@/components/ui/Wordmark";
import { validateTnPhone } from "@/lib/validation";
import type { UiOrderStatus } from "@/lib/types";

const VARIANTS: ButtonVariant[] = ["primary", "dark", "ghost", "whatsapp"];
const SIZES: ButtonSize[] = ["sm", "md", "xl"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Scenario = "ok" | "network" | "invalid" | "rate_limited";
const SCENARIOS: Record<Scenario, SubmitOrderResult> = {
  ok: { status: "ok", ref: "SC-2951" },
  network: { status: "error" },
  invalid: { status: "invalid", errors: { phone: "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9." } },
  rate_limited: { status: "rate_limited", message: "Trop de tentatives. Réessaie dans quelques minutes." },
};

function Block({ title, children, dark }: { title: string; children: ReactNode; dark?: boolean }) {
  return (
    <section className={`flex flex-col gap-4 rounded-lg p-5 ${dark ? "bg-ink text-ink-inverse" : "bg-surface-raised shadow-card"}`}>
      <h2 className="m-0 text-heading">{title}</h2>
      {children}
    </section>
  );
}

/** Every shop component in its states (development only). */
export function DevGallery() {
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("ok");
  const [log, setLog] = useState("");
  const [phone, setPhone] = useState("98765");
  const [gov, setGov] = useState("");

  const fakeSubmit = async () => {
    await wait(900);
    return SCENARIOS[scenario];
  };

  return (
    <main className="mx-auto flex max-w-300 flex-col gap-6 p-4 lg:p-8">
      <header className="flex flex-col gap-2">
        <p className="m-0 text-label uppercase text-orange-ink">Développement uniquement</p>
        <h1 className="m-0 text-display-xl">Composants boutique</h1>
        <p className="m-0 text-body text-ink-muted">Exclue de la production (notFound). Les données affichées ici sont des exemples.</p>
      </header>

      <Block title="Icon">
        <div className="flex flex-wrap gap-4">
          {(Object.keys(ICONS) as IconName[]).map((n) => (
            <span key={n} className="flex w-24 flex-col items-center gap-1 text-xs text-ink-muted">
              <Icon name={n} size={24} />
              {n}
            </span>
          ))}
        </div>
      </Block>

      <Block title="Wordmark">
        <div className="flex flex-wrap items-center gap-6">
          <Wordmark src="wordmark" height={20} />
          <Wordmark src="mark" height={40} />
          <Wordmark src="logo" height={80} />
          <Wordmark />
        </div>
      </Block>
      <Block title="Wordmark (sur ink, texte de secours)" dark>
        <Wordmark onDark />
      </Block>

      <Block title="Button">
        {SIZES.map((s) => (
          <div key={s} className="flex flex-wrap items-center gap-3">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v} size={s} iconRight={v === "primary" ? "zap" : undefined} icon={v === "whatsapp" ? "whatsapp" : undefined}>
                {v === "primary" ? "Obtenir mon pack" : v}
              </Button>
            ))}
            <Button size={s} disabled>
              Désactivé
            </Button>
          </div>
        ))}
        <Button variant="ghost" href="/livraison">
          Lien (href)
        </Button>
      </Block>

      <Block title="StatusBadge">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_META) as UiOrderStatus[]).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Block>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Navbar + MobileFrame">
          <MobileFrame className="overflow-hidden rounded-lg shadow-phone">
            <Navbar count={1} onMenu={() => setMenu(true)} onCart={() => setSheet(true)} />
            <div className="p-4 text-body-sm text-ink-muted">Contenu de la vue mobile (480px max).</div>
          </MobileFrame>
          <Navbar onMenu={() => setMenu(true)} onCart={() => setSheet(true)} />
        </Block>

        <Block title="PriceTag">
          <PriceTag price={89} />
          <PriceTag price={89} compareAt={109} shippingLabel="Livraison gratuite" />
        </Block>

        <Block title="ProductCard">
          <ProductCard price={89} onBuy={() => setSheet(true)} />
        </Block>

        <Block title="SavingsCalculator">
          <SavingsCalculator packPrice={89} onChange={(d, s) => setLog(`${d} DT/jour → ${s} DT/mois`)} />
          <p className="m-0 text-body-sm text-ink-muted">onChange : {log || "—"}</p>
        </Block>

        <Block title="IncludedList">
          <IncludedList />
        </Block>

        <Block title="ReviewCard (placeholders)">
          <ReviewCard name="Yasmine" city="Sousse" text="Livré en 24h à Sousse, top !" rating={5} verified />
          <ReviewCard name="Ines" city="Sfax" text="[AVIS CLIENT RÉEL À INSÉRER]" rating={4} />
        </Block>

        <Block title="StoryVideo (sans src → placeholder)">
          <div className="max-w-80">
            <StoryVideo author="Sarra K" handle="@sarra.shift" index={1} />
          </div>
        </Block>

        <Block title="TextField · PhoneInput · GovernorateSelect">
          <TextField id="dev-name" label="Nom & prénom" placeholder="Mohamed Ben Ali" autoComplete="name" />
          <TextField id="dev-name-err" label="Nom & prénom" defaultValue="Mo" error="Écris ton nom et ton prénom." />
          <PhoneInput id="dev-phone" value={phone} onChange={setPhone} error={validateTnPhone(phone)} />
          <PhoneInput id="dev-phone-ok" value="98765432" />
          <GovernorateSelect id="dev-gov" value={gov} onChange={setGov} error={gov ? null : "Choisis où te livrer."} />
          <GovernorateSelect id="dev-gov-ok" value="Sousse" />
        </Block>
      </div>

      <Block title="CheckoutForm">
        <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
          <legend className="mb-2 text-body-sm font-bold">Réponse simulée de l&apos;API</legend>
          {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
            <label key={s} className="flex min-h-11 items-center gap-2 text-body-sm">
              <input type="radio" name="scenario" checked={scenario === s} onChange={() => setScenario(s)} />
              {s}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <p className="m-0 mb-2 text-label uppercase text-ink-muted">Vide (A3)</p>
            <CheckoutForm idPrefix="dev-a" onSubmit={fakeSubmit} onSuccess={(ref) => setLog(`Commande ${ref} créée`)} />
          </div>
          <div>
            <p className="m-0 mb-2 text-label uppercase text-ink-muted">Erreurs (A4)</p>
            <CheckoutForm idPrefix="dev-b" initialValues={{ customerName: "Mohamed Ben Ali", phone: "98765" }} initialTouched onSubmit={fakeSubmit} />
          </div>
          <div>
            <p className="m-0 mb-2 text-label uppercase text-ink-muted">Prêt à valider (A5)</p>
            <CheckoutForm
              idPrefix="dev-c"
              initialValues={{ customerName: "Mohamed Ben Ali", phone: "98765432", governorate: "Sousse" }}
              onSubmit={fakeSubmit}
              onSuccess={(ref) => setLog(`Commande ${ref} créée`)}
            />
          </div>
        </div>
      </Block>

      <Block title="BottomSheet · StickyCta · Menu">
        <div className="flex flex-wrap gap-3">
          <Button variant="dark" onClick={() => setSheet(true)}>
            Ouvrir le BottomSheet
          </Button>
          <Button variant="ghost" onClick={() => setSticky((v) => !v)}>
            StickyCta : {sticky ? "visible" : "masqué"}
          </Button>
          <Button variant="ghost" onClick={() => setMenu(true)}>
            Ouvrir le menu
          </Button>
        </div>
      </Block>

      <StickyCta visible={sticky && !sheet} onClick={() => setSheet(true)} />
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Finalise ta commande" subtitle="Tu paies à la livraison">
        <CheckoutForm idPrefix="dev-sheet" onSubmit={fakeSubmit} onSuccess={() => setSheet(false)} />
      </BottomSheet>
      <MenuOverlay open={menu} onClose={() => setMenu(false)} onOrder={() => setSheet(true)} contactHref="/livraison#contact" />
      <p className="m-0 flex items-center gap-2 text-body-sm text-ink-muted">
        <Icon name="alert" size={16} />
        {log || "Les actions s'affichent ici."}
      </p>
    </main>
  );
}
