# Audit en lecture seule — authentification Twitch du TCG et blog Phasmophobia

**Date :** 26 octobre 2026  
**Branche de documentation :** `developpement/phasmo-v2`  
**Périmètre :** architecture de comptes DeadelusTV / TCG / rédaction Phasmo uniquement. **Crewmong Us exclu.**

## Décision produit déjà validée

Un compte **DeadelusTV** par personne ; **connexion principale Twitch** pour les modules qui nécessitent un compte ; **Discord associable facultativement**, sans deuxième compte à gérer. Le rédacteur Phasmo est un modérateur de la chaîne, comme plusieurs autres personnes, mais **il est le seul** à recevoir le privilège de publier des billets d'actualité Phasmophobia.

La validation concerne le **comportement fonctionnel** et non une migration déjà effectuée.

## Sources effectivement vérifiées (lecture seule)

- Projet Supabase existant **DeadelusTV TCG** (actif, 26/10/2026), via l'inspection des tables des schémas `public` et `tcg_private`, des politiques PostgreSQL `pg_policies`, des définitions de fonctions publiques sélectionnées, du nombre d'identités OAuth par fournisseur et de la liste des Edge Functions ; **aucune donnée personnelle de compte restituée** dans le présent document.
- Dépôt `DeadelusTV/deadelusTV`, branche `developpement/phasmo-v2`, `README.md`, `docs/ROADMAP.md` et arborescence du site : les pages TCG du portail y sont encore une présentation « À venir ». Le frontend complet du TCG n'est pas présent dans ce dépôt.
- Dépôt de sauvegardes TCG : seulement le contexte documentaire des sauvegardes, **pas** un frontend d'authentification de référence.
- Documentation Supabase : `https://supabase.com/docs/guides/database/postgres/row-level-security` ; `https://supabase.com/docs/reference/javascript/auth-linkidentity`.

## Résultats vérifiés

1. **Twitch fonctionne déjà comme fournisseur Auth dans le projet TCG** : il existe des identités `auth.identities` rattachées au fournisseur `twitch` (deux lors de cet audit). **Aucun nom, e-mail, identifiant individuel ou jeton n'a été relevé**.
2. `public.tcg_accounts.user_id` est une clé étrangère vers `auth.users.id`. Le TCG utilise donc déjà un UUID Supabase Auth pour les comptes des joueurs. `tcg_accounts.viewer_id` rattache éventuellement le compte à `tcg_viewers`.
3. `public.tcg_admins` conserve des rôles **TCG** `owner`, `admin`, `editor`, associés à `auth.users.id`. La fonction existante `tcg_is_admin()` vérifie l'appartenance à cette table et sert aux politiques de plusieurs tables TCG.
4. `public.tcg_viewers` possède un champ `is_moderator` lié au statut viewer/Twitch, **distinct** de la table de rôles `tcg_admins`. Ne pas confondre le bonus/statut de modérateur Twitch et les pouvoirs d'édition/administration du TCG.
5. Des politiques RLS limitent notamment la lecture personnelle de `tcg_accounts` et `tcg_inventory_copies` à leur `auth.uid()`; les politiques de gestion TCG inspectées vérifient `tcg_is_admin()`.
6. Deux Edge Functions à objet Twitch sont déployées : `tcg-twitch-test` et `tcg-twitch-sync`. Ce sont des éléments de l'intégration Twitch **TCG**, pas des points d'entrée à réutiliser automatiquement pour l'administration des News. `tcg-twitch-sync` ne requiert pas de JWT Supabase à l'entrée (`verify_jwt=false`) : **cela ne prouve pas une faille**, mais impose d'examiner ses protections internes si l'on devait un jour la réutiliser. Elle n'est pas nécessaire pour ce blog.
7. Dans le schéma Auth, seuls des comptes `twitch` ont été observés lors du contrôle des identités existantes. **Cela ne permet pas de conclure** que le fournisseur Discord est activé ou désactivé dans le tableau de bord Auth : ce paramètre n'a pas pu être vérifié ici.
8. Le site principal et le TCG ne sont pas le même frontend aujourd'hui. Le site public est actuellement `https://www.deadelustv.com` ; **l'origine exacte du frontend TCG et sa logique de persistance de session n'ont pas été vérifiées**. Les stockages navigateur (cookies/localStorage) ne se partagent pas automatiquement entre des origines distinctes, même lorsque les deux pages utilisent un seul projet Auth.
9. Les fichiers de connexion Twitch du frontend TCG et les réglages OAuth de redirection ne sont pas disponibles dans les fichiers du portail consultés. **Ne pas prétendre qu'un SSO inter-pages fonctionne déjà**, ni changer des URL de callback sans inventaire complet.

## Architecture recommandée (à développer, non activée)

**Une identité utilisateur commune**, idéalement celle de Supabase Auth déjà utilisée dans le projet TCG, après validation du déploiement et des domaines :

`Connexion Twitch → utilisateur Supabase Auth (UUID unique) → permissions indépendantes par fonctionnalité`

Les identités Discord pourront être reliées explicitement au **même utilisateur** via le mécanisme d'association OAuth, si/une fois le fournisseur activé et l'interface configurée ; Discord n'est pas nécessaire à l'accès au blog.

### Permissions à séparer

| Situation | Permissions TCG | News Phasmo |
| --- | --- | --- |
| Viewer ordinaire | Selon règles TCG | Consultation publique uniquement |
| Autre modérateur Twitch | Selon règles TCG prévues | **Aucun accès rédaction** |
| Rédacteur News (aussi modérateur) | Selon règles TCG prévues | **Rédaction et publication directe** |
| Gestionnaire TCG `tcg_admins` sans rôle News | Gestion TCG actuelle | **Aucun accès rédaction** |

La permission indépendante `phasmo_news_editor` doit être attribuée **manuellement à un UUID Auth précis**, sans dépendre du pseudo Twitch, du statut de modo, du compte Discord, ni de `tcg_admins`.

Proposition de modèle à concevoir : registre dédié de permissions du site (par ex. `site_permissions` avec `user_id`, `permission` et une contrainte d'unicité), réservé aux administrateurs serveur, non modifiable par un utilisateur connecté ; publication autorisée uniquement si `auth.uid()` possède explicitement `phasmo_news_editor`. Ne pas donner au rédacteur de permission `service_role` ni de droit global sur le TCG.

**RLS et API :** seuls les billets `published` sont publics ; seuls le rédacteur expressément habilité et l'administration de confiance peuvent lire les brouillons ou écrire dans le blog ; vérifier `SELECT`, `INSERT`, `UPDATE` (avec `USING` et `WITH CHECK`), la propriété des médias, les tailles et types des images, les changements de statut, les suppressions et la révocation des droits. Le contrôle du compte doit être fait côté base/serveur, pas à partir d'une case dans le navigateur.

**Intégration UI :** afficher « Se connecter avec Twitch » lorsque c'est nécessaire ; afficher le lien « Gérer les actualités » seulement si l'identité courante possède la permission News ; l'URL de l'éditeur reste devinable sur un site statique, mais l'API et les brouillons demeurent strictement interdits aux autres comptes. Supprimer toute logique de publication reposant seulement sur le frontend.

### Vérifications impératives avant d'écrire du code d'authentification

1. Retrouver/inspecter le **frontend d'authentification TCG actuellement déployé**, ses dépendances, ses URL de retour OAuth et son origine. Confirmer comment il initialise Supabase et conserve la session.
2. Choisir l'**origine commune** pour la session (idéalement un seul site/origine pour TCG et portail, si l'organisation du déploiement le permet). Si origines différentes, définir un vrai flux sécurisé d'établissement de session par origine ; un `localStorage` d'une page ne devient pas celui d'une autre.
3. Vérifier les fournisseurs configurés dans **Supabase Authentication** : Twitch existant ; Discord seulement si souhaité et possible après contrôle des paramètres de redirection.
4. Préparer un schéma de permissions distinct et une table News/Storage dédiée dans **le même projet Auth** (ou un backend intermédiaire authentifiant les mêmes utilisateurs). Ne pas créer une troisième instance Supabase Auth indépendante juste pour le blog.
5. Développer/tester toutes les politiques RLS, y compris avec compte anonyme, viewer, modérateur TCG non rédacteur, rédacteur autorisé, administrateur TCG non rédacteur et session révoquée.
6. Raccorder le stockage des brouillons et images au site, puis le lecteur public et les archives à **des articles publiés**, jamais aux brouillons.
7. Intégrer l'éditeur visuel validé par l'utilisatrice. Son moteur natif de test `execCommand()` est déprécié ; une implémentation de production maintenue et testée devra préserver son ergonomie.
8. Faire valider la fonctionnalité avant de toucher à `main` ou aux données de production.

## Ce qui n'a PAS été fait

- Aucune création de compte ou attribution de `phasmo_news_editor`.
- Aucun changement de fournisseur OAuth, d'URL callback, de schéma, de politique RLS, de table, d'Edge Function ou de données TCG.
- Aucun changement du frontend public ou de la branche `main`.
- Aucun rapprochement avec le compte e-mail de Crewmong Us, qui appartient à une **autre personne** et est hors périmètre.

**Conclusion :** réutiliser l'Auth Twitch du TCG est crédible et devrait être privilégié, **sous réserve du contrôle des origines et de la session du frontend TCG**. L'accès au blog reste indépendant des permissions de modération TCG. L'étape technique suivante, à l'issue de cet audit documentaire, est l'intégration de la session Twitch commune et des permissions News dans un environnement de développement.


## Complément : frontend TCG retrouvé (26/10/2026)

Après l'audit initial, le vrai dépôt privé **`Yekelle/TCG`**, branche `develop`, a été retrouvé et consulté. `public/auth.js` établit un client du projet Supabase TCG via `@supabase/supabase-js@2.76.1` et une **connexion Twitch OAuth PKCE** : `flowType: 'pkce'`, `detectSessionInUrl: true`, `persistSession: true`, `autoRefreshToken: true`. Son `redirectTo` normal est `window.location.origin + '/'`. Il expose l'état de la connexion via `tcg:auth-change` et utilise `tcg_is_admin()` pour l'administration TCG. Une version d'essai supplémentaire du flux Twitch pour le diffuseur comporte des scopes spéciaux, **à ne pas copier pour un rédacteur News**.

Le `wrangler.jsonc` du TCG configure les **Cloudflare Workers Static Assets**, qui servent uniquement d'environnement de **développement TCG** selon la précision de la responsable du site. L'intégration finale doit se faire sur le site principal DeadelusTV hébergé par OVH, pas en créant un site de production TCG séparé. L'adresse exacte de l'aperçu en ligne et ses URL de callback déjà autorisées n'ont pas été vérifiées ; les redirections de la rédaction devront être ajoutées sans retirer les URLs du TCG.

Les documents Google Drive « TCG - Documentation et décisions », « TCG - Journal technique » et « TCG - Suivi du développement » confirment ces choix et que le frontend `Yekelle/TCG` est séparé du dépôt du portail.

**Prototype de mise en accès préparé** sur `developpement/phasmo-v2` : `public/modules/phasmophobia/editor-private.html`, `editor-private.js`, `editor-private.css`, adaptation facultative de `editor-native.js` à une sauvegarde Supabase. Brouillons et ACL définis dans `docs/phasmo-news-sql-a-revoir.sql` **non appliqué**. L'accès n'est pas encore activé pour le rédacteur, et l'éditeur démo `editor-preview.html` reste fonctionnel en local.
