(() => {
  "use strict";

  const D = window.AT_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------------------------------------------------------------- state
  const fields = D.fields.map((f) => ({ width: 180, permission: "Editors and up", deps: 0, ...f }));
  const records = D.records;
  const state = {
    q: "",
    perm: "All",
    dep: "All",
    sort: null, // {col, dir}
    selected: new Set(),
    cols: { type: true, description: true, example: false, permission: true, fieldId: false, createdBy: false, modifiedBy: false, dependencies: true },
    editing: null, // {id, what: 'name'|'description'}
    panel: null, // field id whose dependencies panel is open
  };
  const save = () => D.save({ fields, records });
  const fieldById = (id) => fields.find((f) => f.id === id);
  const isPrimary = (f) => fields[0] === f;

  const ICONS = {
    text: '<svg class="fi" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 3.2 13.5h1.6l1.1-2.6h4.2l1.1 2.6h1.6L8 2.5Zm-1.5 7L8 5.8l1.5 3.7h-3Z" fill="currentColor"/></svg>',
    paragraph: '<i class="ph ph-text-align-left"></i>',
    email: '<i class="ph ph-envelope-simple"></i>',
    phone: '<i class="ph ph-phone"></i>',
    select: '<i class="ph ph-caret-circle-down"></i>',
    date: '<i class="ph ph-calendar-blank"></i>',
    currency: '<i class="ph ph-currency-dollar-simple"></i>',
    checkbox: '<i class="ph ph-check-square"></i>',
  };
  const TYPE_LABEL = { singleLineText: "Single line text", multilineText: "Long text", email: "Email", phoneNumber: "Phone number", singleSelect: "Single select", date: "Date", currency: "Currency", checkbox: "Checkbox" };
  const TYPE_HELP = {
    singleLineText: "Enter text.",
    multilineText: "Enter long text, optionally with rich formatting.",
    email: "Enter an email address.",
    phoneNumber: "Enter a phone number.",
    singleSelect: "Select one option from a list.",
    date: "Enter a date, or pick one from a calendar.",
    currency: "Enter a currency amount.",
    checkbox: "Check or uncheck a box.",
  };
  const fIcon = (f) => ICONS[f.icon] || ICONS.text;
  const PERMS = ["Editors and up", "Creators and up", "Specific users", "Nobody"];
  const DEP_KINDS = ["All", "Agents", "Automations", "Configurations", "Fields", "Interfaces", "Syncs", "Views", "Workflow templates"];
  const COLS = [
    { key: "name", label: "Name", width: "301px" },
    { key: "type", label: "Field type", width: "236px" },
    { key: "description", label: "Description", width: "194px" },
    { key: "example", label: "Example value", width: "200px" },
    { key: "permission", label: "Field permissions", width: "161px" },
    { key: "fieldId", label: "Field ID", width: "170px" },
    { key: "createdBy", label: "Created By", width: "140px" },
    { key: "modifiedBy", label: "Last Modified By", width: "150px" },
    { key: "dependencies", label: "Dependencies", width: "minmax(130px, 1fr)" },
  ];
  // The dependencies side panel takes room, so Airtable drops the description column while it's open.
  const showCol = (key) => key === "name" || (state.cols[key] && !(key === "description" && state.panel));

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
      return `<button class="menu-item${it.danger ? " danger" : ""}${it.disabled ? " disabled" : ""}" data-mi="${it.id}">${it.icon ? `<i class="ph ${it.icon}"></i>` : ""}<span>${esc(it.label)}</span></button>`;
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
  // Searchable single-choice dropdown ("Find an option"), used by the filters and the permission pickers.
  function optionPop(anchor, options, current, onPick, { width } = {}) {
    let active = Math.max(0, options.indexOf(current));
    const list = (q) => options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
    const draw = (q = "") => list(q).map((o, i) => `<div class="opt-row${o === current ? " current" : ""}${i === active ? " kbd-active" : ""}" data-v="${esc(o)}">${esc(o)}</div>`).join("") || `<div class="opt-empty">No options</div>`;
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

  // ---------------------------------------------------------------- derived rows
  const exampleValue = (f) => {
    const r = records.find((rec) => rec[f.key] !== "" && rec[f.key] !== null && rec[f.key] !== undefined && rec[f.key] !== false);
    if (!r) return "";
    const v = r[f.key];
    if (f.type === "currency") return `${f.symbol || "€"}${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (f.type === "checkbox") return "checked";
    return String(v);
  };
  function rows() {
    const q = state.q.trim().toLowerCase();
    let list = fields.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q)) return false;
      if (state.perm !== "All" && f.permission !== state.perm) return false;
      if (state.dep === "Interfaces" && !f.deps) return false;
      if (state.dep !== "All" && state.dep !== "Interfaces") return false; // no other dependency kinds exist in this base
      return true;
    });
    const primaryField = fields[0];
    const val = (f, col) => ({ name: f.name, type: TYPE_LABEL[f.type] || f.type, description: f.description || "", example: exampleValue(f), permission: f.permission, fieldId: f.id, createdBy: "", modifiedBy: "", dependencies: f.deps }[col]);
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

  // ---------------------------------------------------------------- render
  const table = $("#fmTable");
  const panel = $("#fmPanel");
  function cellFor(key, f) {
    const editingDesc = state.editing?.id === f.id && state.editing.what === "description";
    switch (key) {
      case "type": return `<button class="fm-type" data-act="config" aria-label="Edit field configuration">${fIcon(f)}<span>${esc(TYPE_LABEL[f.type] || f.type)}</span></button>`;
      case "description": return editingDesc
        ? `<textarea class="fm-inline" data-edit="description" placeholder="Describe this field">${esc(f.description || "")}</textarea>`
        : `<button class="fm-desc" data-act="desc" aria-label="Click to edit field description">${f.description ? esc(f.description) : ""}</button>`;
      case "example": { const v = exampleValue(f); return `<span class="fm-muted-val">${f.type === "singleSelect" && v ? `<span class="pill c-${f.choices.find((c) => c.name === v)?.color || "grayLight2"}">${esc(v)}</span>` : esc(v)}</span>`; }
      case "permission": return `<button class="fm-perm" data-act="perm"><span>${esc(f.permission)}</span><i class="ph ph-caret-down"></i></button>`;
      case "fieldId": return `<button class="fm-id" data-act="copyid" data-tip="Copy field ID">${esc(f.id)}</button>`;
      case "createdBy":
      case "modifiedBy": return `<span class="fm-user"><span class="fm-avatar">T</span>You</span>`;
      case "dependencies": return f.deps ? `<button class="fm-dep" data-act="deps">${f.deps} Interface${f.deps === 1 ? "" : "s"}</button>` : "";
      default: return "";
    }
  }
  function render() {
    const visCols = COLS.filter((c) => showCol(c.key));
    // With the side panel open the columns shrink to fit the remaining width, as in Airtable
    const PANEL_W = { name: "minmax(150px, 1.3fr)", type: "minmax(130px, 1fr)", permission: "130px", dependencies: "minmax(100px, 0.8fr)" };
    table.style.setProperty("--fm-cols", ["64px", ...visCols.map((c) => (state.panel && PANEL_W[c.key]) || c.width), "56px"].join(" "));
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
      const editingName = state.editing?.id === f.id && state.editing.what === "name";
      h += `<div class="fm-row data${sel ? " selected" : ""}${state.panel === f.id ? " active" : ""}" data-id="${f.id}" role="row">
        <div class="fm-cell check"><button class="fm-cbx ${sel ? "on" : ""}" data-act="sel" role="checkbox" aria-checked="${sel}" aria-label="Select this row"><i class="ph-bold ph-check"></i></button></div>
        <div class="fm-cell">${editingName ? `<input class="fm-inline" data-edit="name" value="${esc(f.name)}" />` : `<button class="fm-name" data-act="rename" aria-label="Click to rename">${esc(f.name)}</button>`}${prim ? '<span class="fm-primary">Primary field</span>' : ""}</div>
        ${visCols.slice(1).map((c) => `<div class="fm-cell">${cellFor(c.key, f)}</div>`).join("")}
        <div class="fm-cell actions"><button class="fm-more" data-act="more" aria-label="Actions"><i class="ph ph-dots-three"></i></button></div>
      </div>`;
    }
    table.innerHTML = h;

    // toolbar: filters & bulk actions
    const pf = $("#permFilter"), df = $("#depFilter");
    $("b", pf).textContent = state.perm;
    pf.classList.toggle("active", state.perm !== "All");
    $("b", df).textContent = state.dep;
    df.classList.toggle("active", state.dep !== "All");
    // Airtable hides the filters while the side panel is open
    pf.hidden = df.hidden = !!state.panel;
    const n = state.selected.size;
    $("#fmBulk").hidden = n === 0;
    $(".fm-tools-default").hidden = n > 0;
    $("#fmBulkCount").textContent = `${n} field${n === 1 ? "" : "s"} selected`;
    $("#bulkDelete span").textContent = `Delete ${n === 1 ? "field" : n + " fields"}`;

    renderPanel();
    const ed = $("[data-edit]", table);
    if (ed) { ed.focus(); ed.select?.(); }
  }

  let panelOpenSection = true;
  function renderPanel() {
    const f = fieldById(state.panel);
    panel.hidden = !f;
    $(".fm").classList.toggle("with-panel", !!f);
    if (!f) return;
    const prim = isPrimary(f);
    panel.innerHTML = `
      <div class="fp-head"><h2>${f.deps ? `${f.deps} dependenc${f.deps === 1 ? "y" : "ies"}` : "No dependencies"} for ${esc(f.name)}</h2><button class="fp-close" data-close aria-label="Close"><i class="ph ph-x"></i></button></div>
      <div class="fp-body">
        ${f.deps ? `
        <button class="fp-section" data-toggle><span>Interface elements <span class="fp-count">(${f.deps})</span></span><i class="ph ph-caret-${panelOpenSection ? "down" : "right"}"></i></button>
        ${panelOpenSection ? `<div class="fp-box"><div class="fp-box-head">Interface</div>
          <button class="fp-item" data-open><i class="ph ph-file-text"></i><span>Table 1 <span class="fp-muted">(Not published)</span></span><i class="ph ph-caret-right fp-chev"></i></button></div>` : ""}`
        : `<div class="fp-empty">Nothing in this base depends on “${esc(f.name)}”.</div>`}
      </div>
      <div class="fp-foot"><i class="ph ph-warning"></i><span>Changes made to these dependencies as a result of deleting this field cannot be undone.</span>
        <button class="fp-delete" data-del ${prim ? 'disabled data-tip="The primary field can\'t be deleted"' : ""}>Delete field</button></div>`;
  }
  panel.addEventListener("click", (e) => {
    const f = fieldById(state.panel);
    if (e.target.closest("[data-close]")) { state.panel = null; render(); return; }
    if (e.target.closest("[data-toggle]")) { panelOpenSection = !panelOpenSection; renderPanel(); return; }
    if (e.target.closest("[data-open]")) { toast("Interfaces aren't part of this clone"); return; }
    if (e.target.closest("[data-del]") && f && !isPrimary(f)) confirmPop(`Delete field “${f.name}”?`, "This can't be undone in this clone.", () => { state.panel = null; deleteFields([f.id]); });
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
    const f = { id: "fldNew" + n, key: "k" + n, name, type: "singleLineText", icon: "text", width: 180, permission: "Editors and up", deps: 0 };
    fields.push(f);
    records.forEach((r) => (r[f.key] = ""));
    state.q = "";
    $("#fmSearch").value = "";
    state.perm = "All";
    state.dep = "All";
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
  function commitEdit(el) {
    const f = fieldById(state.editing?.id);
    if (!f) return;
    const v = el.value.trim();
    if (state.editing.what === "name") {
      if (!v) toast("Field name can't be empty");
      else if (fields.some((x) => x !== f && x.name.toLowerCase() === v.toLowerCase())) toast(`A field named “${v}” already exists`);
      else f.name = v;
    } else {
      f.description = v || undefined;
    }
    state.editing = null;
    save();
    render();
  }

  function configPop(f, anchor, isNew = false) {
    let showDesc = !!f.description;
    const draw = () => `
      <div class="cfg">
        <input class="cfg-name" id="cfgName" value="${esc(f.name)}" />
        <div class="cfg-type">${fIcon(f)}<span>${esc(TYPE_LABEL[f.type] || f.type)}</span><i class="ph ph-caret-down"></i></div>
        <div class="cfg-help">${esc(TYPE_HELP[f.type] || "")}</div>
        ${showDesc ? `<textarea class="cfg-desc" id="cfgDesc" placeholder="Describe this field (optional)">${esc(f.description || "")}</textarea>` : ""}
        <div class="cfg-foot">
          ${showDesc ? "<span></span>" : `<button class="cfg-adddesc" data-adddesc><i class="ph ph-plus"></i>Add description</button>`}
          <span class="cfg-btns"><button class="cfg-cancel" data-cancel>Cancel</button><button class="cfg-save" data-save>${isNew ? "Create field" : "Save"}</button></span>
        </div>
      </div>`;
    const el = showPop(draw(), anchor, { cls: "cfg-pop", width: 400 });
    const focusName = () => { const n = $("#cfgName", el); n.focus(); n.select(); };
    focusName();
    const doSave = () => {
      const v = $("#cfgName", el).value.trim();
      if (!v) return toast("Field name can't be empty");
      if (fields.some((x) => x !== f && x.name.toLowerCase() === v.toLowerCase())) return toast(`A field named “${v}” already exists`);
      f.name = v;
      const d = $("#cfgDesc", el);
      if (d) f.description = d.value.trim() || undefined;
      closePop();
      save();
      render();
    };
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "cfgName") doSave(); });
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-cancel]")) closePop();
      else if (e.target.closest("[data-save]")) doSave();
      else if (e.target.closest("[data-adddesc]")) { const name = $("#cfgName", el).value; showDesc = true; el.innerHTML = draw(); $("#cfgName", el).value = name; $("#cfgDesc", el).focus(); }
      else if (e.target.closest(".cfg-type")) toast("Changing field types isn't available in this clone");
    });
  }

  function rowMenu(f, anchor) {
    const prim = isPrimary(f);
    const items = [{ id: "edit", label: "Edit field", icon: "ph-pencil-simple", run: () => configPop(f, $(`.fm-row[data-id="${f.id}"] .fm-type`, table) || anchor) }];
    if (prim) items.push("-", { id: "primary", label: "Change primary field", icon: "ph-arrow-line-left", run: changePrimary });
    items.push(
      "-",
      { id: "desc", label: "Edit field description", icon: "ph-info", run: () => { state.cols.description = true; state.panel = null; state.editing = { id: f.id, what: "description" }; render(); } },
      { id: "perm", label: "Edit field permissions", icon: "ph-lock-simple", run: () => { state.cols.permission = true; render(); const b = $(`.fm-row[data-id="${f.id}"] .fm-perm`, table); b && optionPop(b, PERMS, f.permission, (p) => setPerm([f], p)); } },
      "-",
      { id: "deps", label: "Show dependencies", icon: "ph-sliders-horizontal", run: () => { state.panel = f.id; render(); } },
      "-",
      { id: "del", label: "Delete field", icon: "ph-trash", danger: true, disabled: prim, run: () => confirmPop(`Delete field “${f.name}”?`, f.deps ? `This field is used in ${f.deps} interface elements. Deleting it may break them.` : "Are you sure you want to delete this field?", () => deleteFields([f.id])) },
    );
    showMenu(items, anchor, { align: "right", width: 240 });
  }
  function changePrimary() {
    const cur = fields[0];
    const eligible = fields.slice(1).filter((f) => ["singleLineText", "multilineText", "email", "phoneNumber", "date", "currency"].includes(f.type));
    showMenu(eligible.map((f) => ({ id: f.id, label: f.name, run: () => {
      fields.splice(fields.indexOf(f), 1);
      fields.unshift(f);
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
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    if (act === "reset") { state.q = ""; $("#fmSearch").value = ""; state.perm = "All"; state.dep = "All"; render(); return; }
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
    const btn = e.target.closest("[data-act]");
    switch (act) {
      case "sel": state.selected.has(f.id) ? state.selected.delete(f.id) : state.selected.add(f.id); render(); break;
      case "rename": state.editing = { id: f.id, what: "name" }; render(); break;
      case "desc": state.editing = { id: f.id, what: "description" }; render(); break;
      case "config": configPop(f, btn); break;
      case "perm": optionPop(btn, PERMS, f.permission, (p) => setPerm([f], p)); break;
      case "deps": state.panel = f.id; panelOpenSection = true; render(); break;
      case "copyid": (navigator.clipboard?.writeText(f.id) || Promise.reject()).then(() => toast("Field ID copied"), () => toast("Field ID copied")); break;
      case "more": rowMenu(f, btn); break;
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
  $("#permFilter").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (openPop?.anchor === b) return closePop();
    optionPop(b, ["All", ...PERMS], state.perm, (p) => { state.perm = p; render(); }, { width: 150 });
  });
  $("#depFilter").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (openPop?.anchor === b) return closePop();
    optionPop(b, DEP_KINDS, state.dep, (p) => { state.dep = p; render(); }, { width: 150 });
  });
  $("#fmAdd").addEventListener("click", addField);
  $("#bulkClear").addEventListener("click", () => { state.selected.clear(); render(); });
  $("#bulkDelete").addEventListener("click", () => {
    const ids = [...state.selected].filter((id) => !isPrimary(fieldById(id)));
    if (!ids.length) return toast("The primary field can't be deleted");
    confirmPop(`Delete ${ids.length === 1 ? "1 field" : ids.length + " fields"}?`, "Deleted fields can't be restored in this clone.", () => deleteFields(ids));
  });
  $("#bulkPerm").addEventListener("click", (e) => optionPop(e.currentTarget, PERMS, null, (p) => setPerm([...state.selected].map(fieldById), p), { width: 170 }));

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

  render();
})();
