-- Empêcher qu'un brouillon ou une publication de TEST référence une
-- police personnalisée sans inclure son fichier dans payload.fonts.
-- Les anciennes publications ne sont PAS modifiées rétroactivement.
-- Cette protection s'applique aux futures écritures.
BEGIN;

CREATE FUNCTION phasmo_journal_private.check_preview_font_integrity()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $body$
BEGIN
  IF EXISTS(
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(NEW.payload->'elements') AS e
    WHERE e->>'font' ~ '^Atelier(?:Font)?_[A-Za-z0-9_-]{1,90}$'
      AND NOT EXISTS(
        SELECT 1
        FROM pg_catalog.jsonb_array_elements(NEW.payload->'fonts') AS f
        WHERE f->>'family'=e->>'font'
          AND f->>'data' ~ '^journal-storage://fonts/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-f0-9]{64}\.(ttf|otf|woff|woff2)$'
      )
  ) THEN
    RAISE EXCEPTION 'Police personnalisée absente des médias du carnet : enregistre à nouveau le brouillon avant publication'
      USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$body$;

REVOKE ALL ON FUNCTION phasmo_journal_private.check_preview_font_integrity()
 FROM PUBLIC, anon, authenticated;

CREATE TRIGGER zz_phasmo_journal_draft_font_integrity
BEFORE INSERT OR UPDATE ON public.phasmo_journal_preview_drafts
FOR EACH ROW EXECUTE FUNCTION phasmo_journal_private.check_preview_font_integrity();

-- Le trigger de publication « prepare_preview_publication » remplit NEW.payload
-- avant celui-ci (ordre alphabétique des triggers BEFORE).
CREATE TRIGGER zz_phasmo_journal_publication_font_integrity
BEFORE INSERT OR UPDATE ON public.phasmo_journal_preview_publications
FOR EACH ROW EXECUTE FUNCTION phasmo_journal_private.check_preview_font_integrity();

COMMIT;
