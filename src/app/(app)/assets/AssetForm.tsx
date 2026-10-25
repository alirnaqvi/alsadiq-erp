"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveAsset, type AssetState } from "./actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save asset"}
    </Button>
  );
}

const DEPARTMENTS = [
  "Imambargah",
  "Masjid",
  "Kitchen / Langar",
  "Sound & lighting",
  "Admin office",
  "Accounts",
  "Security",
  "Transport",
  "Store",
  "Other",
];

export default function AssetForm({
  staff,
}: {
  staff: { id: number; fullName: string }[];
}) {
  const [state, action] = useActionState<AssetState, FormData>(saveAsset, {});
  return (
    <form action={action}>
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Register an asset</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2">
            <Input name="name" required placeholder="Sound mixer" />
          </Field>
          <Field label="Category">
            <Input name="category" placeholder="Electronics / Furniture / Vehicle" />
          </Field>
          <Field label="Location">
            <Input name="location" placeholder="Main imambargah" />
          </Field>
          <Field label="Department using it">
            <Select name="department" defaultValue="">
              <option value="">Choose…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Incharge (staff)">
            <Select name="inchargeUserId" defaultValue="">
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Incharge name" hint="If they are not a system user.">
            <Input name="inchargeName" placeholder="Volunteer name" />
          </Field>
          <Field label="Serial no.">
            <Input name="serialNo" />
          </Field>
          <Field label="Purchase date">
            <Input name="purchaseDate" type="date" />
          </Field>
          <Field label="Purchase value (Rs)">
            <Input name="purchaseValue" inputMode="numeric" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="in_use">
              <option value="in_use">In use</option>
              <option value="stored">Stored</option>
              <option value="under_repair">Under repair</option>
              <option value="disposed">Disposed</option>
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea name="notes" rows={2} />
          </Field>
        </div>
        {state.error && <p className="mt-3 text-sm text-alert-700">{state.error}</p>}
        {state.ok && <p className="mt-3 text-sm text-sabz-700">{state.ok}</p>}
        <div className="mt-4">
          <Save />
        </div>
      </Card>
    </form>
  );
}
