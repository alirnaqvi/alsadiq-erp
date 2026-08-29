import "server-only";
import { headers } from "next/headers";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionUser } from "./auth";

type LogInput = {
  actor: SessionUser | { id: number; fullName: string } | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  summary: string;
  before?: unknown;
  after?: unknown;
};

/**
 * Nothing in this system is deleted quietly. Every create, edit and void writes
 * a row here with who did it, from where, and what changed.
 */
export async function logAction(input: LogInput) {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    userAgent = h.get("user-agent");
  } catch {
    /* called outside a request (seed script) */
  }

  await db.insert(auditLogs).values({
    actorId: input.actor?.id ?? null,
    actorName: input.actor?.fullName ?? "system",
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    before: (input.before ?? null) as object | null,
    after: (input.after ?? null) as object | null,
    ip,
    userAgent,
  });
}
