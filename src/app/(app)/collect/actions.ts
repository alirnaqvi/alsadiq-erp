"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq, ne, or, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { donors, donations, heads } from "@/db/schema";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { nextDonorCode, nextReceiptNo } from "@/lib/sequence";
import { normaliseMobile, isValidMobile, money } from "@/lib/format";

export type DonorHit = {
  id: number;
  donorCode: string;
  fullName: string;
  mobile: string;
  city: string | null;
  legacyCode: string | null;
  lastAmount: string | null;
  lastAt: string | null;
  lastHead: string | null;
  totalGiven: string;
};

/** Counter lookup: exact mobile match first, then a loose search. */
export async function lookupDonor(term: string): Promise<{
  exact: DonorHit | null;
  matches: DonorHit[];
}> {
  await assertPermission("donor.view");
  const raw = term.trim();
  if (raw.length < 3) return { exact: null, matches: [] };

  const mobile = normaliseMobile(raw);

  const rows = await db
    .select({
      id: donors.id,
      donorCode: donors.donorCode,
      fullName: donors.fullName,
      mobile: donors.mobile,
      city: donors.city,
      legacyCode: donors.legacyCode,
    })
    .from(donors)
    .where(
      and(
        eq(donors.isActive, true),
        or(
          eq(donors.mobile, mobile),
          ilike(donors.fullName, `%${raw}%`),
          ilike(donors.donorCode, `%${raw}%`),
          ilike(donors.legacyCode, `%${raw}%`),
        ),
      ),
    )
    .limit(8);

  const hits: DonorHit[] = [];
  for (const r of rows) {
    const [last] = await db
      .select({
        amount: donations.amount,
        receivedAt: donations.receivedAt,
        head: heads.name,
      })
      .from(donations)
      .innerJoin(heads, eq(donations.headId, heads.id))
      .where(and(eq(donations.donorId, r.id), ne(donations.status, "void")))
      .orderBy(desc(donations.receivedAt))
      .limit(1);

    const [agg] = await db
      .select({ total: sql<string>`coalesce(sum(${donations.amount}),0)` })
      .from(donations)
      .where(and(eq(donations.donorId, r.id), ne(donations.status, "void")));

    hits.push({
      ...r,
      lastAmount: last?.amount ?? null,
      lastAt: last ? last.receivedAt.toISOString() : null,
      lastHead: last?.head ?? null,
      totalGiven: agg?.total ?? "0",
    });
  }

  return {
    exact: hits.find((h) => h.mobile === mobile) ?? null,
    matches: hits,
  };
}

const schema = z.object({
  donorId: z.string().optional(),
  mobile: z.string(),
  fullName: z.string().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  legacyCode: z.string().optional(),
  headId: z.string().min(1, "Choose a collection head."),
  amount: z.string().min(1, "Enter an amount."),
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "online"]),
  chequeNo: z.string().optional(),
  bankName: z.string().optional(),
  slipRef: z.string().optional(),
  slipUrl: z.string().optional(),
  remarks: z.string().optional(),
  isMembership: z.string().optional(),
});

export type CollectState = { error?: string; fieldErrors?: Record<string, string> };

export async function recordDonation(
  _prev: CollectState,
  formData: FormData,
): Promise<CollectState> {
  const user = await assertPermission("collection.create");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const v = parsed.data;

  const amount = Number(v.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  }
  if (amount > 100_000_000) {
    return { fieldErrors: { amount: "That amount looks wrong. Check it before saving." } };
  }

  const mobile = normaliseMobile(v.mobile);
  let donorId = v.donorId ? Number(v.donorId) : 0;
  let createdDonor = false;

  if (!donorId) {
    if (!isValidMobile(mobile)) {
      return { fieldErrors: { mobile: "Enter an 11-digit mobile number, like 03001234567." } };
    }
    if (!v.fullName?.trim()) {
      return { fieldErrors: { fullName: "This number is new. Enter the donor's name." } };
    }

    // The number is the unique key, so re-check before inserting.
    const [existing] = await db.select().from(donors).where(eq(donors.mobile, mobile)).limit(1);
    if (existing) {
      donorId = existing.id;
    } else {
      const [created] = await db
        .insert(donors)
        .values({
          donorCode: await nextDonorCode(),
          fullName: v.fullName.trim(),
          mobile,
          cnic: v.cnic?.trim() || null,
          address: v.address?.trim() || null,
          city: v.city?.trim() || null,
          legacyCode: v.legacyCode?.trim() || null,
          createdById: user.id,
        })
        .returning();
      donorId = created.id;
      createdDonor = true;
      await logAction({
        actor: user,
        action: "create",
        entityType: "donor",
        entityId: created.id,
        summary: `Registered donor ${created.fullName} (${created.donorCode})`,
        after: created,
      });
    }
  }

  const headId = Number(v.headId);
  const [head] = await db.select().from(heads).where(eq(heads.id, headId)).limit(1);
  if (!head) return { fieldErrors: { headId: "That collection head no longer exists." } };

  if (v.paymentMethod === "cheque" && !v.chequeNo?.trim()) {
    return { fieldErrors: { chequeNo: "Enter the cheque number." } };
  }

  const status = v.paymentMethod === "cheque" ? "pending" : "completed";
  const receiptNo = await nextReceiptNo();

  const [saved] = await db
    .insert(donations)
    .values({
      receiptNo,
      donorId,
      headId,
      amount: amount.toFixed(2),
      paymentMethod: v.paymentMethod,
      status,
      chequeNo: v.chequeNo?.trim() || null,
      bankName: v.bankName?.trim() || null,
      slipRef: v.slipRef?.trim() || null,
      slipUrl: v.slipUrl?.trim() || null,
      remarks: v.remarks?.trim() || null,
      isMembership: v.isMembership === "on",
      membershipMonth:
        v.isMembership === "on" ? new Date().toISOString().slice(0, 7) : null,
      collectedById: user.id,
      receivedAt: new Date(),
    })
    .returning();

  const [donor] = await db.select().from(donors).where(eq(donors.id, donorId)).limit(1);

  await logAction({
    actor: user,
    action: "create",
    entityType: "donation",
    entityId: saved.id,
    summary: `Receipt ${receiptNo} — Rs ${money(amount)} from ${donor.fullName} for ${head.name}${
      createdDonor ? " (new donor)" : ""
    }`,
    after: saved,
  });

  revalidatePath("/dashboard");
  revalidatePath("/receipts");
  redirect(`/receipts/${saved.id}?new=1`);
}
