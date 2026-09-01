-- Fix: request_game_deletion compared status to 'draft', which is not in game_status enum.
-- Run once in Supabase SQL Editor.

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
