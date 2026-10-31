-- 31/10/2026 : poursuivre la numérotation après nettoyage de la publication de recette active.
-- L'historique privé est conservé ; les contrôles Auth/admin et de révision restent identiques.
CREATE OR REPLACE FUNCTION phasmo_journal_private.prepare_preview_publication()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    SELECT COALESCE(MAX(h.release_number),0)+1 INTO NEW.release_number
      FROM public.phasmo_journal_preview_publication_history h;
  END IF;
  NEW.payload := d.payload;
  NEW.published_by := publisher;
  NEW.published_at := clock_timestamp();
  RETURN NEW;
END;
$function$

