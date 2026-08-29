import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, heads } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { selectableHeads, getSettings, startOfPkToday } from "@/lib/queries";
import { hijri, longDate, money, timeOnly } from "@/lib/format";
import { PageHeader, Card } from "@/components/ui";
import CollectForm from "./CollectForm";

export const dynamic = "force-dynamic";

export default async function CollectPage({
  searchParams,
}: {
  searchParams: Promise<{ donor?: string }>;
}) {
  const { donor: prefill } = await searchParams;
  const user = await requirePermission("collection.create");
  const [headOptions, settings] = await Promise.all([selectableHeads(), getSettings()]);

  const mine = await db
    .select({
      id: donations.id,
      receiptNo: donations.receiptNo,
      amount: donations.amount,
      receivedAt: donations.receivedAt,
      donorName: donors.fullName,
      headName: heads.name,
    })
    .from(donations)
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .innerJoin(heads, eq(donations.headId, heads.id))
    .where(
      and(
        eq(donations.collectedById, user.id),
        gte(donations.receivedAt, startOfPkToday()),
      ),
    )
    .orderBy(desc(donations.receivedAt))
    .limit(6);

  const todayTotal = mine.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <PageHeader
        eyebrow={`${longDate(new Date())} · ${hijri(new Date())}`}
        title="Collection counter"
        subtitle="Start with the mobile number. Everything else follows from it."
      />

      <CollectForm
        heads={headOptions}
        org={{
          name: settings.org_name || "Al Sadiq Trust",
          tagline: settings.org_tagline || "",
          address: settings.org_address || "",
          phone: settings.org_phone || "",
          footer: settings.receipt_footer || "",
        }}
        collector={user.fullName}
        initialTerm={prefill ?? ""}
      />

      <Card className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Your entries today</h2>
          <p className="tnum text-sm text-ink-500">
            {mine.length} receipts · Rs {money(todayTotal)}
          </p>
        </div>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            Nothing yet today. The first receipt you write will show here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100 text-sm">
            {mine.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="code shrink-0 text-xs text-ink-500">{r.receiptNo}</span>
                <span className="min-w-0 flex-1 truncate text-ink-800">{r.donorName}</span>
                <span className="hidden min-w-0 flex-1 truncate text-ink-500 sm:block">
                  {r.headName}
                </span>
                <span className="tnum shrink-0 font-medium">Rs {money(r.amount)}</span>
                <span className="tnum hidden shrink-0 text-xs text-ink-500 sm:block">
                  {timeOnly(r.receivedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
