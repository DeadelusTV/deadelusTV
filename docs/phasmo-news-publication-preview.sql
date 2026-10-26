-- Publication NEWS Phasmophobia, CANAL D'ESSAI UNIQUEMENT.
-- Ne modifier ni les tables du TCG ni les brouillons déjà sauvegardés.
-- Une publication est une copie (snapshot) du brouillon, jamais le brouillon lui-même.
CREATE TABLE public.phasmo_news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL DEFAULT 'preview' CHECK (stage IN ('preview','production')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','unpublished')),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug)<=100),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload)='object' AND
    jsonb_typeof(payload->'title')='string' AND
    length(payload->>'title') BETWEEN 1 AND 160 AND
    jsonb_typeof(payload->'excerpt')='string' AND
    length(payload->>'excerpt')<=350 AND
    octet_length(payload::text) <= 900000
  ),
  published_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stage,slug)
);
CREATE INDEX phasmo_news_articles_recent_idx ON public.phasmo_news_articles(stage,status,published_on DESC);
ALTER TABLE public.phasmo_news_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phasmo_news_articles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.phasmo_news_articles TO anon,authenticated;
GRANT INSERT ON public.phasmo_news_articles TO authenticated;
GRANT UPDATE (payload,status,published_on,updated_at) ON public.phasmo_news_articles TO authenticated;

-- Seuls les articles réellement publiés sont exposés aux visiteurs.
-- L'admin Phasmo peut voir les articles dépubliés pour les corriger.
CREATE POLICY phasmo_news_public_or_authorized_read ON public.phasmo_news_articles
FOR SELECT TO anon,authenticated
USING (
 status='published'
 OR (
   author_id=(SELECT auth.uid())
   AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
              WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
 )
 OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
           WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
);
CREATE POLICY phasmo_news_preview_publish ON public.phasmo_news_articles
FOR INSERT TO authenticated
WITH CHECK (
 stage='preview'
 AND author_id=(SELECT auth.uid())
 AND (
   EXISTS(SELECT 1 FROM public.phasmo_news_editors e
          WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
   OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
             WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
 )
);
CREATE POLICY phasmo_news_preview_edit ON public.phasmo_news_articles
FOR UPDATE TO authenticated
USING (
 stage='preview'
 AND (
   (author_id=(SELECT auth.uid())
    AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
               WHERE e.user_id=(SELECT auth.uid()) AND e.enabled))
   OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
             WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
 )
)
WITH CHECK (
 stage='preview'
 AND (
   (author_id=(SELECT auth.uid())
    AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
               WHERE e.user_id=(SELECT auth.uid()) AND e.enabled))
   OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
             WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
 )
);

-- Images PUBLIQUES uniquement après action « Publier ».
-- Bucket dédié, complètement séparé du bucket privé des brouillons et du TCG.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('phasmo-news-published-images','phasmo-news-published-images',true,2097152,
       ARRAY['image/png','image/jpeg','image/webp']);
CREATE POLICY phasmo_news_preview_public_media_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
 bucket_id='phasmo-news-published-images'
 AND (storage.foldername(name))[1]='preview'
 AND (storage.foldername(name))[2]=(SELECT auth.uid())::text
 AND name ~ '^preview/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
 AND (
   EXISTS(SELECT 1 FROM public.phasmo_news_editors e
          WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
   OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
             WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
 )
);
-- Aucune politique DELETE, UPDATE, publication production ou fonction definer.
