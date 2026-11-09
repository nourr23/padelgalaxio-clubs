---
name: coaching-packages
description: Build or change the club-owner screens for coaching packages (monthly group offers and per-session coaching for 1–4+ players) and for handling the coaching requests players send from the player app. Use when the user says "/coaching-packages", "coaching offers", "coaching packages", "coaching page", "coaching requests", "duo / trio / quadri price", "monthly coaching", or pastes a coaching poster to turn into packages.
---

# Coaching packages + requests (club owner app)

Each club creates its own coaching packages. The player app (`../players-coachs-app`, skill `coaching-packages` there) shows them and lets players **request** one. There's no booking or payment online yet; that waits for online payments. The club calls the player and moves the request through statuses here. Packages belong to the club and are not tied to a coach.

Typical poster, for Bardo Padel Club:
- Monthly, groups of 4: 150 TND for 4 sessions/month per person, 250 TND for 8 sessions/month per person.
- Per session (per group): individuel 70, duo 100 (50/person), trio 135 (45/person), quadri 160 (40/person).

## Before writing code

1. **Branch**: create a new branch off `develop` (e.g. `coaching-packages`). If the working tree has uncommitted changes, stop and ask the user. Never commit to `implementing-dashboard` or `master`.
2. Read `AGENTS.md`: this Next.js version has breaking changes, so check `node_modules/next/dist/docs/` before writing routes, pages or server actions.
3. Read `.cursor/rules/*.mdc`. In short: zod validation in `src/features/<domain>/validation.ts`, UI in `src/components/<domain>/`, forms with react-hook-form + zodResolver, show the Supabase error message, no empty catch blocks.

## Database

- **Dev** project `bdgrzvgjvdaoqvlfcbfg`: the only one to use.
- **Prod** `nzwlexwjzvrtvjbnctel`: **do not touch it**, not even reads. The coaching tables are not on prod yet.
- Never write to the DB yourself. If schema is missing or needs changing, paste the SQL in chat for the user to run in the dev SQL Editor (never create a `.sql` file).

### `public.coaching_packages` (exists in dev)

| column | type | meaning |
|---|---|---|
| `id` | uuid pk | |
| `club_id` | uuid → `clubs.id` on delete cascade | |
| `kind` | text `'monthly' \| 'per_session'` | |
| `title` | text null | optional label; the player app falls back to Individual/Duo/Trio/Quadri/"Group of N" |
| `group_size` | smallint 1..8 | |
| `sessions_per_month` | smallint 1..31 null | **required** for `monthly`, **must be null** for `per_session` (check `coaching_packages_monthly_sessions`) |
| `session_minutes` | smallint 15..240 null | |
| `price` | numeric(10,2) `> 0` | |
| `price_basis` | text `'per_person' \| 'per_group'` | what `price` means |
| `currency` | text default `'TND'` | |
| `description` | text null | |
| `is_active` | bool default true | inactive = hidden from players |
| `sort_order` | int default 0 | order within a kind |
| `created_at`, `updated_at` | timestamptz | `updated_at` set by trigger |

Derived figures, which are never stored: per person = per-group price ÷ `group_size`, per group = per-person price × `group_size`. The player app shows the stored basis as the big number and the other one as the secondary line, so the owner's input must match their poster.

RLS: `coaching_packages_select` lets anyone read active packages of active clubs, and the owner reads all of theirs. `coaching_packages_owner_write` allows all writes when `clubs.owner_user_id = auth.uid()`.

### `public.coaching_requests` (exists in dev)

| column | type | meaning |
|---|---|---|
| `id` | uuid pk | |
| `package_id` | uuid → `coaching_packages` cascade | |
| `club_id` | uuid → `clubs` | set by the insert trigger from the package |
| `player_user_id` | uuid → `profiles` | |
| `participants` | smallint 1..8 | ≤ the package's `group_size` |
| `note` | text ≤ 500 null | player's preferred times and partners |
| `status` | `pending`, `contacted`, `confirmed`, `declined`, `cancelled` | `cancelled` = by the player only |
| `club_note` | text ≤ 500 null | owner's note, shown to the player |
| `created_at`, `updated_at` | timestamptz | |

- **RLS:** the owner can select and update rows for their club.
- **Owner update guard:** the `coaching_requests_before_update` trigger allows the owner to change **only** `status` and `club_note`, and never to set `cancelled` (use `declined`). Show the trigger's error message as is.
- **Deleting packages:** a package delete cascades to its requests. If a package has requests, the UI must offer **Deactivate** rather than Delete, or confirm explicitly with the request count.
- **Notifications:** the `coaching_requests_notify` trigger writes `notifications` rows:
  - `club_coaching_request` to the owner when a player requests;
  - `club_coaching_cancelled` to the owner when the player cancels;
  - `coaching_request_update` to the player when the owner sets `contacted`/`confirmed`/`declined`.
  - `data` has `coachingRequestId` and `clubId`.

## What to build

Follow the pricing feature: `src/features/pricing/{actions,queries,validation}.ts`, `src/components/pricing/pricing-editor.tsx`, `app/(dashboard)/dashboard/pricing/page.tsx`, and the `assertClubOwner` guard in `src/features/pricing/actions.ts`.

1. **`src/features/coaching/validation.ts`**: zod `coachingPackageSchema`:
   - `{ kind, title?, groupSize 1..8, sessionsPerMonth?, sessionMinutes?, price > 0, priceBasis, description?, isActive }`;
   - `superRefine`: monthly requires `sessionsPerMonth`, and per-session forces it to `undefined`;
   - `requestStatusSchema` for `contacted | confirmed | declined | pending`, plus `clubNote` ≤ 500.
2. **`src/features/coaching/queries.ts`**:
   - `getClubCoachingPackages(clubId)`, ordered by kind then `sort_order`;
   - `getClubCoachingRequests(clubId, { status? })`, joined to `coaching_packages` and `profiles(full_name, phone?)`, newest first. Check which contact columns `profiles` really has in `src/types/database.ts` or dev;
   - `countPendingCoachingRequests(clubId)`.
3. **`src/features/coaching/actions.ts`** (`"use server"`):
   - `createCoachingPackage`, `updateCoachingPackage`, `setCoachingPackageActive`, `reorderCoachingPackages(kind, ids[])`, `deleteCoachingPackage`. Delete refuses when the package has requests unless `force`;
   - `updateCoachingRequest(id, { status, clubNote })`.
   - Each action uses the ownership guard and `revalidatePath`s `/dashboard/coaching` and `/dashboard`. Return `{ ok: true } | { ok: false, error, fieldErrors? }`.
4. **`src/components/coaching/coaching-packages-editor.tsx`**:
   - two groups, "Monthly offers" and "Per session". Each package is a card with kind, group size (chips 1/2/3/4 + "other"), sessions per month (monthly only), minutes, price with a per-person/per-group toggle, title, description and an active switch;
   - the card shows a **live preview** of the player-facing text: big price plus "4 sessions / month · per person" or "50 TND per person";
   - add, duplicate, reorder (up/down), deactivate, delete;
   - a "Quick start" button that pre-fills the poster's six example rows, which the owner then edits.
5. **`src/components/coaching/coaching-requests-table.tsx`**:
   - filter tabs Pending / Contacted / Confirmed / Closed (declined + cancelled);
   - columns: date, player, package label, participants, note, status select, club note, and `tel:` / `https://wa.me/<digits>` links when a phone exists;
   - cancelled rows are read-only.
6. **Page:** `app/(dashboard)/dashboard/coaching/page.tsx`, with the same access pattern as the pricing page. Show packages first, then requests (or two tabs). Add a "Coaching" link in `src/components/dashboard/dashboard-shell.tsx` next to Pricing, with a pending-count badge.
7. **Notifications:** in `src/features/notifications/resolve-href.ts`, add `club_coaching_request` and `club_coaching_cancelled` to `CLUB_NOTIFICATION_TYPES`, and route them to `/dashboard/coaching?request=<coachingRequestId>`.
8. **Types:** add `coaching_packages` and `coaching_requests` to `src/types/database.ts`, with no `as never` casts.

## Example to test with (dev)

- Use "Quick start" on a dev club, then save. Expect six active packages. The preview reads 150 / 250 per person monthly and 70 / 100 (50) / 135 (45) / 160 (40) per session.
- Send a request from the player app, or insert one in the dev SQL Editor. Expect:
  - it appears under Pending, the bell shows `club_coaching_request`, and the badge counts it;
  - setting it to Confirmed with a club note notifies the player;
  - setting it to Cancelled is rejected by the trigger.
- Deactivate a package and it disappears from the player app.

## Done when

- an owner can create, edit, reorder, deactivate and delete packages, and handle requests end to end on dev;
- `pnpm lint` and `pnpm build` pass;
- you report the branch name and the files changed. Commit or push only if the user asks.
