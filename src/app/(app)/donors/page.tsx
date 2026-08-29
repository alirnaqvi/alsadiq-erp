import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { donors } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { money, longDate } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  inputClass,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function DonorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const user = await requirePermission("donor.view");
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));

  const where = q
    ? or(
        ilike(donors.fullName, `%${q}%`),
        ilike(donors.mobile, `%${q}%`),
        ilike(donors.donorCode, `%${q}%`),
        ilike(donors.legacyCode, `%${q}%`),
        ilike(donors.cnic, `%${q}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: donors.id,
      donorCode: donors.donorCode,
      fullName: donors.fullName,
      mobile: donors.mobile,
      city: donors.city,
      legacyCode: donors.legacyCode,
      createdAt: donors.createdAt,
      total: sql<string>`coalesce((
        select sum(amount) from donations
        where donations.donor_id = ${donors.id} and donations.status <> 'void'
      ),0)`,
      lastAt: sql<string | null>`(
        select max(received_at) from donations
        where donations.donor_id = ${donors.id} and donations.status <> 'void'
      )`,
      isMember: sql<boolean>`exists(
        select 1 from pledges where pledges.donor_id = ${donors.id} and pledges.is_active
      )`,
    })
    .from(donors)
    .where(where)
    .orderBy(desc(donors.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(donors)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(Number(count?.n ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow="Donors"
        title="Donor register"
        subtitle={`${Number(count?.n ?? 0)} donors${q ? " matching your search" : ""}`}
        actions={
          user.permissions.includes("donor.create") && (
            <LinkButton href="/donors/new" variant="primary">
              Register a donor
            </LinkButton>
          )
        }
      />

      <form className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, mobile, donor ID, old number or CNIC"
          className={inputClass}
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-md bg-sabz-700 px-4 text-sm font-medium text-white hover:bg-sabz-600"
        >
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={q ? "No donor matches that" : "No donors yet"}
          body={
            q
              ? "Check the spelling, or try just the last few digits of the mobile number."
              : "Register your first donor, or import the old register from Excel."
          }
          action={
            user.permissions.includes("donor.create") && (
              <LinkButton href="/donors/new" variant="primary">
                Register a donor
              </LinkButton>
            )
          }
        />
      ) : (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Donor ID</Th>
                <Th>Name</Th>
                <Th>Mobile</Th>
                <Th>City</Th>
                <Th align="right">Given</Th>
                <Th align="right">Last donation</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-paper/70">
                  <Td>
                    <Link href={`/donors/${d.id}`} className="code text-xs text-sabz-700">
                      {d.donorCode}
                    </Link>
                    {d.legacyCode && (
                      <span className="code block text-[11px] text-ink-300">
                        old {d.legacyCode}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Link href={`/donors/${d.id}`} className="font-medium hover:underline">
                      {d.fullName}
                    </Link>
                    {d.isMember && (
                      <span className="ml-2">
                        <Badge tone="green">Member</Badge>
                      </span>
                    )}
                  </Td>
                  <Td className="code text-xs">{d.mobile}</Td>
                  <Td className="text-ink-500">{d.city ?? "—"}</Td>
                  <Td align="right" className="tnum font-medium">
                    {money(d.total)}
                  </Td>
                  <Td align="right" className="tnum whitespace-nowrap text-xs text-ink-500">
                    {d.lastAt ? longDate(d.lastAt) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/donors?q=${encodeURIComponent(q)}&page=${page - 1}`}
                className="text-sabz-700 underline underline-offset-4"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/donors?q=${encodeURIComponent(q)}&page=${page + 1}`}
                className="text-sabz-700 underline underline-offset-4"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
