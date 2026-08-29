# Al Sadiq Trust — Collection System (Phase 1)

Donor collection, receipting and reporting for Al Sadiq Trust.

This is **Phase 1** of the wider ERP. It covers the user/role/hierarchy
foundation and the whole collection side. Later phases (expenses, HR, Azadari
share, assets and inventory) build on the same database and login system.

All source code and documentation in this repository are the property of
Al Sadiq Trust.

---

## What it does

**Users, roles and hierarchy** — built first, as the trust asked. Four roles
ship by default: Administrator, Area Manager, Data Entry Operator and Auditor.
A role is a set of permissions plus a data scope: `own`, `team` or `all`. Every
user can be given a manager, and a manager sees the collection of everyone
reporting to them, however many levels down. Roles and permissions are edited
from inside the app; no code change is needed to add or restrict access.

**Collection counter** — the screen staff use all day. Type a mobile number and
the donor appears with their last donation and lifetime total. An unrecognised
number opens inline registration, so a new donor and their first receipt are one
action. Quick-amount buttons, grouped collection heads, and Ctrl+Enter to save.
A live receipt preview sits beside the form showing exactly what will print.

**Donors** — unique by mobile number, with an auto-generated ID (`ASD-00001`), an
optional field for the old register number, CNIC, address and a note for when a
family shares one phone. Search by name, number, donor ID, old number or CNIC.

**Receipts** — auto-numbered per year (`R2026-00001`), printable on an 80mm
thermal roll, sendable on WhatsApp or email. Cash is recorded as received;
cheques are recorded as *pending clearance* until someone marks them cleared, so
the cash position is never overstated. Nothing is ever deleted — a wrong entry is
voided with a written reason and stays in the record.

**Monthly membership** — a donor commits a monthly amount. The members screen
shows who has paid this month and who has not, with a one-tap WhatsApp reminder
per person.

**Reports** — day by day, by head, by event (naming every donor), by collector,
and by payment method. Each downloads as a formatted Excel file, as do the
receipts register and any individual donor's statement.

**Audit trail** — every sign-in, creation, edit, void and export is recorded with
who did it, when, from which IP, and the before/after state of the record.

**Discussion threads** — the "chatter" from the brief. Notes attach to a donor or
a receipt and stay with it.

Receipts show both Gregorian and Hijri dates, since the trust's collection heads
are named after Hijri occasions.

---

## Running it locally

Requires Node 20 or newer and a PostgreSQL database.

```bash
npm install
cp .env.example .env.local     # then fill in the two values
npm run db:migrate             # create the tables
npm run db:seed                # roles, admin login, placeholder heads
npm run dev                    # http://localhost:3000
```

Sign in as `admin`. The password is `AlSadiq@2026` unless you set
`SEED_ADMIN_PASSWORD` before seeding. **Change it immediately after the first
sign-in**, from Trust settings.

To load sample donors and receipts for a demonstration:

```bash
npm run db:seed:demo
```

That adds 28 donors, around 150 receipts spread over six weeks, 12 monthly
members, and four extra logins — `manager`, `counter1`, `counter2` and `auditor`,
all with the same password as admin. Sign in as `counter1` to see how much less
an operator can reach than an administrator. **Do not run the demo seed on the
trust's real database.**

---

## Deploying to Vercel

### 1. Create the database

Vercel's servers do not keep files between requests, so the database has to live
elsewhere. Any Postgres host works. The free tiers of
[Neon](https://neon.tech) or [Supabase](https://supabase.com) are more than
enough for the expected volume (1,500+ donors, ~200 receipts on a peak day).

Copy the **pooled** connection string — on Neon it is the one containing
`-pooler`. Serverless functions open many short connections, and the pooler is
what keeps that from exhausting the database.

### 2. Push to GitHub and import

Push this repository, then in Vercel choose **Add New → Project** and import it.
Framework detection and build settings need no changes.

### 3. Set the environment variables

In Vercel under **Settings → Environment Variables**, add both for Production,
Preview and Development:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the pooled Postgres connection string |
| `AUTH_SECRET` | a long random string — generate with `openssl rand -base64 32` |

`AUTH_SECRET` signs the login cookie. Changing it later signs everyone out,
which is the fastest way to end all sessions if a laptop goes missing.

### 4. Set up the database once

Vercel does not run migrations for you. From your own machine, with `.env.local`
pointing at the **production** database:

```bash
npm run db:migrate
npm run db:seed
```

Then deploy. Sign in as `admin` and change the password before showing anyone.

### 5. After changing the schema

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate   # writes a migration file into drizzle/
npm run db:migrate    # applies it
```

Commit the generated migration. Never edit a migration that has already run.

---

## How it is built

| | |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Drizzle ORM |
| Login | Signed HTTP-only cookie (`jose`), bcrypt password hashes |
| Excel | ExcelJS, generated on the server |

```
src/
  app/
    login/            sign-in screen and its actions
    (app)/            everything behind a login
      collect/        the collection counter
      receipts/       receipt list, detail, printing, voiding
      donors/         register, profile, editing
      members/        monthly membership
      reports/        five report views
      audit/          audit trail
      heads/          collection heads setup
      users/ roles/   people and permissions
      settings/       trust details shown on receipts
    api/export/       Excel downloads
  components/         shared UI, receipt strip, discussion thread
  db/                 schema, connection, seed script
  lib/                auth, permissions, audit, formatting, numbering
drizzle/              generated SQL migrations
```

### Notes for whoever maintains this

**Permissions** live in `src/lib/permissions.ts`. Add a key there, tick it on a
role in the app, and guard the new page with `requirePermission("your.key")`.
Server actions use `assertPermission`, which throws instead of redirecting.

**Data scope** is enforced in `scopeCondition` (`src/lib/queries.ts`), which adds
a WHERE clause based on the signed-in user's role. Any new query that reads
donations should apply it, or a counter operator will see the whole trust.

**Receipt and donor numbers** come from `src/lib/sequence.ts`. It uses a single
atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, tested with 300
simultaneous requests: all unique, no gaps. Safe with every counter typing at
once during Muharram.

**Mobile numbers** are normalised by `normaliseMobile` before saving or
comparing, so `0300-1234567`, `+923001234567` and `03001234567` are one donor.

**Printing** is handled by CSS. The rules at the bottom of `globals.css` hide
everything except the receipt column and set the page to 80mm. Any thermal
printer installed as a normal Windows printer will work — no drivers or extra
software. Print one test receipt and set the browser's margins to none.

---

## Decisions worth knowing about

**WhatsApp and email receipts use click-to-send links.** Pressing the button
opens WhatsApp with the receipt already written out, and the operator presses
send. This is free and works immediately. Fully automatic sending needs the
WhatsApp Business API, which costs money and requires Meta's approval — that can
be added later without changing anything else.

**Bank slip images are not uploaded yet.** The bank transfer and cheque fields
take a *link* to a scanned slip. Storing the image itself needs blob storage
(Vercel Blob is roughly one line of configuration) and is a small paid add-on, so
it was left as the trust's decision rather than assumed.

**Collection heads are placeholders.** The Majlis, Langar, Azadari, Zakat,
Welfare, Construction and Membership heads were invented to get the system
working. Replace them from Setup → Collection heads once the trust supplies its
real list. A head that already has receipts against it can be retired but not
deleted, so old receipts stay readable.

**Old donor data has not been imported.** The `legacy_code` column is ready to
hold each donor's number from the previous register. Once the trust sends its
Excel file, a one-off import script maps it in.

**Bank API reconciliation is out of scope**, as agreed.

---

## Still open with the trust

These were raised before the build and are not settled. None of them block Phase
1, but each may mean a change later.

1. The real list of collection heads and subheads.
2. The Excel template the accounts office wants reports to match. The current
   exports are a reasonable default, not their format.
3. Whether managers must *approve* an entry before it counts, or only review it.
   Today they review; approval would be a new step in the workflow.
4. Whether the counter must keep working when the internet drops during a
   crowded Majlis. Offline entry is a significant piece of work and is not built.
5. How many physical counters need a thermal printer.
6. Who owns and pays for the hosting and domain after handover.
