"use server";

import { redirect } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { donors, donations, heads, users, roles } from "@/db/schema";
import {
  createDonorSession,
  destroyDonorSession,
  requireDonor,
} from "@/lib/donor-auth";
import { verifyPassword } from "@/lib/auth";
import { isValidMobile, normaliseMobile } from "@/lib/format";
import { nextReceiptNo, newShareToken } from "@/lib/sequence";
import { logAction } from "@/lib/audit";
import { selectableHeads } from "@/lib/queries";
import { revalidatePath } from "next/cache";

export type DonorLoginState = { error?: string };

export async function donorLogin(_prev: DonorLoginState, formData: FormData): Promise<DonorLoginState> {
  const mobile = normaliseMobile(String(formData.get("mobile") ?? ""));
  const pin = String(formData.get("pin") ?? "");
  if (!isValidMobile(mobile) || !pin) return { error: "Enter your mobile number and PIN." };

  const [donor] = await db.select().from(donors).where(eq(donors.mobile, mobile)).limit(1);
  if (!donor?.appPinHash || !(await verifyPassword(pin, donor.appPinHash))) {
    return { error: "That number and PIN do not match, or your request is still being reviewed." };
  }
  if (!donor.isActive) return { error: "This donor record is not active. Contact the trust." };

  await createDonorSession(donor.id);
  redirect("/m/home");
}

export async function donorLogout() {
  await destroyDonorSession();
  redirect("/m/login");
}

export type PayState = { error?: string; ok?: string };

export async function submitDonorPayment(_prev: PayState, formData: FormData): Promise<PayState> {
  const donor = await requireDonor();
  const headId = Number(formData.get("headId"));
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("paymentMethod") ?? "bank_transfer");
  const slipRef = "";
  const bankName = "";
  const slipUrl = String(formData.get("slipUrl") ?? "").trim();
  const additionalNames = String(formData.get("additionalNames") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();

  if (!headId) return { error: "Choose a collection head." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than zero." };
  if (method !== "cash" && !slipUrl) {
    return { error: "Please attach a photo of the transfer so accounts can confirm it." };
  }

  const [head] = await db.select().from(heads).where(eq(heads.id, headId)).limit(1);
  if (!head) return { error: "That collection head is no longer available." };

  const collectorId = await systemCollectorId();
  const [saved] = await db
    .insert(donations)
    .values({
      receiptNo: await nextReceiptNo(),
      donorId: donor.id,
      headId,
      amount: amount.toFixed(2),
      paymentMethod: method === "cheque" ? "cheque" : method === "cash" ? "cash" : "bank_transfer",
      status: "pending",
      chequeNo: method === "cheque" ? slipRef || null : null,
      bankName: bankName || null,
      slipRef: slipRef || null,
      slipUrl: slipUrl || null,
      remarks: remarks || "Submitted from donor app",
      additionalNames: additionalNames || donor.additionalNames,
      source: "donor_app",
      shareToken: newShareToken(),
      collectedById: collectorId,
      receivedAt: new Date(),
    })
    .returning();

  await logAction({
    actor: { id: collectorId, fullName: donor.fullName },
    action: "create",
    entityType: "donation",
    entityId: saved.id,
    summary: `Donor-app payment ${saved.receiptNo} from ${donor.fullName} — pending proof review`,
    after: saved,
  });

  revalidatePath("/m/home");
  revalidatePath("/m/ledger");
  revalidatePath("/receipts");
  return { ok: `Payment submitted as ${saved.receiptNo}. The trust will confirm it after reviewing the proof.` };
}

export async function donorHeads() {
  return selectableHeads();
}

async function systemCollectorId() {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(roles.key, "admin"))
    .limit(1);
  if (row) return row.id;
  const [any] = await db.select({ id: users.id }).from(users).limit(1);
  if (!any) throw new Error("No staff user exists to own donor-app receipts.");
  return any.id;
}

export async function donorHistory(donorId: number) {
  return db
    .select({
      id: donations.id,
      receiptNo: donations.receiptNo,
      amount: donations.amount,
      status: donations.status,
      receivedAt: donations.receivedAt,
      headName: heads.name,
      shareToken: donations.shareToken,
      additionalNames: donations.additionalNames,
    })
    .from(donations)
    .innerJoin(heads, eq(donations.headId, heads.id))
    .where(and(eq(donations.donorId, donorId), ne(donations.status, "void")))
    .orderBy(desc(donations.receivedAt));
}
