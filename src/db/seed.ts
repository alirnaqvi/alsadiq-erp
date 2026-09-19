
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { roles, users, heads, donors, donations, pledges, settings, counters } from "./schema";
import { ALL_PERMISSIONS } from "../lib/permissions";

const withDemo = process.argv.includes("--demo");

/* ---------------------------------------------------------------- roles */

const ROLE_DEFS = [
  {
    key: "admin",
    name: "Super Admin",
    level: 1,
    dataScope: "all" as const,
    description: "Every permission in the system, including users, roles, confidential data and setup.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "limited",
    name: "Limited Access",
    level: 22,
    dataScope: "all" as const,
    description:
      "Day-to-day collection view without confidential donor data (no CNIC, email, address or audit trail).",
    permissions: [
      "collection.view",
      "donor.view",
      "member.manage",
      "report.view",
    ],
  },
  {
    key: "collector",
    name: "Collector",
    level: 30,
    dataScope: "own" as const,
    description: "Can only record new payments and register new donors at the counter.",
    permissions: ["collection.create", "collection.view", "donor.create", "donor.view"],
  },
  {
    key: "manager",
    name: "Area Manager",
    level: 20,
    dataScope: "team" as const,
    description:
      "Runs a collection area. Sees everything their team collects, can correct entries and run reports.",
    permissions: [
      "collection.create",
      "collection.view",
      "collection.void",
      "donor.create",
      "donor.edit",
      "donor.view",
      "donor.confidential",
      "donor.verify",
      "member.manage",
      "whatsapp.send",
      "report.view",
    ],
  },
  {
    key: "operator",
    name: "Data Entry Operator",
    level: 32,
    dataScope: "own" as const,
    description: "Sits at the counter. Registers donors and records what they receive.",
    permissions: ["collection.create", "collection.view", "donor.create", "donor.view"],
  },
  {
    key: "auditor",
    name: "Auditor",
    level: 25,
    dataScope: "all" as const,
    description: "Read-only oversight across the whole trust, including the audit trail.",
    permissions: ["collection.view", "donor.view", "donor.confidential", "report.view", "audit.view"],
  },
  {
    key: "verifier",
    name: "Registration Officer",
    level: 24,
    dataScope: "all" as const,
    description: "Reviews donor-app sign-up requests and decides whether to admit them.",
    permissions: ["donor.view", "donor.confidential", "donor.verify", "donor.create"],
  },
  {
    key: "storekeeper",
    name: "Storekeeper",
    level: 28,
    dataScope: "own" as const,
    description: "Looks after trust assets and inventory in/out. No access to donor records.",
    permissions: ["asset.manage", "inventory.manage"],
  },
  {
    key: "messenger",
    name: "Outreach",
    level: 26,
    dataScope: "all" as const,
    description: "Sends bulk WhatsApp reminders and receipts. Cannot see CNIC or addresses.",
    permissions: ["whatsapp.send", "donor.view", "member.manage", "collection.view"],
  },
];

/* -------------------------------------------------- placeholder heads
   These are stand-ins. Replace them from Setup → Collection heads once the
   trust hands over its real chart of heads.                              */

const HEAD_DEFS: {
  code: string;
  name: string;
  nameUr?: string;
  isEvent?: boolean;
  children?: { code: string; name: string; nameUr?: string; isEvent?: boolean }[];
}[] = [
  {
    code: "MAJLIS",
    name: "Majlis",
    nameUr: "مجلس",
    children: [
      { code: "MAJ-MUH-01", name: "1st Muharram", isEvent: true },
      { code: "MAJ-MUH-09", name: "9th Muharram (Shab-e-Ashur)", isEvent: true },
      { code: "MAJ-MUH-10", name: "10th Muharram (Ashura)", isEvent: true },
      { code: "MAJ-SAF-28", name: "28th Safar", isEvent: true },
      { code: "MAJ-ARB", name: "Arbaeen (20th Safar)", isEvent: true },
      { code: "MAJ-RAM-21", name: "21st Ramadan", isEvent: true },
    ],
  },
  {
    code: "LANGAR",
    name: "Langar & Niaz",
    nameUr: "لنگر و نیاز",
    children: [
      { code: "LNG-DEG", name: "Deg / Niaz" },
      { code: "LNG-SAB", name: "Sabeel" },
      { code: "LNG-TAB", name: "Tabarruk distribution" },
    ],
  },
  {
    code: "AZADARI",
    name: "Azadari",
    nameUr: "عزاداری",
    children: [
      { code: "AZD-JUL", name: "Juloos arrangements" },
      { code: "AZD-ALM", name: "Alam & Taboot" },
      { code: "AZD-SND", name: "Sound & lighting" },
    ],
  },
  {
    code: "AZADARI_SHARE",
    name: "Azadari Share",
    nameUr: "عزاداری شیئر",
    children: [
      { code: "AZS-MAJ", name: "Majalis" },
      { code: "AZS-GEN", name: "General Azadari Share" },
      { code: "AZS-NYZ", name: "Niyaz & tabarruk" },
    ],
  },
  {
    code: "ZAKAT",
    name: "Zakat & Sadqa",
    nameUr: "زکوٰۃ و صدقہ",
    children: [
      { code: "ZAK-GEN", name: "Zakat" },
      { code: "ZAK-SAD", name: "Sadqa" },
      { code: "ZAK-FIT", name: "Fitrana" },
    ],
  },
  {
    code: "WELFARE",
    name: "Welfare",
    nameUr: "فلاح و بہبود",
    children: [
      { code: "WEL-MED", name: "Medical assistance" },
      { code: "WEL-EDU", name: "Education support" },
      { code: "WEL-WID", name: "Widow & orphan fund" },
      { code: "WEL-RAT", name: "Ration distribution" },
    ],
  },
  {
    code: "BUILD",
    name: "Construction",
    nameUr: "تعمیرات",
    children: [
      { code: "BLD-IMB", name: "Imambargah building fund" },
      { code: "BLD-MNT", name: "Repair & maintenance" },
    ],
  },
  {
    code: "MEMBER",
    name: "Monthly Membership",
    nameUr: "ماہانہ رکنیت",
    children: [{ code: "MEM-MON", name: "Monthly contribution" }],
  },
  { code: "GENERAL", name: "General Donation", nameUr: "عام عطیہ" },
];

/* ------------------------------------------------------------ demo data */

const DEMO_NAMES = [
  "Syed Mohammad Abbas", "Ali Raza Kazmi", "Zahra Batool", "Mohammad Hasan Rizvi",
  "Fatima Naqvi", "Syed Imran Haider", "Abbas Ali Sheikh", "Nargis Jafri",
  "Mohsin Abbas Zaidi", "Sakina Bibi", "Ghulam Abbas", "Tehmina Kazmi",
  "Syed Wajahat Hussain", "Kaneez Fatima", "Mohammad Ali Shah", "Rubab Zehra",
  "Asghar Ali Mirza", "Shabbir Hussain", "Musarrat Jahan", "Qasim Ali Naqvi",
  "Zulfiqar Ali Bhatti", "Amna Sadiq", "Hyder Ali Rizvi", "Batool Fatima",
  "Nadeem Abbas", "Sajjad Haider", "Farzana Kazmi", "Irfan Ali Zaidi",
];

const CITIES = ["Karachi", "Lahore", "Rawalpindi", "Multan", "Hyderabad"];

async function main() {
  console.log("Seeding Al Sadiq Trust database...");

  /* roles */
  for (const r of ROLE_DEFS) {
    await db
      .insert(roles)
      .values({ ...r, isSystem: true })
      .onConflictDoUpdate({
        target: roles.key,
        set: {
          name: r.name,
          description: r.description,
          permissions: r.permissions,
          dataScope: r.dataScope,
          level: r.level,
        },
      });
  }
  const roleRows = await db.select().from(roles);
  const roleId = (key: string) => roleRows.find((r) => r.key === key)!.id;
  console.log(`  roles: ${roleRows.length}`);

  /* users */
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AlSadiq@2026";
  const hash = await bcrypt.hash(adminPassword, 10);

  const [admin] = await db
    .insert(users)
    .values({
      username: "admin",
      fullName: "System Administrator",
      roleId: roleId("admin"),
      passwordHash: hash,
      mobile: "03001234567",
      postedAt: "Head office",
      mustChangePassword: true,
    })
    .onConflictDoUpdate({ target: users.username, set: { roleId: roleId("admin") } })
    .returning();

  if (withDemo) {
    const [manager] = await db
      .insert(users)
      .values({
        username: "manager",
        fullName: "Syed Kazim Raza",
        roleId: roleId("manager"),
        passwordHash: hash,
        mobile: "03011234567",
        managerId: admin.id,
        postedAt: "Main Imambargah",
      })
      .onConflictDoNothing()
      .returning();

    const mgrId = manager?.id ?? admin.id;

    await db
      .insert(users)
      .values([
        {
          username: "counter1",
          fullName: "Mohammad Naqi",
          roleId: roleId("operator"),
          passwordHash: hash,
          mobile: "03021234567",
          managerId: mgrId,
          postedAt: "Counter 1",
        },
        {
          username: "counter2",
          fullName: "Ali Akbar",
          roleId: roleId("operator"),
          passwordHash: hash,
          mobile: "03031234567",
          managerId: mgrId,
          postedAt: "Counter 2",
        },
        {
          username: "auditor",
          fullName: "Hasan Mehdi",
          roleId: roleId("auditor"),
          passwordHash: hash,
          mobile: "03041234567",
          managerId: admin.id,
          postedAt: "Head office",
        },
      ])
      .onConflictDoNothing();
  }

  const userRows = await db.select().from(users);
  console.log(`  users: ${userRows.length} (admin password: ${adminPassword})`);

  /* heads */
  let order = 0;
  for (const h of HEAD_DEFS) {
    const [parent] = await db
      .insert(heads)
      .values({
        code: h.code,
        name: h.name,
        nameUr: h.nameUr,
        sortOrder: (order += 10),
      })
      .onConflictDoUpdate({ target: heads.code, set: { name: h.name } })
      .returning();

    for (const c of h.children ?? []) {
      await db
        .insert(heads)
        .values({
          code: c.code,
          name: c.name,
          nameUr: c.nameUr,
          parentId: parent.id,
          isEvent: c.isEvent ?? false,
          sortOrder: (order += 1),
        })
        .onConflictDoUpdate({ target: heads.code, set: { name: c.name, parentId: parent.id } });
    }
  }
  const headRows = await db.select().from(heads);
  console.log(`  collection heads: ${headRows.length}`);

  /* settings */
  const defaults: Record<string, string> = {
    org_name: "Al Sadiq Trust",
    org_tagline: "Registered Welfare Trust",
    org_address: "Main Imambargah, Karachi",
    org_phone: "021-1234567",
    receipt_footer: "May Allah accept your contribution. Please keep this receipt.",
    whatsapp_country_code: "92",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing();
  }

  /* demo donors and donations */
  if (withDemo) {
    const existing = await db.select({ id: donors.id }).from(donors).limit(1);
    if (existing.length === 0) {
      const operators = userRows.filter((u) => u.username.startsWith("counter"));
      const collectors = operators.length ? operators : [admin];
      const leafHeads = headRows.filter((h) => h.parentId !== null);

      let donorSeq = 0;
      const donorIds: number[] = [];
      for (const name of DEMO_NAMES) {
        donorSeq += 1;
        const [d] = await db
          .insert(donors)
          .values({
            donorCode: `ASD-${String(donorSeq).padStart(5, "0")}`,
            legacyCode: donorSeq % 3 === 0 ? `OLD-${900 + donorSeq}` : null,
            fullName: name,
            mobile: `03${String(10 + (donorSeq % 40)).padStart(2, "0")}${String(
              1000000 + donorSeq * 7919,
            ).slice(0, 7)}`,
            cnic: donorSeq % 2 === 0 ? `42101-${1000000 + donorSeq * 137}-${donorSeq % 9}` : null,
            city: CITIES[donorSeq % CITIES.length],
            address: `House ${donorSeq}, Block ${String.fromCharCode(65 + (donorSeq % 6))}`,
            createdById: admin.id,
          })
          .returning();
        donorIds.push(d.id);
      }
      await db
        .insert(counters)
        .values({ key: "donor", value: donorSeq })
        .onConflictDoUpdate({ target: counters.key, set: { value: donorSeq } });

      const year = new Date().getFullYear();
      const amounts = [500, 1000, 1500, 2000, 2500, 3000, 5000, 5100, 7500, 10000, 11000, 21000, 25000];
      const methods = ["cash", "cash", "cash", "cash", "bank_transfer", "cheque", "online"] as const;

      let receiptSeq = 0;
      const rows = [];
      for (let dayBack = 45; dayBack >= 0; dayBack--) {
        // heavier traffic on recent days, like an event build-up
        const count = dayBack < 10 ? 6 + (dayBack % 5) : 1 + (dayBack % 3);
        for (let i = 0; i < count; i++) {
          receiptSeq += 1;
          const when = new Date();
          when.setDate(when.getDate() - dayBack);
          when.setHours(10 + (i % 9), (i * 13) % 60, 0, 0);
          const method = methods[receiptSeq % methods.length];
          rows.push({
            receiptNo: `R${year}-${String(receiptSeq).padStart(5, "0")}`,
            donorId: donorIds[(receiptSeq * 5) % donorIds.length],
            headId: leafHeads[(receiptSeq * 3) % leafHeads.length].id,
            amount: String(amounts[(receiptSeq * 7) % amounts.length]),
            paymentMethod: method,
            status: (method === "cheque" && receiptSeq % 4 === 0 ? "pending" : "completed") as
              | "pending"
              | "completed",
            chequeNo: method === "cheque" ? `CHQ-${100000 + receiptSeq}` : null,
            bankName: method === "cheque" || method === "bank_transfer" ? "Meezan Bank" : null,
            slipRef: method === "bank_transfer" ? `TRX${500000 + receiptSeq}` : null,
            receivedAt: when,
            collectedById: collectors[receiptSeq % collectors.length].id,
          });
        }
      }
      await db.insert(donations).values(rows);
      await db
        .insert(counters)
        .values({ key: `receipt_${year}`, value: receiptSeq })
        .onConflictDoUpdate({ target: counters.key, set: { value: receiptSeq } });

      const memberHead = headRows.find((h) => h.code === "MEM-MON");
      const today = new Date().toISOString().slice(0, 10);
      await db.insert(pledges).values(
        donorIds.slice(0, 12).map((id, i) => ({
          donorId: id,
          monthlyAmount: String([500, 1000, 2000, 3000][i % 4]),
          headId: memberHead?.id ?? null,
          dueDay: 5 + (i % 10),
          startedOn: today,
          createdById: admin.id,
        })),
      );

      console.log(`  demo donors: ${donorIds.length}, receipts: ${rows.length}, members: 12`);
    }
  }

  await db.execute(sql`select 1`);
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
