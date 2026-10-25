"use client";

import { deleteGathering } from "./actions";
import { Button, LinkButton } from "@/components/ui";

export default function GatheringActions({ id }: { id: number }) {
  return (
    <div className="mt-2 flex flex-wrap justify-end gap-1">
      <LinkButton href={`/calendar?edit=${id}`} variant="ghost" size="sm">
        Edit
      </LinkButton>
      <form
        action={deleteGathering}
        onSubmit={(e) => {
          if (!confirm("Remove this gathering from the calendar? Sponsorship requests for this date will also be removed.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Delete
        </Button>
      </form>
    </div>
  );
}
