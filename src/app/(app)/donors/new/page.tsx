import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import DonorForm from "../DonorForm";

export default async function NewDonorPage() {
  await requirePermission("donor.create");
  return (
    <>
      <PageHeader
        eyebrow="Donors"
        title="Register a donor"
        subtitle="Only the name and mobile number are required. Everything else can follow later."
      />
      <div className="max-w-2xl">
        <DonorForm />
      </div>
    </>
  );
}
