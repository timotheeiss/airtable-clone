(() => {
  "use strict";

  const D = window.AT_DATA;
  const S = window.AT_SCHEMA;
  const { esc, fIcon, TYPE_LABEL } = S;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------------------------------------------------------------- state
  const fields = D.fields.map((f) => ({ width: 180, permission: "Editors and up", deps: 0, kind: "data", drafts: {}, history: [], automations: [], ...f }));
  const records = D.records;
  const state = {
    q: "",
    kind: "All",
    status: "All",
    owner: "All",
    sort: null, // {col, dir}
    selected: new Set(),
    // Before = Airtable's own field manager columns; After = the schema-layer columns
    cols: S.after
      ? { type: true, status: true, owner: true, purpose: true, verified: true, dependencies: true, permission: false, example: false, fieldId: false, createdBy: false, modifiedBy: false }
      : { type: true, purpose: true, example: false, permission: true, fieldId: false, createdBy: false, modifiedBy: false, dependencies: true },
    perm: "All", // Before-mode filters
    dep: "All",
    editing: null, // {id, what: 'name'|'purpose'}
    panel: null, // {id, tab: 'overview'|'history'|'dependencies'}
    panelEditPurpose: false,
    contextOpen: true,
    editingBasePurpose: false,
  };
  const save = () => D.save({ fields, records, base: D.base });
  const fieldById = (id) => fields.find((f) => f.id === id);
  const isPrimary = (f) => fields[0] === f;
  const ME = "me";

  const AFTER_COLS = [
    { key: "name", label: "Name", width: "minmax(190px, 1.1fr)" },
    { key: "type", label: "Field type", width: "168px" },
    { key: "status", label: "Status", width: "132px" },
    { key: "owner", label: "Owner", width: "150px" },
    { key: "purpose", label: "Purpose", width: "minmax(200px, 1.6fr)" },
    { key: "verified", label: "Last verified", width: "128px" },
    { key: "permission", label: "Field permissions", width: "161px" },
    { key: "example", label: "Example value", width: "180px" },
    { key: "fieldId", label: "Field ID", width: "170px" },
    { key: "createdBy", label: "Created By", width: "170px" },
    { key: "modifiedBy", label: "Last Modified By", width: "170px" },
    { key: "dependencies", label: "Dependencies", width: "minmax(120px, 0.8fr)" },
  ];
  const BEFORE_COLS = [
    { key: "name", label: "Name", width: "301px" },
    { key: "type", label: "Field type", width: "236px" },
    { key: "purpose", label: "Description", width: "194px" },
    { key: "example", label: "Example value", width: "200px" },
    { key: "permission", label: "Field permissions", width: "161px" },
    { key: "fieldId", label: "Field ID", width: "170px" },
    { key: "createdBy", label: "Created By", width: "170px" },
    { key: "modifiedBy", label: "Last Modified By", width: "170px" },
    { key: "dependencies", label: "Dependencies", width: "minmax(130px, 1fr)" },
  ];
  const COLS = S.after ? AFTER_COLS : BEFORE_COLS;
  // With the side panel open only the essentials stay, like Airtable dropping columns next to its panel.
  const PANEL_COLS = S.after ? ["name", "status", "owner"] : ["name", "type", "permission", "dependencies"];
  const showCol = (key) => key === "name" || (state.panel ? PANEL_COLS.includes(key) : state.cols[key]);
  const PERMS = ["Editors and up", "Creators and up", "Specific users", "Nobody"];
  const STATUS_FILTERS = ["All", "Canonical", "Deprecated", "Not reviewed", "Omni drafts", "Needs verification"];
  const KIND_FILTERS = ["All", "Data", "Derived"];

  // ---------------------------------------------------------------- toast / tooltip / popovers
  const toastEl = $("#toast");
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }
  const tip = $("#tooltip");
  let tipT;
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-tip]");
    clearTimeout(tipT);
    if (!t) { tip.classList.remove("show"); return; }
    tipT = setTimeout(() => {
      tip.textContent = t.dataset.tip;
      tip.classList.add("show");
      const r = t.getBoundingClientRect();
      tip.style.left = Math.max(6, Math.min(r.left + r.width / 2 - tip.offsetWidth / 2, innerWidth - tip.offsetWidth - 6)) + "px";
      tip.style.top = (r.bottom + 6 + tip.offsetHeight > innerHeight ? r.top - tip.offsetHeight - 6 : r.bottom + 6) + "px";
    }, 350);
  });
  document.addEventListener("mousedown", () => { clearTimeout(tipT); tip.classList.remove("show"); });

  const layer = $("#layer");
  let openPop = null;
  function closePop() {
    if (!openPop) return;
    openPop.el.remove();
    openPop.anchor?.classList?.remove("open");
    openPop = null;
  }
  function showPop(html, anchor, { cls = "", align = "left", width, x, y } = {}) {
    closePop();
    const el = document.createElement("div");
    el.className = "pop " + cls;
    el.innerHTML = html;
    if (width) el.style.width = width + "px";
    layer.appendChild(el);
    const r = anchor?.getBoundingClientRect?.();
    let left = x ?? (r ? (align === "right" ? r.right - el.offsetWidth : r.left) : 0);
    let top = y ?? (r ? r.bottom + 4 : 0);
    left = Math.max(8, Math.min(left, innerWidth - el.offsetWidth - 8));
    if (top + el.offsetHeight > innerHeight - 8) top = Math.max(8, r && y === undefined ? r.top - el.offsetHeight - 4 : innerHeight - el.offsetHeight - 8);
    el.style.left = left + "px";
    el.style.top = top + "px";
    anchor?.classList?.add("open");
    openPop = { el, anchor };
    return el;
  }
  document.addEventListener("mousedown", (e) => {
    if (!openPop || openPop.el.contains(e.target) || openPop.anchor?.contains?.(e.target)) return;
    closePop();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (openPop) closePop();
    else if (state.panel && !e.target.closest?.("input, textarea")) { state.panel = null; render(); }
  });
  function showMenu(items, anchor, opts = {}) {
    const html = items.map((it) => {
      if (it === "-") return '<div class="menu-sep"></div>';
      if (it.html) return it.html;
      return `<button class="menu-item${it.danger ? " danger" : ""}${it.disabled ? " disabled" : ""}${it.desc ? " tall" : ""}" data-mi="${esc(it.id)}">${it.check !== undefined ? `<i class="ph ph-check chk-slot" style="visibility:${it.check ? "visible" : "hidden"}"></i>` : ""}${it.iconHTML || (it.icon ? `<i class="ph ${it.icon}"></i>` : "")}<span>${esc(it.label)}${it.desc ? `<span class="desc">${esc(it.desc)}</span>` : ""}</span></button>`;
    }).join("");
    const el = showPop(html, anchor, { cls: "menu", ...opts });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mi]");
      if (!b) return;
      const it = items.find((i) => i.id === b.dataset.mi);
      closePop();
      it?.run?.();
    });
    return el;
  }
  // Searchable single-choice dropdown ("Find an option"), as in Airtable's field manager.
  function optionPop(anchor, options, current, onPick, { width, labels = {} } = {}) {
    let active = Math.max(0, options.indexOf(current));
    const label = (o) => labels[o] || o;
    const list = (q) => options.filter((o) => label(o).toLowerCase().includes(q.toLowerCase()));
    const draw = (q = "") => list(q).map((o, i) => `<div class="opt-row${o === current ? " current" : ""}${i === active ? " kbd-active" : ""}" data-v="${esc(o)}">${esc(label(o))}</div>`).join("") || `<div class="opt-empty">No options</div>`;
    const r = anchor.getBoundingClientRect();
    const el = showPop(`<input class="opt-find" placeholder="Find an option" /><div class="opt-list">${draw()}</div>`, anchor, { cls: "opt-pop", width: width || Math.max(r.width, 150) });
    const input = $(".opt-find", el), body = $(".opt-list", el);
    input.focus();
    input.addEventListener("input", () => { active = 0; body.innerHTML = draw(input.value); });
    input.addEventListener("keydown", (e) => {
      const opts = list(input.value);
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(opts.length - 1, active + 1); body.innerHTML = draw(input.value); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); body.innerHTML = draw(input.value); }
      else if (e.key === "Enter" && opts[active]) { e.preventDefault(); closePop(); onPick(opts[active]); }
    });
    body.addEventListener("click", (e) => {
      const o = e.target.closest("[data-v]");
      if (!o) return;
      closePop();
      onPick(o.dataset.v);
    });
  }
  function confirmPop(title, body, onYes) {
    const el = showPop(`<div style="width:340px"><div style="font-weight:600;font-size:15px;margin-bottom:6px">${esc(title)}</div><div style="color:var(--text-subtle);margin-bottom:16px">${esc(body)}</div><div style="display:flex;justify-content:flex-end;gap:8px"><button class="link-btn" data-no>Cancel</button><button class="btn-share" style="background:rgb(220,4,59)" data-yes>Delete</button></div></div>`, null, { x: innerWidth / 2 - 182, y: innerHeight / 3 });
    $("[data-no]", el).onclick = closePop;
    $("[data-yes]", el).onclick = () => { closePop(); onYes(); };
  }

  // ---------------------------------------------------------------- metadata changes (each one is logged)
  const STATUS_WORD = { canonical: "Canonical", deprecated: "Deprecated" };
  function setStatus(list, status, { fromDraft = false } = {}) {
    list.forEach((f) => {
      if (f.status === status && !fromDraft) return;
      f.status = status;
      if (f.drafts) delete f.drafts.status;
      S.log(f, ME, "status", `Status set to ${STATUS_WORD[status]}${fromDraft ? " (Omni draft approved)" : ""}`);
    });
    save();
    render();
  }
  function setOwner(list, owner, { fromDraft = false } = {}) {
    list.forEach((f) => {
      if (f.owner === owner && !fromDraft) return;
      f.owner = owner;
      if (f.drafts) delete f.drafts.owner;
      S.log(f, ME, "owner", `Owner set to ${S.person(owner).name}${fromDraft ? " (Omni draft approved)" : ""}`);
    });
    save();
    render();
  }
  function setPurpose(f, text, { fromDraft = false, edited = false } = {}) {
    const v = text.trim();
    if ((f.description || "") === v && !fromDraft) return;
    f.description = v || undefined;
    if (f.drafts) delete f.drafts.purpose;
    S.log(f, ME, "description", fromDraft ? (edited ? "Purpose written from an Omni draft, with edits" : "Purpose set from Omni draft") : v ? "Purpose edited" : "Purpose cleared");
    save();
    render();
  }
  function verify(list) {
    list.forEach((f) => {
      f.verified = { by: ME, at: S.TODAY };
      S.log(f, ME, "verified", "Marked as verified");
    });
    save();
    render();
    toast(list.length === 1 ? `“${list[0].name}” marked as verified` : `${list.length} fields marked as verified`);
  }
  function dismissDraft(f, key) {
    if (f.drafts) delete f.drafts[key];
    save();
    render();
    toast("Omni draft dismissed");
  }
  function acceptDraft(f, key) {
    const d = S.draftOf(f, key);
    if (!d) return;
    if (key === "status") setStatus([f], d.value, { fromDraft: true });
    else if (key === "owner") setOwner([f], d.value, { fromDraft: true });
    else if (key === "purpose") setPurpose(f, d.value, { fromDraft: true });
  }

  // Status / owner pickers, with the Omni draft surfaced at the top when there is one.
  function statusMenu(f, anchor) {
    const d = S.draftOf(f, "status");
    const items = [];
    if (d) {
      items.push({ html: `<div class="draft-why">${S.aiMark()}<span><b>Omni suggests ${esc(STATUS_WORD[d.value])}.</b> ${esc(d.reason)}</span></div>` });
      items.push({ id: "accept", label: `Accept: ${STATUS_WORD[d.value]}`, iconHTML: `<i class="ph ph-check" style="color:var(--blue)"></i>`, run: () => acceptDraft(f, "status") });
      items.push({ id: "dismiss", label: "Dismiss suggestion", icon: "ph-x", run: () => dismissDraft(f, "status") });
      items.push("-");
    }
    Object.entries(S.STATUS).forEach(([k, st]) => items.push({ id: k, label: st.label, desc: st.help, check: f.status === k, run: () => setStatus([f], k) }));
    showMenu(items, anchor, { width: 300 });
  }
  function ownerMenu(f, anchor) {
    const d = S.draftOf(f, "owner");
    const items = [];
    if (d) {
      items.push({ html: `<div class="draft-why">${S.aiMark()}<span><b>Omni suggests ${esc(S.person(d.value).name)}.</b> ${esc(d.reason)}</span></div>` });
      items.push({ id: "accept", label: `Accept: ${S.person(d.value).name}`, iconHTML: `<i class="ph ph-check" style="color:var(--blue)"></i>`, run: () => acceptDraft(f, "owner") });
      items.push({ id: "dismiss", label: "Dismiss suggestion", icon: "ph-x", run: () => dismissDraft(f, "owner") });
      items.push("-");
    }
    S.OWNER_IDS.forEach((id) => items.push({ id, label: S.person(id).name, desc: S.person(id).team, check: f.owner === id, iconHTML: S.avatar(id), run: () => setOwner([f], id) }));
    showMenu(items, anchor, { width: 260 });
  }

  // ---------------------------------------------------------------- derived rows
  const exampleValue = (f) => {
    const r = records.find((rec) => { const v = S.value(rec, f); return v !== "" && v !== null && v !== undefined && v !== false; });
    if (!r) return "";
    const v = S.value(r, f);
    if (f.type === "currency") return `${f.symbol || "€"}${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (f.type === "checkbox") return "checked";
    return String(v);
  };
  const statusKey = (f) => f.status || (S.draftOf(f, "status") ? "zdraft" : "zz");
  function rows() {
    const q = state.q.trim().toLowerCase();
    let list = fields.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q) && !(f.description || "").toLowerCase().includes(q)) return false;
      if (state.kind === "Data" && f.kind === "derived") return false;
      if (state.kind === "Derived" && f.kind !== "derived") return false;
      if (state.status === "Canonical" && f.status !== "canonical") return false;
      if (state.status === "Deprecated" && f.status !== "deprecated") return false;
      if (state.status === "Not reviewed" && f.status) return false;
      if (state.status === "Omni drafts" && !S.hasDrafts(f)) return false;
      if (state.status === "Needs verification" && (f.status === "deprecated" || !S.isStale(f))) return false;
      if (state.owner !== "All" && f.owner !== state.owner) return false;
      if (state.perm !== "All" && f.permission !== state.perm) return false;
      if (state.dep === "Interfaces" && !f.deps) return false;
      if (state.dep === "Automations" && !f.automations?.length) return false;
      if (!["All", "Interfaces", "Automations"].includes(state.dep)) return false;
      return true;
    });
    const primaryField = fields[0];
    const val = (f, col) => ({
      name: f.name, type: TYPE_LABEL[f.type] || f.type, status: statusKey(f), owner: f.owner ? S.person(f.owner).name : "~",
      purpose: f.description || "~", verified: f.verified?.at || "", permission: f.permission, example: exampleValue(f), fieldId: f.id,
      createdBy: f.created?.at || "", modifiedBy: f.updated?.at || "", dependencies: (f.deps || 0) + (f.automations?.length || 0),
    }[col]);
    if (state.sort) {
      const { col, dir } = state.sort;
      list = list.slice().sort((a, b) => {
        const va = val(a, col), vb = val(b, col);
        const c = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), undefined, { sensitivity: "base" });
        return dir === "asc" ? c : -c;
      });
    } else {
      // Default order: primary field pinned first, then alphabetical
      const rest = list.filter((f) => f !== primaryField).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      list = (list.includes(primaryField) ? [primaryField] : []).concat(rest);
    }
    return list;
  }

  // ---------------------------------------------------------------- cells
  function statusCell(f) {
    if (f.status) return `<button class="sx-cellbtn" data-act="status">${S.statusPill(f.status)}</button>`;
    const d = S.draftOf(f, "status");
    if (d) return `<button class="sx-cellbtn" data-act="status" data-tip="${esc("Omni: " + d.reason)}">${S.statusPill(d.value, { draft: true })}</button>`;
    return `<button class="sx-cellbtn" data-act="status">${S.statusPill(null)}</button>`;
  }
  function ownerCell(f) {
    if (f.owner) return `<button class="sx-cellbtn" data-act="owner">${S.personChip(f.owner)}</button>`;
    const d = S.draftOf(f, "owner");
    if (d) return `<button class="sx-cellbtn draft-owner" data-act="owner" data-tip="${esc("Omni: " + d.reason)}">${S.avatar(d.value)}<span>${esc(S.person(d.value).name)}?</span>${S.aiMark()}</button>`;
    return `<button class="sx-cellbtn sx-add" data-act="owner"><i class="ph ph-user-plus"></i>Add owner</button>`;
  }
  function purposeCell(f) {
    if (!S.after) {
      if (state.editing?.id === f.id && state.editing.what === "purpose") return `<textarea class="fm-inline" data-edit="purpose" placeholder="Describe this field">${esc(f.description || "")}</textarea>`;
      return `<button class="fm-desc" data-act="purpose" aria-label="Click to edit field description">${esc(f.description || "")}</button>`;
    }
    if (state.editing?.id === f.id && state.editing.what === "purpose") {
      const d = S.draftOf(f, "purpose");
      return `<textarea class="fm-inline" data-edit="purpose" placeholder="What does this field hold, and when should it be used?">${esc(f.description || d?.value || "")}</textarea>`;
    }
    if (f.description) return `<button class="fm-desc" data-act="purpose" aria-label="Click to edit purpose">${esc(f.description)}</button>`;
    const d = S.draftOf(f, "purpose");
    if (d) {
      return `<div class="draft-inline">
        <button class="fm-desc draft" data-act="purpose" data-tip="Omni draft — click to edit before approving">${S.aiMark()}${esc(d.value)}</button>
        <span class="draft-actions"><button data-act="acceptPurpose" data-tip="Approve draft"><i class="ph-bold ph-check"></i></button><button data-act="dismissPurpose" data-tip="Dismiss draft"><i class="ph-bold ph-x"></i></button></span>
      </div>`;
    }
    return `<button class="fm-desc" data-act="purpose" aria-label="Click to edit purpose"><span class="placeholder">Add purpose</span></button>`;
  }
  function verifiedCell(f) {
    const verifyBtn = `<button class="sx-verify" data-act="verify" data-tip="Mark as verified"><i class="ph ph-check-circle"></i></button>`;
    if (!f.verified) return `<span class="sx-verified never">Never</span>${verifyBtn}`;
    const stale = S.isStale(f);
    return `<span class="sx-verified${stale ? " stale" : ""}" data-tip="${esc(`Verified by ${S.personName(f.verified.by)}, ${S.relative(f.verified.at)}${stale ? " — older than 6 months" : ""}`)}">${stale ? '<i class="ph ph-clock-countdown"></i>' : ""}${S.fmtDate(f.verified.at)}</span>${verifyBtn}`;
  }
  function depsCell(f) {
    const out = [];
    if (f.deps) out.push(`<button class="fm-dep" data-act="deps">${f.deps} Interface${f.deps === 1 ? "" : "s"}</button>`);
    if (f.automations?.length) out.push(`<button class="fm-dep" data-act="deps">${f.automations.length} Automation${f.automations.length === 1 ? "" : "s"}</button>`);
    return `<span class="dep-pills">${out.join("")}</span>`;
  }
  function cellFor(key, f) {
    switch (key) {
      case "type": return `<button class="fm-type" data-act="config" aria-label="Edit field configuration">${fIcon(f)}<span>${esc(TYPE_LABEL[f.type] || f.type)}</span>${S.after && f.kind === "derived" ? '<span class="sx-derived">Derived</span>' : ""}</button>`;
      case "status": return statusCell(f);
      case "owner": return ownerCell(f);
      case "purpose": return purposeCell(f);
      case "verified": return verifiedCell(f);
      case "permission": return `<button class="fm-perm" data-act="perm"><span>${esc(f.permission)}</span><i class="ph ph-caret-down"></i></button>`;
      case "example": { const v = exampleValue(f); return `<span class="fm-muted-val">${f.type === "singleSelect" && v ? `<span class="pill c-${f.choices.find((c) => c.name === v)?.color || "grayLight2"}">${esc(v)}</span>` : esc(v)}</span>`; }
      case "fieldId": return `<button class="fm-id" data-act="copyid" data-tip="Copy field ID">${esc(f.id)}</button>`;
      case "createdBy": return f.created ? `<span class="fm-user" data-tip="${esc(S.fmtDate(f.created.at))}">${S.personChip(f.created.by)}</span>` : "";
      case "modifiedBy": return f.updated ? `<span class="fm-user" data-tip="${esc(S.fmtDate(f.updated.at))}">${S.personChip(f.updated.by)}</span>` : "";
      case "dependencies": return depsCell(f);
      default: return "";
    }
  }

  // ---------------------------------------------------------------- render
  const table = $("#fmTable");
  const panel = $("#fmPanel");
  function render() {
    const visCols = COLS.filter((c) => showCol(c.key));
    table.style.setProperty("--fm-cols", ["64px", ...visCols.map((c) => (state.panel && c.key === "name" ? "minmax(170px, 1fr)" : c.width)), "56px"].join(" "));
    const list = rows();
    const nSel = list.filter((f) => state.selected.has(f.id)).length;
    const allState = nSel === 0 ? "" : nSel === list.length ? "on" : "mixed";

    let h = `<div class="fm-row head" role="row">
      <div class="fm-cell check"><button class="fm-cbx ${allState}" data-act="all" role="checkbox" aria-checked="${allState === "on"}" aria-label="Select all ${list.length} selectable rows"><i class="ph-bold ph-check"></i></button></div>
      ${visCols.map((c) => {
        const on = state.sort?.col === c.key;
        return `<div class="fm-cell${c.key === "name" ? " name-head" : ""}"><button class="fm-sort${on ? " on" : ""}" data-sort="${c.key}">${c.label}<i class="ph ph-arrow-${on && state.sort.dir === "desc" ? "down" : "up"}"></i></button></div>`;
      }).join("")}
      <div class="fm-cell actions"><button class="fm-colvis" id="colVis" aria-label="Toggle column visibility"><i class="ph ph-sliders-horizontal"></i></button></div>
    </div>`;

    if (!list.length) h += `<div class="fm-empty">No fields match your filters<br><button data-act="reset">Clear filters</button></div>`;
    for (const f of list) {
      const prim = isPrimary(f);
      const sel = state.selected.has(f.id);
      const dep = S.after && f.status === "deprecated";
      const editingName = state.editing?.id === f.id && state.editing.what === "name";
      h += `<div class="fm-row data${sel ? " selected" : ""}${state.panel?.id === f.id ? " active" : ""}${dep ? " deprecated" : ""}" data-id="${f.id}" role="row">
        <div class="fm-cell check"><button class="fm-cbx ${sel ? "on" : ""}" data-act="sel" role="checkbox" aria-checked="${sel}" aria-label="Select this row"><i class="ph-bold ph-check"></i></button></div>
        <div class="fm-cell">${dep ? '<i class="ph-fill ph-warning sx-dep-icon" data-tip="Deprecated"></i>' : ""}${editingName ? `<input class="fm-inline" data-edit="name" value="${esc(f.name)}" />` : `<button class="fm-name" data-act="rename" aria-label="Click to rename">${esc(f.name)}</button>`}${prim ? '<span class="fm-primary">Primary field</span>' : ""}</div>
        ${visCols.slice(1).map((c) => `<div class="fm-cell c-${c.key}">${cellFor(c.key, f)}</div>`).join("")}
        <div class="fm-cell actions"><button class="fm-more" data-act="more" aria-label="Actions"><i class="ph ph-dots-three"></i></button></div>
      </div>`;
    }
    table.innerHTML = h;

    // toolbar: filters & bulk actions
    const setFilter = (id, v) => { const b = $(id); $("b", b).textContent = v; b.classList.toggle("active", v !== "All"); };
    setFilter("#permFilter", state.perm);
    setFilter("#depFilter", state.dep);
    setFilter("#kindFilter", state.kind);
    setFilter("#statusFilter", state.status);
    setFilter("#ownerFilter", state.owner === "All" ? "All" : S.person(state.owner).name);
    $$(".fm-filter").forEach((b) => (b.hidden = !!state.panel));
    const n = state.selected.size;
    $("#fmBulk").hidden = n === 0;
    $(".fm-tools-default").hidden = n > 0;
    $("#fmBulkCount").textContent = `${n} field${n === 1 ? "" : "s"} selected`;
    $("#bulkDelete span").textContent = `Delete ${n === 1 ? "field" : n + " fields"}`;

    renderContext();
    renderBaseStatus();
    renderPanel();
    const ed = $("[data-edit]", table);
    if (ed) { ed.focus(); if (ed.tagName === "INPUT") ed.select(); else ed.setSelectionRange(ed.value.length, ed.value.length); }
  }
  // ---------------------------------------------------------------- base context
  // Everything except the purpose, owner and status is derived live from field metadata,
  // so the context can't drift from the schema the way a hand-written guide would.
  const ctxChips = (list, cls = "") => list.map((f) => `<button class="ctx-chip ${cls}" data-ctx-field="${f.id}">${f.status === "deprecated" ? '<i class="ph-fill ph-warning"></i>' : ""}${esc(f.name)}</button>`).join("");
  function renderContext() {
    if (!S.after) return;
    const el = $("#fmContext");
    const b = D.base;
    const canonical = fields.filter((f) => f.status === "canonical");
    const deprecated = fields.filter((f) => f.status === "deprecated");
    const drafts = fields.filter((f) => S.hasDrafts(f));
    const unreviewed = fields.filter((f) => !f.status);
    const stale = fields.filter((f) => f.status !== "deprecated" && S.isStale(f));
    const derived = fields.filter((f) => f.kind === "derived");
    const toReview = new Set([...drafts, ...unreviewed, ...stale]).size;
    if (!state.contextOpen) {
      el.innerHTML = `<button class="ctx-collapsed" data-ctx-toggle><i class="ph ph-caret-right"></i><b>Base context</b><span class="ctx-oneline">${esc(S.firstSentence(b.purpose))}.</span>
        <span class="ctx-pill-count">${canonical.length} canonical</span>${deprecated.length ? `<span class="ctx-pill-count dep">${deprecated.length} deprecated</span>` : ""}${toReview ? `<span class="ctx-pill-count review">${toReview} to review</span>` : ""}</button>`;
      return;
    }
    const purpose = state.editingBasePurpose
      ? `<textarea class="ctx-purpose-edit" data-ctx-purpose>${esc(b.purpose)}</textarea>
         <div class="fp-edit-actions"><button class="cfg-cancel" data-ctx-cancel>Cancel</button><button class="cfg-save" data-ctx-save>Save</button></div>`
      : `<button class="ctx-purpose" data-ctx-edit data-tip="Click to edit">${esc(b.purpose)}</button>`;
    const MAX = 8;
    const showAll = state.ctxShowAllCanonical;
    el.innerHTML = `
      <div class="ctx-head">
        <button class="ctx-title" data-ctx-toggle><i class="ph ph-caret-down"></i>Base context</button>
        <span class="sx-muted ctx-sub">What this base is for and which fields to trust — shared with people and agents</span>
      </div>
      <div class="ctx-body">
        <div class="ctx-left">
          <div class="ctx-label">Purpose</div>
          ${purpose}
          <div class="ctx-meta">
            <span>Owner <button class="ctx-owner" data-ctx-owner>${S.personChip(b.owner, { team: true })}<i class="ph ph-caret-down"></i></button></span>
            <span>Status <button class="base-status" data-ctx-status>${S.baseStatusHTML(b.status)}</button></span>
            <span class="sx-muted">Updated ${S.fmtDate(b.updated.at)} by ${esc(S.personName(b.updated.by))}</span>
          </div>
        </div>
        <div class="ctx-right">
          <div class="ctx-row"><span class="ctx-label">Tables</span><div>
            <span class="ctx-table"><b>${esc(D.table.name)}</b><span class="sx-canon-table"><i class="ph-fill ph-seal-check"></i>Canonical source for ${esc(D.table.canonicalFor.toLowerCase())}</span><span class="sx-muted">${fields.length} fields · ${derived.length} derived · owner ${esc(S.personName(D.table.owner))}</span></span>
          </div></div>
          <div class="ctx-row"><span class="ctx-label">Canonical fields <span class="ctx-n">${canonical.length}</span></span><div class="ctx-chips">
            ${ctxChips(showAll ? canonical : canonical.slice(0, MAX), "canon")}${canonical.length > MAX ? `<button class="ctx-more" data-ctx-more>${showAll ? "Show less" : `+${canonical.length - MAX} more`}</button>` : ""}
          </div></div>
          <div class="ctx-row"><span class="ctx-label">Deprecated <span class="ctx-n">${deprecated.length}</span></span><div class="ctx-chips">
            ${deprecated.length ? ctxChips(deprecated, "dep") : '<span class="sx-muted">None yet</span>'}
          </div></div>
          <div class="ctx-row"><span class="ctx-label">Needs review</span><div class="ctx-chips">
            ${drafts.length ? `<button class="ctx-review" data-ctx-filter="Omni drafts">${S.aiMark()}${drafts.length} field${drafts.length === 1 ? "" : "s"} with Omni drafts</button>` : ""}
            ${unreviewed.length ? `<button class="ctx-review" data-ctx-filter="Not reviewed">${unreviewed.length} without a status</button>` : ""}
            ${stale.length ? `<button class="ctx-review stale" data-ctx-filter="Needs verification"><i class="ph ph-clock-countdown"></i>${stale.length} not verified in 6 months</button>` : ""}
            ${!drafts.length && !unreviewed.length && !stale.length ? '<span class="sx-muted">All caught up</span>' : ""}
          </div></div>
        </div>
      </div>`;
    const ta = $("[data-ctx-purpose]", el);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  $("#fmContext").addEventListener("click", (e) => {
    const t = (sel) => e.target.closest(sel);
    const b = D.base;
    if (t("[data-ctx-toggle]")) { state.contextOpen = !state.contextOpen; state.editingBasePurpose = false; renderContext(); return; }
    if (t("[data-ctx-more]")) { state.ctxShowAllCanonical = !state.ctxShowAllCanonical; renderContext(); return; }
    if (t("[data-ctx-field]")) { const f = fieldById(t("[data-ctx-field]").dataset.ctxField); openPanel(f); flash(f.id); return; }
    if (t("[data-ctx-filter]")) { state.status = t("[data-ctx-filter]").dataset.ctxFilter; state.panel = null; render(); toast(`Showing: ${state.status}`); return; }
    if (t("[data-ctx-edit]")) { state.editingBasePurpose = true; renderContext(); return; }
    if (t("[data-ctx-cancel]")) { state.editingBasePurpose = false; renderContext(); return; }
    if (t("[data-ctx-save]")) {
      const v = $("[data-ctx-purpose]").value.trim();
      state.editingBasePurpose = false;
      if (v && v !== b.purpose) { b.purpose = v; b.updated = { by: ME, at: S.TODAY }; save(); toast("Base purpose updated"); }
      renderContext();
      return;
    }
    if (t("[data-ctx-owner]")) {
      showMenu(S.OWNER_IDS.map((id) => ({ id, label: S.person(id).name, desc: S.person(id).team, check: b.owner === id, iconHTML: S.avatar(id), run: () => {
        b.owner = id; b.updated = { by: ME, at: S.TODAY }; save(); render(); toast(`Base owner set to ${S.person(id).name}`);
      } })), t("[data-ctx-owner]"), { width: 240 });
      return;
    }
    if (t("[data-ctx-status]")) { $("#baseStatus").click(); }
  });
  $("#fmContext").addEventListener("keydown", (e) => {
    if (!e.target.matches("[data-ctx-purpose]")) return;
    if (e.key === "Escape") { e.stopPropagation(); state.editingBasePurpose = false; renderContext(); }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("[data-ctx-save]").click();
  });
  function renderBaseStatus() {
    $("#baseStatus").innerHTML = S.baseStatusHTML(D.base.status);
  }

  // ---------------------------------------------------------------- field detail panel
  function renderPanel() {
    const f = state.panel && fieldById(state.panel.id);
    panel.hidden = !f;
    $(".fm").classList.toggle("with-panel", !!f);
    if (!f) return;
    if (!S.after) {
      // Airtable's own dependencies panel
      const n = (f.deps || 0) + (f.automations?.length || 0);
      panel.innerHTML = `
        <div class="fp-head"><h2>${n ? `${n} dependenc${n === 1 ? "y" : "ies"}` : "No dependencies"} for ${esc(f.name)}</h2><button class="fp-close" data-close aria-label="Close"><i class="ph ph-x"></i></button></div>
        <div class="fp-body">${dependenciesHTML(f)}</div>
        <div class="fp-foot"><i class="ph ph-warning"></i><span>Changes made to these dependencies as a result of deleting this field cannot be undone.</span>
          <button class="fp-delete" data-del ${isPrimary(f) ? 'disabled data-tip="The primary field can\'t be deleted"' : ""}>Delete field</button></div>`;
      return;
    }
    const tab = state.panel.tab;
    const nDeps = (f.deps || 0) + (f.automations?.length || 0);
    panel.innerHTML = `
      <div class="fp-head fp-head-field">
        <div class="fp-title">${fIcon(f)}<h2>${esc(f.name)}</h2>${f.kind === "derived" ? '<span class="sx-derived">Derived</span>' : ""}</div>
        <button class="fp-close" data-close aria-label="Close"><i class="ph ph-x"></i></button>
      </div>
      <div class="fp-tabs" role="tablist">
        ${[["overview", "Overview"], ["history", `History <span class="fp-count">${f.history.length}</span>`], ["dependencies", `Dependencies <span class="fp-count">${nDeps}</span>`]]
          .map(([k, l]) => `<button class="fp-tab${tab === k ? " on" : ""}" data-tab="${k}" role="tab">${l}</button>`).join("")}
      </div>
      <div class="fp-body">${tab === "overview" ? overviewHTML(f) : tab === "history" ? historyHTML(f) : dependenciesHTML(f)}</div>
      ${tab === "dependencies" ? `<div class="fp-foot"><i class="ph ph-warning"></i><span>Changes made to these dependencies as a result of deleting this field cannot be undone.</span>
        <button class="fp-delete" data-del ${isPrimary(f) ? 'disabled data-tip="The primary field can\'t be deleted"' : ""}>Delete field</button></div>` : ""}`;
    const ta = $("[data-panel-purpose]", panel);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function overviewHTML(f) {
    const dStatus = S.draftOf(f, "status"), dOwner = S.draftOf(f, "owner"), dPurpose = S.draftOf(f, "purpose");
    const fill = S.fillRate(f, records);
    let purpose;
    if (state.panelEditPurpose) {
      purpose = `<textarea class="fp-purpose-edit" data-panel-purpose placeholder="What does this field hold, and when should it be used?">${esc(f.description || dPurpose?.value || "")}</textarea>
        <div class="fp-edit-actions"><button class="cfg-cancel" data-purpose-cancel>Cancel</button><button class="cfg-save" data-purpose-save>Save</button></div>`;
    } else if (f.description) {
      purpose = `<button class="fp-purpose" data-purpose-edit>${esc(f.description)}</button>`;
    } else if (dPurpose) {
      purpose = `<div class="fp-purpose draft">${S.aiMark()}<span>${esc(dPurpose.value)}</span></div>
        <div class="fp-draft-actions"><button class="cfg-save" data-accept="purpose">Approve</button><button class="cfg-cancel" data-purpose-edit>Edit</button><button class="cfg-cancel" data-dismiss="purpose">Dismiss</button><span class="sx-muted">Drafted by Omni from the field's name, values and history</span></div>`;
    } else {
      purpose = `<button class="fp-purpose empty" data-purpose-edit>Add a purpose: what this field holds and when to use it</button>`;
    }
    const draftLine = (d, key, label) => d ? `<div class="fp-draft-line">${S.aiMark()}<span><b>Omni suggests ${esc(label)}.</b> ${esc(d.reason)}</span><button class="link-btn blue" data-accept="${key}">Accept</button><button class="link-btn" data-dismiss="${key}">Dismiss</button></div>` : "";
    return `
      <section class="fp-sec">
        <div class="fp-label">Purpose</div>
        ${purpose}
        ${f.description && f.updated ? `<div class="fp-sub">Last updated ${S.fmtDate(f.updated.at)} by ${esc(S.personName(f.updated.by))}</div>` : ""}
      </section>
      <section class="fp-sec fp-grid">
        <div class="fp-label">Status</div>
        <div>
          <div class="fp-seg">${Object.entries(S.STATUS).map(([k, st]) => `<button class="${f.status === k ? "on " + k : ""}" data-set-status="${k}"><i class="${st.icon}"></i>${st.label}</button>`).join("")}</div>
          ${f.status ? `<div class="fp-sub">${esc(S.STATUS[f.status].help)}</div>` : '<div class="fp-sub">Not reviewed yet</div>'}
          ${draftLine(dStatus, "status", dStatus && STATUS_WORD[dStatus.value])}
        </div>
        <div class="fp-label">Owner</div>
        <div>
          <button class="fp-owner" data-owner>${f.owner ? S.personChip(f.owner, { team: true }) : '<span class="sx-muted"><i class="ph ph-user-plus"></i> Add owner</span>'}<i class="ph ph-caret-down"></i></button>
          ${draftLine(dOwner, "owner", dOwner && S.person(dOwner.value).name)}
        </div>
        <div class="fp-label">Kind</div>
        <div>${f.kind === "derived"
          ? `Derived · ${esc(TYPE_LABEL[f.type])}${f.formula && S.FORMULAS[f.formula] ? `<code class="fp-code">${esc(S.FORMULAS[f.formula].text)}</code>` : ""}`
          : `Data · ${esc(TYPE_LABEL[f.type] || f.type)}`}</div>
        <div class="fp-label">Last verified</div>
        <div class="fp-verify">
          ${f.verified ? `<span class="${S.isStale(f) ? "sx-verified stale" : ""}">${S.isStale(f) ? '<i class="ph ph-clock-countdown"></i>' : ""}${S.fmtDate(f.verified.at)} by ${esc(S.personName(f.verified.by))}</span>` : '<span class="sx-muted">Never verified</span>'}
          <button class="fp-verify-btn" data-verify><i class="ph ph-check-circle"></i>Mark as verified</button>
        </div>
        <div class="fp-label">Created</div>
        <div>${S.personChip(f.created.by)} <span class="sx-muted">· ${S.fmtDate(f.created.at)}</span></div>
        <div class="fp-label">Activity</div>
        <div>
          <div class="fp-fill"><span class="fp-fill-bar"><span style="width:${fill}%"></span></span>${fill}% of records filled</div>
          <div class="fp-sub">Last configuration change ${S.relative(f.updated.at)} by ${esc(S.personName(f.updated.by))}</div>
        </div>
      </section>`;
  }
  function historyHTML(f) {
    return `<ol class="fp-history">${f.history.map((h) => `
      <li>${S.avatar(h.by, 24)}<div><div><b>${esc(S.personName(h.by))}</b> <span class="sx-muted">· ${esc(D.actionLabel[h.action] || h.action)}</span></div>
        <div class="fp-hist-detail">${esc(h.detail)}</div><div class="fp-sub">${S.fmtDate(h.at)} · ${S.relative(h.at)}</div></div></li>`).join("")}</ol>
      <div class="fp-sub" style="margin-top:12px">Configuration changes only. Cell edits live in each record's revision history.</div>`;
  }
  function dependenciesHTML(f) {
    if (!f.deps && !f.automations?.length) return `<div class="fp-empty">Nothing in this base depends on “${esc(f.name)}”.</div>`;
    let h = "";
    if (f.deps) h += `<div class="fp-section"><span>Interface elements <span class="fp-count">(${f.deps})</span></span></div>
      <div class="fp-box"><div class="fp-box-head">Interface</div><button class="fp-item" data-open-dep><i class="ph ph-file-text"></i><span>Table 1 <span class="fp-muted">(Not published)</span></span><i class="ph ph-caret-right fp-chev"></i></button></div>`;
    if (f.automations?.length) h += `<div class="fp-section"><span>Automations <span class="fp-count">(${f.automations.length})</span></span></div>
      <div class="fp-box"><div class="fp-box-head">Automation</div>${f.automations.map((a) => `<button class="fp-item" data-open-dep><i class="ph ph-lightning"></i><span>${esc(a)}</span><i class="ph ph-caret-right fp-chev"></i></button>`).join("")}</div>`;
    return h;
  }
  const openPanel = (f, tab = "overview") => { state.panel = { id: f.id, tab }; state.panelEditPurpose = false; render(); };

  panel.addEventListener("click", (e) => {
    const f = state.panel && fieldById(state.panel.id);
    if (!f) return;
    const t = (sel) => e.target.closest(sel);
    if (t("[data-close]")) { state.panel = null; render(); return; }
    if (t("[data-tab]")) { state.panel.tab = t("[data-tab]").dataset.tab; state.panelEditPurpose = false; renderPanel(); return; }
    if (t("[data-open-dep]")) { toast("Interfaces and automations aren't part of this clone"); return; }
    if (t("[data-del]") && !isPrimary(f)) { confirmPop(`Delete field “${f.name}”?`, "This can't be undone in this clone.", () => { state.panel = null; deleteFields([f.id]); }); return; }
    if (t("[data-set-status]")) { setStatus([f], t("[data-set-status]").dataset.setStatus); return; }
    if (t("[data-owner]")) { ownerMenu(f, t("[data-owner]")); return; }
    if (t("[data-verify]")) { verify([f]); return; }
    if (t("[data-accept]")) { acceptDraft(f, t("[data-accept]").dataset.accept); return; }
    if (t("[data-dismiss]")) { dismissDraft(f, t("[data-dismiss]").dataset.dismiss); return; }
    if (t("[data-purpose-edit]")) { state.panelEditPurpose = true; renderPanel(); return; }
    if (t("[data-purpose-cancel]")) { state.panelEditPurpose = false; renderPanel(); return; }
    if (t("[data-purpose-save]")) {
      const v = $("[data-panel-purpose]", panel).value;
      const d = S.draftOf(f, "purpose");
      state.panelEditPurpose = false;
      if (d && !f.description) setPurpose(f, v, { fromDraft: true, edited: v.trim() !== d.value });
      else setPurpose(f, v);
    }
  });
  panel.addEventListener("keydown", (e) => {
    if (e.target.matches("[data-panel-purpose]") && e.key === "Escape") { e.stopPropagation(); state.panelEditPurpose = false; renderPanel(); }
  });

  // ---------------------------------------------------------------- field operations
  let seq = fields.length + 1;
  function nextKey() {
    while (fields.some((f) => f.id === "fldNew" + seq)) seq++;
    return seq++;
  }
  function addField() {
    const n = nextKey();
    let name = "Field " + n, i = n + 1;
    while (fields.some((x) => x.name === name)) name = "Field " + i++;
    const f = {
      id: "fldNew" + n, key: "k" + n, name, type: "singleLineText", icon: "text", width: 180, permission: "Editors and up", deps: 0,
      kind: "data", status: null, owner: ME, verified: null, drafts: {}, automations: [],
      created: { by: ME, at: S.TODAY }, updated: { by: ME, at: S.TODAY },
      history: [{ by: ME, at: S.TODAY, action: "created", detail: "Created as a single line text field" }],
    };
    fields.push(f);
    records.forEach((r) => (r[f.key] = ""));
    state.q = "";
    $("#fmSearch").value = "";
    state.kind = state.status = state.owner = "All";
    state.sort = null;
    save();
    render();
    flash(f.id);
    configPop(f, $(`.fm-row[data-id="${f.id}"] .fm-type`, table) || $(`.fm-row[data-id="${f.id}"]`, table), true);
  }
  function deleteFields(ids) {
    const del = ids.map(fieldById).filter((f) => f && !isPrimary(f));
    del.forEach((f) => fields.splice(fields.indexOf(f), 1));
    ids.forEach((id) => state.selected.delete(id));
    save();
    render();
    if (del.length) toast(del.length === 1 ? `Deleted field “${del[0].name}”` : `Deleted ${del.length} fields`);
  }
  function flash(id) {
    const row = $(`.fm-row[data-id="${id}"]`, table);
    if (!row) return;
    row.classList.add("flash");
    row.scrollIntoView({ block: "nearest" });
  }
  function rename(f, v) {
    if (!v) return toast("Field name can't be empty"), false;
    if (fields.some((x) => x !== f && x.name.toLowerCase() === v.toLowerCase())) return toast(`A field named “${v}” already exists`), false;
    if (v !== f.name) { S.log(f, ME, "rename", `Renamed from “${f.name}” to “${v}”`); f.name = v; }
    return true;
  }
  function commitEdit(el) {
    const f = fieldById(state.editing?.id);
    if (!f) return;
    const what = state.editing.what;
    state.editing = null;
    if (what === "name") { rename(f, el.value.trim()); save(); render(); return; }
    const d = S.draftOf(f, "purpose");
    if (d && !f.description) {
      if (!el.value.trim()) { render(); return; } // left empty: keep the draft
      setPurpose(f, el.value, { fromDraft: true, edited: el.value.trim() !== d.value });
    } else setPurpose(f, el.value);
  }

  // Omni flags near-duplicates while a field is being named.
  function similarNote(name, f) {
    const sim = S.similarFields(name, fields, f).filter((x) => x.status !== "deprecated");
    if (!sim.length) return "";
    const canon = sim[0];
    return `<div class="sx-similar">${S.aiMark("Omni")}<span><b>Similar field exists:</b> “${esc(canon.name)}”${canon.status === "canonical" ? " is canonical" : ""}${canon.description ? ` — ${esc(S.firstSentence(canon.description))}.` : "."} Consider reusing it instead of adding a duplicate.
      <button class="link-btn blue" data-open-similar="${canon.id}">Open “${esc(canon.name)}”</button></span></div>`;
  }
  function configPop(f, anchor, isNew = false) {
    let showDesc = !!f.description;
    const draw = (nameVal = f.name) => `
      <div class="cfg">
        <input class="cfg-name" id="cfgName" value="${esc(nameVal)}" />
        <div class="cfg-similar">${isNew && S.after ? similarNote(nameVal, f) : ""}</div>
        <div class="cfg-type">${fIcon(f)}<span>${esc(TYPE_LABEL[f.type] || f.type)}</span><i class="ph ph-caret-down"></i></div>
        <div class="cfg-help">${esc(S.FORMULAS[f.formula]?.text || ({ singleLineText: "Enter text.", multilineText: "Enter long text.", email: "Enter an email address.", phoneNumber: "Enter a phone number.", singleSelect: "Select one option from a list.", date: "Enter a date, or pick one from a calendar.", currency: "Enter a currency amount.", checkbox: "Check or uncheck a box." }[f.type] || ""))}</div>
        ${showDesc ? `<textarea class="cfg-desc" id="cfgDesc" placeholder="Purpose: what this field holds and when to use it">${esc(f.description || "")}</textarea>` : ""}
        <div class="cfg-foot">
          ${showDesc ? "<span></span>" : `<button class="cfg-adddesc" data-adddesc><i class="ph ph-plus"></i>${S.after ? "Add purpose" : "Add description"}</button>`}
          <span class="cfg-btns"><button class="cfg-cancel" data-cancel>Cancel</button><button class="cfg-save" data-save>${isNew ? "Create field" : "Save"}</button></span>
        </div>
      </div>`;
    const el = showPop(draw(), anchor, { cls: "cfg-pop", width: 400 });
    const nameIn = () => $("#cfgName", el);
    nameIn().focus();
    nameIn().select();
    el.addEventListener("input", (e) => { if (isNew && S.after && e.target.id === "cfgName") $(".cfg-similar", el).innerHTML = similarNote(e.target.value, f); });
    const doSave = () => {
      if (!rename(f, nameIn().value.trim())) return;
      const d = $("#cfgDesc", el);
      if (d && d.value.trim() !== (f.description || "")) setPurpose(f, d.value);
      closePop();
      save();
      render();
    };
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "cfgName") doSave(); });
    el.addEventListener("click", (e) => {
      const sim = e.target.closest("[data-open-similar]");
      if (sim) {
        const target = fieldById(sim.dataset.openSimilar);
        closePop();
        if (isNew) { fields.splice(fields.indexOf(f), 1); save(); toast(`Discarded “${f.name}” — opened “${target.name}” instead`); }
        openPanel(target);
        flash(target.id);
        return;
      }
      if (e.target.closest("[data-cancel]")) closePop();
      else if (e.target.closest("[data-save]")) doSave();
      else if (e.target.closest("[data-adddesc]")) { const name = nameIn().value; showDesc = true; el.innerHTML = draw(name); $("#cfgDesc", el).focus(); }
      else if (e.target.closest(".cfg-type")) toast("Changing field types isn't available in this clone");
    });
  }

  function rowMenu(f, anchor) {
    const prim = isPrimary(f);
    if (!S.after) {
      // Airtable's own row menu
      const items = [{ id: "edit", label: "Edit field", icon: "ph-pencil-simple", run: () => configPop(f, $(`.fm-row[data-id="${f.id}"] .fm-type`, table) || anchor) }];
      if (prim) items.push("-", { id: "primary", label: "Change primary field", icon: "ph-arrow-line-left", run: changePrimary });
      items.push(
        "-",
        { id: "desc", label: "Edit field description", icon: "ph-info", run: () => { state.cols.purpose = true; state.panel = null; state.editing = { id: f.id, what: "purpose" }; render(); } },
        { id: "perm", label: "Edit field permissions", icon: "ph-lock-simple", run: () => { state.cols.permission = true; render(); const b = $(`.fm-row[data-id="${f.id}"] .fm-perm`, table); b && optionPop(b, PERMS, f.permission, (p) => setPerm([f], p)); } },
        "-",
        { id: "deps", label: "Show dependencies", icon: "ph-sliders-horizontal", run: () => openPanel(f, "dependencies") },
        "-",
        { id: "del", label: "Delete field", icon: "ph-trash", danger: true, disabled: prim, run: () => confirmPop(`Delete field “${f.name}”?`, "Are you sure you want to delete this field?", () => deleteFields([f.id])) },
      );
      showMenu(items, anchor, { align: "right", width: 240 });
      return;
    }
    const items = [
      { id: "details", label: "Field details", icon: "ph-sidebar-simple", run: () => openPanel(f) },
      { id: "edit", label: "Edit field", icon: "ph-pencil-simple", run: () => configPop(f, $(`.fm-row[data-id="${f.id}"] .fm-type`, table) || anchor) },
    ];
    if (prim) items.push("-", { id: "primary", label: "Change primary field", icon: "ph-arrow-line-left", run: changePrimary });
    items.push(
      "-",
      { id: "purpose", label: "Edit purpose", icon: "ph-info", run: () => { state.cols.purpose = true; state.panel = null; state.editing = { id: f.id, what: "purpose" }; render(); } },
      { id: "verify", label: "Mark as verified", icon: "ph-check-circle", run: () => verify([f]) },
      { id: "dep", label: f.status === "deprecated" ? "Mark as canonical" : "Mark as deprecated", icon: f.status === "deprecated" ? "ph-seal-check" : "ph-warning", run: () => setStatus([f], f.status === "deprecated" ? "canonical" : "deprecated") },
      { id: "perm", label: "Edit field permissions", icon: "ph-lock-simple", run: () => { state.cols.permission = true; state.panel = null; render(); const b = $(`.fm-row[data-id="${f.id}"] .fm-perm`, table); b && optionPop(b, PERMS, f.permission, (p) => setPerm([f], p)); } },
      "-",
      { id: "history", label: "View history", icon: "ph-clock-counter-clockwise", run: () => openPanel(f, "history") },
      { id: "deps", label: "Show dependencies", icon: "ph-sliders-horizontal", run: () => openPanel(f, "dependencies") },
      "-",
      { id: "del", label: "Delete field", icon: "ph-trash", danger: true, disabled: prim, run: () => confirmPop(`Delete field “${f.name}”?`, f.deps || f.automations?.length ? "Interfaces or automations use this field. Deleting it may break them." : "Are you sure you want to delete this field?", () => deleteFields([f.id])) },
    );
    showMenu(items, anchor, { align: "right", width: 240 });
  }
  function changePrimary() {
    const cur = fields[0];
    const eligible = fields.slice(1).filter((f) => ["singleLineText", "multilineText", "email", "phoneNumber", "date", "currency"].includes(f.type) && f.kind !== "derived");
    showMenu(eligible.map((f) => ({ id: f.id, label: f.name, run: () => {
      fields.splice(fields.indexOf(f), 1);
      fields.unshift(f);
      S.log(f, ME, "config", `Became the primary field (was “${cur.name}”)`);
      save();
      render();
      toast(`“${f.name}” is now the primary field (was “${cur.name}”)`);
    } })), $(`.fm-row[data-id="${cur.id}"] .fm-name`, table), { width: 240 });
  }
  function setPerm(list, p) {
    if (p === "Specific users") { toast("Choosing specific users isn't available in this clone"); return; }
    list.forEach((f) => (f.permission = p));
    save();
    render();
    toast(list.length === 1 ? `“${list[0].name}” can now be edited by: ${p}` : `Updated permissions for ${list.length} fields`);
  }

  // ---------------------------------------------------------------- events
  table.addEventListener("click", (e) => {
    const sortBtn = e.target.closest("[data-sort]");
    if (sortBtn) {
      const col = sortBtn.dataset.sort;
      // none → ascending → descending → none
      if (state.sort?.col !== col) state.sort = { col, dir: "asc" };
      else if (state.sort.dir === "asc") state.sort.dir = "desc";
      else state.sort = null;
      render();
      return;
    }
    if (e.target.closest("#colVis")) {
      const anchor = $("#colVis");
      if (openPop?.anchor === anchor) return closePop();
      const draw = () => `<div class="cv-title">Toggle column visibility</div>` + COLS.filter((c) => c.key !== "name").map((c) => `<label class="cv-row"><input type="checkbox" data-col="${c.key}" ${state.cols[c.key] ? "checked" : ""} />${c.label}</label>`).join("");
      const el = showPop(draw(), anchor, { cls: "cv-pop", align: "right" });
      el.addEventListener("change", (ev) => {
        const k = ev.target.dataset.col;
        if (!k) return;
        state.cols[k] = ev.target.checked;
        render();
      });
      return;
    }
    const actEl = e.target.closest("[data-act]");
    const act = actEl?.dataset.act;
    if (act === "reset") { state.q = ""; $("#fmSearch").value = ""; state.kind = state.status = state.owner = "All"; render(); return; }
    if (act === "all") {
      const list = rows();
      const all = list.length && list.every((f) => state.selected.has(f.id));
      list.forEach((f) => (all ? state.selected.delete(f.id) : state.selected.add(f.id)));
      render();
      return;
    }
    const row = e.target.closest(".fm-row.data");
    const f = row && fieldById(row.dataset.id);
    if (!f) return;
    if (!act) {
      // Clicking empty space in a row opens the field's details (prototype only)
      if (S.after && !e.target.closest("input, textarea")) openPanel(f);
      return;
    }
    switch (act) {
      case "sel": state.selected.has(f.id) ? state.selected.delete(f.id) : state.selected.add(f.id); render(); break;
      case "rename": state.editing = { id: f.id, what: "name" }; render(); break;
      case "purpose": state.editing = { id: f.id, what: "purpose" }; render(); break;
      case "acceptPurpose": acceptDraft(f, "purpose"); flash(f.id); break;
      case "dismissPurpose": dismissDraft(f, "purpose"); break;
      case "status": statusMenu(f, actEl); break;
      case "owner": ownerMenu(f, actEl); break;
      case "verify": verify([f]); break;
      case "config": configPop(f, actEl); break;
      case "perm": optionPop(actEl, PERMS, f.permission, (p) => setPerm([f], p)); break;
      case "deps": openPanel(f, "dependencies"); break;
      case "copyid": (navigator.clipboard?.writeText(f.id) || Promise.reject()).then(() => toast("Field ID copied"), () => toast("Field ID copied")); break;
      case "more": rowMenu(f, actEl); break;
    }
  });
  table.addEventListener("keydown", (e) => {
    const el = e.target.closest("[data-edit]");
    if (!el) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); state.editing = null; render(); }
    else if (e.key === "Enter" && !(el.tagName === "TEXTAREA" && e.shiftKey)) { e.preventDefault(); commitEdit(el); }
  });
  table.addEventListener("focusout", (e) => {
    const el = e.target.closest("[data-edit]");
    if (el && state.editing) setTimeout(() => state.editing && document.activeElement !== el && commitEdit(el), 0);
  });

  $("#fmSearch").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  const filterBtn = (id, options, key, labels) => $(id).addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (openPop?.anchor === b) return closePop();
    optionPop(b, options, state[key], (v) => { state[key] = v; render(); }, { width: 170, labels });
  });
  filterBtn("#permFilter", ["All", ...PERMS], "perm");
  filterBtn("#depFilter", ["All", "Agents", "Automations", "Configurations", "Fields", "Interfaces", "Syncs", "Views", "Workflow templates"], "dep");
  $("#bulkPerm").addEventListener("click", (e) => optionPop(e.currentTarget, PERMS, null, (p) => setPerm(selectedFields(), p), { width: 170 }));
  filterBtn("#kindFilter", KIND_FILTERS, "kind");
  filterBtn("#statusFilter", STATUS_FILTERS, "status");
  filterBtn("#ownerFilter", ["All", ...S.OWNER_IDS], "owner", Object.fromEntries(S.OWNER_IDS.map((id) => [id, S.person(id).name])));
  $("#fmAdd").addEventListener("click", addField);
  const selectedFields = () => [...state.selected].map(fieldById).filter(Boolean);
  $("#bulkClear").addEventListener("click", () => { state.selected.clear(); render(); });
  $("#bulkDelete").addEventListener("click", () => {
    const ids = [...state.selected].filter((id) => !isPrimary(fieldById(id)));
    if (!ids.length) return toast("The primary field can't be deleted");
    confirmPop(`Delete ${ids.length === 1 ? "1 field" : ids.length + " fields"}?`, "Deleted fields can't be restored in this clone.", () => deleteFields(ids));
  });
  $("#bulkStatus").addEventListener("click", (e) => showMenu(Object.entries(S.STATUS).map(([k, st]) => ({ id: k, label: st.label, desc: st.help, icon: st.icon.replace("ph-fill ", ""), run: () => { const l = selectedFields(); setStatus(l, k); toast(`${l.length} field${l.length === 1 ? "" : "s"} marked ${st.label.toLowerCase()}`); } })), e.currentTarget, { width: 280 }));
  $("#bulkOwner").addEventListener("click", (e) => showMenu(S.OWNER_IDS.map((id) => ({ id, label: S.person(id).name, desc: S.person(id).team, iconHTML: S.avatar(id), run: () => { const l = selectedFields(); setOwner(l, id); toast(`Owner set to ${S.person(id).name} on ${l.length} field${l.length === 1 ? "" : "s"}`); } })), e.currentTarget, { width: 240 }));
  $("#bulkVerify").addEventListener("click", () => verify(selectedFields()));

  // base status badge (shared with the grid page through the session store)
  $("#baseStatus").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (openPop?.anchor === b) return closePop();
    showMenu(Object.entries(S.BASE_STATUS).map(([k, v]) => ({ id: k, label: v.label, desc: v.help, check: D.base.status === k, run: () => { D.base.status = k; save(); render(); toast(`Base marked as ${v.label.toLowerCase()}`); } })), b, { width: 280 });
  });

  // chrome
  $("#copyLink").addEventListener("click", () => (navigator.clipboard?.writeText(location.href) || Promise.reject()).then(() => toast("Link copied to clipboard"), () => toast("Link copied to clipboard")));
  $("#mfTools").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (openPop?.anchor === b) return closePop();
    showMenu([
      { id: "records", label: "Back to records", icon: "ph-table", run: () => (location.href = "index.html") },
      "-",
      { id: "ext", label: "Extensions", icon: "ph-puzzle-piece", run: () => toast("Extensions are not available in this clone") },
      { id: "tpl", label: "Record templates", icon: "ph-file-text", run: () => toast("No record templates") },
      { id: "dd", label: "Date dependencies", icon: "ph-calendar-dots", run: () => toast("Date dependencies are not available in this clone") },
    ], b, { align: "right" });
  });
  $$(".top-tab:not(a), .tablebar-btn:not(#mfTools), .base-name, #shareBtn, .btn-white:not(#copyLink), .icon-btn, .rail-btn:not(a)").forEach((b) =>
    b.addEventListener("click", () => toast("Not available on the field manager in this clone")));

  // Deep link from the grid's header card: manage-fields.html#fld…
  S.mountModeSwitch();
  const hashField = S.after && location.hash && fieldById(location.hash.slice(1));
  if (hashField) state.panel = { id: hashField.id, tab: "overview" };
  render();
  if (hashField) flash(hashField.id);
})();
