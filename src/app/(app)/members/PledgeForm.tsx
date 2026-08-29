"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePledge, type PledgeState } from "./actions";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import type { HeadOption } from "@/lib/queries";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Save membership"}
    </Button>
  );
}

export default function PledgeForm({ heads }: { heads: HeadOption[] }) {
  const [state, formAction] = useActionState<PledgeState, FormData>(savePledge, {});

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-ink-900">Add or update a member</h2>
      <p className="mb-4 text-xs text-ink-500">
        The donor must already be registered. Entering an existing member&apos;s number updates
        their pledge.
      </p>

      <form action={formAction} className="space-y-4" key={state.ok}>
        <Field label="Donor mobile number" required>
          <Input name="mobile" inputMode="tel" placeholder="03001234567" required />
        </Field>

        <Field label="Monthly amount (Rs)" required>
          <Input name="monthlyAmount" inputMode="numeric" placeholder="1000" required />
        </Field>

        <Field label="Due on" hint="Day of the month the reminder is based on.">
          <Input name="dueDay" type="number" min={1} max={28} defaultValue={5} />
        </Field>

        <Field label="Collect against">
          <Select name="headId" defaultValue="">
            <option value="">No fixed head</option>
            {heads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.parentName ? `${h.parentName} — ` : ""}
                {h.name}
              </option>
            ))}
          </Select>
        </Field>

        {state.error && <p className="text-sm text-alert-700">{state.error}</p>}
        {state.ok && <p className="text-sm text-sabz-700">{state.ok}</p>}

        <Save />
      </form>
    </Card>
  );
}
