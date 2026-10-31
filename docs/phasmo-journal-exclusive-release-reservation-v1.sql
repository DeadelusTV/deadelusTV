-- Reservation exclusive des versions officielles avant copie des medias.
-- Deploiement SUR VERROU FERME : aucune publication n'est autorisee.
BEGIN;
ALTER TABLE public.phasmo_journal_production_release_controls
 ADD COLUMN reserved_token uuid,
 ADD COLUMN reserved_release bigint,
 ADD COLUMN reserved_actor uuid,
 ADD COLUMN reserved_preview_revision bigint,
 ADD COLUMN reserved_preview_release bigint;

CREATE FUNCTION public.phasmo_journal_reserve_official_release(
 p_actor uuid,p_source_revision bigint,p_source_release bigint,p_claim_token uuid
)
RETURNS TABLE(release_number bigint, claim_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE c record; n bigint;
BEGIN
 IF p_claim_token IS NULL OR p_actor IS NULL THEN
   RAISE EXCEPTION 'Reservation invalide' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(831067,17);
 IF NOT EXISTS(SELECT 1 FROM public.phasmo_journal_production_release_controls
   WHERE singleton=true AND activation_enabled=true)
 THEN RAISE EXCEPTION 'Publication publique verrouillee' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.phasmo_journal_admins a
    WHERE a.user_id=p_actor AND a.enabled)
 THEN RAISE EXCEPTION 'Administrateur non autorise' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.phasmo_journal_production_release_controls
    WHERE singleton AND reserved_token IS NOT NULL)
 THEN RAISE EXCEPTION 'Une publication est deja reservee : verification manuelle requise'
      USING ERRCODE='55P03'; END IF;

 SELECT * INTO c FROM public.phasmo_journal_production_candidates WHERE stage='production';
 IF NOT FOUND OR c.source_preview_revision<>p_source_revision
    OR c.source_preview_release<>p_source_release
 THEN RAISE EXCEPTION 'Le candidat officiel a change' USING ERRCODE='40001'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.phasmo_journal_preview_publications p
  WHERE p.stage='preview' AND p.source_revision=c.source_preview_revision
    AND p.release_number=c.source_preview_release AND p.payload=c.payload)
 THEN RAISE EXCEPTION 'La publication de test a change' USING ERRCODE='40001'; END IF;
 SELECT GREATEST(COALESCE(MAX(h.release_number),0),
  COALESCE((SELECT MAX(p.release_number)
   FROM public.phasmo_journal_production_publications p),0))+1
 INTO n FROM public.phasmo_journal_production_publication_history h;

 UPDATE public.phasmo_journal_production_release_controls
 SET reserved_token=p_claim_token,reserved_actor=p_actor,reserved_release=n,
     reserved_preview_revision=p_source_revision,
     reserved_preview_release=p_source_release
 WHERE singleton=true;
 RETURN QUERY SELECT n,p_claim_token;
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_reserve_official_release(uuid,bigint,bigint,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_reserve_official_release(uuid,bigint,bigint,uuid)
 TO service_role;

CREATE FUNCTION public.phasmo_journal_abort_official_release(
 p_actor uuid,p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE n bigint;
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(831067,17);
 SELECT reserved_release INTO n
 FROM public.phasmo_journal_production_release_controls
 WHERE singleton=true AND reserved_token=p_claim_token AND reserved_actor=p_actor
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation introuvable' USING ERRCODE='42501'; END IF;
 -- Ne jamais rendre le numero de version reutilisable si un objet public
 -- subsiste : le contenu du fichier devient public des son transfert.
 IF EXISTS(
  SELECT 1 FROM storage.objects o
  WHERE o.bucket_id='phasmo-journal-public-assets'
   AND (o.name LIKE 'images/releases/'||n::text||'/%'
        OR o.name LIKE 'fonts/releases/'||n::text||'/%')
 ) THEN RAISE EXCEPTION 'Medias publics toujours presents : reservation conservee'
   USING ERRCODE='55000'; END IF;
 UPDATE public.phasmo_journal_production_release_controls
 SET reserved_token=NULL,reserved_release=NULL,reserved_actor=NULL,
     reserved_preview_revision=NULL,reserved_preview_release=NULL
 WHERE singleton=true AND reserved_token=p_claim_token;
 RETURN FOUND;
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_abort_official_release(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_abort_official_release(uuid,uuid)
 TO service_role;

-- L'ancien commit sans token doit toujours REFUSER la publication.
CREATE OR REPLACE FUNCTION public.phasmo_journal_commit_official_release(
 p_actor uuid,p_source_revision bigint,p_source_release bigint,p_public_payload jsonb
)
RETURNS TABLE(release_number bigint,source_revision bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
BEGIN
 RAISE EXCEPTION 'Reservation exclusive obligatoire pour publier'
   USING ERRCODE='42501';
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_commit_official_release(uuid,bigint,bigint,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_commit_official_release(uuid,bigint,bigint,jsonb)
 TO service_role;

CREATE OR REPLACE FUNCTION public.phasmo_journal_commit_official_release(
 p_actor uuid, p_source_revision bigint, p_source_release bigint,
 p_public_payload jsonb, p_claim_token uuid
)
RETURNS TABLE (release_number bigint, source_revision bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE
  c record; n bigint; was_live boolean;
  src jsonb; dst jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.phasmo_journal_production_release_controls
    WHERE singleton=true AND activation_enabled=true) THEN
    RAISE EXCEPTION 'Publication publique verrouillee' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.phasmo_journal_admins a
    WHERE a.user_id=p_actor AND a.enabled) THEN
    RAISE EXCEPTION 'Administrateur du carnet non autorise' USING ERRCODE='42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(831067,17);
  IF NOT EXISTS (
    SELECT 1 FROM public.phasmo_journal_production_release_controls ctl
    WHERE ctl.singleton=true
      AND ctl.reserved_token=p_claim_token
      AND ctl.reserved_actor=p_actor
      AND ctl.reserved_preview_revision=p_source_revision
      AND ctl.reserved_preview_release=p_source_release
  ) THEN
    RAISE EXCEPTION 'Reservation de publication invalide ou expiree'
      USING ERRCODE='42501';
  END IF;
  SELECT * INTO c FROM public.phasmo_journal_production_candidates
    WHERE stage='production' FOR UPDATE;
  IF NOT FOUND OR c.source_preview_revision<>p_source_revision
      OR c.source_preview_release<>p_source_release THEN
    RAISE EXCEPTION 'La version officielle preparee ne correspond plus' USING ERRCODE='40001';
  END IF;
  IF jsonb_typeof(p_public_payload)<>'object'
      OR p_public_payload->>'version'<>'7'
      OR jsonb_typeof(p_public_payload->'elements')<>'array'
      OR jsonb_typeof(p_public_payload->'records')<>'array'
      OR jsonb_typeof(p_public_payload->'folders')<>'array'
      OR jsonb_typeof(p_public_payload->'fonts')<>'array' THEN
    RAISE EXCEPTION 'Document public invalide' USING ERRCODE='22023';
  END IF;
  IF octet_length(p_public_payload::text)>8388608 THEN
    RAISE EXCEPTION 'Document public trop volumineux' USING ERRCODE='22023';
  END IF;

  SELECT GREATEST(COALESCE(MAX(h.release_number),0),
      COALESCE((SELECT MAX(p.release_number) FROM public.phasmo_journal_production_publications p),0))+1
   INTO n FROM public.phasmo_journal_production_publication_history h;
  IF NOT EXISTS (
    SELECT 1 FROM public.phasmo_journal_production_release_controls ctl
    WHERE ctl.singleton=true AND ctl.reserved_token=p_claim_token AND ctl.reserved_release=n
  ) THEN
    RAISE EXCEPTION 'Numero reserve non conforme a la nouvelle publication'
      USING ERRCODE='40001';
  END IF;

  -- Vérifier les chemins exacts des médias, sans substitution ni omission.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(c.payload->'elements')
      WITH ORDINALITY AS original(e,ord)
    WHERE original.e->>'kind'='image' AND
     (
      (COALESCE(original.e->>'image','')<>''
       AND original.e->>'image' !~ '^journal-storage://images/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-f0-9]{64}\.(png|jpg|webp|gif)$')
      OR (p_public_payload->'elements'->((original.ord-1)::integer)->>'image')
         IS DISTINCT FROM
         CASE WHEN COALESCE(original.e->>'image','')=''
           THEN original.e->>'image'
           ELSE 'journal-public://images/releases/'||n::text||'/'||
                  pg_catalog.split_part(original.e->>'image','/',5)
         END
     )
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(c.payload->'fonts')
      WITH ORDINALITY AS original(f,ord)
    WHERE
      (COALESCE(original.f->>'data','')<>''
       AND original.f->>'data' !~ '^journal-storage://fonts/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-f0-9]{64}\.(ttf|otf|woff|woff2)$')
      OR (p_public_payload->'fonts'->((original.ord-1)::integer)->>'data')
         IS DISTINCT FROM
         CASE WHEN COALESCE(original.f->>'data','')=''
           THEN original.f->>'data'
           ELSE 'journal-public://fonts/releases/'||n::text||'/'||
                  pg_catalog.split_part(original.f->>'data','/',5)
         END
  ) THEN
    RAISE EXCEPTION 'Correspondance des médias avec la release incorrecte'
      USING ERRCODE='22023';
  END IF;

  -- Compare toute la structure, à l'exception des liens de media.
  src:=c.payload; dst:=p_public_payload;
  src:=jsonb_set(src,'{elements}', (
   SELECT COALESCE(jsonb_agg(CASE WHEN e->>'kind'='image'
     THEN e - 'image' ELSE e END ORDER BY ord), '[]'::jsonb)
   FROM jsonb_array_elements(c.payload->'elements') WITH ORDINALITY AS a(e,ord)
  ));
  dst:=jsonb_set(dst,'{elements}', (
   SELECT COALESCE(jsonb_agg(CASE WHEN e->>'kind'='image'
     THEN e - 'image' ELSE e END ORDER BY ord), '[]'::jsonb)
   FROM jsonb_array_elements(p_public_payload->'elements') WITH ORDINALITY AS a(e,ord)
  ));
  src:=jsonb_set(src,'{fonts}', (
   SELECT COALESCE(jsonb_agg(f-'data' ORDER BY ord),'[]'::jsonb)
   FROM jsonb_array_elements(c.payload->'fonts') WITH ORDINALITY AS a(f,ord)
  ));
  dst:=jsonb_set(dst,'{fonts}', (
   SELECT COALESCE(jsonb_agg(f-'data' ORDER BY ord),'[]'::jsonb)
   FROM jsonb_array_elements(p_public_payload->'fonts') WITH ORDINALITY AS a(f,ord)
  ));
  IF src<>dst THEN RAISE EXCEPTION 'Contenu modifie depuis la preparation' USING ERRCODE='22023'; END IF;

  -- Les references publiees doivent toutes exister dans le bucket public.
  -- Les chemins ne peuvent pas pointer vers le bucket de brouillons.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_public_payload->'elements') a
    WHERE a->>'kind'='image' AND COALESCE(a->>'image','')<>''
      AND (a->>'image' !~ '^journal-public://images/releases/[1-9][0-9]*/[a-f0-9]{64}\.(png|jpg|webp|gif)$'
        OR NOT EXISTS (
         SELECT 1 FROM storage.objects o
         WHERE o.bucket_id='phasmo-journal-public-assets'
           AND o.name=substring(a->>'image' FROM 18)
      ))
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_public_payload->'fonts') f
    WHERE COALESCE(f->>'data','')<>''
      AND (f->>'data' !~ '^journal-public://fonts/releases/[1-9][0-9]*/[a-f0-9]{64}\.(ttf|otf|woff|woff2)$'
        OR NOT EXISTS (
         SELECT 1 FROM storage.objects o
         WHERE o.bucket_id='phasmo-journal-public-assets'
           AND o.name=substring(f->>'data' FROM 18)
      ))
  ) THEN
    RAISE EXCEPTION 'Media officiel manquant ou non autorise' USING ERRCODE='22023';
  END IF;
  -- Confirmation que le candidat correspond toujours au snapshot prive.
  IF NOT EXISTS (
    SELECT 1 FROM public.phasmo_journal_preview_publications p
    WHERE p.stage='preview' AND p.source_revision=c.source_preview_revision
      AND p.release_number=c.source_preview_release AND p.payload=c.payload
  ) THEN
    RAISE EXCEPTION 'Publication privee modifiee depuis la preparation' USING ERRCODE='40001';
  END IF;

  INSERT INTO public.phasmo_journal_production_publications
    (stage,visibility,release_number,source_preview_revision,payload,approved_by,approved_at,published_at)
  VALUES('production','live',n,c.source_preview_revision,p_public_payload,p_actor,now(),now())
  ON CONFLICT(stage) DO UPDATE SET
    visibility='live',release_number=excluded.release_number,
    source_preview_revision=excluded.source_preview_revision,
    payload=excluded.payload,approved_by=excluded.approved_by,
    approved_at=excluded.approved_at,published_at=excluded.published_at;

  INSERT INTO public.phasmo_journal_production_publication_history
    (release_number,source_preview_revision,payload,approved_by,approved_at,published_at,visibility)
  VALUES(n,c.source_preview_revision,p_public_payload,p_actor,now(),now(),'live');
  UPDATE public.phasmo_journal_production_release_controls
  SET reserved_token=NULL,reserved_release=NULL,reserved_actor=NULL,
      reserved_preview_revision=NULL,reserved_preview_release=NULL
  WHERE singleton=true AND reserved_token=p_claim_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation introuvable en finalisation'; END IF;
  RETURN QUERY SELECT n,c.source_preview_revision;
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_commit_official_release(uuid,bigint,bigint,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_commit_official_release(uuid,bigint,bigint,jsonb,uuid) TO service_role;


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
 IF EXISTS(
   SELECT 1 FROM public.phasmo_journal_production_release_controls ctl
   WHERE ctl.singleton AND ctl.reserved_token IS NOT NULL
 ) THEN
   RAISE EXCEPTION 'Autre publication reservee : restauration temporairement bloquee'
     USING ERRCODE='55P03';
 END IF;
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