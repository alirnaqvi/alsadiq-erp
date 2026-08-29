"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveRole, deleteRole, type RoleState } from "./actions";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Role = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  level: number;
  dataScope: string;
  permissions: string[];
  isSystem: boolean;
  holders: number;
};

type Perm = { key: string; group: string; label: string };

function Save({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : editing ? "Save role" : "Create role"}
    </Button>
  );
}

export default function RoleAdmin({
  roles,
  permissions,
  groups,
  scopeLabels,
}: {
  roles: Role[];
  permissions: Perm[];
  groups: string[];
  scopeLabels: Record<string, string>;
}) {
  const [editing, setEditing] = useState<Role | null>(null);
  const [state, formAction] = useActionState<RoleState, FormData>(saveRole, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {roles.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-ink-900">{r.name}</h2>
                  {r.isSystem && <Badge>Built in</Badge>}
                </div>
                {r.description && <p className="mt-1 text-sm text-ink-500">{r.description}</p>}
                <p className="mt-2 text-xs text-ink-500">
                  Sees: {scopeLabels[r.dataScope]} · {r.holders} {r.holders === 1 ? "person" : "people"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                  Edit
                </Button>
                {!r.isSystem && r.holders === 0 && (
                  <form action={deleteRole}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Delete
                    </Button>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {permissions
                .filter((p) => r.permissions.includes(p.key))
                .map((p) => (
                  <span
                    key={p.key}
                    className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700"
                  >
                    {p.label}
                  </span>
                ))}
              {r.permissions.length === 0 && (
                <span className="text-xs text-ink-500">No permissions granted.</span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="lg:sticky lg:top-10 lg:self-start">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              {editing ? `Edit ${editing.name}` : "Add a role"}
            </h2>
            {editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            )}
          </div>

          <form action={formAction} className="space-y-4" key={editing?.id ?? "new"}>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <Field label="Role name" required>
              <Input name="name" defaultValue={editing?.name} required />
            </Field>

            <Field label="What this role is for">
              <Textarea name="description" rows={2} defaultValue={editing?.description ?? ""} />
            </Field>

            <Field
              label="Collection data they can see"
              hint="Team means everyone reporting to them, however far down."
            >
              <Select name="dataScope" defaultValue={editing?.dataScope ?? "own"}>
                <option value="own">Only their own entries</option>
                <option value="team">Their own and their team&apos;s</option>
                <option value="all">Everything in the trust</option>
              </Select>
            </Field>

            <Field label="Seniority" hint="Lower numbers sit higher up. Used for ordering only.">
              <Input name="level" type="number" defaultValue={editing?.level ?? 50} />
            </Field>

            <div>
              <span className="mb-2 block text-[13px] font-medium text-ink-700">Permissions</span>
              <div className="space-y-3">
                {groups.map((g) => (
                  <fieldset key={g}>
                    <legend className="eyebrow mb-1">{g}</legend>
                    <div className="space-y-1">
                      {permissions
                        .filter((p) => p.group === g)
                        .map((p) => (
                          <label key={p.key} className="flex items-center gap-2 text-sm text-ink-700">
                            <input
                              type="checkbox"
                              name="permissions"
                              value={p.key}
                              defaultChecked={editing?.permissions.includes(p.key)}
                              className="size-4 accent-[#0c4a3e]"
                            />
                            {p.label}
                          </label>
                        ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>

            {state.error && <p className="text-sm text-alert-700">{state.error}</p>}
            {state.ok && <p className="text-sm text-sabz-700">{state.ok}</p>}

            <Save editing={Boolean(editing)} />
          </form>
        </Card>
      </div>
    </div>
  );
}
