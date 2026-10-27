-- Phasmophobia / Carnet interactif : PROJET DE SCHEMA, NON EXECUTE.
-- Version de conception 2026-10-27. A relire avec Deadelus avant toute activation.
-- Ne pas déployer dans le projet Supabase commun sans validation explicite.
-- L'accès à la table privée des rôles ne donne AUCUN droit par défaut.

begin;

create table if not exists public.phasmo_journal_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  granted_at timestamptz not null default now()
);
alter table public.phasmo_journal_admins enable row level security;
revoke all on table public.phasmo_journal_admins from anon, authenticated;
grant select on table public.phasmo_journal_admins to authenticated;

drop policy if exists phasma_journal_admins_self on public.phasmo_journal_admins;
create policy phasma_journal_admins_self on public.phasmo_journal_admins
  for select to authenticated
  using (user_id = (select auth.uid()));
-- Pas de politique INSERT/UPDATE/DELETE pour authenticated :
-- affectation/retrait des administrateurs par canal d'administration fiable uniquement.

create table if not exists public.phasmo_journal_documents (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'preview' check (stage in ('preview','production')),
  kind text not null check (kind in ('category','entry','layout')),
  category text not null check (length(category) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,100}$'),
  title text not null check (length(title) between 1 and 180),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 5000000),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (stage,category,slug)
);
create index if not exists phasmo_journal_documents_list
  on public.phasmo_journal_documents(stage,kind,category,is_published,sort_order);
alter table public.phasmo_journal_documents enable row level security;
revoke all on table public.phasmo_journal_documents from anon, authenticated;
grant select on table public.phasmo_journal_documents to anon, authenticated;
grant insert,update,delete on table public.phasmo_journal_documents to authenticated;

drop policy if exists phasma_journal_preview_public on public.phasmo_journal_documents;
create policy phasma_journal_preview_public on public.phasmo_journal_documents
  for select to anon, authenticated
  using (stage = 'preview' and is_published = true);

drop policy if exists phasma_journal_admin_read on public.phasmo_journal_documents;
create policy phasma_journal_admin_read on public.phasmo_journal_documents
  for select to authenticated
  using (exists (
    select 1 from public.phasmo_journal_admins a
    where a.user_id = (select auth.uid()) and a.enabled = true
  ));

drop policy if exists phasma_journal_admin_insert on public.phasmo_journal_documents;
create policy phasma_journal_admin_insert on public.phasmo_journal_documents
  for insert to authenticated
  with check (exists (
    select 1 from public.phasmo_journal_admins a
    where a.user_id = (select auth.uid()) and a.enabled = true
  ));

drop policy if exists phasma_journal_admin_update on public.phasmo_journal_documents;
create policy phasma_journal_admin_update on public.phasmo_journal_documents
  for update to authenticated
  using (exists (
    select 1 from public.phasmo_journal_admins a
    where a.user_id = (select auth.uid()) and a.enabled = true
  ))
  with check (exists (
    select 1 from public.phasmo_journal_admins a
    where a.user_id = (select auth.uid()) and a.enabled = true
  ));

drop policy if exists phasma_journal_admin_delete on public.phasmo_journal_documents;
create policy phasma_journal_admin_delete on public.phasmo_journal_documents
  for delete to authenticated
  using (exists (
    select 1 from public.phasmo_journal_admins a
    where a.user_id = (select auth.uid()) and a.enabled = true
  ));
commit;

-- Quand la production sera validée, AJOUTER une politique de lecture publique
-- stage='production', is_published=true ; ne pas reprendre des données preview par erreur.
--
-- À réaliser avant activation : limiter les catégories autorisées et l'ordre des pages,
-- sauvegardes/versions, traitement sécurisé des médias (Storage RLS distinct),
-- contrôle du format JSON, interface d'attribution/retrait des rôles et test RLS
-- anonyme, connecté ordinaire, rédacteur News, administrateur carnet, admin révoqué.
-- Ne JAMAIS placer d'image base64 géante ni un secret dans une table publique.
