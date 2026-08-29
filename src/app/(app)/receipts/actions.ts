"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donations, notes } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { money } from "@/lib/format";

export type VoidState = { error?: string; ok?: boolean };

/**
 * Receipts are never deleted. Voiding keeps the row, marks it, and records who
 * did it and why — that is what an auditor needs to see.
 */
export async function voidReceipt(_prev: VoidState, formData: FormData): Promise<VoidState> {
  const user = await assertPermission("collection.void");

  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!id) return { error: "Receipt not found." };
  if (reason.length < 5) {
    return { error: "Write a short reason. It goes into the audit trail." };
  }

  const [before] = await db.select().from(donations).where(eq(donations.id, id)).limit(1);
  if (!before) return { error: "Receipt not found." };
  if (before.status === "void") return { error: "This receipt is already void." };

  const [after] = await db
    .update(donations)
    .set({
      status: "void",
      voidedById: user.id,
      voidReason: reason,
      voidedAt: new Date(),
    })
    .where(eq(donations.id, id))
    .returning();

  await logAction({
    actor: user,
    action: "void",
    entityType: "donation",
    entityId: id,
    summary: `Voided receipt ${before.receiptNo} (Rs ${money(before.amount)}) — ${reason}`,
    before,
    after,
  });

  revalidatePath(`/receipts/${id}`);
  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Mark a cheque or transfer as cleared once the bank confirms it. */
export async function markCleared(formData: FormData) {
  const user = await assertPermission("collection.void");
  const id = Number(formData.get("id"));

  const [before] = await db.select().from(donations).where(eq(donations.id, id)).limit(1);
  if (!before || before.status !== "pending") return;

  const [after] = await db
    .update(donations)
    .set({ status: "completed" })
    .where(eq(donations.id, id))
    .returning();

  await logAction({
    actor: user,
    action: "update",
    entityType: "donation",
    entityId: id,
    summary: `Marked receipt ${before.receiptNo} as cleared`,
    before,
    after,
  });

  revalidatePath(`/receipts/${id}`);
  revalidatePath("/receipts");
  revalidatePath("/dashboard");
}

/** The "chatter" the brief asks for: a thread of notes on each record. */
export async function addNote(formData: FormData) {
  const user = await assertPermission("collection.view");
  const entityType = String(formData.get("entityType") ?? "");
  const entityId = Number(formData.get("entityId"));
  const body = String(formData.get("body") ?? "").trim();

  if (!body || !entityId || !["donation", "donor"].includes(entityType)) return;

  await db.insert(notes).values({ entityType, entityId, body, authorId: user.id });

  await logAction({
    actor: user,
    action: "note",
    entityType,
    entityId,
    summary: `Added a note: ${body.slice(0, 80)}`,
  });

  revalidatePath(entityType === "donation" ? `/receipts/${entityId}` : `/donors/${entityId}`);
}
