-- Publication officielle Phasmophobia (additive, sans modification du TCG).
-- Les politiques PREVIEW restent strictement séparées et inchangées.
CREATE POLICY phasmo_news_production_publish ON public.phasmo_news_articles
FOR INSERT TO authenticated
WITH CHECK (
  stage='production'
  AND author_id=(SELECT auth.uid())
  AND (
    EXISTS(SELECT 1 FROM public.phasmo_news_editors e
           WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
    OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
  )
);
CREATE POLICY phasmo_news_production_edit ON public.phasmo_news_articles
FOR UPDATE TO authenticated
USING (
  stage='production'
  AND (
    (author_id=(SELECT auth.uid()) AND EXISTS(
      SELECT 1 FROM public.phasmo_news_editors e
      WHERE e.user_id=(SELECT auth.uid()) AND e.enabled
    ))
    OR EXISTS(
      SELECT 1 FROM public.phasmo_news_admins a
      WHERE a.user_id=(SELECT auth.uid()) AND a.enabled
    )
  )
)
WITH CHECK (
  stage='production'
  AND (
    (author_id=(SELECT auth.uid()) AND EXISTS(
      SELECT 1 FROM public.phasmo_news_editors e
      WHERE e.user_id=(SELECT auth.uid()) AND e.enabled
    ))
    OR EXISTS(
      SELECT 1 FROM public.phasmo_news_admins a
      WHERE a.user_id=(SELECT auth.uid()) AND a.enabled
    )
  )
);
CREATE POLICY phasmo_news_production_media_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='phasmo-news-published-images'
  AND (storage.foldername(name))[1]='production'
  AND (storage.foldername(name))[2]=(SELECT auth.uid())::text
  AND name ~ '^production/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|webp|gif)$'
  AND (
    EXISTS(SELECT 1 FROM public.phasmo_news_editors e
           WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
    OR EXISTS(SELECT 1 FROM public.phasmo_news_admins a
              WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
  )
);
