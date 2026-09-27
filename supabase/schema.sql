create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  age integer,
  role text not null default 'USER' check (role in ('USER','TRAVEL_AGENT','ADMIN')),
  onboarding_complete boolean not null default false,
  avatar_url text,
  city text,
  bio text,
  travel_personality text,
  interests text[] default '{}',
  budget text,
  group_preference text,
  lifestyle jsonb default '{}'::jsonb,
  upi_id text,
  upi_verified boolean not null default false,
  profile_visibility text default 'PUBLIC' check (profile_visibility in ('PUBLIC','FRIENDS_ONLY','PRIVATE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `CREATE TABLE IF NOT EXISTS` does not update an already-existing table.
-- Keep existing installations in sync before the view and auth trigger use these fields.
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists role text not null default 'USER';
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists travel_personality text;
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists budget text;
alter table public.profiles add column if not exists group_preference text;
alter table public.profiles add column if not exists lifestyle jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists upi_id text;
alter table public.profiles add column if not exists upi_verified boolean not null default false;
alter table public.profiles add column if not exists profile_visibility text not null default 'PUBLIC';
alter table public.profiles add column if not exists identity_verified boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace view public.public_profiles with (security_barrier = true) as
select id, full_name, age, avatar_url, city, bio, travel_personality, interests, budget, group_preference, lifestyle, identity_verified
from public.profiles
where profile_visibility = 'PUBLIC';

grant select on public.public_profiles to authenticated;

alter table public.profiles enable row level security;
drop policy if exists "Authenticated users can read public profiles" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date,
  end_date date,
  category text not null default 'TRIP' check (category in ('TRIP','TRAVEL_DATE','COMMUNITY')),
  description text,
  status text not null default 'OPEN' check (status in ('OPEN','FULL','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installations may already have `trips`; add every public-listing
-- field before creating the view that depends on them.
alter table public.trips add column if not exists visibility text not null default 'PUBLIC';
alter table public.trips add column if not exists trip_type text;
alter table public.trips add column if not exists max_members integer not null default 8;
alter table public.trips add column if not exists cover_image text;
alter table public.trips add column if not exists activities text[] not null default '{}';
alter table public.trips add column if not exists budget_accommodation numeric not null default 0;
alter table public.trips add column if not exists budget_transport numeric not null default 0;
alter table public.trips add column if not exists budget_food numeric not null default 0;
alter table public.trips add column if not exists budget_activities numeric not null default 0;
alter table public.trips add column if not exists budget_other numeric not null default 0;
alter table public.trips add column if not exists gender_preference text not null default 'Mixed';
alter table public.trips add column if not exists smoking_friendly boolean not null default false;
alter table public.trips add column if not exists drinking_friendly boolean not null default false;
alter table public.trips add column if not exists food_preference text not null default 'Any'
  check (food_preference in ('Any','Vegetarian','Non-vegetarian','Vegan'));

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('OWNER','MEMBER')),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create or replace function public.is_trip_owner(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.trips t where t.id = p_trip_id and t.created_by = p_user_id);
$$;

create or replace function public.is_approved_trip_member(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = p_trip_id and tm.user_id = p_user_id and tm.status = 'APPROVED'
  );
$$;

create or replace function public.is_public_open_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.visibility = 'PUBLIC' and t.status = 'OPEN'
  );
$$;

create or replace function public.can_view_trip_member_profile(p_profile_id uuid, p_viewer_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profile_id = p_viewer_id or exists (
    select 1 from public.trips t
    where (t.created_by = p_viewer_id or public.is_approved_trip_member(t.id, p_viewer_id))
      and (t.created_by = p_profile_id or public.is_approved_trip_member(t.id, p_profile_id))
  );
$$;

revoke all on function public.is_trip_owner(uuid, uuid) from public, anon;
revoke all on function public.is_approved_trip_member(uuid, uuid) from public, anon;
revoke all on function public.is_public_open_trip(uuid) from public, anon;
revoke all on function public.can_view_trip_member_profile(uuid, uuid) from public, anon;
grant execute on function public.is_trip_owner(uuid, uuid) to authenticated;
grant execute on function public.is_approved_trip_member(uuid, uuid) to authenticated;
grant execute on function public.is_public_open_trip(uuid) to authenticated;
grant execute on function public.can_view_trip_member_profile(uuid, uuid) to authenticated;

create or replace view public.trip_member_profiles with (security_barrier = true) as
select p.id, p.full_name, p.age, p.avatar_url, p.city, p.bio, p.travel_personality, p.interests, p.upi_id
from public.profiles p
where public.can_view_trip_member_profile(p.id, auth.uid());
grant select on public.trip_member_profiles to authenticated;

-- Trip creation must be scoped to the authenticated owner. The app then inserts
-- that owner's approved membership, while join requests are pending memberships.
alter table public.trips enable row level security;
drop policy if exists "Authenticated users can read open trips and their own trips" on public.trips;
create policy "Authenticated users can read open trips and their own trips" on public.trips
  for select to authenticated
  using (
    visibility = 'PUBLIC'
    or created_by = auth.uid()
    or public.is_approved_trip_member(id, auth.uid())
  );
drop policy if exists "Users can create trips as themselves" on public.trips;
create policy "Users can create trips as themselves" on public.trips
  for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "Owners can update their trips" on public.trips;
create policy "Owners can update their trips" on public.trips
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
drop policy if exists "Owners can delete their trips" on public.trips;
create policy "Owners can delete their trips" on public.trips
  for delete to authenticated
  using (created_by = auth.uid());

alter table public.trip_members enable row level security;
drop policy if exists "Users can read their memberships and trip owner memberships" on public.trip_members;
create policy "Users can read their memberships and trip owner memberships" on public.trip_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_trip_owner(trip_id, auth.uid())
    or public.is_approved_trip_member(trip_id, auth.uid())
    or public.is_public_open_trip(trip_id)
  );
drop policy if exists "Users can join or request their own trips" on public.trip_members;
create policy "Users can join or request their own trips" on public.trip_members
  for insert to authenticated
  with check (
    (user_id = auth.uid() and role = 'OWNER' and status = 'APPROVED'
      and public.is_trip_owner(trip_id, auth.uid()))
    or
    (user_id = auth.uid() and role = 'MEMBER' and status = 'PENDING'
      and public.is_public_open_trip(trip_id))
  );
drop policy if exists "Trip owners and pending members can update memberships" on public.trip_members;
create policy "Trip owners and pending members can update memberships" on public.trip_members
  for update to authenticated
  using (
    (user_id = auth.uid() and role = 'MEMBER' and status in ('PENDING', 'REJECTED'))
    or public.is_trip_owner(trip_id, auth.uid())
  )
  with check (
    (user_id = auth.uid() and role = 'MEMBER' and status = 'PENDING')
    or public.is_trip_owner(trip_id, auth.uid())
  );

create or replace view public.public_trip_groups with (security_barrier = true) as
select t.id, t.title, t.destination, t.description, t.category, t.start_date, t.end_date,
       t.created_by, t.status, t.visibility, t.trip_type, t.max_members, t.cover_image,
  t.activities, t.budget_accommodation, t.budget_transport, t.budget_food,
  t.budget_activities, t.budget_other,
       p.full_name as creator_name, p.avatar_url as creator_avatar, p.city as creator_city,
       (select count(*)::integer from public.trip_members tm
   where tm.trip_id = t.id and tm.status = 'APPROVED') as member_count,
  t.created_at
  from public.trips t
  join public.profiles p on p.id = t.created_by
  where t.status = 'OPEN' and t.visibility = 'PUBLIC';

grant select on public.public_trip_groups to authenticated;

create table if not exists public.travel_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null default 'JOIN' check (request_type in ('JOIN','MATCH')),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now()
);

alter table public.travel_requests enable row level security;
drop policy if exists "Users can read their requests" on public.travel_requests;
create policy "Users can read their requests" on public.travel_requests
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "Users can send requests as themselves" on public.travel_requests;
create policy "Users can send requests as themselves" on public.travel_requests
  for insert to authenticated with check (sender_id = auth.uid() and sender_id <> recipient_id);
drop policy if exists "Recipients can respond to requests" on public.travel_requests;
create policy "Recipients can respond to requests" on public.travel_requests
  for update to authenticated using (recipient_id = auth.uid() and status = 'PENDING')
  with check (recipient_id = auth.uid());

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  location text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.community_posts add column if not exists image_url text;

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comments enable row level security;
drop policy if exists "Authenticated users can read community posts" on public.community_posts;
create policy "Authenticated users can read community posts" on public.community_posts
  for select to authenticated using (true);
drop policy if exists "Users can create their own community posts" on public.community_posts;
create policy "Users can create their own community posts" on public.community_posts
  for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Authors can update their own community posts" on public.community_posts;
create policy "Authors can update their own community posts" on public.community_posts
  for update to authenticated using (author_id = auth.uid())
  with check (author_id = auth.uid());
drop policy if exists "Authors can delete their community posts" on public.community_posts;
create policy "Authors can delete their community posts" on public.community_posts
  for delete to authenticated using (author_id = auth.uid());
drop policy if exists "Authenticated users can read community likes" on public.community_post_likes;
create policy "Authenticated users can read community likes" on public.community_post_likes
  for select to authenticated using (true);
drop policy if exists "Users can like posts as themselves" on public.community_post_likes;
create policy "Users can like posts as themselves" on public.community_post_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users can remove their own likes" on public.community_post_likes;
create policy "Users can remove their own likes" on public.community_post_likes
  for delete to authenticated using (user_id = auth.uid());
drop policy if exists "Authenticated users can read community comments" on public.community_comments;
create policy "Authenticated users can read community comments" on public.community_comments
  for select to authenticated using (true);
drop policy if exists "Users can comment as themselves" on public.community_comments;
create policy "Users can comment as themselves" on public.community_comments
  for insert to authenticated with check (author_id = auth.uid());

create index if not exists community_posts_created_idx on public.community_posts(created_at desc);
create index if not exists community_comments_post_created_idx on public.community_comments(post_id, created_at);

-- Community image uploads use a public bucket for rendering post image URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-images', 'community-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Community images are publicly viewable" on storage.objects;
create policy "Community images are publicly viewable" on storage.objects
  for select to public using (bucket_id = 'community-images');
drop policy if exists "Users can upload their own community images" on storage.objects;
create policy "Users can upload their own community images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can update their own community images" on storage.objects;
create policy "Users can update their own community images" on storage.objects
  for update to authenticated
  using (bucket_id = 'community-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'community-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own community images" on storage.objects;
create policy "Users can delete their own community images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Public read URLs are used for trip covers and profile avatars. Writes stay
-- scoped to the authenticated user's own top-level folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-media', 'trip-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Trip media is publicly viewable" on storage.objects;
create policy "Trip media is publicly viewable" on storage.objects
  for select to public using (bucket_id = 'trip-media');
drop policy if exists "Users can upload their own trip media" on storage.objects;
create policy "Users can upload their own trip media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trip-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can update their own trip media" on storage.objects;
create policy "Users can update their own trip media" on storage.objects
  for update to authenticated
  using (bucket_id = 'trip-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'trip-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own trip media" on storage.objects;
create policy "Users can delete their own trip media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'trip-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Identity evidence is private, not a public-media asset. Do not make this
-- bucket public and never expose document URLs to public profile views.
create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 160),
  document_type text not null default 'AADHAAR' check (document_type in ('AADHAAR')),
  aadhaar_last4 text not null check (aadhaar_last4 ~ '^[0-9]{4}$'),
  aadhaar_image_path text not null,
  selfie_image_path text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  reviewer_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create or replace function public.sync_identity_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set identity_verified = (new.status = 'APPROVED'), updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;
drop trigger if exists sync_identity_verification_status on public.identity_verifications;
create trigger sync_identity_verification_status
  after insert or update of status on public.identity_verifications
  for each row execute function public.sync_identity_verification_status();

create index if not exists identity_verifications_status_submitted_idx
  on public.identity_verifications(status, submitted_at desc);
alter table public.identity_verifications enable row level security;
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN');
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
drop policy if exists "Users can read their own identity verification" on public.identity_verifications;
create policy "Users can read their own identity verification" on public.identity_verifications
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists "Admins can review identity verifications" on public.identity_verifications;
create policy "Admins can review identity verifications" on public.identity_verifications
  for update to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin() and status in ('APPROVED','REJECTED'));
drop policy if exists "Users can submit their own identity verification" on public.identity_verifications;
create policy "Users can submit their own identity verification" on public.identity_verifications
  for insert to authenticated with check (user_id = auth.uid() and status = 'PENDING');
drop policy if exists "Users can update their own pending identity verification" on public.identity_verifications;
create policy "Users can update their own pending identity verification" on public.identity_verifications
  for update to authenticated using (user_id = auth.uid() and status in ('PENDING','REJECTED'))
  with check (user_id = auth.uid() and status = 'PENDING');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-verification', 'identity-verification', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own verification files" on storage.objects;
create policy "Users can upload their own verification files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'identity-verification' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can read their own verification files" on storage.objects;
create policy "Users can read their own verification files" on storage.objects
  for select to authenticated
  using (bucket_id = 'identity-verification' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can replace their own verification files" on storage.objects;
create policy "Users can replace their own verification files" on storage.objects
  for update to authenticated
  using (bucket_id = 'identity-verification' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'identity-verification' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own verification files" on storage.objects;
create policy "Users can delete their own verification files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'identity-verification' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Admins can review verification files" on storage.objects;
create policy "Admins can review verification files" on storage.objects
  for select to authenticated
  using (bucket_id = 'identity-verification' and public.is_platform_admin());

create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  details text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_files (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Other',
  paid_by uuid not null references public.profiles(id) on delete cascade,
  split_method text not null default 'EQUAL' check (split_method in ('EQUAL','PERCENTAGE','CUSTOM')),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_expense_shares (
  expense_id uuid not null references public.trip_expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  owed_amount numeric(12,2) not null check (owed_amount >= 0),
  status text not null default 'PENDING',
  primary key (expense_id, user_id)
);

alter table public.trip_expense_shares alter column status set default 'PENDING';
alter table public.trip_expense_shares drop constraint if exists trip_expense_shares_status_check;
alter table public.trip_expense_shares add constraint trip_expense_shares_status_check
  check (status in ('PENDING','PAYMENT_REPORTED','PAID'));

create table if not exists public.trip_member_locations (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision,
  is_sharing boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index if not exists trip_itinerary_trip_time_idx on public.trip_itinerary_items(trip_id, starts_at);
create index if not exists trip_files_trip_created_idx on public.trip_files(trip_id, created_at desc);
create index if not exists trip_expenses_trip_created_idx on public.trip_expenses(trip_id, created_at desc);
create index if not exists trip_member_locations_recent_idx on public.trip_member_locations(trip_id, updated_at desc);

alter table public.trip_itinerary_items enable row level security;
alter table public.trip_files enable row level security;
alter table public.trip_expenses enable row level security;
alter table public.trip_expense_shares enable row level security;
alter table public.trip_member_locations enable row level security;

drop policy if exists "Approved members and owners can read itinerary" on public.trip_itinerary_items;
create policy "Approved members and owners can read itinerary" on public.trip_itinerary_items
  for select to authenticated using (
    public.is_approved_trip_member(trip_itinerary_items.trip_id, auth.uid())
    or public.is_trip_owner(trip_itinerary_items.trip_id, auth.uid())
  );
drop policy if exists "Trip owners can manage itinerary" on public.trip_itinerary_items;
drop policy if exists "Trip owners can create itinerary" on public.trip_itinerary_items;
drop policy if exists "Trip owners can update itinerary" on public.trip_itinerary_items;
drop policy if exists "Trip owners can delete itinerary" on public.trip_itinerary_items;
create policy "Trip owners can create itinerary" on public.trip_itinerary_items
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_trip_owner(trip_itinerary_items.trip_id, auth.uid())
  );
drop policy if exists "Trip owners can update itinerary" on public.trip_itinerary_items;
create policy "Trip owners can update itinerary" on public.trip_itinerary_items
  for update to authenticated using (
    public.is_trip_owner(trip_itinerary_items.trip_id, auth.uid())
  ) with check (
    public.is_trip_owner(trip_itinerary_items.trip_id, auth.uid())
  );
drop policy if exists "Trip owners can delete itinerary" on public.trip_itinerary_items;
create policy "Trip owners can delete itinerary" on public.trip_itinerary_items
  for delete to authenticated using (
    public.is_trip_owner(trip_itinerary_items.trip_id, auth.uid())
  );

drop policy if exists "Approved members and owners can read trip files" on public.trip_files;
create policy "Approved members and owners can read trip files" on public.trip_files
  for select to authenticated using (
    public.is_approved_trip_member(trip_files.trip_id, auth.uid())
    or public.is_trip_owner(trip_files.trip_id, auth.uid())
  );
drop policy if exists "Trip members can add files" on public.trip_files;
create policy "Trip members can add files" on public.trip_files
  for insert to authenticated with check (
    uploaded_by = auth.uid() and (
      public.is_approved_trip_member(trip_files.trip_id, auth.uid())
      or public.is_trip_owner(trip_files.trip_id, auth.uid())
    )
  );

drop policy if exists "Trip members can read shared expenses" on public.trip_expenses;
create policy "Trip members can read shared expenses" on public.trip_expenses
  for select to authenticated using (
    public.is_approved_trip_member(trip_expenses.trip_id, auth.uid())
    or public.is_trip_owner(trip_expenses.trip_id, auth.uid())
  );
drop policy if exists "Trip members can add shared expenses" on public.trip_expenses;
create policy "Trip members can add shared expenses" on public.trip_expenses
  for insert to authenticated with check (
    paid_by = auth.uid() and (
      public.is_approved_trip_member(trip_expenses.trip_id, auth.uid())
      or public.is_trip_owner(trip_expenses.trip_id, auth.uid())
    )
  );
drop policy if exists "Payers can create expense shares" on public.trip_expense_shares;
drop policy if exists "Users can settle their own shares" on public.trip_expense_shares;
drop policy if exists "Members can report their own payments" on public.trip_expense_shares;
drop policy if exists "Payers or owners can confirm reported payments" on public.trip_expense_shares;
drop policy if exists "Members can read their expense shares" on public.trip_expense_shares;
create policy "Members can read their expense shares" on public.trip_expense_shares
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.trip_expenses e
      where e.id = expense_id and (
        public.is_approved_trip_member(e.trip_id, auth.uid())
        or exists (select 1 from public.trips t where t.id = e.trip_id and t.created_by = auth.uid())
      )
    )
  );
drop policy if exists "Payers can create expense shares" on public.trip_expense_shares;
create policy "Payers can create expense shares" on public.trip_expense_shares
  for insert to authenticated with check (
    exists (select 1 from public.trip_expenses e where e.id = trip_expense_shares.expense_id and e.paid_by = auth.uid())
    and ((user_id = auth.uid() and status = 'PAID') or (user_id <> auth.uid() and status = 'PENDING'))
    and (
      public.is_approved_trip_member(
        (select e.trip_id from public.trip_expenses e where e.id = trip_expense_shares.expense_id),
        trip_expense_shares.user_id
      )
      or exists (
        select 1 from public.trip_expenses e
        where e.id = trip_expense_shares.expense_id
          and public.is_trip_owner(e.trip_id, trip_expense_shares.user_id)
      )
    )
  );
drop policy if exists "Payers or owners can confirm reported payments" on public.trip_expense_shares;
revoke update on public.trip_expense_shares from authenticated;
grant update (status) on public.trip_expense_shares to authenticated;
create policy "Members can report their own payments" on public.trip_expense_shares
  for update to authenticated
  using (user_id = auth.uid() and status = 'PENDING')
  with check (user_id = auth.uid() and status = 'PAYMENT_REPORTED');
create policy "Payers or owners can confirm reported payments" on public.trip_expense_shares
  for update to authenticated
  using (
    status = 'PAYMENT_REPORTED'
    and exists (
      select 1 from public.trip_expenses e
      where e.id = trip_expense_shares.expense_id
        and (e.paid_by = auth.uid() or public.is_trip_owner(e.trip_id, auth.uid()))
    )
  )
  with check (
    status = 'PAID'
    and exists (
      select 1 from public.trip_expenses e
      where e.id = trip_expense_shares.expense_id
        and (e.paid_by = auth.uid() or public.is_trip_owner(e.trip_id, auth.uid()))
    )
  );

create index if not exists trip_member_locations_updated_idx on public.trip_member_locations(trip_id, updated_at desc);
alter table public.trip_member_locations enable row level security;
drop policy if exists "Trip members can read shared live locations" on public.trip_member_locations;
create policy "Trip members can read shared live locations" on public.trip_member_locations
  for select to authenticated using (
    is_sharing and updated_at > now() - interval '2 hours'
    and (public.is_approved_trip_member(trip_id, auth.uid()) or public.is_trip_owner(trip_id, auth.uid()))
  );
drop policy if exists "Members can share their own location" on public.trip_member_locations;
create policy "Members can share their own location" on public.trip_member_locations
  for insert to authenticated with check (
    user_id = auth.uid() and is_sharing
    and exists (select 1 from public.trips t where t.id = trip_member_locations.trip_id)
    and (public.is_approved_trip_member(trip_id, auth.uid()) or public.is_trip_owner(trip_id, auth.uid()))
  );
drop policy if exists "Members can update their own location sharing" on public.trip_member_locations;
create policy "Members can update their own location sharing" on public.trip_member_locations
  for update to authenticated using (user_id = auth.uid() and (public.is_approved_trip_member(trip_id, auth.uid()) or public.is_trip_owner(trip_id, auth.uid())))
  with check (user_id = auth.uid() and (not is_sharing or public.is_approved_trip_member(trip_id, auth.uid()) or public.is_trip_owner(trip_id, auth.uid())));
drop policy if exists "Members can stop sharing their own location" on public.trip_member_locations;
create policy "Members can stop sharing their own location" on public.trip_member_locations
  for delete to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit)
values ('trip-files', 'trip-files', false, 10485760)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Trip files are publicly viewable" on storage.objects;
drop policy if exists "Approved trip members can read trip files" on storage.objects;
create policy "Approved trip members can read trip files" on storage.objects
  for select to authenticated using (
    bucket_id = 'trip-files'
    and exists (
      select 1 from public.trips t
      where t.id::text = (storage.foldername(name))[1]
        and (public.is_approved_trip_member(t.id, auth.uid()) or public.is_trip_owner(t.id, auth.uid()))
    )
  );
drop policy if exists "Approved trip members can upload trip files" on storage.objects;
create policy "Approved trip members can upload trip files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'trip-files'
    and exists (
      select 1 from public.trips t
      where t.id::text = (storage.foldername(name))[1]
        and (public.is_approved_trip_member(t.id, auth.uid()) or public.is_trip_owner(t.id, auth.uid()))
    )
  );

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, age, role, onboarding_complete, avatar_url, city, bio, travel_personality, interests, budget, group_preference, lifestyle, upi_id, upi_verified, profile_visibility, identity_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'age', '')::integer,
    coalesce(new.raw_user_meta_data->>'role', 'USER'),
    coalesce((new.raw_user_meta_data->>'onboarding_complete')::boolean, false),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'bio',
    new.raw_user_meta_data->>'travel_personality',
    coalesce((new.raw_user_meta_data->>'interests')::text[], '{}'),
    new.raw_user_meta_data->>'budget',
    new.raw_user_meta_data->>'group_preference',
    coalesce(new.raw_user_meta_data->'lifestyle', '{}'::jsonb),
    new.raw_user_meta_data->>'upi_id',
    coalesce((new.raw_user_meta_data->>'upi_verified')::boolean, false),
    coalesce(new.raw_user_meta_data->>'profile_visibility', 'PUBLIC'),
    false
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      age = excluded.age,
      role = excluded.role,
      onboarding_complete = excluded.onboarding_complete,
      avatar_url = excluded.avatar_url,
      city = excluded.city,
      bio = excluded.bio,
      travel_personality = excluded.travel_personality,
      interests = excluded.interests,
      budget = excluded.budget,
      group_preference = excluded.group_preference,
      lifestyle = excluded.lifestyle,
      upi_id = excluded.upi_id,
      upi_verified = excluded.upi_verified,
      profile_visibility = excluded.profile_visibility,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists trips_created_by_idx on public.trips(created_by);
create index if not exists trip_members_trip_id_idx on public.trip_members(trip_id);
create index if not exists travel_requests_sender_idx on public.travel_requests(sender_id);
create index if not exists trip_messages_trip_created_idx on public.trip_messages(trip_id, created_at);
create index if not exists direct_messages_conversation_idx on public.direct_messages(sender_id, recipient_id, created_at);

alter table public.trip_messages enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "Users can read their direct messages" on public.direct_messages;
create policy "Users can read their direct messages" on public.direct_messages
  for select to authenticated
  using (
    (sender_id = auth.uid() or recipient_id = auth.uid())
    and exists (
      select 1 from public.travel_requests request
      where request.request_type = 'MATCH'
        and request.status = 'APPROVED'
        and ((request.sender_id = direct_messages.sender_id and request.recipient_id = direct_messages.recipient_id)
          or (request.sender_id = direct_messages.recipient_id and request.recipient_id = direct_messages.sender_id))
    )
  );

drop policy if exists "Users can send direct messages as themselves" on public.direct_messages;
create policy "Users can send direct messages as themselves" on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and sender_id <> recipient_id
    and exists (
      select 1 from public.travel_requests request
      where request.request_type = 'MATCH'
        and request.status = 'APPROVED'
        and ((request.sender_id = direct_messages.sender_id and request.recipient_id = direct_messages.recipient_id)
          or (request.sender_id = direct_messages.recipient_id and request.recipient_id = direct_messages.sender_id))
    )
  );

drop policy if exists "Trip members can read messages" on public.trip_messages;
create policy "Trip members can read messages" on public.trip_messages
  for select to authenticated
  using (public.is_approved_trip_member(trip_messages.trip_id, auth.uid()) or public.is_trip_owner(trip_messages.trip_id, auth.uid()));

drop policy if exists "Approved trip members can send messages" on public.trip_messages;
create policy "Approved trip members can send messages" on public.trip_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (public.is_approved_trip_member(trip_messages.trip_id, auth.uid()) or public.is_trip_owner(trip_messages.trip_id, auth.uid()))
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_messages'
  ) then
    alter publication supabase_realtime add table public.trip_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_member_locations'
  ) then
    alter publication supabase_realtime add table public.trip_member_locations;
  end if;
end;
$$;
