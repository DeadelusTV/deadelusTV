-- Autorisation explicite (28/10/2026) :
-- donner au compte Twitch DeadelusTV les mêmes droits News que
-- l'administrateur existant, sans retirer l'accès de ce dernier.
-- Réversible en désactivant le rôle Deadelus puis en recréant l'index unique
-- si un retour à un seul administrateur est requis.
-- AUCUN changement de contenu News ou des rôles rédacteurs.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id='9dcfcc22-b4f4-4233-9164-3e686d9aa84a'
      AND provider='twitch' AND provider_id='228720578'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.phasmo_news_admins
    WHERE user_id='9dcfcc22-b4f4-4233-9164-3e686d9aa84a' AND enabled
  ) THEN
    RAISE EXCEPTION 'Administrateur News existant non confirmé';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id='e3cf9181-c56a-4506-884f-579ba2d1ca8e'
      AND provider='twitch' AND provider_id='99977368'
  ) THEN
    RAISE EXCEPTION 'Identité Twitch DeadelusTV non confirmée';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='phasmo_news_admins'
      AND indexname='phasmo_one_active_news_admin'
  ) THEN
    RAISE EXCEPTION 'Contrainte News attendue absente, revue requise';
  END IF;
END $$;

-- L'ancien index empêchait intentionnellement d'avoir plus d'un
-- administrateur actif. Les politiques RLS vérifient déjà auth.uid()
-- pour chaque compte et la table n'autorise aucune attribution en client.
DROP INDEX public.phasmo_one_active_news_admin;

INSERT INTO public.phasmo_news_admins(user_id,enabled)
VALUES ('e3cf9181-c56a-4506-884f-579ba2d1ca8e',true)
ON CONFLICT(user_id) DO UPDATE SET enabled=EXCLUDED.enabled;
COMMIT;
