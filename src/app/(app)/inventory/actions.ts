"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, inventoryMoves } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { nextItemCode } from "@/lib/sequence";

export type InvState = { error?: string; ok?: string };

export async function saveItem(_prev: InvState, formData: FormData): Promise<InvState> {
  const user = await assertPermission("inventory.manage");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter the item name." };
  const opening = String(formData.get("qty") ?? "0");
  const [created] = await db
    .insert(inventoryItems)
    .values({
      itemCode: await nextItemCode(),
      name,
      unit: String(formData.get("unit") ?? "pcs").trim() || "pcs",
      location: String(formData.get("location") ?? "").trim() || null,
      minQty: String(formData.get("minQty") ?? "0") || "0",
      qtyOnHand: opening || "0",
      notes: String(formData.get("notes") ?? "").trim() || null,
      createdById: user.id,
    })
    .returning();
  if (Number(opening) !== 0) {
    await db.insert(inventoryMoves).values({
      itemId: created.id,
      kind: "in",
      qty: opening,
      reason: "Opening stock",
      createdById: user.id,
    });
  }
  await logAction({
    actor: user,
    action: "create",
    entityType: "inventory",
    entityId: created.id,
    summary: `Added inventory item ${created.itemCode} — ${created.name}`,
  });
  revalidatePath("/inventory");
  return { ok: "Item added." };
}

export async function moveStock(_prev: InvState, formData: FormData): Promise<InvState> {
  const user = await assertPermission("inventory.manage");
  const itemId = Number(formData.get("itemId"));
  const kind = String(formData.get("kind") ?? "out") as "in" | "out" | "adjust";
  const qty = Number(formData.get("qty"));
  if (!itemId || !Number.isFinite(qty) || qty <= 0) return { error: "Enter a quantity." };

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId)).limit(1);
  if (!item) return { error: "That item no longer exists." };

  const current = Number(item.qtyOnHand);
  const next = kind === "in" ? current + qty : kind === "out" ? current - qty : qty;
  if (next < 0) return { error: `Only ${current} ${item.unit} on hand.` };

  await db.insert(inventoryMoves).values({
    itemId,
    kind,
    qty: String(qty),
    reason: String(formData.get("reason") ?? "").trim() || null,
    ref: String(formData.get("ref") ?? "").trim() || null,
    createdById: user.id,
  });
  await db.update(inventoryItems).set({ qtyOnHand: String(next) }).where(eq(inventoryItems.id, itemId));
  await logAction({
    actor: user,
    action: "update",
    entityType: "inventory",
    entityId: itemId,
    summary: `${kind} ${qty} ${item.unit} of ${item.name} (now ${next})`,
  });
  revalidatePath("/inventory");
  return { ok: "Stock updated." };
}
