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
