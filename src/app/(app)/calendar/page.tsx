import { desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { gatherings, sponsorships, donors } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hijri, longDate, money, ymd } from "@/lib/format";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { Badge, Button, Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import EventCalendar from "@/components/EventCalendar";
import { saveGathering, reviewSponsorship } from "./actions";
import WhatsAppStatusLink from "./WhatsAppStatusLink";
import GatheringActions from "./GatheringActions";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const user = await requireUser();
  const t = tx(await getLocale());
  const today = ymd();
  const from = `${today.slice(0, 8)}01`;
  const events = await db
    .select()
    .from(gatherings)
    .where(gte(gatherings.gregorianDate, from))
    .orderBy(gatherings.gregorianDate)
    .limit(200);

  const requests = await db
    .select({
      s: sponsorships,
      donorName: donors.fullName,
      mobile: donors.mobile,
      title: gatherings.title,
      date: gatherings.gregorianDate,
    })
    .from(sponsorships)
    .innerJoin(donors, eq(sponsorships.donorId, donors.id))
    .innerJoin(gatherings, eq(sponsorships.gatheringId, gatherings.id))
    .orderBy(desc(sponsorships.createdAt))
    .limit(40);

  const canManage = user.permissions.includes("event.manage");
  const canReview = user.permissions.includes("sponsorship.review");
  const editingId = Number(edit ?? 0);
  const editing = canManage && editingId ? (events.find((e) => e.id === editingId) ?? null) : null;

  return (
    <>
      <PageHeader
        eyebrow={t("pages.calendar.eyebrow")}
        title={t("pages.calendar.title")}
        subtitle={t("pages.calendar.subtitle")}
      />

      <div className="mb-6">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card padded={false}>
            <h2 className="px-5 pb-3 pt-5 font-display text-xl font-bold text-primary">Upcoming gatherings</h2>
            <ul className="divide-y divide-border">
              {events.filter((e) => e.gregorianDate >= today).map((e) => (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="font-medium text-foreground">{e.title}</p>
                    {e.titleUr && <p className="urdu text-gold">{e.titleUr}</p>}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {longDate(e.gregorianDate)} · {hijri(e.gregorianDate)}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    {e.suggestedAmount && (
                      <p className="tnum font-semibold text-primary">Rs {money(e.suggestedAmount)}</p>
                    )}
                    <p className="text-xs capitalize text-muted-foreground">{e.kind}</p>
                    {canManage && <GatheringActions id={e.id} />}
                  </div>
                </li>
              ))}
              {events.filter((e) => e.gregorianDate >= today).length === 0 && (
                <li className="px-5 py-8 text-sm text-muted-foreground">No upcoming gatherings yet.</li>
              )}
            </ul>
          </Card>

          <Card padded={false}>
            <h2 className="px-5 pb-3 pt-5 font-display text-xl font-bold text-primary">Sponsorship requests</h2>
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li key={r.s.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{r.donorName}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.title} · {longDate(r.date)} · Rs {money(r.s.offeredAmount)}
                      </p>
                      {r.s.message && <p className="mt-1 text-sm">{r.s.message}</p>}
                    </div>
                    <Badge tone={r.s.status === "approved" ? "green" : r.s.status === "rejected" ? "red" : "brass"}>
                      {r.s.status}
                    </Badge>
                  </div>
                  {canReview && r.s.status === "pending" && (
                    <form action={reviewSponsorship} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={r.s.id} />
                      <Input name="note" placeholder="Note (optional)" className="h-10 min-h-10 max-w-xs" />
                      <Button type="submit" name="status" value="approved" size="sm">
                        Approve
                      </Button>
                      <Button type="submit" name="status" value="rejected" variant="danger" size="sm">
                        Reject
                      </Button>
                    </form>
                  )}
                  {r.s.status !== "pending" && (
                    <div className="mt-2">
                      <WhatsAppStatusLink id={r.s.id} />
                    </div>
                  )}
                </li>
              ))}
              {requests.length === 0 && (
                <li className="px-5 py-8 text-sm text-muted-foreground">No sponsorship requests yet.</li>
              )}
            </ul>
          </Card>
        </div>

        {canManage && (
          <form action={saveGathering} key={editing?.id ?? "new"}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Card>
              <h2 className="mb-4 text-sm font-semibold">
                {editing ? "Edit gathering" : "Add a gathering"}
              </h2>
              <div className="space-y-3">
                <Field label="Title" required>
                  <Input
                    name="title"
                    required
                    placeholder="Ayyam-e-Fatimiyya majlis"
                    defaultValue={editing?.title ?? ""}
                  />
                </Field>
                <Field label="Urdu title">
                  <Input name="titleUr" dir="rtl" defaultValue={editing?.titleUr ?? ""} />
                </Field>
                <Field label="Kind">
                  <Select name="kind" defaultValue={editing?.kind ?? "majlis"}>
                    <option value="majlis">Majlis</option>
                    <option value="milad">Milad</option>
                    <option value="niaz">Niaz / langar</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Date" required>
                  <Input
                    name="gregorianDate"
                    type="date"
                    required
                    defaultValue={editing ? ymd(editing.gregorianDate) : ""}
                  />
                </Field>
                <Field label="Suggested amount (Rs)">
                  <Input
                    name="suggestedAmount"
                    inputMode="numeric"
                    defaultValue={editing?.suggestedAmount ?? ""}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    name="location"
                    defaultValue={editing?.location ?? "Masjid o Imam Bargah Al-Sadiq Trust"}
                  />
                </Field>
                <Field label="Note">
                  <Textarea name="description" rows={3} defaultValue={editing?.description ?? ""} />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isPublic"
                    defaultChecked={editing ? editing.isPublic : true}
                    className="size-4 accent-primary"
                  />
                  Visible to donors
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">{editing ? "Save changes" : "Save gathering"}</Button>
                  {editing && (
                    <LinkButton href="/calendar" variant="ghost">
                      Cancel
                    </LinkButton>
                  )}
                </div>
              </div>
            </Card>
          </form>
        )}
      </div>
    </>
  );
}
