import { requireUser } from "@/lib/auth";
import { buildWorkbook, xlsxResponse } from "@/lib/excel";
import { IMPORT_TEMPLATE_COLUMNS } from "@/lib/donor-import";
import { CITIES } from "@/lib/cities";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user.permissions.includes("donor.import") && !user.permissions.includes("donor.create")) {
    return new Response("Forbidden", { status: 403 });
  }
  const buffer = await buildWorkbook({
    sheetName: "Donors",
    title: "Al Sadiq Trust — donor import template",
    subtitle: `City must be one of: ${CITIES.filter((c) => c !== "Other").join(", ")}`,
    columns: IMPORT_TEMPLATE_COLUMNS.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
      money: c.key === "amount",
    })),
    rows: [
      {
        membershipNo: "AS-601",
        fullName: "Example Donor",
        mobile: "03001234567",
        amount: 12000,
        profession: "Teacher",
        bloodGroup: "B+",
        dateOfBirth: "1985-03-14",
        city: "Islamabad",
        address: "",
        cnic: "",
        email: "",
      },
    ],
  });
  return xlsxResponse(buffer, "al-sadiq-donor-import-template.xlsx");
}
