import { desc } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { NewItemForm, MoveForm } from "./InventoryForms";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await requirePermission("inventory.manage");
  const rows = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));

  return (
    <>
      <PageHeader
        eyebrow="Store"
        title="Inventory"
        subtitle="Consumables and stock the trust issues for majalis, langar and office use."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card padded={false}>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No stock items" body="Add paper cups, deg pots, banners — anything that moves in and out." />
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Item</Th>
                  <Th>Location</Th>
                  <Th align="right">On hand</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const low = Number(r.qtyOnHand) <= Number(r.minQty);
                  return (
                    <tr key={r.id}>
                      <Td className="code text-xs">{r.itemCode}</Td>
                      <Td>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-ink-500">{r.unit}</p>
                      </Td>
                      <Td className="text-ink-500">{r.location || "—"}</Td>
                      <Td align="right">
                        <span className="tnum font-medium">{r.qtyOnHand}</span>
                        {low && Number(r.minQty) > 0 && (
                          <span className="ml-2">
                            <Badge tone="brass">Low</Badge>
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <div className="space-y-4">
          <MoveForm items={rows.map((r) => ({ id: r.id, name: r.name, unit: r.unit }))} />
          <NewItemForm />
        </div>
      </div>
    </>
  );
}
