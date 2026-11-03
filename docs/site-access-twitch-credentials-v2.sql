-- DeadelusTV V2 — Secret OAuth Twitch du diffuseur (préparation NON APPLIQUÉE).
-- À installer UNIQUEMENT sur une base de recette isolée puis après validation sécurité.
-- N'affecte pas les rôles News, Livre, Crew ou TCG.
begin;

-- Un seul diffuseur : jetons chiffrés AES-GCM par le serveur AVANT écriture.
-- La clé de chiffrement n'est jamais stockée dans PostgreSQL.
create table public.site_access_twitch_credentials (
  id smallint primary key default 1 check (id = 1),
  sealed_bundle text not null check (
    length(sealed_bundle) between 50 and 15000
    and left(sealed_bundle,3) = 'v1.'
  ),
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now()
);
alter table public.site_access_twitch_credentials enable row level security;
revoke all on public.site_access_twitch_credentials from public,anon,authenticated;
grant select,insert,update on public.site_access_twitch_credentials to service_role;

-- État OAuth unique et court pour le diffuseur ; on ne stocke que le SHA-256 du state.
-- Une nouvelle demande invalide toute demande précédente du même compte.
create table public.site_access_twitch_pending (
  actor_twitch_id text primary key check (actor_twitch_id = '99977368'),
  state_sha256 text not null unique check (state_sha256 ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null
);
alter table public.site_access_twitch_pending enable row level security;
revoke all on public.site_access_twitch_pending from public,anon,authenticated;
grant select,insert,update,delete on public.site_access_twitch_pending to service_role;

-- Consommation en UNE transaction ; interdit la réutilisation d'un code OAuth.
create function public.site_access_twitch_consume_state(p_state_sha256 text)
returns text language plpgsql security invoker set search_path = '' as $fn$
declare v_actor text;
begin
  if p_state_sha256 is null or p_state_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_state';
  end if;
  delete from public.site_access_twitch_pending
  where state_sha256=p_state_sha256 and expires_at>now()
  returning actor_twitch_id into v_actor;
  return v_actor;
end
$fn$;

-- Connexion initiale, autorisée seulement après validation OAuth Deadelus par Edge.
create function public.site_access_twitch_store(
  p_sealed_bundle text, p_actor_twitch_id text
) returns void language plpgsql security invoker set search_path = '' as $fn$
begin
  if p_actor_twitch_id <> '99977368' or p_sealed_bundle is null or
     length(p_sealed_bundle) not between 50 and 15000 or
     left(p_sealed_bundle,3) <> 'v1.' then
    raise exception 'invalid_oauth';
  end if;
  insert into public.site_access_twitch_credentials(id,sealed_bundle,revision)
    values (1,p_sealed_bundle,1)
  on conflict(id) do update
    set sealed_bundle=excluded.sealed_bundle,
        revision=public.site_access_twitch_credentials.revision+1,
        updated_at=now();
end
$fn$;

-- Rotation optimiste : protège la réécriture silencieuse d'un refresh token
-- par une fonction concurrente qui aurait lu une version plus ancienne.
create function public.site_access_twitch_compare_swap(
  p_expected_revision bigint,p_sealed_bundle text
) returns boolean language plpgsql security invoker set search_path = '' as $fn$
declare v_rows bigint;
begin
  if p_expected_revision is null or p_expected_revision < 1 or
     p_sealed_bundle is null or length(p_sealed_bundle) not between 50 and 15000 or
     left(p_sealed_bundle,3) <> 'v1.' then
    raise exception 'invalid_oauth';
  end if;
  update public.site_access_twitch_credentials
    set sealed_bundle=p_sealed_bundle,revision=revision+1,updated_at=now()
    where id=1 and revision=p_expected_revision;
  get diagnostics v_rows=row_count;
  return v_rows=1;
end
$fn$;

revoke all on function public.site_access_twitch_consume_state(text) from public,anon,authenticated;
revoke all on function public.site_access_twitch_store(text,text) from public,anon,authenticated;
revoke all on function public.site_access_twitch_compare_swap(bigint,text) from public,anon,authenticated;
grant execute on function public.site_access_twitch_consume_state(text) to service_role;
grant execute on function public.site_access_twitch_store(text,text) to service_role;
grant execute on function public.site_access_twitch_compare_swap(bigint,text) to service_role;

commit;
