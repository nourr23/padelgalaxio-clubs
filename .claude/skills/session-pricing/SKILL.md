---
name: session-pricing
description: Build or change the club-owner screens for court session prices (by weekday, time range and court) and the booking window (how many days ahead players can book). Use when the user says "/session-pricing", "session prices", "court prices", "pricing rules", "peak / off-peak price", "weekend price", "booking window", or "how many days ahead players can book".
---

# Session pricing + booking window (club owner app)

The player app (`../players-coachs-app`, branch `court-session-prices`) already **reads** prices and the booking window. This repo is where the club owner **sets** them.

## Before writing code

1. **Branch**: create a new branch off `develop` (e.g. `session-pricing`). If the working tree has uncommitted changes, stop and ask the user. Never build on top of someone else's uncommitted work, and never commit to `implementing-dashboard` or `master`.
2. Read `AGENTS.md`: this Next.js version has breaking changes, so check `node_modules/next/dist/docs/` before writing routes, pages or server actions.
3. Read `.cursor/rules/*.mdc` (feature structure, Supabase + Next.js, domain model). In short: zod validation in `src/features/<domain>/validation.ts`, UI in `src/components/<domain>/`, forms with react-hook-form + zodResolver, show the Supabase error message, no empty catch blocks.

## Database

- **Dev** project `bdgrzvgjvdaoqvlfcbfg`: the only one to use.
- **Prod** `nzwlexwjzvrtvjbnctel`: in review. **Do not touch it**, not even reads.
- Never write to the DB yourself. If schema is missing, paste the SQL in chat for the user to run in the dev SQL Editor (never create a `.sql` file).

### `public.court_session_prices` (exists in dev)

| column | type | meaning |
|---|---|---|
| `id` | uuid pk | |
| `court_id` | uuid → `courts.id` on delete cascade | one row = one rule for one court |
| `from_time` | time | start of range, **inclusive**, club local time |
| `to_time` | time | end of range, **exclusive**; `check (from_time < to_time)` |
| `days_of_week` | smallint[] null | 0=Sun, 1=Mon … 6=Sat; `null` = every day |
| `price` | numeric(10,2) | `>= 0` |
| `currency` | text | default `'TND'` |
| `created_at`, `updated_at` | timestamptz | |

RLS: `court_session_prices_select_all` lets anon and authenticated users read. `court_session_prices_club_owner_write` allows all writes when `courts.club_id → clubs.owner_user_id = auth.uid()`.

### `public.clubs.booking_window_days` smallint null

`1..365`; `null` = no limit; `N` = today + the next `N-1` days (14 → today plus 13 days). The DB trigger `games_enforce_booking_window` rejects player bookings beyond it with `Bookings open only N days ahead.`. Games created by the club (`booked_by_club = true`) are exempt.

If the column or trigger is missing in dev, give the user this SQL:

```sql
alter table public.clubs
  add column if not exists booking_window_days smallint null
  check (booking_window_days between 1 and 365);

create or replace function public.enforce_booking_window()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare window_days smallint; club_tz text;
begin
  if coalesce(new.booked_by_club, false) or new.court_id is null then return new; end if;
  select cl.booking_window_days, coalesce(nullif(cl.timezone, ''), 'UTC')
    into window_days, club_tz
    from public.courts c join public.clubs cl on cl.id = c.club_id where c.id = new.court_id;
  if window_days is null then return new; end if;
  if (new.starts_at at time zone club_tz)::date > (now() at time zone club_tz)::date + (window_days - 1) then
    raise exception using message = format('Bookings open only %s days ahead.', window_days);
  end if;
  return new;
end; $$;

drop trigger if exists games_enforce_booking_window on public.games;
create trigger games_enforce_booking_window
  before insert or update of starts_at on public.games
  for each row execute function public.enforce_booking_window();
```

### How the player app picks a price (the editor must match this)

For a slot on court C starting at time T on date D, the app takes the rule for court C where `from_time <= T < to_time`. A rule whose `days_of_week` contains D's weekday **wins over** an every-day (`null`) rule. No match = no price shown. **Only the start time counts.** A slot from 16:30 to 18:00 uses the price of the range that contains 16:30.

## What to build

Follow the existing patterns: `src/features/courts/{actions,queries,validation}.ts`, `src/features/clubs/{actions,validation}.ts`, `src/components/clubs/club-settings-form.tsx`, `src/components/courts/courts-management.tsx`.

1. **`src/features/pricing/validation.ts`**: zod schema for a *rule group* the owner edits:
   `{ days: number[] (empty = every day), from: "HH:MM", to: "HH:MM", price: number >= 0, target: "all" | "indoor" | "outdoor" | { courtIds: string[] } }`.
   Checks: `from < to`; inside the club's `first_slot_start`..`last_session_end`; no two groups overlap on the same court and the same day. An every-day group and a specific-days group *may* overlap, because the specific one wins; say so in the UI. Reuse `timeHmm` and `toDisplayTime` from `src/features/clubs/validation.ts`.
2. **`src/features/pricing/queries.ts`**: load the club's active courts and their `court_session_prices` rows. Group the rows back into rule groups (same days, from, to, price), then map the set of courts back to `all` / `indoor` / `outdoor` / specific courts.
3. **`src/features/pricing/actions.ts`** (`"use server"`): `saveClubPricing(clubId, groups)`. Use the same ownership guard as `assertClubOwner` in `src/features/courts/actions.ts`. Validate, delete the rows for the club's courts, insert one row per (group × matching active court), then `revalidatePath` the pricing page and `/dashboard`. Return `{ ok: true } | { ok: false, error, fieldErrors? }` like the other actions.
4. **`src/components/pricing/pricing-editor.tsx`**: a react-hook-form `useFieldArray` of groups. Each group has:
   - day chips Mon … Sun, plus shortcuts "Weekdays" (`1–5`), "Weekend" (`0,6`), "Every day";
   - from/to time inputs;
   - a price input (TND);
   - a court target picker (All / Indoor / Outdoor / pick courts).

   Under the form, show a **preview table**: rows = the club's slots (from `first_slot_start`, every `slot_duration_minutes`, while the slot still ends by `last_session_end`), columns = Mon … Sun, cell = price for the chosen court type. Highlight cells with no price.
5. **Page**: `app/(dashboard)/dashboard/pricing/page.tsx`, with the same access pattern as `app/(dashboard)/dashboard/settings/page.tsx`. Add a "Pricing" link wherever the dashboard nav lists Courts and Settings.
6. **Booking window** on the existing settings form: add `booking_window_days` to `clubSettingsSchema` (optional int 1–365, empty → `null`), to `updateClubSettings` in `src/features/clubs/actions.ts`, and to `src/components/clubs/club-settings-form.tsx`. Use a **plain number input**, "Booking window (days)", with help text "Players can book up to N days ahead. Leave empty for no limit." No presets: the owner types the number.
7. **Types**: add `court_session_prices` and `clubs.booking_window_days` to `src/types/database.ts`.

## Example to test with (dev)

Indoor courts: Mon–Fri 08:00–17:00 = 80 TND, Mon–Fri 17:00–close = 100 TND, Sat–Sun all day = 120 TND. Booking window 14 days.
Expected: the preview shows 80/100 on weekdays and 120 on the weekend. In the player app, the same slots show the same prices, and days after today+13 are hidden.

## Done when

- an owner can create, edit and delete price groups and set or clear the booking window on dev;
- `pnpm lint` and `pnpm build` pass;
- you report the branch name and the files changed. Commit or push only if the user asks.
