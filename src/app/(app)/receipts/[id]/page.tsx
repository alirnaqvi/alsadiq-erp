import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { donationLines, donations, donors, heads, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getSettings, scopeCondition } from "@/lib/queries";
import { appOrigin, ensureShareToken } from "@/lib/tokens";
import {
  dateTime,
  longDate,
  money,
  PAYMENT_LABELS,
  STATUS_LABELS,
  waNumber,
} from "@/lib/format";
import { Badge, Card, LinkButton, PageHeader, Table, Td, Th } from "@/components/ui";
import ReceiptStrip from "@/components/ReceiptStrip";
import NoteThread from "@/components/NoteThread";
import ReceiptActions from "./ReceiptActions";
import PrintReceiptButton from "@/components/PrintReceiptButton";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; count?: string }>;
}) {
  const { id } = await params;
  const { new: isNew, count } = await searchParams;
  const extraCount = Number(count) || 0;
  const user = await requirePermission("collection.view");
  const settings = await getSettings();
  const scope = await scopeCondition(user);

  const parentHead = alias(heads, "parent_head");
  const voider = alias(users, "voider");

  const [row] = await db
    .select({
      d: donations,
      donor: donors,
      headName: heads.name,
      parentName: parentHead.name,
      collector: users.fullName,
      voidedBy: voider.fullName,
    })
    .from(donations)
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .innerJoin(heads, eq(donations.headId, heads.id))
    .leftJoin(parentHead, eq(heads.parentId, parentHead.id))
    .innerJoin(users, eq(donations.collectedById, users.id))
    .leftJoin(voider, eq(donations.voidedById, voider.id))
    .where(eq(donations.id, Number(id)))
    .limit(1);

  if (!row) notFound();

  const token = await ensureShareToken(row.d.id);
  const origin = await appOrigin();
  const pdfUrl = `${origin}/r/${token}`;

  const extra = row.d.additionalNames || row.donor.additionalNames;
  const lines = await db
    .select({
      amount: donationLines.amount,
      headName: heads.name,
      parentName: parentHead.name,
    })
    .from(donationLines)
    .innerJoin(heads, eq(donationLines.headId, heads.id))
    .leftJoin(parentHead, eq(heads.parentId, parentHead.id))
    .where(eq(donationLines.donationId, row.d.id));
  const org = {
    name: settings.org_name || "Al Sadiq Trust",
    tagline: settings.org_tagline,
    address: settings.org_address,
    phone: settings.org_phone,
    footer: settings.receipt_footer,
    logo: settings.org_logo,
  };

  const receiptText = [
    `*${org.name}* — Donation Receipt`,
    "",
    `Receipt: ${row.d.receiptNo}`,
    `Date: ${longDate(row.d.receivedAt)}`,
    `Donor: ${row.donor.fullName} (${row.donor.donorCode})`,
    extra ? `Also: ${extra}` : "",
    `Head: ${row.parentName ? row.parentName + " / " : ""}${row.headName}`,
    `Amount: Rs ${money(row.d.amount)}`,
    `Method: ${PAYMENT_LABELS[row.d.paymentMethod]}`,
    row.d.status === "pending" ? "Status: Subject to clearance" : "",
    "",
    `Official PDF receipt: ${pdfUrl}`,
    "",
    org.footer ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const waLink = `https://wa.me/${waNumber(row.donor.mobile)}?text=${encodeURIComponent(receiptText)}`;
  const mailLink = row.donor.email
    ? `mailto:${row.donor.email}?subject=${encodeURIComponent(
        `${org.name} — Receipt ${row.d.receiptNo}`,
      )}&body=${encodeURIComponent(receiptText.replace(/\*/g, ""))}`
    : null;

  const history = await db
    .select({
      id: donations.id,
      receiptNo: donations.receiptNo,
      amount: donations.amount,
      status: donations.status,
      method: donations.paymentMethod,
      receivedAt: donations.receivedAt,
      headName: heads.name,
    })
    .from(donations)
    .innerJoin(heads, eq(donations.headId, heads.id))
    .where(and(eq(donations.donorId, row.donor.id), scope))
    .orderBy(desc(donations.receivedAt))
    .limit(8);

  const [agg] = await db
    .select({
      total: sql<string>`coalesce(sum(${donations.amount}),0)`,
      count: sql<number>`count(*)`,
    })
    .from(donations)
    .where(and(eq(donations.donorId, row.donor.id), ne(donations.status, "void"), scope));

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow={
            <Link href="/receipts" className="underline underline-offset-4">
              Receipts
            </Link>
          }
          title={row.d.receiptNo}
          subtitle={
            <>
              {dateTime(row.d.receivedAt)} · collected by {row.collector}
            </>
          }
          actions={
            <>
              {row.d.status !== "void" && (
                <>
                  <PrintReceiptButton />
                  <LinkButton href={waLink} target="_blank" rel="noopener noreferrer">
                    Send PDF on WhatsApp
                  </LinkButton>
                  <LinkButton href={pdfUrl} target="_blank">
                    Open PDF receipt
                  </LinkButton>
                  {mailLink && <LinkButton href={mailLink}>Email</LinkButton>}
                </>
              )}
            </>
          }
        />
      </div>

      <div className="no-print mb-5">
        <ReceiptActions
          id={row.d.id}
          status={row.d.status}
          canVoid={user.permissions.includes("collection.void")}
          startNext={user.permissions.includes("collection.create")}
        />
      </div>

      {isNew && (
        <p className="no-print mb-5 rounded-md border border-sabz-700/25 bg-sabz-100 px-3 py-2 text-sm text-sabz-700">
          {extraCount > 1
            ? `${extraCount} receipts saved for this collection. This is the first — print each one, or start the next entry.`
            : `Receipt ${row.d.receiptNo} saved. Print it or send it on WhatsApp, then start the next entry.`}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <ReceiptStrip
            data={{
              org,
              receiptNo: row.d.receiptNo,
              receivedAt: row.d.receivedAt,
              donorName: row.donor.fullName,
              donorCode: row.donor.donorCode,
              mobile: row.donor.mobile,
              headName: row.headName,
              parentName: row.parentName,
              amount: row.d.amount,
              paymentMethod: row.d.paymentMethod,
              chequeNo: row.d.chequeNo,
              slipRef: row.d.slipRef,
              bankName: row.d.bankName,
              collector: row.collector,
              status: row.d.status,
              remarks: row.d.remarks,
              additionalNames: extra,
              headLines: lines.map((l) => ({
                name: l.headName,
                parentName: l.parentName,
                amount: Number(l.amount),
              })),
            }}
          />
        </div>

        <div className="no-print space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Amount" value={`Rs ${money(row.d.amount)}`} />
            <Stat
              label="Status"
              value={
                <Badge
                  tone={
                    row.d.status === "void" ? "red" : row.d.status === "pending" ? "brass" : "green"
                  }
                >
                  {STATUS_LABELS[row.d.status]}
                </Badge>
              }
            />
            <Stat label="Method" value={PAYMENT_LABELS[row.d.paymentMethod]} />
            <Stat
              label={row.d.isMembership ? "Membership" : "Source"}
              value={
                row.d.isMembership
                  ? `Counted for ${row.d.membershipMonth}`
                  : row.d.source === "donor_app"
                    ? "Donor app"
                    : "Counter"
              }
            />
          </div>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">
                  <Link href={`/donors/${row.donor.id}`} className="text-sabz-700 hover:underline">
                    {row.donor.fullName}
                  </Link>
                </h2>
                <p className="code mt-0.5 text-xs text-ink-500">
                  {row.donor.donorCode} · {row.donor.mobile}
                </p>
              </div>
              <p className="text-sm text-ink-700">
                <span className="tnum font-semibold">Rs {money(agg?.total)}</span>
                <span className="text-ink-500">
                  {" "}
                  across {Number(agg?.count ?? 0)}{" "}
                  {Number(agg?.count ?? 0) === 1 ? "receipt" : "receipts"}
                </span>
              </p>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Head">
                {row.parentName ? `${row.parentName} / ` : ""}
                {row.headName}
              </Detail>
              {extra && <Detail label="Additional names">{extra}</Detail>}
              {row.d.chequeNo && <Detail label="Cheque number">{row.d.chequeNo}</Detail>}
              {row.d.bankName && <Detail label="Bank">{row.d.bankName}</Detail>}
              {row.d.slipRef && <Detail label="Reference">{row.d.slipRef}</Detail>}
              {row.d.slipUrl && (
                <Detail label="Slip">
                  <a
                    href={row.d.slipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sabz-700 underline underline-offset-4"
                  >
                    Open attached slip
                  </a>
                </Detail>
              )}
              {row.d.remarks && <Detail label="Remarks">{row.d.remarks}</Detail>}
            </dl>
            {row.d.status === "void" && (
              <div className="mt-4 rounded-md border border-alert-700/20 bg-alert-100 p-3 text-sm text-alert-700">
                <p className="font-medium">
                  Voided by {row.voidedBy} on {row.d.voidedAt ? dateTime(row.d.voidedAt) : "—"}
                </p>
                <p className="mt-1">{row.d.voidReason}</p>
              </div>
            )}
          </Card>

          {history.length > 0 && (
            <Card padded={false}>
              <h2 className="px-4 pb-3 pt-4 text-sm font-semibold text-ink-900 sm:px-5 sm:pt-5">
                This donor&apos;s receipts
              </h2>
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
                    <tr
                      key={h.id}
                      className={h.id === row.d.id ? "bg-sabz-100/50" : "hover:bg-paper/70"}
                    >
                      <Td>
                        {h.id === row.d.id ? (
                          <span className="code text-xs font-medium text-ink-900">{h.receiptNo}</span>
                        ) : (
                          <Link href={`/receipts/${h.id}`} className="code text-xs text-sabz-700">
                            {h.receiptNo}
                          </Link>
                        )}
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
            </Card>
          )}

          <Card>
            <NoteThread entityType="donation" entityId={row.d.id} />
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4 shadow-[0_1px_2px_rgba(11,16,19,0.04)]">
      <p className="eyebrow">{label}</p>
      <div className="tnum mt-1 text-lg font-semibold text-ink-900">{value}</div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm text-ink-800">{children}</dd>
    </div>
  );
}
