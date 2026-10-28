# Carnet Phasmo V7 — Publication officielle : préparation technique

**28 octobre 2026 · Branche : `developpement/phasmo-v2` · État : infrastructure installée, diffusion publique NON ACTIVÉE**

## 1. Séparation obligatoire des contenus

- `phasmo_journal_preview_drafts` : travail partagé privé des éditeurs/administrateurs du carnet.
- `phasmo_journal_preview_publications` : dernière version de **test privé** ; consultation administrateur Twitch uniquement.
- `phasmo_journal_production_publications` : version officielle destinée aux visiteurs, séparée du brouillon et de la publication test. Lecture anonyme autorisée **uniquement** lorsque `stage='production' AND visibility='live'`.
- `phasmo_journal_production_publication_history` : structure d'historique des publications officielles futures, lecture admin, pas d'accès aux visiteurs.
- La promotion de contenu **n'est pas encore implémentée ou autorisée**. Ni `anon`, ni `authenticated` ne disposent de `INSERT`/`UPDATE` sur la publication officielle.

## 2. Médias : deux buckets strictement séparés

- `phasmo-journal-draft-assets` : privé, utilisé pour les images et les polices des brouillons et publications de test.
- `phasmo-journal-public-assets` : créé **vide**, public par nature, pour les seuls fichiers validés lors d'une future publication officielle. **Tout fichier placé ici devient public immédiatement.** Aucune politique `INSERT` client prévue à ce stade.
- Les références futures seront de la forme `journal-public://images/releases/<numero>/<sha256>.webp` et `journal-public://fonts/releases/<numero>/<sha256>.woff2` (extensions autorisées conformes au bucket). Elles seront restaurées en mémoire dans le moteur du carnet par `journal-public-media.js`.
- Les références `journal-storage://` du bucket privé sont **rejetées** par le lecteur public. Le lecteur public ne doit pas demander aux visiteurs de se connecter à Twitch pour récupérer des médias.
- Avant tout transfert public : vérifier les formats et limites, la propriété ou la licence de diffusion des images **et des polices**, la déduplication des médias et les références réelles de la version figée.
- Utiliser des chemins immuables et conserver les médias requis par les anciennes versions jusqu'à la politique de rétention approuvée. Ne pas nettoyer les orphelins en SQL dans `storage.objects`.

## 3. Lecture sur le site DEV

- `public/index.html` : fenêtre principale du livre intégrée via `journal-editor.html?viewer=1&publication=public`.
- `journal-publication-viewer.js` : client Supabase sans session persistante ; lit **uniquement** `phasmo_journal_production_publications` active, sans accès au brouillon ni à la preview.
- `journal-public-media.js` : téléchargement des médias du **bucket public uniquement** via des références typées et vérifiées.
- `journal-editor.html` : empêche la restauration et l'écriture `localStorage` en lecture distante. Cache le livre tant que sa version officielle n'est pas chargée ; n'avertit l'iframe parent qu'après import complet.
- En l'absence de publication, afficher « Le carnet des enquêteurs est en préparation ». **C'est l'état attendu actuellement**, et non un bug de disparition. Pour consulter le livre de test, conserver le lien privé dans l'atelier V7.

## 4. État réellement vérifié

- Migration `phasmo_journal_production_publication_inactive_v1` appliquée ; script `docs/phasmo-journal-production-publication-preparation-v1.sql`.
- RLS activées sur les deux tables ; `anon` peut lire une version officielle `live` mais ne voit **pas** une version `disabled`. Test SQL transactionnel du scénario `disabled` : 0 résultat pour `anon`; simulation de passage `live` : résultat visible. Transactions **ROLLBACK**, aucune donnée réelle publiée.
- Aucune ligne de publication production, aucun historique production, aucun média public. Aucun privilège de publication client.
- Mocks JS de la visionneuse : état vide, chargement officiel actif, déclenchement différé de l'événement `journal-ready`, absence de session Twitch. Le lecteur refuse les références privées.
- À vérifier sur le site DEV en navigateur : ouverture du carnet via la page Phasmo, affichage du message d'attente, absence de fiche de test. L'atelier et « Voir le livre publié en test » doivent toujours fonctionner comme avant.

## 5. Travaux nécessaires avant mise en ligne réelle

1. Construire une opération serveur **explicite**, protégée par la liste `phasmo_journal_admins`, pour préparer une publication officielle depuis une révision privée **figée et vérifiée**, avec journal d'audit. Le rôle administrateur est contrôlé par la base, jamais par les métadonnées Twitch.
2. Vérifier la complétude de tous les fichiers et polices, les licences de diffusion publique ; transférer les médias approuvés vers les chemins immuables du bucket public. Ne jamais copier les médias d'un brouillon non validé.
3. Finaliser l'écriture transactionnelle du snapshot officiel et son entrée d'historique ; assurer la possibilité de restaurer une ancienne version comme **nouvelle** publication traçable. Prévoir l'arrêt immédiat d'une version en cas de problème.
4. Tester la lecture anonyme, la connexion Twitch sans rôle, le compte News-only, l'éditeur Phasmo, les deux admins, l'utilisateur dont le rôle est révoqué, les révisions concurrentes et les médias manquants.
5. Recette navigateur PC/mobile et conservation des fiches, catégories, sous-catégories, liens, calques, positions, images et polices.
6. Autorisation explicite de rendre le contenu public et **autorisation distincte** pour toute fusion `main`.

**Ne pas considérer les nouvelles tables ou le bucket public comme une autorisation de publier. Aucune action en production n'est déclenchée automatiquement par les sauvegardes ou la publication de test.**
