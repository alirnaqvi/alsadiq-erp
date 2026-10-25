"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, users } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { nextAssetCode } from "@/lib/sequence";

export type AssetState = { error?: string; ok?: string };

export async function saveAsset(_prev: AssetState, formData: FormData): Promise<AssetState> {
  const user = await assertPermission("asset.manage");
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter the asset name." };

  const inchargeUserId = Number(formData.get("inchargeUserId") ?? 0) || null;
  let inchargeName = String(formData.get("inchargeName") ?? "").trim() || null;
  if (inchargeUserId && !inchargeName) {
    const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, inchargeUserId)).limit(1);
    inchargeName = u?.fullName ?? null;
  }
  const values = {
    name,
    category: String(formData.get("category") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    serialNo: String(formData.get("serialNo") ?? "").trim() || null,
    department: String(formData.get("department") ?? "").trim() || null,
    inchargeName,
    inchargeUserId,
    purchaseDate: String(formData.get("purchaseDate") ?? "").trim() || null,
    purchaseValue: String(formData.get("purchaseValue") ?? "").trim() || null,
    status: String(formData.get("status") ?? "in_use"),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(assets).set(values).where(eq(assets.id, id));
    await logAction({
      actor: user,
      action: "update",
      entityType: "asset",
      entityId: id,
      summary: `Updated asset ${name}`,
    });
  } else {
    const [created] = await db
      .insert(assets)
      .values({ ...values, assetCode: await nextAssetCode(), createdById: user.id })
      .returning();
    await logAction({
      actor: user,
      action: "create",
      entityType: "asset",
      entityId: created.id,
      summary: `Registered asset ${created.assetCode} — ${created.name}`,
    });
  }
  revalidatePath("/assets");
  return { ok: "Saved." };
}
