-- Rôle administrateur de secours News Phasmophobia (distinct du rédacteur).
-- Ne modifie aucune table TCG, ni la publication des articles.
-- Appliqué au même projet Supabase Auth que le TCG.
BEGIN;

CREATE TABLE public.phasmo_news_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  granted_at timestamptz NOT NULL DEFAULT now()
);

-- Un seul compte administrateur du blog actif dans ce périmètre.
CREATE UNIQUE INDEX phasmo_one_active_news_admin
  ON public.phasmo_news_admins ((true)) WHERE enabled;

ALTER TABLE public.phasmo_news_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phasmo_news_admins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.phasmo_news_admins TO authenticated;
CREATE POLICY phasmo_news_admin_read_own_status
  ON public.phasmo_news_admins FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Les utilisateurs authentifiés ne doivent jamais pouvoir s'attribuer
-- ou modifier les rôles rédacteur et administrateur : aucune écriture client
-- possible dans phasmo_news_editors / phasmo_news_admins.

-- Évite que l'admin puisse transférer le propriétaire d'un brouillon
-- ou injecter un autre identifiant dans une mise à jour ordinaire.
REVOKE UPDATE ON public.phasmo_news_drafts FROM authenticated;
GRANT UPDATE (payload, updated_at) ON public.phasmo_news_drafts TO authenticated;

-- Une politique permissive unique par action. Le rôle admin ouvre accès
-- aux brouillons du blog, mais pas à d'autres tables ni modules.
DROP POLICY phasmo_editor_reads_own_drafts ON public.phasmo_news_drafts;
CREATE POLICY phasmo_editor_reads_own_drafts
 ON public.phasmo_news_drafts FOR SELECT TO authenticated
 USING (
   (owner_id = (SELECT auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.phasmo_news_editors e
       WHERE e.user_id = (SELECT auth.uid()) AND e.enabled
     ))
   OR EXISTS (
       SELECT 1 FROM public.phasmo_news_admins a
       WHERE a.user_id = (SELECT auth.uid()) AND a.enabled
     )
 );

DROP POLICY phasmo_editor_creates_own_drafts ON public.phasmo_news_drafts;
CREATE POLICY phasmo_editor_creates_own_drafts
 ON public.phasmo_news_drafts FOR INSERT TO authenticated
 WITH CHECK (
    owner_id = (SELECT auth.uid()) AND
    (
      EXISTS (SELECT 1 FROM public.phasmo_news_editors e
              WHERE e.user_id = (SELECT auth.uid()) AND e.enabled)
      OR EXISTS (SELECT 1 FROM public.phasmo_news_admins a
                 WHERE a.user_id = (SELECT auth.uid()) AND a.enabled)
    )
 );

DROP POLICY phasmo_editor_updates_own_drafts ON public.phasmo_news_drafts;
CREATE POLICY phasmo_editor_updates_own_drafts
 ON public.phasmo_news_drafts FOR UPDATE TO authenticated
 USING (
   (owner_id = (SELECT auth.uid())
     AND EXISTS (SELECT 1 FROM public.phasmo_news_editors e
                 WHERE e.user_id = (SELECT auth.uid()) AND e.enabled))
   OR EXISTS (SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id = (SELECT auth.uid()) AND a.enabled)
 )
 WITH CHECK (
   (owner_id = (SELECT auth.uid())
     AND EXISTS (SELECT 1 FROM public.phasmo_news_editors e
                 WHERE e.user_id = (SELECT auth.uid()) AND e.enabled))
   OR EXISTS (SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id = (SELECT auth.uid()) AND a.enabled)
 );

DROP POLICY phasmo_editor_deletes_own_drafts ON public.phasmo_news_drafts;
CREATE POLICY phasmo_editor_deletes_own_drafts
 ON public.phasmo_news_drafts FOR DELETE TO authenticated
 USING (
   (owner_id = (SELECT auth.uid())
     AND EXISTS (SELECT 1 FROM public.phasmo_news_editors e
                 WHERE e.user_id = (SELECT auth.uid()) AND e.enabled))
   OR EXISTS (SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id = (SELECT auth.uid()) AND a.enabled)
 );

COMMIT;

-- L'attribution du compte administrateur n'est PAS contenue dans la
-- migration du schéma. Elle est effectuée séparément après vérification
-- de l'identité Auth/Twitch existante via l'interface administrateur.
