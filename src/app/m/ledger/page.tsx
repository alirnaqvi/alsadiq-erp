import Link from "next/link";
import { requireDonor } from "@/lib/donor-auth";
import { donorHistory } from "../actions";
import { money, longDate } from "@/lib/format";
import { appOrigin } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function DonorLedgerAppPage() {
  const donor = await requireDonor();
  const rows = await donorHistory(donor.id);
  const origin = await appOrigin();
  let running = 0;
  const chronological = [...rows].reverse().map((r) => {
    running += Number(r.amount);
    return { ...r, balance: running };
  });
  const display = [...chronological].reverse();

  return (
    <>
      <h1 className="text-xl font-semibold text-ink-900">Your ledger</h1>
      <p className="mt-1 text-sm text-ink-500">
        Monthly and past donations. Running total Rs {money(running)}.
      </p>
      <ul className="mt-5 space-y-2">
        {display.map((r) => (
          <li key={r.id} className="rounded-md border border-ink-100 bg-white px-3 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{r.headName}</p>
                <p className="text-xs text-ink-500">
                  {longDate(r.receivedAt)} · {r.receiptNo}
                  {r.status === "pending" ? " · awaiting confirmation" : ""}
                </p>
                {r.shareToken && (
                  <Link
                    href={`${origin}/r/${r.shareToken}`}
                    className="mt-1 inline-block text-xs text-sabz-700 underline underline-offset-4"
                  >
                    Open PDF receipt
                  </Link>
                )}
              </div>
              <div className="text-right">
                <p className="tnum font-semibold">Rs {money(r.amount)}</p>
                <p className="tnum text-xs text-ink-500">Bal {money(r.balance)}</p>
              </div>
            </div>
          </li>
        ))}
        {display.length === 0 && <p className="text-sm text-ink-500">No donations recorded yet.</p>}
      </ul>
    </>
  );
}
