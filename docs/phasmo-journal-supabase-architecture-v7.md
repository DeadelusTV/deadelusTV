# Phasmo V2 — Architecture Supabase du carnet V7 (proposition à valider)

> **État actualisé au 28 octobre 2026 :** la première phase de brouillon **preview** est appliquée dans Supabase. Quatre tables de brouillons/rôles/historique sécurisées, deux comptes administrateurs autorisés, et synchronisation manuelle du carnet V7 sur `developpement/phasmo-v2` **validée dans le navigateur par l'utilisatrice** (Twitch, chargement, enregistrement, F5, rechargement). Une seconde migration de **publication PREVIEW privée uniquement**, `phasmo_journal_private_preview_publication_v1`, a été appliquée : deux nouvelles tables de snapshot/historique, avec RLS administrateurs exclusivement ; lecteur privé `?viewer=1&publication=preview` et bouton « Publier pour test (admin) » branchés dans l'atelier. **Publication PREVIEW privée maintenant validée par l'utilisatrice sur Cloudflare.** Le pilote Storage a également été installé : migration `phasmo_journal_storage_preview_private_v1`, bucket privé `phasmo-journal-draft-assets`, références de médias versionnées SHA-256, RLS et modules de transfert/relecture des images et polices. **Test réel d'upload/lecture Storage dans le navigateur encore à faire.** Aucune table production ni lecture publique créée, aucune fusion `main`. Le plan ci-dessous conserve ses arbitrages initiaux et ses références aux futures tables de production.


**Date :** 28 octobre 2026  
**Statut :** proposition de conception historique, suivie des implémentations de brouillon preview et de publication test privée décrites ci-dessus. La publication publique/production et son futur bucket de médias publics restent à valider. Le Storage du seul pilote privé est installé, sa recette navigateur restant en attente.  
**Périmètre GitHub :** `developpement/phasmo-v2` exclusivement. `main` et News/TCG inchangés.

## 1. Audit réel, vérifié en lecture seule

- Projet Supabase partagé utilisé par DeadelusTV : `eodtxlhnfzyapkyvvxdi` ; PostgreSQL 17.
- Auth Twitch déjà présente dans `public/assets/site-auth.js`. Les News disposent de `phasmo_news_admins`, `phasmo_news_editors`, `phasmo_news_articles`, `phasmo_news_drafts`, `phasmo_news_drafts_production`, avec RLS. Ne pas réutiliser **leurs droits**, seulement la **même identité** Supabase Auth.
- Buckets existants : `phasmo-news-draft-images` (privé), `phasmo-news-published-images` (public) et `tcg-card-images` (public). Ils sont réservés à leurs fonctionnalités ; ne pas placer les médias du carnet dedans.
- Aucune table `phasmo_journal_*` observée. `site-auth.js` teste déjà facultativement `phasmo_journal_admins`, mais la table n'existe pas encore.
- Carnet validé dans le navigateur en V7 : cinq catégories racines fixes, `records` avec `fiche-...`, `folders` avec `rubrique-...`, calques `elements[]` sur `sommaire`, `category:<cat>`, `detail:<cat>`, `entry:<fiche-id>` et `*`, listes indépendantes `listMode: records/folders/manual`, ordre, archives, personnalisation, fil d'Ariane, pagination, images, polices.
- JSON V7 exportable / importable et `localStorage` actuellement utilisés. **Ne pas supprimer cette possibilité de sauvegarde de secours.**
- Ancien projet de SQL `docs/phasmo-journal-sql-a-valider.sql` : **jamais appliqué et devenu insuffisant** (table générique `documents`, rôle admin unique, pas de flux brouillon/révision/médias). Ce fichier NE DOIT PAS être exécuté comme base de la V7.

## 2. Objectifs non négociables

1. Une seule identité Twitch/Supabase Auth pour le portail, sans toucher à la rédaction News ou au TCG.
2. Brouillons partagés, explicitement différents du contenu visible aux visiteurs.
3. Environnements `preview` et `production` **isolés en données et en publication**, tout en partageant le même projet Supabase.
4. Les données déjà créées (identifiants, liens, catégories, sous-catégories, calques, positions, z-index, styles, images) sont conservées, sans refonte visuelle.
5. Sauvegarde atomique avec conflit détecté, historique et restauration. Aucune réécriture silencieuse par un deuxième éditeur.
6. Lecture publique de la **version publiée seulement** ; un éditeur connecté mais non autorisé ne voit aucun brouillon.
7. Migration en plusieurs phases, tests RLS et restauration avant activation du moindre accès en production.

## 3. Modèle recommandé pour la PREMIÈRE synchronisation

Pour conserver intégralement le format V7 et limiter le risque de casser ses relations internes, commencer par un **document JSON complet par environnement**, et pas par une reconstruction prématurée de chaque calque en table SQL. Les fiches conservent leurs identifiants `fiche-...`, les dossiers `rubrique-...` et leurs références `folderId`. On n'essaie **pas** de convertir ces identifiants texte en UUID SQL : ils ne sont pas tous des UUID purs.

### Tables proposées (noms de travail)

| Table | Responsabilité | Lecture / écriture |
|---|---|---|
| `phasmo_journal_admins` | Utilisateurs autorisés à administrer et à **publier** | Lire son propre statut ; attribution/révocation par canal fiable seulement |
| `phasmo_journal_editors` | Utilisateurs autorisés à éditer le carnet sans publier | Lire son propre statut ; attribution/révocation par canal fiable seulement |
| `phasmo_journal_drafts` | Un **snapshot V7 partagé** par `stage` ; champs `stage`, `payload jsonb`, `revision bigint`, `updated_by`, `updated_at` | Lecture/rédaction éditeur ou admin ; jamais publique |
| `phasmo_journal_publications` | Dernier snapshot validé par `stage`, avec `source_revision`, `published_by`, `published_at` | Lecture de la version publiée selon visibilité de l'environnement ; écriture admin uniquement |
| `phasmo_journal_revisions` | Journal de versions/restaurations des sauvegardes et publications, auteur, stage, horodatage | Lecture admin / éditeur selon droits ; modification/suppression publique interdites |

`stage` : valeur contrôlée `preview` ou `production`. Un snapshot `preview` n'est jamais automatiquement rendu public en production. Le contrôle du stage ne repose pas sur un simple nom de branche dans le navigateur.

**Limite assumée de la V1 partagée** : le brouillon est un document partagé unique par environnement. Deux éditeurs peuvent travailler, mais ils doivent gérer un conflit si l'autre a enregistré entre-temps. Les éditions simultanées à la granularité d'une fiche devront faire l'objet d'une V2 (tables séparées ou opérations par fiche), plutôt que d'écraser les changements.

### Sauvegarde et publication

- À l'ouverture de l'éditeur : charger le brouillon distant autorisé avec sa `revision`, en proposant l'import de l'ancien JSON local et sans écraser silencieusement l'existant.
- Au clic Enregistrer : opération atomique de **compare-and-swap** avec la révision attendue (`revision` reçue à l'ouverture). Si le brouillon a changé entre-temps, renvoyer un **conflit** et proposer rechargement, comparaison ou export local, jamais « dernier arrivé gagne ».
- Préférer un endpoint transactionnel à sécurité vérifiée (RPC en `SECURITY INVOKER` avec politiques RLS et droits SQL soigneusement ajustés, ou Edge Function dédiée) pour vérifier la révision et enregistrer l'auteur réel. Ne pas autoriser un `UPDATE` direct non conditionnel contournant la révision.
- Enregistrer une version historisée selon une fréquence/stratégie raisonnable, avec rétention et limites définies avant implémentation.
- Publier = opération explicite, admin seulement, copiant un instantané de brouillon **complet, valide et contrôlé** vers la publication de son `stage`. La publication précédente reste récupérable dans l'historique.
- Revenir à une ancienne version doit créer une **nouvelle révision** traçable, et non réécrire l'historique.
- En production, un visiteur sans connexion charge `phasmo_journal_publications(stage='production')` : jamais `drafts`.
- En prévisualisation : l'éditeur peut consulter son brouillon connecté ; une publication `preview` pourra alimenter le livre de test. **Décision à confirmer avant politiques** : publication preview lisible par tous les visiteurs de l'URL preview ou uniquement par comptes de test. Un lien non secret n'est pas une protection.

## 4. Médias : fichiers, pas base64 en table

Le JSON V7 peut contenir `elements[].image` au format `data:image/...;base64,...` et des polices en base64 dans `fonts[]`. Le schéma actuel de SQL proposé limite le JSON à 5 Mo ; ne pas supposer qu'un export réel y tiendra.

- Créer, après validation, des buckets dédiés, par exemple `phasmo-journal-draft-assets` (**privé**) et `phasmo-journal-published-assets` (**public** pour fichiers effectivement publiés).
- Migration assistée des images **et polices** : extraction du base64 local, vérification MIME/taille, dépôt privé et remplacement des données intégrées par des **références stables**. Ne pas casser les calques ni les identifiants ; prévoir restauration si un upload échoue.
- Lors de la publication, copier/valider les assets nécessaires dans un chemin versionné publié. Ne jamais mettre le média inédit d'un brouillon dans un bucket public, même « avec une URL difficile à deviner ».
- Restreindre `storage.objects` : lectures privées aux rédacteurs autorisés et aux administrateurs, upload/remplacement/suppression avec RLS et chemins contrôlés ; le bucket public est servi publiquement mais les écritures restent protégées.
- Empêcher l'écrasement des médias d'une publication déjà visible : chemins immuables/versionnés ; suppression des fichiers orphelins seulement après vérification de références et de la rétention des versions.
- Les polices importées nécessitent les mêmes contrôles de droits, MIME/extension et performance que les images.
- Conserver des tailles maximales adaptées au besoin réel après mesure des premiers exports V7 ; ne pas inventer une limite qui rend les carnets existants inimportables.

## 5. Matrice d'accès cible

| Acteur | Brouillon preview | Brouillon production | Publier preview | Publier production | Version publiée |
|---|---|---|---|---|---|
| Visiteur / non connecté | Aucun | Aucun | Non | Non | Lecture selon stage |
| Twitch connecté sans rôle carnet | Aucun | Aucun | Non | Non | Lecture selon stage |
| Rédacteur News seulement | Aucun | Aucun | Non | Non | Lecture selon stage |
| Éditeur carnet (autorisé) | Lire/éditer | À définir : commencer **sans** écriture production | Non | Non | Lecture |
| Administrateur carnet | Lire/éditer | Lire/éditer | Oui | Oui | Lecture |
| Compte dont le rôle vient d'être révoqué | Aucun accès de modification | Aucun accès de modification | Non | Non | Lecture publique |

Le lien UI « Atelier du carnet » ne remplace PAS les contrôles Supabase : RLS et API constituent l'autorité. Attribution manuelle initiale, par un canal administratif fiable et journalisé. Révocation effective via permissions en base consultées au moment de chaque opération.

La reconnaissance **automatique** des modérateurs Twitch du seul canal DeadelusTV reste **en réflexion, non activée**. Si elle est créée ultérieurement, la vérification doit être côté serveur et rattachée au `broadcaster_id` de DeadelusTV. L'attribut `is_moderator` des viewers TCG ou les `user_metadata` Twitch ne sont pas des autorisations de rédiger le carnet.

## 6. Sécurité et déploiement

- Activer RLS pour **toutes** les nouvelles tables exposées ; `anon` ne doit jamais recevoir les brouillons, les rôles ou l'historique. `authenticated` seul ne suffit pas pour écrire ou lire les données privées.
- Les permissions éditoriales **ne découlent pas** des rôles News/TCG. Contrôles SQL sur `auth.uid()` et les listes privées de permissions du carnet.
- RLS `SELECT` nécessaire aussi pour `UPDATE` ; politiques `USING` **et** `WITH CHECK` ; contrôler `stage`, l'auteur et les champs modifiables.
- Limiter les possibilités d'escalade : un éditeur ne peut ni se donner un rôle, ni appeler l'opération de publication, ni réassigner arbitrairement un rôle, ni supprimer l'historique.
- Ne jamais inclure de `service_role` ni de secret dans les scripts publics. Si une fonction `SECURITY DEFINER` devenait nécessaire, faire une revue distincte et explicite de ses droits/du schéma exposé ; elle n'est pas le choix par défaut.
- **Spécificité Supabase 2026** : les nouvelles tables de `public` ne sont plus automatiquement exposées à la Data API par défaut selon la configuration/échéance du projet (application générale annoncée au 30/10/2026). Vérifier la configuration Data API, les `GRANT` et l'exposition réelle : ce réglage est distinct des politiques RLS.
- Tests sous quatre identités : anonyme, connecté sans droit (y compris News), éditeur carnet, administrateur carnet, puis **rôle révoqué**. Tester lecture/écriture/archivage/publication et changement de stage pour chaque cas.
- Réaliser un audit de sécurité et tests de restauration **avant** toute activation publique. Le projet contient aussi les données News/TCG : réutiliser l'instance ne donne pas le droit de toucher à leurs tables ni aux buckets existants.

## 7. Déroulement proposé, validation à chaque étape

1. **Présente étape (réalisée)** : audit réel lecture seule, revue du JSON V7 et rédaction de cette proposition. Ni SQL ni code réseau appliqués.
2. **Validation fonctionnelle** : valider les rôles, qui publie, la visibilité preview, les permissions en production et la politique de conflit. Décider si la sauvegarde commune par stage suffit initialement, ou si l'édition simultanée par fiche est impérative dès V1.
3. **Schéma revu** : écrire la migration SQL exacte sur branche de travail, prévoir rollback et tests RLS. La migration ne sera appliquée qu'après validation explicite. Ne pas exécuter l'ancien `phasmo-journal-sql-a-valider.sql`.
4. **Test preview isolé** : créer les objets nécessaires dans Supabase après feu vert, accorder manuellement les premiers droits, conserver le mode local comme secours ; valider l'enregistrement, la réouverture et les conflits entre deux sessions.
5. **Médias** : migrer les fichiers réels vers Storage dans les conditions ci-dessus et confirmer que les JSON de secours sont encore exportables/restaurables.
6. **Publication preview** : lire un snapshot publié dans la visionneuse publique d'aperçu, vérifier qu'un brouillon non publié reste invisible. Continuer à préserver le carnet et ses cinq onglets.
7. **Production** : publication conditionnée à une recette complète et à la décision de mise en ligne. Ne pas toucher à `main` sans autorisation explicite.

## 8. Points à arbitrer avant développement de la migration

- **A : Gestion des rédacteurs** — recommandation : deux rôles, `éditeur` (brouillon) et `administrateur` (publication + gestion des droits), accordés manuellement au départ.
- **B : Accès au brouillon de production** — recommandation : administrateurs seulement pendant le pilote ; élargissement après recette.
- **C : Visibilité d'une publication preview** — ouverte à l'URL de prévisualisation ou réservée à des comptes de test ? Recommandation : comptes autorisés pour les contenus inédits.
- **D : Édition simultanée** — recommandation pour la première phase : document partagé V7 avec verrou optimiste (erreur explicite en cas de révision concurrente) et export local. **Ce n'est pas** une coédition temps réel à plusieurs.
- **E : Rétention** — nombre/durée des versions et médias, à définir après mesures et stratégie de sauvegarde existante.
- **F : Activation automatique des modérateurs Twitch** — **hors périmètre** de la première migration.

## 9. Références de revue

- Supabase RLS : https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage buckets : https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access : https://supabase.com/docs/guides/storage/security/access-control
- Supabase Functions/RPC : https://supabase.com/docs/guides/database/functions
- Supabase changelog : https://supabase.com/changelog?types=breaking-change

**Ce document est une proposition de conception. Aucune autorisation de migration ne doit être déduite de sa présence dans le dépôt.**
