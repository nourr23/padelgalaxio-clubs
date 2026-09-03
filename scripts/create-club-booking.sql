-- Club-side court bookings (clubs web app). Player app ignores booked_by_club.

alter table public.games
  add column if not exists booked_by_club boolean not null default false;

create or replace function public.create_club_booking(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_court record;
  v_game_id uuid;
begin
  if not public.is_club_manager_for_court(p_court_id) then
    raise exception 'Not allowed to book this court';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'End time must be after start time';
  end if;

  select c.id, c.is_active, c.club_id
  into v_court
  from public.courts c
  where c.id = p_court_id;

  if not found then
    raise exception 'Court not found';
  end if;

  if not v_court.is_active then
    raise exception 'Court is not available for booking';
  end if;

  insert into public.games (
    created_by_user_id,
    court_id,
    starts_at,
    ends_at,
    status,
    source_type,
    notes,
    booked_by_club
  )
  values (
    auth.uid(),
    p_court_id,
    p_starts_at,
    p_ends_at,
    'full',
    'internal',
    nullif(trim(p_notes), ''),
    true
  )
  returning id into v_game_id;

  return v_game_id;
end;
$$;

create or replace function public.cancel_club_booking(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
begin
  select g.id, g.court_id, g.booked_by_club, g.status
  into v_game
  from public.games g
  where g.id = p_game_id;

  if not found then
    raise exception 'Booking not found';
  end if;

  if not v_game.booked_by_club then
    raise exception 'Only club bookings can be cancelled this way';
  end if;

  if not public.is_club_manager_for_court(v_game.court_id) then
    raise exception 'Not allowed to cancel this booking';
  end if;

  if v_game.status = 'cancelled' then
    return;
  end if;

  perform public._cancel_game(p_game_id);
end;
$$;

create or replace function public.notify_club_owner_on_game_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_court_name text;
  v_club_name text;
  v_starts_label text;
begin
  if new.court_id is null or new.status = 'cancelled' or new.booked_by_club then
    return new;
  end if;

  select cl.owner_user_id, c.name, cl.name
  into v_owner_id, v_court_name, v_club_name
  from public.courts c
  join public.clubs cl on cl.id = c.club_id
  where c.id = new.court_id;

  if v_owner_id is null then
    return new;
  end if;

  v_starts_label := to_char(new.starts_at at time zone 'UTC', 'Mon DD, HH12:MI AM');

  perform public._insert_club_notification(
    v_owner_id,
    'club_new_booking',
    'New booking on ' || coalesce(v_court_name, 'court'),
    coalesce(v_club_name, 'Your club') || ' · ' || v_starts_label,
    jsonb_build_object(
      'gameId', new.id,
      'courtId', new.court_id,
      'from', to_char(new.starts_at at time zone 'UTC', 'YYYY-MM-DD')
    ),
    new.created_by_user_id
  );

  return new;
end;
$$;

create or replace function public.notify_club_owner_on_game_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_court_name text;
  v_club_name text;
  v_starts_label text;
begin
  if new.court_id is null or new.booked_by_club then
    return new;
  end if;

  if not (new.status = 'cancelled' and old.status is distinct from 'cancelled') then
    return new;
  end if;

  select cl.owner_user_id, c.name, cl.name
  into v_owner_id, v_court_name, v_club_name
  from public.courts c
  join public.clubs cl on cl.id = c.club_id
  where c.id = new.court_id;

  if v_owner_id is null then
    return new;
  end if;

  v_starts_label := to_char(new.starts_at at time zone 'UTC', 'Mon DD, HH12:MI AM');

  perform public._insert_club_notification(
    v_owner_id,
    'club_game_cancelled',
    'Booking cancelled on ' || coalesce(v_court_name, 'court'),
    coalesce(v_club_name, 'Your club') || ' · ' || v_starts_label,
    jsonb_build_object(
      'gameId', new.id,
      'courtId', new.court_id,
      'from', to_char(new.starts_at at time zone 'UTC', 'YYYY-MM-DD')
    ),
    new.created_by_user_id
  );

  return new;
end;
$$;
