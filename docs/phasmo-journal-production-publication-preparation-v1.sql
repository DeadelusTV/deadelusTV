-- Publication PUBLIQUE du carnet V7 : infrastructure préparée, NON ACTIVE.
-- Aucune copie de brouillon n'est créée par cette migration.
-- Aucun client, même admin Twitch, ne dispose encore des droits de promotion.
-- La publication production nécessitera une action serveur distincte après validation.
BEGIN;

CREATE TABLE public.phasmo_journal_production_publications (
  stage text PRIMARY KEY DEFAULT 'production' CHECK (stage = 'production'),
  visibility text NOT NULL DEFAULT 'disabled'
    CHECK (visibility IN ('disabled','live')),
  release_number bigint NOT NULL CHECK (release_number >= 1),
  source_preview_revision bigint NOT NULL CHECK (source_preview_revision >= 1),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object'
      AND payload @> '{"version":7}'::jsonb
      AND jsonb_typeof(payload->'elements') = 'array'
      AND jsonb_typeof(payload->'records') = 'array'
      AND jsonb_typeof(payload->'folders') = 'array'
      AND jsonb_typeof(payload->'fonts') = 'array'
      AND octet_length(payload::text) <= 8388608),
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT phasmo_prod_live_has_date CHECK
    (visibility <> 'live' OR published_at IS NOT NULL)
);

CREATE TABLE public.phasmo_journal_production_publication_history (
  release_number bigint PRIMARY KEY CHECK(release_number >= 1),
  source_preview_revision bigint NOT NULL,
  payload jsonb NOT NULL,
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  approved_at timestamptz NOT NULL,
  published_at timestamptz,
  visibility text NOT NULL CHECK(visibility IN ('disabled','live'))
);

ALTER TABLE public.phasmo_journal_production_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phasmo_journal_production_publication_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.phasmo_journal_production_publications,
 public.phasmo_journal_production_publication_history
 FROM PUBLIC, anon, authenticated;

-- Lecture anon et connectee : uniquement si la version est explicitement LIVE.
-- La lecture du brouillon, de la preview et de l'historique reste privee.
GRANT SELECT ON public.phasmo_journal_production_publications
  TO anon, authenticated;
GRANT SELECT ON public.phasmo_journal_production_publication_history
  TO authenticated;

CREATE POLICY phasmo_journal_production_live_read
 ON public.phasmo_journal_production_publications FOR SELECT TO anon, authenticated
 USING (stage='production' AND visibility='live');

CREATE POLICY phasmo_journal_production_history_admin_read
 ON public.phasmo_journal_production_publication_history FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.phasmo_journal_admins a
   WHERE a.user_id=(SELECT auth.uid()) AND a.enabled));

-- Bucket vide, reserve aux medias effectivement approuves pour une publication.
-- PUBLIC signifie que TOUT objet envoye dans ce bucket est publiquement accessible.
-- Aucun droit client INSERT, UPDATE ou DELETE n'est cree par cette migration.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES (
 'phasmo-journal-public-assets','phasmo-journal-public-assets',true,
 6000000,
 ARRAY['image/png','image/jpeg','image/webp','image/gif',
       'font/ttf','font/otf','font/woff','font/woff2']::text[]
);
COMMIT;
