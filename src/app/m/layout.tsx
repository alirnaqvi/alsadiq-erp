import Link from "next/link";
import { getSettings } from "@/lib/queries";
import { getDonorSession } from "@/lib/donor-auth";
import { donorLogout } from "./actions";

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const donor = await getDonorSession();
  const name = settings.org_name || "Al Sadiq Trust";

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-ink-950 px-4 py-3 text-white">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brass-600">{name}</p>
          <p className="text-sm font-medium">{donor ? donor.fullName : "Donor app"}</p>
        </div>
        {donor ? (
          <form action={donorLogout}>
            <button type="submit" className="text-xs text-ink-300 underline underline-offset-4">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/join" className="text-xs text-ink-300 underline underline-offset-4">
            Register
          </Link>
        )}
      </header>
      <main className="px-4 py-6">{children}</main>
      {donor && (
        <nav className="sticky bottom-0 grid grid-cols-3 border-t border-ink-100 bg-white text-center text-xs">
          <Link href="/m/home" className="px-2 py-3 text-ink-800">
            Home
          </Link>
          <Link href="/m/pay" className="px-2 py-3 text-sabz-700 font-medium">
            Pay
          </Link>
          <Link href="/m/ledger" className="px-2 py-3 text-ink-800">
            Ledger
          </Link>
        </nav>
      )}
    </div>
  );
}
