-- Connexion commune portail -> Crew. Projet Crew uniquement.
begin;
create table private.crew_portal_accounts (
  portal_user_id uuid primary key,
  twitch_user_id text not null unique check(twitch_user_id ~ '^[0-9]{1,32}$'),
  crew_user_id uuid not null unique references auth.users(id) on delete cascade
);
create table private.crew_twitch_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('admin','helper')),
  checked_at timestamptz not null,
  expires_at timestamptz not null,
  check(expires_at > checked_at and expires_at <= checked_at + interval '5 minutes')
);
alter table private.crew_portal_accounts enable row level security;
alter table private.crew_twitch_access enable row level security;
revoke all on private.crew_portal_accounts, private.crew_twitch_access from public, anon, authenticated;
create or replace function private.has_role(required_role text)
returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and (
 exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role=required_role)
 or exists(select 1 from private.crew_twitch_access where user_id=(select auth.uid()) and role=required_role and expires_at>now()));
$$;
create or replace function private.can_edit_records()
returns boolean language sql stable security invoker set search_path='' as $$
 select private.has_role('admin') or private.has_role('helper');
$$;
revoke all on function private.has_role(text),private.can_edit_records() from public;
grant execute on function private.has_role(text),private.can_edit_records() to anon,authenticated;

-- Appel exclusif du serveur après validation Auth du portail et, pour une
-- association, validation indépendante de la session de l'ancien compte Crew.
create function private.crew_portal_access(
 p_portal_user_id uuid,p_twitch_user_id text,p_is_moderator boolean,
 p_ttl_seconds integer,p_crew_user_id uuid default null,p_link boolean default false,
 p_revoke boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_twitch text; v_role text; v_manual text; v_email text; v_expires timestamptz;
begin
 if p_portal_user_id is null or p_twitch_user_id is null or p_twitch_user_id !~ '^[0-9]{1,32}$'
 or p_ttl_seconds is null or p_ttl_seconds not between 1 and 300 then
   raise exception 'Invalid identity or lease' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_portal_user_id::text,0));
 select crew_user_id,twitch_user_id into v_user,v_twitch from private.crew_portal_accounts where portal_user_id=p_portal_user_id;
 if v_user is not null and v_twitch<>p_twitch_user_id then
   raise exception 'Identity mismatch' using errcode='42501';
 end if;
 if p_revoke then
   delete from private.crew_twitch_access where user_id=v_user;
   return jsonb_build_object('role',null);
 end if;
 if p_crew_user_id is not null then
   if p_link then
     if not exists(select 1 from public.user_roles where user_id=p_crew_user_id and role in ('admin','helper')) then
       raise exception 'Legacy role required' using errcode='42501';
     end if;
   elsif not exists(select 1 from auth.users where id=p_crew_user_id and email='portal-'||p_portal_user_id::text||'@crew.deadelustv.invalid') then
     raise exception 'Invalid technical account' using errcode='42501';
   end if;
   if v_user is not null and v_user<>p_crew_user_id then
     if not p_link or exists(select 1 from public.user_roles where user_id=v_user and role in ('admin','helper')) then
       raise exception 'Account already associated' using errcode='42501';
     end if;
     delete from private.crew_twitch_access where user_id=v_user;
   end if;
   insert into private.crew_portal_accounts(portal_user_id,twitch_user_id,crew_user_id)
   values(p_portal_user_id,p_twitch_user_id,p_crew_user_id)
   on conflict(portal_user_id) do update set crew_user_id=excluded.crew_user_id;
   v_user:=p_crew_user_id;
 end if;
 v_role:=case when p_twitch_user_id='99977368' then 'admin' when p_is_moderator then 'helper' else null end;
 if v_user is not null then
   select role into v_manual from public.user_roles where user_id=v_user and role in ('admin','helper') order by (role='admin') desc limit 1;
   if v_manual='admin' or v_role is null then v_role:=v_manual; end if;
   if v_role is null then
     delete from private.crew_twitch_access where user_id=v_user;
   else
     v_expires:=now()+make_interval(secs=>p_ttl_seconds);
     insert into private.crew_twitch_access values(v_user,v_role,now(),v_expires)
     on conflict(user_id) do update set role=excluded.role,checked_at=excluded.checked_at,expires_at=excluded.expires_at;
   end if;
   select email into v_email from auth.users where id=v_user;
 end if;
 return jsonb_build_object('crew_user_id',v_user,'email',v_email,'role',v_role,'expires_at',v_expires);
end;
$$;
revoke all on function private.crew_portal_access(uuid,text,boolean,integer,uuid,boolean,boolean) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.crew_portal_access(uuid,text,boolean,integer,uuid,boolean,boolean) to service_role;
create function public.crew_portal_access(
 p_portal_user_id uuid,p_twitch_user_id text,p_is_moderator boolean,
 p_ttl_seconds integer,p_crew_user_id uuid default null,p_link boolean default false,
 p_revoke boolean default false
) returns jsonb language sql security invoker set search_path='' as $$
 select private.crew_portal_access(p_portal_user_id,p_twitch_user_id,p_is_moderator,p_ttl_seconds,p_crew_user_id,p_link,p_revoke);
$$;
revoke all on function public.crew_portal_access(uuid,text,boolean,integer,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.crew_portal_access(uuid,text,boolean,integer,uuid,boolean,boolean) to service_role;
commit;
