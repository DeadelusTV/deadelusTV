-- Lecture publique limitée au statut publié.
-- Les visiteurs anonymes n'ont aucun accès à la table des rôles privés.
-- Les comptes connectés conservent une politique séparée pour voir leurs
-- publications dépubliées (rédacteur auteur, admin News).
ALTER POLICY phasmo_news_public_or_authorized_read ON public.phasmo_news_articles
  TO authenticated;
CREATE POLICY phasmo_news_anonymous_published_only
  ON public.phasmo_news_articles
  FOR SELECT TO anon
  USING (status='published');