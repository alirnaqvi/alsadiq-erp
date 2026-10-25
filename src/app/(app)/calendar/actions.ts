"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gatherings, sponsorships, donors } from "@/db/schema";
import { assertPermission, requireUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { hijriYmd } from "@/lib/format";
import { waNumber } from "@/lib/format";

export type GatheringState = { error?: string; ok?: string };

export async function saveGathering(formData: FormData): Promise<void> {
  const user = await assertPermission("event.manage");
  const title = String(formData.get("title") ?? "").trim();
  const gregorianDate = String(formData.get("gregorianDate") ?? "").trim();
  if (title.length < 3 || !gregorianDate) return;
  const h = hijriYmd(`${gregorianDate}T00:00:00+05:00`);
  const [created] = await db
    .insert(gatherings)
    .values({
      title,
      titleUr: String(formData.get("titleUr") ?? "").trim() || null,
      kind: String(formData.get("kind") ?? "majlis"),
      gregorianDate,
      hijriMonth: h.month || null,
      hijriDay: h.day || null,
      hijriYear: h.year || null,
      suggestedAmount: String(formData.get("suggestedAmount") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || "Masjid o Imam Bargah Al-Sadiq Trust",
      description: String(formData.get("description") ?? "").trim() || null,
      isPublic: formData.get("isPublic") === "on",
      createdById: user.id,
    })
    .returning();
  await logAction({
    actor: user,
    action: "create",
    entityType: "gathering",
    entityId: created.id,
    summary: `Added gathering ${created.title} on ${gregorianDate}`,
  });
  revalidatePath("/calendar");
  revalidatePath("/m/calendar");
}

export type ReviewState = { error?: string; ok?: string };

export async function reviewSponsorship(formData: FormData): Promise<void> {
  const user = await assertPermission("sponsorship.review");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !["approved", "rejected"].includes(status)) return;

  const [row] = await db.select().from(sponsorships).where(eq(sponsorships.id, id)).limit(1);
  if (!row) return;

  await db
    .update(sponsorships)
    .set({
      status,
      reviewNote: note || null,
      reviewedById: user.id,
      reviewedAt: new Date(),
    })
    .where(eq(sponsorships.id, id));

  await logAction({
    actor: user,
    action: "update",
    entityType: "sponsorship",
    entityId: id,
    summary: `${status} sponsorship #${id}${note ? ` — ${note}` : ""}`,
  });
  revalidatePath("/calendar");
}

export async function sponsorshipWhatsApp(id: number) {
  await requireUser();
  const [row] = await db
    .select({
      s: sponsorships,
      donorName: donors.fullName,
      mobile: donors.mobile,
      gathering: gatherings,
    })
    .from(sponsorships)
    .innerJoin(donors, eq(sponsorships.donorId, donors.id))
    .innerJoin(gatherings, eq(sponsorships.gatheringId, gatherings.id))
    .where(eq(sponsorships.id, id))
    .limit(1);
  if (!row) return null;
  const amount = Number(row.s.offeredAmount);
  const date = row.gathering.gregorianDate;
  const hijri = row.gathering.hijriDay
    ? `${row.gathering.hijriDay} / ${row.gathering.hijriMonth}`
    : "";
  const text =
    row.s.status === "approved"
      ? `Assalam-o-Alaikum ${row.donorName},\n\nJazak Allah. Your sponsorship for *${row.gathering.title}* has been *approved*.\n\nDate: ${date}${hijri ? ` (${hijri})` : ""}\nAmount: Rs ${amount.toLocaleString("en-PK")}\n\nMay Allah accept your offering.\n— Al Sadiq Trust`
      : `Assalam-o-Alaikum ${row.donorName},\n\nThank you for offering to sponsor *${row.gathering.title}*. We are unable to confirm this date at this time${row.s.reviewNote ? `: ${row.s.reviewNote}` : "."}\n\nPlease choose another gathering from the donor app if you wish.\n— Al Sadiq Trust`;
  return `https://wa.me/${waNumber(row.mobile)}?text=${encodeURIComponent(text)}`;
}
