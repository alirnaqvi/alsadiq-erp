import { BANK } from "@/lib/trust-facts";

export function BankTransferCard({
  bankName,
  accountTitle,
  accountNumber,
  iban,
}: {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
}) {
  const rows = [
    { label: "Bank", value: bankName || BANK.bankName },
    { label: "Account Title", value: accountTitle || BANK.accountTitle },
    { label: "Account Number", value: accountNumber || BANK.accountNumber },
    { label: "IBAN", value: iban || BANK.iban },
  ];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Bank transfer</p>
        <h2 className="mt-1 font-display text-lg font-bold text-primary">Bank Transfer Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Transfer to this account, then attach a photo of the slip below.
        </p>
      </div>
      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
            <dt className="w-36 shrink-0 text-xs text-muted-foreground">{r.label}</dt>
            <dd className="tnum text-sm font-semibold text-foreground break-all">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
