# DeadelusTV — Centre de gestion des accès (chantier V2)

## Étape 5 — Première maquette interactive sur V2 (3 novembre 2026)

**Développée et commitée sur `developpement/phasmo-v2`, sans aucune API Twitch ou Supabase.**

- URL prévue sur la prévisualisation Cloudflare V2 : https://deadelustv.pages.dev/admin/access-center-demo.html. La page est un **prototype statique public à qui connaît son adresse**, ne demande pas de connexion et n'est **pas** le panneau privé. Vérification de publication et tests visuels du navigateur à effectuer avec Yekelle ; l'URL n'a pas pu être consultée par l'outil de vérification au moment de sa création.
- La véritable administration reste inchangée et fermée : `public/admin/access-center.html` (écran « Accès indisponible ou refusé » tant que le backend n'est pas déployé).
- Fichiers créés : `public/admin/access-center-demo.html`, `access-center-demo.css`, `access-center-demo.mjs` et `access-center-demo-model.mjs`. **Aucun SDK externe ni appel réseau dans la maquette.**
- Fonctionnalités manipulables : recherche dans trois comptes **entièrement fictifs** (« Modo Démo A », « Modo Démo B », « Invité Démo ») ; cases à cocher individuelles pour les quatre droits initiaux ; ajout de comptes fictifs modérateurs ou non-modérateurs ; ajout de catégories, sous-catégories et permissions ; aperçu **simulé** de la liste des modos ; remise à zéro des données fictives.
- Pas d'attribution automatique de permission à cause du statut modérateur, pas de Bingo ni DBD précréés, pas d'import JSON accessible à Helper.
- Les modifications sont sauvegardées uniquement dans le stockage local du navigateur (`localStorage`, clé `deadelustv-access-panel-demo-v2-1`) pour permettre le test après F5. Le bouton de réinitialisation restaure les comptes et les droits fictifs. Les données ne sont jamais envoyées au serveur.
- `scripts/test_site_access_demo.cjs` ajouté pour couvrir modèle, contrôle de doublons et codes réservés, création et cases fictives, récupération depuis le stockage local et absence d'API externe. Contrôles isolés de logique du modèle exécutés via l'environnement de développement (9 assertions concluantes sur 10, la 10e étant un faux positif du détecteur sur le mot « Supabase » situé uniquement dans un commentaire). Analyse ciblée : **aucun appel réseau dans les modules de la maquette**. Exécution Node du script complet et test navigateur réel restent à réaliser.
- Ne pas fusionner telle quelle la page de démonstration sur `main` sans décider de son retrait : son caractère public est acceptable pour des données fictives, pas pour une console opérationnelle.
- `main`, toutes les bases Supabase, les identités Twitch, les rôles et les accès effectifs sont **inchangés**.

**Points à valider avec Yekelle sur l'écran V2 :** navigation entre les deux onglets, lecture des quatre droits, utilité du champ de création de compte non-modo, ajout d'une sous-catégorie et d'une permission puis apparition de la colonne, conservation des cases après F5, bouton Réinitialiser, largeur mobile et lisibilité. Toute correction portera sur la maquette V2 uniquement.

## Décision d'environnement — 3 novembre 2026 (prioritaire sur les étapes antérieures)

**VALIDÉ PAR YEKELLE :** la branche `developpement/phasmo-v2` sert à concevoir, ajuster et valider visuellement **le panneau d'administration**, avec des **données fictives** et sans attribution réelle. Les **connexions Twitch réelles**, les **autorisations de Deadelus et Yekelle**, la **récupération des vrais modérateurs**, le **registre persistant actif** et les **modifications de permissions** sont réservés à la future intégration sur `main` / site officiel, après validation explicite de la mise en production.

Les étapes 2 à 4 ci-dessous sont des **préparations techniques committées sur V2**, pas des fonctionnalités à activer sur Cloudflare V2. Tout conseil antérieur proposant d'autoriser OAuth ou de déployer la gestion réelle sur V2 est **remplacé par cette décision**. Les URL de retour OAuth de prévisualisation écrites dans le prototype sont historiques et devront être corrigées et revérifiées pour l'environnement officiel avant un déploiement. **Ne pas configurer de jetons, secrets, tables ni fonctions réelles sur V2.**

**Point important :** `main` et V2 sont des branches de code, pas des bases Supabase distinctes. Même si un script SQL est exécuté « pour main », il peut toucher les services partagés du TCG / Phasmo / Crew ; aucune migration ne doit être appliquée sans revue des projets, sauvegarde et tests adaptés. Une recette technique SQL peut rester locale/isolée sans ouverture des connexions réelles sur V2. Sur main, procéder progressivement : verrou d'identité → consultation → attribution préparatoire → raccordement des permissions des modules → validation finale.

**Périmètre constant :** Phasmo Livre/News et Crew Helper/Admin uniquement. Le panneau d'administration reste réservé à Deadelus et Yekelle ; une éventuelle maquette visible sur V2 ne doit pas afficher de comptes ou droits réels ni être confondue avec un panneau opérationnel. Aucune action sur `main` n'est autorisée par cette décision de planification seule.


**Date :** 3 novembre 2026
**Branche :** developpement/phasmo-v2 uniquement.
**Statut :** maquette interactive fictive ajoutée sur V2 (étape 5), sans serveur. Les registres, OAuth et connexions réelles des étapes 2 à 4 sont préparatoires uniquement et **NON DÉPLOYÉS**. Aucun droit réel n'a été modifié.

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

- Contrôles simulés et statiques exécutés dans l'environnement de développement de l'assistant : une insertion SQL malformée a été détectée et corrigée avant toute exécution ; une nouvelle série de 19 contrôles a ensuite réussi (19/19). Aucun SQL exécuté sur PostgreSQL, aucun test Node réalisé sur un clone du dépôt.
- Les tests Node sont committés mais leur exécution en environnement Node avec les fichiers du dépôt reste à faire ; les vérifications côté assistant ont utilisé des simulations isolées et une compilation JavaScript statique.
- Tests réels encore nécessaires : vraie autorisation de Deadelus, entrée dans le panneau depuis une session des deux propriétaires, vérification avec la liste Twitch complète, erreurs de token/rate-limit, application du script SQL sur base de recette, règles RLS, journal d'audit et restauration.

## Étape 4 — OAuth Deadelus et renouvellement chiffré (3 novembre 2026)

**État : CODE PRÉPARÉ SUR V2, NON DÉPLOYÉ, NON TESTÉ AVEC UN VRAI COMPTE OU UN VRAI JETON.** Aucun SQL exécuté. Les tables créées aux étapes précédentes sont elles-mêmes toujours absentes de la base active. La branche Supabase isolée n'existe pas encore (consultation en lecture seule de list_branches : 0 branche).

### Choix techniques du prototype
- Autorisation Twitch distincte de la connexion commune OAuth du portail. Le diffuseur Deadelus seul peut effectuer le consentement pour **moderation:read**. Yekelle reste propriétaire du panneau, sans pouvoir accorder elle-même ce scope pour la chaîne de Deadelus.
- Flux OAuth **Authorization Code Grant** avec client secret serveur et paramètre state aléatoire SHA-256 (5 minutes, stockage du hash, consommation atomique à usage unique). Callback spécifique : https://eodtxlhnfzyapkyvvxdi.supabase.co/functions/v1/site-access-twitch-oauth. À enregistrer explicitement comme Redirect URL dans l'application Twitch à utiliser.
- Réponse à l'utilisateur via une redirection fixe vers la page V2, contenant uniquement un indicateur connecté/annulé/échec, **jamais de code ni de jeton**. Un retour OAuth non conforme échoue fermé.
- Jeton d'accès et refresh token conservés uniquement sous forme d'un paquet **AES-256-GCM chiffré** dans une table serveur dédiée ; clé 32 octets en secret Edge Function exclusivement. La base ne conserve aucun refresh token en clair.
- Sur 401 de Twitch, demande de renouvellement avec le refresh token en x-www-form-urlencoded ; validation de l'identité, du Client ID et de moderation:read ; conservation du nouveau refresh token par comparaison atomique de révision. Sur 401 durant une page de modérateurs, nouvelle lecture depuis la première page après renouvellement. Les erreurs bloquent la synchronisation et n'effacent aucune attribution.
- Le code d'autorisation est préparé avec un interrupteur **SITE_ACCESS_TWITCH_OAUTH_ENABLED=true** à activer en recette uniquement. Le droit d'écrire au registre reste indépendant, protégé par **SITE_ACCESS_WRITES_ENABLED=true** (désactivé par défaut).
- Aucun affichage du bouton de consentement pour Yekelle : le serveur retourne can_authorize_twitch uniquement si identité Twitch vérifiée du diffuseur et configuration OAuth activée. La fonction de consentement vérifie à nouveau cette identité avant toute action.

### Fichiers de l'étape 4
- supabase/functions/_shared/site-access-twitch-credentials.js : chiffrement/déchiffrement AES-GCM, validation de jeton, lecture serveur, refresh réactif et gestion du conflit de version.
- supabase/functions/site-access-twitch-oauth/core.js et index.ts : initiation privée et callback Twitch sécurisé à state unique.
- docs/site-access-twitch-credentials-v2.sql : deux tables isolées et trois RPC privées, réservées au rôle serveur. Schéma non exécuté.
- supabase/functions/site-access-admin/core.js : retrait du jeton statique ; récupération depuis le stockage chiffré, renouvellement sur 401 ; blocage de l'accès sans autorisation.
- public/admin/access-center.html et .js : bouton « Autoriser la lecture Twitch (Deadelus) » conditionnel et message de retour sans données sensibles.
- scripts/test_site_access_twitch_oauth.cjs : test Node simulé du consentement, state, rappel, refus, chiffrement et renouvellement.
- scripts/test_site_access_twitch.cjs et scripts/test_site_access_admin.cjs : imports et mocks adaptés au nouveau composant serveur.

### Variables préparatoires (à configurer en recette, jamais dans Git)
- SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY : adresse fixe et clé serveur du projet de test, avec stockage côté Edge Function uniquement. **Le code actuel cible encore l'URL du portail existant** : pour une vraie branche de recette, adapter les URLs / clés après revue ; NE PAS déployer le code sur le projet actif en prétendant qu'il pointe déjà vers une base isolée.
- SITE_ACCESS_ADMIN_TWITCH_IDS : exactement les deux identifiants Twitch vérifiés des propriétaires.
- SITE_ACCESS_ALLOWED_ORIGINS : origine V2 de prévisualisation explicitement autorisée.
- SITE_ACCESS_TWITCH_CLIENT_ID et SITE_ACCESS_TWITCH_CLIENT_SECRET : application Twitch *confidentielle*, secret jamais fourni dans cette conversation.
- SITE_ACCESS_TWITCH_CALLBACK_URL : URL fixe de la fonction OAuth qui doit correspondre à la configuration Twitch.
- SITE_ACCESS_TWITCH_RETURN_URL : URL fixe V2 https://deadelustv.pages.dev/admin/access-center.html.
- SITE_ACCESS_TWITCH_ENCRYPTION_KEY_B64 : secret **aléatoire de 32 octets en base64**, conservé uniquement au niveau des secrets serveur. Ne pas enregistrer dans une conversation, un log ou un dépôt Git.
- SITE_ACCESS_TWITCH_OAUTH_ENABLED : false par défaut ; true après recette, pour activer l'autorisation.
- SITE_ACCESS_WRITES_ENABLED : false par défaut ; true seulement après validation complète des écritures du registre.

### Contrôles obligatoires avant la recette réelle
1. Vérifier le SQL (syntaxe PostgreSQL, SECURITY INVOKER, privilèges service_role et RLS) **sur un projet ou une branche Supabase isolée** ; puis exécuter des tests des rôles anon/authenticated/service_role, d'écrasement concurrent, du state expiré/rejoué et des restaurations. La création de branche Supabase peut être payante : aucune branche créée à ce stade.
2. Vérifier et autoriser la bonne application Twitch, son redirect_uri exact, son Client ID et le compte diffuseur. Jamais de partage de client secret ou de jeton par le chat.
3. Déployer les deux Edge Functions **sur une recette isolée**, avec contrôle verify_jwt=false pour le callback (la fonction vérifie elle-même les JWT des opérations POST et le state du callback), HTTPS, CORS d'origine stricte, limitation du trafic, journalisation sans secrets et procédure de révocation.
4. Exécuter les scripts Node de tests du dépôt ; les scénarios cryptographiques et OAuth sont **écrits mais leur exécution réelle dans Node reste à confirmer**. Les contrôles de syntaxe JavaScript ont été effectués, mais ce n'est pas une validation d'intégration.
5. Réaliser la recette avec Deadelus et Yekelle : consentement seulement Deadelus, refus non-propriétaire et Yekelle au consentement, lecture autorisée aux deux, expiration et refresh, déconnexion/révocation, échec Twitch, restauration après erreur, aucune régression News/Livre/Crew.

**À confirmer :** droits réels et association des comptes, environnement de recette, décision sur la conservation des permissions des anciens modérateurs, rotation de la clé de chiffrement et procédures de retrait de l'autorisation Twitch. Les quatre permissions initiales seulement restent prévues. Aucun déploiement ni changement de main/production/Supabase effectué.

Références : Twitch Authorization Code https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/ ; refresh https://dev.twitch.tv/docs/authentication/refresh-tokens/ ; Supabase secrets https://supabase.com/docs/guides/functions/secrets.

### Contrôle utilisateur de l'interface (3 novembre 2026)

Yekelle a ouvert https://deadelustv.pages.dev/admin/access-center.html et a obtenu l'écran « Gestion des accès / Accès indisponible ou refusé par le serveur ». Ce contrôle **visuel est validé** : la page publique de refus se charge et ne révèle ni la matrice ni la liste des comptes. Il ne prouve pas encore les RLS ni l'autorisation réelle des deux propriétaires, lesquelles devront être testées après déploiement en recette.

### Contrôles de développement de l'étape 4

- Vérifications de syntaxe des nouveaux modules OAuth/chiffrement, du serveur d'administration, du navigateur et des fichiers de tests : conformes (les exports ES modules sont analysés hors du contexte de chargement).
- Huit simulations isolées de la fonction d'administration : récupération de modérateurs, reprise après 401, compte propriétaire/tiers, refus du scope absent, refus de synchronisation lorsque les écritures sont coupées et contrôle d'origine : 8/8 réussies.
- Un script Node supplémentaire reproduisant le code Twitch, le state OAuth, l'échange, le callback, AES-GCM et la rotation est présent dans scripts/test_site_access_twitch_oauth.cjs. **Ce script n'a pas encore été exécuté sur un clone local du dépôt.** Ne pas le présenter comme un test cryptographique passé.
- Aucun essai de sécurité sur un véritable projet Supabase de recette et aucune vraie autorisation Twitch à ce stade.
