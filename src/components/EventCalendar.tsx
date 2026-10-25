"use client";

import { useMemo, useState } from "react";
import { hijri, hijriYmd, ymd } from "@/lib/format";
import { cx } from "@/components/ui";

export type CalEvent = {
  id: number;
  title: string;
  titleUr?: string | null;
  gregorianDate: string;
  kind: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pkParts(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00+05:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Karachi",
  }).format(d);
  return { weekday, date: d };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export default function EventCalendar({
  events,
  onSelectDate,
}: {
  events: CalEvent[];
  onSelectDate?: (iso: string) => void;
}) {
  const today = ymd();
  const [y, tMonth] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ y, m: tMonth });

  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const key = e.gregorianDate.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const dim = daysInMonth(cursor.y, cursor.m);
    const firstIso = `${cursor.y}-${pad(cursor.m)}-01`;
    const firstWeekday = WEEKDAYS.indexOf(pkParts(firstIso).weekday);
    const lead = firstWeekday === -1 ? 0 : firstWeekday;
    const out: ({ iso: string; day: number; hijriDay: number } | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let day = 1; day <= dim; day++) {
      const iso = `${cursor.y}-${pad(cursor.m)}-${pad(day)}`;
      out.push({ iso, day, hijriDay: hijriYmd(iso).day });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(cursor.y, cursor.m - 1, 1)));

  const hijriLabel = (() => {
    const start = hijri(`${cursor.y}-${pad(cursor.m)}-01`);
    const end = hijri(`${cursor.y}-${pad(cursor.m)}-${pad(daysInMonth(cursor.y, cursor.m))}`);
    if (!start || !end) return "";
    return start === end ? start : `${start} — ${end}`;
  })();

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.y, c.m - 1 + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary"
        >
          ‹
        </button>
        <div className="min-w-0 text-center">
          <p className="font-display text-xl font-bold text-primary">{monthLabel}</p>
          {hijriLabel && <p className="mt-0.5 truncate text-xs text-gold">{hijriLabel}</p>}
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          className="rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-muted py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`e-${i}`} className="min-h-16 bg-card sm:min-h-20" />;
          }
          const list = byDate.get(cell.iso) ?? [];
          const isToday = cell.iso === today;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate?.(cell.iso)}
              className={cx(
                "min-h-16 bg-card px-1 py-1.5 text-start sm:min-h-20",
                isToday && "ring-1 ring-inset ring-gold",
                list.length > 0 && "bg-primary/5",
              )}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className={cx("tnum text-sm font-semibold", isToday ? "text-gold" : "text-foreground")}>
                  {cell.day}
                </span>
                <span className="tnum text-[10px] text-muted-foreground">{cell.hijriDay}</span>
              </span>
              <span className="mt-1 hidden space-y-0.5 sm:block">
                {list.slice(0, 2).map((e) => (
                  <span key={e.id} className="block truncate text-[10px] leading-tight text-primary">
                    {e.title}
                  </span>
                ))}
                {list.length > 2 && (
                  <span className="block text-[10px] text-muted-foreground">+{list.length - 2}</span>
                )}
              </span>
              {list.length > 0 && (
                <span className="mt-1 flex justify-center gap-0.5 sm:hidden">
                  {list.slice(0, 3).map((e) => (
                    <span key={e.id} className="size-1.5 rounded-full bg-gold" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
