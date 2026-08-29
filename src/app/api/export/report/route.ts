import { and, desc, eq, gte, lt, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { scopeCondition } from "@/lib/queries";
import { buildWorkbook, xlsxResponse, type Column } from "@/lib/excel";
import { hijri, longDate, PAYMENT_LABELS, ymd } from "@/lib/format";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user.permissions.includes("report.view")) {
    return new Response("Your role does not allow exports.", { status: 403 });
  }

  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "daily";
  const today = ymd();
  const from = url.searchParams.get("from") || `${today.slice(0, 7)}-01`;
  const to = url.searchParams.get("to") || today;

  const start = new Date(`${from}T00:00:00+05:00`);
  const end = new Date(`${to}T00:00:00+05:00`);
  end.setDate(end.getDate() + 1);

  const scope = await scopeCondition(user);
  const conditions: SQL[] = [
    ne(donations.status, "void"),
    gte(donations.receivedAt, start),
    lt(donations.receivedAt, end),
  ];
  if (scope) conditions.push(scope);
  const where = and(...conditions);

  let columns: Column[] = [];
  let rows: Record<string, string | number | null>[] = [];
  let sheetName = "Report";
  let title = "";

  if (view === "head") {
    const parent = alias(heads, "parent_head");
    const data = await db
      .select({
        head: heads.name,
        code: heads.code,
        parent: parent.name,
        total: sql<string>`coalesce(sum(${donations.amount}),0)`,
        count: sql<number>`count(*)`,
        donors: sql<number>`count(distinct ${donations.donorId})`,
      })
      .from(donations)
      .innerJoin(heads, eq(donations.headId, heads.id))
      .leftJoin(parent, eq(heads.parentId, parent.id))
      .where(where)
      .groupBy(heads.name, heads.code, parent.name)
      .orderBy(desc(sql`sum(${donations.amount})`));

    sheetName = "Head-wise";
    title = "Al Sadiq Trust — Head-wise collection";
    columns = [
      { header: "Head", key: "parent", width: 22 },
      { header: "Subhead", key: "head", width: 26 },
      { header: "Code", key: "code", width: 14 },
      { header: "Donors", key: "donors", width: 10 },
      { header: "Receipts", key: "count", width: 10 },
      { header: "Total", key: "total", width: 16, money: true },
    ];
    rows = data.map((d) => ({ ...d, total: Number(d.total) }));
  } else if (view === "event") {
    const data = await db
      .select({
        head: heads.name,
        eventDate: heads.eventDate,
        donorCode: donors.donorCode,
        donor: donors.fullName,
        mobile: donors.mobile,
        receiptNo: donations.receiptNo,
        date: donations.receivedAt,
        amount: donations.amount,
      })
      .from(donations)
      .innerJoin(heads, eq(donations.headId, heads.id))
      .innerJoin(donors, eq(donations.donorId, donors.id))
      .where(and(where, eq(heads.isEvent, true)))
      .orderBy(heads.name, desc(donations.amount));

    sheetName = "Event-wise";
    title = "Al Sadiq Trust — Event-wise collection by donor";
    columns = [
      { header: "Event", key: "head", width: 26 },
      { header: "Donor ID", key: "donorCode", width: 12 },
      { header: "Donor name", key: "donor", width: 26 },
      { header: "Mobile", key: "mobile", width: 14 },
      { header: "Receipt no", key: "receiptNo", width: 16 },
      { header: "Date", key: "dateStr", width: 14 },
      { header: "Amount", key: "amount", width: 14, money: true },
    ];
    rows = data.map((d) => ({
      ...d,
      dateStr: longDate(d.date),
      date: null,
      eventDate: null,
      amount: Number(d.amount),
    }));
  } else if (view === "collector") {
    const data = await db
      .select({
        name: users.fullName,
        postedAt: users.postedAt,
        total: sql<string>`coalesce(sum(${donations.amount}),0)`,
        count: sql<number>`count(*)`,
      })
      .from(donations)
      .innerJoin(users, eq(donations.collectedById, users.id))
      .where(where)
      .groupBy(users.fullName, users.postedAt)
      .orderBy(desc(sql`sum(${donations.amount})`));

    sheetName = "Collector-wise";
    title = "Al Sadiq Trust — Collection by staff member";
    columns = [
      { header: "Collected by", key: "name", width: 26 },
      { header: "Posted at", key: "postedAt", width: 20 },
      { header: "Receipts", key: "count", width: 10 },
      { header: "Total", key: "total", width: 16, money: true },
    ];
    rows = data.map((d) => ({ ...d, total: Number(d.total) }));
  } else if (view === "method") {
    const data = await db
      .select({
        method: donations.paymentMethod,
        total: sql<string>`coalesce(sum(${donations.amount}),0)`,
        count: sql<number>`count(*)`,
      })
      .from(donations)
      .where(where)
      .groupBy(donations.paymentMethod)
      .orderBy(desc(sql`sum(${donations.amount})`));

    sheetName = "By method";
    title = "Al Sadiq Trust — Collection by payment method";
    columns = [
      { header: "Method", key: "methodLabel", width: 20 },
      { header: "Receipts", key: "count", width: 10 },
      { header: "Total", key: "total", width: 16, money: true },
    ];
    rows = data.map((d) => ({
      methodLabel: PAYMENT_LABELS[d.method] ?? d.method,
      count: d.count,
      total: Number(d.total),
    }));
  } else {
    const data = await db
      .select({
        day: sql<string>`to_char(${donations.receivedAt} at time zone 'Asia/Karachi', 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${donations.amount}),0)`,
        count: sql<number>`count(*)`,
        cash: sql<string>`coalesce(sum(case when ${donations.paymentMethod}='cash' then ${donations.amount} else 0 end),0)`,
      })
      .from(donations)
      .where(where)
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    sheetName = "Day by day";
    title = "Al Sadiq Trust — Daily collection";
    columns = [
      { header: "Date", key: "dateStr", width: 16 },
      { header: "Hijri", key: "hijriStr", width: 22 },
      { header: "Receipts", key: "count", width: 10 },
      { header: "Cash", key: "cash", width: 14, money: true },
      { header: "Total", key: "total", width: 16, money: true },
    ];
    rows = data.map((d) => ({
      dateStr: longDate(`${d.day}T12:00:00+05:00`),
      hijriStr: hijri(`${d.day}T12:00:00+05:00`),
      count: d.count,
      cash: Number(d.cash),
      total: Number(d.total),
    }));
  }

  const buffer = await buildWorkbook({
    sheetName,
    title,
    subtitle: `${longDate(start)} to ${longDate(new Date(end.getTime() - 86400000))} · exported by ${user.fullName}`,
    columns,
    rows,
    totalOf: columns.some((c) => c.key === "total") ? "total" : undefined,
  });

  await logAction({
    actor: user,
    action: "export",
    entityType: "report",
    summary: `Exported the ${sheetName} report for ${from} to ${to}`,
  });

  return xlsxResponse(buffer, `al-sadiq-${view}-${from}-to-${to}.xlsx`);
}
