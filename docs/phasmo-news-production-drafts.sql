-- Éditorial News Phasmo : isoler brouillons du site officiel des tests PREVIEW.
-- Nouvelle table, sans modifier ni déplacer les brouillons existants.
CREATE TABLE public.phasmo_news_drafts_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(payload)='object' AND octet_length(payload::text)<=1000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phasmo_news_drafts_production_owner_idx
ON public.phasmo_news_drafts_production(owner_id,updated_at DESC);
ALTER TABLE public.phasmo_news_drafts_production ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phasmo_news_drafts_production FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.phasmo_news_drafts_production TO authenticated;
GRANT UPDATE (payload,updated_at) ON public.phasmo_news_drafts_production TO authenticated;

CREATE POLICY phasmo_prod_drafts_read ON public.phasmo_news_drafts_production
FOR SELECT TO authenticated
USING (
  (owner_id=(SELECT auth.uid()) AND EXISTS(
    SELECT 1 FROM public.phasmo_news_editors e WHERE e.user_id=(SELECT auth.uid()) AND e.enabled
  ))
  OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
);
CREATE POLICY phasmo_prod_drafts_create ON public.phasmo_news_drafts_production
FOR INSERT TO authenticated
WITH CHECK (
  owner_id=(SELECT auth.uid())
  AND (
    EXISTS(SELECT 1 FROM public.phasmo_news_editors e WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
    OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
  )
);
CREATE POLICY phasmo_prod_drafts_update ON public.phasmo_news_drafts_production
FOR UPDATE TO authenticated
USING (
  (owner_id=(SELECT auth.uid()) AND EXISTS(
    SELECT 1 FROM public.phasmo_news_editors e WHERE e.user_id=(SELECT auth.uid()) AND e.enabled
  ))
  OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
)
WITH CHECK (
  (owner_id=(SELECT auth.uid()) AND EXISTS(
    SELECT 1 FROM public.phasmo_news_editors e WHERE e.user_id=(SELECT auth.uid()) AND e.enabled
  ))
  OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
);
CREATE POLICY phasmo_prod_drafts_delete ON public.phasmo_news_drafts_production
FOR DELETE TO authenticated
USING (
  (owner_id=(SELECT auth.uid()) AND EXISTS(
    SELECT 1 FROM public.phasmo_news_editors e WHERE e.user_id=(SELECT auth.uid()) AND e.enabled
  ))
  OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
);
