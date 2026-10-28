-- Phasmo V7 : empêcher un retrait d'une autre publication que celle confirmée.
-- Correctif sécurisé, SANS ouvrir activation_enabled ni publier de médias.
BEGIN;

CREATE OR REPLACE FUNCTION public.phasmo_journal_disable_official_release(
 p_actor uuid, p_expected_release bigint
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE live_release bigint;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.phasmo_journal_admins a
  WHERE a.user_id=p_actor AND a.enabled
 ) THEN
  RAISE EXCEPTION 'Administrateur du carnet non autorisé' USING ERRCODE='42501';
 END IF;
 IF p_expected_release IS NULL OR p_expected_release<1 THEN
  RAISE EXCEPTION 'Numéro de publication attendu invalide' USING ERRCODE='22023';
 END IF;

 -- Le verrou est partagé avec la réservation, le commit et la restauration.
 PERFORM pg_catalog.pg_advisory_xact_lock(831067,17);
 SELECT p.release_number INTO live_release
 FROM public.phasmo_journal_production_publications p
 WHERE p.stage='production' AND p.visibility='live'
 FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Aucune publication en ligne à retirer' USING ERRCODE='40001';
 END IF;
 IF live_release<>p_expected_release THEN
  RAISE EXCEPTION 'La publication en ligne a changé : actualise le statut'
   USING ERRCODE='40001';
 END IF;

 UPDATE public.phasmo_journal_production_release_controls
 SET activation_enabled=false WHERE singleton=true;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Verrou de publication indisponible' USING ERRCODE='55000';
 END IF;

 UPDATE public.phasmo_journal_production_publications
 SET visibility='disabled'
 WHERE stage='production' AND visibility='live' AND release_number=p_expected_release;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Retrait non confirmé' USING ERRCODE='40001';
 END IF;
 RETURN true;
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_disable_official_release(uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_disable_official_release(uuid,bigint)
 TO service_role;

-- L'ancienne signature est conservée en refus, pour empêcher un ancien
-- code d'enlever une publication sans numéro explicitement confirmé.
CREATE OR REPLACE FUNCTION public.phasmo_journal_disable_official_release(
 p_actor uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
BEGIN
 RAISE EXCEPTION 'Version précise obligatoire pour une mise hors ligne'
  USING ERRCODE='42501';
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_disable_official_release(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_disable_official_release(uuid)
 TO service_role;
COMMIT;
