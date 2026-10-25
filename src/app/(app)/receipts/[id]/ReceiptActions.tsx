"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { voidReceipt, markCleared, type VoidState } from "../actions";
import { Button, Textarea } from "@/components/ui";

export default function ReceiptActions({
  id,
  status,
  canVoid,
  startNext,
}: {
  id: number;
  status: string;
  canVoid: boolean;
  startNext: boolean;
}) {
  const router = useRouter();
  const [showVoid, setShowVoid] = useState(false);
  const [state, formAction] = useActionState<VoidState, FormData>(voidReceipt, {});

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {startNext && (
          <Button variant="secondary" onClick={() => router.push("/collect")}>
            Next entry
          </Button>
        )}

        {status === "pending" && canVoid && (
          <form action={markCleared}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="secondary">
              Mark as cleared
            </Button>
          </form>
        )}

        {status !== "void" && canVoid && !showVoid && (
          <Button variant="danger" onClick={() => setShowVoid(true)}>
            Void this receipt
          </Button>
        )}
      </div>

      {status !== "void" && canVoid && showVoid && (
        <form action={formAction} className="max-w-xl rounded-md border border-alert-700/25 bg-alert-100/60 p-3">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm font-medium text-alert-700">Void this receipt</p>
          <p className="mt-1 text-xs text-ink-700">
            The receipt stays in the records, marked void, with your reason attached.
          </p>
          <Textarea
            name="reason"
            rows={2}
            required
            className="mt-2 bg-white"
            placeholder="Why is this being voided?"
          />
          {state.error && <p className="mt-1 text-xs text-alert-700">{state.error}</p>}
          <div className="mt-2 flex gap-2">
            <Button type="submit" variant="danger" size="sm">
              Confirm void
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowVoid(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
