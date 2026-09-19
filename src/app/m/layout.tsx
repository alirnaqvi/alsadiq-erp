import Link from "next/link";
import { getSettings } from "@/lib/queries";
import { getDonorSession } from "@/lib/donor-auth";
import { donorLogout } from "./actions";

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const donor = await getDonorSession();
  const name = settings.org_name || "Al Sadiq Trust";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-paper sm:max-w-xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-950 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-brass-600">
            {name}
          </p>
          <p className="truncate text-sm font-medium">{donor ? donor.fullName : "Donor app"}</p>
        </div>
        {donor ? (
          <form action={donorLogout} className="shrink-0">
            <button type="submit" className="text-xs text-ink-300 underline underline-offset-4">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/join" className="shrink-0 text-xs text-ink-300 underline underline-offset-4">
            Register
          </Link>
        )}
      </header>
      <main className={`px-4 py-6 ${donor ? "pb-24" : ""}`}>{children}</main>
      {donor && (
        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-lg grid-cols-3 border-t border-ink-100 bg-white pb-[env(safe-area-inset-bottom)] text-center text-xs sm:max-w-xl">
          <Link href="/m/home" className="px-2 py-3 text-ink-800">
            Home
          </Link>
          <Link href="/m/pay" className="px-2 py-3 font-medium text-sabz-700">
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
