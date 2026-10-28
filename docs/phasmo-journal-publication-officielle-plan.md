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


## 9. Recette confirmée des transferts privés et du nettoyage

Le 28 octobre 2026, les deux essais de la fonction `phasmo-journal-storage-test` ont été validés depuis l'éditeur DEV avec un compte administrateur Twitch.

- **Transfert normal** : publication de test n°8, révision 12 ; 1 image WebP et 1 police TTF, soit **38 516 octets** vérifiés par SHA-256 ; copies temporaires supprimées.
- **Échec simulé** : interruption volontaire immédiatement après la première copie ; réponse du serveur « Test d’échec réussi : interruption volontaire après le premier transfert. Copie privée supprimée et aucun média rendu public. »
- **Contrôle SQL indépendant après le second essai** : 0 objet dans `phasmo-journal-release-test-private` (bucket toujours privé), 0 objet dans `phasmo-journal-public-assets`, 0 version de production, 0 historique, verrou `activation_enabled=false`, aucune réservation active et candidat n°8 / révision 12 / 2 médias intact.

**Conclusion :** le transfert réel en bucket privé et le nettoyage après échec contrôlé sont validés. Ce n'est **pas** une validation de publication effective, du transfert dans le bucket public ou de la récupération après crash brutal du processus. Les commandes de publication restent à finaliser et à auditer avant ouverture explicite du verrou.


## 10. Commandes administrateur prêtes, verrouillées (28 octobre 2026)

- `public/modules/phasmophobia/journal-editor.html` affiche dans **7 · Sauvegardes**, sous la préparation officielle, un panneau « Commandes administrateur » : attestation de droits textes/images/polices, confirmation textuelle de publication, bouton publication, historique des 30 dernières versions et confirmation textuelle de restauration, bouton de mise hors ligne d'urgence, actualisation.
- `journal-official-commands.js` récupère le statut **depuis le serveur** après authentification Twitch, garde `Publier officiellement` et `Restaurer` **désactivés** tant que `activation_enabled=false`, tant qu'une réservation est en cours ou en absence de confirmation. `Mettre hors ligne` n'est disponible que si une version live existe. La restauration ne peut sélectionner qu'un numéro réellement retourné par l'historique privé admin.
- La fonction Supabase Edge `phasmo-journal-release` **v4** renvoie au seul administrateur les métadonnées de l'historique et l'état de réservation (aucun payload média ni token), exige `METTRE-HORS-LIGNE` et un numéro de release attendu pour l'action d'urgence, vérifie le numéro de candidat préparé avant publication, et conserve les contrôles serveur d'identité, de verrouillage, de droits des médias, de réservation et d'intégrité.
- Migration `docs/phasmo-journal-emergency-offline-race-guard-v1.sql` appliquée : en urgence, la RPC `phasmo_journal_disable_official_release` prend le verrou transactionnel, désactive l'autorisation de nouvelles publications et masque la version live ; `commit` et `restore` revérifient le verrou sous ce même verrou transactionnel afin de ne pas réafficher le carnet après une mise hors ligne.
- **Tests** : 14 simulations UI (verrou, droits, phrases de confirmation, historique, clics fictifs, JWT et états dynamiques) et 4 simulations SQL réelles sur tables temporaires puis `ROLLBACK` (urgence fermant le verrou, refus de finalisation, refus de restauration, conservation historique) : toutes réussies.
- Vérification réelle Supabase après modification : candidat **publication de test n°8/révision 12**, 2 médias, verrou `false`, aucune réservation, 0 publication, 0 entrée d'historique, 0 média dans les buckets public et staging. Les appels SQL sont inaccessibles à `anon` et `authenticated`, accessibles uniquement au serveur. Le message informatif de sécurité RLS sans policy sur la table de verrou est intentionnel.

**Recette navigateur à confirmer** : après Ctrl+F5 sur l'atelier DEV avec compte administrateur, voir le nouveau panneau ; cliquer « Actualiser les commandes et l'historique ». Le statut doit dire verrou fermé, candidat test n°8/rév.12, aucune version officielle, historique vide. Même en cochant les droits et en saisissant `PUBLIER-OFFICIELLEMENT`, le bouton de publication doit **rester désactivé** ; restauration et mise hors ligne également. Ne pas ouvrir le verrou pour cet essai. La publication, la restauration ou le retrait d'une véritable version en ligne ne sont **pas encore testés en conditions réelles**, et restent soumis à validation explicite avant toute activation publique.


## 11. Interface finale épurée après validation des tests

**Décision fonctionnelle (28 octobre 2026) :** conserver provisoirement le panneau technique complet et ses boutons de recette pendant les derniers tests. **Une fois les tests validés**, le masquer ou le retirer de l'interface courante et adopter une gestion simple, sur le modèle de l'éditeur de News :

- **Enregistrer** le brouillon partagé.
- **Charger** une version enregistrée, ou, de préférence à examiner, remplacer « Charger » par un **menu déroulant Historique des modifications** donnant accès aux versions antérieures et à leur chargement.
- **Aperçu** pour visualiser le carnet sans publier.
- **Publier** pour valider la mise en ligne du carnet, tout en conservant les contrôles serveur existants en arrière-plan.
- **Dépublier** pour masquer le carnet public.
- **Supprimer**, en précisant lors de la conception finale *ce qui est supprimé* (par exemple un brouillon, et non l'historique ou les médias d'anciennes versions) et avec confirmation.

**Principe validé :** l'utilisateur ne doit pas gérer à la main les états intermédiaires « publication de test / candidat privé / vérification Storage / réservation / confirmation technique » dans le panneau final. Ces contrôles restent automatiques côté serveur ; les outils de diagnostic peuvent rester accessibles séparément aux administrateurs si nécessaire. **Ne pas simplifier avant la fin de la recette complète.** Aucun travail sur `main` pour cette décision.


## 12. Contrôles supplémentaires du panneau administrateur

Contrôles supplémentaires réalisés le 28 octobre 2026, sur `developpement/phasmo-v2`, en conservant la future simplification de l'interface comme décision validée.

- **13 simulations du nouveau panneau** : absence de publication et d'historique, verrou fermé, confirmation insuffisante, réservation en cours, mise hors ligne d'urgence disponible seulement avec publication live, révocation du verrou après chargement, retour HTTP 423, refus sans session Twitch et absence totale d'appel de mutation lorsqu'on vérifie uniquement le statut. Les actions de publication/restauration ne sont simulées qu'avec un statut fictif ouvert ; le verrou réel n'a pas changé.
- **3 tests sur les RPC réellement déployées** `phasmo_journal_reserve_official_release`, `phasmo_journal_commit_official_release` et `phasmo_journal_restore_official_release` : avec le verrou fermé, toutes refusent bien l'opération (code SQL `42501`). Tests exécutés dans une transaction terminée par `ROLLBACK`.
- Contrôle de l'état réel au début des essais : **0 publication officielle, 0 historique officiel, 0 fichier public, verrou fermé, aucune réservation**, candidat privé test n°8 / révision 12 inchangé.

**Étape restante à valider dans le navigateur admin :** depuis l'éditeur DEV (onglet 7), cliquer « Actualiser les commandes et l'historique » ; attendre « Verrou public fermé », candidat test n°8/révision 12, aucune version officielle et historique vide. Vérifier que `Publier officiellement`, `Restaurer cette version` et `Mettre le carnet hors ligne` restent grisés, y compris après saisie de la confirmation de publication. Ne pas ouvrir le verrou pour cette recette.


## 13. Correction du contrôle administrateur : variable token

Après ouverture de la section « Commandes administrateur » et clic sur « Actualiser les commandes et l'historique », la recette navigateur a révélé l'erreur `HTTP 422 : Cannot access 'token' before initialization`. La cause était un masquage de variable JavaScript dans l'Edge Function `phasmo-journal-release` : `const token=authorization.slice(7)` (JWT Twitch) et, dans le même bloc logique, `const token=crypto.randomUUID()` (réservation d'une publication). La déclaration tardive rendait le JWT inaccessible lors du `auth.getUser(token)`, y compris pour l'action `status`.

**Correctif** : la variable de réservation est renommée `claimToken` dans sa déclaration et ses trois utilisations RPC. Le jeton d'authentification reste `token`. Commit `79d0ccb38c5f0f1610d4eff648d582b88e5eb603` sur `developpement/phasmo-v2`. Fonction serveur redéployée en **version 5**, active ; vérification du code déployé : plus de déclaration locale concurrente. Vérification SQL après correctif : candidat de test **n°8/révision 12**, aucune publication ni média public, verrou `false` et aucune réservation active.

**Test navigateur encore demandé** : sans republier ni toucher aux brouillons, cliquer sur « Actualiser les commandes et l'historique » et lire le texte immédiatement sous « Commandes administrateur · publication et retour arrière ». Résultat attendu : « Verrou public fermé. Candidat : test n°8, révision 12. Aucune version officielle. Historique : 0 version(s). » ; boutons Publier, Restaurer et Mettre hors ligne grisés. Ne pas valider cette recette navigateur avant confirmation de l'administratrice.


### Recette navigateur confirmée le 28 octobre 2026 — statut des commandes administrateur

L'administratrice a rafraîchi le panneau « Commandes administrateur · publication et retour arrière » sur l'éditeur DEV après le correctif `token`. **Texte observé et confirmé :** « Verrou public fermé. Candidat : test n°8, révision 12. Aucune version officielle. Historique : 0 version(s). » L'erreur JavaScript `Cannot access 'token' before initialization` n'apparaît plus : **contrôle d'état et d'historique en navigateur validé**.

**Contre-vérification SQL après retour :** `activation_enabled=false`, aucune réservation active, candidat n°8/révision 12 intact, **0 publication officielle**, **0 ligne d'historique** et **0 fichier dans le bucket public**. Aucun changement sur `main`.

**À distinguer :** la capture ou le retour de ce test confirme l'affichage du bon statut, mais ne constitue pas encore un retour explicite sur le grisage des trois boutons après saisie d'une confirmation ; ce comportement a été validé en simulation JavaScript. Aucun test réel de publication ou restauration n'a été entrepris.
