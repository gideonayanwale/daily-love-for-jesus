-- ==============================================================================
-- Daily Love For Jesus - Supabase PostgreSQL Schema
-- Run this script in the Supabase Dashboard SQL Editor
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── 1. Users Table (Linked with Supabase Auth) ──────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(320),
  name varchar(255),
  avatar text,
  role varchar(50) default 'user' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_sign_in_at timestamptz default now() not null
);

-- Index on role for permission checks
create index if not exists idx_users_role on public.users(role);

-- Enable RLS
alter table public.users enable row level security;

-- Users RLS policies
create policy "Users can view their own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id);

-- Trigger to auto-sync auth.users to public.users on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar, role, last_sign_in_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'user',
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    avatar = coalesce(excluded.avatar, public.users.avatar),
    last_sign_in_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 2. Bible Books ──────────────────────────────────────────────────────────
create table if not exists public.bible_books (
  id serial primary key,
  book_number int not null unique,
  name varchar(100) not null,
  short_name varchar(20) not null,
  testament varchar(10) not null check (testament in ('old', 'new')),
  genre varchar(50),
  chapters int not null,
  "order" int not null
);

create index if not exists idx_bible_books_testament on public.bible_books(testament);
create index if not exists idx_bible_books_order on public.bible_books("order");

alter table public.bible_books enable row level security;
create policy "Bible books are publicly viewable"
  on public.bible_books for select
  to public
  using (true);

-- ─── 3. Bible Verses ─────────────────────────────────────────────────────────
create table if not exists public.bible_verses (
  id serial primary key,
  book_id bigint not null references public.bible_books(id) on delete cascade,
  book_number int not null,
  chapter int not null,
  verse int not null,
  text text not null
);

create index if not exists idx_bible_verses_book_chapter on public.bible_verses(book_number, chapter);
create index if not exists idx_bible_verses_book_id on public.bible_verses(book_id);

alter table public.bible_verses enable row level security;
create policy "Bible verses are publicly viewable"
  on public.bible_verses for select
  to public
  using (true);

-- ─── 4. Hymns ────────────────────────────────────────────────────────────────
create table if not exists public.hymns (
  id serial primary key,
  hymn_number int not null,
  title varchar(255) not null,
  author varchar(255),
  composer varchar(255),
  meter varchar(100),
  key varchar(50),
  stanzas jsonb not null,
  chorus text,
  category varchar(100)
);

create index if not exists idx_hymns_number on public.hymns(hymn_number);
create index if not exists idx_hymns_category on public.hymns(category);

alter table public.hymns enable row level security;
create policy "Hymns are publicly viewable"
  on public.hymns for select
  to public
  using (true);

-- ─── 5. Devotionals ──────────────────────────────────────────────────────────
create table if not exists public.devotionals (
  id serial primary key,
  title varchar(500) not null,
  scripture varchar(500),
  scripture_text text,
  body text not null,
  reflection text,
  prayer text,
  author varchar(255),
  source varchar(50) default 'manual' not null check (source in ('telegram', 'manual', 'api')),
  telegram_message_id bigint,
  devotional_date timestamptz default now() not null,
  is_published boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_devotionals_date on public.devotionals(devotional_date);
create index if not exists idx_devotionals_published on public.devotionals(is_published);

alter table public.devotionals enable row level security;
create policy "Published devotionals are publicly viewable"
  on public.devotionals for select
  to public
  using (is_published = true);

-- ─── 6. Telegram Messages ────────────────────────────────────────────────────
create table if not exists public.telegram_messages (
  id serial primary key,
  message_id bigint not null,
  chat_id bigint not null,
  chat_title varchar(500),
  sender_id bigint,
  sender_name varchar(255),
  text text not null,
  media_url text,
  processed boolean default false not null,
  devotional_id bigint,
  received_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_telegram_msg on public.telegram_messages(message_id, chat_id);
create index if not exists idx_telegram_processed on public.telegram_messages(processed);

alter table public.telegram_messages enable row level security;

-- ─── 7. User Favorites ───────────────────────────────────────────────────────
create table if not exists public.user_favorites (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type varchar(50) not null check (type in ('verse', 'hymn', 'devotional')),
  item_id bigint not null,
  reference varchar(500),
  created_at timestamptz default now() not null
);

create index if not exists idx_user_favorites_user_type on public.user_favorites(user_id, type);
create index if not exists idx_user_favorites_user_item on public.user_favorites(user_id, item_id);

alter table public.user_favorites enable row level security;

create policy "Users can view their own favorites"
  on public.user_favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their own favorites"
  on public.user_favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.user_favorites for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─── 8. User Reading Progress ────────────────────────────────────────────────
create table if not exists public.user_reading_progress (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  book_id bigint not null references public.bible_books(id) on delete cascade,
  chapter int not null,
  last_verse int default 0,
  completed boolean default false not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_reading_progress_user_book on public.user_reading_progress(user_id, book_id);

alter table public.user_reading_progress enable row level security;

create policy "Users can view their reading progress"
  on public.user_reading_progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can upsert their reading progress"
  on public.user_reading_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
