import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import {
  dateTime,
  longDate,
  money,
  PAYMENT_LABELS,
  STATUS_LABELS,
  waNumber,
} from "@/lib/format";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import ReceiptStrip from "@/components/ReceiptStrip";
import NoteThread from "@/components/NoteThread";
import ReceiptActions from "./ReceiptActions";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requirePermission("collection.view");
  const settings = await getSettings();

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

  const org = {
    name: settings.org_name || "Al Sadiq Trust",
    tagline: settings.org_tagline,
    address: settings.org_address,
    phone: settings.org_phone,
    footer: settings.receipt_footer,
  };

  const receiptText = [
    `*${org.name}* — Donation Receipt`,
    "",
    `Receipt: ${row.d.receiptNo}`,
    `Date: ${longDate(row.d.receivedAt)}`,
    `Donor: ${row.donor.fullName} (${row.donor.donorCode})`,
    `Head: ${row.parentName ? row.parentName + " / " : ""}${row.headName}`,
    `Amount: Rs ${money(row.d.amount)}`,
    `Method: ${PAYMENT_LABELS[row.d.paymentMethod]}`,
    row.d.status === "pending" ? "Status: Subject to clearance" : "",
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
                  <LinkButton href={waLink} target="_blank" rel="noopener noreferrer">
                    Send on WhatsApp
                  </LinkButton>
                  {mailLink && <LinkButton href={mailLink}>Email</LinkButton>}
                </>
              )}
            </>
          }
        />
      </div>

      {isNew && (
        <p className="no-print mb-5 rounded-md border border-sabz-700/25 bg-sabz-100 px-3 py-2 text-sm text-sabz-700">
          Receipt {row.d.receiptNo} saved. Print it or send it on WhatsApp, then start the next
          entry.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
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
            }}
          />
          <div className="no-print mt-4 flex flex-col gap-2">
            <ReceiptActions
              id={row.d.id}
              status={row.d.status}
              canVoid={user.permissions.includes("collection.void")}
              startNext={user.permissions.includes("collection.create")}
            />
          </div>
        </div>

        <div className="no-print space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-ink-900">Details</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Detail label="Status">
                <Badge
                  tone={
                    row.d.status === "void" ? "red" : row.d.status === "pending" ? "brass" : "green"
                  }
                >
                  {STATUS_LABELS[row.d.status]}
                </Badge>
              </Detail>
              <Detail label="Amount">
                <span className="tnum font-semibold">Rs {money(row.d.amount)}</span>
              </Detail>
              <Detail label="Donor">
                <Link href={`/donors/${row.donor.id}`} className="text-sabz-700 hover:underline">
                  {row.donor.fullName}
                </Link>
                <span className="code block text-xs text-ink-500">
                  {row.donor.donorCode} · {row.donor.mobile}
                </span>
              </Detail>
              <Detail label="Head">
                {row.parentName ? `${row.parentName} / ` : ""}
                {row.headName}
              </Detail>
              <Detail label="Payment method">{PAYMENT_LABELS[row.d.paymentMethod]}</Detail>
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
              {row.d.isMembership && <Detail label="Membership">Counted for {row.d.membershipMonth}</Detail>}
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

          <Card>
            <NoteThread entityType="donation" entityId={row.d.id} />
          </Card>
        </div>
      </div>
    </>
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
