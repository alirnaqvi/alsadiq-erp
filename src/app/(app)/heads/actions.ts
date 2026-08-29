"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { heads, donations } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export type HeadState = { error?: string; ok?: string };

function slug(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export async function saveHead(_prev: HeadState, formData: FormData): Promise<HeadState> {
  const user = await assertPermission("head.manage");

  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const nameUr = String(formData.get("nameUr") ?? "").trim();
  const parentId = Number(formData.get("parentId") ?? 0) || null;
  const isEvent = formData.get("isEvent") === "on";
  const eventDate = String(formData.get("eventDate") ?? "").trim() || null;
  let code = String(formData.get("code") ?? "").trim();

  if (name.length < 2) return { error: "Give the head a name." };
  if (!code) code = slug(name);

  if (id && parentId === id) return { error: "A head cannot sit under itself." };

  try {
    if (id) {
      const [before] = await db.select().from(heads).where(eq(heads.id, id)).limit(1);
      const [after] = await db
        .update(heads)
        .set({ name, nameUr: nameUr || null, parentId, isEvent, eventDate, code })
        .where(eq(heads.id, id))
        .returning();
      await logAction({
        actor: user,
        action: "update",
        entityType: "head",
        entityId: id,
        summary: `Updated collection head "${after.name}"`,
        before,
        after,
      });
    } else {
      const [after] = await db
        .insert(heads)
        .values({ name, nameUr: nameUr || null, parentId, isEvent, eventDate, code })
        .returning();
      await logAction({
        actor: user,
        action: "create",
        entityType: "head",
        entityId: after.id,
        summary: `Added collection head "${after.name}"`,
        after,
      });
    }
  } catch {
    return { error: `The code "${code}" is already used by another head. Pick a different one.` };
  }

  revalidatePath("/heads");
  return { ok: id ? "Head updated." : "Head added." };
}

/**
 * Heads are retired, not deleted — old receipts still point at them. A head
 * with receipts against it can only be switched off.
 */
export async function toggleHead(formData: FormData) {
  const user = await assertPermission("head.manage");
  const id = Number(formData.get("id"));

  const [before] = await db.select().from(heads).where(eq(heads.id, id)).limit(1);
  if (!before) return;

  const [after] = await db
    .update(heads)
    .set({ isActive: !before.isActive })
    .where(eq(heads.id, id))
    .returning();

  await logAction({
    actor: user,
    action: "update",
    entityType: "head",
    entityId: id,
    summary: `${after.isActive ? "Reopened" : "Retired"} collection head "${after.name}"`,
    before,
    after,
  });

  revalidatePath("/heads");
}

export async function headUsage() {
  const rows = await db
    .select({ headId: donations.headId, n: sql<number>`count(*)` })
    .from(donations)
    .groupBy(donations.headId);
  return new Map(rows.map((r) => [r.headId, Number(r.n)]));
}
