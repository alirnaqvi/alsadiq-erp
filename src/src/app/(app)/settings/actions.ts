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
  "org_logo",
] as const;

// Logo is stored as a base64 data URL directly in the settings table (no
// separate blob storage needed for something this small). Capped well under
// Postgres's per-row limits - 300KB covers any reasonably-sized square logo.
const MAX_LOGO_BYTES = 300_000;

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await assertPermission("settings.manage");

  const name = String(formData.get("org_name") ?? "").trim();
  if (name.length < 2) return { error: "The trust needs a name — it prints on every receipt." };

  const logo = String(formData.get("org_logo") ?? "").trim();
  if (logo) {
    if (!logo.startsWith("data:image/")) {
      return { error: "Logo must be an image file." };
    }
    if (logo.length > MAX_LOGO_BYTES) {
      return { error: "Logo image is too large — please use a smaller file (under ~200KB)." };
    }
  }

  for (const key of KEYS) {
    const value = String(formData.get(key) ?? "").trim();
    // Don't overwrite an already-saved logo when the field is left untouched
    // (the form only sends a new value when the user picks a new file).
    if (key === "org_logo" && !value) continue;
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
