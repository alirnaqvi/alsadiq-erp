import Link from "next/link";
import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { donations, pledges } from "@/db/schema";
import { requireDonor } from "@/lib/donor-auth";
import { donorHistory } from "../actions";
import { pkMonthBounds } from "@/lib/queries";
import { money, longDate } from "@/lib/format";
import { Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DonorHomePage() {
  const donor = await requireDonor();
  const month = pkMonthBounds();
  const history = await donorHistory(donor.id);

  const [monthRow] = await db
    .select({ total: sql<string>`coalesce(sum(${donations.amount}),0)` })
    .from(donations)
    .where(
      and(
        eq(donations.donorId, donor.id),
        ne(donations.status, "void"),
        gte(donations.receivedAt, month.start),
        lt(donations.receivedAt, month.end),
      ),
    );

  const [life] = await db
    .select({ total: sql<string>`coalesce(sum(${donations.amount}),0)` })
    .from(donations)
    .where(and(eq(donations.donorId, donor.id), ne(donations.status, "void")));

  const [pledge] = await db.select().from(pledges).where(eq(pledges.donorId, donor.id)).limit(1);

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(month.start);

  return (
    <>
      <h1 className="text-xl font-semibold text-ink-900">Assalam-o-Alaikum, {donor.fullName.split(" ")[0]}</h1>
      <p className="code mt-1 text-xs text-ink-500">
        {donor.donorCode} · {donor.mobile}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card>
          <p className="eyebrow">{monthLabel}</p>
          <p className="tnum mt-1 text-xl font-semibold">Rs {money(monthRow?.total)}</p>
        </Card>
        <Card>
          <p className="eyebrow">All time</p>
          <p className="tnum mt-1 text-xl font-semibold">Rs {money(life?.total)}</p>
        </Card>
      </div>

      {pledge?.isActive && (
        <p className="mt-4 rounded-md border border-brass-600/25 bg-brass-100/60 px-3 py-2 text-sm text-ink-800">
          Monthly pledge Rs {money(pledge.monthlyAmount)}
        </p>
      )}

      <div className="mt-5">
        <LinkButton href="/m/pay" variant="primary" className="w-full">
          Make a payment
        </LinkButton>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink-900">Recent receipts</h2>
      <ul className="mt-3 space-y-2">
        {history.slice(0, 8).map((h) => (
          <li key={h.id} className="flex items-center justify-between rounded-md border border-ink-100 bg-white px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{h.headName}</p>
              <p className="text-xs text-ink-500">
                {longDate(h.receivedAt)} · {h.receiptNo}
                {h.status === "pending" ? " · pending" : ""}
              </p>
            </div>
            <span className="tnum font-semibold">Rs {money(h.amount)}</span>
          </li>
        ))}
        {history.length === 0 && <p className="text-sm text-ink-500">No receipts yet.</p>}
      </ul>
      <p className="mt-4 text-center">
        <Link href="/m/ledger" className="text-sm text-sabz-700 underline underline-offset-4">
          Open full ledger
        </Link>
      </p>
    </>
  );
}
