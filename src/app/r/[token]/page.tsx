import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { donations, donors, heads, users } from "@/db/schema";
import { getSettings } from "@/lib/queries";
import FormalReceipt from "@/components/FormalReceipt";
import PrintPdfButton from "@/components/PrintPdfButton";

export const dynamic = "force-dynamic";

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const settings = await getSettings();
  const parentHead = alias(heads, "parent_head");

  const [row] = await db
    .select({
      d: donations,
      donor: donors,
      headName: heads.name,
      parentName: parentHead.name,
      collector: users.fullName,
    })
    .from(donations)
    .innerJoin(donors, eq(donations.donorId, donors.id))
    .innerJoin(heads, eq(donations.headId, heads.id))
    .leftJoin(parentHead, eq(heads.parentId, parentHead.id))
    .innerJoin(users, eq(donations.collectedById, users.id))
    .where(eq(donations.shareToken, token))
    .limit(1);

  if (!row) notFound();

  const extra = row.d.additionalNames || row.donor.additionalNames;

  return (
    <main className="min-h-dvh bg-paper px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500">Official donation receipt · save as PDF from the print dialog</p>
        <PrintPdfButton />
      </div>
      <FormalReceipt
        data={{
          org: {
            name: settings.org_name || "Al Sadiq Trust",
            tagline: settings.org_tagline,
            address: settings.org_address,
            phone: settings.org_phone,
            footer: settings.receipt_footer,
            logo: settings.org_logo,
          },
          receiptNo: row.d.receiptNo,
          receivedAt: row.d.receivedAt,
          donorName: row.donor.fullName,
          donorCode: row.donor.donorCode,
          mobile: row.donor.mobile,
          email: row.donor.email,
          additionalNames: extra,
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
    </main>
  );
}
