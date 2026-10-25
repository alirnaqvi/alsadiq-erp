"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gatherings, sponsorships } from "@/db/schema";
import { requireDonor } from "@/lib/donor-auth";

export type SponsorState = { error?: string; ok?: string };

export async function offerSponsorship(_prev: SponsorState, formData: FormData): Promise<SponsorState> {
  const donor = await requireDonor();
  const gatheringId = Number(formData.get("gatheringId"));
  const amount = Number(formData.get("amount"));
  const message = String(formData.get("message") ?? "").trim();
  if (!gatheringId) return { error: "Choose a gathering." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter the amount you can sponsor." };

  const [event] = await db
    .select()
    .from(gatherings)
    .where(and(eq(gatherings.id, gatheringId), eq(gatherings.isPublic, true)))
    .limit(1);
  if (!event) return { error: "That gathering is not open for sponsorship." };

  const [existing] = await db
    .select()
    .from(sponsorships)
    .where(and(eq(sponsorships.gatheringId, gatheringId), eq(sponsorships.donorId, donor.id)))
    .limit(1);
  if (existing && existing.status === "pending") {
    return { error: "You already have a pending request for this gathering." };
  }
  if (existing && existing.status === "approved") {
    return { error: "This gathering is already confirmed for you." };
  }

  await db.insert(sponsorships).values({
    gatheringId,
    donorId: donor.id,
    offeredAmount: amount.toFixed(2),
    message: message || null,
  });
  revalidatePath("/m/calendar");
  revalidatePath("/calendar");
  return { ok: "Your request has been sent to the trust. You will hear back on WhatsApp." };
}
