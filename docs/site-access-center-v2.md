# DeadelusTV — Centre de gestion des accès (chantier V2)

**Date :** 3 novembre 2026
**Branche :** developpement/phasmo-v2 uniquement.
**Statut :** étapes 1 à 3 préparées sur V2 : interface évolutive, registre SQL protégé et synchronisation manuelle de la liste Twitch avec vérification serveur. **NON DÉPLOYÉ** : aucune liste réelle lue, aucune table ni droit modifiés.

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
- Le code serveur sait préparer une lecture paginée de la liste Twitch, mais aucune autorisation du diffuseur n'a encore été configurée ; sans déploiement, il ne lit aucun vrai modérateur et n'écrit dans aucune base.
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

## Étape 3 — Liste des modérateurs Twitch (3 novembre 2026)

**État : codé sur la branche V2, non déployé, aucun jeton réel configuré, tests simulés uniquement.**

### Parcours prévu

1. Deadelus ou Yekelle s'authentifie avec le compte Twitch commun du portail. La fonction site-access-admin vérifie à chaque requête l'identité du fournisseur OAuth renvoyée par Supabase Auth et la compare aux **deux IDs Twitch propriétaires** stockés dans SITE_ACCESS_ADMIN_TWITCH_IDS (liste serveur).
2. Bouton **Vérifier la liste Twitch** : le serveur utilise un jeton d'accès utilisateur autorisé par **Deadelus, diffuseur de la chaîne**, pour interroger Get Moderators. L'aperçu affiche les vrais comptes sans aucune écriture, même quand SITE_ACCESS_WRITES_ENABLED est désactivé.
3. Bouton **Enregistrer la synchronisation**, après confirmation : seulement si SITE_ACCESS_WRITES_ENABLED=true et après nouvelle lecture Twitch vérifiée, la RPC site_access_admin_action('syncModerators') ajoute/actualise les comptes, marque les anciens modérateurs comme inactifs et journalise l'opération. **Elle ne touche à aucune attribution** et n'accorde aucun droit d'édition.
4. Les comptes Twitch identifiés par un ID stable restent dans le registre même s'ils quittent la modération ; leurs attributions préparatoires restent enregistrées. La règle de révocation effective des droits est encore à décider.

### Autorisation Twitch exigée (non disponible actuellement)

- SITE_ACCESS_TWITCH_CLIENT_ID : identifiant de l'application Twitch utilisée pour autoriser le diffuseur, à configurer côté serveur.
- SITE_ACCESS_TWITCH_BROADCASTER_TOKEN : jeton d'accès utilisateur du compte Deadelus avec **moderation:read**, à provisionner **côté serveur seulement**, après son autorisation explicite.
- L'ID diffuseur attendu dans le code est 99977368, issu de l'intégration Crew existante ; à revérifier dans la phase OAuth réelle.
- Le serveur appelle https://id.twitch.tv/oauth2/validate avant la liste, contrôle user_id, client_id, scope et expiration. Toute incohérence bloque la lecture/synchronisation ; jamais de jeton ou résultat OAuth dans les logs ou dans le navigateur.
- L'API Get Moderators utilise GET https://api.twitch.tv/helix/moderation/moderators avec broadcaster_id, first=100 et after ; maximum 20 pages (2000 comptes). Pagination tronquée, doublon, mauvais curseur, erreur Twitch ou liste vide lors d'une synchronisation : refus sans modification de la base.
- **Limite du prototype :** renouvellement OAuth automatique et stockage sûr du jeton de rafraîchissement non réalisés. Le jeton actuel, s'il est ultérieurement configuré, expirera ; il faudra concevoir la rotation sécurisée avant l'usage durable. La connexion courante des modérateurs ne fournit pas le scope de lecture de la liste de la chaîne.
- Une autorisation 'channel:manage:moderators' serait plus puissante et inutile : ne pas la demander pour ce seul affichage.

Références primaires : https://dev.twitch.tv/docs/api/reference/#get-moderators ; https://dev.twitch.tv/docs/authentication/validate-tokens/ ; https://dev.twitch.tv/docs/authentication/refresh-tokens/.

### Modifications V2

- supabase/functions/site-access-admin/core.js : actions previewModerators (lecture seule) et syncModerators (mutation explicitement activée) ; validation indépendante du jeton Twitch et de la session propriétaire du portail.
- docs/site-access-registry-v2.sql : action de synchronisation transactionnelle, verrou contre deux synchronisations concurrentes, conservation de toutes les attributions.
- public/admin/access-center.html / .css / .js : boutons de prévisualisation/synchronisation, affichage de la liste, blocage de la synchro en absence d'autorisation et confirmation requise.
- scripts/test_site_access_twitch.cjs : tests Node simulés (deux pages, portée du token, mauvais diffuseur/Client ID, expiration, erreur Twitch, doublon, liste vide, refus non-propriétaire, absence d'écriture à l'aperçu et origine serveur de la liste).
- **main, Supabase et Cloudflare inchangés**. La page n'a toujours pas d'entrée dans le menu et ne peut pas servir de console administrative réelle avant déploiement et recette.

### Vérifications et points ouverts

- Contrôles simulés exécutés dans l'environnement de développement de l'assistant : 14 cas positifs sur 15 contrôles initialement, un contrôle structurel a détecté une insertion SQL corrompue ; script reconstruit proprement depuis son commit antérieur, puis validation statique du bloc SQL et des protections. Aucun SQL exécuté sur PostgreSQL.
- Les tests Node sont committés mais leur exécution en environnement Node avec les fichiers du dépôt reste à faire ; les vérifications côté assistant ont utilisé des simulations isolées et une compilation JavaScript statique.
- Tests réels encore nécessaires : vraie autorisation de Deadelus, entrée dans le panneau depuis une session des deux propriétaires, vérification avec la liste Twitch complète, erreurs de token/rate-limit, application du script SQL sur base de recette, règles RLS, journal d'audit et restauration.
