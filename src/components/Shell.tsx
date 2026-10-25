"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { useLocale, useT } from "./LocaleProvider";
import { cx } from "./ui";

export type NavItem = { href: string; label: string; group: string };

export default function Shell({
  items,
  user,
  hijriToday,
  children,
  onSignOut,
  logo,
  orgName,
}: {
  items: NavItem[];
  user: { fullName: string; roleName: string; postedAt?: string | null };
  hijriToday: string;
  children: React.ReactNode;
  onSignOut: React.ReactNode;
  logo?: string;
  orgName?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useT();
  const locale = useLocale();
  const ur = locale === "ur";
  const brand = orgName || "Al Sadiq Trust";
  const mark = logo || "/logo.png";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const groups = [...new Set(items.map((i) => i.group))];

  const nav = (
    <nav className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group}>
          <p
            className={cx(
              "px-3 pb-1.5 font-semibold text-primary-foreground/55",
              ur ? "text-xs tracking-normal" : "text-[10px] uppercase tracking-[0.14em]",
            )}
          >
            {group}
          </p>
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === group)
              .map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "block rounded-lg px-3 py-2.5 font-medium transition-colors duration-200 lg:py-2",
                        ur ? "text-[1.05rem] leading-7" : "text-sm",
                        active
                          ? "bg-white/10 text-gold"
                          : "text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-primary-foreground/15 bg-primary-deep px-4 py-3 text-primary-foreground lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} alt="" className="h-9 w-9 rounded-full bg-primary-foreground object-contain p-0.5" />
          <span className="truncate font-display text-base font-bold tracking-tight">{brand}</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="app-sidebar"
          aria-label={open ? t("common.close") : t("common.menu")}
          className="min-h-11 shrink-0 rounded-lg border border-primary-foreground/20 px-3 py-1.5 text-sm"
        >
          {open ? t("common.close") : t("common.menu")}
        </button>
      </header>

      {open && (
        <button
          type="button"
          aria-label={t("common.close")}
          className="no-print fixed inset-x-0 bottom-0 top-14 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={cx(
          "no-print flex flex-col bg-primary-deep text-primary-foreground",
          "fixed bottom-0 start-0 z-50 w-[min(16.25rem,88vw)] top-14",
          "transition-transform duration-200 ease-out",
          "lg:sticky lg:top-0 lg:bottom-auto lg:start-auto lg:z-auto lg:h-dvh lg:w-[260px] lg:max-w-none lg:shrink-0 lg:translate-x-0",
          open
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0 rtl:lg:translate-x-0",
        )}
      >
        <div className="hidden shrink-0 px-6 pt-7 lg:block">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} alt="" className="h-11 w-11 rounded-full bg-primary-foreground object-contain p-0.5" />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold leading-tight text-primary-foreground">
                {brand}
              </p>
              <p className="urdu mt-1 w-fit leading-none text-gold">{t("trust.urduName")}</p>
            </div>
          </div>
          <p className="tnum mt-3 text-xs text-primary-foreground/55">{hijriToday}</p>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4 lg:px-4 lg:pt-6">{nav}</div>

        <div className="shrink-0 border-t border-primary-foreground/15 px-5 py-4">
          <LanguageToggle tone="dark" />
          <p className="mt-3 text-sm font-medium text-primary-foreground">{user.fullName}</p>
          <p className="text-xs text-primary-foreground/70">
            {user.roleName}
            {user.postedAt ? ` · ${user.postedAt}` : ""}
          </p>
          <div className="mt-3">{onSignOut}</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
