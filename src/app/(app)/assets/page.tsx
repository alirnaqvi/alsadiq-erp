import { desc } from "drizzle-orm";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { money } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import AssetForm from "./AssetForm";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "green" | "brass" | "red" | "neutral" }> = {
  in_use: { label: "In use", tone: "green" },
  stored: { label: "Stored", tone: "neutral" },
  under_repair: { label: "Under repair", tone: "brass" },
  disposed: { label: "Disposed", tone: "red" },
};

export default async function AssetsPage() {
  await requirePermission("asset.manage");
  const rows = await db.select().from(assets).orderBy(desc(assets.createdAt));

  return (
    <>
      <PageHeader
        eyebrow="Store"
        title="Assets"
        subtitle="Physical items the trust owns — sound gear, furniture, vehicles, kitchen equipment."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padded={false}>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No assets yet" body="Register the first item using the form." />
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Location</Th>
                  <Th>Status</Th>
                  <Th align="right">Value</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = STATUS[r.status] ?? STATUS.in_use;
                  return (
                    <tr key={r.id}>
                      <Td className="code text-xs">{r.assetCode}</Td>
                      <Td>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-ink-500">{r.category || "—"}</p>
                      </Td>
                      <Td className="text-ink-500">{r.location || "—"}</Td>
                      <Td>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </Td>
                      <Td align="right" className="tnum">
                        {r.purchaseValue ? money(r.purchaseValue) : "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <AssetForm />
      </div>
    </>
  );
}
