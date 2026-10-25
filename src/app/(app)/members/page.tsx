import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pledges, donors } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { pkMonthBounds, selectableHeads, getSettings } from "@/lib/queries";
import { money, waNumber, longDate } from "@/lib/format";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Button,
} from "@/components/ui";
import { togglePledge } from "./actions";
import PledgeForm from "./PledgeForm";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  await requirePermission("member.manage");
  const t = tx(await getLocale());
  const { start, end } = pkMonthBounds();
  const settings = await getSettings();
  const headOptions = await selectableHeads();

  const rows = await db
    .select({
      id: pledges.id,
      donorId: donors.id,
      donorCode: donors.donorCode,
      name: donors.fullName,
      mobile: donors.mobile,
      monthlyAmount: pledges.monthlyAmount,
      dueDay: pledges.dueDay,
      isActive: pledges.isActive,
      startedOn: pledges.startedOn,
      paid: sql<string>`coalesce((
        select sum(amount) from donations
        where donations.donor_id = ${donors.id}
          and donations.status <> 'void'
          and donations.received_at >= ${start}
          and donations.received_at < ${end}
      ),0)`,
    })
    .from(pledges)
    .innerJoin(donors, eq(pledges.donorId, donors.id))
    .orderBy(donors.fullName);

  const active = rows.filter((r) => r.isActive);
  const due = active.filter((r) => Number(r.paid) < Number(r.monthlyAmount));
  const pledged = active.reduce((s, r) => s + Number(r.monthlyAmount), 0);
  const received = active.reduce((s, r) => s + Number(r.paid), 0);

  const orgName = settings.org_name || "Al Sadiq Trust";
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(start);

  const reminderFor = (r: (typeof rows)[number]) => {
    const shortfall = Number(r.monthlyAmount) - Number(r.paid);
    const text = [
      `Assalam-o-Alaikum ${r.name},`,
      "",
      `This is a reminder from ${orgName}. Your monthly contribution of Rs ${money(
        r.monthlyAmount,
      )} for ${monthLabel} is still outstanding${
        Number(r.paid) > 0 ? ` (Rs ${money(shortfall)} remaining)` : ""
      }.`,
      "",
      "Jazak Allah for your continued support.",
    ].join("\n");
    return `https://wa.me/${waNumber(r.mobile)}?text=${encodeURIComponent(text)}`;
  };

  return (
    <>
      <PageHeader
        eyebrow={t("group.daily")}
        title={t("pages.members.title")}
        subtitle={`${monthLabel} · Rs ${money(received)} received against Rs ${money(pledged)} pledged`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Active members" value={String(active.length)} />
        <Stat label="Paid this month" value={String(active.length - due.length)} />
        <Stat label="Still due" value={String(due.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {due.length > 0 && (
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 pb-3 pt-5">
                <h2 className="text-sm font-semibold text-ink-900">Due this month</h2>
                <span className="text-xs text-ink-500">
                  Send a reminder on WhatsApp, one tap each
                </span>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Member</Th>
                    <Th>Due on</Th>
                    <Th align="right">Pledged</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Remind</Th>
                  </tr>
                </thead>
                <tbody>
                  {due.map((r) => (
                    <tr key={r.id}>
                      <Td>
                        <Link href={`/donors/${r.donorId}`} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                        <span className="code block text-xs text-ink-500">{r.mobile}</span>
                      </Td>
                      <Td className="tnum text-ink-500">{r.dueDay} of the month</Td>
                      <Td align="right" className="tnum">{money(r.monthlyAmount)}</Td>
                      <Td align="right" className="tnum text-ink-500">{money(r.paid)}</Td>
                      <Td align="right">
                        <a
                          href={reminderFor(r)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-sabz-700 underline underline-offset-4"
                        >
                          WhatsApp
                        </a>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          <Card padded={false}>
            <h2 className="px-5 pb-3 pt-5 text-sm font-semibold text-ink-900">All members</h2>
            {rows.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  title="No monthly members yet"
                  body="Add one on the right using the mobile number of a registered donor."
                />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Member</Th>
                    <Th>Since</Th>
                    <Th align="right">Monthly</Th>
                    <Th align="right">This month</Th>
                    <Th align="right"></Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const settled = Number(r.paid) >= Number(r.monthlyAmount);
                    return (
                      <tr key={r.id} className={r.isActive ? "" : "opacity-55"}>
                        <Td>
                          <Link href={`/donors/${r.donorId}`} className="font-medium hover:underline">
                            {r.name}
                          </Link>
                          {!r.isActive && (
                            <span className="ml-2">
                              <Badge tone="red">Paused</Badge>
                            </span>
                          )}
                          <span className="code block text-xs text-ink-500">{r.donorCode}</span>
                        </Td>
                        <Td className="text-xs text-ink-500">{longDate(r.startedOn)}</Td>
                        <Td align="right" className="tnum">{money(r.monthlyAmount)}</Td>
                        <Td align="right" className="tnum">
                          {money(r.paid)}
                          {r.isActive && (
                            <span className="ml-2">
                              <Badge tone={settled ? "green" : "brass"}>
                                {settled ? "Paid" : "Due"}
                              </Badge>
                            </span>
                          )}
                        </Td>
                        <Td align="right">
                          <form action={togglePledge}>
                            <input type="hidden" name="id" value={r.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              {r.isActive ? "Pause" : "Resume"}
                            </Button>
                          </form>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <PledgeForm heads={headOptions} />
        </div>
      </div>
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
