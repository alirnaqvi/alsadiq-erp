"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveUser, resetPassword, toggleUser, type UserState } from "./actions";
import { Badge, Button, Card, Field, Input, Select, cx } from "@/components/ui";
import { dateTime } from "@/lib/format";

type U = {
  id: number;
  username: string;
  fullName: string;
  mobile: string | null;
  email: string | null;
  postedAt: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  managerId: number | null;
  roleId: number;
  roleName: string;
};

type R = { id: number; name: string; dataScope: string };

function Save({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : editing ? "Save changes" : "Create user"}
    </Button>
  );
}

export default function UserAdmin({
  users,
  roles,
  currentUserId,
}: {
  users: U[];
  roles: R[];
  currentUserId: number;
}) {
  const [editing, setEditing] = useState<U | null>(null);
  const [state, formAction] = useActionState<UserState, FormData>(saveUser, {});
  const [resetState, resetAction] = useActionState<UserState, FormData>(resetPassword, {});

  const roots = users.filter((u) => !u.managerId || !users.some((x) => x.id === u.managerId));
  const childrenOf = (id: number) => users.filter((u) => u.managerId === id);

  const renderRow = (u: U, depth: number): React.ReactNode => (
    <li key={u.id}>
      <div
        className={cx(
          "flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3",
          !u.isActive && "opacity-55",
        )}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink-900">{u.fullName}</span>
            <span className="code text-xs text-ink-500">{u.username}</span>
            <Badge tone={depth === 0 ? "green" : "neutral"}>{u.roleName}</Badge>
            {!u.isActive && <Badge tone="red">Deactivated</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-ink-500">
            {u.postedAt ? `${u.postedAt} · ` : ""}
            {u.lastLoginAt ? `last signed in ${dateTime(u.lastLoginAt)}` : "never signed in"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
            Edit
          </Button>
          <form action={resetAction}>
            <input type="hidden" name="id" value={u.id} />
            <Button type="submit" variant="ghost" size="sm">
              Reset password
            </Button>
          </form>
          {u.id !== currentUserId && (
            <form action={toggleUser}>
              <input type="hidden" name="id" value={u.id} />
              <Button type="submit" variant="ghost" size="sm">
                {u.isActive ? "Deactivate" : "Restore"}
              </Button>
            </form>
          )}
        </div>
      </div>
      {childrenOf(u.id).length > 0 && (
        <ul>{childrenOf(u.id).map((c) => renderRow(c, depth + 1))}</ul>
      )}
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {resetState.ok && (
          <p className="mb-4 rounded-md border border-brass-600/30 bg-brass-100 px-3 py-2 text-sm text-ink-800">
            {resetState.ok} — write it down and give it to them now. It is not shown again.
          </p>
        )}
        {resetState.error && (
          <p className="mb-4 rounded-md border border-alert-700/20 bg-alert-100 px-3 py-2 text-sm text-alert-700">
            {resetState.error}
          </p>
        )}

        <Card padded={false}>
          <p className="border-b border-ink-100 px-4 py-3 text-sm font-semibold text-ink-900">
            Reporting hierarchy
          </p>
          <ul>{roots.map((u) => renderRow(u, 0))}</ul>
        </Card>
      </div>

      <div className="lg:sticky lg:top-10 lg:self-start">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              {editing ? `Edit ${editing.fullName}` : "Add a user"}
            </h2>
            {editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            )}
          </div>

          <form action={formAction} className="space-y-4" key={editing?.id ?? "new"}>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <Field label="Full name" required>
              <Input name="fullName" defaultValue={editing?.fullName} required />
            </Field>

            <Field label="Username" required hint="What they type to sign in.">
              <Input name="username" defaultValue={editing?.username} required />
            </Field>

            <Field label="Role" required>
              <Select name="roleId" defaultValue={editing?.roleId ?? ""} required>
                <option value="">Choose a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Reports to" hint="This person's collection is visible to their manager.">
              <Select name="managerId" defaultValue={editing?.managerId ?? ""}>
                <option value="">Nobody</option>
                {users
                  .filter((u) => u.id !== editing?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {u.roleName}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="Posted at" hint="Counter or area, so receipts can be traced to a place.">
              <Input name="postedAt" defaultValue={editing?.postedAt ?? ""} placeholder="Counter 1" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile">
                <Input name="mobile" defaultValue={editing?.mobile ?? ""} inputMode="tel" />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
              </Field>
            </div>

            {!editing && (
              <Field
                label="Starting password"
                hint="Leave blank and one is generated for you. They should change it after signing in."
              >
                <Input name="password" />
              </Field>
            )}

            {state.error && <p className="text-sm text-alert-700">{state.error}</p>}
            {state.ok && (
              <p className="rounded-md border border-sabz-700/25 bg-sabz-100 px-3 py-2 text-sm text-sabz-700">
                {state.ok}
              </p>
            )}

            <Save editing={Boolean(editing)} />
          </form>
        </Card>
      </div>
    </div>
  );
}
