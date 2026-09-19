import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { donors, donations, heads } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { money, longDate, PAYMENT_LABELS } from "@/lib/format";
import { Card, PageHeader, Table, Td, Th, EmptyState, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DonorLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donorId = Number(id);
  await requirePermission("donor.view");

  const [donor] = await db.select().from(donors).where(eq(donors.id, donorId)).limit(1);
  if (!donor) notFound();

  const rows = await db
    .select({
      id: donations.id,
      receiptNo: donations.receiptNo,
      amount: donations.amount,
      status: donations.status,
      method: donations.paymentMethod,
      receivedAt: donations.receivedAt,
      headName: heads.name,
      remarks: donations.remarks,
      additionalNames: donations.additionalNames,
    })
    .from(donations)
    .innerJoin(heads, eq(donations.headId, heads.id))
    .where(and(eq(donations.donorId, donorId), ne(donations.status, "void")))
    .orderBy(asc(donations.receivedAt), asc(donations.id));

  let running = 0;
  const ledger = rows.map((r) => {
    running += Number(r.amount);
    return { ...r, balance: running };
  });

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/donors/${donor.id}`} className="underline underline-offset-4">
            {donor.fullName}
          </Link>
        }
        title="Donor ledger"
        subtitle={`${donor.donorCode} · ${donor.mobile}${
          donor.additionalNames ? ` · also ${donor.additionalNames}` : ""
        }`}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Entries" value={String(ledger.length)} />
        <Stat label="Lifetime given" value={`Rs ${money(running)}`} />
        <Stat label="Mobile (unique ID)" value={donor.mobile} />
      </div>

      <Card padded={false}>
        {ledger.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Ledger is empty" body="Receipts for this donor will appear here with a running total." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Receipt</Th>
                <Th>Head</Th>
                <Th>Method</Th>
                <Th align="right">Credit</Th>
                <Th align="right">Balance</Th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((r) => (
                <tr key={r.id} className="hover:bg-paper/70">
                  <Td className="tnum whitespace-nowrap text-xs text-ink-500">{longDate(r.receivedAt)}</Td>
                  <Td>
                    <Link href={`/receipts/${r.id}`} className="code text-xs text-sabz-700">
                      {r.receiptNo}
                    </Link>
                    {r.status === "pending" && (
                      <span className="ml-2">
                        <Badge tone="brass">Pending</Badge>
                      </span>
                    )}
                  </Td>
                  <Td className="max-w-[14rem] truncate text-ink-500">
                    {r.headName}
                    {r.additionalNames ? ` · ${r.additionalNames}` : ""}
                  </Td>
                  <Td className="text-ink-500">{PAYMENT_LABELS[r.method]}</Td>
                  <Td align="right" className="tnum font-medium">
                    {money(r.amount)}
                  </Td>
                  <Td align="right" className="tnum font-semibold">
                    {money(r.balance)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-1 text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}
