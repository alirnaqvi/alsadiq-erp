import Link from "next/link";
import { and, desc, eq, gte, lt, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { scopeCondition } from "@/lib/queries";
import { money, longDate, hijri, ymd, PAYMENT_LABELS } from "@/lib/format";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { Card, PageHeader, Table, Td, Th, LinkButton, EmptyState, inputClass, cx } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "daily", label: "Day by day" },
  { key: "head", label: "By head" },
  { key: "event", label: "By event" },
  { key: "collector", label: "By collector" },
  { key: "method", label: "By payment method" },
] as const;

type Search = { view?: string; from?: string; to?: string };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const user = await requirePermission("report.view");
  const t = tx(await getLocale());
  const scope = await scopeCondition(user);

  const view = TABS.find((t) => t.key === sp.view)?.key ?? "daily";

  // Default window: this month so far.
  const today = ymd();
  const from = sp.from || `${today.slice(0, 7)}-01`;
  const to = sp.to || today;

  const start = new Date(`${from}T00:00:00+05:00`);
  const end = new Date(`${to}T00:00:00+05:00`);
  end.setDate(end.getDate() + 1);

  const base: SQL[] = [
    ne(donations.status, "void"),
    gte(donations.receivedAt, start),
    lt(donations.receivedAt, end),
  ];
  if (scope) base.push(scope);
  const where = and(...base);

  const [totals] = await db
    .select({
      total: sql<string>`coalesce(sum(${donations.amount}),0)`,
      count: sql<number>`count(*)`,
      donorCount: sql<number>`count(distinct ${donations.donorId})`,
    })
    .from(donations)
    .where(where);

  const exportHref = `/api/export/report?view=${view}&from=${from}&to=${to}`;

  return (
    <>
      <PageHeader
        eyebrow={t("pages.reports.eyebrow")}
        title={t("pages.reports.title")}
        subtitle={`${longDate(start)} to ${longDate(new Date(end.getTime() - 86400000))} · ${hijri(start)}`}
        actions={<LinkButton href={exportHref}>{t("common.downloadExcel")}</LinkButton>}
      />

      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value={view} />
          <label className="block">
            <span className="eyebrow mb-1 block">From</span>
            <input type="date" name="from" defaultValue={from} className={inputClass} />
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">To</span>
            <input type="date" name="to" defaultValue={to} className={inputClass} />
          </label>
          <button
            type="submit"
            className="h-10 rounded-md bg-sabz-700 px-4 text-sm font-medium text-white hover:bg-sabz-600"
          >
            Update
          </button>
        </form>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Collected" value={`Rs ${money(totals?.total)}`} />
        <Stat label="Receipts" value={String(totals?.count ?? 0)} />
        <Stat label="Donors" value={String(totals?.donorCount ?? 0)} />
      </div>

      <nav className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/reports?view=${t.key}&from=${from}&to=${to}`}
            className={cx(
              "rounded-md border px-3 py-1.5 text-sm",
              view === t.key
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:bg-paper",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {view === "daily" && <DailyReport where={where} />}
      {view === "head" && <HeadReport where={where} />}
      {view === "event" && <EventReport where={where} />}
      {view === "collector" && <CollectorReport where={where} />}
      {view === "method" && <MethodReport where={where} />}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-1 text-xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function Sheet({
  columns,
  rows,
}: {
  columns: { label: string; align?: "left" | "right" }[];
  rows: React.ReactNode;
}) {
  return (
    <Card padded={false}>
      <Table>
        <thead>
          <tr>
            {columns.map((c) => (
              <Th key={c.label} align={c.align ?? "left"}>
                {c.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    </Card>
  );
}

async function DailyReport({ where }: { where: SQL | undefined }) {
  const rows = await db
    .select({
      day: sql<string>`to_char(${donations.receivedAt} at time zone 'Asia/Karachi', 'YYYY-MM-DD')`,
      total: sql<string>`coalesce(sum(${donations.amount}),0)`,
      count: sql<number>`count(*)`,
      cash: sql<string>`coalesce(sum(case when ${donations.paymentMethod}='cash' then ${donations.amount} else 0 end),0)`,
    })
    .from(donations)
    .where(where)
    .groupBy(sql`1`)
    .orderBy(desc(sql`1`));

  if (rows.length === 0) return <Empty />;

  return (
    <Sheet
      columns={[
        { label: "Date" },
        { label: "Hijri" },
        { label: "Receipts", align: "right" },
        { label: "Cash", align: "right" },
        { label: "Total", align: "right" },
      ]}
      rows={rows.map((r) => (
        <tr key={r.day}>
          <Td className="whitespace-nowrap">{longDate(`${r.day}T12:00:00+05:00`)}</Td>
          <Td className="tnum text-xs text-ink-500">{hijri(`${r.day}T12:00:00+05:00`)}</Td>
          <Td align="right" className="tnum">{r.count}</Td>
          <Td align="right" className="tnum text-ink-500">{money(r.cash)}</Td>
          <Td align="right" className="tnum font-medium">{money(r.total)}</Td>
        </tr>
      ))}
    />
  );
}

async function HeadReport({ where }: { where: SQL | undefined }) {
  const parent = alias(heads, "parent_head");
  const rows = await db
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

  if (rows.length === 0) return <Empty />;

  return (
    <Sheet
      columns={[
        { label: "Head" },
        { label: "Code" },
        { label: "Donors", align: "right" },
        { label: "Receipts", align: "right" },
        { label: "Total", align: "right" },
      ]}
      rows={rows.map((r) => (
        <tr key={r.code}>
          <Td>
            {r.parent && <span className="text-ink-500">{r.parent} / </span>}
            {r.head}
          </Td>
          <Td className="code text-xs text-ink-500">{r.code}</Td>
          <Td align="right" className="tnum">{r.donors}</Td>
          <Td align="right" className="tnum">{r.count}</Td>
          <Td align="right" className="tnum font-medium">{money(r.total)}</Td>
        </tr>
      ))}
    />
  );
}

/** Event-wise report names every donor, which is what the trust reads out. */
async function EventReport({ where }: { where: SQL | undefined }) {
  const rows = await db
    .select({
      headId: heads.id,
      head: heads.name,
      donor: donors.fullName,
      donorCode: donors.donorCode,
      mobile: donors.mobile,
      amount: donations.amount,
      receiptNo: donations.receiptNo,
      receivedAt: donations.receivedAt,
    })
    .from(donations)
    .innerJoin(heads, eq(donations.headId, heads.id))
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .where(and(where, eq(heads.isEvent, true)))
    .orderBy(heads.name, desc(donations.amount));

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No event collection in this period"
        body="Mark a subhead as a dated occasion under Setup → Collection heads, and its donations will be listed here by donor."
      />
    );
  }

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!groups.has(r.head)) groups.set(r.head, [] as unknown as typeof rows);
    groups.get(r.head)!.push(r);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([head, list]) => {
        const total = list.reduce((s, r) => s + Number(r.amount), 0);
        return (
          <Card key={head} padded={false}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-3 pt-5">
              <h2 className="text-sm font-semibold text-ink-900">{head}</h2>
              <p className="tnum text-sm text-ink-500">
                {list.length} donors · Rs {money(total)}
              </p>
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Donor</Th>
                  <Th>Mobile</Th>
                  <Th>Receipt</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.receiptNo}>
                    <Td>
                      {r.donor}
                      <span className="code block text-xs text-ink-500">{r.donorCode}</span>
                    </Td>
                    <Td className="code text-xs">{r.mobile}</Td>
                    <Td className="code text-xs text-ink-500">{r.receiptNo}</Td>
                    <Td align="right" className="tnum font-medium">{money(r.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        );
      })}
    </div>
  );
}

async function CollectorReport({ where }: { where: SQL | undefined }) {
  const rows = await db
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

  if (rows.length === 0) return <Empty />;

  return (
    <Sheet
      columns={[
        { label: "Collected by" },
        { label: "Posted at" },
        { label: "Receipts", align: "right" },
        { label: "Total", align: "right" },
      ]}
      rows={rows.map((r) => (
        <tr key={r.name}>
          <Td>{r.name}</Td>
          <Td className="text-ink-500">{r.postedAt ?? "—"}</Td>
          <Td align="right" className="tnum">{r.count}</Td>
          <Td align="right" className="tnum font-medium">{money(r.total)}</Td>
        </tr>
      ))}
    />
  );
}

async function MethodReport({ where }: { where: SQL | undefined }) {
  const rows = await db
    .select({
      method: donations.paymentMethod,
      total: sql<string>`coalesce(sum(${donations.amount}),0)`,
      count: sql<number>`count(*)`,
    })
    .from(donations)
    .where(where)
    .groupBy(donations.paymentMethod)
    .orderBy(desc(sql`sum(${donations.amount})`));

  if (rows.length === 0) return <Empty />;

  return (
    <Sheet
      columns={[
        { label: "Method" },
        { label: "Receipts", align: "right" },
        { label: "Total", align: "right" },
      ]}
      rows={rows.map((r) => (
        <tr key={r.method}>
          <Td>{PAYMENT_LABELS[r.method]}</Td>
          <Td align="right" className="tnum">{r.count}</Td>
          <Td align="right" className="tnum font-medium">{money(r.total)}</Td>
        </tr>
      ))}
    />
  );
}

function Empty() {
  return (
    <EmptyState
      title="Nothing collected in this period"
      body="Widen the dates above, or check that you are looking at the right range."
    />
  );
}
