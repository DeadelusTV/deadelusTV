> **Rédacteur désigné (26/10/2026) :** [mattarix_](https://www.twitch.tv/mattarix_) ; compte Twitch **pas encore identifié dans les identités Auth actuellement présentes** (recherche correspondance de pseudo : 0 résultat). **N'attribuer aucun droit sur la seule base du pseudo.** Faire d'abord connecter la personne à Twitch sur le portail (environnement de test), puis confirmer son UUID Supabase et attribuer exclusivement à cet UUID l'autorisation `phasmo_news_editor`. L'URL de connexion OAuth du portail doit être autorisée dans Supabase Auth avant cet essai.

> **MISE À JOUR 26/10/2026 :** migration `phasmo_news_editor_single_account_private_drafts_v1` **appliquée avec succès** dans le projet Supabase TCG. Vérification : deux tables, cinq politiques RLS, 0 autorisation de rédacteur, 0 brouillon. Le SQL `docs/phasmo-news-sql-a-revoir.sql` est désormais l'archive du SQL préparé initialement ; **ne pas le réexécuter**. Il reste à configurer la Redirect URL OAuth et à attribuer manuellement le droit à l'UUID Twitch exact après première connexion. **Aucun test OAuth réel ni test RLS avec plusieurs sessions encore effectué.**

# Première mise en accès du rédacteur Phasmophobia — 26 octobre 2026

## État réel

**Code prêt en branche** `developpement/phasmo-v2` ; **tables et RLS désormais activées dans Supabase**, mais aucun utilisateur encore habilité.
Les fichiers livrés ne suffisent pas à autoriser le rédacteur tant que les règles et son compte ne sont pas configurés. L'éditeur de démonstration reste indépendant.

## Fichiers

- `public/modules/phasmophobia/editor-private.html` : URL de l'éditeur privé à tester, écran de connexion et contrôles d'accès.
- `public/modules/phasmophobia/editor-private.js` : client Supabase Auth/Twitch identique en principe à celui du TCG (projet Supabase TCG, SDK 2.76.1, OAuth PKCE, maintien de session), vérification en base de `phasmo_news_editors.enabled`, lecture/écriture/suppression des brouillons. La clé dans le frontend est **uniquement une clé publishable publique**. Aucune clé serveur n'est utilisée.
- `public/modules/phasmophobia/editor-private.css` : présentation de la page de connexion.
- `public/modules/phasmophobia/editor-native.js` : modification minimale permettant une sauvegarde via `window.PhasmoDraftBackend` en mode privé. En l'absence de ce pont, la **démo** `editor-preview.html` continue d'utiliser ses brouillons locaux.
- `docs/phasmo-news-sql-a-revoir.sql` : **proposition SQL non exécutée**, destinée à une migration après revue. Deux tables `phasmo_news_editors` (ACL) et `phasmo_news_drafts` (brouillons privés) avec RLS, propriétaire `auth.uid()` et **index d'unicité imposant au maximum un rédacteur actif**.

## Parcours prévu pour notre rédacteur

1. Ouvrir l'URL privée du module après déploiement en environnement de test.
2. Cliquer sur **Se connecter avec Twitch**. Il se connecte avec **son compte Twitch habituel**, pas un compte e-mail ni une connexion Discord supplémentaire.
3. Supabase Auth récupère l'UUID correspondant au compte Twitch. L'interface consulte son autorisation côté serveur. Seul l'UUID explicitement habilité peut charger les brouillons.
4. Rédiger, prévisualiser, enregistrer et retrouver ses **brouillons textuels** depuis un autre appareil avec ce même compte, une fois Supabase configuré. Le bouton **Publier** reste désactivé à ce stade.
5. Se déconnecter. Sans droit, la page demeure un écran « Accès réservé » et les opérations de base sont refusées par RLS.

## Ce qui n'est pas encore disponible

- L'image **depuis le PC** n'est encore que temporaire, comme sur le prototype validé ; il faut ensuite intégrer **Supabase Storage** pour que ces fichiers persistent. Les **URL HTTPS directes** sont conservées dans les brouillons.
- Les articles ne sont **pas encore publiables** sur le blog public, et `news.js` affiche actuellement la source JSON de démonstration. Sauvegarde du texte et publication publique sont deux tâches différentes.
- L'éditeur natif utilise encore `execCommand()`, méthode dépréciée ; remplacer son moteur avant une exploitation de production à grande échelle sans modifier l'ergonomie validée.
- La page HTML n'est pas secrète sur un hébergement statique ; la protection doit impérativement demeurer dans les politiques de base.

## Mise en service : migration déjà exécutée, étapes OAuth et attribution encore à effectuer

1. **Revoir** la proposition `docs/phasmo-news-sql-a-revoir.sql` avec les règles existantes du projet TCG. Convertir ensuite en **migration officielle** et effectuer une sauvegarde avant application, puis tester la migration et la RLS dans un environnement isolé si possible. Ne pas utiliser l'ancienne table `tcg_admins` ni le statut `is_moderator` comme permission News.
2. Installer et vérifier ces tables/RLS dans le projet Supabase TCG **après validation explicite du changement de base**. Tester : utilisateur anonyme, simple viewer, autre modérateur, rédacteur et rôle révoqué. La politique `UPDATE` doit protéger aussi les valeurs modifiées (`WITH CHECK`), en plus des valeurs anciennes (`USING`).
3. Ajouter **sans écraser celles du TCG** les adresses exactes d'aperçu de la rédaction aux **Redirect URLs** de l'authentification Supabase, par ex. l'URL `http://127.0.0.1:5500/public/modules/phasmophobia/editor-private.html` si c'est bien celle du serveur local testé ; ajouter ensuite la véritable URL sur OVH. Attention : sur la page, la redirection reprend automatiquement `origin + pathname`, donc l'adresse réellement utilisée doit être autorisée (nom de domaine, port et chemin).
4. Faire **connecter notre rédacteur une première fois avec Twitch** pour que son compte existe dans `auth.users`. Retrouver son UUID depuis l'interface administrateur Supabase sécurisée, sans confier de secrets au navigateur. Un pseudo Twitch seul ne constitue pas l'identifiant du privilège.
5. Désigner cet UUID comme **seul rédacteur actif** via une opération administrative SQL contrôlée ; l'exemple (non exécuté) est en bas de `docs/phasmo-news-sql-a-revoir.sql`. Pour changer de rédacteur, désactiver le précédent puis attribuer le nouveau. Aucun changement des rôles TCG.
6. Déployer uniquement la branche de test, vérifier l'OAuth, les droits RLS, l'enregistrement, la restauration d'un brouillon et sa suppression avec **deux comptes distincts**. Ne déployer sur `main` qu'après validation expresse.

## Tests réalisés sur les fichiers préparés

- Vérifications statiques du chargement différé et du code de permissions.
- 9/9 simulations JavaScript : utilisateur anonyme, compte non habilité, utilisateur habilité, sauvegarde et suppression via l'API. **Simulations, pas essais réels de connexion / RLS.**
- Aucune création de compte, aucun changement Supabase, aucune activation de rôle, aucun déploiement `main` dans ce lot.

## Accès direct depuis la rubrique News (préparé dans la branche Phasmo)

- Le portail `public/index.html` intègre `modules/phasmophobia/news-access.js`, chargé avec la rubrique News. Une connexion Twitch discrète est proposée dans cette rubrique ; **« Gérer les actualités » n'est visible que si le compte connecté possède réellement le rôle News**. Les autres modérateurs/lecteurs n'obtiennent pas ce bouton.
- La connexion Twitch sur le portail et celle de `editor-private.html` emploient le **même projet Supabase et le même stockage de session** si les deux pages sont diffusées sur la même origine. Après authentification, le rédacteur reste connecté en passant à l'éditeur.
- Développement et tests statiques sur `developpement/phasmo-v2` : 11/11 scénarios JS simulés ont validé l'affichage connecté/non connecté, l'interdiction d'accès à un non-rédacteur, le retour OAuth, la déconnexion et le lien direct. Ces tests **ne prouvent pas encore** le fonctionnement du vrai callback ni des politiques en navigateur.
- Démonstration existante : `https://deadelustv.pages.dev`, publiée depuis `preview/presentation-deadelus` et **non synchronisée avec les nouveaux fichiers Phasmo**. Ne pas utiliser la démo actuelle comme preuve que ce lien est déjà accessible ; intégrer ces changements sélectivement, sans écraser le reste de la présentation. Aucun changement de `main`.
- Lorsqu'une version de test sera effectivement déployée sur ce domaine, ajouter **les URL réellement servies** à Authentication → URL Configuration → Redirect URLs, par exemple `https://deadelustv.pages.dev/` et `https://deadelustv.pages.dev/modules/phasmophobia/editor-private.html`. Les laisser en parallèle avec les URL existantes du TCG. Confirmer le chemin exact du callback avant l'essai.

## Administration de secours distincte (26/10/2026)

- Deux rôles indépendants : **rédacteur attitré** (mattarix_, en attente de première connexion Twitch) et **administratrice de secours** (compte Twitch personnel `yekelle`).
- `yekelle` et son UUID Supabase Auth ont été **vérifiés dans les identités Twitch et dans le registre d'administration TCG**, mais ce registre TCG n'attribue aucun droit Phasmo automatiquement. L'administration Phasmo dispose de sa propre table `public.phasmo_news_admins`, sans connexion avec les rôles TCG.
- Deux migrations Supabase **appliquées avec succès** : `phasmo_news_admin_role_only_v1` (table + RLS + un administrateur actif maximum), puis `phasmo_news_admin_draft_rls_v1` (politiques existantes des brouillons adaptées à l'accès administrateur). Archive de leurs instructions : `docs/phasmo-news-admin-migration.sql`.
- Une administratrice ayant le rôle `phasmo_news_admins.enabled=true` peut charger, créer, modifier et supprimer les **brouillons Phasmo**, y compris ceux du rédacteur. Le rédacteur conserve son accès limité à ses propres brouillons. L'insertion reste personnelle (`owner_id=auth.uid()`) ; les clients authentifiés ne peuvent modifier en UPDATE que `payload` et `updated_at`, pas `owner_id` ni `id`.
- Le portail `news-access.js` et la page `editor-private.js` vérifient d'abord le rôle de rédacteur, puis le rôle administrateur du blog ; aucun privilège n'est déduit d'un pseudo, du statut Modo ou du rôle admin TCG.
- **Attribution du rôle administrateur non effectuée :** l'outil de modification SQL a bloqué l'opération nominative d'attribution malgré l'identité vérifiée. Ne pas annoncer l'accès `yekelle` comme actif avant insertion administrative contrôlée du bon UUID dans `public.phasmo_news_admins`.
- **Recette requise :** confirmer la ligne enabled=true dans `phasmo_news_admins`, tester dans un navigateur la connexion Twitch sur la branche déployée avec callback autorisé, tester l'ouverture de la rédaction et la sauvegarde, puis re-tester le refus d'un compte tiers. Vérifier aussi l'accès de mattarix_ uniquement après sa première connexion et l'attribution de son rôle rédaction.
- 12/12 simulations JS ont validé visiteurs refusés, rôles rédacteur/admin acceptés, opérations insertion/modification/suppression et absence de transfert du propriétaire. **Pas encore de test réel OAuth/RLS avec ces comptes.**


## Images pérennes dans les brouillons (26/10/2026)

**Implémentation préparée et déployable sur `developpement/phasmo-v2` :**
le bucket privé Supabase `phasmo-news-draft-images` est créé, avec RLS fondée sur l'UUID connecté et les rôles dédiés News. PNG, JPEG, WebP acceptés, taille maximale 2 Mio. L'administratrice peut relire les images du rédacteur sans modifier le contenu du TCG.

Dans l'éditeur privé, coller/déposer/choisir une image lance un upload authentifié ; la sauvegarde du brouillon attend sa fin, puis persiste uniquement la référence `phasmo-media:<uuid>/<uuid>.<ext>` dans le document JSON. Au rechargement/F5, le navigateur télécharge l'image avec l'authentification Twitch et crée un blob local pour l'affichage. Les couvertures sont prises en charge aussi. Les URL d'images HTTPS déjà présentes continuent de fonctionner sans être copiées.

**Limites :** pas d'accès public aux images de brouillon ; le JSON exporté ne contient pas les octets des images ; toute image supprimée du texte peut rester temporairement dans Storage en attendant un nettoyage séparé ; la publication d'un article demandera son propre traitement des médias publiés. Si un upload échoue, ne pas considérer le brouillon comme enregistré. La version autonome `editor-preview.html` reste un prototype local.

**Test utilisateur à refaire :** sur l'URL de branche Cloudflare existante, ouvrir un brouillon de test, coller une image PNG/JPEG/WebP de moins de 2 Mio, attendre la confirmation « Brouillon et images enregistrés sur Supabase », faire F5 et confirmer que le texte ET l'image restent visibles. Essayer aussi une image de couverture. Les tests réalisés jusqu'ici sont des simulations backend (9/9) et des vérifications statiques (10/10), pas encore une recette réelle en navigateur connecté.


## Test de publication sur Cloudflare (après validation des brouillons/images)

1. Ouvrir `https://developpement-phasmo-v2.deadelustv.pages.dev/modules/phasmophobia/editor-private.html` avec le compte Twitch administratrice existant.
2. Préparer un **article de test non confidentiel** : titre, résumé, date, lien Kinetic Games valide, texte et image de moins de 2 Mio déjà sauvegardée.
3. Cliquer sur **Publier sur la démo**, confirmer. La publication devient **publique sur l'environnement de développement** : le brouillon, lui, demeure privé.
4. Dans un onglet de navigation privée (sans connexion Twitch), ouvrir `https://developpement-phasmo-v2.deadelustv.pages.dev/#phasmophobia`, déplier News, voir la vignette et ouvrir la page de l'article. Vérifier texte, gras/titres/liens, image et couverture.
5. Revenir à l'éditeur, repérer la publication dans **Publications de test**, cliquer sur le titre, changer un paragraphe, puis **Mettre à jour sur la démo**. Actualiser la page publique et vérifier la correction.
6. Tester **Retirer de la démo** : l'article ne doit plus apparaître dans les News. Il reste récupérable dans la liste privée (statut Retiré) pour nouvelle édition, et le brouillon privé est conservé.
7. **Ne pas utiliser les articles de test pour des informations confidentielles.** Ils sont publics sur le domaine de développement et via l'API. Il n'y a pas encore de publication officielle : canal `preview` uniquement.
8. Si l'article n'apparaît pas : vérifier d'abord les erreurs affichées dans l'éditeur et le statut des appels réseau, sans altérer les réglages OAuth/Twitch déjà validés. Un résultat simulé n'équivaut pas à une recette utilisateur.
