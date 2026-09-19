import { requireDonor } from "@/lib/donor-auth";
import { donorHeads } from "../actions";
import DonorPayForm from "./PayForm";

export const dynamic = "force-dynamic";

export default async function DonorPayPage() {
  const donor = await requireDonor();
  const heads = await donorHeads();
  return (
    <>
      <h1 className="text-xl font-semibold text-ink-900">Record a payment</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500">
        Attach the bank slip or transfer screenshot. The trust will confirm it and it will appear on
        your ledger.
      </p>
      <DonorPayForm heads={heads} extraNames={donor.additionalNames} />
    </>
  );
}
