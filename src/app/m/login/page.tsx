import { getDonorSession } from "@/lib/donor-auth";
import { redirect } from "next/navigation";
import DonorLoginForm from "./DonorLoginForm";

export default async function DonorLoginPage() {
  if (await getDonorSession()) redirect("/m/home");
  return (
    <>
      <h1 className="text-xl font-semibold text-ink-900">Donor sign-in</h1>
      <p className="mt-1 mb-6 text-sm text-ink-500">Use the mobile number the trust has on file and your app PIN.</p>
      <DonorLoginForm />
    </>
  );
}
