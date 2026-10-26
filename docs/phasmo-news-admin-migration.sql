-- DOCUMENTATION DES DEUX MIGRATIONS APPLIQUÉES LE 26/10/2026
-- Projet Supabase : eodtxlhnfzyapkyvvxdi (DeadelusTV/TCG).
-- Ne pas les réexécuter : elles sont enregistrées dans l'historique Supabase.
-- Aucun compte n'est attribué dans ces migrations.
--
-- 1) phasmo_news_admin_role_only_v1
CREATE TABLE IF NOT EXISTS public.phasmo_news_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS phasmo_one_active_news_admin
  ON public.phasmo_news_admins ((true)) WHERE enabled;
ALTER TABLE public.phasmo_news_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phasmo_news_admins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.phasmo_news_admins TO authenticated;
CREATE POLICY phasmo_news_admin_read_own_status
  ON public.phasmo_news_admins FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 2) phasmo_news_admin_draft_rls_v1
-- Une seule politique par verbe évite les avertissements
-- "multiple permissive policies". Aucun rôle du TCG ne donne ces droits.
ALTER POLICY phasmo_editor_reads_own_drafts ON public.phasmo_news_drafts
  USING (
    (owner_id=(SELECT auth.uid())
     AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
                WHERE e.user_id=(SELECT auth.uid()) AND e.enabled))
    OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
  );
ALTER POLICY phasmo_editor_creates_own_drafts ON public.phasmo_news_drafts
  WITH CHECK (
    owner_id=(SELECT auth.uid()) AND
    (EXISTS(SELECT 1 FROM public.phasmo_news_editors e
            WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
     OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
               WHERE a.user_id=(SELECT auth.uid()) AND a.enabled))
  );
ALTER POLICY phasmo_editor_updates_own_drafts ON public.phasmo_news_drafts
  USING (
    (owner_id=(SELECT auth.uid())
     AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
                WHERE e.user_id=(SELECT auth.uid()) AND e.enabled))
    OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
  )
  WITH CHECK (
    (owner_id=(SELECT auth.uid())
     AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
                WHERE e.user_id=(SELECT auth.uid()) AND e.enabled))
    OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
  );
ALTER POLICY phasmo_editor_deletes_own_drafts ON public.phasmo_news_drafts
  USING (
    (owner_id=(SELECT auth.uid())
     AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
                WHERE e.user_id=(SELECT auth.uid()) AND e.enabled))
    OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
  );
REVOKE UPDATE ON TABLE public.phasmo_news_drafts FROM authenticated;
GRANT UPDATE (payload, updated_at) ON TABLE public.phasmo_news_drafts TO authenticated;

-- Attribution du rôle : opération administrative SÉPARÉE, non incluse.
-- Vérifier l'identité OAuth du compte personnel, puis enregistrer son UUID
-- dans phasmo_news_admins. Ne JAMAIS déduire le rôle d'un pseudo affiché.
-- Sur la branche Phasmo, aucun droit n'est attribué à mattarix_ avant
-- sa première connexion officielle et sa vérification.
