import Link from "next/link";
import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { scopeCondition, selectableHeads } from "@/lib/queries";
import { money, dateTime, PAYMENT_LABELS, ymd } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  inputClass,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type Search = {
  from?: string;
  to?: string;
  head?: string;
  status?: string;
  q?: string;
  page?: string;
};

const PAGE_SIZE = 30;

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const user = await requirePermission("collection.view");
  const scope = await scopeCondition(user);
  const headOptions = await selectableHeads();

  const from = sp.from || "";
  const to = sp.to || "";
  const page = Math.max(1, Number(sp.page ?? 1));

  const filters: (SQL | undefined)[] = [scope];
  if (from) filters.push(gte(donations.receivedAt, new Date(`${from}T00:00:00+05:00`)));
  if (to) {
    const end = new Date(`${to}T00:00:00+05:00`);
    end.setDate(end.getDate() + 1);
    filters.push(lt(donations.receivedAt, end));
  }
  if (sp.head) filters.push(eq(donations.headId, Number(sp.head)));
  if (sp.status) filters.push(eq(donations.status, sp.status as "completed" | "pending" | "void"));
  if (sp.q) {
    filters.push(
      or(
        ilike(donations.receiptNo, `%${sp.q}%`),
        ilike(donors.fullName, `%${sp.q}%`),
        ilike(donors.mobile, `%${sp.q}%`),
      ),
    );
  }
  const where = and(...filters.filter(Boolean));

  const base = db
    .select({
      id: donations.id,
      receiptNo: donations.receiptNo,
      amount: donations.amount,
      status: donations.status,
      method: donations.paymentMethod,
      receivedAt: donations.receivedAt,
      donorId: donors.id,
      donorName: donors.fullName,
      donorMobile: donors.mobile,
      headName: heads.name,
      collector: users.fullName,
    })
    .from(donations)
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .innerJoin(heads, eq(donations.headId, heads.id))
    .innerJoin(users, eq(donations.collectedById, users.id))
    .where(where);

  const rows = await base
    .orderBy(desc(donations.receivedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [totals] = await db
    .select({
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(case when ${donations.status} <> 'void' then ${donations.amount} else 0 end),0)`,
    })
    .from(donations)
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .where(where);

  const totalPages = Math.max(1, Math.ceil(Number(totals?.count ?? 0) / PAGE_SIZE));
  const qs = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    return `/receipts?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Collection"
        title="Receipts"
        subtitle={`${Number(totals?.count ?? 0)} receipts · Rs ${money(totals?.total)} excluding voids`}
        actions={
          user.permissions.includes("report.view") && (
            <LinkButton
              href={`/api/export/receipts?${new URLSearchParams(
                Object.entries(sp).filter(([, v]) => v) as [string, string][],
              ).toString()}`}
              variant="secondary"
            >
              Download Excel
            </LinkButton>
          )
        }
      />

      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="eyebrow mb-1 block">From</span>
            <input type="date" name="from" defaultValue={from} className={inputClass} />
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">To</span>
            <input type="date" name="to" defaultValue={to} className={inputClass} />
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">Head</span>
            <select name="head" defaultValue={sp.head ?? ""} className={inputClass}>
              <option value="">All heads</option>
              {headOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.parentName ? `${h.parentName} — ` : ""}
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">Status</span>
            <select name="status" defaultValue={sp.status ?? ""} className={inputClass}>
              <option value="">Any status</option>
              <option value="completed">Received</option>
              <option value="pending">Pending clearance</option>
              <option value="void">Voided</option>
            </select>
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">Search</span>
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Receipt, name or mobile"
              className={inputClass}
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="h-10 rounded-md bg-sabz-700 px-4 text-sm font-medium text-white hover:bg-sabz-600"
            >
              Apply filters
            </button>
            <Link href="/receipts" className="text-sm text-ink-500 underline underline-offset-4">
              Clear
            </Link>
            <Link
              href={qs({ from: ymd(), to: ymd(), page: "1" })}
              className="ml-auto text-sm text-sabz-700 underline underline-offset-4"
            >
              Today only
            </Link>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No receipts match these filters"
          body="Try widening the date range or clearing the search."
        />
      ) : (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Receipt</Th>
                <Th>Donor</Th>
                <Th>Head</Th>
                <Th>Method</Th>
                <Th>Collected by</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Date</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-paper/70">
                  <Td>
                    <Link href={`/receipts/${r.id}`} className="code text-xs text-sabz-700">
                      {r.receiptNo}
                    </Link>
                    {r.status !== "completed" && (
                      <span className="ml-2">
                        <Badge tone={r.status === "void" ? "red" : "brass"}>
                          {r.status === "void" ? "Void" : "Pending"}
                        </Badge>
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Link href={`/donors/${r.donorId}`} className="hover:underline">
                      {r.donorName}
                    </Link>
                    <span className="code block text-xs text-ink-500">{r.donorMobile}</span>
                  </Td>
                  <Td className="max-w-[12rem] truncate text-ink-500">{r.headName}</Td>
                  <Td className="text-ink-500">{PAYMENT_LABELS[r.method]}</Td>
                  <Td className="max-w-[10rem] truncate text-ink-500">{r.collector}</Td>
                  <Td
                    align="right"
                    className={`tnum font-medium ${r.status === "void" ? "text-ink-300 line-through" : ""}`}
                  >
                    {money(r.amount)}
                  </Td>
                  <Td align="right" className="tnum whitespace-nowrap text-xs text-ink-500">
                    {dateTime(r.receivedAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={qs({ page: String(page - 1) })} className="text-sabz-700 underline underline-offset-4">
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={qs({ page: String(page + 1) })} className="text-sabz-700 underline underline-offset-4">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
