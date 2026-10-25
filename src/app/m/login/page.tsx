import { getDonorSession } from "@/lib/donor-auth";
import { redirect } from "next/navigation";
import DonorLoginForm from "./DonorLoginForm";

export default async function DonorLoginPage() {
  if (await getDonorSession()) redirect("/m/home");
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-primary">Donor sign-in</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Use the mobile number the trust has on file and your app PIN.</p>
      <DonorLoginForm />
    </>
  );
}
