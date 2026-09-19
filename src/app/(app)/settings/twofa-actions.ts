"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/totp";
import { logAction } from "@/lib/audit";

export type TwoFaState = {
  error?: string;
  ok?: string;
  secret?: string;
  uri?: string;
};

export async function beginTotpSetup(): Promise<TwoFaState> {
  const me = await requireUser();
  const secret = generateTotpSecret();
  await db.update(users).set({ totpSecret: secret, totpEnabled: false }).where(eq(users.id, me.id));
  return {
    secret,
    uri: totpUri(secret, me.username),
  };
}

export async function confirmTotpSetup(_prev: TwoFaState, formData: FormData): Promise<TwoFaState> {
  const me = await requireUser();
  const code = String(formData.get("code") ?? "");
  const [row] = await db
    .select({ totpSecret: users.totpSecret })
    .from(users)
    .where(eq(users.id, me.id))
    .limit(1);
  if (!row?.totpSecret) return { error: "Start setup again." };
  if (!verifyTotp(row.totpSecret, code)) {
    return { error: "That code is not valid. Try the next one.", secret: row.totpSecret, uri: totpUri(row.totpSecret, me.username) };
  }
  await db.update(users).set({ totpEnabled: true }).where(eq(users.id, me.id));
  await logAction({
    actor: me,
    action: "update",
    entityType: "user",
    entityId: me.id,
    summary: `${me.fullName} enabled two-factor authentication`,
  });
  revalidatePath("/settings");
  return { ok: "Two-factor authentication is now required when you sign in." };
}

export async function disableTotp(_prev: TwoFaState, formData: FormData): Promise<TwoFaState> {
  const me = await requireUser();
  const code = String(formData.get("code") ?? "");
  const [row] = await db
    .select({ totpSecret: users.totpSecret, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, me.id))
    .limit(1);
  if (!row?.totpEnabled || !row.totpSecret) return { error: "2FA is not enabled." };
  if (!verifyTotp(row.totpSecret, code)) return { error: "Enter a valid authenticator code to turn 2FA off." };
  await db.update(users).set({ totpEnabled: false, totpSecret: null }).where(eq(users.id, me.id));
  await logAction({
    actor: me,
    action: "update",
    entityType: "user",
    entityId: me.id,
    summary: `${me.fullName} disabled two-factor authentication`,
  });
  revalidatePath("/settings");
  return { ok: "Two-factor authentication has been turned off." };
}
