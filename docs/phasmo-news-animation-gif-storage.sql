-- Ajouter GIF + WebP animés au stockage des images Phasmo.
-- Aucun traitement des octets : le navigateur rend l'animation originale.
-- Ne modifier aucun bucket ni politique du TCG.
UPDATE storage.buckets
SET file_size_limit=10485760,
    allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[]
WHERE id IN ('phasmo-news-draft-images','phasmo-news-published-images');

-- Chaque compte News reste limité à son dossier privé.
ALTER POLICY phasmo_draft_images_upload ON storage.objects
WITH CHECK (
  bucket_id='phasmo-news-draft-images'
  AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|webp|gif)$'
  AND (
    EXISTS(SELECT 1 FROM public.phasmo_news_admins a
           WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
    OR EXISTS(SELECT 1 FROM public.phasmo_news_editors e
              WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
  )
);

-- Les médias publiés restent isolés sur le canal PREVIEW.
ALTER POLICY phasmo_news_preview_public_media_upload ON storage.objects
WITH CHECK (
  bucket_id='phasmo-news-published-images'
  AND (storage.foldername(name))[1]='preview'
  AND (storage.foldername(name))[2]=(SELECT auth.uid())::text
  AND name ~ '^preview/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|webp|gif)$'
  AND (
    EXISTS(SELECT 1 FROM public.phasmo_news_admins a
           WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
    OR EXISTS(SELECT 1 FROM public.phasmo_news_editors e
              WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
  )
);
