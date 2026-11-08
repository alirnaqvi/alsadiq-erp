
import bcrypt from "bcryptjs";
import { eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "./index";
import { roles, users, heads, donors, donations, pledges, settings, counters, gatherings, sponsorships } from "./schema";
import { ALL_PERMISSIONS } from "../lib/permissions";
import { upcomingHijriDates, hijriMonthName, ymd } from "../lib/format";
import { DONATE_HEADS, ISLAMIC_CALENDAR, TRUST, TRUST_SETTINGS } from "../lib/trust-facts";

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

const HEAD_DEFS = DONATE_HEADS;

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

const CITIES = ["Islamabad", "Rawalpindi", "Lahore", "Karachi", "Multan"];

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
      .onConflictDoUpdate({
        target: heads.code,
        set: { name: h.name, nameUr: h.nameUr, parentId: null, isActive: true },
      })
      .returning();

    for (const c of h.children ?? []) {
      await db
        .insert(heads)
        .values({
          code: c.code,
          name: c.name,
          nameUr: c.nameUr,
          parentId: parent.id,
          isEvent: false,
          sortOrder: (order += 1),
        })
        .onConflictDoUpdate({
          target: heads.code,
          set: { name: c.name, nameUr: c.nameUr, parentId: parent.id, isActive: true },
        });
    }
  }
  const keepCodes = [
    ...HEAD_DEFS.map((h) => h.code),
    ...HEAD_DEFS.flatMap((h) => h.children?.map((c) => c.code) ?? []),
  ];
  await db.update(heads).set({ isActive: false }).where(notInArray(heads.code, keepCodes));

  const headRows = await db.select().from(heads);
  console.log(`  collection heads: ${headRows.filter((h) => h.isActive).length} active`);

  /* settings — always match the public website */
  for (const [key, value] of Object.entries(TRUST_SETTINGS)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  /* demo donors and donations */
  if (withDemo) {
    const existing = await db.select({ id: donors.id }).from(donors).limit(1);
    if (existing.length === 0) {
      const collectors = userRows.filter((u) => u.username === "manager" || u.username === "office");
      const team = collectors.length ? collectors : [admin];
      const parentIds = new Set(
        headRows.filter((h) => h.isActive && h.parentId !== null).map((h) => h.parentId as number),
      );
      const leafHeads = headRows.filter((h) => h.isActive && !parentIds.has(h.id));

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

  /* gatherings — match the published Islamic calendar on alsadiqtrust.com */
  const sponsored = await db.select({ gatheringId: sponsorships.gatheringId }).from(sponsorships);
  const sponsoredIds = new Set(sponsored.map((s) => s.gatheringId));
  const existing = await db.select().from(gatherings);
  const keepKey = (month: number | null, day: number | null, title: string) => `${month}-${day}-${title}`;
  const wanted = new Set(ISLAMIC_CALENDAR.map((t) => keepKey(t.month, t.day, t.title)));

  const staleIds = existing
    .filter((g) => !wanted.has(keepKey(g.hijriMonth, g.hijriDay, g.title)) && !sponsoredIds.has(g.id))
    .map((g) => g.id);
  if (staleIds.length) {
    await db.delete(gatherings).where(inArray(gatherings.id, staleIds));
  }

  const remaining = await db.select().from(gatherings);
  let inserted = 0;
  let updated = 0;
  for (const t of ISLAMIC_CALENDAR) {
    const hits = upcomingHijriDates(t.month, t.day, 500);
    const hit = hits[0];
    if (!hit) continue;
    const description = [t.note, `${t.day} ${hijriMonthName(t.month)} ${hit.hijriYear}`].filter(Boolean).join(" · ");
    const match = remaining.find(
      (g) => g.hijriMonth === t.month && g.hijriDay === t.day && g.title === t.title,
    );
    if (match) {
      await db
        .update(gatherings)
        .set({
          titleUr: t.titleUr,
          kind: t.kind,
          hijriYear: hit.hijriYear,
          gregorianDate: ymd(hit.gregorian),
          location: TRUST.location,
          description,
          isPublic: true,
        })
        .where(eq(gatherings.id, match.id));
      updated += 1;
    } else {
      await db.insert(gatherings).values({
        title: t.title,
        titleUr: t.titleUr,
        kind: t.kind,
        hijriMonth: t.month,
        hijriDay: t.day,
        hijriYear: hit.hijriYear,
        gregorianDate: ymd(hit.gregorian),
        location: TRUST.location,
        description,
        isPublic: true,
        createdById: admin.id,
      });
      inserted += 1;
    }
  }
  console.log(`  gatherings: ${inserted} added, ${updated} updated, ${staleIds.length} retired`);

  await db.execute(sql`select 1`);
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
