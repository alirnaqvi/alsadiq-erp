import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { notes, users } from "@/db/schema";
import { dateTime } from "@/lib/format";
import { Button, Textarea } from "@/components/ui";
import { addNote } from "@/app/(app)/receipts/actions";

/**
 * The brief calls this a "chatter" — a running thread on each record where
 * references and explanations are kept with the transaction itself.
 */
export default async function NoteThread({
  entityType,
  entityId,
}: {
  entityType: "donation" | "donor";
  entityId: number;
}) {
  const rows = await db
    .select({
      id: notes.id,
      body: notes.body,
      createdAt: notes.createdAt,
      author: users.fullName,
    })
    .from(notes)
    .innerJoin(users, eq(notes.authorId, users.id))
    .where(and(eq(notes.entityType, entityType), eq(notes.entityId, entityId)))
    .orderBy(desc(notes.createdAt));

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink-900">Discussion</h2>
      <p className="mt-0.5 text-xs text-ink-500">
        Notes stay attached to this record and are visible to anyone who can see it.
      </p>

      <form action={addNote} className="mt-3">
        <input type="hidden" name="entityType" value={entityType} />
        <input type="hidden" name="entityId" value={entityId} />
        <Textarea
          name="body"
          rows={2}
          required
          placeholder="Add a note — a reference, a correction, anything worth recording"
        />
        <Button type="submit" size="sm" variant="secondary" className="mt-2">
          Add note
        </Button>
      </form>

      {rows.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          {rows.map((n) => (
            <li key={n.id}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium text-ink-800">{n.author}</span>
                <span className="tnum text-xs text-ink-500">{dateTime(n.createdAt)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
