-- Phasmo V7 : gestion des candidats officiels, bloquée hors ligne.
-- La preparation copie UNIQUEMENT une publication preview déjà figée.
-- Aucun fichier n'est copié au bucket public à cette étape.
BEGIN;
CREATE TABLE public.phasmo_journal_production_candidates (
  stage text PRIMARY KEY DEFAULT 'production' CHECK(stage='production'),
  source_preview_revision bigint NOT NULL CHECK(source_preview_revision>0),
  source_preview_release bigint NOT NULL CHECK(source_preview_release>0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object' AND payload @> '{"version":7}'::jsonb
    AND jsonb_typeof(payload->'elements')='array' AND jsonb_typeof(payload->'fonts')='array'),
  asset_manifest jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(asset_manifest)='array'),
  prepared_by uuid NOT NULL REFERENCES auth.users(id),
  prepared_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phasmo_journal_production_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phasmo_journal_production_candidates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.phasmo_journal_production_candidates TO authenticated;
CREATE POLICY phasmo_journal_production_candidates_admin_read
 ON public.phasmo_journal_production_candidates FOR SELECT TO authenticated
 USING (EXISTS (
   SELECT 1 FROM public.phasmo_journal_admins a
   WHERE a.user_id=(SELECT auth.uid()) AND a.enabled
 ));

CREATE TABLE public.phasmo_journal_production_release_controls (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  activation_enabled boolean NOT NULL DEFAULT false,
  last_authorized_at timestamptz
);
ALTER TABLE public.phasmo_journal_production_release_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phasmo_journal_production_release_controls FROM PUBLIC, anon, authenticated;
INSERT INTO public.phasmo_journal_production_release_controls(singleton,activation_enabled)
 VALUES(true,false);

-- Les fonctions de publication officielle sont reservees a service_role.
-- Elles ne sont PAS appellees depuis le navigateur.
CREATE FUNCTION public.phasmo_journal_commit_official_release(
 p_actor uuid, p_source_revision bigint, p_source_release bigint,
 p_public_payload jsonb
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
  RETURN QUERY SELECT n,c.source_preview_revision;
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_commit_official_release(uuid,bigint,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_commit_official_release(uuid,bigint,bigint,jsonb) TO service_role;

CREATE FUNCTION public.phasmo_journal_disable_official_release(p_actor uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.phasmo_journal_admins a
   WHERE a.user_id=p_actor AND a.enabled)
 THEN RAISE EXCEPTION 'Administrateur du carnet non autorise' USING ERRCODE='42501'; END IF;
 -- Mise hors ligne d'urgence autorisee meme si l'activation est verrouillee.
 UPDATE public.phasmo_journal_production_publications
 SET visibility='disabled' WHERE stage='production' AND visibility='live';
 RETURN FOUND;
END;
$body$;
REVOKE ALL ON FUNCTION public.phasmo_journal_disable_official_release(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_disable_official_release(uuid) TO service_role;
COMMIT;