-- Helps Supabase Realtime filters on UPDATE/DELETE for notifications.
alter table public.notifications replica identity full;
