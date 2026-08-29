"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveHead, type HeadState } from "./actions";
import { Button, Card, Field, Input, Select, inputClass } from "@/components/ui";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Add head"}
    </Button>
  );
}

export default function HeadForm({ parents }: { parents: { id: number; name: string }[] }) {
  const [state, formAction] = useActionState<HeadState, FormData>(saveHead, {});
  const [isEvent, setIsEvent] = useState(false);

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-ink-900">Add a head or subhead</h2>
      <form action={formAction} className="space-y-4" key={state.ok}>
        <Field label="Name" required>
          <Input name="name" required placeholder="9th Muharram" />
        </Field>

        <Field label="Name in Urdu">
          <Input name="nameUr" dir="rtl" placeholder="نویں محرم" />
        </Field>

        <Field label="Sits under" hint="Leave blank to create a new top-level head.">
          <Select name="parentId" defaultValue="">
            <option value="">Top level</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Code" hint="Used in reports and exports. Left blank, one is generated.">
          <Input name="code" placeholder="MAJ-MUH-09" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="isEvent"
            checked={isEvent}
            onChange={(e) => setIsEvent(e.target.checked)}
            className="size-4 accent-[#0c4a3e]"
          />
          This is a dated occasion
        </label>

        {isEvent && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-700">Event date</span>
            <input type="date" name="eventDate" className={inputClass} />
            <span className="mt-1 block text-xs text-ink-500">
              Lets you pull an event-wise report for this occasion.
            </span>
          </label>
        )}

        {state.error && <p className="text-sm text-alert-700">{state.error}</p>}
        {state.ok && <p className="text-sm text-sabz-700">{state.ok}</p>}

        <Save />
      </form>
    </Card>
  );
}
