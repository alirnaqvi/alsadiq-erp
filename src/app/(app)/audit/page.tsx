import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_TONE: Record<string, "neutral" | "green" | "brass" | "red"> = {
  create: "green",
  update: "brass",
  void: "red",
  delete: "red",
  login: "neutral",
  logout: "neutral",
  login_failed: "red",
  export: "neutral",
  note: "neutral",
  reset_password: "brass",
  change_password: "brass",
};

const ENTITY_LINK: Record<string, (id: number) => string> = {
  donation: (id) => `/receipts/${id}`,
  donor: (id) => `/donors/${id}`,
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requirePermission("audit.view");

  const page = Math.max(1, Number(sp.page ?? 1));
  const filters: (SQL | undefined)[] = [];
  if (sp.action) filters.push(eq(auditLogs.action, sp.action));
  if (sp.q) {
    filters.push(
      or(ilike(auditLogs.summary, `%${sp.q}%`), ilike(auditLogs.actorName, `%${sp.q}%`)),
    );
  }
  const where = filters.length ? and(...filters.filter(Boolean)) : undefined;

  const rows = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [count] = await db.select({ n: sql<number>`count(*)` }).from(auditLogs).where(where);
  const totalPages = Math.max(1, Math.ceil(Number(count?.n ?? 0) / PAGE_SIZE));

  const actions = await db
    .select({ action: auditLogs.action, n: sql<number>`count(*)` })
    .from(auditLogs)
    .groupBy(auditLogs.action)
    .orderBy(desc(sql`count(*)`));

  return (
    <>
      <PageHeader
        eyebrow="Oversight"
        title="Audit trail"
        subtitle={`${Number(count?.n ?? 0)} recorded events. Nothing in this system is changed without a line here.`}
      />

      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[220px] flex-1">
            <span className="eyebrow mb-1 block">Search</span>
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Receipt number, donor name or staff member"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">Action</span>
            <select name="action" defaultValue={sp.action ?? ""} className={inputClass}>
              <option value="">Every action</option>
              {actions.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action.replace(/_/g, " ")} ({a.n})
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-md bg-sabz-700 px-4 text-sm font-medium text-white hover:bg-sabz-600"
          >
            Filter
          </button>
          <Link href="/audit" className="pb-2 text-sm text-ink-500 underline underline-offset-4">
            Clear
          </Link>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="Nothing matches" body="Try clearing the filters above." />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-ink-100">
            {rows.map((r) => {
              const href = r.entityId ? ENTITY_LINK[r.entityType]?.(r.entityId) : undefined;
              return (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Badge tone={ACTION_TONE[r.action] ?? "neutral"}>
                      {r.action.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm text-ink-900">
                      {href ? (
                        <Link href={href} className="hover:underline">
                          {r.summary}
                        </Link>
                      ) : (
                        r.summary
                      )}
                    </span>
                  </div>
                  <p className="tnum mt-1 text-xs text-ink-500">
                    {r.actorName ?? "unknown"} · {dateTime(r.createdAt)}
                    {r.ip ? ` · ${r.ip}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/audit?page=${page - 1}${sp.q ? `&q=${sp.q}` : ""}${sp.action ? `&action=${sp.action}` : ""}`}
                className="text-sabz-700 underline underline-offset-4"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/audit?page=${page + 1}${sp.q ? `&q=${sp.q}` : ""}${sp.action ? `&action=${sp.action}` : ""}`}
                className="text-sabz-700 underline underline-offset-4"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
