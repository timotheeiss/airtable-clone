(() => {
  "use strict";

  const D = window.AT_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------------------------------------------------------------- state
  const state = {
    fields: D.fields.map((f) => ({ width: 180, ...f })),
    records: D.records.map((r) => ({ ...r, _comments: [] })),
    hidden: new Set(),
    sorts: [], // {fieldId, dir: 'asc'|'desc'}
    autoSort: true,
    filters: [], // {fieldId, op, value}
    conj: "and",
    groups: [], // {fieldId, dir}
    collapsed: new Set(),
    colorBy: null, // fieldId of single select
    rowHeight: "short",
    wrapHeaders: false,
    search: "",
    searchIdx: 0,
    sel: null, // {recId, fieldId}
    checked: new Set(),
    summaries: { fldpPCudBx51Yebai: "sum" },
    fieldSeq: 13,
    recSeq: 1,
  };
  const ROW_H = { short: 32, medium: 56, tall: 88, extra: 128 };
  const primary = () => state.fields[0];
  const fieldById = (id) => state.fields.find((f) => f.id === id);
  const recById = (id) => state.records.find((r) => r.id === id);
  const visFields = () => state.fields.filter((f, i) => i === 0 || !state.hidden.has(f.id));
  const noun = (n) => `${n} ${D.table.recordNoun}${n === 1 ? "" : "s"}`;

  // ---------------------------------------------------------------- undo
  const undoStack = [];
  const redoStack = [];
  function pushUndo(entry) {
    undoStack.push(entry);
    if (undoStack.length > 200) undoStack.shift();
    redoStack.length = 0;
  }
  function setValue(rec, f, value, { record = true } = {}) {
    const old = rec[f.key];
    if (old === value) return;
    rec[f.key] = value;
    if (record) pushUndo({ undo: () => (rec[f.key] = old), redo: () => (rec[f.key] = value), label: "cell edit" });
  }

  // ---------------------------------------------------------------- formatting
  const fmtCurrency = (n, f) => (n === null || n === undefined || n === "" ? "" : `${f.symbol || "€"}${Number(n).toLocaleString("en-US", { minimumFractionDigits: f.precision ?? 2, maximumFractionDigits: f.precision ?? 2 })}`);
  function display(rec, f) {
    const v = rec[f.key];
    if (v === null || v === undefined) return "";
    switch (f.type) {
      case "currency": return fmtCurrency(v, f);
      case "checkbox": return v ? "checked" : "";
      default: return String(v);
    }
  }
  const choiceColor = (f, name) => (f.choices || []).find((c) => c.name === name)?.color || "grayLight2";

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
  const fIcon = (f) => ICONS[f.icon] || ICONS.text;
  const isNumeric = (f) => f.type === "currency";
  const sortLabels = (f) => {
    if (isNumeric(f)) return ["1 → 9", "9 → 1"];
    if (f.type === "checkbox") return ["☐ → ☑", "☑ → ☐"];
    if (f.type === "date") return ["1 → 9", "9 → 1"];
    return ["A → Z", "Z → A"];
  };

  // ---------------------------------------------------------------- filtering / sorting / grouping
  const OPS = {
    text: [["contains", "contains"], ["notContains", "does not contain"], ["is", "is"], ["isNot", "is not"], ["isEmpty", "is empty"], ["isNotEmpty", "is not empty"]],
    select: [["is", "is"], ["isNot", "is not"], ["isEmpty", "is empty"], ["isNotEmpty", "is not empty"]],
    number: [["eq", "="], ["neq", "≠"], ["lt", "<"], ["gt", ">"], ["lte", "≤"], ["gte", "≥"], ["isEmpty", "is empty"], ["isNotEmpty", "is not empty"]],
    date: [["is", "is"], ["before", "is before"], ["after", "is after"], ["isEmpty", "is empty"], ["isNotEmpty", "is not empty"]],
    checkbox: [["is", "is"]],
  };
  const opsFor = (f) => (f.type === "singleSelect" ? OPS.select : isNumeric(f) ? OPS.number : f.type === "date" ? OPS.date : f.type === "checkbox" ? OPS.checkbox : OPS.text);
  function testCond(rec, c) {
    const f = fieldById(c.fieldId);
    if (!f) return true;
    const v = rec[f.key];
    const empty = v === null || v === undefined || v === "" || (f.type === "checkbox" && !v);
    if (c.op === "isEmpty") return empty;
    if (c.op === "isNotEmpty") return !empty;
    if (f.type === "checkbox") return c.value === "unchecked" ? !v : !!v;
    if (c.value === "" || c.value === undefined || c.value === null) return true; // incomplete condition is ignored
    if (isNumeric(f)) {
      const a = Number(v), b = Number(c.value);
      if (empty) return false;
      return { eq: a === b, neq: a !== b, lt: a < b, gt: a > b, lte: a <= b, gte: a >= b }[c.op];
    }
    if (f.type === "date") {
      if (empty) return false;
      return { is: v === c.value, before: v < c.value, after: v > c.value }[c.op];
    }
    const s = String(v ?? "").toLowerCase(), q = String(c.value).toLowerCase();
    return { contains: s.includes(q), notContains: !s.includes(q), is: s === q, isNot: s !== q }[c.op];
  }
  function compare(a, b, f) {
    let va = a[f.key], vb = b[f.key];
    const ea = va === null || va === undefined || va === "", eb = vb === null || vb === undefined || vb === "";
    if (ea && eb) return 0;
    if (ea) return 1;
    if (eb) return -1;
    if (f.type === "singleSelect") {
      const idx = (n) => f.choices.findIndex((c) => c.name === n);
      return idx(va) - idx(vb);
    }
    if (isNumeric(f)) return va - vb;
    if (f.type === "checkbox") return (va ? 1 : 0) - (vb ? 1 : 0);
    return String(va).localeCompare(String(vb), undefined, { sensitivity: "base" });
  }
  function viewRecords() {
    let recs = state.records.filter((r) => {
      if (!state.filters.length) return true;
      const res = state.filters.map((c) => testCond(r, c));
      return state.conj === "and" ? res.every(Boolean) : res.some(Boolean);
    });
    const sorters = [...state.groups, ...state.sorts];
    if (sorters.length) {
      recs = recs
        .map((r, i) => [r, i])
        .sort(([a, ia], [b, ib]) => {
          for (const s of sorters) {
            const f = fieldById(s.fieldId);
            if (!f) continue;
            const c = compare(a, b, f);
            if (c) return s.dir === "desc" ? -c : c;
          }
          return ia - ib;
        })
        .map(([r]) => r);
    }
    return recs;
  }
  // Rows rendered in the grid, including group headers.
  function buildItems() {
    const recs = viewRecords();
    const items = [];
    const flat = [];
    if (!state.groups.length) {
      recs.forEach((r, i) => { items.push({ kind: "rec", rec: r, num: i + 1 }); flat.push(r); });
      return { items, flat, total: recs.length };
    }
    const walk = (list, level, prefix) => {
      const g = state.groups[level];
      const f = fieldById(g.fieldId);
      const buckets = new Map();
      list.forEach((r) => {
        const k = f.type === "checkbox" ? (r[f.key] ? "checked" : "unchecked") : display(r, f);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(r);
      });
      for (const [k, rs] of buckets) {
        const gid = prefix + "|" + f.id + "=" + k;
        items.push({ kind: "group", gid, field: f, value: k, count: rs.length, level });
        if (state.collapsed.has(gid)) continue;
        if (level + 1 < state.groups.length) walk(rs, level + 1, gid);
        else rs.forEach((r, i) => { items.push({ kind: "rec", rec: r, num: i + 1 }); flat.push(r); });
      }
    };
    walk(recs, 0, "");
    return { items, flat, total: recs.length };
  }

  // ---------------------------------------------------------------- search
  function searchMatches(flat) {
    const q = state.search.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    const fs = visFields();
    flat.forEach((r) => fs.forEach((f) => {
      if (f.type === "checkbox") return;
      if (display(r, f).toLowerCase().includes(q)) out.push({ recId: r.id, fieldId: f.id });
    }));
    return out;
  }
  function hl(text, isCurrent) {
    const q = state.search.trim();
    const s = String(text ?? "");
    if (!q) return esc(s);
    const i = s.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + `<mark class="hl${isCurrent ? " current" : ""}">` + esc(s.slice(i, i + q.length)) + "</mark>" + esc(s.slice(i + q.length));
  }

  // ---------------------------------------------------------------- render
  const grid = $("#grid");
  const gridScroll = $("#gridScroll");
  const summaryBar = $("#summaryBar");
  let view = { items: [], flat: [], total: 0 };
  let matches = [];

  function cellInner(rec, f, cur) {
    const v = rec[f.key];
    const tall = state.rowHeight !== "short";
    switch (f.type) {
      case "singleSelect":
        return v ? `<span class="pill c-${choiceColor(f, v)}">${hl(v, cur)}</span><i class="ph ph-caret-down sel-caret"></i>` : `<i class="ph ph-caret-down sel-caret"></i>`;
      case "checkbox":
        return v ? '<i class="ph-bold ph-check checkmark"></i>' : '<span class="cb-empty"></span>';
      case "email":
        return v ? `<span class="val email">${hl(v, cur)}</span>` : "";
      case "currency":
        return `<span class="val">${hl(fmtCurrency(v, f), cur)}</span>`;
      case "multilineText":
        return `<span class="val">${hl(tall ? v : String(v ?? "").split("\n")[0], cur)}</span>`;
      default:
        return `<span class="val">${hl(v, cur)}</span>`;
    }
  }
  function cellClass(f) {
    let c = "cell";
    if (isNumeric(f)) c += " num";
    if (f.type === "checkbox") c += " center checkbox-cell";
    return c;
  }

  function render() {
    view = buildItems();
    matches = searchMatches(view.flat);
    if (state.searchIdx >= matches.length) state.searchIdx = 0;
    const curMatch = matches[state.searchIdx];
    const fs = visFields();
    const pf = primary();
    const rh = ROW_H[state.rowHeight];
    grid.style.setProperty("--row-h", rh + "px");
    grid.className = "grid h-" + state.rowHeight + (state.wrapHeaders ? " wrap-headers" : "");

    const sortedIds = new Set(state.sorts.map((s) => s.fieldId));
    const filteredIds = new Set(state.filters.map((c) => c.fieldId));
    const nChecked = view.flat.filter((r) => state.checked.has(r.id)).length;
    const allState = nChecked === 0 ? "" : nChecked === view.flat.length ? "on" : "mixed";

    let h = "";
    // header
    h += `<div class="row header">`;
    h += `<div class="cell actions"><span class="cbox header-check ${allState}" data-act="checkall" role="checkbox" aria-label="Select all rows"><i class="ph-bold ph-check"></i></span></div>`;
    fs.forEach((f, i) => {
      const cls = ["cell", i === 0 ? "primary" : "", sortedIds.has(f.id) ? "sorted" : "", filteredIds.has(f.id) ? "filtered" : ""].join(" ");
      h += `<div class="${cls}" data-hf="${f.id}" style="width:${f.width}px" draggable="false">
        ${fIcon(f)}<span class="hname">${esc(f.name)}</span>
        ${f.description ? `<i class="ph ph-info hinfo" data-tip="${esc(f.description)}"></i>` : ""}
        <i class="ph ph-caret-down hcaret" data-act="fieldmenu"></i>
        <span class="resize-handle" data-act="resize"></span></div>`;
    });
    h += `<div class="cell add-col" data-act="addfield" data-tip="Add field"><i class="ph ph-plus"></i></div>`;
    h += `</div>`;

    // rows
    const totalW = fs.reduce((s, f) => s + f.width, 0);
    for (const it of view.items) {
      if (it.kind === "group") {
        const f = it.field;
        let label;
        if (f.type === "singleSelect") label = it.value ? `<span class="pill c-${choiceColor(f, it.value)}">${esc(it.value)}</span>` : `<span style="color:var(--text-subtle)">Empty</span>`;
        else label = it.value ? esc(it.value) : `<span style="color:var(--text-subtle)">Empty</span>`;
        const col = state.collapsed.has(it.gid);
        h += `<div class="row group-head" data-gid="${esc(it.gid)}" style="padding-left:${it.level * 16}px">
          <div class="cell actions" style="width:84px" data-act="togglegroup"><i class="ph ph-caret-${col ? "right" : "down"} gtoggle"></i></div>
          <div class="cell primary" style="width:${pf.width}px;border-right:0" data-act="togglegroup"><div class="gtitle"><small>${esc(f.name)}</small><span>${label}</span></div></div>
          <div class="cell" style="width:${totalW - pf.width + 94}px;border-left:0" data-act="togglegroup"><span class="gcount">Count ${it.count}</span></div></div>`;
        continue;
      }
      const r = it.rec;
      const checked = state.checked.has(r.id);
      let colorBar = "";
      if (state.colorBy) {
        const cf = fieldById(state.colorBy);
        if (cf && r[cf.key]) colorBar = `<div class="rowcolor" style="background:var(--c-${choiceColor(cf, r[cf.key]).replace("Light2", "Light1")}, var(--c-${choiceColor(cf, r[cf.key])}))"></div>`;
      }
      h += `<div class="row data${checked ? " checked" : ""}" data-rid="${r.id}">`;
      h += `<div class="cell actions" data-r="${r.id}">${colorBar}<div class="rn">
        <span class="grabby" data-act="grab"><i class="ph ph-dots-six-vertical"></i></span>
        <span class="num">${it.num}</span>
        <span class="chk" data-act="check"><span class="cbox ${checked ? "on" : ""}"><i class="ph-bold ph-check"></i></span></span>
        <span class="expand" data-act="expand" data-tip="Expand record (Space)"><i class="ph ph-arrows-out-simple"></i></span></div></div>`;
      fs.forEach((f, i) => {
        const isSel = state.sel && state.sel.recId === r.id && state.sel.fieldId === f.id;
        const isCur = curMatch && curMatch.recId === r.id && curMatch.fieldId === f.id;
        h += `<div class="${cellClass(f)}${i === 0 ? " primary" : ""}${isSel ? " sel" : ""}" data-r="${r.id}" data-f="${f.id}" style="width:${f.width}px">${cellInner(r, f, isCur)}${isSel ? '<span class="fill-handle" aria-label="Fill handle"></span>' : ""}</div>`;
      });
      h += `</div>`;
    }
    // ghost "add record" row
    h += `<div class="row ghost" data-act="addrow" title="You can also insert a new ${D.table.recordNoun} anywhere by pressing Shift-Enter">
      <div class="cell actions"><i class="ph ph-plus"></i></div>
      <div class="cell primary" style="width:${pf.width}px"></div>
      <div class="cell filler" style="width:${totalW - pf.width}px"></div></div>`;
    grid.innerHTML = h;

    renderSummary(fs);
    updateToolbar();
    syncSummaryScroll();
    D.save({ fields: state.fields, records: state.records });
  }

  // ---------------------------------------------------------------- summary bar
  const SUMMARY_FNS = {
    none: { label: "None" },
    empty: { label: "Empty", fn: (vals) => vals.filter((v) => v === "" || v == null || v === false).length },
    filled: { label: "Filled", fn: (vals) => vals.filter((v) => !(v === "" || v == null || v === false)).length },
    unique: { label: "Unique", fn: (vals) => new Set(vals.filter((v) => v !== "" && v != null)).size },
    percentEmpty: { label: "Percent empty", fn: (vals) => pct(vals.filter((v) => v === "" || v == null || v === false).length, vals.length) },
    percentFilled: { label: "Percent filled", fn: (vals) => pct(vals.filter((v) => !(v === "" || v == null || v === false)).length, vals.length) },
    sum: { label: "Sum", num: true, fn: (vals) => vals.reduce((s, v) => s + (Number(v) || 0), 0) },
    average: { label: "Average", num: true, fn: (vals) => (vals.length ? vals.reduce((s, v) => s + (Number(v) || 0), 0) / vals.length : 0) },
    median: { label: "Median", num: true, fn: (vals) => { const s = vals.map(Number).sort((a, b) => a - b); if (!s.length) return 0; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; } },
    min: { label: "Min", num: true, fn: (vals) => Math.min(...vals.map(Number)) },
    max: { label: "Max", num: true, fn: (vals) => Math.max(...vals.map(Number)) },
    range: { label: "Range", num: true, fn: (vals) => Math.max(...vals.map(Number)) - Math.min(...vals.map(Number)) },
    checked: { label: "Checked", fn: (vals) => vals.filter(Boolean).length },
    unchecked: { label: "Unchecked", fn: (vals) => vals.filter((v) => !v).length },
  };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "0%");
  function summaryOptions(f) {
    if (isNumeric(f)) return ["none", "empty", "filled", "unique", "percentEmpty", "percentFilled", "sum", "average", "median", "min", "max", "range"];
    if (f.type === "checkbox") return ["none", "checked", "unchecked", "percentEmpty", "percentFilled"];
    return ["none", "empty", "filled", "unique", "percentEmpty", "percentFilled"];
  }
  function renderSummary(fs) {
    const pf = primary();
    let h = `<div class="scell first" style="width:${84 + pf.width}px">${noun(view.total)}</div><div class="summary-viewport" style="flex:1;overflow:hidden"><div class="summary-track" id="summaryTrack">`;
    fs.slice(1).forEach((f) => {
      const k = state.summaries[f.id];
      let inner = `<span class="sum-label">Summarize</span><i class="ph ph-caret-down"></i>`;
      if (k && k !== "none") {
        const vals = view.flat.map((r) => r[f.key]);
        let v = SUMMARY_FNS[k].fn(vals);
        if (SUMMARY_FNS[k].num && isNumeric(f)) v = fmtCurrency(v, f);
        inner = `<span class="sum-label">${SUMMARY_FNS[k].label}</span><span class="sum-val">${esc(v)}</span>`;
      }
      h += `<div class="scell" data-sf="${f.id}" style="width:${f.width}px">${inner}</div>`;
    });
    h += `</div></div>`;
    summaryBar.innerHTML = h;
    // Hide the "Summarize" placeholder text unless hovered (Airtable only shows it on hover)
    $$(".scell[data-sf]", summaryBar).forEach((el) => {
      const lbl = $(".sum-label", el);
      if (lbl && lbl.textContent === "Summarize") {
        lbl.style.visibility = "hidden";
        el.addEventListener("mouseenter", () => (lbl.style.visibility = "visible"));
        el.addEventListener("mouseleave", () => (lbl.style.visibility = "hidden"));
      }
    });
  }
  function syncSummaryScroll() {
    const t = $("#summaryTrack");
    if (t) t.style.transform = `translateX(${-gridScroll.scrollLeft}px)`;
  }
  gridScroll.addEventListener("scroll", () => { syncSummaryScroll(); closeTransient(); });

  // ---------------------------------------------------------------- toolbar state
  function updateToolbar() {
    const set = (id, cls, on, label, def) => {
      const b = $(id);
      b.classList.toggle(cls, on);
      $(".lbl", b).textContent = on ? label : def;
    };
    const nh = state.hidden.size;
    set("#btnHide", "active-hide", nh > 0, `${nh} hidden field${nh === 1 ? "" : "s"}`, "Hide fields");
    const nf = state.filters.length;
    const ff = [...new Set(state.filters.map((c) => c.fieldId))];
    set("#btnFilter", "active-filter", nf > 0, ff.length === 1 ? `Filtered by ${fieldById(ff[0])?.name}` : `Filtered by ${ff.length} fields`, "Filter");
    const ng = state.groups.length;
    set("#btnGroup", "active-group", ng > 0, `Grouped by ${ng} field${ng === 1 ? "" : "s"}`, "Group");
    const ns = state.sorts.length;
    set("#btnSort", "active-sort", ns > 0, `Sorted by ${ns} field${ns === 1 ? "" : "s"}`, "Sort");
    set("#btnColor", "active-color", !!state.colorBy, `Colored by ${fieldById(state.colorBy)?.name || ""}`, "Color");
  }

  // ---------------------------------------------------------------- selection & navigation
  function selCellEl() {
    if (!state.sel) return null;
    return grid.querySelector(`.cell[data-r="${state.sel.recId}"][data-f="${state.sel.fieldId}"]`);
  }
  function select(recId, fieldId, { scroll = true } = {}) {
    const prev = selCellEl();
    if (prev) { prev.classList.remove("sel"); prev.querySelector(".fill-handle")?.remove(); }
    state.sel = recId ? { recId, fieldId } : null;
    const el = selCellEl();
    if (el) {
      el.classList.add("sel");
      el.insertAdjacentHTML("beforeend", '<span class="fill-handle" aria-label="Fill handle"></span>');
      if (scroll) scrollCellIntoView(el);
    }
  }
  function scrollCellIntoView(el) {
    const sc = gridScroll.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const f = fieldById(el.dataset.f);
    const stickyW = 84 + primary().width;
    if (r.top < sc.top + 32) gridScroll.scrollTop -= sc.top + 32 - r.top;
    else if (r.bottom > sc.bottom - 34) gridScroll.scrollTop += r.bottom - (sc.bottom - 34);
    if (f && f !== primary()) {
      if (r.left < sc.left + stickyW) gridScroll.scrollLeft -= sc.left + stickyW - r.left;
      else if (r.right > sc.right) gridScroll.scrollLeft += r.right - sc.right + 2;
    }
  }
  function move(dr, dc) {
    if (!state.sel) return;
    const fs = visFields();
    let ri = view.flat.findIndex((r) => r.id === state.sel.recId);
    let ci = fs.findIndex((f) => f.id === state.sel.fieldId);
    ri = Math.max(0, Math.min(view.flat.length - 1, ri + dr));
    ci = Math.max(0, Math.min(fs.length - 1, ci + dc));
    if (view.flat[ri]) select(view.flat[ri].id, fs[ci].id);
  }

  // ---------------------------------------------------------------- editing
  let editor = null; // {el, rec, f, commit, cancel}
  function startEdit(recId, fieldId, initialChar) {
    const rec = recById(recId), f = fieldById(fieldId);
    if (!rec || !f) return;
    select(recId, fieldId);
    const cell = selCellEl();
    if (!cell) return;
    if (f.type === "checkbox") { toggleCheckbox(rec, f); return; }
    if (f.type === "singleSelect") { openSelectPop(cell, rec, f, (v) => { setValue(rec, f, v); render(); }); return; }
    if (f.type === "date" && initialChar === undefined) { openDatePop(cell, rec, f, (v) => { setValue(rec, f, v); render(); }); return; }

    const multiline = f.type === "multilineText";
    const el = document.createElement(multiline ? "textarea" : "input");
    el.className = "cell-editor" + (isNumeric(f) ? " num-ed" : "");
    if (!multiline) el.type = "text";
    let val = rec[f.key] ?? "";
    if (isNumeric(f) && val !== "") val = String(val);
    el.value = initialChar !== undefined ? initialChar : val;
    cell.classList.add("editing");
    cell.appendChild(el);
    el.focus();
    if (initialChar === undefined) el.setSelectionRange(el.value.length, el.value.length);
    const finish = (save) => {
      if (!editor) return;
      editor = null;
      if (save) {
        let nv = el.value;
        if (isNumeric(f)) {
          const cleaned = nv.replace(/[^0-9.\-]/g, "");
          nv = cleaned === "" ? null : Number(cleaned);
          if (Number.isNaN(nv)) nv = rec[f.key];
        }
        if (f.type === "date" && nv && !/^\d{4}-\d{2}-\d{2}$/.test(nv)) {
          const d = new Date(nv);
          nv = Number.isNaN(d.getTime()) ? rec[f.key] : d.toISOString().slice(0, 10);
        }
        setValue(rec, f, nv === "" ? (f.type === "date" ? null : "") : nv);
      }
      render();
      grid.focus({ preventScroll: true });
    };
    editor = { el, rec, f, finish };
    el.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      else if (e.key === "Enter" && !(multiline && e.shiftKey)) { e.preventDefault(); finish(true); if (!multiline) move(1, 0); }
      else if (e.key === "Tab") { e.preventDefault(); finish(true); move(0, e.shiftKey ? -1 : 1); }
    });
    el.addEventListener("blur", () => setTimeout(() => editor && editor.el === el && finish(true), 0));
  }
  function toggleCheckbox(rec, f) {
    setValue(rec, f, !rec[f.key]);
    render();
  }

  // ---------------------------------------------------------------- popover framework
  const layer = $("#layer");
  let openPop = null; // {el, anchor, onClose}
  function closePop() {
    if (!openPop) return;
    const p = openPop;
    openPop = null;
    p.el.remove();
    p.anchor?.classList?.remove("open");
    p.onClose && p.onClose();
  }
  function closeTransient() {
    if (openPop && openPop.transient) closePop();
  }
  function showPop(html, anchor, { cls = "", align = "left", x, y, onClose, transient = false, width } = {}) {
    closePop();
    const el = document.createElement("div");
    el.className = "pop " + cls;
    el.innerHTML = html;
    if (width) el.style.width = width + "px";
    layer.appendChild(el);
    const rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    let left = x ?? (rect ? (align === "right" ? rect.right - el.offsetWidth : rect.left) : 0);
    let top = y ?? (rect ? rect.bottom + 4 : 0);
    left = Math.max(8, Math.min(left, innerWidth - el.offsetWidth - 8));
    if (top + el.offsetHeight > innerHeight - 8) top = Math.max(8, (rect && !y ? rect.top - el.offsetHeight - 4 : innerHeight - el.offsetHeight - 8));
    el.style.left = left + "px";
    el.style.top = top + "px";
    anchor?.classList?.add("open");
    openPop = { el, anchor, onClose, transient };
    return el;
  }
  function reposition() {
    if (!openPop || !openPop.anchor?.getBoundingClientRect) return;
    const el = openPop.el;
    const rect = openPop.anchor.getBoundingClientRect();
    let left = Math.max(8, Math.min(rect.left, innerWidth - el.offsetWidth - 8));
    el.style.left = left + "px";
  }
  document.addEventListener("mousedown", (e) => {
    if (!openPop) return;
    if (openPop.el.contains(e.target)) return;
    if (openPop.anchor && openPop.anchor.contains && openPop.anchor.contains(e.target)) return;
    closePop();
  }, true);

  function menuHTML(items) {
    return items.map((it) => {
      if (it === "-") return '<div class="menu-sep"></div>';
      if (it.html) return it.html;
      return `<button class="menu-item${it.danger ? " danger" : ""}${it.disabled ? " disabled" : ""}" data-mi="${it.id}">${it.icon ? `<i class="ph ${it.icon}"></i>` : ""}<span>${esc(it.label)}</span>${it.hint ? `<span class="hint">${esc(it.hint)}</span>` : ""}</button>`;
    }).join("");
  }
  function showMenu(items, anchor, opts = {}) {
    const el = showPop(menuHTML(items), anchor, { cls: "menu", ...opts });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mi]");
      if (!b) return;
      const it = items.find((i) => i.id === b.dataset.mi);
      closePop();
      it && it.run && it.run();
    });
    return el;
  }

  // ---------------------------------------------------------------- toast / tooltip
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
      let left = r.left + r.width / 2 - tip.offsetWidth / 2;
      left = Math.max(6, Math.min(left, innerWidth - tip.offsetWidth - 6));
      let top = r.bottom + 6;
      if (top + tip.offsetHeight > innerHeight - 4) top = r.top - tip.offsetHeight - 6;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }, 350);
  });
  document.addEventListener("mousedown", () => { clearTimeout(tipT); tip.classList.remove("show"); });

  // ---------------------------------------------------------------- select / date editors
  function openSelectPop(anchor, rec, f, onPick) {
    const render = (q = "", active = -1) => {
      const opts = f.choices.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
      return `<div class="opts">${opts.map((c, i) => `<div class="opt${rec[f.key] === c.name ? " current" : ""}${i === active ? " kbd-active" : ""}" data-v="${esc(c.name)}"><span class="pill c-${c.color}">${esc(c.name)}</span></div>`).join("") || `<div style="padding:8px;color:var(--text-subtle)">No options found</div>`}</div>
        ${q && !f.choices.some((c) => c.name.toLowerCase() === q.toLowerCase()) ? `<div class="add-opt" data-new="${esc(q)}"><i class="ph ph-plus"></i>Add option: <span class="pill c-grayLight2">${esc(q)}</span></div>` : ""}`;
    };
    const el = showPop(`<div class="find"><input placeholder="Find an option" /></div><div class="body">${render()}</div>`, anchor, { cls: "select-pop", y: anchor.getBoundingClientRect().bottom + 2 });
    const input = $("input", el), body = $(".body", el);
    let active = -1;
    input.focus();
    const pick = (v) => { closePop(); onPick(v); };
    input.addEventListener("input", () => { active = 0; body.innerHTML = render(input.value, active); });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      const opts = $$(".opt", body);
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(opts.length - 1, active + 1); body.innerHTML = render(input.value, active); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); body.innerHTML = render(input.value, active); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (opts[active]) pick(opts[active].dataset.v);
        else if ($(".add-opt", body)) { const n = $(".add-opt", body).dataset.new; f.choices.push({ name: n, color: "grayLight2" }); pick(n); }
      } else if (e.key === "Escape") { closePop(); grid.focus(); }
      else if ((e.key === "Backspace" || e.key === "Delete") && !input.value && rec[f.key]) { pick(null); }
    });
    body.addEventListener("click", (e) => {
      const o = e.target.closest(".opt");
      if (o) return pick(o.dataset.v);
      const a = e.target.closest(".add-opt");
      if (a) { f.choices.push({ name: a.dataset.new, color: "grayLight2" }); pick(a.dataset.new); }
    });
  }

  function openDatePop(anchor, rec, f, onPick) {
    const cur = rec[f.key] ? new Date(rec[f.key] + "T00:00:00") : new Date();
    let ym = { y: cur.getFullYear(), m: cur.getMonth() };
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayIso = iso(new Date());
    const draw = () => {
      const first = new Date(ym.y, ym.m, 1);
      const start = new Date(first);
      start.setDate(1 - first.getDay());
      let cells = "";
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const s = iso(d);
        cells += `<div class="dp-day${d.getMonth() !== ym.m ? " other" : ""}${s === todayIso ? " today" : ""}${s === rec[f.key] ? " on" : ""}" data-d="${s}">${d.getDate()}</div>`;
      }
      return `<div class="dp-head"><button data-nav="-1"><i class="ph ph-caret-left"></i></button><span>${first.toLocaleString("en-US", { month: "long", year: "numeric" })}</span><button data-nav="1"><i class="ph ph-caret-right"></i></button></div>
        <div class="dp-grid">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div class="dp-dow">${d}</div>`).join("")}${cells}</div>
        <div class="dp-foot"><button class="link-btn blue" data-today>Today</button><button class="link-btn" data-clear>Clear</button></div>`;
    };
    const el = showPop(draw(), anchor, { cls: "datepick", y: anchor.getBoundingClientRect().bottom + 2 });
    el.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) { ym.m += Number(nav.dataset.nav); if (ym.m < 0) { ym.m = 11; ym.y--; } if (ym.m > 11) { ym.m = 0; ym.y++; } el.innerHTML = draw(); return; }
      const d = e.target.closest("[data-d]");
      if (d) { closePop(); onPick(d.dataset.d); return; }
      if (e.target.closest("[data-today]")) { closePop(); onPick(todayIso); return; }
      if (e.target.closest("[data-clear]")) { closePop(); onPick(null); }
    });
  }

  // ---------------------------------------------------------------- record operations
  function newRecord(at) {
    const rec = { id: "recNew" + Math.random().toString(36).slice(2, 12), _comments: [] };
    state.fields.forEach((f) => (rec[f.key] = f.type === "checkbox" ? false : f.type === "currency" || f.type === "date" ? null : ""));
    // Prefill from filters so the new record stays visible (Airtable does the same)
    state.filters.forEach((c) => {
      const f = fieldById(c.fieldId);
      if (f && c.value && (c.op === "is" || c.op === "eq" || c.op === "contains")) rec[f.key] = f.type === "checkbox" ? c.value === "checked" : isNumeric(f) ? Number(c.value) : c.value;
    });
    const idx = at === undefined ? state.records.length : at;
    state.records.splice(idx, 0, rec);
    pushUndo({ undo: () => state.records.splice(state.records.indexOf(rec), 1), redo: () => state.records.splice(idx, 0, rec), label: "add record" });
    return rec;
  }
  function deleteRecords(ids) {
    const removed = [];
    ids.forEach((id) => {
      const i = state.records.findIndex((r) => r.id === id);
      if (i >= 0) removed.push([i, state.records[i]]);
    });
    removed.sort((a, b) => b[0] - a[0]).forEach(([i]) => state.records.splice(i, 1));
    ids.forEach((id) => state.checked.delete(id));
    if (state.sel && ids.includes(state.sel.recId)) state.sel = null;
    pushUndo({
      undo: () => removed.slice().sort((a, b) => a[0] - b[0]).forEach(([i, r]) => state.records.splice(i, 0, r)),
      redo: () => removed.forEach(([, r]) => state.records.splice(state.records.indexOf(r), 1)),
      label: "delete",
    });
    render();
    toast(`Deleted ${removed.length === 1 ? "1 record" : removed.length + " records"}`);
  }
  function duplicateRecord(rec) {
    const copy = { ...rec, id: "recNew" + Math.random().toString(36).slice(2, 12), _comments: [] };
    const i = state.records.indexOf(rec) + 1;
    state.records.splice(i, 0, copy);
    pushUndo({ undo: () => state.records.splice(state.records.indexOf(copy), 1), redo: () => state.records.splice(i, 0, copy) });
    render();
    select(copy.id, primary().id);
  }
  function addRowAndEdit(at) {
    const rec = newRecord(at);
    render();
    select(rec.id, primary().id);
    startEdit(rec.id, primary().id, "");
  }

  // ---------------------------------------------------------------- field operations
  function newField(at, base) {
    const n = state.fieldSeq++;
    const f = base
      ? { ...base, id: "fldNew" + n, key: "k" + n, name: base.name + " copy", choices: base.choices ? base.choices.map((c) => ({ ...c })) : undefined }
      : { id: "fldNew" + n, key: "k" + n, name: "Field " + n, type: "singleLineText", icon: "text", width: 180 };
    state.records.forEach((r) => (r[f.key] = base ? r[base.key] : ""));
    state.fields.splice(at, 0, f);
    pushUndo({ undo: () => state.fields.splice(state.fields.indexOf(f), 1), redo: () => state.fields.splice(at, 0, f) });
    render();
    return f;
  }
  function deleteField(f) {
    const i = state.fields.indexOf(f);
    if (i <= 0) return;
    state.fields.splice(i, 1);
    state.sorts = state.sorts.filter((s) => s.fieldId !== f.id);
    state.filters = state.filters.filter((s) => s.fieldId !== f.id);
    state.groups = state.groups.filter((s) => s.fieldId !== f.id);
    if (state.colorBy === f.id) state.colorBy = null;
    pushUndo({ undo: () => state.fields.splice(i, 0, f), redo: () => state.fields.splice(state.fields.indexOf(f), 1) });
    render();
    toast(`Deleted field “${f.name}”`);
  }
  function editFieldPop(f, anchor) {
    const el = showPop(`
      <div style="width:400px;display:flex;flex-direction:column;gap:12px">
        <input class="f-box" id="efName" value="${esc(f.name)}" style="height:36px" />
        <div class="f-box select" style="cursor:default">${fIcon(f)}<span style="flex:1;margin-left:8px">${TYPE_LABEL[f.type] || f.type}</span><i class="ph ph-caret-down"></i></div>
        <div style="color:var(--text-subtle);font-size:12px">${typeHelp(f)}</div>
        <textarea class="f-box" id="efDesc" placeholder="Describe this field (optional)" style="min-height:60px">${esc(f.description || "")}</textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button class="link-btn" data-cancel>Cancel</button>
          <button class="btn-share" style="background:var(--blue)" data-save>Save</button>
        </div>
      </div>`, anchor);
    const nameIn = $("#efName", el);
    nameIn.focus();
    nameIn.select();
    const save = () => { f.name = nameIn.value.trim() || f.name; f.description = $("#efDesc", el).value.trim() || undefined; closePop(); render(); };
    el.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter" && e.target === nameIn) save(); if (e.key === "Escape") closePop(); });
    $("[data-cancel]", el).onclick = closePop;
    $("[data-save]", el).onclick = save;
  }
  const typeHelp = (f) => ({
    singleLineText: "A single line of text. You can optionally prefill each new cell with a default value.",
    multilineText: "A long text field that can span multiple lines.",
    email: "An email address (e.g. andrew@example.com).",
    phoneNumber: "A telephone number (e.g. (415) 555-9876).",
    singleSelect: "Select a single option from a dropdown.",
    date: "Enter a date (e.g. 11/12/2023) or choose one from a calendar.",
    currency: "A currency value. You can set the symbol and number of decimal places.",
    checkbox: "Check or uncheck to indicate status.",
  }[f.type] || "");

  function fieldMenu(f, anchor, pos) {
    const idx = state.fields.indexOf(f);
    const isPrimary = idx === 0;
    const [az, za] = sortLabels(f);
    showMenu([
      { id: "edit", label: "Edit field", icon: "ph-pencil-simple", run: () => editFieldPop(f, anchor) },
      { html: `<div class="menu-agent"><div class="agent-title"><i class="ph ph-sparkle"></i>Recommending field agents…</div><div class="bar" style="width:70%"></div><div class="bar" style="width:45%"></div></div><div class="menu-sep"></div>` },
      { id: "dup", label: "Duplicate field", icon: "ph-copy", run: () => newField(idx + 1, f) },
      { id: "left", label: "Insert left", icon: "ph-arrow-left", disabled: isPrimary, run: () => newField(idx) },
      { id: "right", label: "Insert right", icon: "ph-arrow-right", run: () => newField(idx + 1) },
      "-",
      { id: "url", label: "Copy field URL", icon: "ph-link", run: () => copyText(`${location.origin}${location.pathname}#${D.table.id}/${f.id}`, "Field URL copied") },
      { id: "desc", label: "Edit field description", icon: "ph-info", run: () => editFieldPop(f, anchor) },
      { id: "perm", label: "Edit field permissions", icon: "ph-lock-simple", run: () => toast("Field permissions are not available in this clone") },
      "-",
      { id: "az", label: `Sort  ${az}`, icon: "ph-sort-ascending", run: () => { state.sorts = [{ fieldId: f.id, dir: "asc" }]; render(); } },
      { id: "za", label: `Sort  ${za}`, icon: "ph-sort-descending", run: () => { state.sorts = [{ fieldId: f.id, dir: "desc" }]; render(); } },
      "-",
      { id: "filter", label: "Filter by this field", icon: "ph-funnel-simple", run: () => { state.filters.push({ fieldId: f.id, op: opsFor(f)[0][0], value: f.type === "checkbox" ? "checked" : "" }); render(); openFilter(); } },
      { id: "group", label: "Group by this field", icon: "ph-rows", run: () => { state.groups = [{ fieldId: f.id, dir: "asc" }]; render(); } },
      { id: "deps", label: "Show dependencies", icon: "ph-tree-structure", run: () => toast(`“${f.name}” has no dependencies`) },
      "-",
      { id: "hide", label: "Hide field", icon: "ph-eye-slash", disabled: isPrimary, run: () => { state.hidden.add(f.id); render(); } },
      { id: "del", label: "Delete field", icon: "ph-trash", danger: true, disabled: isPrimary, run: () => confirmPop(`Delete field “${f.name}”?`, "Are you sure you want to delete this field?", () => deleteField(f), anchor) },
    ], anchor, pos ? { x: pos.x, y: pos.y } : {});
  }
  function confirmPop(title, body, onYes, anchor) {
    const el = showPop(`<div style="width:320px"><div style="font-weight:600;font-size:15px;margin-bottom:6px">${esc(title)}</div><div style="color:var(--text-subtle);margin-bottom:16px">${esc(body)}</div><div style="display:flex;justify-content:flex-end;gap:8px"><button class="link-btn" data-no>Cancel</button><button class="btn-share" style="background:rgb(220,4,59)" data-yes>Delete</button></div></div>`, anchor, { x: innerWidth / 2 - 172, y: innerHeight / 3 });
    $("[data-no]", el).onclick = closePop;
    $("[data-yes]", el).onclick = () => { closePop(); onYes(); };
  }
  function copyText(text, msg) {
    (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => toast(msg), () => toast(msg));
  }

  // ---------------------------------------------------------------- row context menu
  function rowMenu(rec, x, y) {
    const many = state.checked.size > 1 && state.checked.has(rec.id);
    const pos = state.records.indexOf(rec);
    if (many) {
      const ids = [...state.checked];
      showMenu([
        { id: "dupe", label: `Duplicate ${ids.length} selected records`, icon: "ph-copy", run: () => { ids.map(recById).forEach(duplicateRecord); } },
        { id: "clear", label: "Clear selection", icon: "ph-x", run: () => { state.checked.clear(); render(); } },
        "-",
        { id: "del", label: `Delete ${ids.length} selected records`, icon: "ph-trash", danger: true, run: () => deleteRecords(ids) },
      ], null, { x, y });
      return;
    }
    showMenu([
      { id: "omni", label: "Ask Omni", icon: "ph-sparkle", run: () => toast("Omni is not available in this clone") },
      "-",
      { id: "above", label: "Insert record above", icon: "ph-arrow-up", run: () => addRowAndEdit(pos) },
      { id: "below", label: "Insert record below", icon: "ph-arrow-down", run: () => addRowAndEdit(pos + 1) },
      "-",
      { id: "dup", label: "Duplicate record", icon: "ph-copy", run: () => duplicateRecord(rec) },
      { id: "tpl", label: "Apply template", icon: "ph-file-text", run: () => toast("No record templates in this table") },
      { id: "exp", label: "Expand record", icon: "ph-arrows-out-simple", hint: "Space", run: () => openRecord(rec.id) },
      { id: "cmt", label: "Add comment", icon: "ph-chat-circle", run: () => openRecord(rec.id, true) },
      { id: "url", label: "Copy record URL", icon: "ph-link", run: () => copyText(`${location.origin}${location.pathname}#${rec.id}`, "Record URL copied") },
      { id: "send", label: "Send record", icon: "ph-paper-plane-tilt", run: () => toast("Sending records is not available in this clone") },
      { id: "print", label: "Print record", icon: "ph-printer", run: () => { openRecord(rec.id); setTimeout(() => window.print(), 200); } },
      "-",
      { id: "del", label: "Delete record", icon: "ph-trash", danger: true, run: () => deleteRecords([rec.id]) },
    ], null, { x, y });
  }

  // ---------------------------------------------------------------- grid events
  grid.tabIndex = 0;
  let resizing = null;
  let dragCol = null;
  let dragRow = null;

  grid.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "resize") {
      e.preventDefault();
      const hc = e.target.closest("[data-hf]");
      const f = fieldById(hc.dataset.hf);
      resizing = { f, x0: e.clientX, w0: f.width, handle: e.target };
      e.target.classList.add("active");
      document.body.style.cursor = "col-resize";
      return;
    }
    if (act === "grab") {
      e.preventDefault();
      const row = e.target.closest(".row");
      dragRow = { id: row.dataset.rid, y0: e.clientY, moved: false, row };
      return;
    }
    const hc = e.target.closest("[data-hf]");
    if (hc && !act && hc.dataset.hf !== primary().id) {
      dragCol = { id: hc.dataset.hf, x0: e.clientX, moved: false, el: hc };
    }
    const cell = e.target.closest(".cell[data-f]");
    if (cell && !act) {
      if (editor && editor.el && cell.contains(editor.el)) return;
      const rec = recById(cell.dataset.r), f = fieldById(cell.dataset.f);
      const wasSel = state.sel && state.sel.recId === rec.id && state.sel.fieldId === f.id;
      if (editor) editor.finish(true);
      select(rec.id, f.id, { scroll: false });
      if (f.type === "checkbox" && (e.target.closest(".checkmark") || e.target.closest(".cb-empty"))) toggleCheckbox(rec, f);
      else if (wasSel && f.type === "singleSelect") startEdit(rec.id, f.id);
      else if (wasSel && f.type === "email" && e.target.closest(".email")) window.open("mailto:" + rec[f.key]);
      if (e.target.closest(".fill-handle")) e.preventDefault();
      setTimeout(() => grid.focus({ preventScroll: true }), 0);
    }
  });
  window.addEventListener("mousemove", (e) => {
    if (resizing) {
      resizing.f.width = Math.max(60, resizing.w0 + e.clientX - resizing.x0);
      $$(`[data-hf="${resizing.f.id}"], .cell[data-f="${resizing.f.id}"], .scell[data-sf="${resizing.f.id}"]`).forEach((c) => (c.style.width = resizing.f.width + "px"));
      return;
    }
    if (dragCol) {
      if (!dragCol.moved && Math.abs(e.clientX - dragCol.x0) > 5) { dragCol.moved = true; dragCol.el.classList.add("dragging"); document.body.style.cursor = "grabbing"; }
      if (dragCol.moved) {
        $$(".row.header [data-hf]").forEach((h) => (h.style.boxShadow = ""));
        const tgt = document.elementFromPoint(e.clientX, 20 + dragCol.el.getBoundingClientRect().top)?.closest("[data-hf]");
        if (tgt && tgt !== dragCol.el && tgt.dataset.hf !== primary().id) {
          const r = tgt.getBoundingClientRect();
          tgt.style.boxShadow = e.clientX < r.left + r.width / 2 ? "inset 3px 0 0 var(--blue)" : "inset -3px 0 0 var(--blue)";
        }
      }
    }
    if (dragRow) {
      if (!dragRow.moved && Math.abs(e.clientY - dragRow.y0) > 4) {
        if (state.sorts.length || state.groups.length) { toast("Records can't be reordered while the view is sorted or grouped"); dragRow = null; return; }
        dragRow.moved = true;
        dragRow.row.style.opacity = ".5";
        document.body.style.cursor = "grabbing";
      }
      if (dragRow.moved) {
        $$(".row.data").forEach((r) => (r.style.boxShadow = ""));
        const tgt = document.elementFromPoint(dragRow.row.getBoundingClientRect().left + 40, e.clientY)?.closest(".row.data");
        if (tgt && tgt !== dragRow.row) {
          const r = tgt.getBoundingClientRect();
          tgt.style.boxShadow = e.clientY < r.top + r.height / 2 ? "inset 0 2px 0 var(--blue)" : "inset 0 -2px 0 var(--blue)";
        }
      }
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (resizing) {
      resizing.handle.classList.remove("active");
      document.body.style.cursor = "";
      resizing = null;
      render();
      return;
    }
    if (dragCol) {
      const d = dragCol;
      dragCol = null;
      document.body.style.cursor = "";
      if (d.moved) {
        const tgt = document.elementFromPoint(e.clientX, d.el.getBoundingClientRect().top + 16)?.closest("[data-hf]");
        if (tgt && tgt.dataset.hf !== d.id && tgt.dataset.hf !== primary().id) {
          const f = fieldById(d.id);
          const r = tgt.getBoundingClientRect();
          state.fields.splice(state.fields.indexOf(f), 1);
          let ti = state.fields.indexOf(fieldById(tgt.dataset.hf));
          if (e.clientX >= r.left + r.width / 2) ti++;
          state.fields.splice(Math.max(1, ti), 0, f);
        }
        render();
      }
    }
    if (dragRow) {
      const d = dragRow;
      dragRow = null;
      document.body.style.cursor = "";
      if (d.moved) {
        const tgt = document.elementFromPoint(d.row.getBoundingClientRect().left + 40, e.clientY)?.closest(".row.data");
        if (tgt && tgt.dataset.rid !== d.id) {
          const rec = recById(d.id);
          const r = tgt.getBoundingClientRect();
          const before = state.records.slice();
          state.records.splice(state.records.indexOf(rec), 1);
          let ti = state.records.indexOf(recById(tgt.dataset.rid));
          if (e.clientY >= r.top + r.height / 2) ti++;
          state.records.splice(ti, 0, rec);
          const after = state.records.slice();
          pushUndo({ undo: () => (state.records = before.slice()), redo: () => (state.records = after.slice()) });
        }
        render();
      }
    }
  });

  grid.addEventListener("click", (e) => {
    const actEl = e.target.closest("[data-act]");
    const act = actEl?.dataset.act;
    if (!act) {
      const hc = e.target.closest("[data-hf]");
      return;
    }
    if (act === "expand") { openRecord(e.target.closest(".row").dataset.rid); }
    else if (act === "check") {
      const id = e.target.closest(".row").dataset.rid;
      state.checked.has(id) ? state.checked.delete(id) : state.checked.add(id);
      render();
    } else if (act === "checkall") {
      const all = view.flat.every((r) => state.checked.has(r.id)) && view.flat.length;
      if (all) view.flat.forEach((r) => state.checked.delete(r.id));
      else view.flat.forEach((r) => state.checked.add(r.id));
      render();
    } else if (act === "fieldmenu") {
      fieldMenu(fieldById(e.target.closest("[data-hf]").dataset.hf), e.target.closest("[data-hf]"));
    } else if (act === "addfield") {
      const f = newField(state.fields.length);
      const hc = grid.querySelector(`[data-hf="${f.id}"]`);
      gridScroll.scrollLeft = gridScroll.scrollWidth;
      editFieldPop(f, hc);
    } else if (act === "addrow") {
      const last = view.flat[view.flat.length - 1];
      addRowAndEdit(last ? state.records.indexOf(last) + 1 : undefined);
    } else if (act === "togglegroup") {
      const gid = e.target.closest(".row").dataset.gid;
      state.collapsed.has(gid) ? state.collapsed.delete(gid) : state.collapsed.add(gid);
      render();
    }
  });
  grid.addEventListener("dblclick", (e) => {
    const cell = e.target.closest(".cell[data-f]");
    if (cell && !e.target.closest("[data-act]")) {
      const f = fieldById(cell.dataset.f);
      if (f.type === "checkbox") return;
      if (f.type === "singleSelect" && openPop) return;
      startEdit(cell.dataset.r, cell.dataset.f);
    }
    const hc = e.target.closest("[data-hf]");
    if (hc && !e.target.closest("[data-act]")) editFieldPop(fieldById(hc.dataset.hf), hc);
  });
  grid.addEventListener("contextmenu", (e) => {
    const hc = e.target.closest("[data-hf]");
    if (hc) { e.preventDefault(); fieldMenu(fieldById(hc.dataset.hf), hc, { x: e.clientX, y: e.clientY }); return; }
    const row = e.target.closest(".row.data");
    if (row) {
      e.preventDefault();
      const cell = e.target.closest(".cell[data-f]");
      if (cell) select(cell.dataset.r, cell.dataset.f, { scroll: false });
      rowMenu(recById(row.dataset.rid), e.clientX, e.clientY);
    }
  });

  // ---------------------------------------------------------------- summary events
  summaryBar.addEventListener("click", (e) => {
    const sc = e.target.closest("[data-sf]");
    if (!sc) return;
    const f = fieldById(sc.dataset.sf);
    const items = summaryOptions(f).map((k) => ({ id: k, label: SUMMARY_FNS[k].label, icon: state.summaries[f.id] === k || (!state.summaries[f.id] && k === "none") ? "ph-check" : "ph-placeholder", run: () => { state.summaries[f.id] = k; render(); } }));
    const el = showMenu(items, sc, { y: sc.getBoundingClientRect().top - 8 - items.length * 32 - 16 });
    $$(".ph-placeholder", el).forEach((i) => (i.style.visibility = "hidden"));
  });

  // ---------------------------------------------------------------- keyboard
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    const inField = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
    if (mod && e.key.toLowerCase() === "f" && !modalOpen()) { e.preventDefault(); openSearch(); return; }
    if (e.key === "Escape") {
      if (openPop) { closePop(); return; }
      if (modalOpen()) { closeRecord(); return; }
      if (!inField && state.sel) { select(null); return; }
    }
    if (inField || modalOpen() || editor) return;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const st = e.shiftKey ? redoStack : undoStack;
      const op = st.pop();
      if (op) { (e.shiftKey ? op.redo : op.undo)(); (e.shiftKey ? undoStack : redoStack).push(op); render(); toast(e.shiftKey ? "Redone" : "Undone"); }
      return;
    }
    if (!state.sel) return;
    const rec = recById(state.sel.recId), f = fieldById(state.sel.fieldId);
    if (!rec || !f) return;
    if (mod && e.key.toLowerCase() === "c") { e.preventDefault(); copyText(f.type === "checkbox" ? (rec[f.key] ? "checked" : "") : display(rec, f), "Copied cell"); return; }
    if (mod && e.key.toLowerCase() === "v") {
      e.preventDefault();
      navigator.clipboard?.readText().then((t) => {
        let v = t.trim();
        if (isNumeric(f)) v = Number(v.replace(/[^0-9.\-]/g, "")) || 0;
        if (f.type === "checkbox") v = !!v && v !== "false";
        if (f.type === "singleSelect" && !f.choices.some((c) => c.name === v)) f.choices.push({ name: v, color: "grayLight2" });
        setValue(rec, f, v);
        render();
      }).catch(() => toast("Clipboard access was blocked"));
      return;
    }
    switch (e.key) {
      case "ArrowUp": e.preventDefault(); mod ? move(-1e6, 0) : move(-1, 0); break;
      case "ArrowDown": e.preventDefault(); mod ? move(1e6, 0) : move(1, 0); break;
      case "ArrowLeft": e.preventDefault(); mod ? move(0, -1e6) : move(0, -1); break;
      case "ArrowRight": e.preventDefault(); mod ? move(0, 1e6) : move(0, 1); break;
      case "Tab": e.preventDefault(); move(0, e.shiftKey ? -1 : 1); break;
      case "Enter":
        e.preventDefault();
        if (e.shiftKey) { addRowAndEdit(state.records.indexOf(rec) + 1); break; }
        startEdit(rec.id, f.id);
        break;
      case " ":
        e.preventDefault();
        if (f.type === "checkbox" && !e.shiftKey) toggleCheckbox(rec, f);
        else openRecord(rec.id);
        break;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        setValue(rec, f, f.type === "checkbox" ? false : f.type === "currency" || f.type === "date" || f.type === "singleSelect" ? null : "");
        render();
        break;
      default:
        if (e.key.length === 1 && !mod && !e.altKey) {
          e.preventDefault();
          if (f.type === "singleSelect") startEdit(rec.id, f.id);
          else if (f.type !== "checkbox") startEdit(rec.id, f.id, e.key);
        }
    }
  });

  // ---------------------------------------------------------------- Hide fields
  function openHide(anchor) {
    const draw = (q = "") => state.fields.slice(1).filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).map((f) =>
      `<div class="hf-row" data-id="${f.id}"><span class="toggle ${state.hidden.has(f.id) ? "" : "on"}"></span>${fIcon(f)}<span class="nm">${esc(f.name)}</span><i class="ph ph-dots-six-vertical drag"></i></div>`).join("") || `<div style="padding:8px;color:var(--text-subtle)">No fields match</div>`;
    const el = showPop(`<div class="find"><input placeholder="Find a field" /><i class="ph ph-question" data-tip="Learn more about hiding fields"></i></div>
      <div class="hf-list">${draw()}</div>
      <div class="hf-actions"><button data-hideall>Hide all</button><button data-showall>Show all</button></div>`, anchor, { width: 300 });
    const input = $("input", el), list = $(".hf-list", el);
    input.focus();
    input.addEventListener("input", () => (list.innerHTML = draw(input.value)));
    input.addEventListener("keydown", (e) => e.stopPropagation());
    el.addEventListener("click", (e) => {
      const row = e.target.closest(".hf-row");
      if (row) {
        const id = row.dataset.id;
        state.hidden.has(id) ? state.hidden.delete(id) : state.hidden.add(id);
        if (state.sel && state.hidden.has(state.sel.fieldId)) state.sel = null;
        render();
        list.innerHTML = draw(input.value);
        return;
      }
      if (e.target.closest("[data-hideall]")) { state.fields.slice(1).forEach((f) => state.hidden.add(f.id)); state.sel = null; }
      if (e.target.closest("[data-showall]")) state.hidden.clear();
      render();
      list.innerHTML = draw(input.value);
    });
  }

  // ---------------------------------------------------------------- Filter
  function openFilter(anchor = $("#btnFilter")) {
    const fieldOpts = (sel) => state.fields.map((f) => `<option value="${f.id}"${f.id === sel ? " selected" : ""}>${esc(f.name)}</option>`).join("");
    const valueInput = (c, i) => {
      const f = fieldById(c.fieldId);
      if (c.op === "isEmpty" || c.op === "isNotEmpty") return `<input disabled style="background:rgb(248,248,248)" />`;
      if (f.type === "singleSelect") return `<select data-i="${i}" data-k="value" style="width:140px"><option value="">Select an option</option>${f.choices.map((ch) => `<option${ch.name === c.value ? " selected" : ""}>${esc(ch.name)}</option>`).join("")}</select>`;
      if (f.type === "checkbox") return `<select data-i="${i}" data-k="value" style="width:140px"><option value="checked"${c.value !== "unchecked" ? " selected" : ""}>checked</option><option value="unchecked"${c.value === "unchecked" ? " selected" : ""}>unchecked</option></select>`;
      if (f.type === "date") return `<input type="date" data-i="${i}" data-k="value" value="${esc(c.value || "")}" />`;
      return `<input data-i="${i}" data-k="value" placeholder="Enter a value" value="${esc(c.value || "")}" ${isNumeric(f) ? 'inputmode="decimal"' : ""} />`;
    };
    const draw = () => {
      if (!state.filters.length) {
        return `<div class="pop-title">In this view, show records</div>
          <div style="color:var(--text-subtle);padding:4px 0 12px">No filter conditions are applied</div>
          <div style="display:flex;gap:12px"><button class="link-btn blue" data-add><i class="ph ph-plus"></i>Add condition</button><button class="link-btn" data-addgroup><i class="ph ph-plus"></i>Add condition group <i class="ph ph-question"></i></button></div>`;
      }
      return `<div class="pop-title">In this view, show records</div>` + state.filters.map((c, i) => {
        const f = fieldById(c.fieldId);
        const lead = i === 0 ? `<span class="where">Where</span>` : i === 1 ? `<select class="conj" data-conj style="width:64px;margin-right:0;border-radius:3px;margin-right:0">${["and", "or"].map((v) => `<option${state.conj === v ? " selected" : ""}>${v}</option>`).join("")}</select>` : `<span class="where">${state.conj}</span>`;
        return `<div class="cond">${lead}
          <select data-i="${i}" data-k="fieldId" style="width:150px;${i === 1 ? "margin-left:0" : ""}">${fieldOpts(c.fieldId)}</select>
          <select data-i="${i}" data-k="op" style="width:130px">${opsFor(f).map(([v, l]) => `<option value="${v}"${v === c.op ? " selected" : ""}>${l}</option>`).join("")}</select>
          ${valueInput(c, i)}
          <button class="rm" data-rm="${i}" aria-label="Remove condition"><i class="ph ph-trash"></i></button></div>`;
      }).join("") + `<div style="display:flex;gap:12px;margin-top:4px"><button class="link-btn blue" data-add><i class="ph ph-plus"></i>Add condition</button><button class="link-btn" data-addgroup><i class="ph ph-plus"></i>Add condition group <i class="ph ph-question"></i></button></div>`;
    };
    const el = showPop(draw(), anchor, { width: state.filters.length ? 590 : 380 });
    const redraw = () => { el.innerHTML = draw(); el.style.width = (state.filters.length ? 590 : 380) + "px"; reposition(); };
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) {
        const f = primary();
        state.filters.push({ fieldId: f.id, op: opsFor(f)[0][0], value: "" });
        render(); redraw();
        setTimeout(() => $$('input[data-k="value"]', el).pop()?.focus(), 0);
      } else if (e.target.closest("[data-addgroup]")) toast("Condition groups are not available in this clone");
      else if (e.target.closest("[data-rm]")) { state.filters.splice(Number(e.target.closest("[data-rm]").dataset.rm), 1); render(); redraw(); }
    });
    el.addEventListener("change", (e) => {
      if (e.target.matches("[data-conj]")) { state.conj = e.target.value; render(); redraw(); return; }
      const i = e.target.dataset.i, k = e.target.dataset.k;
      if (i === undefined) return;
      const c = state.filters[i];
      c[k] = e.target.value;
      if (k === "fieldId") { const f = fieldById(c.fieldId); c.op = opsFor(f)[0][0]; c.value = f.type === "checkbox" ? "checked" : ""; }
      render(); redraw();
    });
    el.addEventListener("input", (e) => {
      if (e.target.tagName !== "INPUT" || e.target.dataset.k !== "value") return;
      state.filters[e.target.dataset.i].value = e.target.value;
      render();
    });
    el.addEventListener("keydown", (e) => e.stopPropagation());
  }

  // ---------------------------------------------------------------- Sort
  function openSort(anchor) {
    const pickList = (q = "", exclude = []) => state.fields.filter((f) => !exclude.includes(f.id) && f.name.toLowerCase().includes(q.toLowerCase()))
      .map((f) => `<button class="menu-item" data-pick="${f.id}">${fIcon(f)}<span>${esc(f.name)}</span></button>`).join("");
    const draw = () => {
      if (!state.sorts.length) {
        return `<div class="pop-title">Sort by <i class="ph ph-question" data-tip="Learn more about sorting"></i></div>
          <div class="find"><i class="ph ph-magnifying-glass"></i><input placeholder="Find a field" /></div>
          <div class="pick">${pickList()}</div>`;
      }
      return `<div class="pop-title">Sort by <i class="ph ph-question"></i></div>` + state.sorts.map((s, i) => {
        const f = fieldById(s.fieldId);
        const [az, za] = sortLabels(f);
        return `<div class="sort-row">
          <select data-i="${i}" style="width:220px">${state.fields.map((ff) => `<option value="${ff.id}"${ff.id === s.fieldId ? " selected" : ""}>${esc(ff.name)}</option>`).join("")}</select>
          <div class="seg"><button data-dir="asc" data-i="${i}" class="${s.dir === "asc" ? "on" : ""}">${az}</button><button data-dir="desc" data-i="${i}" class="${s.dir === "desc" ? "on" : ""}">${za}</button></div>
          <button class="vb-icon" data-rm="${i}" aria-label="Remove sort"><i class="ph ph-x"></i></button></div>`;
      }).join("") + `<div class="addanother"><button class="link-btn" data-another><i class="ph ph-plus"></i>Add another sort</button></div>
        <div class="sort-foot"><label class="small-toggle"><span class="toggle ${state.autoSort ? "on" : ""}" data-auto></span>Automatically sort records</label></div>`;
    };
    const el = showPop(draw(), anchor, { width: state.sorts.length ? 452 : 300 });
    const wire = () => {
      const input = $(".find input", el);
      if (input) {
        input.focus();
        input.addEventListener("input", () => ($(".pick", el).innerHTML = pickList(input.value)));
        input.addEventListener("keydown", (e) => e.stopPropagation());
      }
    };
    const redraw = () => { el.innerHTML = draw(); el.style.width = (state.sorts.length ? 452 : 300) + "px"; reposition(); wire(); };
    wire();
    el.addEventListener("click", (e) => {
      const p = e.target.closest("[data-pick]");
      if (p) {
        if (el.dataset.adding) { delete el.dataset.adding; }
        state.sorts.push({ fieldId: p.dataset.pick, dir: "asc" });
        render(); redraw(); return;
      }
      const d = e.target.closest("[data-dir]");
      if (d) { state.sorts[d.dataset.i].dir = d.dataset.dir; render(); redraw(); return; }
      const rm = e.target.closest("[data-rm]");
      if (rm) { state.sorts.splice(Number(rm.dataset.rm), 1); render(); redraw(); return; }
      if (e.target.closest("[data-another]")) {
        const used = state.sorts.map((s) => s.fieldId);
        $(".addanother", el).innerHTML = `<div class="find"><i class="ph ph-magnifying-glass"></i><input placeholder="Find a field" /></div><div class="pick" style="max-height:220px;overflow:auto">${pickList("", used)}</div>`;
        const input = $(".addanother input", el);
        input.focus();
        input.addEventListener("input", () => ($(".addanother .pick", el).innerHTML = pickList(input.value, used)));
        input.addEventListener("keydown", (ev) => ev.stopPropagation());
        return;
      }
      if (e.target.closest("[data-auto]")) { state.autoSort = !state.autoSort; redraw(); }
    });
    el.addEventListener("change", (e) => {
      if (e.target.tagName === "SELECT") { state.sorts[e.target.dataset.i].fieldId = e.target.value; render(); redraw(); }
    });
  }

  // ---------------------------------------------------------------- Group
  function openGroup(anchor) {
    const selectFields = () => state.fields.filter((f) => f.type === "singleSelect");
    let showAll = false;
    const pickList = () => (showAll ? state.fields : selectFields()).filter((f) => !state.groups.some((g) => g.fieldId === f.id))
      .map((f) => `<button class="menu-item" data-pick="${f.id}">${fIcon(f)}<span>${esc(f.name)}</span></button>`).join("");
    const draw = () => {
      if (!state.groups.length) {
        return `<div class="pop-title">Group by <i class="ph ph-question" data-tip="Learn more about grouping"></i></div>
          <div class="pop-sub">Pick a field to group by</div>
          <div class="pick">${pickList()}</div>
          ${showAll ? "" : `<div class="menu-sep"></div><button class="menu-item" data-all><i class="ph ph-caret-down"></i><span>See all fields</span></button>`}`;
      }
      return `<div class="pop-title">Group by <i class="ph ph-question"></i><span style="margin-left:auto;display:flex;gap:8px"><button class="link-btn" data-collapse>Collapse all</button><button class="link-btn" data-expand>Expand all</button></span></div>` + state.groups.map((g, i) => {
        const f = fieldById(g.fieldId);
        const [az, za] = sortLabels(f);
        return `<div class="sort-row">
          <select data-i="${i}" style="width:220px">${state.fields.map((ff) => `<option value="${ff.id}"${ff.id === g.fieldId ? " selected" : ""}>${esc(ff.name)}</option>`).join("")}</select>
          <div class="seg"><button data-dir="asc" data-i="${i}" class="${g.dir === "asc" ? "on" : ""}">${f.type === "singleSelect" ? "First → Last" : az}</button><button data-dir="desc" data-i="${i}" class="${g.dir === "desc" ? "on" : ""}">${f.type === "singleSelect" ? "Last → First" : za}</button></div>
          <button class="vb-icon" data-rm="${i}" aria-label="Remove group"><i class="ph ph-x"></i></button></div>`;
      }).join("") + `<div class="addsub">${state.groups.length < 3 ? `<button class="link-btn" data-sub><i class="ph ph-plus"></i>Add subgroup</button>` : ""}</div>`;
    };
    const el = showPop(draw(), anchor, { width: state.groups.length ? 470 : 260 });
    const redraw = () => { el.innerHTML = draw(); el.style.width = (state.groups.length ? 470 : 260) + "px"; reposition(); };
    el.addEventListener("click", (e) => {
      const p = e.target.closest("[data-pick]");
      if (p) { state.groups.push({ fieldId: p.dataset.pick, dir: "asc" }); state.collapsed.clear(); render(); showAll = false; redraw(); return; }
      if (e.target.closest("[data-all]")) { showAll = true; redraw(); return; }
      const d = e.target.closest("[data-dir]");
      if (d) { state.groups[d.dataset.i].dir = d.dataset.dir; render(); redraw(); return; }
      const rm = e.target.closest("[data-rm]");
      if (rm) { state.groups.splice(Number(rm.dataset.rm), 1); state.collapsed.clear(); render(); redraw(); return; }
      if (e.target.closest("[data-collapse]")) { view.items.filter((i) => i.kind === "group").forEach((i) => state.collapsed.add(i.gid)); render(); return; }
      if (e.target.closest("[data-expand]")) { state.collapsed.clear(); render(); return; }
      if (e.target.closest("[data-sub]")) { $(".addsub", el).innerHTML = `<div class="pick" style="max-height:220px;overflow:auto">${pickList()}</div>`; }
    });
    el.addEventListener("change", (e) => {
      if (e.target.tagName === "SELECT") { state.groups[e.target.dataset.i].fieldId = e.target.value; state.collapsed.clear(); render(); redraw(); }
    });
  }

  // ---------------------------------------------------------------- Color
  function openColor(anchor) {
    const draw = () => {
      if (state.colorBy) {
        const f = fieldById(state.colorBy);
        return `<div class="pop-title">Color records by <b style="color:var(--text);font-weight:500">${esc(f.name)}</b><button class="link-btn" style="margin-left:auto" data-clear>Clear</button></div>
          ${f.choices.map((c) => `<div style="display:flex;align-items:center;gap:8px;height:30px"><span style="width:14px;height:14px;border-radius:3px;background:var(--c-${c.color})"></span><span class="pill c-${c.color}">${esc(c.name)}</span></div>`).join("")}`;
      }
      return `<button class="menu-item" data-mode="select" style="height:auto;padding:8px;align-items:flex-start"><i class="ph ph-caret-circle-down" style="margin-top:2px"></i><span><b style="font-weight:500">Select field</b><br><span style="color:var(--text-subtle);white-space:normal">Color records the same as a single select field</span></span></button>
        <button class="menu-item" data-mode="cond" style="height:auto;padding:8px;align-items:flex-start"><i class="ph ph-funnel-simple" style="margin-top:2px"></i><span><b style="font-weight:500">Conditions</b><br><span style="color:var(--text-subtle);white-space:normal">Color records based on conditions</span></span></button>`;
    };
    const el = showPop(draw(), anchor, { width: 300 });
    el.addEventListener("click", (e) => {
      const m = e.target.closest("[data-mode]");
      if (m && m.dataset.mode === "select") {
        el.innerHTML = `<div class="pop-sub">Pick a single select field</div>` + state.fields.filter((f) => f.type === "singleSelect").map((f) => `<button class="menu-item" data-cf="${f.id}">${fIcon(f)}<span>${esc(f.name)}</span></button>`).join("");
        return;
      }
      if (m && m.dataset.mode === "cond") { toast("Conditional coloring is not available in this clone"); return; }
      const cf = e.target.closest("[data-cf]");
      if (cf) { state.colorBy = cf.dataset.cf; render(); el.innerHTML = draw(); return; }
      if (e.target.closest("[data-clear]")) { state.colorBy = null; render(); el.innerHTML = draw(); }
    });
  }

  // ---------------------------------------------------------------- Row height
  function openRowHeight(anchor) {
    const opts = [["short", "Short", "ph-rows"], ["medium", "Medium", "ph-square-split-vertical"], ["tall", "Tall", "ph-square"], ["extra", "Extra Tall", "ph-frame-corners"]];
    const draw = () => `<div class="pop-sub" style="margin-top:0">Select a row height</div>` + opts.map(([k, l, ic]) => `<button class="menu-item" data-h="${k}" style="${state.rowHeight === k ? "color:var(--blue)" : ""}"><i class="ph ${ic}" style="${state.rowHeight === k ? "color:var(--blue)" : ""}"></i><span>${l}</span></button>`).join("") +
      `<div class="menu-sep"></div><label class="small-toggle" style="padding:4px 8px"><span class="toggle ${state.wrapHeaders ? "on" : ""}" data-wrap></span>Wrap headers</label>`;
    const el = showPop(draw(), anchor, { cls: "menu", width: 220 });
    el.addEventListener("click", (e) => {
      const h = e.target.closest("[data-h]");
      if (h) { state.rowHeight = h.dataset.h; render(); el.innerHTML = draw(); }
      if (e.target.closest("[data-wrap]")) { state.wrapHeaders = !state.wrapHeaders; render(); el.innerHTML = draw(); }
    });
  }

  // ---------------------------------------------------------------- Share & sync
  function openShare(anchor) {
    showMenu([
      { id: "link", label: "Create link to view", icon: "ph-link-simple", run: () => copyText(location.href, "Shareable view link copied") },
      { id: "sync", label: "Sync data to another base", icon: "ph-arrows-clockwise", run: () => toast("Sync is not available in this clone") },
      { id: "embed", label: "Embed this view on your site", icon: "ph-code", run: () => copyText(`<iframe src="${location.href}" width="100%" height="533"></iframe>`, "Embed code copied") },
      "-",
      { id: "csv", label: "Download CSV", icon: "ph-download-simple", run: downloadCSV },
      { id: "print", label: "Print view", icon: "ph-printer", run: () => window.print() },
      "-",
      { id: "form", label: "Create a form", icon: "ph-note-blank", run: () => toast("Forms are not available in this clone") },
      { id: "iface", label: "Create an interface", icon: "ph-layout", run: () => toast("Interfaces are not available in this clone") },
    ], anchor, { align: "right" });
  }
  function downloadCSV() {
    const fs = visFields();
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [fs.map((f) => q(f.name)).join(",")].concat(view.flat.map((r) => fs.map((f) => q(f.type === "checkbox" ? (r[f.key] ? "checked" : "") : display(r, f))).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${D.table.name}-${D.view.name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------------------------------------------------------------- Search
  function openSearch() {
    const anchor = $("#searchBtn");
    const draw = () => `<div class="search-row"><input id="searchInput" placeholder="Find in view" value="${esc(state.search)}" /><span class="count">${state.search ? (matches.length ? `${state.searchIdx + 1} of ${matches.length}` : "0 results") : ""}</span>
      <button class="nav-btn" data-prev aria-label="Previous match"><i class="ph ph-caret-up"></i></button><button class="nav-btn" data-next aria-label="Next match"><i class="ph ph-caret-down"></i></button><button class="nav-btn" data-close aria-label="Close search"><i class="ph ph-x"></i></button></div>
      <div class="search-foot"><i class="ph ph-sparkle"></i>Ask Omni to search across all fields</div>`;
    const el = showPop(draw(), anchor, { cls: "search-pop", align: "right", y: anchor.getBoundingClientRect().bottom + 6, onClose: () => { state.search = ""; render(); } });
    const input = $("#searchInput", el);
    input.focus();
    input.select();
    const update = () => {
      $(".count", el).textContent = state.search ? (matches.length ? `${state.searchIdx + 1} of ${matches.length}` : "0 results") : "";
      const m = matches[state.searchIdx];
      if (m) { const c = grid.querySelector(`.cell[data-r="${m.recId}"][data-f="${m.fieldId}"]`); c && scrollCellIntoView(c); }
    };
    const go = (d) => { if (!matches.length) return; state.searchIdx = (state.searchIdx + d + matches.length) % matches.length; render(); update(); };
    input.addEventListener("input", () => { state.search = input.value; state.searchIdx = 0; render(); update(); });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); go(e.shiftKey ? -1 : 1); }
      if (e.key === "Escape") closePop();
    });
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-prev]")) go(-1);
      if (e.target.closest("[data-next]")) go(1);
      if (e.target.closest("[data-close]")) closePop();
    });
  }

  // ---------------------------------------------------------------- Expanded record
  let modal = null;
  const modalOpen = () => !!modal;
  function openRecord(recId, focusComment = false) {
    closePop();
    if (modal) modal.remove();
    const rec = recById(recId);
    if (!rec) return;
    history.replaceState(null, "", "#" + recId);
    modal = document.createElement("div");
    modal.className = "modal-backdrop";
    document.body.appendChild(modal);
    let showHidden = false;
    let sideOpen = true;
    const draw = () => {
      const idx = view.flat.findIndex((r) => r.id === rec.id);
      const pf = primary();
      const shown = state.fields.slice(1).filter((f) => showHidden || !state.hidden.has(f.id));
      const nHidden = state.fields.slice(1).filter((f) => state.hidden.has(f.id)).length;
      const input = (f) => {
        const v = rec[f.key];
        switch (f.type) {
          case "multilineText": return `<textarea class="f-box" data-k="${f.id}">${esc(v)}</textarea>`;
          case "email": return `<div class="f-box email-box"><input data-k="${f.id}" value="${esc(v)}" /></div>`;
          case "singleSelect": return `<div class="f-box select" data-sel="${f.id}" tabindex="0">${v ? `<span class="pill c-${choiceColor(f, v)}">${esc(v)}</span>` : "<span></span>"}<i class="ph ph-caret-down"></i></div>`;
          case "date": return `<div class="f-box date" data-date="${f.id}" tabindex="0"><span>${esc(v || "")}</span><i class="ph ph-caret-down" style="font-size:12px;color:var(--text-subtle)"></i></div>`;
          case "currency": return `<input class="f-box" data-k="${f.id}" data-num value="${esc(fmtCurrency(v, f))}" />`;
          case "checkbox": return `<div class="f-check" data-chk="${f.id}" role="checkbox" aria-checked="${!!v}">${v ? '<i class="ph-bold ph-check"></i>' : ""}</div>`;
          default: return `<input class="f-box" data-k="${f.id}" value="${esc(v)}" />`;
        }
      };
      const comments = rec._comments.map((c) => `<div class="act"><b>You</b> commented · just now</div><div class="comment">${esc(c)}</div>`).join("");
      return `<div class="modal" role="dialog" aria-label="Expanded record">
        <div class="modal-head">
          <div class="navs"><button data-nav="-1" ${idx <= 0 ? "disabled" : ""} aria-label="Previous record" data-tip="Previous record (K)"><i class="ph ph-caret-up"></i></button><button data-nav="1" ${idx < 0 || idx >= view.flat.length - 1 ? "disabled" : ""} aria-label="Next record" data-tip="Next record (J)"><i class="ph ph-caret-down"></i></button></div>
          <div class="acts">
            <button data-more aria-label="More options"><i class="ph ph-dots-three"></i></button>
            <button data-copy aria-label="Copy record URL" data-tip="Copy record URL"><i class="ph ph-link"></i></button>
            <button data-side class="comment-toggle ${sideOpen ? "on" : ""}" aria-label="Toggle comments" data-tip="Toggle comments"><i class="ph ph-chat-centered-text"></i></button>
            <span style="width:8px"></span>
            <button data-close aria-label="Close" data-tip="Close (Esc)"><i class="ph ph-x"></i></button>
          </div>
        </div>
        <div class="modal-body">
          <div class="modal-main"><div class="modal-inner">
            <div class="primary-field"><div class="f-label">${fIcon(pf)}${esc(pf.name)}</div><input data-k="${pf.id}" value="${esc(rec[pf.key])}" placeholder="Unnamed record" /></div>
            ${shown.map((f) => `<div class="frow"><div class="f-label">${fIcon(f)}<span>${esc(f.name)}${f.description ? ` <i class="ph ph-info" style="font-size:12px" data-tip="${esc(f.description)}"></i>` : ""}</span></div><div class="f-input">${input(f)}</div></div>`).join("")}
            ${nHidden ? `<button class="link-btn hidden-fields-note" data-showhidden>${showHidden ? "Hide" : "Show"} ${nHidden} hidden field${nHidden === 1 ? "" : "s"}</button>` : ""}
            <button class="add-field-link" data-addfield><i class="ph ph-plus"></i>Add new field to this table</button>
          </div></div>
          ${sideOpen ? `<div class="modal-side"><div class="activity">${comments || `<div class="act"><b>You</b> created this record · 2 days ago</div>`}</div>
            <div class="composer"><input placeholder="Leave a comment" id="commentInput" /></div></div>` : ""}
        </div></div>`;
    };
    const redraw = () => {
      modal.innerHTML = draw();
      if (focusComment) { $("#commentInput", modal)?.focus(); focusComment = false; }
    };
    redraw();
    modal.addEventListener("mousedown", (e) => { if (e.target === modal) closeRecord(); });
    modal.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) { const idx = view.flat.findIndex((r) => r.id === rec.id); const n = view.flat[idx + Number(nav.dataset.nav)]; if (n) openRecord(n.id); return; }
      if (e.target.closest("[data-close]")) return closeRecord();
      if (e.target.closest("[data-copy]")) return copyText(`${location.origin}${location.pathname}#${rec.id}`, "Record URL copied");
      if (e.target.closest("[data-side]")) { sideOpen = !sideOpen; return redraw(); }
      if (e.target.closest("[data-showhidden]")) { showHidden = !showHidden; return redraw(); }
      if (e.target.closest("[data-addfield]")) { closeRecord(); const f = newField(state.fields.length); gridScroll.scrollLeft = gridScroll.scrollWidth; editFieldPop(f, grid.querySelector(`[data-hf="${f.id}"]`)); return; }
      const more = e.target.closest("[data-more]");
      if (more) {
        showMenu([
          { id: "dup", label: "Duplicate record", icon: "ph-copy", run: () => { duplicateRecord(rec); closeRecord(); } },
          { id: "url", label: "Copy record URL", icon: "ph-link", run: () => copyText(`${location.origin}${location.pathname}#${rec.id}`, "Record URL copied") },
          { id: "print", label: "Print record", icon: "ph-printer", run: () => window.print() },
          "-",
          { id: "del", label: "Delete record", icon: "ph-trash", danger: true, run: () => { closeRecord(); deleteRecords([rec.id]); } },
        ], more, { align: "right" });
        return;
      }
      const chk = e.target.closest("[data-chk]");
      if (chk) { const f = fieldById(chk.dataset.chk); setValue(rec, f, !rec[f.key]); render(); return redraw(); }
      const sel = e.target.closest("[data-sel]");
      if (sel) { const f = fieldById(sel.dataset.sel); openSelectPop(sel, rec, f, (v) => { setValue(rec, f, v); render(); redraw(); }); return; }
      const dt = e.target.closest("[data-date]");
      if (dt) { const f = fieldById(dt.dataset.date); openDatePop(dt, rec, f, (v) => { setValue(rec, f, v); render(); redraw(); }); }
    });
    modal.addEventListener("change", (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      const f = fieldById(k);
      let v = e.target.value;
      if (e.target.hasAttribute("data-num")) { const n = v.replace(/[^0-9.\-]/g, ""); v = n === "" ? null : Number(n); e.target.value = fmtCurrency(v, f); }
      setValue(rec, f, v);
      render();
    });
    modal.addEventListener("focusin", (e) => { if (e.target.hasAttribute && e.target.hasAttribute("data-num")) e.target.value = rec[fieldById(e.target.dataset.k).key] ?? ""; });
    modal.addEventListener("keydown", (e) => {
      if (e.target.id === "commentInput" && e.key === "Enter" && e.target.value.trim()) { rec._comments.push(e.target.value.trim()); focusComment = true; redraw(); return; }
      if (e.key === "Escape") { e.stopPropagation(); if (openPop) closePop(); else closeRecord(); return; }
      if (e.target.closest("input, textarea")) { if (e.key === "Enter" && e.target.tagName === "INPUT") e.target.blur(); return; }
      if (e.key === "j" || e.key === "k") { const idx = view.flat.findIndex((r) => r.id === rec.id); const n = view.flat[idx + (e.key === "j" ? 1 : -1)]; if (n) openRecord(n.id); }
    });
    modal.tabIndex = -1;
    if (!focusComment) setTimeout(() => $(".primary-field input", modal)?.focus(), 0);
  }
  function closeRecord() {
    if (!modal) return;
    modal.remove();
    modal = null;
    history.replaceState(null, "", location.pathname + location.search);
    grid.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- toolbar & chrome wiring
  const POPS = { hide: openHide, filter: (a) => openFilter(a), group: openGroup, sort: openSort, color: openColor, rowheight: openRowHeight, share: openShare };
  $$(".vb-btn[data-pop]").forEach((b) => b.addEventListener("click", () => {
    if (openPop && openPop.anchor === b) return closePop();
    POPS[b.dataset.pop](b);
  }));
  $("#searchBtn").addEventListener("click", () => (openPop && openPop.anchor === $("#searchBtn") ? closePop() : openSearch()));
  $("#toggleSidebar").addEventListener("click", () => $("#viewSidebar").classList.toggle("open"));
  $("#copyLink").addEventListener("click", () => copyText(location.href, "Link copied to clipboard"));
  $("#addRowFloat").addEventListener("click", () => addRowAndEdit());
  $("#addFloatMenu").addEventListener("click", (e) => showMenu([
    { id: "rec", label: "Add record", icon: "ph-plus", run: () => addRowAndEdit() },
    { id: "field", label: "Add field", icon: "ph-columns-plus-right", run: () => { const f = newField(state.fields.length); gridScroll.scrollLeft = gridScroll.scrollWidth; editFieldPop(f, grid.querySelector(`[data-hf="${f.id}"]`)); } },
    "-",
    { id: "ai", label: "Generate records with AI", icon: "ph-magic-wand", run: () => toast("AI is not available in this clone") },
    { id: "import", label: "Import data", icon: "ph-upload-simple", run: () => toast("Importing is not available in this clone") },
  ], e.currentTarget, { y: e.currentTarget.getBoundingClientRect().top - 210 }));

  $$(".top-tab:not(a)").forEach((t) => t.addEventListener("click", () => {
    if (t.textContent !== "Data") toast(`${t.textContent} isn't part of this clone`);
  }));
  $("#shareBtn").addEventListener("click", (e) => {
    const el = showPop(`<div style="width:420px">
      <div style="font-size:16px;font-weight:600;margin-bottom:12px">Share “${esc(D.base.name)}”</div>
      <div style="display:flex;gap:8px"><input class="f-box" placeholder="Invite more base collaborators via email" style="flex:1;height:36px" />
      <button class="btn-share" style="background:var(--blue);height:36px">Send invite</button></div>
      <div class="menu-sep"></div>
      <button class="menu-item" data-mi="link"><i class="ph ph-link"></i><span>Create a shared link to the whole base</span></button>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px"><span class="rail-btn avatar" style="margin:0">T</span><span style="flex:1">You <span style="color:var(--text-subtle)">(owner)</span></span><span style="color:var(--text-subtle)">Owner</span></div>
    </div>`, e.currentTarget, { align: "right" });
    $("button.btn-share", el).onclick = () => toast("Invites are not sent from this clone");
    $("[data-mi=link]", el).onclick = () => { closePop(); copyText(location.href, "Base link copied"); };
    $("input", el).addEventListener("keydown", (ev) => ev.stopPropagation());
  });

  const chromeMenus = {
    base: [
      { id: "ren", label: "Rename base", icon: "ph-pencil-simple", run: () => toast("Renaming is not available in this clone") },
      { id: "dup", label: "Duplicate base", icon: "ph-copy", run: () => toast("Duplicating is not available in this clone") },
      { id: "star", label: "Add to starred", icon: "ph-star", run: () => toast("Added to starred") },
      "-",
      { id: "set", label: "Base settings", icon: "ph-gear-six", run: () => toast("Settings are not available in this clone") },
      { id: "guide", label: "Base guide", icon: "ph-book-open", run: () => toast("No base guide") },
      "-",
      { id: "del", label: "Delete base", icon: "ph-trash", danger: true, disabled: true },
    ],
    table: [
      { id: "imp", label: "Import data", icon: "ph-upload-simple", run: () => toast("Importing is not available in this clone") },
      "-",
      { id: "ren", label: "Rename table", icon: "ph-pencil-simple", run: () => toast("Renaming is not available in this clone") },
      { id: "hide", label: "Hide table", icon: "ph-eye-slash", disabled: true },
      { id: "dup", label: "Duplicate table", icon: "ph-copy", run: () => toast("Duplicating is not available in this clone") },
      "-",
      { id: "dd", label: "Configure date dependencies", icon: "ph-calendar-dots", run: () => toast("Date dependencies are not available in this clone") },
      { id: "desc", label: "Edit table description", icon: "ph-info", run: () => toast("Descriptions are not available in this clone") },
      { id: "perm", label: "Edit table permissions", icon: "ph-lock-simple", run: () => toast("Permissions are not available in this clone") },
      "-",
      { id: "clr", label: "Clear data", icon: "ph-eraser", run: () => toast("Clearing data is not available in this clone") },
      { id: "del", label: "Delete table", icon: "ph-trash", danger: true, disabled: true },
    ],
    alltables: [{ html: `<div class="find" style="margin:0 4px 6px"><i class="ph ph-magnifying-glass"></i><input placeholder="Find a table" /></div>` }, { id: "t", label: D.table.name, icon: "ph-check", run: () => {} }],
    addimport: [
      { html: `<div class="pop-sub" style="padding:0 8px">Add a blank table</div>` },
      { id: "blank", label: "Start from scratch", icon: "ph-plus", run: () => toast("Adding tables is not available in this clone") },
      "-",
      { html: `<div class="pop-sub" style="padding:0 8px">Add from other sources</div>` },
      { id: "csv", label: "CSV file", icon: "ph-file-csv", run: () => toast("Importing is not available in this clone") },
      { id: "gs", label: "Google Sheets", icon: "ph-google-drive-logo", run: () => toast("Importing is not available in this clone") },
      { id: "xls", label: "Microsoft Excel", icon: "ph-microsoft-excel-logo", run: () => toast("Importing is not available in this clone") },
      { id: "sf", label: "Salesforce", icon: "ph-cloud", run: () => toast("Importing is not available in this clone") },
    ],
    tools: [
      { id: "ext", label: "Extensions", icon: "ph-puzzle-piece", run: () => toast("Extensions are not available in this clone") },
      { id: "rec", label: "Record templates", icon: "ph-file-text", run: () => toast("No record templates") },
      { id: "dd", label: "Date dependencies", icon: "ph-calendar-dots", run: () => toast("Date dependencies are not available in this clone") },
      { id: "ins", label: "Insights", icon: "ph-chart-line-up", run: () => toast("Insights are not available in this clone") },
    ],
    view: [
      { html: `<div class="pop-sub" style="padding:0 8px;display:flex;align-items:center;gap:6px"><i class="ph ph-users"></i>Collaborative view</div><div style="padding:0 8px 6px;color:var(--text-subtle);font-size:11px">Editors and up can edit the view configuration</div><div class="menu-sep"></div>` },
      { id: "ai", label: "Ask Omni about this view", icon: "ph-sparkle", run: () => toast("Omni is not available in this clone") },
      "-",
      { id: "ren", label: "Rename view", icon: "ph-pencil-simple", run: () => toast("Renaming is not available in this clone") },
      { id: "desc", label: "Edit view description", icon: "ph-info", run: () => toast("Descriptions are not available in this clone") },
      { id: "dup", label: "Duplicate view", icon: "ph-copy", run: () => toast("Duplicating is not available in this clone") },
      { id: "cfg", label: "Copy another view's configuration", icon: "ph-clipboard-text", run: () => toast("There's only one view") },
      { id: "notif", label: "Notifications", icon: "ph-bell", run: () => toast("Notifications are not available in this clone") },
      "-",
      { id: "csv", label: "Download CSV", icon: "ph-download-simple", run: downloadCSV },
      { id: "print", label: "Print view", icon: "ph-printer", run: () => window.print() },
      "-",
      { id: "del", label: "Delete view", icon: "ph-trash", danger: true, disabled: true },
    ],
  };
  $$("[data-menu]").forEach((b) => b.addEventListener("click", (e) => {
    if (openPop && openPop.anchor === b) return closePop();
    const items = chromeMenus[b.dataset.menu];
    const el = showMenu(items, b, { align: b.classList.contains("tools") ? "right" : "left" });
    $("input", el)?.addEventListener("keydown", (ev) => ev.stopPropagation());
  }));

  window.addEventListener("resize", () => { closePop(); syncSummaryScroll(); });

  // ---------------------------------------------------------------- boot
  render();
  if (location.hash && recById(location.hash.slice(1))) openRecord(location.hash.slice(1));
})();
