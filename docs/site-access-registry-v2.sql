-- DeadelusTV V2 : registre de permissions. PREPARATION UNIQUEMENT.
-- Ne PAS exécuter sur le projet Supabase de production sans environnement de recette
-- et tests RLS/autorisations. Ne touche à aucune table Phasmo, Crew ou TCG existante.
-- Les attributions ici ne confèrent jamais un droit effectif aux modules.
begin;

create table public.site_access_categories (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{1,60}$'),
  label text not null check (char_length(trim(label)) between 1 and 70),
  position integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.site_access_sections (
  category_id text not null references public.site_access_categories(id) on delete restrict,
  id text not null check (id ~ '^[a-z][a-z0-9-]{1,60}$'),
  label text not null check (char_length(trim(label)) between 1 and 70),
  position integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (category_id,id)
);

create table public.site_access_permissions (
  code text primary key check (
    code ~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*){2,}$'
    and code !~ '^(portal|site|system)\.'
  ),
  category_id text not null,
  section_id text not null,
  label text not null check (char_length(trim(label)) between 1 and 70),
  position integer not null default 100,
  active boolean not null default true,
  connected boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (category_id,section_id) references public.site_access_sections(category_id,id) on delete restrict
);

create table public.site_access_people (
  twitch_user_id text primary key check (twitch_user_id ~ '^[0-9]{1,32}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 70),
  is_moderator boolean not null default false,
  last_twitch_sync timestamptz,
  created_at timestamptz not null default now()
);

create table public.site_access_grants (
  twitch_user_id text not null references public.site_access_people(twitch_user_id) on delete restrict,
  permission_code text not null references public.site_access_permissions(code) on delete restrict,
  enabled boolean not null default false,
  changed_by_twitch_id text not null check (changed_by_twitch_id ~ '^[0-9]{1,32}$'),
  changed_at timestamptz not null default now(),
  primary key (twitch_user_id, permission_code)
);

create table public.site_access_audit (
  id bigint generated always as identity primary key,
  action text not null,
  actor_twitch_id text not null check (actor_twitch_id ~ '^[0-9]{1,32}$'),
  subject text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS et privilèges au plus restrictif. Aucun droit client.
alter table public.site_access_categories enable row level security;
alter table public.site_access_sections enable row level security;
alter table public.site_access_permissions enable row level security;
alter table public.site_access_people enable row level security;
alter table public.site_access_grants enable row level security;
alter table public.site_access_audit enable row level security;
revoke all on table public.site_access_categories, public.site_access_sections,
  public.site_access_permissions, public.site_access_people,
  public.site_access_grants, public.site_access_audit from public, anon, authenticated;
grant select,insert,update on table public.site_access_categories, public.site_access_sections,
  public.site_access_permissions, public.site_access_people, public.site_access_grants to service_role;
grant select,insert on table public.site_access_audit to service_role;
revoke all on sequence public.site_access_audit_id_seq from public, anon, authenticated;
grant usage,select on sequence public.site_access_audit_id_seq to service_role;

-- Catalogue initial limité aux QUATRE droits exprimés.
insert into public.site_access_categories (id,label,position)
values ('phasmo','Phasmophobia',10),('crew','Crew’mong Us',20);
insert into public.site_access_sections (category_id,id,label,position)
values ('phasmo','livre','Livre',10),('phasmo','news','News',20),('crew','roles','Rôles',10);
insert into public.site_access_permissions (code,category_id,section_id,label,position,connected)
values
  ('phasmo.livre.edit','phasmo','livre','Éditeur du livre',10,false),
  ('phasmo.news.edit','phasmo','news','Rédacteur News',20,false),
  ('crew.roles.helper','crew','roles','Helper (saisie)',10,false),
  ('crew.roles.admin','crew','roles','Admin (gestion)',20,false);

-- RPC privée de facto : invoker et EXECUTE réservé à service_role.
-- Elle travaille sur le catalogue de DEMANDES de droits, pas sur les RLS des modules.
create function public.site_access_admin_action(
  p_action text, p_payload jsonb, p_actor_twitch_id text
) returns jsonb language plpgsql security invoker
set search_path = '' as $function$
declare
  v_id text;
  v_category text;
  v_section text;
  v_label text;
  v_code text;
  v_person text;
  v_enabled boolean;
begin
  if p_actor_twitch_id is null or p_actor_twitch_id !~ '^[0-9]{1,32}$' then
    raise exception 'invalid_actor';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_payload';
  end if;
  if p_action = 'bootstrap' then
    null;
  elsif p_action = 'addCategory' then
    v_id := p_payload->>'id'; v_label := btrim(p_payload->>'label');
    if v_id is null or v_id !~ '^[a-z][a-z0-9-]{1,60}$'
       or v_label is null or length(v_label) not between 1 and 70 then
      raise exception 'invalid_category';
    end if;
    insert into public.site_access_categories(id,label) values(v_id,v_label);
    insert into public.site_access_audit(action,actor_twitch_id,subject,details)
      values(p_action,p_actor_twitch_id,v_id,jsonb_build_object('label',v_label));
  elsif p_action = 'addSection' then
    v_category := p_payload->>'category_id'; v_id := p_payload->>'id';
    v_label := btrim(p_payload->>'label');
    if v_id is null or v_id !~ '^[a-z][a-z0-9-]{1,60}$'
       or v_label is null or length(v_label) not between 1 and 70
       or not exists(select 1 from public.site_access_categories where id=v_category and active) then
      raise exception 'invalid_section';
    end if;
    insert into public.site_access_sections(category_id,id,label) values(v_category,v_id,v_label);
    insert into public.site_access_audit(action,actor_twitch_id,subject,details)
      values(p_action,p_actor_twitch_id,v_category||'/'||v_id,jsonb_build_object('label',v_label));
  elsif p_action = 'addPermission' then
    v_category := p_payload->>'category_id'; v_section := p_payload->>'section_id';
    v_code := p_payload->>'code'; v_label := btrim(p_payload->>'label');
    if v_code is null or v_code !~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*){2,}$'
       or v_code ~ '^(portal|site|system)\.'
       or v_label is null or length(v_label) not between 1 and 70
       or not exists(select 1 from public.site_access_sections
                     where category_id=v_category and id=v_section and active) then
      raise exception 'invalid_permission';
    end if;
    insert into public.site_access_permissions(code,category_id,section_id,label,connected)
      values(v_code,v_category,v_section,v_label,false);
    insert into public.site_access_audit(action,actor_twitch_id,subject,details)
      values(p_action,p_actor_twitch_id,v_code,jsonb_build_object('label',v_label,'connected',false));
  elsif p_action = 'syncModerators' then
    -- Import fourni par la fonction serveur après validation du compte du diffuseur.
    -- Ne pas accepter de liste provenant du navigateur.
    if jsonb_typeof(p_payload->'moderators') <> 'array'
       or jsonb_array_length(p_payload->'moderators') not between 1 and 2000 then
      raise exception 'invalid_moderator_snapshot';
    end if;
    if exists(
      select 1 from jsonb_to_recordset(p_payload->'moderators') as m(user_id text,user_name text)
      where m.user_id is null or m.user_id !~ '^[0-9]{1,32}$'
         or m.user_name is null or length(btrim(m.user_name)) not between 1 and 70
    ) then
      raise exception 'invalid_moderator_snapshot';
    end if;
    if exists(
      select 1 from jsonb_to_recordset(p_payload->'moderators') as m(user_id text,user_name text)
      group by m.user_id having count(*) > 1
    ) then
      raise exception 'duplicate_moderator_id';
    end if;

    -- Sérialisation de deux synchronisations concurrentes.
    perform pg_catalog.pg_advisory_xact_lock(99977368);
    update public.site_access_people pe
      set is_moderator=false,last_twitch_sync=now()
      where is_moderator
        and not exists (
          select 1 from jsonb_to_recordset(p_payload->'moderators') as m(user_id text,user_name text)
          where m.user_id=pe.twitch_user_id
        );
    insert into public.site_access_people
      (twitch_user_id,display_name,is_moderator,last_twitch_sync)
    select m.user_id,btrim(m.user_name),true,now()
    from jsonb_to_recordset(p_payload->'moderators') as m(user_id text,user_name text)
    on conflict(twitch_user_id) do update
      set display_name=excluded.display_name,is_moderator=true,last_twitch_sync=now();

    -- Les attributions site_access_grants ne sont ni effacées ni activées.
    insert into public.site_access_audit(action,actor_twitch_id,subject,details)
    values(p_action,p_actor_twitch_id,'deadelustv',
      jsonb_build_object('count',jsonb_array_length(p_payload->'moderators'),
                         'grants_preserved',true,'rights_effective',false));

  elsif p_action = 'setGrant' then
    v_person := p_payload->>'user_id'; v_code := p_payload->>'code';
    if jsonb_typeof(p_payload->'enabled') <> 'boolean' then
      raise exception 'invalid_grant';
    end if;
    v_enabled := (p_payload->>'enabled')::boolean;
    if v_person is null or v_person !~ '^[0-9]{1,32}$'
       or not exists(select 1 from public.site_access_people where twitch_user_id=v_person)
       or not exists(select 1 from public.site_access_permissions where code=v_code and active) then
      raise exception 'invalid_grant';
    end if;
    insert into public.site_access_grants(twitch_user_id,permission_code,enabled,changed_by_twitch_id)
    values(v_person,v_code,v_enabled,p_actor_twitch_id)
    on conflict(twitch_user_id,permission_code) do update
    set enabled=excluded.enabled,changed_by_twitch_id=excluded.changed_by_twitch_id,changed_at=now();
    insert into public.site_access_audit(action,actor_twitch_id,subject,details)
      values(p_action,p_actor_twitch_id,v_person||'/'||v_code,jsonb_build_object('enabled',v_enabled,'effective',false));
  else
    raise exception 'invalid_action';
  end if;

  return jsonb_build_object(
    'authorized',true, 'phase','draft_registry', 'rights_effective',false,
    'categories',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'label',c.label,
        'sections',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',s.id,'label',s.label,
            'permissions',coalesce((
              select jsonb_agg(jsonb_build_object('code',p.code,'label',p.label,'connected',p.connected)
                               order by p.position,p.code)
              from public.site_access_permissions p
              where p.category_id=s.category_id and p.section_id=s.id and p.active
            ),'[]'::jsonb)
          ) order by s.position,s.id)
          from public.site_access_sections s
          where s.category_id=c.id and s.active
        ),'[]'::jsonb)
      ) order by c.position,c.id)
      from public.site_access_categories c where c.active
    ),'[]'::jsonb),
    'people',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',pe.twitch_user_id,'name',pe.display_name,'is_moderator',pe.is_moderator,
        'rights',coalesce((
          select jsonb_agg(g.permission_code order by g.permission_code)
          from public.site_access_grants g
          where g.twitch_user_id=pe.twitch_user_id and g.enabled
        ),'[]'::jsonb)
      ) order by pe.display_name,pe.twitch_user_id)
      from public.site_access_people pe
    ),'[]'::jsonb)
  );
end
$function$;

revoke all on function public.site_access_admin_action(text,jsonb,text) from public, anon, authenticated;
grant execute on function public.site_access_admin_action(text,jsonb,text) to service_role;

commit;
