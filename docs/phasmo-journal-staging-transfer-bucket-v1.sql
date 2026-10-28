-- Bucket exclusivement privé pour recette du transfert des médias du carnet.
-- Le vrai bucket public n'est pas impliqué. Aucun droit client Storage.
BEGIN;
INSERT INTO storage.buckets
 (id,name,public,file_size_limit,allowed_mime_types)
VALUES(
 'phasmo-journal-release-test-private',
 'phasmo-journal-release-test-private',
 false,6000000,
 ARRAY['image/png','image/jpeg','image/webp','image/gif',
 'font/ttf','font/otf','font/woff','font/woff2']::text[]
)
ON CONFLICT (id) DO NOTHING;
-- Ne pas créer de policy: seul service_role peut opérer sur ce bucket.
-- Ce test n'ajoute jamais de droits au rôle anon ou authenticated.
COMMIT;