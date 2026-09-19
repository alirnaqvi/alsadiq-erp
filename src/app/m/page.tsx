import { redirect } from "next/navigation";
import { getDonorSession } from "@/lib/donor-auth";

export default async function DonorIndex() {
  if (await getDonorSession()) redirect("/m/home");
  redirect("/m/login");
}
