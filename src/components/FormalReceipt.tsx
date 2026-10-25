import { amountInWords, hijri, longDate, money, PAYMENT_LABELS, timeOnly } from "@/lib/format";

export type FormalReceiptData = {
  org: { name: string; tagline?: string; address?: string; phone?: string; footer?: string; logo?: string };
  receiptNo: string;
  receivedAt: Date | string;
  donorName: string;
  donorCode: string;
  mobile: string;
  email?: string | null;
  additionalNames?: string | null;
  headName: string;
  parentName?: string | null;
  amount: string | number;
  paymentMethod: string;
  chequeNo?: string | null;
  slipRef?: string | null;
  bankName?: string | null;
  collector: string;
  status?: string;
  remarks?: string | null;
};

/**
 * A4 letterhead receipt for WhatsApp / PDF. The thermal strip is a separate
 * component and is what the counter still prints.
 */
export default function FormalReceipt({ data }: { data: FormalReceiptData }) {
  const when = typeof data.receivedAt === "string" ? new Date(data.receivedAt) : data.receivedAt;
  const extras = (data.additionalNames || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const voided = data.status === "void";
  const head = data.parentName ? `${data.parentName} / ${data.headName}` : data.headName;

  return (
    <article className="formal-receipt mx-auto w-full max-w-[210mm] bg-white text-ink-900">
      <div className="border-2 border-ink-900">
        <header className="flex flex-col gap-4 border-b-2 border-ink-900 bg-primary-deep px-4 py-4 text-primary-foreground sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            {data.org.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.org.logo} alt="" className="h-12 w-12 rounded-full bg-primary-foreground object-contain p-1 sm:h-16 sm:w-16" />
            )}
            <div className="min-w-0">
              <p className="eyebrow">Official donation receipt</p>
              <h1 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">{data.org.name}</h1>
              <p className="urdu mt-1 text-sm text-gold">الصادق ٹرسٹ</p>
              {data.org.tagline && <p className="mt-1 text-sm text-primary-foreground/80">{data.org.tagline}</p>}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70">Receipt no.</p>
            <p className="tnum mt-1 text-lg font-bold sm:text-xl">{data.receiptNo}</p>
          </div>
        </header>

        {voided && (
          <p className="bg-alert-100 py-2 text-center text-sm font-bold uppercase tracking-widest text-alert-700">
            This receipt has been voided
          </p>
        )}

        <div className="grid grid-cols-2 gap-px bg-ink-100 text-sm">
          <Cell label="Date (Gregorian)" value={longDate(when)} />
          <Cell label="Date (Hijri)" value={hijri(when)} />
          <Cell label="Time" value={timeOnly(when)} />
          <Cell label="Collected by" value={data.collector} />
        </div>

        <section className="px-4 py-4 sm:px-8 sm:py-5">
          <p className="eyebrow">Received from</p>
          <p className="mt-1 text-lg font-semibold">{data.donorName}</p>
          {extras.length > 0 && (
            <p className="mt-1 text-sm text-ink-700">
              Additional name{extras.length > 1 ? "s" : ""} on this receipt:{" "}
              <span className="font-medium">{extras.join(", ")}</span>
            </p>
          )}
          <p className="code mt-1 text-sm text-ink-500">
            {data.donorCode} · {data.mobile}
            {data.email ? ` · ${data.email}` : ""}
          </p>
        </section>

        <section className="mx-4 mb-5 overflow-x-auto rounded-md border border-ink-200 sm:mx-8 sm:mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100 text-left text-[11px] uppercase tracking-wider text-ink-500">
                <th className="px-4 py-2 font-semibold">Collection head</th>
                <th className="px-4 py-2 font-semibold">Method</th>
                <th className="px-4 py-2 text-right font-semibold">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3">{head}</td>
                <td className="px-4 py-3">
                  {PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}
                  {data.chequeNo ? ` · Chq ${data.chequeNo}` : ""}
                  {data.slipRef ? ` · ${data.slipRef}` : ""}
                  {data.bankName ? ` · ${data.bankName}` : ""}
                </td>
                <td className="tnum px-4 py-3 text-right text-lg font-semibold">
                  {money(data.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mx-4 mb-5 rounded-md border border-ink-900 px-4 py-4 sm:mx-8 sm:mb-6 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="eyebrow">Amount in words</p>
              <p className="mt-1 text-sm font-medium">Rupees {amountInWords(data.amount)} only</p>
            </div>
            <div className="text-right">
              <p className="eyebrow">Total received</p>
              <p className="tnum mt-1 text-2xl font-bold">Rs {money(data.amount)}</p>
            </div>
          </div>
          {data.status === "pending" && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-brass-600">
              Subject to bank clearance
            </p>
          )}
          {data.remarks && <p className="mt-3 text-sm text-ink-700">Note: {data.remarks}</p>}
        </section>

        <footer className="border-t border-ink-200 px-4 py-4 text-xs leading-relaxed text-ink-500 sm:px-8 sm:py-5">
          {data.org.address && <p>{data.org.address}</p>}
          {data.org.phone && <p>Phone: {data.org.phone}</p>}
          {data.org.footer && <p className="mt-2">{data.org.footer}</p>}
          <p className="mt-3 uppercase tracking-[0.14em] text-ink-300">
            Computer generated · no signature required
          </p>
        </footer>
      </div>
    </article>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3 sm:px-8">
      <p className="eyebrow">{label}</p>
      <p className="mt-0.5 font-medium text-ink-900">{value}</p>
    </div>
  );
}
