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

-- ─── 9. Communities ──────────────────────────────────────────────────────────
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  slug varchar(100) not null unique,
  description text,
  logo text,
  cover_image text,
  contact_email varchar(320),
  contact_phone varchar(50),
  location varchar(255),
  timezone varchar(100) default 'UTC' not null,
  branding_settings jsonb,
  join_settings jsonb,
  status varchar(50) default 'active' not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_communities_slug on public.communities(slug);
create index if not exists idx_communities_status on public.communities(status);
alter table public.communities enable row level security;

create policy "Communities are viewable by members or public search"
  on public.communities for select
  to authenticated, anon
  using (status = 'active');

-- ─── 10. Community Members ───────────────────────────────────────────────────
create table if not exists public.community_members (
  id serial primary key,
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role varchar(50) default 'MEMBER' not null,
  status varchar(50) default 'active' not null,
  joined_at timestamptz default now() not null,
  invited_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  metadata jsonb,
  unique (community_id, user_id)
);

create index if not exists idx_comm_members_comm_user on public.community_members(community_id, user_id);
create index if not exists idx_comm_members_user on public.community_members(user_id);
alter table public.community_members enable row level security;

create policy "Community members can view member lists in their community"
  on public.community_members for select
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = public.community_members.community_id
        and cm.user_id = auth.uid()
    )
  );

-- ─── 11. Groups (Sunday School Classes / Small Groups) ────────────────────────
create table if not exists public.groups (
  id serial primary key,
  community_id uuid not null references public.communities(id) on delete cascade,
  name varchar(255) not null,
  slug varchar(100) not null,
  description text,
  group_image text,
  category varchar(100) default 'Sunday School' not null,
  join_method varchar(50) default 'code' not null,
  invite_code varchar(10) unique,
  qr_code_token varchar(64) unique,
  privacy_setting varchar(50) default 'public' not null,
  status varchar(50) default 'active' not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_groups_community on public.groups(community_id);
create index if not exists idx_groups_invite_code on public.groups(invite_code);
create index if not exists idx_groups_status on public.groups(status);
alter table public.groups enable row level security;

create policy "Users can view groups in their communities"
  on public.groups for select
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = public.groups.community_id
        and cm.user_id = auth.uid()
    )
  );

-- ─── 12. Group Memberships ───────────────────────────────────────────────────
create table if not exists public.group_members (
  id serial primary key,
  group_id int not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role varchar(50) default 'student' not null,
  status varchar(50) default 'active' not null,
  joined_at timestamptz default now() not null,
  invited_by uuid references public.users(id) on delete set null,
  unique (group_id, user_id)
);

create index if not exists idx_group_members_group_user on public.group_members(group_id, user_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group_role on public.group_members(group_id, role);
alter table public.group_members enable row level security;

create policy "Group members can view roster"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.group_members.group_id
        and gm.user_id = auth.uid()
    )
  );

-- ─── 13. Reading Logs (Granular Activity & Offline Batch Tracking) ───────────
create table if not exists public.reading_logs (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  group_id int references public.groups(id) on delete cascade,
  content_id varchar(100) not null,
  content_type varchar(50) default 'bible_chapter' not null,
  book_number int,
  chapter int,
  time_spent int default 0 not null,
  scroll_depth int default 100,
  completed_at timestamptz default now() not null,
  client_log_id varchar(100) unique,
  synced_at timestamptz default now() not null
);

create index if not exists idx_reading_logs_user_completed on public.reading_logs(user_id, completed_at);
create index if not exists idx_reading_logs_group_completed on public.reading_logs(group_id, completed_at);
create index if not exists idx_reading_logs_content on public.reading_logs(content_id);
alter table public.reading_logs enable row level security;

create policy "Users can view their own reading logs"
  on public.reading_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Teachers can view logs for their group"
  on public.reading_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.reading_logs.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('teacher', 'assistant_teacher')
    )
  );

create policy "Users can insert their own logs"
  on public.reading_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ─── 14. Announcements & Push Notifications ──────────────────────────────────
create table if not exists public.announcements (
  id serial primary key,
  group_id int not null references public.groups(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  title varchar(255) not null,
  body text not null,
  priority varchar(50) default 'normal' not null,
  announcement_type varchar(50) default 'general' not null,
  push_notification_sent boolean default false not null,
  status varchar(50) default 'published' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_announcements_group on public.announcements(group_id);
create index if not exists idx_announcements_created on public.announcements(created_at);
alter table public.announcements enable row level security;

create policy "Group members can view announcements"
  on public.announcements for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.announcements.group_id
        and gm.user_id = auth.uid()
    )
  );

-- ─── 15. Reading Assignments & Submissions ───────────────────────────────────
create table if not exists public.reading_assignments (
  id serial primary key,
  community_id uuid references public.communities(id) on delete cascade,
  group_id int not null references public.groups(id) on delete cascade,
  reading_plan_id int,
  title varchar(255) not null,
  description text,
  book_number int not null,
  chapter int not null,
  start_verse int,
  end_verse int,
  due_date timestamptz not null,
  is_required boolean default true not null,
  reflection_prompt text,
  status varchar(50) default 'published' not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_reading_assignments_group_due on public.reading_assignments(group_id, due_date);
alter table public.reading_assignments enable row level security;

create table if not exists public.assignment_submissions (
  id serial primary key,
  assignment_id int not null references public.reading_assignments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  group_id int not null references public.groups(id) on delete cascade,
  status varchar(50) default 'submitted' not null,
  notes text,
  teacher_feedback text,
  graded_by uuid references public.users(id) on delete set null,
  graded_at timestamptz,
  submitted_at timestamptz default now() not null,
  unique (assignment_id, user_id)
);

create index if not exists idx_submissions_assignment_user on public.assignment_submissions(assignment_id, user_id);
alter table public.assignment_submissions enable row level security;

-- ─── 16. Attendance Sessions & Records ───────────────────────────────────────
create table if not exists public.attendance_sessions (
  id serial primary key,
  group_id int not null references public.groups(id) on delete cascade,
  title varchar(255) not null,
  session_date timestamptz default now() not null,
  session_type varchar(50) default 'sunday_school' not null,
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists public.attendance_records (
  id serial primary key,
  session_id int not null references public.attendance_sessions(id) on delete cascade,
  group_id int not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status varchar(50) default 'present' not null,
  notes text,
  marked_at timestamptz default now() not null,
  unique (session_id, user_id)
);

create index if not exists idx_attendance_records_session_user on public.attendance_records(session_id, user_id);
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

-- ─── 17. Push Tokens & Notifications ─────────────────────────────────────────
create table if not exists public.push_tokens (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  token varchar(255) not null unique,
  platform varchar(50) default 'expo' not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;

create table if not exists public.notifications (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  group_id int references public.groups(id) on delete cascade,
  title varchar(255) not null,
  body text not null,
  category varchar(50) default 'announcement' not null,
  resource_type varchar(50),
  resource_id varchar(100),
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
alter table public.notifications enable row level security;

