-- PRÉPARATION, NON APPLIQUÉE. À auditer et convertir en migration officielle
-- pour le projet Supabase DeadelusTV TCG, après accord explicite.
-- Ne pas exécuter sur une base de production sans revue des droits.
-- Aucune autorisation de publication publique n'est accordée ici.

BEGIN;

CREATE TABLE IF NOT EXISTS public.phasmo_news_editors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  granted_at timestamptz NOT NULL DEFAULT now()
);

-- Un seul rédacteur autorisé à la fois. Plusieurs comptes désactivés restent possibles.
CREATE UNIQUE INDEX IF NOT EXISTS phasmo_one_active_editor
  ON public.phasmo_news_editors ((true)) WHERE enabled;

ALTER TABLE public.phasmo_news_editors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phasmo_news_editors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.phasmo_news_editors TO authenticated;

CREATE POLICY phasmo_read_own_editor_permission
  ON public.phasmo_news_editors FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Le frontend n'a AUCUNE autorisation INSERT/UPDATE/DELETE sur l'ACL :
-- seul un administrateur ayant les droits SQL peut désigner/révoquer le rédacteur.

CREATE TABLE IF NOT EXISTS public.phasmo_news_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT phasmo_draft_is_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT phasmo_draft_size CHECK (octet_length(payload::text) <= 1000000)
);

CREATE INDEX IF NOT EXISTS phasmo_draft_owner_recent
  ON public.phasmo_news_drafts(owner_id,updated_at DESC);

ALTER TABLE public.phasmo_news_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phasmo_news_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.phasmo_news_drafts TO authenticated;

CREATE POLICY phasmo_editor_reads_own_drafts
 ON public.phasmo_news_drafts FOR SELECT TO authenticated
 USING (
   owner_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.phasmo_news_editors AS permitted
     WHERE permitted.user_id = (SELECT auth.uid()) AND permitted.enabled
   )
 );

CREATE POLICY phasmo_editor_creates_own_drafts
 ON public.phasmo_news_drafts FOR INSERT TO authenticated
 WITH CHECK (
   owner_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.phasmo_news_editors AS permitted
     WHERE permitted.user_id = (SELECT auth.uid()) AND permitted.enabled
   )
 );

CREATE POLICY phasmo_editor_updates_own_drafts
 ON public.phasmo_news_drafts FOR UPDATE TO authenticated
 USING (
   owner_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.phasmo_news_editors AS permitted
     WHERE permitted.user_id = (SELECT auth.uid()) AND permitted.enabled
   )
 )
 WITH CHECK (
   owner_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.phasmo_news_editors AS permitted
     WHERE permitted.user_id = (SELECT auth.uid()) AND permitted.enabled
   )
 );

CREATE POLICY phasmo_editor_deletes_own_drafts
 ON public.phasmo_news_drafts FOR DELETE TO authenticated
 USING (
   owner_id = (SELECT auth.uid()) AND EXISTS (
     SELECT 1 FROM public.phasmo_news_editors AS permitted
     WHERE permitted.user_id = (SELECT auth.uid()) AND permitted.enabled
   )
 );

COMMIT;

-- ATTRIBUTION MANUELLE À UN SEUL COMPTE, VOLONTAIREMENT NON EXÉCUTÉE :
-- Après connexion Twitch de notre rédacteur, récupérer son user_id AUTH depuis
-- le tableau de bord Supabase sécurisé (ne pas utiliser un pseudo côté client).
-- BEGIN;
-- UPDATE public.phasmo_news_editors SET enabled = false WHERE enabled;
-- INSERT INTO public.phasmo_news_editors (user_id,enabled)
-- VALUES ('UUID-AUTH-DU-REDACTEUR',true)
-- ON CONFLICT (user_id) DO UPDATE SET enabled = true,granted_at = now();
-- COMMIT;
--
-- Pour le révoquer : UPDATE public.phasmo_news_editors SET enabled = false
-- WHERE user_id = 'UUID-AUTH-DU-REDACTEUR';
--
-- Les autres profils, y compris les autres Helpers et admins TCG, ne sont
-- pas automatiquement autorisés : aucun pont avec tcg_admins ni is_moderator.
