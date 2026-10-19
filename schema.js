// Shared schema-layer helpers for the grid (app.js) and the Schema tab (manage-fields.js):
// people, field-type icons, derived-field formulas, metadata formatting and Omni draft markup.
window.AT_SCHEMA = (() => {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // The prototype's "today", so staleness and tenure stay stable.
  const TODAY = "2026-10-19";

  const PEOPLE = {
    me: { name: "Timothée Issenmann", short: "You", team: "Ops", color: "#5b4636" },
    maria: { name: "Maria Lopez", team: "Finance", color: "#c2410c" },
    sam: { name: "Sam Okafor", team: "Sales Ops", color: "#1d4ed8" },
    lea: { name: "Léa Martin", team: "Customer Success", color: "#047857" },
    raj: { name: "Raj Patel", team: "Growth", color: "#7c3aed" },
    ben: { name: "Ben Carter", team: "Ops", color: "#6b7280", left: true },
    omni: { name: "Omni", team: "AI", color: "#7c37ef", ai: true },
  };
  const OWNER_IDS = ["maria", "sam", "lea", "raj", "me"];
  const person = (id) => PEOPLE[id] || null;
  const personName = (id, { you = true } = {}) => {
    const p = person(id);
    if (!p) return "";
    return id === "me" && you ? "You" : p.name;
  };
  const initials = (id) => (person(id)?.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
  function avatar(id, size = 20) {
    const p = person(id);
    if (!p) return "";
    if (p.ai) return `<span class="sx-avatar ai" style="width:${size}px;height:${size}px"><i class="ph-fill ph-sparkle"></i></span>`;
    return `<span class="sx-avatar${p.left ? " left" : ""}" style="width:${size}px;height:${size}px;background:${p.color};font-size:${Math.round(size * 0.45)}px">${esc(initials(id))}</span>`;
  }
  const personChip = (id, { team = false } = {}) => {
    const p = person(id);
    if (!p) return "";
    return `<span class="sx-person">${avatar(id)}<span class="sx-person-name">${esc(personName(id))}${team && p.team ? ` <span class="sx-muted">· ${esc(p.team)}</span>` : ""}${p.left ? ' <span class="sx-muted">(left)</span>' : ""}</span></span>`;
  };

  const ICONS = {
    text: '<svg class="fi" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 3.2 13.5h1.6l1.1-2.6h4.2l1.1 2.6h1.6L8 2.5Zm-1.5 7L8 5.8l1.5 3.7h-3Z" fill="currentColor"/></svg>',
    paragraph: '<i class="ph ph-text-align-left"></i>',
    email: '<i class="ph ph-envelope-simple"></i>',
    phone: '<i class="ph ph-phone"></i>',
    select: '<i class="ph ph-caret-circle-down"></i>',
    date: '<i class="ph ph-calendar-blank"></i>',
    currency: '<i class="ph ph-currency-dollar-simple"></i>',
    checkbox: '<i class="ph ph-check-square"></i>',
    formula: '<i class="ph ph-function"></i>',
  };
  const TYPE_LABEL = {
    singleLineText: "Single line text", multilineText: "Long text", email: "Email", phoneNumber: "Phone number",
    singleSelect: "Single select", date: "Date", currency: "Currency", checkbox: "Checkbox", formula: "Formula",
  };
  const fIcon = (f) => ICONS[f.icon] || ICONS.text;

  // Derived fields are computed from other cells, so they stay correct when the grid is edited.
  const COUNTRY_CODES = { France: "FR", "United States": "US", "United Kingdom": "GB", Germany: "DE", Japan: "JP", Canada: "CA", Italy: "IT", Spain: "ES", Netherlands: "NL", Australia: "AU" };
  const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
  const FORMULAS = {
    tenure: { text: "DATETIME_DIFF(TODAY(), {Signup Date}, 'days')", from: "Signup Date", fn: (r) => (r.signup ? daysBetween(r.signup, TODAY) : null) },
    countryCode: { text: "SWITCH({Country}, 'France', 'FR', 'United States', 'US', …)", from: "Country", fn: (r) => COUNTRY_CODES[r.country] || "" },
  };
  const isDerived = (f) => f.kind === "derived";
  const value = (rec, f) => (f.formula && FORMULAS[f.formula] ? FORMULAS[f.formula].fn(rec) : rec[f.key]);

  // ---------------------------------------------------------------- dates
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };
  const ageDays = (iso) => (iso ? daysBetween(iso, TODAY) : Infinity);
  // Verification older than six months is flagged as stale.
  const STALE_DAYS = 180;
  const isStale = (f) => !f.verified || ageDays(f.verified.at) > STALE_DAYS;
  function relative(iso) {
    const d = ageDays(iso);
    if (d === 0) return "today";
    if (d === 1) return "yesterday";
    if (d < 30) return `${d} days ago`;
    if (d < 365) { const m = Math.max(1, Math.round(d / 30)); return `${m} month${m === 1 ? "" : "s"} ago`; }
    const y = Math.floor(d / 365);
    return `${y} year${y === 1 ? "" : "s"} ago`;
  }

  // ---------------------------------------------------------------- status
  const STATUS = {
    canonical: { label: "Canonical", icon: "ph-fill ph-seal-check", cls: "canonical", help: "Holds real, up-to-date business data. Agents prefer this field." },
    deprecated: { label: "Deprecated", icon: "ph-fill ph-warning", cls: "deprecated", help: "Kept for history only. Hidden from new views and flagged to agents." },
  };
  function statusPill(status, { draft = false } = {}) {
    const s = STATUS[status];
    if (!s) return `<span class="sx-status none">Not reviewed</span>`;
    return `<span class="sx-status ${s.cls}${draft ? " draft" : ""}"><i class="${s.icon}"></i>${s.label}${draft ? "?" : ""}</span>`;
  }

  // ---------------------------------------------------------------- Omni drafts
  // A draft lives on the field next to the value it would fill: f.drafts = { purpose, status, owner }.
  const draftOf = (f, key) => f.drafts && f.drafts[key];
  const hasDrafts = (f) => !!(f.drafts && Object.keys(f.drafts).length);
  const aiMark = (title = "Drafted by Omni") => `<span class="sx-ai" data-tip="${esc(title)}"><i class="ph-fill ph-sparkle"></i></span>`;

  // ---------------------------------------------------------------- history & signals
  function log(f, by, action, detail) {
    f.history = f.history || [];
    f.history.unshift({ at: TODAY, by, action, detail });
    f.updated = { by, at: TODAY };
  }
  function fillRate(f, records) {
    if (!records.length) return 0;
    const filled = records.filter((r) => {
      const v = value(r, f);
      return !(v === null || v === undefined || v === "" || v === false);
    }).length;
    return Math.round((filled / records.length) * 100);
  }

  // Name similarity used to flag near-duplicate fields at creation time.
  const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  // Returns likely duplicates, best match first (same name > one name contains the other > shared words).
  function similarFields(name, fields, exclude) {
    const n = norm(name);
    if (n.length < 3) return [];
    const words = new Set(n.split(" ").filter((w) => w.length > 2));
    const scored = fields.map((f) => {
      if (f === exclude) return null;
      const m = norm(f.name);
      if (!m) return null;
      if (m === n) return [f, 3];
      if (m.includes(n) || n.includes(m)) return [f, 2];
      const mw = m.split(" ").filter((w) => w.length > 2);
      const overlap = mw.length ? mw.filter((w) => words.has(w)).length / Math.max(mw.length, words.size) : 0;
      return overlap >= 0.5 ? [f, overlap] : null;
    }).filter(Boolean);
    // Canonical fields win ties, since they're the ones to reuse
    scored.sort((a, b) => b[1] - a[1] || (b[0].status === "canonical") - (a[0].status === "canonical"));
    return scored.map(([f]) => f);
  }
  const firstSentence = (t) => (t || "").split(/(?<=\.)\s/)[0].replace(/\.$/, "");

  // ---------------------------------------------------------------- before / after mode
  // "before" = the plain Airtable clone, "after" = the schema-layer prototype. Stored per browser.
  const MODE_KEY = "at-clone-mode";
  let MODE = "after";
  try { MODE = localStorage.getItem(MODE_KEY) === "before" ? "before" : "after"; } catch (e) {}
  const after = MODE === "after";
  function mountModeSwitch() {
    const el = document.createElement("div");
    el.className = "mode-switch";
    el.setAttribute("role", "radiogroup");
    el.setAttribute("aria-label", "Prototype view");
    el.innerHTML = `<span class="ms-label">Prototype</span>
      <button role="radio" data-mode="before" aria-checked="${!after}" class="${after ? "" : "on"}" data-tip="Airtable as it is today">Before</button>
      <button role="radio" data-mode="after" aria-checked="${after}" class="${after ? "on" : ""}" data-tip="With the schema layer">After</button>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mode]");
      if (!b || b.dataset.mode === MODE) return;
      try { localStorage.setItem(MODE_KEY, b.dataset.mode); } catch (err) {}
      // The Schema tab doesn't exist before: its page becomes the plain field manager, so stay put.
      location.hash = "";
      location.reload();
    });
  }

  // ---------------------------------------------------------------- base status
  const BASE_STATUS = {
    production: { label: "Production", help: "Live system of record. Agents and automations rely on it." },
    draft: { label: "Draft", help: "Work in progress. Agents treat its data as unverified." },
    archived: { label: "Archived", help: "Read-only history. Hidden from agents by default." },
  };
  const baseStatusHTML = (st) => `<span class="dot ${st}"></span>${BASE_STATUS[st]?.label || st}`;

  return {
    MODE, after, mountModeSwitch,
    BASE_STATUS, baseStatusHTML,
    esc, TODAY, PEOPLE, OWNER_IDS, person, personName, avatar, personChip,
    ICONS, TYPE_LABEL, fIcon, FORMULAS, isDerived, value,
    fmtDate, relative, ageDays, isStale, STALE_DAYS,
    STATUS, statusPill, draftOf, hasDrafts, aiMark, log, fillRate, similarFields, firstSentence,
  };
})();
