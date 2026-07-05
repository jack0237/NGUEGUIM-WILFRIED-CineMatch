-- ═══════════════════════════════════════════════════════════════════════════════
-- CineMatch — Group Matching
-- Feature: des groupes d'amis swipent en secret, l'app révèle les films
-- likés par TOUS les membres.
--
-- Tables : groups, group_members, group_swipes
-- Secret  : RLS sur group_swipes = chacun ne voit QUE ses propres swipes.
--           La révélation passe exclusivement par la RPC get_group_matches,
--           qui ne retourne que l'intersection des likes de tous les membres.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── groups ────────────────────────────────────────────────────────────────────

create table if not exists public.groups (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 1 and 40),
  code        text        not null unique,
  created_by  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── group_members ─────────────────────────────────────────────────────────────

create table if not exists public.group_members (
  group_id   uuid        not null references public.groups(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user
  on public.group_members (user_id);

-- ── group_swipes ──────────────────────────────────────────────────────────────
-- Même dénormalisation film que swipe_history (poster, titre, note…) pour
-- afficher les matchs sans re-fetch TMDB.

create table if not exists public.group_swipes (
  id                  uuid         primary key default gen_random_uuid(),
  group_id            uuid         not null references public.groups(id) on delete cascade,
  user_id             uuid         not null references auth.users(id) on delete cascade,
  movie_id            integer      not null,
  movie_title         text         not null,
  movie_poster_path   text,
  movie_vote_average  numeric(3,1) not null default 0,
  movie_release_date  text,
  movie_genre_ids     integer[]    not null default '{}',
  action              text         not null check (action in ('like', 'dislike')),
  swiped_at           timestamptz  not null default now(),

  constraint group_swipes_unique unique (group_id, user_id, movie_id)
);

create index if not exists group_swipes_group_action
  on public.group_swipes (group_id, action);

create index if not exists group_swipes_group_user
  on public.group_swipes (group_id, user_id);

-- ── Helper: is_group_member ───────────────────────────────────────────────────
-- SECURITY DEFINER pour éviter la récursion RLS entre groups et group_members.
-- Garde-fou intégré : ne teste que l'appartenance de l'appelant (auth.uid()).

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id  = (select auth.uid())
  );
$$;

revoke execute on function public.is_group_member(uuid) from public, anon;
grant  execute on function public.is_group_member(uuid) to authenticated;

-- ── RLS: groups ───────────────────────────────────────────────────────────────
-- Lecture réservée aux membres. Création/adhésion via RPC uniquement
-- (le code d'invitation est le seul moyen de rejoindre).

alter table public.groups enable row level security;

create policy "groups_select_member"
  on public.groups for select
  to authenticated
  using (created_by = (select auth.uid()) or public.is_group_member(id));

create policy "groups_delete_owner"
  on public.groups for delete
  to authenticated
  using (created_by = (select auth.uid()));

grant select, delete on public.groups to authenticated;

-- ── RLS: group_members ────────────────────────────────────────────────────────
-- Les membres voient les membres de leurs groupes. On rejoint via RPC
-- join_group (vérification du code) — pas d'INSERT direct.
-- Chacun peut quitter un groupe (DELETE sa propre ligne).

alter table public.group_members enable row level security;

create policy "group_members_select_member"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "group_members_delete_own"
  on public.group_members for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.group_members to authenticated;

-- ── RLS: group_swipes ─────────────────────────────────────────────────────────
-- ⚠ LE SECRET : chacun ne lit et n'écrit QUE ses propres swipes.
-- Les swipes des autres membres ne sont JAMAIS accessibles via l'API —
-- seule la RPC get_group_matches révèle l'intersection.

alter table public.group_swipes enable row level security;

create policy "group_swipes_select_own"
  on public.group_swipes for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "group_swipes_insert_own_member"
  on public.group_swipes for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_group_member(group_id)
  );

create policy "group_swipes_update_own"
  on public.group_swipes for update
  to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.group_swipes to authenticated;

-- ── RPC: create_group ─────────────────────────────────────────────────────────
-- Crée le groupe + inscrit le créateur, avec un code d'invitation unique
-- (6 caractères, alphabet sans ambiguïté 0/O/1/I/L).

create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_code  text;
  v_group public.groups;
  v_chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 40 then
    raise exception 'invalid group name';
  end if;

  -- Génère un code unique (retente en cas de collision)
  loop
    select string_agg(substr(v_chars, (floor(random() * 31))::int + 1, 1), '')
      into v_code
      from generate_series(1, 6);
    exit when not exists (select 1 from public.groups where code = v_code);
  end loop;

  insert into public.groups (name, code, created_by)
  values (trim(p_name), v_code, v_uid)
  returning * into v_group;

  insert into public.group_members (group_id, user_id)
  values (v_group.id, v_uid);

  return v_group;
end;
$$;

revoke execute on function public.create_group(text) from public, anon;
grant  execute on function public.create_group(text) to authenticated;

-- ── RPC: join_group ───────────────────────────────────────────────────────────
-- Rejoint un groupe via son code d'invitation.

create or replace function public.join_group(p_code text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_group public.groups;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_group
  from public.groups
  where code = upper(trim(p_code));

  if not found then
    raise exception 'group not found';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group.id, v_uid)
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;

revoke execute on function public.join_group(text) from public, anon;
grant  execute on function public.join_group(text) to authenticated;

-- ── RPC: get_group_members ────────────────────────────────────────────────────
-- Membres du groupe + progression (nb de swipes, pas leur contenu).
-- SECURITY DEFINER : lit les profiles des co-membres (RLS profiles = own only).

create or replace function public.get_group_members(p_group_id uuid)
returns table (
  user_id     uuid,
  username    text,
  avatar_url  text,
  joined_at   timestamptz,
  swipe_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    gm.user_id,
    p.username,
    p.avatar_url,
    gm.joined_at,
    count(gs.id) as swipe_count
  from public.group_members gm
  left join public.profiles p      on p.id = gm.user_id
  left join public.group_swipes gs on gs.group_id = gm.group_id
                                  and gs.user_id  = gm.user_id
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id)   -- garde : appelant membre
  group by gm.user_id, p.username, p.avatar_url, gm.joined_at
  order by gm.joined_at;
$$;

revoke execute on function public.get_group_members(uuid) from public, anon;
grant  execute on function public.get_group_members(uuid) to authenticated;

-- ── RPC: get_group_matches ────────────────────────────────────────────────────
-- LA révélation : films likés par TOUS les membres du groupe.
-- SECURITY DEFINER : agrège les swipes de tout le monde, mais ne retourne
-- que l'intersection — jamais les choix individuels.

create or replace function public.get_group_matches(p_group_id uuid)
returns table (
  movie_id            integer,
  movie_title         text,
  movie_poster_path   text,
  movie_vote_average  numeric,
  movie_release_date  text,
  movie_genre_ids     integer[],
  matched_at          timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    gs.movie_id,
    max(gs.movie_title)                as movie_title,
    max(gs.movie_poster_path)          as movie_poster_path,
    max(gs.movie_vote_average)         as movie_vote_average,
    max(gs.movie_release_date)         as movie_release_date,
    max(gs.movie_genre_ids)            as movie_genre_ids,
    max(gs.swiped_at)                  as matched_at
  from public.group_swipes gs
  where gs.group_id = p_group_id
    and gs.action   = 'like'
    and public.is_group_member(p_group_id)   -- garde : appelant membre
  group by gs.movie_id
  having count(distinct gs.user_id) = (
    select count(*) from public.group_members gm
    where gm.group_id = p_group_id
  )
  order by matched_at desc;
$$;

revoke execute on function public.get_group_matches(uuid) from public, anon;
grant  execute on function public.get_group_matches(uuid) to authenticated;
