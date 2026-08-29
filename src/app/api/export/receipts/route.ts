import { and, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { scopeCondition } from "@/lib/queries";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";
import { longDate, PAYMENT_LABELS, STATUS_LABELS, timeOnly, ymd } from "@/lib/format";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user.permissions.includes("report.view")) {
    return new Response("Your role does not allow exports.", { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const head = url.searchParams.get("head");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  const scope = await scopeCondition(user);
  const filters: (SQL | undefined)[] = [scope];
  if (from) filters.push(gte(donations.receivedAt, new Date(`${from}T00:00:00+05:00`)));
  if (to) {
    const end = new Date(`${to}T00:00:00+05:00`);
    end.setDate(end.getDate() + 1);
    filters.push(lt(donations.receivedAt, end));
  }
  if (head) filters.push(eq(donations.headId, Number(head)));
  if (status) filters.push(eq(donations.status, status as "completed" | "pending" | "void"));
  if (q) {
    filters.push(
      or(
        ilike(donations.receiptNo, `%${q}%`),
        ilike(donors.fullName, `%${q}%`),
        ilike(donors.mobile, `%${q}%`),
      ),
    );
  }

  const rows = await db
    .select({
      receiptNo: donations.receiptNo,
      date: donations.receivedAt,
      donorCode: donors.donorCode,
      donorName: donors.fullName,
      mobile: donors.mobile,
      cnic: donors.cnic,
      city: donors.city,
      head: heads.name,
      headCode: heads.code,
      amount: donations.amount,
      method: donations.paymentMethod,
      status: donations.status,
      chequeNo: donations.chequeNo,
      slipRef: donations.slipRef,
      collector: users.fullName,
      remarks: donations.remarks,
    })
    .from(donations)
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .innerJoin(heads, eq(donations.headId, heads.id))
    .innerJoin(users, eq(donations.collectedById, users.id))
    .where(and(...filters.filter(Boolean)))
    .orderBy(desc(donations.receivedAt))
    .limit(20000);

  const buffer = await buildWorkbook({
    sheetName: "Receipts",
    title: "Al Sadiq Trust — Collection register",
    subtitle: `${from || "beginning"} to ${to || ymd()} · exported by ${user.fullName} on ${longDate(new Date())}`,
    columns: [
      { header: "Receipt no", key: "receiptNo", width: 16 },
      { header: "Date", key: "dateStr", width: 14 },
      { header: "Time", key: "timeStr", width: 10 },
      { header: "Donor ID", key: "donorCode", width: 12 },
      { header: "Donor name", key: "donorName", width: 26 },
      { header: "Mobile", key: "mobile", width: 14 },
      { header: "CNIC", key: "cnic", width: 18 },
      { header: "City", key: "city", width: 14 },
      { header: "Head", key: "head", width: 24 },
      { header: "Head code", key: "headCode", width: 14 },
      { header: "Amount", key: "amount", width: 14, money: true },
      { header: "Method", key: "methodLabel", width: 14 },
      { header: "Status", key: "statusLabel", width: 16 },
      { header: "Cheque no", key: "chequeNo", width: 16 },
      { header: "Reference", key: "slipRef", width: 16 },
      { header: "Collected by", key: "collector", width: 22 },
      { header: "Remarks", key: "remarks", width: 30 },
    ],
    rows: rows.map((r) => ({
      ...r,
      dateStr: longDate(r.date),
      timeStr: timeOnly(r.date),
      amount: Number(r.amount),
      methodLabel: PAYMENT_LABELS[r.method] ?? r.method,
      statusLabel: STATUS_LABELS[r.status] ?? r.status,
      date: null,
      method: null,
      status: null,
    })),
    totalOf: "amount",
  });

  await logAction({
    actor: user,
    action: "export",
    entityType: "donation",
    summary: `Exported ${rows.length} receipts to Excel`,
  });

  return xlsxResponse(buffer, `al-sadiq-receipts-${ymd()}.xlsx`);
}
