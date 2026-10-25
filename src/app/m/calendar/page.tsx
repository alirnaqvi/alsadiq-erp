import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { gatherings, sponsorships } from "@/db/schema";
import { requireDonor } from "@/lib/donor-auth";
import { hijri, longDate, money, ymd } from "@/lib/format";
import { Card } from "@/components/ui";
import EventCalendar from "@/components/EventCalendar";
import SponsorForm from "./SponsorForm";

export const dynamic = "force-dynamic";

export default async function DonorCalendarPage() {
  const donor = await requireDonor();
  const today = ymd();
  const from = `${today.slice(0, 8)}01`;
  const events = await db
    .select()
    .from(gatherings)
    .where(and(gte(gatherings.gregorianDate, from), eq(gatherings.isPublic, true)))
    .orderBy(gatherings.gregorianDate)
    .limit(200);

  const mine = await db
    .select()
    .from(sponsorships)
    .where(eq(sponsorships.donorId, donor.id));
  const mineByEvent = new Map(mine.map((s) => [s.gatheringId, s]));

  return (
    <>
      <p className="eyebrow">Hijri & English</p>
      <h1 className="font-display text-3xl font-bold text-primary">Upcoming gatherings</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Majalis, milad and niaz at Al Sadiq Trust. If you wish to sponsor a date, send a request with
        the amount you can offer. The trust will approve or decline and message you on WhatsApp.
      </p>

      <div className="mt-6">
        <EventCalendar
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            titleUr: e.titleUr,
            gregorianDate: ymd(e.gregorianDate),
            kind: e.kind,
          }))}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {events.filter((e) => e.gregorianDate >= today).map((e) => {
          const request = mineByEvent.get(e.id);
          return (
            <Card key={e.id}>
              <p className="text-xs uppercase tracking-wide text-gold">{e.kind}</p>
              <h2 className="mt-1 font-display text-xl font-bold text-primary">{e.title}</h2>
              {e.titleUr && <p className="urdu text-gold">{e.titleUr}</p>}
              <p className="mt-2 text-sm text-muted-foreground">
                {longDate(e.gregorianDate)} · {hijri(e.gregorianDate)}
              </p>
              {e.location && <p className="text-sm">{e.location}</p>}
              {e.suggestedAmount && (
                <p className="tnum mt-2 font-semibold text-primary">Suggested Rs {money(e.suggestedAmount)}</p>
              )}
              {e.description && <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>}
              <div className="mt-4">
                {request ? (
                  <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                    Your request: Rs {money(request.offeredAmount)} · {request.status}
                  </p>
                ) : (
                  <SponsorForm gatheringId={e.id} suggested={e.suggestedAmount} />
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {events.filter((e) => e.gregorianDate >= today).length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">No public gatherings are listed yet.</p>
      )}
    </>
  );
}
