"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { commitDonorImport, previewDonorImport, type ImportCommit, type ImportPreview } from "./import-actions";
import { Button, Card, Table, Td, Th } from "@/components/ui";
import { money } from "@/lib/format";
import type { ImportRow } from "@/lib/donor-import-types";

function PreviewButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Reading file…" : "Preview import"}
    </Button>
  );
}

function CommitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" disabled={pending}>
      {pending ? "Importing…" : `Import ${count} donors`}
    </Button>
  );
}

export default function ImportDesk() {
  const [preview, previewAction] = useActionState<ImportPreview, FormData>(previewDonorImport, {});
  const [commit, commitAction] = useActionState<ImportCommit, FormData>(commitDonorImport, {});
  const ready = preview.ready ?? [];
  const skipped = preview.skipped ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-xl font-bold text-primary">Upload the old register</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Accepts the Al Sadiq Excel layout: membership number, name and mobile on a three-column
          sheet, or a headed sheet with Name, Phone, Address, CNIC, monthly totals and City. Existing
          donors (same mobile) are skipped so nothing is overwritten by accident.
        </p>
        <form action={previewAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
          />
          <PreviewButton />
        </form>
        {preview.error && (
          <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {preview.error}
          </p>
        )}
      </Card>

      {ready.length > 0 && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-bold text-primary">
                {ready.length} donors ready
              </h2>
              <p className="text-sm text-muted-foreground">
                {skipped.length ? `${skipped.length} rows skipped. ` : ""}
                Sheets: {(preview.sheets ?? []).join(", ") || "—"}
              </p>
            </div>
            <form action={commitAction}>
              <input type="hidden" name="payload" value={JSON.stringify(ready)} />
              <CommitButton count={ready.length} />
            </form>
          </div>
          {commit.error && (
            <p className="mx-5 mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {commit.error}
            </p>
          )}
          {commit.created != null && (
            <p className="mx-5 mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
              Imported {commit.created}. Skipped {commit.skippedExisting ?? 0} already in the system.
              {commit.failed ? ` ${commit.failed} failed.` : ""}
            </p>
          )}
          <Table>
            <thead>
              <tr>
                <Th>Membership #</Th>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>City</Th>
                <Th align="right">Amount donated</Th>
              </tr>
            </thead>
            <tbody>
              {ready.slice(0, 25).map((r: ImportRow) => (
                <tr key={`${r.sheet}-${r.row}`}>
                  <Td className="code text-xs">{r.membershipNo || "—"}</Td>
                  <Td>
                    {r.fullName}
                    {r.profession ? <span className="block text-xs text-muted-foreground">{r.profession}</span> : null}
                  </Td>
                  <Td className="code text-xs">{r.mobile}</Td>
                  <Td>{r.city || "—"}</Td>
                  <Td align="right" className="tnum">
                    {r.amount ? money(r.amount) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {ready.length > 25 && (
            <p className="px-5 py-3 text-sm text-muted-foreground">
              Showing the first 25 of {ready.length}. All {ready.length} will be imported.
            </p>
          )}
        </Card>
      )}

      {skipped.length > 0 && ready.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold">Skipped rows</h2>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground">
            {skipped.slice(0, 40).map((s) => (
              <li key={`${s.sheet}-${s.row}`}>
                {s.sheet} row {s.row}: {s.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
