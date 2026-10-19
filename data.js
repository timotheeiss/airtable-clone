// Mock "Accounts" table of Tallyroll, a fictional payroll and timesheet software company, in grid view order.
// Record IDs and the base/table/view IDs come from the original base; the account data is fictional.
window.AT_DATA = (() => {
  const choices = {
    country: ["France", "United States", "United Kingdom", "Germany", "Japan", "Canada", "Italy", "Spain", "Netherlands", "Australia"].map((n) => ({ name: n, color: "grayLight2" })),
    type: ["SMB", "Mid-market", "Enterprise"].map((n) => ({ name: n, color: "grayLight2" })),
    plan: [{ name: "Starter", color: "grayLight2" }, { name: "Growth", color: "blueLight2" }, { name: "Enterprise", color: "purpleLight2" }],
    status: [
      { name: "Lead", color: "yellowLight2" },
      { name: "Active", color: "greenLight2" },
      { name: "Paused", color: "orangeLight2" },
      { name: "Churned", color: "redLight2" },
    ],
    channel: ["Inbound demo", "Outbound", "Partner referral", "Marketplace", "Webinar", "Trade show"].map((n) => ({ name: n, color: "grayLight2" })),
  };

  const fields = [
    { id: "fldXbHtoI6otZ9dZz", key: "name", name: "Name", type: "singleLineText", icon: "text" },
    { id: "fldQdZcAL83O2vQ0Q", key: "notes", name: "Notes", type: "multilineText", icon: "paragraph" },
    { id: "fld5SJ5j67XNp41K3", key: "email", name: "Email", type: "email", icon: "email" },
    { id: "fldJkYiPpUMb38wM4", key: "phone", name: "Phone", type: "phoneNumber", icon: "phone" },
    { id: "fldhnbaHCEXdA2bFg", key: "country", name: "Country", type: "singleSelect", icon: "select", choices: choices.country },
    { id: "fldK2cQ7mRtY4uZpA", key: "countryCode", name: "Country Code", type: "formula", icon: "formula", kind: "derived", formula: "countryCode" },
    { id: "fldLvbvD6865100Dx", key: "type", name: "Customer Type", type: "singleSelect", icon: "select", choices: choices.type },
    { id: "fldH4g0FB44FvtEfM", key: "plan", name: "Plan", type: "singleSelect", icon: "select", choices: choices.plan },
    { id: "fldP9oLdx3VbN1qWe", key: "planOld", name: "Plan (old)", type: "singleLineText", icon: "text" },
    { id: "fldsFAmY1pxJfLUtC", key: "status", name: "Customer Status", type: "singleSelect", icon: "select", choices: choices.status },
    { id: "fldS7nEw2kJh5gTrc", key: "statusNew", name: "Customer Status (new)", type: "singleSelect", icon: "select", choices: choices.status.map((c) => ({ ...c })) },
    {
      id: "fldOfqTmun1gC9JGm", key: "signup", name: "Signup Date", type: "date", icon: "date",
      description: "The date the account first created their Tallyroll workspace, in YYYY-MM-DD format. Use it to measure customer tenure, group signups into cohorts, and track acquisition trends over time. Leads use the date they first signed up, even if they haven't finished onboarding.",
    },
    { id: "fldT3nUr8dYs6aXzb", key: "tenure", name: "Tenure (days)", type: "formula", icon: "formula", kind: "derived", formula: "tenure", numeric: true },
    { id: "fldpPCudBx51Yebai", key: "ltv", name: "Lifetime Value", type: "currency", icon: "currency", symbol: "€", precision: 2, summary: "sum" },
    { id: "fldA4rRfN5cE8mKqd", key: "arr", name: "ARR (finance)", type: "currency", icon: "currency", symbol: "€", precision: 2 },
    { id: "fldtsi6LsHdHVbABh", key: "channel", name: "Acquisition Channel", type: "singleSelect", icon: "select", choices: choices.channel },
    { id: "fldyRs6gyP3HBjcu3", key: "optin", name: "Marketing Opt-in", type: "checkbox", icon: "checkbox" },
  ];

  // [id, name, notes, email, phone, country, type, plan, status, signup, ltv, channel, optin]
  const rows = [
    ["recuiSQc1eaLUrp1X", "Laurent & Fils Plomberie", "Paris. 18 employees, monthly payroll for site crews.", "payroll@laurent-plomberie.example.com", "+33 6 12 34 56 01", "France", "SMB", "Growth", "Active", "2024-03-14", 0, "Outbound", 1],
    ["recgCRf3LOyM4ybOv", "Cascade Office Furniture", "Portland. 12 staff, self-serve signup.", "finance@cascade-office.example.com", "+1 555 010 2201", "United States", "SMB", "Starter", "Active", "2025-06-02", 0, "Marketplace", 0],
    ["recBnkTyfoWCDsUpj", "Takahashi Precision Parts", "Tokyo. 140 employees across two plants, shift timesheets.", "hr@takahashi-precision.example.com", "+81 90 5550 1103", "Japan", "Mid-market", "Enterprise", "Active", "2023-11-20", 0, "Partner referral", 1],
    ["recC5AqmpQxpnaauJ", "Bennett Facilities Management", "London. Contract paused over the summer while they re-tender.", "office@bennett-facilities.example.com", "+44 7700 900104", "United Kingdom", "SMB", "Growth", "Paused", "2024-08-09", 0, "Inbound demo", 0],
    ["recM9VjiTbWHXnzr6", "Fischer Elektrotechnik GmbH", "Berlin. 35 electricians, weekly timesheets.", "admin@fischer-elektrotechnik.example.com", "+49 151 5550 1105", "Germany", "SMB", "Growth", "Active", "2024-01-27", 0, "Webinar", 1],
    ["recQ3glRosJN2q1nz", "Rhône Valley Logistics", "Lyon. 3 depots, 260 drivers. Partner account.", "accounts@rhone-valley.example.com", "+33 1 55 50 11 06", "France", "Mid-market", "Enterprise", "Active", "2023-05-15", 0, "Trade show", 1],
    ["recrdQ5OSt8D9YKQF", "Rossi Ricambi Industriali", "Milan. Came in from the Q3 outbound campaign.", "payroll@rossi-ricambi.example.com", "+39 345 555 0107", "Italy", "SMB", "Starter", "Lead", "2026-09-30", 0, "Outbound", 1],
    ["reckiJQSLtKtq39JX", "García Gestoría", "Barcelona. Accounting firm running payroll for its own clients.", "finance@garcia-gestoria.example.com", "+34 612 555 108", "Spain", "SMB", "Growth", "Active", "2025-02-18", 0, "Partner referral", 1],
    ["recUTOUaJ64efmfqs", "De Vries Schoonmaak BV", "Amsterdam. Cleaning company, inactive since early 2026.", "hr@vries-schoonmaak.example.com", "+31 6 5550 1109", "Netherlands", "SMB", "Starter", "Churned", "2024-04-03", 0, "Inbound demo", 0],
    ["recqhis2ouocGkW71", "Martin Comptabilité", "Montréal. 9 staff, uses the expense add-on.", "office@martin-comptabilite.example.com", "+1 555 010 2210", "Canada", "SMB", "Growth", "Active", "2024-10-11", 0, "Marketplace", 1],
    ["recuMaTKyi22aHgOS", "Southbank Dental Group", "Melbourne. 4 clinics.", "admin@southbank-dental.example.com", "+61 412 555 111", "Australia", "SMB", "Starter", "Active", "2025-12-05", 0, "Outbound", 0],
    ["recjFhXKqV2Id9RJI", "Moreau Transports", "Marseille. Met at the Paris HR & Payroll trade show.", "accounts@moreau-transports.example.com", "+33 6 12 34 56 12", "France", "Mid-market", "Enterprise", "Active", "2023-09-01", 0, "Trade show", 1],
    ["rec3djoqxothu0z7I", "Carter Mechanical Contractors", "Brooklyn. 60 union and non-union staff.", "payroll@carter-mechanical.example.com", "+1 555 010 2213", "United States", "SMB", "Growth", "Active", "2024-05-22", 0, "Inbound demo", 1],
    ["rec4fwPbupYdsUslF", "Silverdale Property Services", "Manchester. Facilities contractor, 6 regional teams.", "finance@silverdale-property.example.com", "+44 20 7946 0114", "United Kingdom", "Mid-market", "Enterprise", "Active", "2023-07-19", 0, "Partner referral", 1],
    ["recrjIYXRp7ff5c73", "Sato Packaging Co.", "Osaka. Trial onboarding not completed.", "hr@sato-packaging.example.com", "+81 80 5550 1115", "Japan", "SMB", "Starter", "Lead", "2026-10-08", 0, "Marketplace", 0],
    ["recCT9uMkgQpu24H6", "Schneider Haustechnik", "Munich. Cancelled Growth after 8 months.", "office@schneider-haustechnik.example.com", "+49 160 5550 1116", "Germany", "SMB", "Growth", "Churned", "2024-02-10", 0, "Webinar", 0],
    ["rect1rMaYwrANWlbG", "Bianchi Forniture Ufficio", "Rome. 22 staff, monthly payroll.", "admin@bianchi-forniture.example.com", "+39 333 555 0117", "Italy", "SMB", "Growth", "Active", "2025-04-26", 0, "Outbound", 1],
    ["reciszsoNFrxNAWBy", "Fernández Asesores Fiscales", "Madrid.", "accounts@fernandez-asesores.example.com", "+34 655 555 118", "Spain", "SMB", "Starter", "Active", "2025-09-14", 0, "Inbound demo", 1],
    ["recfJ3pxo5ASOKEdK", "Visser Warehousing", "Rotterdam. Two warehouses, seasonal staff.", "payroll@visser-warehousing.example.com", "+31 6 5550 1119", "Netherlands", "SMB", "Growth", "Active", "2024-12-01", 0, "Partner referral", 0],
    ["rec2akP87Tdt42t43", "O'Connor Fleet Services", "Toronto.", "finance@o-connor.example.com", "+1 555 010 2220", "Canada", "SMB", "Starter", "Paused", "2025-03-07", 0, "Webinar", 1],
    ["recvGAtLMtJEXekIF", "Harbourview Accounting", "Sydney. 30 staff, uses timesheets only.", "hr@harbourview-accounting.example.com", "+61 423 555 121", "Australia", "SMB", "Growth", "Active", "2024-07-16", 0, "Marketplace", 1],
    ["recVTD2eAPUK3S6t8", "Groupe Delacroix Nettoyage", "Paris. 1,100 cleaners on 40 sites, evaluating Enterprise for all regions.", "office@delacroix-nettoyage.example.com", "+33 1 55 50 11 22", "France", "Enterprise", "Enterprise", "Lead", "2026-10-02", 0, "Trade show", 1],
    ["recwWcM2pyQ6XnGKP", "Mitchell Commercial Roofing", "Los Angeles. 180 field staff, payroll and job costing.", "admin@mitchell-commercial.example.com", "+1 555 010 2223", "United States", "Mid-market", "Enterprise", "Active", "2023-12-12", 0, "Inbound demo", 1],
    ["recsF8fubbRbpA4ov", "Watanabe Signage", "Kyoto.", "accounts@watanabe-signage.example.com", "+81 70 5550 1124", "Japan", "SMB", "Growth", "Active", "2024-06-30", 0, "Outbound", 0],
    ["rec9cgYmlYEJ7wuYi", "Evans Catering Supplies", "Bristol.", "payroll@evans-catering.example.com", "+44 7700 900125", "United Kingdom", "SMB", "Starter", "Active", "2026-01-19", 0, "Partner referral", 1],
    ["rec4HLYfbaf3SE7VM", "Wagner Kühltechnik", "Hamburg. 95 technicians, refrigeration service.", "finance@wagner-kuhltechnik.example.com", "+49 170 5550 1126", "Germany", "Mid-market", "Enterprise", "Active", "2023-10-05", 0, "Webinar", 1],
    ["recWJValbQe7muHRY", "Ricci Imballaggi", "Florence.", "hr@ricci-imballaggi.example.com", "+39 347 555 0127", "Italy", "SMB", "Starter", "Churned", "2024-09-21", 0, "Marketplace", 0],
    ["recpwgEvWmJg5Ey2l", "Martínez Climatización", "Valencia.", "office@martinez-climatizacion.example.com", "+34 678 555 128", "Spain", "SMB", "Growth", "Active", "2025-01-08", 0, "Outbound", 1],
    ["recAao2gHV3shm3AC", "Jansen Installatietechniek", "Utrecht.", "admin@jansen-installatietechniek.example.com", "+31 6 5550 1129", "Netherlands", "SMB", "Starter", "Lead", "2026-10-12", 0, "Inbound demo", 0],
    ["recm3aLaaidWyHQLt", "Northlight Industrial Supply", "Vancouver. Distributor, co-marketing partner.", "accounts@northlight-industrial.example.com", "+1 555 010 2230", "Canada", "Mid-market", "Enterprise", "Active", "2024-03-28", 0, "Trade show", 1],
    ["recYnOLcAnBWqQTrj", "Clarke Pest Control", "Brisbane.", "payroll@clarke-pest.example.com", "+61 434 555 131", "Australia", "SMB", "Growth", "Paused", "2025-05-17", 0, "Partner referral", 1],
    ["recKRkK28lKqSmCnl", "Lefèvre Menuiserie", "Bordeaux.", "finance@lefevre-menuiserie.example.com", "+33 6 12 34 56 32", "France", "SMB", "Starter", "Active", "2025-11-23", 0, "Marketplace", 0],
    ["recmjIOQjHIvWGaxx", "Reed Storage Solutions", "Austin.", "hr@reed-storage.example.com", "+1 555 010 2233", "United States", "SMB", "Growth", "Active", "2024-11-04", 0, "Outbound", 1],
    ["recfcAjlx46XQN459", "Kobayashi Office Systems", "Yokohama.", "office@kobayashi-office.example.com", "+81 90 5550 1134", "Japan", "SMB", "Starter", "Active", "2026-02-14", 0, "Inbound demo", 1],
    ["recWJAK2N07uTFPFn", "Hughes Insurance Brokers", "Edinburgh.", "admin@hughes-insurance.example.com", "+44 7700 900135", "United Kingdom", "SMB", "Growth", "Churned", "2023-08-29", 0, "Webinar", 0],
    ["recngFylle6pk01OF", "Becker Gebäudereinigung", "Cologne.", "accounts@becker-gebaudereinigung.example.com", "+49 152 5550 1136", "Germany", "SMB", "Starter", "Active", "2025-07-03", 0, "Outbound", 1],
    ["rec0Ift3M8SkyR5Z0", "Torino Componenti Meccanici", "Turin. 320 employees, payroll synced to their ERP.", "payroll@torino-componenti.example.com", "+39 011 555 0137", "Italy", "Mid-market", "Enterprise", "Active", "2024-04-17", 0, "Partner referral", 1],
    ["recV6rb1NfAqgw8iL", "Navarro Distribuciones", "Seville.", "finance@navarro-distribuciones.example.com", "+34 690 555 138", "Spain", "Mid-market", "Enterprise", "Active", "2024-02-29", 0, "Trade show", 1],
    ["recAQK4tEbF6g6t0O", "Bakker Administratiekantoor", "The Hague.", "hr@bakker-administratiekantoor.example.com", "+31 6 5550 1139", "Netherlands", "SMB", "Growth", "Active", "2025-08-12", 0, "Marketplace", 0],
    ["recbPYMcvmkDWjIDG", "Roy Entretien Ménager", "Québec City.", "office@roy-entretien.example.com", "+1 555 010 2240", "Canada", "SMB", "Growth", "Active", "2024-09-09", 0, "Inbound demo", 1],
    ["reclWxz2ZszNfqpeW", "Harris Electrical Services", "Perth.", "admin@harris-electrical.example.com", "+61 445 555 141", "Australia", "SMB", "Starter", "Lead", "2026-10-15", 0, "Outbound", 1],
    ["recVR9wC8JQEnVkCc", "Dubois Imprimerie", "Lille. Print shop, 2 sites.", "accounts@dubois-imprimerie.example.com", "+33 6 12 34 56 42", "France", "SMB", "Growth", "Active", "2024-06-06", 0, "Webinar", 1],
    ["recTTPIomXhEZiBPB", "Rivera Janitorial Supply", "Chicago.", "payroll@rivera-janitorial.example.com", "+1 555 010 2243", "United States", "SMB", "Starter", "Churned", "2024-01-15", 0, "Marketplace", 0],
    ["recgvZEN3n1OHsGQ6", "Nakamura Cold Storage", "Sapporo. Customer since the first release.", "finance@nakamura-cold.example.com", "+81 80 5550 1144", "Japan", "Mid-market", "Enterprise", "Active", "2023-06-24", 0, "Partner referral", 1],
    ["recbzZUFZxWnOcqgL", "Walsh Recruitment", "Leeds.", "hr@walsh-recruitment.example.com", "+44 7700 900145", "United Kingdom", "SMB", "Growth", "Active", "2025-10-30", 0, "Inbound demo", 1],
    ["recFTBGFm5tnk425n", "Hoffmann Steuerberatung", "Frankfurt.", "office@hoffmann-steuerberatung.example.com", "+49 171 5550 1146", "Germany", "SMB", "Growth", "Paused", "2024-10-25", 0, "Outbound", 0],
    ["recxwck8YerYMAeqX", "Conti Trasporti", "Naples.", "admin@conti-trasporti.example.com", "+39 320 555 0147", "Italy", "SMB", "Growth", "Active", "2025-03-21", 0, "Webinar", 1],
    ["rec6Y0pquyafashtT", "López Ferretería Industrial", "Bilbao.", "accounts@lopez-ferreteria.example.com", "+34 611 555 148", "Spain", "SMB", "Starter", "Active", "2026-04-09", 0, "Partner referral", 1],
    ["recmptUvm1uRFpol9", "Mulder Machinebouw", "Eindhoven.", "payroll@mulder-machinebouw.example.com", "+31 6 5550 1149", "Netherlands", "Mid-market", "Enterprise", "Active", "2023-12-30", 0, "Trade show", 0],
    ["recgqkITY52J4EqVU", "Pacific Facility Group", "Sydney. 900 staff across facility contracts, 12 payroll entities.", "finance@pacific-facility.example.com", "+61 2 5550 1150", "Australia", "Enterprise", "Enterprise", "Active", "2024-08-20", 0, "Partner referral", 1],
  ];

  const keys = ["id", "name", "notes", "email", "phone", "country", "type", "plan", "status", "signup", "ltv", "channel", "optin"];
  const records = rows.map((r) => {
    const rec = {};
    keys.forEach((k, i) => (rec[k] = r[i]));
    rec.optin = !!rec.optin;
    return rec;
  });

  // Values for the fields added for the schema prototype.
  const OLD_PLAN = { Starter: "Basic", Growth: "Plus", Enterprise: "Premium" };
  // Monthly subscription value in EUR, by plan and company size.
  const MONTHLY = (rec) => (rec.plan === "Starter" ? 99 : rec.plan === "Growth" ? 390 : rec.type === "Enterprise" ? 4200 : 1450);
  const monthsSince = (iso) => Math.max(0, Math.round((new Date("2026-10-19") - new Date(iso)) / (30.4 * 86400000)));
  records.forEach((rec, i) => {
    // Revenue invoiced since signup: leads haven't paid, churned and paused accounts stopped part-way.
    const share = rec.status === "Lead" ? 0 : rec.status === "Churned" ? 0.6 : rec.status === "Paused" ? 0.85 : 1;
    rec.ltv = Math.round(MONTHLY(rec) * monthsSince(rec.signup) * share);
    // Legacy plan names were only filled for accounts that signed up before the 2024 pricing change.
    rec.planOld = rec.signup < "2024-01-01" ? OLD_PLAN[rec.plan] : "";
    // A half-adopted copy of Customer Status that drifts from the original on paused accounts.
    rec.statusNew = [0, 1, 3].includes(i % 8) ? (rec.status === "Paused" ? "Active" : rec.status) : "";
    // Annual recurring revenue of active subscriptions, in EUR.
    rec.arr = rec.status === "Active" ? MONTHLY(rec) * 12 : 0;
  });

  // Mock field descriptions (Signup Date keeps its real description from the base).
  const DESCRIPTIONS = {
    fldXbHtoI6otZ9dZz: "Registered company name of the account, as it appears on contracts and invoices. This is the primary field shown on linked records and in interfaces.",
    fldQdZcAL83O2vQ0Q: "Free-form notes from the account team: city first, then headcount, products used and anything useful about the account's history.",
    fld5SJ5j67XNp41K3: "Main admin or billing contact for the account. Used for invoices, product updates and, if opted in, marketing emails.",
    fldJkYiPpUMb38wM4: "Main contact phone number in international format, including the country code.",
    fldhnbaHCEXdA2bFg: "Country of the account's billing entity. Drives invoicing currency, tax handling and regional reporting.",
    fldLvbvD6865100Dx: "Company size segment: SMB (under 50 employees), Mid-market (50–500) or Enterprise (500+).",
    fldH4g0FB44FvtEfM: "Current subscription plan: Starter, Growth or Enterprise. Set by Sales Ops when a contract is signed or changed.",
    fldsFAmY1pxJfLUtC: "Lifecycle stage of the account. Lead = trial or demo with no contract, Active = paying, Paused = contract on hold, Churned = cancelled or not renewed.",
    fldpPCudBx51Yebai: "Total revenue invoiced to the account since signup, in euros. Leads stay at €0.00.",
    fldtsi6LsHdHVbABh: "Channel that sourced the account, as logged by Sales Ops when the opportunity was created.",
    fldyRs6gyP3HBjcu3: "Checked when the account's main contact agreed to receive marketing emails. Only opted-in contacts can be added to campaigns.",
  };
  fields.forEach((f) => { if (!f.description && DESCRIPTIONS[f.id]) f.description = DESCRIPTIONS[f.id]; });

  // Schema-layer metadata (prototype): status, owner, verification, history, dependencies and Omni drafts.
  // [by, date] pairs; history is listed newest first and ends with the creation event.
  const META = {
    fldXbHtoI6otZ9dZz: { status: "canonical", owner: "sam", created: ["ben", "2021-03-02"], verified: ["sam", "2026-08-12"] },
    fldQdZcAL83O2vQ0Q: { status: "canonical", owner: "lea", created: ["ben", "2021-03-02"], verified: ["lea", "2025-11-03"] },
    fld5SJ5j67XNp41K3: { status: "canonical", owner: "sam", created: ["ben", "2021-03-02"], verified: ["sam", "2026-08-12"] },
    fldJkYiPpUMb38wM4: { status: "canonical", owner: "sam", created: ["ben", "2021-03-02"], verified: ["sam", "2026-08-12"] },
    fldhnbaHCEXdA2bFg: { status: "canonical", owner: "sam", created: ["ben", "2021-03-02"], verified: ["sam", "2026-06-01"],
      history: [["raj", "2024-09-18", "options", "Added options “Netherlands” and “Australia”"]] },
    fldK2cQ7mRtY4uZpA: { created: ["raj", "2025-05-20"], noPurpose: true,
      history: [["raj", "2025-05-21", "formula", "Formula changed to cover all 10 countries"]],
      drafts: {
        status: { value: "canonical", reason: "Computed from Country, 100% filled, used by the ‘Regional digest’ automation." },
        owner: { value: "raj", reason: "Raj Patel created this field and edited its formula." },
        purpose: { value: "Two-letter ISO country code derived from Country. Use it for exports and integrations that expect ISO codes; edit Country instead of this field." },
      },
      automations: ["Regional digest (weekly)"] },
    fldLvbvD6865100Dx: { status: "canonical", owner: "sam", created: ["ben", "2021-03-02"], verified: ["sam", "2026-02-10"] },
    fldH4g0FB44FvtEfM: { status: "canonical", owner: "maria", created: ["ben", "2023-01-09"], verified: ["maria", "2026-09-05"],
      history: [["maria", "2024-01-15", "options", "Options renamed: Basic → Starter, Plus → Growth, Premium → Enterprise"]] },
    fldP9oLdx3VbN1qWe: { created: ["ben", "2021-03-02"], updated: ["ben", "2023-01-09"], noPurpose: true,
      history: [["ben", "2023-01-09", "rename", "Renamed from “Plan” to “Plan (old)”"]],
      drafts: {
        status: { value: "deprecated", reason: "Replaced by Plan in Jan 2023. Only filled for accounts that signed up before 2024, with no edits since Jan 2023." },
        purpose: { value: "Legacy plan names from the 2021 pricing (Basic, Plus, Premium). Superseded by Plan — keep for history only and don't use in new reports." },
      } },
    fldsFAmY1pxJfLUtC: { status: "canonical", owner: "lea", created: ["ben", "2021-03-02"], verified: ["lea", "2026-09-30"],
      history: [["lea", "2025-03-04", "options", "Added option “Paused”"]],
      automations: ["Win-back email when Churned"] },
    fldS7nEw2kJh5gTrc: { created: ["raj", "2025-03-11"], updated: ["raj", "2025-04-02"], noPurpose: true,
      history: [["raj", "2025-04-02", "options", "Copied options from Customer Status"]],
      drafts: {
        status: { value: "deprecated", reason: "Possible duplicate of Customer Status: same options, only 40% filled, and it disagrees with Customer Status on paused accounts." },
        purpose: { value: "Abandoned copy of Customer Status started in March 2025. Use Customer Status instead; values here are incomplete and partly out of date." },
      } },
    fldOfqTmun1gC9JGm: { status: "canonical", owner: "raj", created: ["ben", "2021-03-02"], verified: ["raj", "2026-07-14"],
      history: [["raj", "2026-07-14", "description", "Description rewritten"]] },
    fldT3nUr8dYs6aXzb: { status: "canonical", owner: "raj", created: ["raj", "2025-06-03"], verified: ["raj", "2026-07-14"],
      purpose: "Days since the customer signed up, computed from Signup Date. Use it for tenure cohorts and retention charts." },
    fldpPCudBx51Yebai: { status: "canonical", owner: "maria", created: ["ben", "2021-06-14"], verified: ["maria", "2026-09-05"],
      history: [["maria", "2024-02-01", "config", "Currency changed from USD to EUR"]] },
    fldA4rRfN5cE8mKqd: { status: "canonical", owner: "maria", created: ["ben", "2022-04-04"], verified: ["maria", "2026-09-12"], updated: ["maria", "2026-09-12"],
      purpose: "Annual recurring revenue for the account, as reported to the board. Calculated as the monthly subscription value of all active contracts × 12, in EUR. Excludes one-off fees and usage overages. Updated by Finance on the 5th of each month after reconciliation, so figures can lag by up to five weeks. For lifetime revenue, use Lifetime Value instead.",
      history: [
        ["maria", "2026-09-12", "description", "Description updated after the Q3 board review"],
        ["maria", "2024-02-01", "config", "Currency changed from GBP to EUR"],
        ["ben", "2022-06-20", "rename", "Renamed from “Annual revenue” to “ARR (finance)”"],
      ],
      automations: ["Alert Finance when ARR drops", "Monthly ARR digest to #finance"] },
    fldtsi6LsHdHVbABh: { created: ["raj", "2022-02-08"], updated: ["raj", "2025-08-19"],
      history: [["raj", "2025-08-19", "options", "Added option “Webinar”"]],
      drafts: {
        status: { value: "canonical", reason: "Fully filled, edited regularly and used by the Growth dashboard." },
        owner: { value: "raj", reason: "Raj Patel created the field and made all option changes." },
      } },
    fldyRs6gyP3HBjcu3: { status: "canonical", owner: "raj", created: ["ben", "2021-09-30"], verified: ["raj", "2025-12-01"] },
  };
  const ACTION_LABEL = { created: "Created", rename: "Renamed", options: "Options changed", formula: "Formula edited", config: "Configuration changed", description: "Purpose edited", status: "Status changed", owner: "Owner changed", verified: "Verified" };
  fields.forEach((f) => {
    const m = META[f.id] || {};
    f.kind = f.kind || "data";
    f.status = m.status || null;
    f.owner = m.owner || null;
    if (m.purpose) f.description = m.purpose;
    if (m.noPurpose) delete f.description;
    f.created = { by: m.created?.[0] || "ben", at: m.created?.[1] || "2021-03-02" };
    f.verified = m.verified ? { by: m.verified[0], at: m.verified[1] } : null;
    f.drafts = m.drafts || {};
    f.automations = m.automations || [];
    const hist = (m.history || []).map(([by, at, action, detail]) => ({ by, at, action, detail }));
    if (f.verified) hist.push({ by: f.verified.by, at: f.verified.at, action: "verified", detail: "Marked as verified" });
    hist.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    hist.push({ by: f.created.by, at: f.created.at, action: "created", detail: `Created as ${f.type === "formula" ? "a formula" : "a " + f.type.replace(/([A-Z])/g, " $1").toLowerCase()} field` });
    f.history = hist;
    const u = m.updated ? { by: m.updated[0], at: m.updated[1] } : hist[0] ? { by: hist[0].by, at: hist[0].at } : f.created;
    f.updated = u;
  });

  // Field manager metadata: every field defaults to "Editors and up"; four fields are used by the base's interface.
  const IFACE_DEPS = ["fldXbHtoI6otZ9dZz", "fld5SJ5j67XNp41K3", "fldQdZcAL83O2vQ0Q", "fldJkYiPpUMb38wM4"];
  fields.forEach((f) => {
    f.permission = "Editors and up";
    f.deps = IFACE_DEPS.includes(f.id) ? 2 : 0;
  });

  // Field and record edits are shared between the grid and the field manager for the browser session.
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem("at-clone-state-v5") || "null"); } catch (e) {}

  return {
    // Base-level context shown at the top of the Schema tab. Owner, status and purpose are editable;
    // the rest of the context (tables, canonical and deprecated fields) is derived from field metadata.
    base: {
      id: "appUThSIYDUYQmhvk",
      name: "Customers MASTER",
      status: "production",
      owner: "sam",
      purpose: "System of record for all customer accounts, from closed-won to churned. Built in 2022 and used daily by sales ops, onboarding and finance. Sales ops owns account and contact fields, Finance owns revenue fields, which are reconciled on the 5th of each month. Use this base, not the regional sales bases or the 2023 CRM import, for any pipeline or revenue figure. Status fields marked “(new)” are deprecated.",
      updated: { by: "sam", at: "2026-08-12" },
      ...(saved?.base || {}),
    },
    table: { id: "tblP1m5M6B8nkCbay", name: "Accounts", recordNoun: "account", canonicalFor: "Accounts", owner: "sam" },
    actionLabel: ACTION_LABEL,
    view: { id: "viwUCyJEFlT0gIKcC", name: "Grid view" },
    fields: saved?.fields || fields,
    records: saved?.records || records,
    save(state) {
      try { sessionStorage.setItem("at-clone-state-v5", JSON.stringify(state)); } catch (e) {}
    },
  };
})();
