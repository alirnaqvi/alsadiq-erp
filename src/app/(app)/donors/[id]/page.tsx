import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { donors, donations, heads, pledges, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { money, longDate, PAYMENT_LABELS, waNumber } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import NoteThread from "@/components/NoteThread";

export const dynamic = "force-dynamic";

export default async function DonorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donorId = Number(id);
  const user = await requirePermission("donor.view");
  const settings = await getSettings();

  const [donor] = await db.select().from(donors).where(eq(donors.id, donorId)).limit(1);
  if (!donor) notFound();

  const [creator] = donor.createdById
    ? await db.select({ name: users.fullName }).from(users).where(eq(users.id, donor.createdById))
    : [{ name: null }];

  const history = await db
    .select({
      id: donations.id,
      receiptNo: donations.receiptNo,
      amount: donations.amount,
      status: donations.status,
      method: donations.paymentMethod,
      receivedAt: donations.receivedAt,
      headName: heads.name,
      collector: users.fullName,
    })
    .from(donations)
    .innerJoin(heads, eq(donations.headId, heads.id))
    .innerJoin(users, eq(donations.collectedById, users.id))
    .where(eq(donations.donorId, donorId))
    .orderBy(desc(donations.receivedAt))
    .limit(50);

  const [agg] = await db
    .select({
      total: sql<string>`coalesce(sum(${donations.amount}),0)`,
      count: sql<number>`count(*)`,
    })
    .from(donations)
    .where(and(eq(donations.donorId, donorId), ne(donations.status, "void")));

  const [pledge] = await db.select().from(pledges).where(eq(pledges.donorId, donorId)).limit(1);

  const statementText = [
    `*${settings.org_name || "Al Sadiq Trust"}* — Donation statement`,
    "",
    `${donor.fullName} (${donor.donorCode})`,
    `Total given: Rs ${money(agg?.total)} across ${agg?.count ?? 0} donations`,
    "",
    ...history
      .filter((h) => h.status !== "void")
      .slice(0, 10)
      .map((h) => `${longDate(h.receivedAt)} — Rs ${money(h.amount)} — ${h.headName}`),
    "",
    "Jazak Allah for your continued support.",
  ].join("\n");

  const waLink = `https://wa.me/${waNumber(donor.mobile)}?text=${encodeURIComponent(statementText)}`;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/donors" className="underline underline-offset-4">
            Donors
          </Link>
        }
        title={donor.fullName}
        subtitle={
          <span className="code">
            {donor.donorCode} · {donor.mobile}
            {donor.legacyCode ? ` · old no. ${donor.legacyCode}` : ""}
          </span>
        }
        actions={
          <>
            <LinkButton href={waLink} target="_blank" rel="noopener noreferrer">
              Send statement
            </LinkButton>
            <LinkButton href={`/api/export/statement?donor=${donor.id}`}>
              Download statement
            </LinkButton>
            {user.permissions.includes("donor.edit") && (
              <LinkButton href={`/donors/${donor.id}/edit`}>Edit</LinkButton>
            )}
            {user.permissions.includes("collection.create") && (
              <LinkButton href={`/collect?donor=${donor.mobile}`} variant="primary">
                Record a donation
              </LinkButton>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total given" value={`Rs ${money(agg?.total)}`} />
            <Stat label="Donations" value={String(agg?.count ?? 0)} />
            <Stat
              label="Monthly pledge"
              value={pledge?.isActive ? `Rs ${money(pledge.monthlyAmount)}` : "None"}
            />
          </div>

          <Card padded={false}>
            <h2 className="px-5 pb-3 pt-5 text-sm font-semibold text-ink-900">Giving history</h2>
            {history.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  title="No donations recorded"
                  body="Once this donor gives, every receipt will be listed here."
                />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Receipt</Th>
                    <Th>Head</Th>
                    <Th>Method</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-paper/70">
                      <Td>
                        <Link href={`/receipts/${h.id}`} className="code text-xs text-sabz-700">
                          {h.receiptNo}
                        </Link>
                        {h.status !== "completed" && (
                          <span className="ml-2">
                            <Badge tone={h.status === "void" ? "red" : "brass"}>
                              {h.status === "void" ? "Void" : "Pending"}
                            </Badge>
                          </span>
                        )}
                      </Td>
                      <Td className="max-w-[12rem] truncate text-ink-500">{h.headName}</Td>
                      <Td className="text-ink-500">{PAYMENT_LABELS[h.method]}</Td>
                      <Td
                        align="right"
                        className={`tnum font-medium ${h.status === "void" ? "text-ink-300 line-through" : ""}`}
                      >
                        {money(h.amount)}
                      </Td>
                      <Td align="right" className="tnum whitespace-nowrap text-xs text-ink-500">
                        {longDate(h.receivedAt)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-ink-900">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Row label="Mobile" value={donor.mobile} mono />
              {donor.altMobile && <Row label="Alternate" value={donor.altMobile} mono />}
              {donor.sharesMobileWith && (
                <Row label="Number held by" value={donor.sharesMobileWith} />
              )}
              {donor.cnic && <Row label="CNIC" value={donor.cnic} mono />}
              {donor.email && <Row label="Email" value={donor.email} />}
              {donor.city && <Row label="City" value={donor.city} />}
              {donor.address && <Row label="Address" value={donor.address} />}
              {donor.notes && <Row label="Notes" value={donor.notes} />}
              <Row
                label="Registered"
                value={`${longDate(donor.createdAt)}${creator?.name ? ` by ${creator.name}` : ""}`}
              />
            </dl>
          </Card>

          <Card>
            <NoteThread entityType="donor" entityId={donor.id} />
          </Card>
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-0.5 text-ink-800 ${mono ? "code text-sm" : ""}`}>{value}</dd>
    </div>
  );
}
