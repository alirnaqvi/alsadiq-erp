import Link from "next/link";
import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { scopeCondition, pkDayBounds, pkMonthBounds } from "@/lib/queries";
import { hijri, longDate, money, moneyWithSymbol, timeOnly } from "@/lib/format";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { Card, LinkButton, PageHeader, Table, Td, Th, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const user = await requireUser();
  const t = tx(await getLocale());
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
        title={t("dash.hello", { name: user.fullName.split(" ")[0] })}
        subtitle={
          user.dataScope === "all"
            ? t("dash.scopeAll")
            : user.dataScope === "team"
              ? t("dash.scopeTeam")
              : t("dash.scopeOwn")
        }
        actions={
          user.permissions.includes("collection.create") && (
            <LinkButton href="/collect" variant="gold" size="md" className="px-4 py-2 text-sm">
              {t("common.recordDonation")}
            </LinkButton>
          )
        }
      />

      {denied && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-foreground"
        >
          {t("dash.denied")}
        </p>
      )}

      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] lg:grid-cols-4 lg:divide-x lg:divide-y-0 divide-x divide-y divide-border">
        <Stat
          label={t("dash.today")}
          value={moneyWithSymbol(todayRow?.total)}
          note={t("dash.receiptsN", { n: todayRow?.count ?? 0 })}
        />
        <Stat
          label={t("dash.month")}
          value={moneyWithSymbol(monthRow?.total)}
          note={t("dash.receiptsN", { n: monthRow?.count ?? 0 })}
        />
        <Stat
          label={t("dash.awaiting")}
          value={moneyWithSymbol(pendingRow?.total)}
          note={t("dash.chequesN", { n: pendingRow?.count ?? 0 })}
        />
        <Stat label={t("dash.donors")} value={money(donorRow?.count)} note={t("dash.allTime")} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl font-bold text-primary">{t("dash.byHead")}</h2>
          {byHead.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("dash.noneMonth")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byHead.map((h) => (
                <li key={`${h.parent}-${h.head}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-foreground">
                      {h.parent ? <span className="text-muted-foreground">{h.parent} · </span> : null}
                      {h.head}
                    </span>
                    <span className="tnum shrink-0 font-display text-sm font-bold text-primary">
                      {moneyWithSymbol(h.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gold"
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
            <h2 className="font-display text-xl font-bold text-primary">{t("dash.latest")}</h2>
            {user.permissions.includes("collection.view") && (
              <Link href="/receipts" className="text-xs font-semibold text-primary underline underline-offset-4">
                {t("common.seeAll")}
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                title={t("dash.emptyTitle")}
                body={t("dash.emptyBody")}
              />
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("dash.colReceipt")}</Th>
                  <Th>{t("dash.colDonor")}</Th>
                  <Th>{t("dash.colHead")}</Th>
                  <Th align="right">{t("dash.colAmount")}</Th>
                  <Th align="right">{t("dash.colTime")}</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary">
                    <Td>
                      <Link href={`/receipts/${r.id}`} className="code text-xs text-primary">
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
                    <Td className="max-w-[10rem] truncate text-muted-foreground">{r.headName}</Td>
                    <Td align="right" className="tnum font-medium">
                      {money(r.amount)}
                    </Td>
                    <Td align="right" className="tnum text-xs text-muted-foreground">
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
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="p-6 text-center">
      <p className="tnum font-display text-3xl font-bold text-primary md:text-4xl">{value}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
