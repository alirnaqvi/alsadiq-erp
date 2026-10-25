import Link from "next/link";
import { getSettings } from "@/lib/queries";
import { getDonorSession } from "@/lib/donor-auth";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import LanguageToggle from "@/components/LanguageToggle";
import { donorLogout } from "./actions";

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const donor = await getDonorSession();
  const t = tx(await getLocale());
  const name = settings.org_name || "Al Sadiq Trust";

  const links = donor
    ? [
        { href: "/m/home", label: t("common.home") },
        { href: "/m/pay", label: t("common.pay") },
        { href: "/m/calendar", label: t("common.calendar") },
        { href: "/m/ledger", label: t("common.ledger") },
      ]
    : [];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-primary-foreground/15 bg-primary-deep text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.org_logo || "/logo.png"} alt="" className="h-9 w-9 rounded-full bg-primary-foreground object-contain p-0.5" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold sm:text-base">{name}</p>
              <p className="truncate text-xs text-primary-foreground/75">
                {donor ? donor.fullName : t("common.donorApp")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-primary-foreground/85 hover:bg-white/10 hover:text-gold"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <LanguageToggle tone="dark" />
            {donor ? (
              <form action={donorLogout}>
                <button type="submit" className="text-xs text-primary-foreground/75 underline underline-offset-4 hover:text-gold">
                  {t("common.signOut")}
                </button>
              </form>
            ) : (
              <Link href="/join" className="text-xs text-primary-foreground/75 underline underline-offset-4 hover:text-gold">
                {t("common.register")}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 ${donor ? "pb-24 md:pb-10" : ""}`}>
        {children}
      </main>
      {donor && (
        <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-center text-xs md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-2 py-3 ${l.href === "/m/pay" ? "font-semibold text-gold" : "text-foreground"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
