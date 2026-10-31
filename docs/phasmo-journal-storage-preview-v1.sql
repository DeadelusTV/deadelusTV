-- Carnet Phasmo V7 : Storage privé des images et polices partagées.
-- Limité au pilote preview. Aucune lecture publique ni publication production.
-- Les chemins sont immuables : <type>/<auteur-uuid>/<sha256>.<extension>.
-- Pas de droits UPDATE/DELETE aux clients : une publication historique ne
-- doit jamais changer de contenu à la suite d'une modification de fichier.
BEGIN;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
 'phasmo-journal-draft-assets',
 'phasmo-journal-draft-assets',
 false,
 6000000,
 ARRAY[
  'image/png','image/jpeg','image/webp','image/gif',
  'font/ttf','font/otf','font/woff','font/woff2'
 ]::text[]
);

CREATE POLICY phasmo_journal_storage_preview_read
 ON storage.objects
 FOR SELECT TO authenticated
 USING (
  bucket_id='phasmo-journal-draft-assets'
  AND (
   EXISTS(SELECT 1 FROM public.phasmo_journal_admins a
     WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
   OR EXISTS(SELECT 1 FROM public.phasmo_journal_editors e
     WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
  )
 );

CREATE POLICY phasmo_journal_storage_preview_upload
 ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK (
  bucket_id='phasmo-journal-draft-assets'
  AND name ~ '^(images|fonts)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-f0-9]{64}\.(webp|png|jpg|gif|ttf|otf|woff|woff2)$'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND (
   EXISTS(SELECT 1 FROM public.phasmo_journal_admins a
     WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
   OR EXISTS(SELECT 1 FROM public.phasmo_journal_editors e
     WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
  )
 );

COMMIT;
