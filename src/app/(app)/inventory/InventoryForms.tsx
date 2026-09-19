"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveItem, moveStock, type InvState } from "./actions";
import { Button, Card, Field, Input, Select } from "@/components/ui";

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function NewItemForm() {
  const [state, action] = useActionState<InvState, FormData>(saveItem, {});
  return (
    <form action={action}>
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">New item</h2>
        <div className="space-y-3">
          <Field label="Name" required>
            <Input name="name" required placeholder="Paper cups" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit">
              <Input name="unit" defaultValue="pcs" />
            </Field>
            <Field label="Opening qty">
              <Input name="qty" inputMode="numeric" defaultValue="0" />
            </Field>
          </div>
          <Field label="Location">
            <Input name="location" />
          </Field>
          <Field label="Low-stock alert at">
            <Input name="minQty" inputMode="numeric" defaultValue="0" />
          </Field>
        </div>
        {state.error && <p className="mt-3 text-sm text-alert-700">{state.error}</p>}
        {state.ok && <p className="mt-3 text-sm text-sabz-700">{state.ok}</p>}
        <div className="mt-4">
          <Save label="Add item" />
        </div>
      </Card>
    </form>
  );
}

export function MoveForm({
  items,
}: {
  items: { id: number; name: string; unit: string }[];
}) {
  const [state, action] = useActionState<InvState, FormData>(moveStock, {});
  return (
    <form action={action}>
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Stock in / out</h2>
        <div className="space-y-3">
          <Field label="Item" required>
            <Select name="itemId" required defaultValue="">
              <option value="">Choose…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Movement">
            <Select name="kind" defaultValue="out">
              <option value="in">Stock in</option>
              <option value="out">Stock out</option>
              <option value="adjust">Set quantity to</option>
            </Select>
          </Field>
          <Field label="Quantity" required>
            <Input name="qty" inputMode="numeric" required />
          </Field>
          <Field label="Reason">
            <Input name="reason" placeholder="Majlis issue / purchase / count" />
          </Field>
        </div>
        {state.error && <p className="mt-3 text-sm text-alert-700">{state.error}</p>}
        {state.ok && <p className="mt-3 text-sm text-sabz-700">{state.ok}</p>}
        <div className="mt-4">
          <Save label="Record movement" />
        </div>
      </Card>
    </form>
  );
}
