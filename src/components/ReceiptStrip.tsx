import { amountInWords, hijri, longDate, money, PAYMENT_LABELS, timeOnly } from "@/lib/format";

export type ReceiptData = {
  org: { name: string; tagline?: string; address?: string; phone?: string; footer?: string; logo?: string };
  receiptNo: string;
  receivedAt: Date | string;
  donorName: string;
  donorCode: string;
  mobile: string;
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
  additionalNames?: string | null;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 leading-relaxed">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="text-right break-words">{value}</span>
    </div>
  );
}

/**
 * Rendered at roughly 80mm so what the operator sees on screen is what comes
 * out of the thermal printer. Monospace throughout, because that is what these
 * printers actually produce.
 */
export default function ReceiptStrip({ data }: { data: ReceiptData }) {
  const when = typeof data.receivedAt === "string" ? new Date(data.receivedAt) : data.receivedAt;
  const voided = data.status === "void";

  return (
    <div
      className="receipt-strip code relative mx-auto w-full max-w-[320px] bg-white px-5 py-6 text-[12px] leading-snug text-ink-900 shadow-[0_1px_3px_rgba(11,16,19,0.10)]"
      style={{
        // torn edge along the bottom, the way a roll tears off
        clipPath:
          "polygon(0 0, 100% 0, 100% calc(100% - 6px), 96% 100%, 92% calc(100% - 6px), 88% 100%, 84% calc(100% - 6px), 80% 100%, 76% calc(100% - 6px), 72% 100%, 68% calc(100% - 6px), 64% 100%, 60% calc(100% - 6px), 56% 100%, 52% calc(100% - 6px), 48% 100%, 44% calc(100% - 6px), 40% 100%, 36% calc(100% - 6px), 32% 100%, 28% calc(100% - 6px), 24% 100%, 20% calc(100% - 6px), 16% 100%, 12% calc(100% - 6px), 8% 100%, 4% calc(100% - 6px), 0 100%)",
      }}
    >
      {voided && (
        <p className="mb-2 border border-alert-700 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-alert-700">
          Voided
        </p>
      )}

      <header className="text-center">
        {data.org.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.org.logo}
            alt=""
            className="mx-auto mb-2 h-14 w-14 object-contain print:h-12 print:w-12"
          />
        )}
        <h3 className="text-[15px] font-bold uppercase tracking-wide">{data.org.name}</h3>
        {data.org.tagline && <p className="text-[10px] text-ink-500">{data.org.tagline}</p>}
        {data.org.address && <p className="text-[10px] text-ink-500">{data.org.address}</p>}
        {data.org.phone && <p className="text-[10px] text-ink-500">{data.org.phone}</p>}
      </header>

      <p className="my-3 border-y border-dashed border-ink-300 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">
        Donation Receipt
      </p>

      <div className="space-y-0.5">
        <Row label="Receipt" value={<span className="font-bold">{data.receiptNo}</span>} />
        <Row label="Date" value={longDate(when)} />
        <Row label="Hijri" value={hijri(when)} />
        <Row label="Time" value={timeOnly(when)} />
      </div>

      <div className="my-3 border-t border-dashed border-ink-300 pt-2 space-y-0.5">
        <Row label="Donor" value={data.donorName} />
        {data.additionalNames && <Row label="Also" value={data.additionalNames} />}
        <Row label="ID" value={data.donorCode} />
        <Row label="Mobile" value={data.mobile} />
      </div>

      <div className="border-t border-dashed border-ink-300 pt-2 space-y-0.5">
        <Row
          label="Head"
          value={
            <>
              {data.parentName ? `${data.parentName} / ` : ""}
              {data.headName}
            </>
          }
        />
        <Row label="Method" value={PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod} />
        {data.chequeNo && <Row label="Cheque" value={data.chequeNo} />}
        {data.slipRef && <Row label="Ref" value={data.slipRef} />}
        {data.bankName && <Row label="Bank" value={data.bankName} />}
        {data.remarks && <Row label="Note" value={data.remarks} />}
      </div>

      <div className="my-3 border-y border-ink-900 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-ink-500">Amount</span>
          <span className="tnum text-[20px] font-bold">Rs {money(data.amount)}</span>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-ink-500">
          Rupees {amountInWords(data.amount)} only
        </p>
      </div>

      {data.status === "pending" && (
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-brass-600">
          Subject to clearance
        </p>
      )}

      <div className="space-y-0.5">
        <Row label="Received by" value={data.collector} />
      </div>

      {data.org.footer && (
        <p className="mt-4 border-t border-dashed border-ink-300 pt-3 text-center text-[10px] leading-relaxed text-ink-500">
          {data.org.footer}
        </p>
      )}

      <p className="mt-3 text-center text-[9px] uppercase tracking-[0.14em] text-ink-300">
        Computer generated receipt
      </p>
    </div>
  );
}
