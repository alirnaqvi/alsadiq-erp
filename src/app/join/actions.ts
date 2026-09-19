"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { donorRegistrations, donors } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { isValidMobile, normaliseMobile } from "@/lib/format";

export type JoinState = { error?: string; ok?: string };

export async function submitRegistration(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = normaliseMobile(String(formData.get("mobile") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const cnic = String(formData.get("cnic") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const additionalNames = String(formData.get("additionalNames") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (!isValidMobile(mobile)) return { error: "Enter an 11-digit Pakistani mobile number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email does not look right." };
  if (!/^\d{4,8}$/.test(pin)) return { error: "Choose a 4 to 8 digit PIN for the app." };
  if (pin !== confirm) return { error: "The two PINs do not match." };

  const [pending] = await db
    .select({ id: donorRegistrations.id })
    .from(donorRegistrations)
    .where(and(eq(donorRegistrations.mobile, mobile), eq(donorRegistrations.status, "pending")))
    .limit(1);
  if (pending) {
    return { error: "A request for this number is already waiting for the trust to review." };
  }

  await db.insert(donorRegistrations).values({
    fullName,
    mobile,
    email: email || null,
    cnic: cnic || null,
    city: city || null,
    address: address || null,
    additionalNames: additionalNames || null,
    pinHash: await hashPassword(pin),
  });

  const [existing] = await db.select({ donorCode: donors.donorCode }).from(donors).where(eq(donors.mobile, mobile)).limit(1);

  return {
    ok: existing
      ? "Request sent. Once the trust approves it, you can sign in on this number and see your existing record."
      : "Request sent. The trust will review your details. You can sign in after they approve you.",
  };
}
