import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import ImportDesk from "../ImportDesk";

export const dynamic = "force-dynamic";

export default async function DonorImportPage() {
  const user = await requireUser();
  if (!user.permissions.includes("donor.import") && !user.permissions.includes("donor.create")) {
    redirect("/dashboard?denied=donor.import");
  }
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/donors" className="underline underline-offset-4">Donors</Link>}
        title="Import donors from Excel"
        subtitle="Bring in the previous register so no one has to type it again. Profession, blood group, date of birth and city can sit in the same file."
        actions={
          <LinkButton href="/api/export/donor-template">Download template</LinkButton>
        }
      />
      <ImportDesk />
    </>
  );
}
