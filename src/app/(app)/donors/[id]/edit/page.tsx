import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donors } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import DonorForm from "../../DonorForm";

export default async function EditDonorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("donor.edit");

  const [donor] = await db.select().from(donors).where(eq(donors.id, Number(id))).limit(1);
  if (!donor) notFound();

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/donors/${donor.id}`} className="underline underline-offset-4">
            {donor.fullName}
          </Link>
        }
        title="Edit donor"
        subtitle="Every change is recorded in the audit trail."
      />
      <div className="max-w-2xl">
        <DonorForm donor={donor} />
      </div>
    </>
  );
}
