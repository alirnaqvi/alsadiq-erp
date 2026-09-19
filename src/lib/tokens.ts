import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donations } from "@/db/schema";

export function randomToken(bytes = 16) {
  return randomBytes(bytes).toString("hex");
}

export async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function ensureShareToken(donationId: number): Promise<string> {
  const [row] = await db
    .select({ shareToken: donations.shareToken })
    .from(donations)
    .where(eq(donations.id, donationId))
    .limit(1);
  if (row?.shareToken) return row.shareToken;
  const token = randomToken();
  await db.update(donations).set({ shareToken: token }).where(eq(donations.id, donationId));
  return token;
}
