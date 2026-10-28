-- Phasmo V7 / Edge Function de preparation officielle.
-- Acces serveur uniquement. Ne rien ouvrir a anon ou authenticated.
-- Les migrations de journal precedent ont retire tous les GRANT de PUBLIC
-- sans les redonner a service_role, qui ne peut donc pas lire les tables.
BEGIN;
GRANT SELECT ON TABLE
 public.phasmo_journal_admins,
 public.phasmo_journal_preview_publications,
 public.phasmo_journal_production_release_controls,
 public.phasmo_journal_production_candidates,
 public.phasmo_journal_production_publications,
 public.phasmo_journal_production_publication_history
 TO service_role;

-- Le candidat est un brouillon de VALIDATION prive ; aucun visitor ne l'ecrit.
-- L'Edge Function utilise upsert(stage='production'), qui requiert
-- SELECT + INSERT + UPDATE.
GRANT INSERT,UPDATE ON TABLE
 public.phasmo_journal_production_candidates
 TO service_role;
COMMIT;
