/* @ds-bundle: {"format":4,"namespace":"ShiftCart","components":[{"name":"Icon"},{"name":"Wordmark"},{"name":"Button"},{"name":"Navbar"},{"name":"MobileFrame"},{"name":"StoryVideo"},{"name":"PriceTag"},{"name":"ProductCard"},{"name":"SavingsCalculator"},{"name":"IncludedList"},{"name":"ReviewCard"},{"name":"StickyCta"},{"name":"BottomSheet"},{"name":"TextField"},{"name":"PhoneInput"},{"name":"GovernorateSelect"},{"name":"CheckoutForm"},{"name":"KpiCard"},{"name":"StatusBadge"},{"name":"OrderCard"},{"name":"KanbanBoard"},{"name":"AdminHeader"},{"name":"LandingPage"},{"name":"AdminDashboard"}]} */
(function () {
  "use strict";
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;

  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function omit(obj, keys) { var o = {}; for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) o[k] = obj[k]; } return o; }
  function fmt(n) { var s = String(Math.round(n)); return s.replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  /* ---------- Icons (Lucide, ISC licence — inlined so pages load with zero icon requests) ---------- */
  var ICONS = {
    menu: [["path", { d: "M4 12h16M4 6h16M4 18h16" }]],
    cart: [["circle", { cx: 8, cy: 21, r: 1 }], ["circle", { cx: 19, cy: 21, r: 1 }], ["path", { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" }]],
    play: [["polygon", { points: "6 3 20 12 6 21 6 3", fill: "currentColor" }]],
    pause: [["rect", { x: 14, y: 4, width: 4, height: 16, rx: 1, fill: "currentColor" }], ["rect", { x: 6, y: 4, width: 4, height: 16, rx: 1, fill: "currentColor" }]],
    check: [["path", { d: "M20 6 9 17l-5-5" }]],
    x: [["path", { d: "M18 6 6 18M6 6l12 12" }]],
    chevronDown: [["path", { d: "m6 9 6 6 6-6" }]],
    whatsapp: [["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" }]],
    clock: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "M12 6v6l4 2" }]],
    printer: [["path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }], ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" }], ["rect", { x: 6, y: 14, width: 12, height: 8, rx: 1 }]],
    truck: [["path", { d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }], ["path", { d: "M15 18H9" }], ["path", { d: "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" }], ["circle", { cx: 17, cy: 18, r: 2 }], ["circle", { cx: 7, cy: 18, r: 2 }]],
    star: [["polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2", fill: "currentColor" }]],
    package: [["path", { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" }], ["path", { d: "M12 22V12" }], ["path", { d: "m3.3 7 8.7 5 8.7-5" }]],
    coffee: [["path", { d: "M10 2v2M14 2v2M6 2v2" }], ["path", { d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" }]],
    thermo: [["path", { d: "M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" }]],
    gift: [["rect", { x: 3, y: 8, width: 18, height: 4, rx: 1 }], ["path", { d: "M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" }], ["path", { d: "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" }]],
    banknote: [["rect", { x: 2, y: 6, width: 20, height: 12, rx: 2 }], ["circle", { cx: 12, cy: 12, r: 2 }], ["path", { d: "M6 12h.01M18 12h.01" }]],
    zap: [["path", { d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" }]],
    pin: [["path", { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" }], ["circle", { cx: 12, cy: 10, r: 3 }]],
    refresh: [["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }], ["path", { d: "M21 3v5h-5" }], ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }], ["path", { d: "M8 16H3v5" }]],
    undo: [["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }], ["path", { d: "M3 3v5h5" }]],
    trendUp: [["path", { d: "M22 7 13.5 15.5 8.5 10.5 2 17" }], ["path", { d: "M16 7h6v6" }]],
    trendDown: [["path", { d: "M22 17 13.5 8.5 8.5 13.5 2 7" }], ["path", { d: "M16 17h6v-6" }]],
    grip: [["circle", { cx: 9, cy: 12, r: 1 }], ["circle", { cx: 9, cy: 5, r: 1 }], ["circle", { cx: 9, cy: 19, r: 1 }], ["circle", { cx: 15, cy: 12, r: 1 }], ["circle", { cx: 15, cy: 5, r: 1 }], ["circle", { cx: 15, cy: 19, r: 1 }]],
    calendar: [["path", { d: "M8 2v4M16 2v4" }], ["rect", { x: 3, y: 4, width: 18, height: 18, rx: 2 }], ["path", { d: "M3 10h18" }]],
    shield: [["path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }], ["path", { d: "m9 12 2 2 4-4" }]],
    alert: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "M12 8v4M12 16h.01" }]]
  };

  function Icon(p) {
    var size = p.size || 20;
    var nodes = ICONS[p.name] || [];
    return h("svg", {
      className: cx("sc-icon", p.className), width: size, height: size, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: p.strokeWidth || 2, strokeLinecap: "round", strokeLinejoin: "round",
      role: p.label ? "img" : undefined, "aria-label": p.label, "aria-hidden": p.label ? undefined : true, focusable: "false"
    }, nodes.map(function (n, i) { return h(n[0], Object.assign({ key: i }, n[1])); }));
  }

  function Wordmark(p) {
    if (p.src) return h("img", { className: cx("sc-logo", p.className), src: p.src, alt: "SHIFT CART", height: p.height || 32, style: { height: (p.height || 32) + "px" } });
    return h("span", { className: cx("sc-wordmark", p.className), "aria-label": "SHIFT CART" }, "SHIFT", h("span", { className: "sc-wordmark__cart" }, "CART"));
  }

  function Button(p) {
    var variant = p.variant || "primary", size = p.size || "md";
    var rest = omit(p, ["variant", "size", "block", "icon", "iconRight", "className", "children", "href"]);
    var iconSize = size === "xl" ? 22 : size === "sm" ? 16 : 18;
    var kids = [
      p.icon ? h(Icon, { key: "i", name: p.icon, size: iconSize }) : null,
      h("span", { key: "t" }, p.children),
      p.iconRight ? h(Icon, { key: "r", name: p.iconRight, size: iconSize }) : null
    ];
    var cls = cx("sc-btn", "sc-btn--" + variant, "sc-btn--" + size, p.block && "sc-btn--block", p.className);
    if (p.href) return h("a", Object.assign({}, rest, { href: p.href, className: cls }), kids);
    return h("button", Object.assign({ type: "button" }, rest, { className: cls }), kids);
  }

  function Navbar(p) {
    return h("header", { className: "sc-nav" },
      h("button", { className: "sc-iconbtn", type: "button", "aria-label": "Ouvrir le menu", onClick: p.onMenu }, h(Icon, { name: "menu", size: 24 })),
      h(Wordmark, { src: p.logoSrc, height: p.logoHeight || 32 }),
      h("button", { className: "sc-iconbtn", type: "button", "aria-label": p.count ? "Commander (" + p.count + " article)" : "Commander", onClick: p.onCart },
        h(Icon, { name: "cart", size: 24 }), p.count ? h("span", { className: "sc-nav__count", "aria-hidden": true }, p.count) : null));
  }

  function MobileFrame(p) {
    return h("div", { className: "sc-frame-stage" },
      h("div", { className: cx("sc-frame", p.className), style: { height: p.height || "auto" } }, p.children));
  }

  function StoryVideo(p) {
    var st = useState(false), playing = st[0], setPlaying = st[1];
    var ref = useRef(null);
    function toggle() {
      var v = ref.current;
      if (v) { if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } }
      else setPlaying(!playing);
    }
    var handle = p.handle || "@shiftcart.tn";
    var initials = (p.author || "SC").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    return h("figure", { className: cx("sc-story", playing && "is-playing") },
      h("div", { className: "sc-story__bars", "aria-hidden": true },
        [0, 1, 2].map(function (i) { return h("span", { key: i, className: cx("sc-story__bar", i < (p.index || 0) && "is-done", i === (p.index || 0) && "is-active") }); })),
      h("div", { className: "sc-story__head" },
        h("span", { className: "sc-story__avatar", "aria-hidden": true }, initials),
        h("span", null, handle),
        h("span", { className: "sc-story__badge" }, "UGC")),
      p.src
        ? h("video", { ref: ref, className: "sc-story__media", src: p.src, poster: p.poster, muted: true, playsInline: true, loop: true, preload: "none" })
        : h("div", { className: "sc-story__placeholder" }, h("span", null, "Vidéo UGC · 9:16")),
      h("button", { type: "button", className: "sc-story__play", "aria-label": playing ? "Mettre la vidéo en pause" : "Lire la vidéo", onClick: toggle }, h(Icon, { name: playing ? "pause" : "play", size: 28 })),
      h("figcaption", { className: "sc-story__caption" }, p.caption || "Pourquoi j'ai arrêté de jeter 120 DT/mois"));
  }

  function PriceTag(p) {
    var price = p.price == null ? 89 : p.price;
    return h("div", { className: "sc-price" },
      h("div", { className: "sc-price__row" },
        h("span", { className: "sc-price__amount" }, fmt(price), h("span", { className: "sc-price__currency" }, p.currency || "TND")),
        p.compareAt ? h("span", { className: "sc-price__compare" }, fmt(p.compareAt) + " " + (p.currency || "TND")) : null),
      h("div", { className: "sc-price__facts" },
        h("span", { className: "sc-chip sc-chip--success" }, h(Icon, { name: "truck", size: 16 }), p.shippingLabel || "Livraison gratuite"),
        h("span", { className: "sc-chip" }, h(Icon, { name: "banknote", size: 16 }), "Paiement à la livraison")));
  }

  function ProductCard(p) {
    return h("article", { className: "sc-product" },
      h("div", { className: "sc-product__eyebrow" }, h(Icon, { name: "star", size: 14 }), p.eyebrow || "Best-seller"),
      h("div", null,
        h("h2", { className: "sc-product__name" }, p.name || "Le Pack Barista"),
        h("p", { className: "sc-product__pitch" }, p.pitch || "Le coffee shop chez toi, pour le prix de 3 semaines de buvette.")),
      h(PriceTag, { price: p.price, compareAt: p.compareAt }),
      h(Button, { variant: "primary", size: "xl", block: true, iconRight: "zap", onClick: p.onBuy }, p.ctaLabel || "Obtenir mon pack"),
      h("p", { className: "sc-reassure" }, h(Icon, { name: "shield", size: 16 }), "Pas de carte · Tu paies en espèces à la réception"));
  }

  function savingsFor(daily, homeCostPerDay, days) { return Math.max(0, (daily - homeCostPerDay) * days); }
  function treatFor(amount) {
    if (amount >= 200) return "un concert + le resto d'après";
    if (amount >= 140) return "une place de concert";
    if (amount >= 100) return "un jeu vidéo neuf";
    return "une sortie ciné entre potes";
  }

  function SavingsCalculator(p) {
    var min = p.min || 4, max = p.max || 10, step = p.step || 0.5;
    var homeCost = p.homeCostPerDay == null ? 0.5 : p.homeCostPerDay;
    var days = p.daysPerMonth || 30, pack = p.packPrice || 89;
    var st = useState(p.defaultValue || min), daily = st[0], setDaily = st[1];
    var saved = savingsFor(daily, homeCost, days);
    var payback = Math.ceil(pack / Math.max(0.01, daily - homeCost));
    var fill = ((daily - min) / (max - min)) * 100 + "%";
    var id = useMemo(function () { return "sc-calc-" + Math.random().toString(36).slice(2, 8); }, []);
    function change(v) { setDaily(v); if (p.onChange) p.onChange(v, savingsFor(v, homeCost, days)); }
    return h("section", { className: "sc-calc", "aria-labelledby": id + "-q" },
      h("p", { className: "sc-calc__q", id: id + "-q" }, "Combien tu dépenses par jour en café ? ",
        h("span", { className: "sc-calc__value" }, String(daily).replace(".", ",") + " DT")),
      h("div", null,
        h("label", { className: "sc-sr", htmlFor: id }, "Dépense café par jour, en dinars"),
        h("input", { id: id, className: "sc-slider", type: "range", min: min, max: max, step: step, value: daily, style: { "--fill": fill },
          "aria-valuetext": String(daily).replace(".", ",") + " dinars par jour", onChange: function (e) { change(parseFloat(e.target.value)); } }),
        h("div", { className: "sc-calc__scale", "aria-hidden": true }, h("span", null, min + " DT"), h("span", null, max + " DT"))),
      h("div", { className: "sc-calc__result", "aria-live": "polite" },
        h("span", { className: "sc-calc__label" }, "Tu économises"),
        h("span", { className: "sc-calc__amount" }, fmt(saved), h("small", null, " DT / mois")),
        h("span", { className: "sc-calc__meta" }, "Soit " + treatFor(saved) + ". Pack remboursé en " + payback + " jours.")),
      h("p", { className: "sc-calc__note" }, "Calcul : (dépense/jour − " + String(homeCost).replace(".", ",") + " DT de café maison) × " + days + " jours."));
  }

  var DEFAULT_ITEMS = [
    { icon: "coffee", title: "Cafetière italienne Moka", detail: "6 tasses, compatible gaz et plaque" },
    { icon: "thermo", title: "Thermos intelligent LED", detail: "Affiche la température, garde chaud 12 h" },
    { icon: "gift", title: "Café tunisien offert", detail: "Un paquet moulu pour démarrer", tag: "Offert" }
  ];
  function IncludedList(p) {
    var items = p.items || DEFAULT_ITEMS;
    return h("ul", { className: "sc-included" }, items.map(function (it, i) {
      return h("li", { key: i, className: "sc-included__item" },
        h("span", { className: "sc-included__icon" }, h(Icon, { name: it.icon || "package", size: 24 })),
        h("div", null, h("p", { className: "sc-included__title" }, it.title), it.detail ? h("p", { className: "sc-included__detail" }, it.detail) : null),
        it.tag ? h("span", { className: "sc-chip sc-included__tag" }, it.tag) : null);
    }));
  }

  function ReviewCard(p) {
    var rating = p.rating == null ? 5 : p.rating;
    return h("figure", { className: "sc-review" },
      h("div", { className: "sc-review__stars", role: "img", "aria-label": rating + " sur 5" },
        [1, 2, 3, 4, 5].map(function (n) { return h(Icon, { key: n, name: "star", size: 16, className: n > rating ? "is-off" : null }); })),
      h("blockquote", { className: "sc-review__text", style: { margin: 0 } }, "« " + p.text + " »"),
      h("figcaption", { className: "sc-review__who" },
        h("strong", null, p.name), h("span", null, "· " + p.city),
        p.verified ? h("span", { className: "sc-review__verified" }, h(Icon, { name: "check", size: 14 }), "Achat vérifié") : null));
  }

  function StickyCta(p) {
    return h("div", { className: cx("sc-sticky", p.visible && "is-visible"), "aria-hidden": p.visible ? undefined : true },
      h("div", { className: "sc-sticky__price" }, (p.price || 89) + " TND", h("small", null, "Livraison gratuite")),
      h(Button, { variant: "primary", size: "md", block: true, iconRight: "zap", onClick: p.onClick, tabIndex: p.visible ? 0 : -1 }, p.label || "Obtenir mon pack"));
  }

  function BottomSheet(p) {
    var sheetRef = useRef(null), lastFocus = useRef(null);
    var contained = p.contained !== false;
    var id = useMemo(function () { return "sc-sheet-" + Math.random().toString(36).slice(2, 8); }, []);
    useEffect(function () {
      if (!p.open) return;
      lastFocus.current = document.activeElement;
      var t = setTimeout(function () {
        var el = sheetRef.current && sheetRef.current.querySelector("input, select, button:not(.sc-sheet__close)");
        if (el) el.focus({ preventScroll: true });
      }, 60);
      function onKey(e) {
        if (e.key === "Escape") { p.onClose && p.onClose(); return; }
        if (e.key !== "Tab" || !sheetRef.current) return;
        var f = sheetRef.current.querySelectorAll("a[href], button:not([disabled]), input, select, textarea");
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      document.addEventListener("keydown", onKey);
      return function () {
        clearTimeout(t); document.removeEventListener("keydown", onKey);
        if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus({ preventScroll: true });
      };
    }, [p.open]);
    return h("div", { className: cx("sc-sheet-root", contained && "sc-sheet-root--contained", p.open && "is-open"), "aria-hidden": p.open ? undefined : true },
      h("div", { className: "sc-sheet__scrim", onClick: p.onClose }),
      h("div", { ref: sheetRef, className: "sc-sheet", role: "dialog", "aria-modal": true, "aria-labelledby": id },
        h("div", { className: "sc-sheet__handle", "aria-hidden": true }),
        h("div", { className: "sc-sheet__head" },
          h("h2", { className: "sc-sheet__title", id: id }, p.title, p.subtitle ? h("span", { className: "sc-sheet__sub" }, p.subtitle) : null),
          h("button", { type: "button", className: "sc-iconbtn sc-sheet__close", "aria-label": "Fermer", onClick: p.onClose }, h(Icon, { name: "x", size: 22 }))),
        p.children));
  }

  function Field(p) {
    return h("div", { className: cx("sc-field", p.error && "is-invalid") },
      h("label", { className: "sc-field__label", htmlFor: p.id }, p.label, p.hint ? h("span", { className: "sc-field__hint" }, " " + p.hint) : null),
      p.children,
      p.error ? h("p", { className: "sc-field__error", id: p.id + "-err" }, h(Icon, { name: "alert", size: 14 }), p.error) : null);
  }

  function TextField(p) {
    var id = p.id || "sc-f-" + (p.name || "text");
    return h(Field, { id: id, label: p.label, hint: p.hint, error: p.error },
      h("input", Object.assign(omit(p, ["label", "hint", "error", "onValueChange"]), {
        id: id, className: "sc-input", "aria-invalid": p.error ? true : undefined, "aria-describedby": p.error ? id + "-err" : undefined,
        onChange: function (e) { p.onValueChange && p.onValueChange(e.target.value); p.onChange && p.onChange(e); }
      })));
  }

  /* Tunisian numbers: 8 digits. Mobiles start with 2, 4, 5 or 9; landlines with 3 or 7. */
  function formatTnPhone(digits) {
    var d = String(digits || "").replace(/\D/g, "").slice(0, 8);
    return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean).join(" ");
  }
  function validateTnPhone(digits) {
    var d = String(digits || "").replace(/\D/g, "");
    if (d.length === 0) return "Ton numéro nous sert à confirmer la commande sur WhatsApp.";
    if (d.length < 8) return "Il manque " + (8 - d.length) + " chiffre" + (8 - d.length > 1 ? "s" : "") + " (8 au total).";
    if ("234579".indexOf(d[0]) < 0) return "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.";
    return null;
  }

  function PhoneInput(p) {
    var id = p.id || "sc-f-phone";
    return h(Field, { id: id, label: p.label || "Numéro de téléphone", hint: p.hint == null ? "(pour la confirmation WhatsApp)" : p.hint, error: p.error },
      h("div", { className: "sc-phone" },
        h("span", { className: "sc-phone__prefix", "aria-hidden": true }, h("span", { className: "sc-phone__flag" }), "+216"),
        h("input", {
          id: id, className: "sc-input", type: "tel", inputMode: "numeric", autoComplete: "tel-national", placeholder: "98 765 432",
          value: formatTnPhone(p.value), maxLength: 10, "aria-invalid": p.error ? true : undefined, "aria-describedby": p.error ? id + "-err" : undefined,
          onChange: function (e) { p.onChange && p.onChange(e.target.value.replace(/\D/g, "").slice(0, 8)); },
          onBlur: p.onBlur
        })));
  }

  var GOVERNORATES = ["Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"];
  var POPULAR = ["Tunis", "Sousse", "Sfax", "Ariana", "Ben Arous"];

  function GovernorateSelect(p) {
    var id = p.id || "sc-f-gov";
    var popular = p.popular || POPULAR;
    var rest = GOVERNORATES.filter(function (g) { return popular.indexOf(g) < 0; });
    return h(Field, { id: id, label: p.label || "Ville / Gouvernorat", error: p.error },
      h("div", { className: "sc-select-wrap" },
        h(Icon, { name: "pin", size: 18, className: "sc-select__pin" }),
        h("select", {
          id: id, className: "sc-select sc-select--pin", value: p.value || "", "aria-invalid": p.error ? true : undefined, "aria-describedby": p.error ? id + "-err" : undefined,
          onChange: function (e) { p.onChange && p.onChange(e.target.value); }, onBlur: p.onBlur
        },
          h("option", { value: "", disabled: true }, "Choisis ton gouvernorat"),
          h("optgroup", { label: "Les plus demandés" }, popular.map(function (g) { return h("option", { key: g, value: g }, g); })),
          h("optgroup", { label: "Tous les gouvernorats" }, rest.map(function (g) { return h("option", { key: g, value: g }, g); }))),
        h(Icon, { name: "chevronDown", size: 20 })));
  }

  function buildWhatsAppMessage(order) {
    var first = String(order.name || "").trim().split(/\s+/)[0] || "";
    return "Salut " + first + " ! Ton " + (order.product || "Pack Barista") + " pour " + (order.city || "ta ville") + " est prêt (" + (order.amount || 89) + " TND, paiement à la livraison). Réponds OUI pour déclencher la livraison 🚚";
  }

  function CheckoutForm(p) {
    var s1 = useState(""), name = s1[0], setName = s1[1];
    var s2 = useState(""), phone = s2[0], setPhone = s2[1];
    var s3 = useState(""), gov = s3[0], setGov = s3[1];
    var s4 = useState({}), touched = s4[0], setTouched = s4[1];
    var s5 = useState(null), done = s5[0], setDone = s5[1];
    var formRef = useRef(null);
    var price = p.price || 89;
    var errors = {
      name: name.trim().length < 3 ? (name.trim() ? "Écris ton nom et ton prénom." : "Ton nom aide le livreur à te trouver.") : null,
      phone: validateTnPhone(phone),
      gov: gov ? null : "Choisis où te livrer."
    };
    function show(k) { return touched[k] ? errors[k] : null; }
    function touch(k) { return function () { var t = Object.assign({}, touched); t[k] = true; setTouched(t); }; }
    function submit(e) {
      e.preventDefault();
      setTouched({ name: true, phone: true, gov: true });
      var firstBad = errors.name ? "name" : errors.phone ? "phone" : errors.gov ? "gov" : null;
      if (firstBad) {
        var el = formRef.current && formRef.current.querySelector("#sc-f-" + firstBad);
        if (el) el.focus();
        return;
      }
      var order = { id: "SC-" + (2949 + Math.floor(Math.random() * 50)), name: name.trim(), phone: "+216" + phone, city: gov, amount: price, product: p.productName || "Pack Barista", status: "new" };
      setDone(order);
      if (p.onSubmit) p.onSubmit(order);
    }
    if (done) {
      return h("div", { className: "sc-done", role: "status" },
        h("span", { className: "sc-done__badge" }, h(Icon, { name: "check", size: 36, strokeWidth: 3 })),
        h("p", { className: "sc-done__title" }, "Commande #" + done.id + " reçue 🚀"),
        h("p", { className: "sc-done__text" }, "Merci " + done.name.split(" ")[0] + " ! On t'envoie un message WhatsApp au " + done.phone.replace("+216", "+216 ") .replace(/(\d{2})(\d{3})(\d{3})$/, "$1 $2 $3") + "."),
        h("ol", { className: "sc-done__steps" },
          h("li", null, h("span", { className: "sc-done__num" }, "1"), "Réponds OUI sur WhatsApp pour confirmer."),
          h("li", null, h("span", { className: "sc-done__num" }, "2"), "Livraison à " + done.city + " sous 24 à 48 h."),
          h("li", null, h("span", { className: "sc-done__num" }, "3"), "Tu paies " + done.amount + " TND en espèces au livreur.")),
        p.whatsappNumber
          ? h(Button, { variant: "whatsapp", size: "md", block: true, icon: "whatsapp", href: "https://wa.me/" + p.whatsappNumber + "?text=" + encodeURIComponent(buildWhatsAppMessage(done)), target: "_blank", rel: "noopener" }, "Ouvrir WhatsApp")
          : null,
        p.onClose ? h(Button, { variant: "ghost", size: "md", block: true, onClick: p.onClose }, "Revenir à la page") : null);
    }
    return h("form", { ref: formRef, className: "sc-checkout", noValidate: true, onSubmit: submit },
      h("div", { className: "sc-order-sum" },
        h("span", { className: "sc-order-sum__icon" }, h(Icon, { name: "coffee", size: 22 })),
        h("div", null, h("p", { className: "sc-order-sum__name" }, p.productName || "Le Pack Barista"), h("p", { className: "sc-order-sum__meta" }, "Livraison gratuite · 24–48 h")),
        h("span", { className: "sc-order-sum__price" }, price + " TND")),
      h(TextField, { id: "sc-f-name", name: "name", label: "Nom & prénom", autoComplete: "name", placeholder: "Mohamed Ben Ali", value: name, error: show("name"), onValueChange: setName, onBlur: touch("name") }),
      h(PhoneInput, { id: "sc-f-phone", value: phone, error: show("phone"), onChange: setPhone, onBlur: touch("phone") }),
      h(GovernorateSelect, { id: "sc-f-gov", value: gov, error: show("gov"), onChange: function (v) { setGov(v); var t = Object.assign({}, touched); t.gov = true; setTouched(t); }, onBlur: touch("gov") }),
      h(Button, { type: "submit", variant: "primary", size: "xl", block: true }, "Confirmer ma commande 🚀"),
      h("p", { className: "sc-cod" }, h(Icon, { name: "banknote", size: 18 }), "* Pas de carte, paiement en espèces."));
  }

  /* ---------- Admin ---------- */
  function KpiCard(p) {
    var up = p.trend === "up";
    return h("div", { className: cx("sc-kpi", p.accent && "sc-kpi--accent") },
      h("div", { className: "sc-kpi__head" }, h("span", null, p.label), h("span", { className: "sc-kpi__icon" }, h(Icon, { name: p.icon || "trendUp", size: 18 }))),
      h("div", { className: "sc-kpi__value" }, p.value),
      p.delta ? h("div", { className: cx("sc-kpi__delta", p.good === false ? "sc-kpi__delta--down" : "sc-kpi__delta--up") },
        h(Icon, { name: up ? "trendUp" : "trendDown", size: 14 }), p.delta, h("span", null, p.period || " vs mois dernier")) : null);
  }

  var STATUS = {
    new: { label: "Nouvelle", lane: "Nouvelles", icon: "zap" },
    pending: { label: "En attente", lane: "En attente", icon: "clock" },
    confirmed: { label: "Confirmée", lane: "Confirmées", icon: "check" },
    shipped: { label: "Expédiée", lane: "Expédiées", icon: "truck" },
    returned: { label: "Retournée", lane: "Retournées", icon: "undo" }
  };
  function StatusBadge(p) {
    var s = STATUS[p.status] || STATUS.new;
    return h("span", { className: "sc-badge sc-badge--" + (p.status || "new") }, h(Icon, { name: s.icon, size: 12, strokeWidth: 2.5 }), s.label);
  }

  var ACTIONS = {
    new: { label: "WhatsApp", icon: "whatsapp", variant: "whatsapp", doneLabel: "Message prêt" },
    pending: { label: "Relancer", icon: "refresh", variant: "ghost", doneLabel: "Relancé" },
    confirmed: { label: "Imprimer", icon: "printer", variant: "dark", doneLabel: "Bon imprimé" }
  };

  function OrderCard(p) {
    var o = p.order;
    var s = useState(false), done = s[0], setDone = s[1];
    var act = ACTIONS[o.status];
    function run() {
      setDone(true); setTimeout(function () { setDone(false); }, 1800);
      if (p.onAction) p.onAction(o, o.status === "new" ? "whatsapp" : o.status === "pending" ? "remind" : "print", buildWhatsAppMessage(o));
    }
    return h("article", {
      className: cx("sc-order", p.dragging && "is-dragging"), tabIndex: 0, draggable: !!p.draggable,
      "aria-label": "Commande #" + o.id + ", " + o.name + ", " + o.amount + " TND, " + o.city + (p.draggable ? ". Flèches gauche et droite pour changer de colonne." : ""),
      onDragStart: p.onDragStart, onDragEnd: p.onDragEnd, onKeyDown: p.onKeyDown
    },
      h("div", { className: "sc-order__top" },
        p.draggable ? h("span", { className: "sc-order__grip" }, h(Icon, { name: "grip", size: 16 })) : null,
        h("span", { className: "sc-order__id" }, "#" + o.id),
        p.showStatus ? h(StatusBadge, { status: o.status }) : null,
        o.age ? h("span", { className: "sc-order__age" }, o.age) : null),
      h("p", { className: "sc-order__name" }, o.name),
      h("div", { className: "sc-order__meta" },
        h("span", { className: "sc-order__amount" }, o.amount + " TND"),
        h("span", null, h(Icon, { name: "pin", size: 14 }), o.city)),
      o.status === "shipped"
        ? h("span", { className: "sc-order__carrier" }, h(Icon, { name: "truck", size: 16 }), (o.carrier || "Yalidine") + (o.tracking ? " · " + o.tracking : ""))
        : act ? h("div", { className: "sc-order__actions" },
          h(Button, { size: "sm", variant: act.variant, icon: done ? "check" : act.icon, onClick: function (e) { e.stopPropagation(); run(); }, draggable: false }, done ? act.doneLabel : act.label)) : null);
  }

  var LANES = ["new", "pending", "confirmed", "shipped"];

  function KanbanBoard(p) {
    var s = useState(p.orders || SAMPLE_ORDERS), orders = s[0], setOrders = s[1];
    var d = useState(null), dragId = d[0], setDragId = d[1];
    var o = useState(null), over = o[0], setOver = o[1];
    var lanes = p.lanes || LANES;
    function move(id, status) {
      var next = orders.map(function (x) { return x.id === id ? Object.assign({}, x, { status: status }) : x; });
      setOrders(next);
      if (p.onMove) p.onMove(id, status, next);
    }
    function keyMove(order) {
      return function (e) {
        var i = lanes.indexOf(order.status);
        if (e.key === "ArrowRight" && i < lanes.length - 1) { e.preventDefault(); move(order.id, lanes[i + 1]); }
        if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); move(order.id, lanes[i - 1]); }
      };
    }
    return h("section", { className: "sc-boardwrap" },
      h("div", { className: "sc-board__head" },
        h("h2", { className: "sc-board__title" }, p.title || "Pipeline des commandes"),
        h("span", { className: "sc-board__hint" }, "Glisse une carte (ou ← → au clavier) pour changer son statut")),
      h("div", { className: "sc-board" }, lanes.map(function (lane) {
        var items = orders.filter(function (x) { return x.status === lane; });
        var counts = p.counts && p.counts[lane];
        return h("div", {
          key: lane, className: cx("sc-lane", over === lane && "is-over"), role: "list", "aria-label": STATUS[lane].lane,
          onDragOver: function (e) { e.preventDefault(); if (over !== lane) setOver(lane); },
          onDragLeave: function (e) { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); },
          onDrop: function (e) { e.preventDefault(); var id = e.dataTransfer.getData("text/plain") || dragId; if (id) move(id, lane); setOver(null); setDragId(null); }
        },
          h("div", { className: "sc-lane__head" },
            h("span", { className: "sc-lane__dot sc-lane__dot--" + lane }),
            h("span", { className: "sc-lane__name" }, STATUS[lane].lane),
            h("span", { className: "sc-lane__count" }, counts != null ? counts : items.length)),
          items.length === 0 ? h("div", { className: "sc-lane__empty" }, "Dépose une commande ici") : null,
          items.map(function (x) {
            return h("div", { key: x.id, role: "listitem" }, h(OrderCard, {
              order: x, draggable: true, dragging: dragId === x.id, onAction: p.onAction, onKeyDown: keyMove(x),
              onDragStart: function (e) { e.dataTransfer.setData("text/plain", x.id); e.dataTransfer.effectAllowed = "move"; setDragId(x.id); },
              onDragEnd: function () { setDragId(null); setOver(null); }
            }));
          }));
      })));
  }

  var SAMPLE_ORDERS = [
    { id: "2948", name: "M. Ben Ali", amount: 89, city: "Tunis", status: "new", age: "il y a 4 min" },
    { id: "2947", name: "K. Bouazizi", amount: 79, city: "Sfax", status: "new", age: "il y a 12 min" },
    { id: "2945", name: "R. Hammami", amount: 89, city: "Ariana", status: "new", age: "il y a 31 min" },
    { id: "2932", name: "S. Slimen", amount: 89, city: "Sousse", status: "pending", age: "il y a 3 h" },
    { id: "2929", name: "N. Jebali", amount: 89, city: "Monastir", status: "pending", age: "hier" },
    { id: "2911", name: "Y. Gharbi", amount: 168, city: "Tunis", status: "confirmed", age: "hier" },
    { id: "2908", name: "H. Mejri", amount: 89, city: "Nabeul", status: "confirmed", age: "hier" },
    { id: "2901", name: "A. Trabelsi", amount: 89, city: "Sousse", status: "shipped", carrier: "Yalidine", age: "2 j" }
  ];

  function AdminHeader(p) {
    return h("header", { className: "sc-adminbar" },
      h(Wordmark, { src: p.logoSrc, height: 36 }),
      h("span", { className: "sc-adminbar__tab" }, "Tableau de bord"),
      h("div", { className: "sc-adminbar__right" },
        h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, h(Icon, { name: "calendar", size: 16 }), p.period || "Nov. 2026"),
        h("span", { className: "sc-adminbar__user" }, h("span", { className: "sc-avatar" }, "AD"), p.user || "Admin")));
  }

  function AdminDashboard(p) {
    return h("div", { className: "sc-admin" },
      h(AdminHeader, { period: p.period, user: p.user, logoSrc: p.logoSrc }),
      h("main", { className: "sc-admin__body" },
        h("div", { className: "sc-kpis" },
          h(KpiCard, { label: "Commandes", value: "142", icon: "package", delta: "+18 %", trend: "up", accent: true }),
          h(KpiCard, { label: "Chiffre d'affaires", value: "12 638 TND", icon: "banknote", delta: "+11 %", trend: "up" }),
          h(KpiCard, { label: "Taux de retour", value: "8 %", icon: "undo", delta: "−2 pts", trend: "down", good: true })),
        h(KanbanBoard, { orders: p.orders, counts: p.counts, onAction: p.onAction, onMove: p.onMove })));
  }

  /* ---------- Landing (client, mobile) ---------- */
  var SAMPLE_REVIEWS = [
    { name: "Yasmine", city: "Sousse", text: "Livré en 24h à Sousse, top !", rating: 5 },
    { name: "Aziz", city: "Tunis", text: "Fini le café froid en TD.", rating: 5 },
    { name: "Ines", city: "Sfax", text: "Le thermos tient chaud toute la journée de stage.", rating: 4 }
  ];

  function LandingPage(p) {
    var s = useState(false), open = s[0], setOpen = s[1];
    var t = useState(false), sticky = t[0], setSticky = t[1];
    var price = p.price || 89;
    function onScroll(e) { var y = e.currentTarget.scrollTop; var next = y > 520 && !open; if (next !== sticky) setSticky(next); }
    function buy() { setSticky(false); setOpen(true); }
    var reviews = p.reviews || SAMPLE_REVIEWS;
    return h(MobileFrame, { height: p.height || 860 },
      h("div", { className: "sc-frame__scroll", onScroll: onScroll },
        h(Navbar, { count: 1, onCart: buy, logoSrc: p.logoSrc }),
        h("section", { className: "sc-hero" },
          h("p", { className: "sc-hero__kicker" }, h(Icon, { name: "zap", size: 14 }), "Pour les étudiants qui bossent dur"),
          h("h1", { className: "sc-hero__title" }, "Booste ta routine, ", h("em", null, "sauve ton budget")),
          h(StoryVideo, { src: p.videoSrc, poster: p.videoPoster, author: "Sarra K", handle: "@sarra.shift" })),
        h("section", { className: "sc-section" }, h(ProductCard, { price: price, onBuy: buy })),
        h("section", { className: "sc-section" },
          h("h2", { className: "sc-section__title" }, h(Icon, { name: "banknote", size: 22 }), "Calcule tes économies"),
          h(SavingsCalculator, { packPrice: price })),
        h("section", { className: "sc-section" },
          h("h2", { className: "sc-section__title" }, h(Icon, { name: "package", size: 22 }), "Qu'y a-t-il dans ton pack ?"),
          h(IncludedList)),
        h("section", { className: "sc-section" },
          h("h2", { className: "sc-section__title" }, "Ils ont choisi de changer"),
          h("div", { className: "sc-reviews" }, reviews.map(function (r, i) { return h(ReviewCard, Object.assign({ key: i }, r)); }))),
        h("section", { className: "sc-section", style: { paddingBottom: 112 } },
          h(Button, { variant: "primary", size: "xl", block: true, iconRight: "zap", onClick: buy }, "Obtenir mon pack"),
          h("p", { className: "sc-reassure", style: { marginTop: 16 } }, h(Icon, { name: "shield", size: 16 }), "Paiement en espèces à la livraison"))),
      h(StickyCta, { visible: sticky, price: price, onClick: buy }),
      h(BottomSheet, { open: open, onClose: function () { setOpen(false); }, title: "Finalise ta commande", subtitle: "Tu paies à la livraison" },
        open ? h(CheckoutForm, { price: price, whatsappNumber: p.whatsappNumber, onSubmit: p.onOrder, onClose: function () { setOpen(false); } }) : null));
  }

  var api = {
    Icon: Icon, Wordmark: Wordmark, Button: Button, Navbar: Navbar, MobileFrame: MobileFrame, StoryVideo: StoryVideo,
    PriceTag: PriceTag, ProductCard: ProductCard, SavingsCalculator: SavingsCalculator, IncludedList: IncludedList,
    ReviewCard: ReviewCard, StickyCta: StickyCta, BottomSheet: BottomSheet, TextField: TextField, PhoneInput: PhoneInput,
    GovernorateSelect: GovernorateSelect, CheckoutForm: CheckoutForm, KpiCard: KpiCard, StatusBadge: StatusBadge,
    OrderCard: OrderCard, KanbanBoard: KanbanBoard, AdminHeader: AdminHeader, AdminDashboard: AdminDashboard, LandingPage: LandingPage,
    utils: { formatTnPhone: formatTnPhone, validateTnPhone: validateTnPhone, buildWhatsAppMessage: buildWhatsAppMessage, savingsFor: savingsFor, GOVERNORATES: GOVERNORATES, SAMPLE_ORDERS: SAMPLE_ORDERS }
  };
  window.ShiftCart = Object.assign(window.ShiftCart || {}, api);
})();
