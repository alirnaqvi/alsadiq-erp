import "server-only";
import { eq, inArray, asc, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users, heads, settings, donations } from "@/db/schema";
import type { SessionUser } from "./auth";

/** Every user id that reports to this user, directly or further down. */
export async function teamIds(userId: number): Promise<number[]> {
  const rows = await db.select({ id: users.id, managerId: users.managerId }).from(users);
  const collected = new Set<number>([userId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (r.managerId && collected.has(r.managerId) && !collected.has(r.id)) {
        collected.add(r.id);
        grew = true;
      }
    }
  }
  return [...collected];
}

/**
 * Turns a role's data scope into a WHERE clause. Returns undefined when the
 * user may see everything.
 */
export async function scopeCondition(user: SessionUser): Promise<SQL | undefined> {
  if (user.dataScope === "all") return undefined;
  if (user.dataScope === "team") {
    const ids = await teamIds(user.id);
    return inArray(donations.collectedById, ids);
  }
  return eq(donations.collectedById, user.id);
}

export type HeadOption = {
  id: number;
  code: string;
  name: string;
  parentName: string | null;
  isEvent: boolean;
};

/** Selectable heads = the leaves. A parent with children is a grouping only. */
export async function selectableHeads(): Promise<HeadOption[]> {
  const rows = await db.select().from(heads).orderBy(asc(heads.sortOrder), asc(heads.name));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const hasChildren = new Set(rows.map((r) => r.parentId).filter(Boolean) as number[]);

  return rows
    .filter((r) => r.isActive && !hasChildren.has(r.id))
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      parentName: r.parentId ? (byId.get(r.parentId)?.name ?? null) : null,
      isEvent: r.isEvent,
    }));
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

/** Start of today / this month in Pakistan time, as UTC instants. */
export function pkDayBounds(dateStr?: string) {
  const base = dateStr ? new Date(`${dateStr}T00:00:00+05:00`) : startOfPkToday();
  const end = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  return { start: base, end };
}

export function startOfPkToday() {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(now);
  return new Date(`${ymd}T00:00:00+05:00`);
}

export function pkMonthBounds(month?: string) {
  const m =
    month ??
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" })
      .format(new Date())
      .slice(0, 7);
  const start = new Date(`${m}-01T00:00:00+05:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end, month: m };
}

export const sumAmount = sql<string>`coalesce(sum(${donations.amount}), 0)`;
