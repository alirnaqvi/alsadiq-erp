import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";
import { longDate, PAYMENT_LABELS, STATUS_LABELS, ymd } from "@/lib/format";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user.permissions.includes("donor.view")) {
    return new Response("Your role does not allow this.", { status: 403 });
  }

  const id = Number(new URL(request.url).searchParams.get("donor"));
  if (!id) return new Response("Donor not specified.", { status: 400 });

  const [donor] = await db.select().from(donors).where(eq(donors.id, id)).limit(1);
  if (!donor) return new Response("Donor not found.", { status: 404 });

  const rows = await db
    .select({
      receiptNo: donations.receiptNo,
      date: donations.receivedAt,
      head: heads.name,
      amount: donations.amount,
      method: donations.paymentMethod,
      status: donations.status,
      collector: users.fullName,
    })
    .from(donations)
    .innerJoin(heads, eq(donations.headId, heads.id))
    .innerJoin(users, eq(donations.collectedById, users.id))
    .where(eq(donations.donorId, id))
    .orderBy(desc(donations.receivedAt));

  const buffer = await buildWorkbook({
    sheetName: "Statement",
    title: `Donation statement — ${donor.fullName}`,
    subtitle: `${donor.donorCode} · ${donor.mobile} · issued ${longDate(new Date())}`,
    columns: [
      { header: "Receipt no", key: "receiptNo", width: 16 },
      { header: "Date", key: "dateStr", width: 14 },
      { header: "Head", key: "head", width: 28 },
      { header: "Method", key: "methodLabel", width: 16 },
      { header: "Status", key: "statusLabel", width: 16 },
      { header: "Received by", key: "collector", width: 22 },
      { header: "Amount", key: "amount", width: 14, money: true },
    ],
    rows: rows.map((r) => ({
      receiptNo: r.receiptNo,
      dateStr: longDate(r.date),
      head: r.head,
      methodLabel: PAYMENT_LABELS[r.method] ?? r.method,
      statusLabel: STATUS_LABELS[r.status] ?? r.status,
      collector: r.collector,
      amount: r.status === "void" ? 0 : Number(r.amount),
    })),
    totalOf: "amount",
  });

  await logAction({
    actor: user,
    action: "export",
    entityType: "donor",
    entityId: id,
    summary: `Downloaded the statement for ${donor.fullName} (${donor.donorCode})`,
  });

  return xlsxResponse(buffer, `statement-${donor.donorCode}-${ymd()}.xlsx`);
}
