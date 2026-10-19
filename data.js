// Snapshot of base appUThSIYDUYQmhvk / table "Accounts" (formerly "Customers") / "Grid view", in view order.
window.AT_DATA = (() => {
  const choices = {
    country: ["France", "United States", "United Kingdom", "Germany", "Japan", "Canada", "Italy", "Spain", "Netherlands", "Australia"].map((n) => ({ name: n, color: "grayLight2" })),
    type: [{ name: "Individual", color: "grayLight2" }, { name: "Business", color: "grayLight2" }],
    plan: [{ name: "Free", color: "grayLight2" }, { name: "Pro", color: "blueLight2" }, { name: "Studio", color: "purpleLight2" }],
    status: [
      { name: "Lead", color: "yellowLight2" },
      { name: "Active", color: "greenLight2" },
      { name: "Paused", color: "orangeLight2" },
      { name: "Churned", color: "redLight2" },
    ],
    channel: ["Organic Search", "Instagram", "Referral", "App Store", "Newsletter", "Event"].map((n) => ({ name: n, color: "grayLight2" })),
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
      description: "The date the customer first created their Newgrain account (web or iOS app), in YYYY-MM-DD format. Use it to measure customer tenure, group signups into cohorts, and track acquisition trends over time. Leads use the date they first signed up, even if they haven't finished onboarding.",
    },
    { id: "fldT3nUr8dYs6aXzb", key: "tenure", name: "Tenure (days)", type: "formula", icon: "formula", kind: "derived", formula: "tenure", numeric: true },
    { id: "fldpPCudBx51Yebai", key: "ltv", name: "Lifetime Value", type: "currency", icon: "currency", symbol: "€", precision: 2, summary: "sum" },
    { id: "fldA4rRfN5cE8mKqd", key: "arr", name: "ARR (finance)", type: "currency", icon: "currency", symbol: "€", precision: 2 },
    { id: "fldtsi6LsHdHVbABh", key: "channel", name: "Acquisition Channel", type: "singleSelect", icon: "select", choices: choices.channel },
    { id: "fldyRs6gyP3HBjcu3", key: "optin", name: "Marketing Opt-in", type: "checkbox", icon: "checkbox" },
  ];

  // [id, name, notes, email, phone, country, type, plan, status, signup, ltv, channel, optin]
  const rows = [
    ["recuiSQc1eaLUrp1X", "Camille Laurent", "Paris. Shoots Portra 400 on a Leica M6.", "camille.laurent@example.com", "+33 6 12 34 56 01", "France", "Individual", "Pro", "Active", "2024-03-14", 184.5, "Instagram", 1],
    ["recgCRf3LOyM4ybOv", "Ethan Brooks", "Portland. New to film, mostly 35mm.", "ethan.brooks@example.com", "+1 555 010 2201", "United States", "Individual", "Free", "Active", "2025-06-02", 0, "App Store", 0],
    ["recBnkTyfoWCDsUpj", "Hana Takahashi", "Tokyo. Medium format, Mamiya 7.", "hana.takahashi@example.com", "+81 90 5550 1103", "Japan", "Individual", "Studio", "Active", "2023-11-20", 412, "Referral", 1],
    ["recC5AqmpQxpnaauJ", "Oliver Bennett", "London. Paused subscription over the summer.", "oliver.bennett@example.com", "+44 7700 900104", "United Kingdom", "Individual", "Pro", "Paused", "2024-08-09", 96, "Organic Search", 0],
    ["recM9VjiTbWHXnzr6", "Lena Fischer", "Berlin. Develops B&W at home.", "lena.fischer@example.com", "+49 151 5550 1105", "Germany", "Individual", "Pro", "Active", "2024-01-27", 210, "Newsletter", 1],
    ["recQ3glRosJN2q1nz", "Grainhouse Lab", "Lyon. Film lab, partner account.", "hello@grainhouse.example.com", "+33 1 55 50 11 06", "France", "Business", "Studio", "Active", "2023-05-15", 1840, "Event", 1],
    ["recrdQ5OSt8D9YKQF", "Marco Rossi", "Milan. Signed up via Instagram campaign.", "marco.rossi@example.com", "+39 345 555 0107", "Italy", "Individual", "Free", "Lead", "2026-09-30", 0, "Instagram", 1],
    ["reckiJQSLtKtq39JX", "Sofia García", "Barcelona. Street photography.", "sofia.garcia@example.com", "+34 612 555 108", "Spain", "Individual", "Pro", "Active", "2025-02-18", 132, "Referral", 1],
    ["recUTOUaJ64efmfqs", "Daan de Vries", "Amsterdam. Inactive since early 2026.", "daan.devries@example.com", "+31 6 5550 1109", "Netherlands", "Individual", "Free", "Churned", "2024-04-03", 0, "Organic Search", 0],
    ["recqhis2ouocGkW71", "Chloe Martin", "Montréal. Half-frame enthusiast.", "chloe.martin@example.com", "+1 555 010 2210", "Canada", "Individual", "Pro", "Active", "2024-10-11", 158, "App Store", 1],
    ["recuMaTKyi22aHgOS", "Jack Wilson", "Melbourne.", "jack.wilson@example.com", "+61 412 555 111", "Australia", "Individual", "Free", "Active", "2025-12-05", 0, "Instagram", 0],
    ["recjFhXKqV2Id9RJI", "Inès Moreau", "Marseille. Met at Paris Photo.", "ines.moreau@example.com", "+33 6 12 34 56 12", "France", "Individual", "Studio", "Active", "2023-09-01", 389, "Event", 1],
    ["rec3djoqxothu0z7I", "Noah Carter", "Brooklyn. Large format 4x5.", "noah.carter@example.com", "+1 555 010 2213", "United States", "Individual", "Pro", "Active", "2024-05-22", 176, "Organic Search", 1],
    ["rec4fwPbupYdsUslF", "Silver & Salt Studio", "Manchester. Darkroom rental studio, 4 seats.", "studio@silversalt.example.com", "+44 20 7946 0114", "United Kingdom", "Business", "Studio", "Active", "2023-07-19", 1325, "Referral", 1],
    ["recrjIYXRp7ff5c73", "Yuki Sato", "Osaka. Trial onboarding not completed.", "yuki.sato@example.com", "+81 80 5550 1115", "Japan", "Individual", "Free", "Lead", "2026-10-08", 0, "App Store", 0],
    ["recCT9uMkgQpu24H6", "Max Schneider", "Munich. Cancelled Pro after 8 months.", "max.schneider@example.com", "+49 160 5550 1116", "Germany", "Individual", "Pro", "Churned", "2024-02-10", 72, "Newsletter", 0],
    ["rect1rMaYwrANWlbG", "Giulia Bianchi", "Rome. Cinestill 800T night work.", "giulia.bianchi@example.com", "+39 333 555 0117", "Italy", "Individual", "Pro", "Active", "2025-04-26", 118, "Instagram", 1],
    ["reciszsoNFrxNAWBy", "Pablo Fernández", "Madrid.", "pablo.fernandez@example.com", "+34 655 555 118", "Spain", "Individual", "Free", "Active", "2025-09-14", 0, "Organic Search", 1],
    ["recfJ3pxo5ASOKEdK", "Emma Visser", "Rotterdam.", "emma.visser@example.com", "+31 6 5550 1119", "Netherlands", "Individual", "Pro", "Active", "2024-12-01", 104, "Referral", 0],
    ["rec2akP87Tdt42t43", "Liam O'Connor", "Toronto.", "liam.oconnor@example.com", "+1 555 010 2220", "Canada", "Individual", "Free", "Paused", "2025-03-07", 0, "Newsletter", 1],
    ["recvGAtLMtJEXekIF", "Mia Thompson", "Sydney. Travel photographer.", "mia.thompson@example.com", "+61 423 555 121", "Australia", "Individual", "Pro", "Active", "2024-07-16", 166, "App Store", 1],
    ["recVTD2eAPUK3S6t8", "Analog Collective Paris", "Paris. Photo club, 30 members, evaluating team plan.", "contact@analogcollective.example.com", "+33 1 55 50 11 22", "France", "Business", "Studio", "Lead", "2026-10-02", 0, "Event", 1],
    ["recwWcM2pyQ6XnGKP", "Ava Mitchell", "Los Angeles. Wedding photographer, hybrid film/digital.", "ava.mitchell@example.com", "+1 555 010 2223", "United States", "Individual", "Studio", "Active", "2023-12-12", 356, "Organic Search", 1],
    ["recsF8fubbRbpA4ov", "Kenji Watanabe", "Kyoto.", "kenji.watanabe@example.com", "+81 70 5550 1124", "Japan", "Individual", "Pro", "Active", "2024-06-30", 148, "Instagram", 0],
    ["rec9cgYmlYEJ7wuYi", "Charlotte Evans", "Bristol.", "charlotte.evans@example.com", "+44 7700 900125", "United Kingdom", "Individual", "Free", "Active", "2026-01-19", 0, "Referral", 1],
    ["rec4HLYfbaf3SE7VM", "Felix Wagner", "Hamburg. Hasselblad 500C/M.", "felix.wagner@example.com", "+49 170 5550 1126", "Germany", "Individual", "Studio", "Active", "2023-10-05", 402, "Newsletter", 1],
    ["recWJValbQe7muHRY", "Alessandro Ricci", "Florence.", "alessandro.ricci@example.com", "+39 347 555 0127", "Italy", "Individual", "Free", "Churned", "2024-09-21", 0, "App Store", 0],
    ["recpwgEvWmJg5Ey2l", "Lucía Martínez", "Valencia.", "lucia.martinez@example.com", "+34 678 555 128", "Spain", "Individual", "Pro", "Active", "2025-01-08", 140, "Instagram", 1],
    ["recAao2gHV3shm3AC", "Sem Jansen", "Utrecht.", "sem.jansen@example.com", "+31 6 5550 1129", "Netherlands", "Individual", "Free", "Lead", "2026-10-12", 0, "Organic Search", 0],
    ["recm3aLaaidWyHQLt", "Northlight Film Supply", "Vancouver. Film retailer, co-marketing partner.", "orders@northlight.example.com", "+1 555 010 2230", "Canada", "Business", "Studio", "Active", "2024-03-28", 960, "Event", 1],
    ["recYnOLcAnBWqQTrj", "Ruby Clarke", "Brisbane.", "ruby.clarke@example.com", "+61 434 555 131", "Australia", "Individual", "Pro", "Paused", "2025-05-17", 60, "Referral", 1],
    ["recKRkK28lKqSmCnl", "Hugo Lefèvre", "Bordeaux.", "hugo.lefevre@example.com", "+33 6 12 34 56 32", "France", "Individual", "Free", "Active", "2025-11-23", 0, "App Store", 0],
    ["recmjIOQjHIvWGaxx", "Isabella Reed", "Austin.", "isabella.reed@example.com", "+1 555 010 2233", "United States", "Individual", "Pro", "Active", "2024-11-04", 122, "Instagram", 1],
    ["recfcAjlx46XQN459", "Ren Kobayashi", "Yokohama.", "ren.kobayashi@example.com", "+81 90 5550 1134", "Japan", "Individual", "Free", "Active", "2026-02-14", 0, "Organic Search", 1],
    ["recWJAK2N07uTFPFn", "George Hughes", "Edinburgh.", "george.hughes@example.com", "+44 7700 900135", "United Kingdom", "Individual", "Pro", "Churned", "2023-08-29", 88, "Newsletter", 0],
    ["recngFylle6pk01OF", "Mila Becker", "Cologne.", "mila.becker@example.com", "+49 152 5550 1136", "Germany", "Individual", "Free", "Active", "2025-07-03", 0, "Instagram", 1],
    ["rec0Ift3M8SkyR5Z0", "Fotolab Torino", "Turin. Lab scans uploaded directly to customer accounts.", "info@fotolabtorino.example.com", "+39 011 555 0137", "Italy", "Business", "Studio", "Active", "2024-04-17", 1105, "Referral", 1],
    ["recV6rb1NfAqgw8iL", "Diego Navarro", "Seville.", "diego.navarro@example.com", "+34 690 555 138", "Spain", "Individual", "Studio", "Active", "2024-02-29", 298, "Event", 1],
    ["recAQK4tEbF6g6t0O", "Julia Bakker", "The Hague.", "julia.bakker@example.com", "+31 6 5550 1139", "Netherlands", "Individual", "Pro", "Active", "2025-08-12", 84, "App Store", 0],
    ["recbPYMcvmkDWjIDG", "Benjamin Roy", "Québec City.", "benjamin.roy@example.com", "+1 555 010 2240", "Canada", "Individual", "Pro", "Active", "2024-09-09", 152, "Organic Search", 1],
    ["reclWxz2ZszNfqpeW", "Zoe Harris", "Perth.", "zoe.harris@example.com", "+61 445 555 141", "Australia", "Individual", "Free", "Lead", "2026-10-15", 0, "Instagram", 1],
    ["recVR9wC8JQEnVkCc", "Léa Dubois", "Lille. Instant film (Polaroid SX-70).", "lea.dubois@example.com", "+33 6 12 34 56 42", "France", "Individual", "Pro", "Active", "2024-06-06", 168, "Newsletter", 1],
    ["recTTPIomXhEZiBPB", "Lucas Rivera", "Chicago.", "lucas.rivera@example.com", "+1 555 010 2243", "United States", "Individual", "Free", "Churned", "2024-01-15", 0, "App Store", 0],
    ["recgvZEN3n1OHsGQ6", "Aoi Nakamura", "Sapporo. Early adopter.", "aoi.nakamura@example.com", "+81 80 5550 1144", "Japan", "Individual", "Studio", "Active", "2023-06-24", 448, "Referral", 1],
    ["recbzZUFZxWnOcqgL", "Harry Walsh", "Leeds.", "harry.walsh@example.com", "+44 7700 900145", "United Kingdom", "Individual", "Pro", "Active", "2025-10-30", 60, "Organic Search", 1],
    ["recFTBGFm5tnk425n", "Clara Hoffmann", "Frankfurt.", "clara.hoffmann@example.com", "+49 171 5550 1146", "Germany", "Individual", "Pro", "Paused", "2024-10-25", 90, "Instagram", 0],
    ["recxwck8YerYMAeqX", "Matteo Conti", "Naples.", "matteo.conti@example.com", "+39 320 555 0147", "Italy", "Individual", "Pro", "Active", "2025-03-21", 112, "Newsletter", 1],
    ["rec6Y0pquyafashtT", "Carmen López", "Bilbao.", "carmen.lopez@example.com", "+34 611 555 148", "Spain", "Individual", "Free", "Active", "2026-04-09", 0, "Referral", 1],
    ["recmptUvm1uRFpol9", "Lars Mulder", "Eindhoven.", "lars.mulder@example.com", "+31 6 5550 1149", "Netherlands", "Individual", "Studio", "Active", "2023-12-30", 372, "Event", 0],
    ["recgqkITY52J4EqVU", "Darkroom Co-op Sydney", "Sydney. Community darkroom, 12 seats.", "team@darkroomcoop.example.com", "+61 2 5550 1150", "Australia", "Business", "Studio", "Active", "2024-08-20", 780, "Referral", 1],
  ];

  const keys = ["id", "name", "notes", "email", "phone", "country", "type", "plan", "status", "signup", "ltv", "channel", "optin"];
  const records = rows.map((r) => {
    const rec = {};
    keys.forEach((k, i) => (rec[k] = r[i]));
    rec.optin = !!rec.optin;
    return rec;
  });

  // Values for the fields added for the schema prototype.
  const OLD_PLAN = { Free: "Basic", Pro: "Premium", Studio: "Premium Plus" };
  records.forEach((rec, i) => {
    // Legacy plan names were only filled for customers who signed up before the 2024 pricing change.
    rec.planOld = rec.signup < "2024-01-01" ? OLD_PLAN[rec.plan] : "";
    // A half-adopted copy of Customer Status that drifts from the original on paused accounts.
    rec.statusNew = [0, 1, 3].includes(i % 8) ? (rec.status === "Paused" ? "Active" : rec.status) : "";
    // Annual recurring revenue of active subscriptions, in EUR.
    rec.arr = rec.status !== "Active" ? 0 : rec.plan === "Pro" ? 96 : rec.plan === "Studio" ? (rec.type === "Business" ? 1200 : 300) : 0;
  });

  // Mock field descriptions (Signup Date keeps its real description from the base).
  const DESCRIPTIONS = {
    fldXbHtoI6otZ9dZz: "Full name of the customer, or the business name for studios, labs and clubs. This is the primary field shown on linked records and in interfaces.",
    fldQdZcAL83O2vQ0Q: "Free-form notes from the team: city first, then anything useful about the customer's gear, workflow or account history.",
    fld5SJ5j67XNp41K3: "Main contact email for the account. Used for receipts, product updates and, if opted in, marketing emails.",
    fldJkYiPpUMb38wM4: "Contact phone number in international format, including the country code.",
    fldhnbaHCEXdA2bFg: "Country the customer is based in. Drives pricing currency, tax handling and regional reporting.",
    fldLvbvD6865100Dx: "Whether the account belongs to an individual photographer or a business such as a lab, studio, retailer or club.",
    fldH4g0FB44FvtEfM: "Current subscription plan: Free, Pro or Studio. Business accounts are usually on Studio.",
    fldsFAmY1pxJfLUtC: "Lifecycle stage of the customer. Lead = signed up but not onboarded, Active = using the product, Paused = subscription on hold, Churned = cancelled or inactive.",
    fldpPCudBx51Yebai: "Total revenue received from the customer since signup, in euros. Free accounts stay at €0.00.",
    fldtsi6LsHdHVbABh: "Channel that brought the customer in, as reported at signup or attributed from campaign links.",
    fldyRs6gyP3HBjcu3: "Checked when the customer agreed to receive marketing emails. Only opted-in customers can be added to campaigns.",
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
      history: [["maria", "2024-01-15", "options", "Options renamed: Basic → Free, Premium → Pro, Premium Plus → Studio"]] },
    fldP9oLdx3VbN1qWe: { created: ["ben", "2021-03-02"], updated: ["ben", "2023-01-09"], noPurpose: true,
      history: [["ben", "2023-01-09", "rename", "Renamed from “Plan” to “Plan (old)”"]],
      drafts: {
        status: { value: "deprecated", reason: "Replaced by Plan in Jan 2023. Only filled for customers who signed up before 2024, with no edits since Jan 2023." },
        purpose: { value: "Legacy plan names from the 2021 pricing (Basic, Premium, Premium Plus). Superseded by Plan — keep for history only and don't use in new reports." },
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
      history: [["raj", "2025-08-19", "options", "Added option “Newsletter”"]],
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
  try { saved = JSON.parse(sessionStorage.getItem("at-clone-state-v4") || "null"); } catch (e) {}

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
      try { sessionStorage.setItem("at-clone-state-v4", JSON.stringify(state)); } catch (e) {}
    },
  };
})();
