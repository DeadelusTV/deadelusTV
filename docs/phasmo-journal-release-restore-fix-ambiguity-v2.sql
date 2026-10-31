-- Correctif 28/10/2026 : le paramètre OUT release_number
-- rendait WHERE release_number=... ambigu en PL/pgSQL.
-- Conserve l'autorisation service_role exclusive.
-- Réactivation d'une publication officielle antérieure comme NOUVELLE version.
-- Réservée au service_role et bloquée tant que le verrou public est fermé.
BEGIN;
CREATE OR REPLACE FUNCTION public.phasmo_journal_restore_official_release(
 p_actor uuid,p_target_release bigint
)
RETURNS TABLE(release_number bigint,restored_from bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE h record; n bigint;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.phasmo_journal_production_release_controls
   WHERE singleton AND activation_enabled)
 THEN RAISE EXCEPTION 'Restauration publique verrouillee' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.phasmo_journal_admins a
   WHERE a.user_id=p_actor AND a.enabled)
 THEN RAISE EXCEPTION 'Administrateur du carnet non autorise' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(831067,17);
 SELECT past.* INTO h FROM public.phasmo_journal_production_publication_history AS past
  WHERE past.release_number=p_target_release;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version historique introuvable' USING ERRCODE='22023'; END IF;

 -- Ne jamais restaurer vers une version qui pointe sur des médias supprimés.
 IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(h.payload->'elements') e
   WHERE e->>'kind'='image' AND COALESCE(e->>'image','')<>''
   AND NOT EXISTS(
    SELECT 1 FROM storage.objects o WHERE
      o.bucket_id='phasmo-journal-public-assets'
      AND o.name=pg_catalog.substring(e->>'image',18)
   )
 ) OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(h.payload->'fonts') f
   WHERE COALESCE(f->>'data','')<>'' AND NOT EXISTS(
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='phasmo-journal-public-assets'
      AND o.name=pg_catalog.substring(f->>'data',18)
   )
 ) THEN RAISE EXCEPTION 'Media manquant pour cette ancienne version' USING ERRCODE='22023'; END IF;

 SELECT GREATEST(COALESCE(MAX(x.release_number),0),
  COALESCE((SELECT MAX(p.release_number) FROM public.phasmo_journal_production_publications p),0))+1
 INTO n FROM public.phasmo_journal_production_publication_history x;

 INSERT INTO public.phasmo_journal_production_publications
  (stage,visibility,release_number,source_preview_revision,payload,approved_by,approved_at,published_at)
 VALUES('production','live',n,h.source_preview_revision,h.payload,p_actor,now(),now())
 ON CONFLICT(stage) DO UPDATE SET
  visibility=excluded.visibility,release_number=excluded.release_number,
  source_preview_revision=excluded.source_preview_revision,payload=excluded.payload,
  approved_by=excluded.approved_by,approved_at=excluded.approved_at,published_at=excluded.published_at;
 INSERT INTO public.phasmo_journal_production_publication_history
  (release_number,source_preview_revision,payload,approved_by,approved_at,published_at,visibility)
 VALUES(n,h.source_preview_revision,h.payload,p_actor,now(),now(),'live');
 RETURN QUERY SELECT n,p_target_release;
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_restore_official_release(uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_restore_official_release(uuid,bigint)
 TO service_role;
COMMIT;