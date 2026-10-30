-- PRÉPARÉ, NON APPLIQUÉ. Projet Crew qonkgfbxmtmmwdjzyxuf uniquement.
-- La base est commune aux branches : activation distincte du déploiement Git.
begin;

create table private.crew_twitch_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  twitch_user_id text not null check (twitch_user_id ~ '^[0-9]{1,32}$'),
  role text not null check (role in ('admin','helper')),
  checked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint bounded_lease check (expires_at > checked_at and expires_at <= checked_at + interval '5 minutes')
);
alter table private.crew_twitch_access enable row level security;
revoke all on private.crew_twitch_access from public, anon, authenticated;

-- Extension des gardes existantes ; les rôles manuels restent inchangés.
create or replace function private.has_role(required_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.user_roles
      where user_id=(select auth.uid()) and role=required_role)
    or exists (select 1 from private.crew_twitch_access
      where user_id=(select auth.uid()) and role=required_role and expires_at>now())
  );
$$;
create or replace function private.can_edit_records()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.has_role('admin') or private.has_role('helper');
$$;
revoke all on function private.has_role(text), private.can_edit_records() from public;
grant execute on function private.has_role(text), private.can_edit_records() to anon, authenticated;

-- API privée d'octroi : seule l'Edge Function authentifiée comme service_role l'appelle.
create function private.crew_set_twitch_access(
  p_user_id uuid, p_twitch_user_id text, p_is_moderator boolean, p_ttl_seconds integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_expires timestamptz;
begin
  if p_user_id is null or not exists (
    select 1 from auth.identities
    where user_id=p_user_id and provider='twitch' and provider_id=p_twitch_user_id
  ) then
    raise exception 'Identité Twitch non associée' using errcode='42501';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds < 1 or p_ttl_seconds > 300 then
    raise exception 'Durée invalide' using errcode='22023';
  end if;
  -- L'identifiant est celui de DeadelusTV, pas celui transmis dans un champ de formulaire.
  v_role := case when p_twitch_user_id='99977368' then 'admin'
                 when p_is_moderator is true then 'helper' else null end;
  if v_role is null then
    delete from private.crew_twitch_access where user_id=p_user_id;
  else
    v_expires := now() + make_interval(secs=>p_ttl_seconds);
    insert into private.crew_twitch_access(user_id,twitch_user_id,role,checked_at,expires_at)
    values(p_user_id,p_twitch_user_id,v_role,now(),v_expires)
    on conflict(user_id) do update set twitch_user_id=excluded.twitch_user_id,
      role=excluded.role,checked_at=excluded.checked_at,expires_at=excluded.expires_at;
  end if;
  -- Un admin désigné manuellement reste admin même s'il est aussi modérateur Twitch.
  if exists(select 1 from public.user_roles where user_id=p_user_id and role='admin') then
    v_role := 'admin';
  elsif v_role is null and exists(select 1 from public.user_roles where user_id=p_user_id and role='helper') then
    v_role := 'helper';
  end if;
  return jsonb_build_object('role',v_role,'expires_at',v_expires);
end;
$$;
revoke all on function private.crew_set_twitch_access(uuid,text,boolean,integer) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.crew_set_twitch_access(uuid,text,boolean,integer) to service_role;

create function public.crew_set_twitch_access(
  p_user_id uuid, p_twitch_user_id text, p_is_moderator boolean, p_ttl_seconds integer
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.crew_set_twitch_access(p_user_id,p_twitch_user_id,p_is_moderator,p_ttl_seconds);
$$;
revoke all on function public.crew_set_twitch_access(uuid,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.crew_set_twitch_access(uuid,text,boolean,integer) to service_role;

commit;
