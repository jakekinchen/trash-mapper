create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  geom geometry(Point, 4326) not null,
  severity integer not null default 3 check (severity between 1 and 5),
  image_url text,
  description text,
  is_valid_environment boolean not null default true,
  v1_classification_results jsonb,
  cleaned_up boolean not null default false,
  cleaned_at timestamptz,
  cleaned_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists reports_user_id_idx on public.reports(user_id);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists reports_geom_idx on public.reports using gist(geom);

create table if not exists public.user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  reports_submitted integer not null default 0,
  reports_cleaned integer not null default 0,
  points integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  is_public boolean not null default true,
  organizer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time >= start_time)
);

create index if not exists events_organizer_id_idx on public.events(organizer_id);
create index if not exists events_start_time_idx on public.events(start_time);

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_attendees_user_id_idx on public.event_attendees(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_stats_updated_at on public.user_stats;
create trigger set_user_stats_updated_at
before update on public.user_stats
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.set_report_classification(
  p_report_id uuid,
  p_classification_results jsonb
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  update public.reports
  set v1_classification_results = p_classification_results
  where reports.id = p_report_id
    and reports.user_id = auth.uid()
  returning reports.id;
end;
$$;

create or replace function public.mark_report_clean(
  p_report_id uuid,
  p_cleaned_image_url text
)
returns table (id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  with changed_report as (
    update public.reports
    set
      cleaned_up = true,
      cleaned_at = now(),
      cleaned_image_url = p_cleaned_image_url
    where reports.id = p_report_id
      and reports.cleaned_up is false
    returning reports.id, reports.user_id
  ),
  bumped_stats as (
    insert into public.user_stats (
      user_id,
      reports_submitted,
      reports_cleaned,
      points
    )
    select changed_report.user_id, 0, 1, 25
    from changed_report
    on conflict (user_id) do update
    set
      reports_cleaned = public.user_stats.reports_cleaned + excluded.reports_cleaned,
      points = public.user_stats.points + excluded.points,
      updated_at = now()
    returning 1
  )
  select changed_report.id, changed_report.user_id
  from changed_report;
end;
$$;

alter table public.reports enable row level security;
alter table public.user_stats enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;

drop policy if exists "Anyone can view valid reports" on public.reports;
create policy "Anyone can view valid reports"
on public.reports for select
using (is_valid_environment is true);

drop policy if exists "Authenticated users can create own reports" on public.reports;
create policy "Authenticated users can create own reports"
on public.reports for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Report owners can update reports" on public.reports;
create policy "Report owners can update reports"
on public.reports for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can mark open reports cleaned" on public.reports;
create policy "Authenticated users can mark open reports cleaned"
on public.reports for update
to authenticated
using (cleaned_up is false)
with check (cleaned_up is true);

drop policy if exists "Report owners can delete reports" on public.reports;
create policy "Report owners can delete reports"
on public.reports for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own stats" on public.user_stats;
create policy "Users can view own stats"
on public.user_stats for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own stats" on public.user_stats;
create policy "Users can create own stats"
on public.user_stats for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own stats" on public.user_stats;
create policy "Users can update own stats"
on public.user_stats for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Anyone can view public events" on public.events;
create policy "Anyone can view public events"
on public.events for select
using (is_public is true or auth.uid() = organizer_id);

drop policy if exists "Authenticated users can create own events" on public.events;
create policy "Authenticated users can create own events"
on public.events for insert
to authenticated
with check (auth.uid() = organizer_id);

drop policy if exists "Organizers can update own events" on public.events;
create policy "Organizers can update own events"
on public.events for update
to authenticated
using (auth.uid() = organizer_id)
with check (auth.uid() = organizer_id);

drop policy if exists "Organizers can delete own events" on public.events;
create policy "Organizers can delete own events"
on public.events for delete
to authenticated
using (auth.uid() = organizer_id);

drop policy if exists "Users can view event attendees" on public.event_attendees;
create policy "Users can view event attendees"
on public.event_attendees for select
using (
  exists (
    select 1 from public.events
    where events.id = event_attendees.event_id
      and (events.is_public is true or events.organizer_id = auth.uid())
  )
);

drop policy if exists "Users can register themselves" on public.event_attendees;
create policy "Users can register themselves"
on public.event_attendees for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unregister themselves" on public.event_attendees;
create policy "Users can unregister themselves"
on public.event_attendees for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('report-images', 'report-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can view report images" on storage.objects;
create policy "Anyone can view report images"
on storage.objects for select
using (bucket_id = 'report-images');

drop policy if exists "Users can upload report images" on storage.objects;
create policy "Users can upload report images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'report-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own report images" on storage.objects;
create policy "Users can update own report images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'report-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'report-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own report images" on storage.objects;
create policy "Users can delete own report images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'report-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

grant usage on schema public to anon, authenticated;
grant select on public.reports, public.events, public.event_attendees to anon, authenticated;
revoke update on public.reports from authenticated;
grant insert, delete on public.reports to authenticated;
revoke all on function public.set_report_classification(uuid, jsonb) from public, anon;
revoke all on function public.mark_report_clean(uuid, text) from public, anon;
grant execute on function public.set_report_classification(uuid, jsonb) to authenticated;
grant execute on function public.mark_report_clean(uuid, text) to authenticated;
grant insert, update, delete on public.events, public.event_attendees to authenticated;
grant select, insert, update on public.user_stats to authenticated;
