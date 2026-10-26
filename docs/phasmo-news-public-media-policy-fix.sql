-- Correction du motif de chemin pour l'upload des images de publication Phasmo.
-- Le motif initial échappait deux fois le point de l'extension, donc bloquait
-- les images PNG/JPEG/WebP. Aucun effet sur les buckets ou tables TCG.
ALTER POLICY phasmo_news_preview_public_media_upload ON storage.objects
WITH CHECK (
 bucket_id='phasmo-news-published-images'
 AND (storage.foldername(name))[1]='preview'
 AND (storage.foldername(name))[2]=(SELECT auth.uid())::text
 AND name ~ '^preview/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|webp)$'
 AND (
   EXISTS(SELECT 1 FROM public.phasmo_news_editors e
          WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
   OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
             WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
 )
);