import { desc } from "drizzle-orm";
import { db } from "@/db";
import { donorRegistrations } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Button } from "@/components/ui";
import { decideRegistration } from "./actions";

export const dynamic = "force-dynamic";

export default async function VerificationsPage() {
  await requirePermission("donor.verify");
  const rows = await db.select().from(donorRegistrations).orderBy(desc(donorRegistrations.createdAt)).limit(80);
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  return (
    <>
      <PageHeader
        eyebrow="Donor app"
        title="Registration requests"
        subtitle="People who scanned the QR or opened the join link. Approve to add them as donors."
      />

      <h2 className="mb-3 text-sm font-semibold text-ink-900">Waiting ({pending.length})</h2>
      {pending.length === 0 ? (
        <EmptyState title="No pending requests" body="New donor-app sign-ups will appear here." />
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{r.fullName}</p>
                  <p className="code text-xs text-ink-500">{r.mobile}</p>
                </div>
                <Badge tone="brass">Pending</Badge>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {r.email && (
                  <div>
                    <dt className="eyebrow">Email</dt>
                    <dd>{r.email}</dd>
                  </div>
                )}
                {r.cnic && (
                  <div>
                    <dt className="eyebrow">CNIC</dt>
                    <dd className="code">{r.cnic}</dd>
                  </div>
                )}
                {r.city && (
                  <div>
                    <dt className="eyebrow">City</dt>
                    <dd>{r.city}</dd>
                  </div>
                )}
                {r.address && (
                  <div className="sm:col-span-2">
                    <dt className="eyebrow">Address</dt>
                    <dd>{r.address}</dd>
                  </div>
                )}
                {r.additionalNames && (
                  <div className="sm:col-span-2">
                    <dt className="eyebrow">Additional names</dt>
                    <dd>{r.additionalNames}</dd>
                  </div>
                )}
                <div>
                  <dt className="eyebrow">Submitted</dt>
                  <dd>{dateTime(r.createdAt)}</dd>
                </div>
              </dl>
              <form action={decideRegistration} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input
                  name="reviewNote"
                  placeholder="Optional note"
                  className="h-10 min-w-[12rem] flex-1 rounded-md border border-ink-200 px-3 text-sm"
                />
                <Button type="submit" name="decision" value="approved">
                  Approve
                </Button>
                <Button type="submit" name="decision" value="rejected" variant="danger">
                  Reject
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold text-ink-900">Recently reviewed</h2>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
            {done.slice(0, 20).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{r.fullName}</p>
                  <p className="code text-xs text-ink-500">{r.mobile}</p>
                </div>
                <Badge tone={r.status === "approved" ? "green" : "red"}>
                  {r.status === "approved" ? "Approved" : "Rejected"}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
