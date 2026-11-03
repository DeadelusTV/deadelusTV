# DeadelusTV — Centre de gestion des accès (chantier V2)

**Date :** 3 novembre 2026
**Branche :** developpement/phasmo-v2 uniquement.
**Statut :** étape 2 codée sur V2 : schéma SQL de registre persistant préparé, RPC atomique avec audit, intégration à la fonction serveur et interface adaptée. **NON DÉPLOYÉ** ; le registre n'existe pas encore dans la base et aucun droit effectif n'est modifié.

## Décisions confirmées
- Interface de permissions extensible, réservée à **Deadelus et Yekelle exclusivement**.
- Ajout configurable des catégories, sous-catégories et permissions, sans recodage manuel du tableau.
- Premier périmètre : Phasmophobia / Livre / Éditeur ; Phasmophobia / News / Rédacteur ; Crew’mong Us / Helper ; Crew’mong Us / Admin.
- Aucun module Bingo/arbitre ou Dead by Daylight/rédacteur dans ce premier lot : ces exemples concernaient de futurs usages.
- Le statut de modérateur Twitch n'attribue jamais automatiquement les droits d'édition.
- Crew Helper reste limité à la Saisie, hors Gestion et import JSON. Selon Yekelle, Deadelus, Herminerva et elle-même sont admins Crew actuellement ; ce point n'est pas une vérification live des rôles.

## Fichiers créés
- public/admin/access-center.html : page privée séparée sans entrée ajoutée au menu existant.
- public/admin/access-center.css : interface noir/or, responsive.
- public/admin/access-center.js : tableau par personne et deux onglets « Droits des personnes » et « Catégories et permissions ». Configuration dynamique et modification de cases à cocher fonctionnent uniquement en mode local fictif. Sur un serveur distant, chaque requête doit être autorisée par le serveur.
- supabase/functions/site-access-admin/core.js et index.ts : projet de fonction serveur **non déployé** qui vérifie une identité Twitch rattachée à une session Auth Supabase valide, puis vérifie une liste fermée de deux identifiants Twitch numériques exclusivement côté serveur. L'unique action acceptée est bootstrap, en lecture seule ; toutes les écritures renvoient 501.
- scripts/test_site_access_admin.cjs : tests isolés des refus et de la lecture seule.

## Limites : ne pas confondre avec un produit livré
- La maquette du tableau et des formulaires est codée ; rendu et UX réels en navigateur à valider.
- Une démo locale est disponible en servant le dossier public depuis localhost, par exemple : python -m http.server 8080 --directory public, puis http://localhost:8080/admin/access-center.html.
- La démo ne contient que trois comptes **fictifs**, sans accès enregistré ; F5 efface les changements.
- La démo est réservée à localhost / 127.0.0.1, et ne s'active pas à distance.
- Sur Cloudflare/OVH, l'absence de fonction serveur ou de session autorisée **bloque le panneau**.
- Le serveur préparé ne récupère pas encore la liste Twitch des modérateurs, ne dispose d'aucun registre de permissions et n'écrit dans aucune base.
- Aucune fonction serveur n'a été déployée, aucune variable serveur ni table Supabase modifiée, aucun vrai droit changé, pas de changement sur main.

## Vérification serveur envisagée
- SITE_ACCESS_ADMIN_TWITCH_IDS : **exactement deux identifiants Twitch numériques distincts** (Deadelus/Yekelle). Sans configuration, accès refusé. Ne jamais utiliser les pseudos ou user_metadata comme autorité.
- SITE_ACCESS_ALLOWED_ORIGINS : origines explicitement autorisées (test V2). Sans configuration, accès refusé.
- JWT vérifié par l'endpoint Auth du portail ; comparaison avec l'identité de fournisseur Twitch renvoyée par Supabase, pas avec un pseudo transmis par le client.
- CORS ne constitue pas une autorisation. Toutes les actions futures devront revérifier l'identité et les droits côté serveur.
- Ne déployer qu'après vérification des deux comptes, des origines et des règles de sécurité, dans un environnement de test adapté.

## Prochaines étapes, non réalisées
1. Valider l'identité Twitch exacte des deux propriétaires et établir le backend de test sécurisé.
2. Créer le registre persistant de catégories, sous-catégories et permissions avec identifiants stables et journal d'audit ; aucune permission nouvelle ne donne magiquement accès à un module qui ne la contrôle pas.
3. Interroger côté serveur la liste des modérateurs Twitch (autorisation broadcaster moderation:read), gérer tokens et départs.
4. Relier les permissions Phasmo à leurs contrôles réellement existants. Ne pas confondre l'édition du Livre avec celle du Journal des entités tant que le mapping n'a pas été confirmé.
5. Relier Crew par une passerelle serveur sécurisée à son autre projet Supabase, en préservant Admin vs Helper.
6. Vérifier autorisés/refusés, révocation, audit, effet des changements, F5, mobile et absence de régression avant toute entrée de menu ou fusion vers main.

## Contrôles effectués
V2 inspectée et comparée à main : 13 commits sur main absents de V2 lors de l'audit ; aucune fusion effectuée. Syntaxe JS du prototype et du cœur serveur vérifiée. Tests simulés du handler : configuration manquante, mauvaise origine, compte propriétaire, non-propriétaire, tentative de modification refusée ; résultats conformes. Ces tests ne prouvent pas encore la connexion réelle de Deadelus/Yekelle ni la sécurité du futur backend d'écriture.

Documents spécialisés de référence : docs/crew-twitch-auth.md ; docs/phasmo-news-editor.md ; docs/phasmo-journal-supabase-architecture-v7.md. Banque d'idées : https://docs.google.com/document/d/1JQC2rytjpIE-U96w3H5S_f4VdQ1ys5tshDdehTBBNjc/edit.


## Étape 2 — Registre configurable et attribution préparatoire (3 novembre 2026)

**Nouveaux fichiers et changements réellement committés sur V2 :**
- docs/site-access-registry-v2.sql : **script de création non appliqué**, six tables dédiées uniquement à l'administration (catégories, sous-catégories, permissions, personnes Twitch, attributions préparatoires, journal d'audit). Catalogue semé avec exactement quatre permissions validées : livre/news/crew helper/admin, toutes non raccordées.
- RPC site_access_admin_action : fonctions bootstrap, addCategory, addSection, addPermission, setGrant. **SECURITY INVOKER** avec droit EXECUTE accordé seulement à service_role, transaction unique pour mutation + audit. Aucun droit du TCG, News, Journal ou Crew n'est changé par cette RPC.
- supabase/functions/site-access-admin/core.js : autorisation serveur d'un des deux Twitch IDs propriétaires via le JWT Auth portail, projet Supabase fixe, validation des entrées, délégation à la RPC avec la clé serveur (jamais exposée au navigateur). Préparation avec SITE_ACCESS_WRITES_ENABLED = true obligatoire pour autoriser les écritures ; valeur absente ou différente = **lecture seule**. Origines et deux IDs obligatoires ; refus en cas de mauvaise base ou de configuration incomplète.
- public/admin/access-center.js / .html : libellé « Attributions préparatoires » et avertissement explicite « aucune permission effective ». Désactivation des cases/formulaires lorsque mutations_enabled n'est pas vrai ; démo locale en mémoire inchangée dans son principe.
- scripts/test_site_access_admin.cjs : tests simulés actualisés (JWT, propriété, origine, clé absente, actions autorisées, valeurs malformées, écriture désactivée, défaut de base, réponse SQL indisponible).

**Points de sécurité déjà vérifiés :** syntaxe du JavaScript et du test, simulations de propriétaire / non-propriétaire / origine / tentative d'écriture, persistance désactivée par défaut, création d'identifiant technique stable et interdiction des codes réservés du portail. Lecture seule de la liste des tables existantes sur le projet Supabase eodtxlhnfzyapkyvvxdi : aucune table site_access_* n'existait lors du contrôle.

**Non vérifié / non réalisé :** le SQL n'a PAS été exécuté ni validé dans un PostgreSQL de recette ; aucune politique, séquence ou RPC créée en base. La fonction Edge n'est pas déployée, aucune clé ou variable serveur configurée, aucune session utilisateur réelle testée et aucun droit administré. La réponse serveurs aurait people=[] tant que la synchronisation Twitch n'est pas développée. La vue peut donc paraître vide même après déploiement en lecture seule ; il ne s'agit pas d'une liste réelle de modérateurs.

**Risques à traiter AVANT déploiement :** tests d'accès explicites pour anon/authenticated/service_role sur le script SQL (RLS plus révocation des GRANT), audit de la RPC et de la fonction, tests de concurrence et de doublons ; confirmer les deux Twitch IDs de Deadelus/Yekelle à partir des connexions réelles. Vérifier la compatibilité des appels RPC avec la configuration Data API de Supabase, notamment les grants explicites après le changement de 2026. Ne pas appliquer ce script au projet portail utilisé en production sans une phase de validation adaptée.

**Étape suivante proposée :** validation du schéma sur une base de test isolée, puis lecture sécurisée et pagination de la vraie liste Twitch des modérateurs par le serveur, sans stocker de jeton Twitch dans le navigateur. Ensuite seulement, raccorder les permissions existantes News/Livre et les rôles Crew, garder la distinction de leurs projets Supabase. L'historique du site ne doit pas être modifié par une attribution préparatoire.

Référence sécurité Supabase : https://supabase.com/docs/guides/api/securing-your-api.
