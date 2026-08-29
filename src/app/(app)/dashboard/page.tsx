import Link from "next/link";
import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { scopeCondition, pkDayBounds, pkMonthBounds } from "@/lib/queries";
import { hijri, longDate, money, moneyWithSymbol, timeOnly } from "@/lib/format";
import { Card, LinkButton, PageHeader, Table, Td, Th, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const user = await requireUser();
  const scope = await scopeCondition(user);
  const notVoid = ne(donations.status, "void");
  const day = pkDayBounds();
  const month = pkMonthBounds();

  const where = (...extra: (ReturnType<typeof eq> | undefined)[]) =>
    and(notVoid, scope, ...extra);

  const [todayRow] = await db
    .select({ total: sql<string>`coalesce(sum(${donations.amount}),0)`, count: sql<number>`count(*)` })
    .from(donations)
    .where(where(gte(donations.receivedAt, day.start), lt(donations.receivedAt, day.end)));

  const [monthRow] = await db
    .select({ total: sql<string>`coalesce(sum(${donations.amount}),0)`, count: sql<number>`count(*)` })
    .from(donations)
    .where(where(gte(donations.receivedAt, month.start), lt(donations.receivedAt, month.end)));

  const [pendingRow] = await db
    .select({ total: sql<string>`coalesce(sum(${donations.amount}),0)`, count: sql<number>`count(*)` })
    .from(donations)
    .where(and(scope, eq(donations.status, "pending")));

  const [donorRow] = await db.select({ count: sql<number>`count(*)` }).from(donors);

  const byHead = await db
    .select({
      head: heads.name,
      parent: sql<string | null>`parent.name`,
      total: sql<string>`coalesce(sum(${donations.amount}),0)`,
      count: sql<number>`count(*)`,
    })
    .from(donations)
    .innerJoin(heads, eq(donations.headId, heads.id))
    .leftJoin(sql`heads as parent`, sql`parent.id = ${heads.parentId}`)
    .where(where(gte(donations.receivedAt, month.start), lt(donations.receivedAt, month.end)))
    .groupBy(heads.name, sql`parent.name`)
    .orderBy(desc(sql`sum(${donations.amount})`))
    .limit(6);

  const recent = await db
    .select({
      id: donations.id,
      receiptNo: donations.receiptNo,
      amount: donations.amount,
      status: donations.status,
      receivedAt: donations.receivedAt,
      donorName: donors.fullName,
      headName: heads.name,
      collector: users.fullName,
    })
    .from(donations)
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .innerJoin(heads, eq(donations.headId, heads.id))
    .innerJoin(users, eq(donations.collectedById, users.id))
    .where(and(scope))
    .orderBy(desc(donations.receivedAt))
    .limit(8);

  const monthTotal = Number(monthRow?.total ?? 0);
  const topShare = (v: string) => (monthTotal ? (Number(v) / monthTotal) * 100 : 0);

  return (
    <>
      <PageHeader
        eyebrow={`${longDate(new Date())} · ${hijri(new Date())}`}
        title={`Assalam-o-Alaikum, ${user.fullName.split(" ")[0]}`}
        subtitle={
          user.dataScope === "all"
            ? "Showing collection across the whole trust."
            : user.dataScope === "team"
              ? "Showing what you and your team have collected."
              : "Showing what you have collected."
        }
        actions={
          user.permissions.includes("collection.create") && (
            <LinkButton href="/collect" variant="primary" size="md">
              Record a donation
            </LinkButton>
          )
        }
      />

      {denied && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-brass-600/30 bg-brass-100 px-3 py-2 text-sm text-brass-600"
        >
          Your role does not have access to that screen. Ask an administrator if you need it.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected today" value={moneyWithSymbol(todayRow?.total)} note={`${todayRow?.count ?? 0} receipts`} accent />
        <Stat label="This month" value={moneyWithSymbol(monthRow?.total)} note={`${monthRow?.count ?? 0} receipts`} />
        <Stat
          label="Awaiting clearance"
          value={moneyWithSymbol(pendingRow?.total)}
          note={`${pendingRow?.count ?? 0} cheques / transfers`}
        />
        <Stat label="Registered donors" value={money(donorRow?.count)} note="All time" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink-900">Where this month came from</h2>
          {byHead.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">Nothing recorded this month yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byHead.map((h) => (
                <li key={`${h.parent}-${h.head}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-ink-800">
                      {h.parent ? <span className="text-ink-500">{h.parent} · </span> : null}
                      {h.head}
                    </span>
                    <span className="tnum shrink-0 text-sm font-medium text-ink-900">
                      {moneyWithSymbol(h.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-sabz-700"
                      style={{ width: `${Math.max(topShare(h.total), 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3" padded={false}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h2 className="text-sm font-semibold text-ink-900">Latest receipts</h2>
            {user.permissions.includes("collection.view") && (
              <Link href="/receipts" className="text-xs text-sabz-700 underline underline-offset-4">
                See all
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                title="No receipts yet"
                body="The first donation you record will appear here."
              />
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Receipt</Th>
                  <Th>Donor</Th>
                  <Th>Head</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Time</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
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
                    <Td className="max-w-[10rem] truncate">{r.donorName}</Td>
                    <Td className="max-w-[10rem] truncate text-ink-500">{r.headName}</Td>
                    <Td align="right" className="tnum font-medium">
                      {money(r.amount)}
                    </Td>
                    <Td align="right" className="tnum text-xs text-ink-500">
                      {timeOnly(r.receivedAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-lg bg-ink-950 p-5 text-white"
          : "rounded-lg border border-ink-100 bg-white p-5"
      }
    >
      <p
        className={
          accent
            ? "text-[11px] font-semibold uppercase tracking-[0.09em] text-brass-600"
            : "eyebrow"
        }
      >
        {label}
      </p>
      <p className={`tnum mt-2 text-2xl font-semibold tracking-tight ${accent ? "" : "text-ink-900"}`}>
        {value}
      </p>
      <p className={`mt-1 text-xs ${accent ? "text-ink-300" : "text-ink-500"}`}>{note}</p>
    </div>
  );
}
