-- Club owner in-app notifications (shared notifications table)
-- Run once in Supabase SQL Editor (or via migration).

create or replace function public._insert_club_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    actor_user_id
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb),
    p_actor_user_id
  );
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
  if new.court_id is null or new.status = 'cancelled' then
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
  if new.court_id is null then
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

drop trigger if exists games_notify_club_owner_insert on public.games;
create trigger games_notify_club_owner_insert
  after insert on public.games
  for each row
  execute function public.notify_club_owner_on_game_insert();

drop trigger if exists games_notify_club_owner_cancelled on public.games;
create trigger games_notify_club_owner_cancelled
  after update of status on public.games
  for each row
  execute function public.notify_club_owner_on_game_cancelled();

create or replace function public.notify_club_owner_on_game_delete()
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
  v_title text;
  v_body text;
  v_has_pending_request boolean;
begin
  if old.court_id is null then
    return old;
  end if;

  select cl.owner_user_id, c.name, cl.name
  into v_owner_id, v_court_name, v_club_name
  from public.courts c
  join public.clubs cl on cl.id = c.club_id
  where c.id = old.court_id;

  if v_owner_id is null then
    return old;
  end if;

  v_starts_label := to_char(old.starts_at at time zone 'UTC', 'Mon DD, HH12:MI AM');

  select exists (
    select 1
    from public.game_deletion_requests r
    where r.game_id = old.id
      and r.status = 'pending'
  ) into v_has_pending_request;

  if v_has_pending_request then
    v_title := 'Booking removed on ' || coalesce(v_court_name, 'court');
    v_body := 'Your deletion request was approved · ' || v_starts_label;
  else
    v_title := 'Booking deleted on ' || coalesce(v_court_name, 'court');
    v_body := coalesce(v_club_name, 'Your club') || ' · ' || v_starts_label;
  end if;

  perform public._insert_club_notification(
    v_owner_id,
    'club_game_deleted',
    v_title,
    v_body,
    jsonb_build_object(
      'courtId', old.court_id,
      'from', to_char(old.starts_at at time zone 'UTC', 'YYYY-MM-DD')
    ),
    old.created_by_user_id
  );

  return old;
end;
$$;

drop trigger if exists games_notify_club_owner_delete on public.games;
create trigger games_notify_club_owner_delete
  before delete on public.games
  for each row
  execute function public.notify_club_owner_on_game_delete();

create or replace function public._cancel_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
begin
  select g.id, g.status, g.created_by_user_id, g.source_type
  into v_game
  from public.games g
  where g.id = p_game_id;

  if not found then
    return;
  end if;

  if v_game.status = 'cancelled' then
    return;
  end if;

  update public.games
  set status = 'cancelled'
  where id = p_game_id;

  delete from public.posts where game_id = p_game_id;
  delete from public.group_shared_posts where game_id = p_game_id;

  if v_game.source_type is distinct from 'external' and v_game.created_by_user_id is not null then
    begin
      perform public.revoke_club_booking_point(p_user_id := v_game.created_by_user_id);
    exception
      when others then
        raise notice 'revoke_club_booking_point failed: %', sqlerrm;
    end;
  end if;
end;
$$;

create or replace function public.approve_game_deletion_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
begin
  if not public.is_app_admin() then
    raise exception 'Only admins can approve cancellation requests';
  end if;

  select r.*, g.starts_at, g.court_id, g.status as game_status
  into v_request
  from public.game_deletion_requests r
  join public.games g on g.id = r.game_id
  where r.id = p_request_id
  for update of r;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  perform public._cancel_game(v_request.game_id);

  update public.game_deletion_requests
  set
    status = 'approved',
    resolved_at = now(),
    resolved_by_user_id = auth.uid()
  where id = p_request_id;
end;
$$;

create or replace function public.reject_game_deletion_request(
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_court_name text;
begin
  if not public.is_app_admin() then
    raise exception 'Only admins can reject deletion requests';
  end if;

  select r.*, g.court_id
  into v_request
  from public.game_deletion_requests r
  join public.games g on g.id = r.game_id
  where r.id = p_request_id
  for update of r;

  if not found then
    raise exception 'Pending request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  select c.name into v_court_name
  from public.courts c
  where c.id = v_request.court_id;

  update public.game_deletion_requests
  set
    status = 'rejected',
    resolved_at = now(),
    resolved_by_user_id = auth.uid(),
    reason = coalesce(nullif(trim(p_reason), ''), reason)
  where id = p_request_id;

  perform public._insert_club_notification(
    v_request.requested_by_user_id,
    'club_deletion_rejected',
    'Cancellation request declined',
    coalesce(
      nullif(trim(p_reason), ''),
      'Admin declined the request for ' || coalesce(v_court_name, 'court') || '.'
    ),
    jsonb_build_object('requestId', p_request_id, 'gameId', v_request.game_id)
  );
end;
$$;
