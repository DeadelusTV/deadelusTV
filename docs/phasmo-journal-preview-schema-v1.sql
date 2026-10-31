-- Carnet Phasmophobia V7 - première migration sur projet Supabase partagé.
-- DÉPLOIEMENT LIMITÉ À PREVIEW : aucun accès de production ni média public.
-- Les comptes autorisés sont volontairement vides après création.
-- Les News et le TCG restent intacts.
BEGIN;

CREATE TABLE public.phasmo_journal_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.phasmo_journal_editors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.phasmo_journal_preview_drafts (
  stage text PRIMARY KEY DEFAULT 'preview' CHECK (stage = 'preview'),
  payload jsonb NOT NULL
    CHECK (
      jsonb_typeof(payload) = 'object'
      AND payload @> '{"version":7}'::jsonb
      AND jsonb_typeof(payload->'records') = 'array'
      AND jsonb_typeof(payload->'folders') = 'array'
      AND jsonb_typeof(payload->'elements') = 'array'
      AND octet_length(payload::text) <= 8388608
    ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.phasmo_journal_preview_revisions (
  revision bigint PRIMARY KEY CHECK (revision >= 1),
  payload jsonb NOT NULL,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  saved_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phasmo_journal_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phasmo_journal_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phasmo_journal_preview_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phasmo_journal_preview_revisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.phasmo_journal_admins, public.phasmo_journal_editors,
  public.phasmo_journal_preview_drafts, public.phasmo_journal_preview_revisions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.phasmo_journal_admins, public.phasmo_journal_editors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.phasmo_journal_preview_drafts TO authenticated;
GRANT SELECT ON TABLE public.phasmo_journal_preview_revisions TO authenticated;

CREATE POLICY phasmo_journal_admins_read_own ON public.phasmo_journal_admins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY phasmo_journal_editors_read_own ON public.phasmo_journal_editors
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY phasmo_journal_preview_drafts_read ON public.phasmo_journal_preview_drafts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.phasmo_journal_admins a
      WHERE a.user_id = (SELECT auth.uid()) AND a.enabled
  ) OR EXISTS (
    SELECT 1 FROM public.phasmo_journal_editors e
      WHERE e.user_id = (SELECT auth.uid()) AND e.enabled
  ));

CREATE POLICY phasmo_journal_preview_drafts_create ON public.phasmo_journal_preview_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    stage = 'preview' AND updated_by = (SELECT auth.uid())
    AND (EXISTS (
      SELECT 1 FROM public.phasmo_journal_admins a
        WHERE a.user_id = (SELECT auth.uid()) AND a.enabled
    ) OR EXISTS (
      SELECT 1 FROM public.phasmo_journal_editors e
        WHERE e.user_id = (SELECT auth.uid()) AND e.enabled
    ))
  );

CREATE POLICY phasmo_journal_preview_drafts_update ON public.phasmo_journal_preview_drafts
  FOR UPDATE TO authenticated
  USING (
    stage = 'preview' AND
    (EXISTS (
      SELECT 1 FROM public.phasmo_journal_admins a
        WHERE a.user_id = (SELECT auth.uid()) AND a.enabled
    ) OR EXISTS (
      SELECT 1 FROM public.phasmo_journal_editors e
        WHERE e.user_id = (SELECT auth.uid()) AND e.enabled
    ))
  )
  WITH CHECK (
    stage = 'preview' AND updated_by = (SELECT auth.uid())
    AND (EXISTS (
      SELECT 1 FROM public.phasmo_journal_admins a
        WHERE a.user_id = (SELECT auth.uid()) AND a.enabled
    ) OR EXISTS (
      SELECT 1 FROM public.phasmo_journal_editors e
        WHERE e.user_id = (SELECT auth.uid()) AND e.enabled
    ))
  );

CREATE POLICY phasmo_journal_preview_revisions_read ON public.phasmo_journal_preview_revisions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.phasmo_journal_admins a
      WHERE a.user_id = (SELECT auth.uid()) AND a.enabled
  ) OR EXISTS (
    SELECT 1 FROM public.phasmo_journal_editors e
      WHERE e.user_id = (SELECT auth.uid()) AND e.enabled
  ));

-- Seul le trigger interne écrit l'historique.
CREATE SCHEMA phasmo_journal_private;
REVOKE ALL ON SCHEMA phasmo_journal_private FROM PUBLIC, anon, authenticated;
CREATE FUNCTION phasmo_journal_private.record_preview_revision()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $BODY$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.revision <> 1 THEN
    RAISE EXCEPTION 'La première révision doit être 1';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.revision <> OLD.revision + 1 OR NEW.stage <> OLD.stage
  ) THEN
    RAISE EXCEPTION 'Révision invalide : incrément de 1 obligatoire';
  END IF;
  INSERT INTO public.phasmo_journal_preview_revisions
    (revision, payload, updated_by)
  VALUES (NEW.revision, NEW.payload, NEW.updated_by);
  RETURN NEW;
END;
$BODY$;
REVOKE ALL ON FUNCTION phasmo_journal_private.record_preview_revision()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER phasmo_journal_preview_revision_audit
AFTER INSERT OR UPDATE ON public.phasmo_journal_preview_drafts
FOR EACH ROW EXECUTE FUNCTION phasmo_journal_private.record_preview_revision();

COMMIT;
