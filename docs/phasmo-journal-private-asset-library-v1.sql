-- Bibliothèque privée de médias du carnet V7.
-- Toute la liste passe par les RLS EXISTANTES de storage.objects et le rôle
-- admin/éditeur Phasmo. Ni les visiteurs ni les comptes Twitch ordinaires
-- ne peuvent lire ce catalogue. Aucun upload / UPDATE / DELETE n'est ajouté.
BEGIN;

CREATE FUNCTION public.phasmo_journal_list_private_assets(
  p_kind text,
  p_page integer DEFAULT 0
)
RETURNS TABLE(path text, kind text, size_bytes bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT o.name, pg_catalog.split_part(o.name,'/',1),
   CASE WHEN o.metadata->>'size' ~ '^[0-9]{1,15}$'
     THEN (o.metadata->>'size')::bigint ELSE 0 END,
   o.created_at
 FROM storage.objects AS o
 WHERE o.bucket_id='phasmo-journal-draft-assets'
  AND p_kind IN ('images','fonts')
  AND pg_catalog.split_part(o.name,'/',1)=p_kind
  AND o.name ~ '^(images|fonts)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-f0-9]{64}\.(webp|png|jpg|gif|ttf|otf|woff|woff2)$'
  AND (
    EXISTS(SELECT 1 FROM public.phasmo_journal_admins a
      WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
    OR EXISTS(SELECT 1 FROM public.phasmo_journal_editors e
      WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
  )
 ORDER BY o.created_at DESC, o.name ASC
 LIMIT 24 OFFSET (LEAST(GREATEST(COALESCE(p_page,0),0),1000)*24);
$$;
REVOKE ALL ON FUNCTION public.phasmo_journal_list_private_assets(text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_list_private_assets(text,integer)
 TO authenticated;

CREATE FUNCTION public.phasmo_journal_find_private_asset(
 p_kind text, p_sha256 text, p_extension text
)
RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT o.name
 FROM storage.objects AS o
 WHERE o.bucket_id='phasmo-journal-draft-assets'
  AND p_kind IN ('images','fonts')
  AND p_sha256 ~ '^[a-f0-9]{64}$'
  AND p_extension IN ('webp','png','jpg','gif','ttf','otf','woff','woff2')
  AND pg_catalog.split_part(o.name,'/',1)=p_kind
  AND o.name ~ ('^'||p_kind||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'||p_sha256||'\.'||p_extension||'$')
  AND (
    EXISTS(SELECT 1 FROM public.phasmo_journal_admins a
      WHERE a.user_id=(SELECT auth.uid()) AND a.enabled)
    OR EXISTS(SELECT 1 FROM public.phasmo_journal_editors e
      WHERE e.user_id=(SELECT auth.uid()) AND e.enabled)
  )
 ORDER BY o.created_at ASC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.phasmo_journal_find_private_asset(text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.phasmo_journal_find_private_asset(text,text,text)
 TO authenticated;

COMMIT;
