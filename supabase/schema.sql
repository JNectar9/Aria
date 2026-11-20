-- Run in Supabase: SQL Editor > New query
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text, created_at timestamptz default now());
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null, source_url text, paper_path text,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  verdict text check (verdict in ('reproduced','not_reproduced','incomplete','inconclusive')),
  reported_result text, measured_result text,
  created_at timestamptz default now());
alter table public.profiles enable row level security;
alter table public.verifications enable row level security;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own verifications" on public.verifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create function public.new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function public.new_user();
insert into storage.buckets (id, name, public) values ('papers','papers',false);
create policy "upload own papers" on storage.objects for insert to authenticated with check (bucket_id='papers' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "read own papers" on storage.objects for select to authenticated using (bucket_id='papers' and (storage.foldername(name))[1]=auth.uid()::text);
