"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export type SettingsState = { ok?: string; error?: string };

const KEYS = [
  "org_name",
  "org_tagline",
  "org_address",
  "org_phone",
  "receipt_footer",
] as const;

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await assertPermission("settings.manage");

  const name = String(formData.get("org_name") ?? "").trim();
  if (name.length < 2) return { error: "The trust needs a name — it prints on every receipt." };

  for (const key of KEYS) {
    const value = String(formData.get(key) ?? "").trim();
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  await logAction({
    actor: user,
    action: "update",
    entityType: "settings",
    summary: "Updated the trust details shown on receipts",
  });

  revalidatePath("/settings");
  revalidatePath("/collect");
  return { ok: "Saved. New receipts will use these details." };
}
