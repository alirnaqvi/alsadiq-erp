
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { roles, users, heads, donors, donations, pledges, settings, counters, gatherings } from "./schema";
import { ALL_PERMISSIONS } from "../lib/permissions";
import { upcomingHijriDates, hijriMonthName, ymd } from "../lib/format";

const withDemo = process.argv.includes("--demo");

/* ---------------------------------------------------------------- roles */

const ROLE_DEFS = [
  {
    key: "admin",
    name: "Super Admin",
    level: 1,
    dataScope: "all" as const,
    description: "Full control: users, roles, voiding receipts, confidential donor data and setup.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "office_admin",
    name: "Admin",
    level: 8,
    dataScope: "all" as const,
    description: "Runs the office day to day. Cannot void receipts or change roles unless Super Admin designates that.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "collection.void" && p !== "role.manage"),
  },
  {
    key: "accounts",
    name: "Accounts",
    level: 12,
    dataScope: "all" as const,
    description: "Sees every rupee and export. Does not void receipts or change users.",
    permissions: [
      "collection.view",
      "donor.view",
      "donor.confidential",
      "member.manage",
      "report.view",
      "audit.view",
      "sponsorship.review",
    ],
  },
  {
    key: "manager",
    name: "Manager",
    level: 16,
    dataScope: "team" as const,
    description: "Records collection for their team, registers donors, runs reports. Cannot void a receipt.",
    permissions: [
      "collection.create",
      "collection.view",
      "donor.create",
      "donor.edit",
      "donor.view",
      "donor.confidential",
      "donor.verify",
      "donor.import",
      "member.manage",
      "whatsapp.send",
      "event.manage",
      "sponsorship.review",
      "report.view",
    ],
  },
  {
    key: "trustee",
    name: "Trustee (Monitoring)",
    level: 10,
    dataScope: "all" as const,
    description: "Read-only monitoring for trustees. No recording, no voiding, no setup changes.",
    permissions: [
      "collection.view",
      "donor.view",
      "donor.confidential",
      "report.view",
      "audit.view",
      "sponsorship.review",
    ],
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
          username: "office",
          fullName: "Office Admin",
          roleId: roleId("office_admin"),
          passwordHash: hash,
          mobile: "03021234567",
          managerId: admin.id,
          postedAt: "Head office",
        },
        {
          username: "accounts",
          fullName: "Accounts Desk",
          roleId: roleId("accounts"),
          passwordHash: hash,
          mobile: "03031234567",
          managerId: admin.id,
          postedAt: "Accounts",
        },
        {
          username: "trustee",
          fullName: "Trustee Monitor",
          roleId: roleId("trustee"),
          passwordHash: hash,
          mobile: "03041234567",
          managerId: admin.id,
          postedAt: "Board",
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
      const collectors = userRows.filter((u) => u.username === "manager" || u.username === "office");
      const team = collectors.length ? collectors : [admin];
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
            collectedById: team[receiptSeq % team.length].id,
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

  /* gatherings for the coming Hijri season */
  const existingGatherings = await db.select({ id: gatherings.id }).from(gatherings).limit(1);
  if (existingGatherings.length === 0) {
    const templates: { month: number; day: number; title: string; titleUr: string; kind: string; amount: number; note: string }[] = [
      { month: 1, day: 1, title: "1st Muharram majlis", titleUr: "یکم محرم مجلس", kind: "majlis", amount: 25000, note: "Opening of azadari." },
      { month: 1, day: 2, title: "2nd Muharram majlis", titleUr: "دوم محرم مجلس", kind: "majlis", amount: 25000, note: "" },
      { month: 1, day: 3, title: "3rd Muharram majlis", titleUr: "سوم محرم مجلس", kind: "majlis", amount: 25000, note: "" },
      { month: 1, day: 4, title: "4th Muharram majlis", titleUr: "چہارم محرم مجلس", kind: "majlis", amount: 25000, note: "" },
      { month: 1, day: 5, title: "5th Muharram majlis", titleUr: "پنجم محرم مجلس", kind: "majlis", amount: 25000, note: "" },
      { month: 1, day: 6, title: "6th Muharram majlis", titleUr: "ششم محرم مجلس", kind: "majlis", amount: 25000, note: "" },
      { month: 1, day: 7, title: "7th Muharram majlis", titleUr: "ہفتم محرم مجلس", kind: "majlis", amount: 30000, note: "" },
      { month: 1, day: 8, title: "8th Muharram majlis", titleUr: "ہشتم محرم مجلس", kind: "majlis", amount: 30000, note: "" },
      { month: 1, day: 9, title: "9th Muharram (Shab-e-Ashur)", titleUr: "نہم محرم شب عاشور", kind: "majlis", amount: 75000, note: "Night of Ashura." },
      { month: 1, day: 10, title: "10th Muharram (Ashura)", titleUr: "عاشورہ", kind: "majlis", amount: 100000, note: "Ashura processions and majlis." },
      { month: 2, day: 20, title: "Arbaeen (20th Safar)", titleUr: "اربعین", kind: "majlis", amount: 50000, note: "Chehlum of Imam Hussain (a.s.)." },
      { month: 2, day: 28, title: "28th Safar", titleUr: "۲۸ صفر", kind: "majlis", amount: 40000, note: "Wafat of Prophet Muhammad (s) and Imam Hasan (a.s.)." },
      { month: 3, day: 8, title: "8th Rabi al-Awwal", titleUr: "۸ ربیع الاول", kind: "majlis", amount: 35000, note: "Close of the azadari season." },
      { month: 3, day: 12, title: "Eid Milad-un-Nabi", titleUr: "عید میلاد النبی", kind: "milad", amount: 40000, note: "Milad gathering." },
      { month: 3, day: 17, title: "Wiladat Imam Jafar al-Sadiq (a.s.)", titleUr: "ولادت امام جعفر الصادق", kind: "milad", amount: 35000, note: "Namesake of the trust." },
      { month: 5, day: 13, title: "Ayyam-e-Fatimiyya majlis", titleUr: "ایام فاطمیہ مجلس", kind: "majlis", amount: 30000, note: "First Fatimiyya." },
      { month: 5, day: 14, title: "Ayyam-e-Fatimiyya majlis", titleUr: "ایام فاطمیہ مجلس", kind: "majlis", amount: 30000, note: "" },
      { month: 5, day: 15, title: "Ayyam-e-Fatimiyya majlis", titleUr: "ایام فاطمیہ مجلس", kind: "majlis", amount: 35000, note: "" },
      { month: 6, day: 3, title: "Ayyam-e-Fatimiyya (second)", titleUr: "ایام فاطمیہ دوم", kind: "majlis", amount: 30000, note: "Second Fatimiyya." },
      { month: 6, day: 13, title: "Wiladat Bibi Fatima (s.a.)", titleUr: "ولادت بی بی فاطمہ", kind: "milad", amount: 25000, note: "" },
      { month: 7, day: 13, title: "Wiladat Imam Ali (a.s.)", titleUr: "ولادت امام علی", kind: "milad", amount: 30000, note: "" },
      { month: 9, day: 21, title: "21st Ramadan", titleUr: "۲۱ رمضان", kind: "majlis", amount: 40000, note: "Shahadat of Imam Ali (a.s.)." },
    ];
    const rows = [];
    for (const t of templates) {
      const hits = upcomingHijriDates(t.month, t.day, 500);
      for (const hit of hits.slice(0, 1)) {
        rows.push({
          title: t.title,
          titleUr: t.titleUr,
          kind: t.kind,
          hijriMonth: t.month,
          hijriDay: t.day,
          hijriYear: hit.hijriYear,
          gregorianDate: ymd(hit.gregorian),
          suggestedAmount: String(t.amount),
          location: "Masjid o Imam Bargah Al-Sadiq Trust",
          description: `${t.note} ${t.day} ${hijriMonthName(t.month)} ${hit.hijriYear}.`.trim(),
          isPublic: true,
          createdById: admin.id,
        });
      }
    }
    if (rows.length) {
      await db.insert(gatherings).values(rows);
      console.log(`  gatherings: ${rows.length}`);
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
