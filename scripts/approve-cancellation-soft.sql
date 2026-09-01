-- Admin approval cancels the game (status = 'cancelled'), same as host delete in the player app.
-- No hard delete on approve.

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

create or replace function public.request_game_deletion(
  p_game_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
  v_request_id uuid;
begin
  select g.id, g.court_id, g.status, c.club_id
  into v_game
  from public.games g
  join public.courts c on c.id = g.court_id
  where g.id = p_game_id;

  if not found then
    raise exception 'Game not found';
  end if;

  if not public.is_club_manager_for_court(v_game.court_id) then
    raise exception 'Not allowed to request cancellation for this game';
  end if;

  if v_game.status::text not in ('open', 'full') then
    raise exception 'This game can no longer be cancelled';
  end if;

  if exists (
    select 1
    from public.game_deletion_requests r
    where r.game_id = p_game_id
      and r.status = 'pending'
  ) then
    raise exception 'A cancellation request is already pending for this game';
  end if;

  insert into public.game_deletion_requests (
    game_id,
    club_id,
    requested_by_user_id,
    reason,
    status
  )
  values (
    p_game_id,
    v_game.club_id,
    auth.uid(),
    nullif(trim(p_reason), ''),
    'pending'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;
