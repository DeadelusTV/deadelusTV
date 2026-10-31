-- Phasmo V7 : PREVIEW publication privee. Jamais de publication production.
-- Le contenu publie est copie par un trigger depuis le brouillon SAUVEGARDE.
-- Un client ne peut pas injecter un payload arbitraire comme "publication".
BEGIN;

CREATE TABLE public.phasmo_journal_preview_publications (
  stage text PRIMARY KEY DEFAULT 'preview' CHECK (stage = 'preview'),
  source_revision bigint NOT NULL CHECK (source_revision >= 1),
  release_number bigint NOT NULL DEFAULT 1 CHECK (release_number >= 1),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(payload) = 'object'
      AND payload @> '{"version":7}'::jsonb
      AND jsonb_typeof(payload->'records') = 'array'
      AND jsonb_typeof(payload->'folders') = 'array'
      AND jsonb_typeof(payload->'elements') = 'array'
      AND octet_length(payload::text) <= 8388608),
  published_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.phasmo_journal_preview_publication_history (
  release_number bigint PRIMARY KEY CHECK (release_number >= 1),
  source_revision bigint NOT NULL,
  payload jsonb NOT NULL,
  published_by uuid NOT NULL REFERENCES auth.users(id),
  published_at timestamptz NOT NULL
);

ALTER TABLE public.phasmo_journal_preview_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phasmo_journal_preview_publication_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.phasmo_journal_preview_publications,
  public.phasmo_journal_preview_publication_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.phasmo_journal_preview_publications TO authenticated;
GRANT SELECT ON public.phasmo_journal_preview_publication_history TO authenticated;

CREATE POLICY phasmo_journal_published_preview_admin_read
 ON public.phasmo_journal_preview_publications FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.phasmo_journal_admins a
  WHERE a.user_id=(SELECT auth.uid()) AND a.enabled));

CREATE POLICY phasmo_journal_published_preview_admin_insert
 ON public.phasmo_journal_preview_publications FOR INSERT TO authenticated
 WITH CHECK (stage='preview' AND EXISTS (
  SELECT 1 FROM public.phasmo_journal_admins a
  WHERE a.user_id=(SELECT auth.uid()) AND a.enabled));

CREATE POLICY phasmo_journal_published_preview_admin_update
 ON public.phasmo_journal_preview_publications FOR UPDATE TO authenticated
 USING (stage='preview' AND EXISTS (
  SELECT 1 FROM public.phasmo_journal_admins a
  WHERE a.user_id=(SELECT auth.uid()) AND a.enabled))
 WITH CHECK (stage='preview' AND EXISTS (
  SELECT 1 FROM public.phasmo_journal_admins a
  WHERE a.user_id=(SELECT auth.uid()) AND a.enabled));

CREATE POLICY phasmo_journal_published_preview_history_admin_read
 ON public.phasmo_journal_preview_publication_history FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.phasmo_journal_admins a
  WHERE a.user_id=(SELECT auth.uid()) AND a.enabled));

-- Trigger prive : auteur, contenu, revision et horodatage sont controles en base.
CREATE FUNCTION phasmo_journal_private.prepare_preview_publication()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE
  d record;
  publisher uuid := auth.uid();
BEGIN
  IF publisher IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.phasmo_journal_admins a
    WHERE a.user_id=publisher AND a.enabled
  ) THEN
    RAISE EXCEPTION 'Publication reservee aux administrateurs du carnet' USING ERRCODE='42501';
  END IF;
  IF NEW.stage <> 'preview' THEN
    RAISE EXCEPTION 'Seul le stage preview est admis' USING ERRCODE='22023';
  END IF;
  SELECT revision, payload INTO d
    FROM public.phasmo_journal_preview_drafts
    WHERE stage='preview' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun brouillon partage a publier' USING ERRCODE='22023';
  END IF;
  IF d.revision <> NEW.source_revision THEN
    RAISE EXCEPTION 'La revision du brouillon a change : recharge avant publication'
      USING ERRCODE='40001';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.source_revision = OLD.source_revision THEN
      RAISE EXCEPTION 'Cette revision est deja publiee en preview' USING ERRCODE='22023';
    END IF;
    NEW.release_number := OLD.release_number+1;
  ELSE
    NEW.release_number := 1;
  END IF;
  NEW.payload := d.payload;
  NEW.published_by := publisher;
  NEW.published_at := clock_timestamp();
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION phasmo_journal_private.prepare_preview_publication()
 FROM PUBLIC, anon, authenticated;
CREATE TRIGGER phasmo_journal_preview_publication_guard
 BEFORE INSERT OR UPDATE ON public.phasmo_journal_preview_publications
 FOR EACH ROW EXECUTE FUNCTION phasmo_journal_private.prepare_preview_publication();

CREATE FUNCTION phasmo_journal_private.audit_preview_publication()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
BEGIN
  INSERT INTO public.phasmo_journal_preview_publication_history
    (release_number,source_revision,payload,published_by,published_at)
  VALUES (NEW.release_number,NEW.source_revision,NEW.payload,NEW.published_by,NEW.published_at);
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION phasmo_journal_private.audit_preview_publication()
 FROM PUBLIC, anon, authenticated;
CREATE TRIGGER phasmo_journal_preview_publication_audit
 AFTER INSERT OR UPDATE ON public.phasmo_journal_preview_publications
 FOR EACH ROW EXECUTE FUNCTION phasmo_journal_private.audit_preview_publication();
COMMIT;
