# Carnet Phasmo V7 — Publication officielle : préparation technique

**28 octobre 2026 · Branche : `developpement/phasmo-v2` · État : infrastructure installée, diffusion publique NON ACTIVÉE**

## 1. Séparation obligatoire des contenus

- `phasmo_journal_preview_drafts` : travail partagé privé des éditeurs/administrateurs du carnet.
- `phasmo_journal_preview_publications` : dernière version de **test privé** ; consultation administrateur Twitch uniquement.
- `phasmo_journal_production_publications` : version officielle destinée aux visiteurs, séparée du brouillon et de la publication test. Lecture anonyme autorisée **uniquement** lorsque `stage='production' AND visibility='live'`.
- `phasmo_journal_production_publication_history` : structure d'historique des publications officielles futures, lecture admin, pas d'accès aux visiteurs.
- Le circuit de promotion **est implémenté côté serveur, mais demeure volontairement verrouillé** par `phasmo_journal_production_release_controls.activation_enabled=false`. Ni `anon`, ni `authenticated` ne disposent de `INSERT`/`UPDATE` sur la publication officielle, ni du droit `EXECUTE` sur les fonctions SQL de validation. Une fonction Edge authentifiée permet seulement de préparer une version privée en attendant la validation de mise en ligne.

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


## 6. Implémentation du contrôle de sortie officielle (28 octobre 2026)

- `phasmo_journal_production_candidates` conserve la version **publiée pour test**, figée et vérifiée (pas le brouillon live), avec l'empreinte de chaque média privé. Le candidat peut être préparé depuis le bouton « Préparer une version officielle (privée) » dans l'atelier.
- Edge Function `phasmo-journal-release` (`supabase/functions/phasmo-journal-release/index.ts`), `verify_jwt=true`, origine DEV, validation du JWT Twitch et du rôle admin côté base. Elle expose `status`, `prepare`, `activate`, `offline`, `restore`.
- `prepare` valide chaque image et police depuis Storage privé sans envoyer de fichier dans le bucket public. `activate` est programmé pour copier les seuls médias du candidat validé et créer un nouveau snapshot officiel ainsi que sa ligne d'historique via une RPC SQL atomique réservée au service role. Une confirmation de droits des médias et une confirmation textuelle sont exigées **après déverrouillage explicite du serveur**.
- `offline` permet une mise hors ligne urgente par un admin, même verrou d'activation fermé ; `restore` créerait une nouvelle release qui reproduit un ancien snapshot, sans réécrire l'historique, avec vérification des médias encore disponibles.
- `activation_enabled=false` est en place et vérifié. **Aucun bouton d'activation n'est exposé à ce stade.** Tant que la validation de la publication publique n'a pas été donnée, il est interdit de modifier ce verrou.
- Références : `docs/phasmo-journal-release-management-v1.sql`, `docs/phasmo-journal-release-restore-v1.sql`, `public/modules/phasmophobia/journal-official-prepare.js`.
- Tests réalisés : déploiement de la fonction Edge et des migrations, contrôle SQL de l'absence de droit client, erreurs de verrou attendues et simulations front-end des boutons. **La recette navigateur de `prepare` reste ouverte ; les scénarios effectifs d'activation et rollback restent volontairement non exécutés en production partagée.**

Cette mise à jour remplace le statut « promotion non implémentée » du plan initial, sans changer l'absence de feu vert pour la publication publique.


## 7. Simulations SQL isolées de la sortie officielle (28 octobre 2026)

Les fonctions SQL réelles de `commit`, `offline` et `restore` ont été clonées uniquement pour les essais sur des tables temporaires. Chaque série a été annulée par `ROLLBACK`, sans créer de publication et sans copier d'image ni de police vers le bucket public. **18 contrôles passés**, dont deux cycles de publication, retour arrière historisé et protection des médias (référence supprimée, mauvaise version, mauvais SHA, fichiers absents).

Deux corrections produites par ces tests ont été appliquées sur les fonctions officielles **sans activer la diffusion** :
- `docs/phasmo-journal-release-restore-fix-ambiguity-v2.sql` : correction de la colonne ambiguë `release_number` dans la restauration.
- `docs/phasmo-journal-release-media-integrity-v2.sql` : obligation pour chaque image/police de garder le même SHA et d'être dans le dossier du **bon numéro de release**.

État de fin de recette : candidat n°8 / révision 12 / 2 médias, `activation_enabled=false`, 0 publication live, 0 historique live, 0 média public. **À faire avant publication réelle** : essais du transfert physique de Storage dans un environnement distinct, sécurisation de la réservation de numéro en cas d'activations simultanées, et commandes administrateur finales.


## 8. Tests de transfert privé et réservation exclusive (28 octobre 2026)

**Suite du chantier technique, sans mise en ligne :**

- `docs/phasmo-journal-staging-transfer-bucket-v1.sql` : bucket `phasmo-journal-release-test-private`, privé et sans policy client, destiné à recevoir temporairement la copie *réelle* des médias du candidat prêt.
- `supabase/functions/phasmo-journal-storage-test/index.ts` : Edge Function admin de recette physique à deux modes (`normal`, `fault`). Contrôle du manifeste préparé, du JWT, des droits, du verrou public, des empreintes source/copie, puis nettoyage en fin de test. Boutons de recette ajoutés dans `journal-editor.html` via `journal-storage-dryrun-ui.js`. **Recette du transfert réel en attente du clic utilisateur**.
- `docs/phasmo-journal-exclusive-release-reservation-v1.sql` : réservation atomique de numéro avant copie des médias publics, refus d'une seconde activation, signature de commit liée au token de réservation, annulation uniquement après nettoyage et restauration bloquée pendant une réservation active. Déployée sur les RPC serveur et la fonction Edge officielle v3, sans déverrouiller l'activation.
- Tests SQL isolés : **10 scénarios de réservation et de concurrence réussis**, transactions annulées ; tests UI automatisés en simulation : **13 vérifications réussies**.
- Les scénarios de transfert public réel, restauration live, récupération après panne complète de process et double activation réseau effective **ne sont pas encore validés**. Le bucket `phasmo-journal-public-assets` est toujours vide et la publication publique reste désactivée.

**État vérifié** : candidat n°8, révision 12, 2 médias ; 0 publication officielle, 0 fichier public, 0 copie staging, aucune réservation active. Aucun changement sur `main`.
