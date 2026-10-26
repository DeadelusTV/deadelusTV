-- Supabase Storage privé pour images de brouillons Phasmophobia.
-- Migration additive : aucun changement aux buckets ni tables du TCG.
-- Ces images NE SONT PAS des fichiers publics et ne servent pas encore à la publication.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('phasmo-news-draft-images','phasmo-news-draft-images',false,2097152,
        ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Le rédacteur lit seulement ses fichiers. L'administratrice News peut
-- lire toutes les images des brouillons Phasmo pour assurer les corrections.
CREATE POLICY phasmo_draft_images_read ON storage.objects
 FOR SELECT TO authenticated
 USING (
   bucket_id='phasmo-news-draft-images'
   AND (
     EXISTS(SELECT 1 FROM public.phasmo_news_admins a
            WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
     OR (
       (storage.foldername(name))[1] = (SELECT auth.uid())::text
       AND EXISTS(SELECT 1 FROM public.phasmo_news_editors e
                  WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
     )
   )
 );

-- Chaque fichier appartient au dossier de l'utilisateur connecté.
-- Un admin peut consulter les fichiers du rédacteur, mais n'usurpe jamais
-- son dossier lors d'un nouvel envoi.
CREATE POLICY phasmo_draft_images_upload ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK (
   bucket_id='phasmo-news-draft-images'
   AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
   AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
   AND (
     EXISTS(SELECT 1 FROM public.phasmo_news_admins a
            WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
     OR EXISTS(SELECT 1 FROM public.phasmo_news_editors e
               WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
   )
 );

-- Aucune politique UPDATE/DELETE. Chemins uniques, aucun upsert.
-- Nettoyage des fichiers orphelins à planifier séparément, avec audit.
