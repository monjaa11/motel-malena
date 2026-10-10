-- =====================================================================
--  MOTEL MALENA – Rezervacije
--  Pokrenuti JEDNOM u Supabase: SQL Editor -> New query -> zalijepi -> Run
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- SOBE ----------
create table if not exists public.rooms (
  id        int primary key,          -- broj sobe (11, 12, ... 36)
  capacity  int not null check (capacity between 1 and 10),
  sort      int not null default 0,
  active    boolean not null default true
);

insert into public.rooms (id, capacity, sort) values
  (11,3,1),(12,2,2),(13,3,3),(14,2,4),(15,3,5),(16,3,6),
  (21,3,7),(22,2,8),(23,3,9),(24,2,10),(25,3,11),(26,3,12),
  (31,3,13),(32,2,14),(33,3,15),(34,2,16),(35,3,17),(36,3,18)
on conflict (id) do nothing;

-- ---------- GOSTI ----------
create table if not exists public.guests (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null default '',
  phone       text not null default '',
  created_at  timestamptz not null default now(),
  created_by  text not null default ''
);
create index if not exists guests_name_idx on public.guests (last_name, first_name);

-- ---------- REZERVACIJE ----------
create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references public.guests(id) on delete restrict,
  room_id     int  not null references public.rooms(id),
  check_in    date not null,
  check_out   date not null,
  persons     int  not null default 1 check (persons between 1 and 10),
  status      text not null default 'rezervisano'
              check (status in ('rezervisano','potvrdjeno','prijavljen','odjavljen','otkazano')),
  source      text not null default 'booking'
              check (source in ('booking','telefon','direktno','ostalo')),
  note        text not null default '',
  created_at  timestamptz not null default now(),
  created_by  text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  text not null default '',
  constraint dates_ok check (check_out > check_in),
  -- ZAŠTITA OD DUPLE REZERVACIJE: ista soba se ne može zauzeti dvaput u istim noćima
  -- (otkazane rezervacije se ne računaju)
  constraint no_double_booking exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status <> 'otkazano')
);
create index if not exists res_dates_idx on public.reservations (check_in, check_out);
create index if not exists res_guest_idx on public.reservations (guest_id);

-- ---------- DNEVNIK IZMJENA (ko je šta uradio) ----------
create table if not exists public.activity_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  action    text not null,              -- INSERT / UPDATE / DELETE
  table_name text not null,
  row_id    text,
  by_name   text,
  old_data  jsonb,
  new_data  jsonb
);

create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    insert into activity_log(action, table_name, row_id, by_name, old_data)
    values (tg_op, tg_table_name, old.id::text,
            coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-device-name', ''),
            to_jsonb(old));
    return old;
  else
    insert into activity_log(action, table_name, row_id, by_name, old_data, new_data)
    values (tg_op, tg_table_name, new.id::text,
            coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-device-name', ''),
            case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
    return new;
  end if;
end $$;

drop trigger if exists log_reservations on public.reservations;
create trigger log_reservations after insert or update or delete on public.reservations
  for each row execute function public.log_change();
drop trigger if exists log_guests on public.guests;
create trigger log_guests after insert or update or delete on public.guests
  for each row execute function public.log_change();

create or replace function public.touch_updated() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists touch_res on public.reservations;
create trigger touch_res before update on public.reservations
  for each row execute function public.touch_updated();

-- ---------- SIGURNOST (RLS) ----------
-- Pristup imaju SAMO prijavljeni korisnici (Recepcija, Almin, Radnik).
-- Bez koda baza ne vraća ništa i ne dozvoljava nikakve izmjene.
alter table public.rooms        enable row level security;
alter table public.guests       enable row level security;
alter table public.reservations enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists rooms_all on public.rooms;
create policy rooms_all on public.rooms for select to authenticated using (true);

drop policy if exists guests_all on public.guests;
create policy guests_all on public.guests for all to authenticated using (true) with check (true);

drop policy if exists res_all on public.reservations;
create policy res_all on public.reservations for all to authenticated using (true) with check (true);

drop policy if exists log_read on public.activity_log;
create policy log_read on public.activity_log for select to authenticated using (true);

-- ---------- REALTIME (promjene se odmah vide na svim uređajima) ----------
do $$ begin
  begin alter publication supabase_realtime add table public.reservations; exception when others then null; end;
  begin alter publication supabase_realtime add table public.guests;       exception when others then null; end;
end $$;
