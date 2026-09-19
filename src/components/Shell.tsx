"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

  const groups = [...new Set(items.map((i) => i.group))];

  const nav = (
    <nav className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
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
                        "block rounded-md px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-white/10 font-medium text-white"
                          : "text-ink-300 hover:bg-white/5 hover:text-white",
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
    <div className="min-h-dvh lg:flex">
      {/* Mobile bar */}
      <header className="no-print flex items-center justify-between border-b border-ink-100 bg-ink-950 px-4 py-3 text-white lg:hidden">
        <span className="text-sm font-semibold tracking-tight">{orgName || "Al Sadiq Trust"}</span>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="rounded border border-white/20 px-3 py-1 text-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      {/* Sidebar: brand + scrolling nav + account stay on the same dark panel. */}
      <aside
        className={cx(
          "no-print flex flex-col bg-ink-950 text-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0",
          open ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="hidden shrink-0 px-7 pt-6 lg:block">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="mb-2 h-9 w-9 object-contain" />
          )}
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-600">
            {orgName || "Al Sadiq Trust"}
          </p>
          <p className="tnum mt-1 text-xs text-ink-500">{hijriToday}</p>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:pt-6">{nav}</div>

        <div className="shrink-0 border-t border-white/10 bg-ink-950 px-7 py-4">
          <p className="text-sm font-medium text-white">{user.fullName}</p>
          <p className="text-xs text-ink-300">
            {user.roleName}
            {user.postedAt ? ` · ${user.postedAt}` : ""}
          </p>
          <div className="mt-3">{onSignOut}</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
