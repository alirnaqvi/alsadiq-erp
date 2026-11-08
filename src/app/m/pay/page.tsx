import { requireDonor } from "@/lib/donor-auth";
import { getSettings } from "@/lib/queries";
import { TRUST } from "@/lib/trust-facts";
import { BankTransferCard } from "@/components/BankTransferCard";
import { donorHeads } from "../actions";
import DonorPayForm from "./PayForm";

export const dynamic = "force-dynamic";

export default async function DonorPayPage() {
  const donor = await requireDonor();
  const heads = await donorHeads();
  const settings = await getSettings();
  const wa = settings.whatsapp_number || TRUST.whatsapp;
  return (
    <>
      <h1 className="text-xl font-semibold text-ink-900">Record a payment</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500">
        Transfer to the trust account, then attach a photo of the slip. The office will confirm it
        and it will appear on your ledger.
      </p>
      <div className="mb-6">
        <BankTransferCard
          bankName={settings.bank_name}
          accountTitle={settings.bank_account_title}
          accountNumber={settings.bank_account_number}
          iban={settings.bank_iban}
        />
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        After transferring you may also send the same screenshot on WhatsApp to{" "}
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent("Assalam o Alaikum, I have made a bank transfer donation to Al Sadiq Trust. Please find the receipt attached.")}`}
          className="font-semibold text-primary underline underline-offset-4"
        >
          {wa}
        </a>
        .
      </p>
      <DonorPayForm heads={heads} extraNames={donor.additionalNames} />
    </>
  );
}
