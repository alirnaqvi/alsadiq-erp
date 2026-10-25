import { asc, sql, ne } from "drizzle-orm";
import { db } from "@/db";
import { heads, donations } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { money, longDate } from "@/lib/format";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { Badge, Card, PageHeader, Button } from "@/components/ui";
import { toggleHead } from "./actions";
import HeadForm from "./HeadForm";

export const dynamic = "force-dynamic";

export default async function HeadsPage() {
  await requirePermission("head.manage");
  const t = tx(await getLocale());

  const rows = await db.select().from(heads).orderBy(asc(heads.sortOrder), asc(heads.name));

  const usage = await db
    .select({
      headId: donations.headId,
      n: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(${donations.amount}),0)`,
    })
    .from(donations)
    .where(ne(donations.status, "void"))
    .groupBy(donations.headId);

  const use = new Map(usage.map((u) => [u.headId, u]));
  const parents = rows.filter((r) => !r.parentId);
  const childrenOf = (id: number) => rows.filter((r) => r.parentId === id);

  return (
    <>
      <PageHeader
        eyebrow={t("group.setup")}
        title={t("pages.heads.title")}
        subtitle={t("pages.heads.subtitle")}
      />

      <div className="mb-6 rounded-md border border-brass-600/30 bg-brass-100/60 px-4 py-3 text-sm text-ink-800">
        These heads are placeholders put in to get the system running. Replace them with the
        trust&apos;s own list — a head that already has receipts against it can be retired but not
        removed, so old records stay readable.
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padded={false}>
          <ul className="divide-y divide-ink-100">
            {parents.map((p) => {
              const kids = childrenOf(p.id);
              const own = use.get(p.id);
              return (
                <li key={p.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-ink-900">{p.name}</span>
                      {p.nameUr && <span className="ml-2 text-sm text-ink-500">{p.nameUr}</span>}
                      <span className="code ml-2 text-xs text-ink-300">{p.code}</span>
                      {!p.isActive && (
                        <span className="ml-2">
                          <Badge tone="red">Retired</Badge>
                        </span>
                      )}
                    </div>
                    <form action={toggleHead}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {p.isActive ? "Retire" : "Reopen"}
                      </Button>
                    </form>
                  </div>

                  {kids.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-l border-ink-100 pl-4">
                      {kids.map((c) => {
                        const u = use.get(c.id);
                        return (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-1"
                          >
                            <span className="text-sm text-ink-800">
                              {c.name}
                              {c.isEvent && (
                                <span className="ml-2">
                                  <Badge tone="brass">
                                    Event{c.eventDate ? ` · ${longDate(c.eventDate)}` : ""}
                                  </Badge>
                                </span>
                              )}
                              {!c.isActive && (
                                <span className="ml-2">
                                  <Badge tone="red">Retired</Badge>
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-3">
                              <span className="tnum text-xs text-ink-500">
                                {u ? `${u.n} receipts · Rs ${money(u.total)}` : "no receipts yet"}
                              </span>
                              <form action={toggleHead}>
                                <input type="hidden" name="id" value={c.id} />
                                <Button type="submit" variant="ghost" size="sm">
                                  {c.isActive ? "Retire" : "Reopen"}
                                </Button>
                              </form>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-ink-500">
                      No subheads — this head is collected against directly
                      {own ? ` (${own.n} receipts)` : ""}.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <HeadForm parents={parents.map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      </div>
    </>
  );
}
