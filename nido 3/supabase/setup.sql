-- =====================================================================
-- NIDO DATABASE SETUP
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to read top to bottom: each section explains what it does.
--
-- Security model in plain words:
--   * Only people who are logged in can see anything at all.
--   * You can only create, edit, or delete YOUR OWN posts, comments,
--     reactions, recipes, events, and profile.
--   * Nobody can sign up without a valid family invite code.
--   * Photos are private and only reachable by logged in family.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. INVITE CODES
-- Sign up only works with a code from this table. The app can never
-- read this table, so codes cannot be peeked at.
-- ---------------------------------------------------------------------
create table public.invite_codes (
  code text primary key,
  note text,                         -- who it is for, just a reminder
  created_at timestamptz default now()
);

-- CHANGE THIS to your own secret code before sharing the link!
insert into public.invite_codes (code, note) values ('CHANGE-ME-FAMILIA', 'first family code');


-- ---------------------------------------------------------------------
-- 2. PROFILES: one row per person
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_path text,
  bio text default '' check (char_length(bio) <= 200),
  birthday text check (birthday ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),  -- month-day only, like 11-08
  app_palette text,                  -- their app color scheme; empty means "show the welcome setup"
  app_mode text default 'auto' check (app_mode in ('light', 'dark', 'auto')),
  mood_emoji text default '',        -- optional emoji for "What's up"
  mood_text text default '' check (char_length(mood_text) <= 100),
  mood_updated_at timestamptz default now(),
  theme jsonb default '{}'::jsonb,   -- personal page design choices
  created_at timestamptz default now()
);


-- ---------------------------------------------------------------------
-- 3. POSTS, COMMENTS, REACTIONS
-- ---------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null check (kind in ('status', 'photo')),
  body text default '' check (char_length(body) <= 500),
  image_path text,
  card_color text,
  created_at timestamptz default now()
);
create index posts_created_idx on public.posts (created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);

create table public.reactions (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  emoji text not null,
  primary key (post_id, user_id, emoji)
);


-- ---------------------------------------------------------------------
-- 4. RECIPE BOX
-- Ingredients and steps are plain text, one item per line.
-- ---------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  from_whom text check (char_length(from_whom) <= 40),   -- "Abuela Rosa"
  category text default 'other',
  total_time text check (char_length(total_time) <= 30),
  servings text check (char_length(servings) <= 30),
  ingredients text not null check (char_length(ingredients) <= 4000),
  steps text not null check (char_length(steps) <= 6000),
  story text default '' check (char_length(story) <= 600),
  image_path text,
  created_at timestamptz default now()
);


-- ---------------------------------------------------------------------
-- 5. FAMILY CALENDAR
-- Birthdays come from profiles. This table is for everything else.
-- "yearly" events (anniversaries) show up every year on the same day.
-- ---------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  emoji text default '🎉',
  event_date date not null,
  event_time time,
  note text default '' check (char_length(note) <= 120),
  yearly boolean default false,
  created_at timestamptz default now()
);


-- ---------------------------------------------------------------------
-- 6. WHEN SOMEONE SIGNS UP: check the invite code, then make a profile.
-- If the code is wrong, the whole sign up is cancelled.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.invite_codes
    where code = new.raw_user_meta_data ->> 'invite_code'
  ) then
    raise exception 'Invalid invite code';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Family member'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 7. SECURITY RULES (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.invite_codes enable row level security;  -- no rules = nobody can read it from the app
alter table public.profiles   enable row level security;
alter table public.posts      enable row level security;
alter table public.comments   enable row level security;
alter table public.reactions  enable row level security;
alter table public.recipes    enable row level security;
alter table public.events     enable row level security;

-- Let the app reach these tables at all. (Needed if "Automatically
-- expose new tables" was turned off when the project was created;
-- harmless if it was on.) The rules below still decide WHO can do what.
-- invite_codes is left out on purpose, so the app can never read it.
grant usage on schema public to authenticated;
grant select, update                 on public.profiles  to authenticated;
grant select, insert, update, delete on public.posts     to authenticated;
grant select, insert, delete         on public.comments  to authenticated;
grant select, insert, delete         on public.reactions to authenticated;
grant select, insert, update, delete on public.recipes   to authenticated;
grant select, insert, update, delete on public.events    to authenticated;

-- Logged in family can see everything below
create policy "family can view profiles"  on public.profiles  for select to authenticated using (true);
create policy "family can view posts"     on public.posts     for select to authenticated using (true);
create policy "family can view comments"  on public.comments  for select to authenticated using (true);
create policy "family can view reactions" on public.reactions for select to authenticated using (true);
create policy "family can view recipes"   on public.recipes   for select to authenticated using (true);
create policy "family can view events"    on public.events    for select to authenticated using (true);

-- Everyone controls only their own things
create policy "edit own profile"     on public.profiles  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "create own posts"     on public.posts     for insert to authenticated with check (author_id = auth.uid());
create policy "edit own posts"       on public.posts     for update to authenticated using (author_id = auth.uid());
create policy "delete own posts"     on public.posts     for delete to authenticated using (author_id = auth.uid());

create policy "create own comments"  on public.comments  for insert to authenticated with check (author_id = auth.uid());
create policy "delete own comments"  on public.comments  for delete to authenticated using (author_id = auth.uid());

create policy "add own reactions"    on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy "remove own reactions" on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy "add own recipes"      on public.recipes   for insert to authenticated with check (author_id = auth.uid());
create policy "edit own recipes"     on public.recipes   for update to authenticated using (author_id = auth.uid());
create policy "delete own recipes"   on public.recipes   for delete to authenticated using (author_id = auth.uid());

create policy "add own events"       on public.events    for insert to authenticated with check (author_id = auth.uid());
create policy "edit own events"      on public.events    for update to authenticated using (author_id = auth.uid());
create policy "delete own events"    on public.events    for delete to authenticated using (author_id = auth.uid());


-- ---------------------------------------------------------------------
-- 8. PHOTO STORAGE (private bucket)
-- Each person uploads into a folder named after their own user id.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "family can view photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos');

create policy "upload into own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);


-- =====================================================================
-- HANDY COMMANDS FOR LATER (run one at a time when needed)
-- =====================================================================
-- Add a new invite code:
--   insert into public.invite_codes (code, note) values ('TIOS-2027', 'for the cousins');
--
-- Turn off an old code (people already signed up stay signed up):
--   delete from public.invite_codes where code = 'CHANGE-ME-FAMILIA';
--
-- See who has joined:
--   select display_name, created_at from public.profiles order by created_at;
