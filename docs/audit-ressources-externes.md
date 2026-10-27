# DEADELUSTV — Audit des ressources externes du portail

## État actuel après synchronisation du 27 octobre 2026

- Main intégré : `0edd2e07f66ff8f02f70fda503c171b5768cb179`. Point de retour : `17e8d167f5b27c8be316674d64a4fa4aced760df`, conservé comme premier parent du commit de fusion.
- Le consentement global Twitch/YouTube, le mini-lecteur, le néon Graduate et le contrôle du statut live sont déjà publiés. Le raccordement des News et leurs corrections actuelles sont repris depuis main ; le livre Phasmo en développement reste dans sa branche propre.
- Les deux maquettes Mentions légales / Confidentialité et leurs liens visibles en développement sont conservés. Les pages CGU, CGV et Cookies préparées sur main sont également disponibles par leurs routes ; leurs liens du footer restent masqués. Aucun texte juridique définitif ajouté ou présenté comme validé.
- `scripts/verify-static.py` et l'appel strict dans le déploiement restent bloquants tant que `data-legal-pending="true"` existe. Seuls les contrôles de branche autorisent explicitement les textes en attente avec `--allow-legal-pending`.
- Les outils de prévisualisation OVH, le service de statut, les tests et les documents de travail sont conservés. Les descriptions plus anciennes ci-dessous sont des étapes historiques, pas l'état actuel de publication.
- Aucune modification de main, du serveur OVH ou d'une base. Les futurs textes de Deadelus, leur intégration et leur validation restent à terminer.


**Date :** 26 octobre 2026. **Périmètre :** lecture statique des fichiers de la branche `developpement/legal-et-consentement` du dépôt `DeadelusTV/deadelusTV` ; pas d'examen du trafic navigateur réel, du serveur OVH, du tableau de bord Supabase ni de la configuration externe Caddy. **Statut :** constats de code, pas de validation juridique ou de test réseau.

## Inventaire par service

| Service / origine | Utilisation observée | Quand le navigateur l'appelle-t-il ? | Cookies et données : conclusion possible |
| --- | --- | --- | --- |
| **Twitch** (`player.twitch.tv`, domaines associés) | SDK et lecteur du direct dans `public/assets/twitch-player.js` | **Dans cette branche uniquement :** après résultat `live: true` de `/api/twitch-status` et consentement Twitch accepté. Le résultat « hors ligne », inconnu ou refus bloque le chargement du lecteur. | Des cookies Twitch ont déjà été observés sur la version antérieure. Le nouveau blocage est implémenté mais pas validé par un test réseau en direct ; le service OVH reste à raccorder. |
| **Polices Bungee Inline / Great Vibes** | Texte néon hors ligne dans `public/assets/twitch-neon.css`. | **Depuis la préparation du 26/10 :** feuilles `assets/local-fonts.css` et WOFF2 locaux servis par le site. **Avant cette modification :** téléchargement via `fonts.googleapis.com` et `fonts.gstatic.com` dès l'ouverture. | Sur cette branche, aucun appel Google Fonts n'est attendu ; à vérifier visuellement et dans Réseau/Fonts après rechargement. Les anciennes observations de requêtes Google Fonts restent conservées dans la recette historique plus bas. Licences OFL jointes aux polices. |
| **YouTube / Google images** (`i.ytimg.com`) | Miniature de la dernière vidéo sur l'accueil (`public/index.html` / `public/assets/app.js`) ; jusqu'à 12 miniatures des Shorts Phasmo (`public/modules/phasmophobia/module.js`) | Le JSON des vidéos vient du site lui-même (`data/latest-youtube.json`, `data/phasmo-shorts.json`) ; **les images sont ensuite demandées directement à `i.ytimg.com`**, avec chargement lazy si applicable. | Pas d'iframe ni de lecteur YouTube intégré identifiés ; requêtes externes d'images et données techniques possibles. Aucun cookie concret déduit du code. Examiner dans Chrome avant de décider si modification nécessaire, et vérifier les conditions de réutilisation des miniatures avant tout miroir/cache local. |
| **Supabase / Crew'mong Us** (`*.supabase.co`) | SDK Supabase JS fourni **localement** (`public/modules/crewmongus/vendor/supabase.js`) puis connexion directe à Supabase Auth et aux tables de statistiques | Le module est chargé à la première ouverture de Crew'mong Us (`public/modules/crewmongus/module.js`) ; les requêtes à la base et la restauration de session démarrent ensuite. | **Traitement réel de données et authentification** à inclure dans la politique de confidentialité ; les sessions Auth Supabase JS peuvent utiliser `localStorage` par défaut. Ce stockage lié à l'authentification ne signifie pas automatiquement « cookie publicitaire » ou consentement obligatoire. Ne pas bloquer les fonctions Crew avec le refus Twitch. |
| **Avatars Crew'mong Us** (hôtes variables) | URLs enregistrées dans `avatar_url` et affichées comme images dans `public/modules/crewmongus/crew-app.js` | Consultation de la liste ou de la fiche joueur, selon les avatars renseignés. Les URLs `http:` et `https:` sont autorisées ; l'hôte n'est pas limité à Twitch. | Risque de connexions vers des domaines tiers variables, non déductibles de l'inventaire statique : vérifier les URLs effectivement présentes dans les données et les requêtes réseau. Piste : domaines autorisés, images hébergées sur infrastructure maîtrisée ou proxy, sans modifier le module sans validation. |
| **Pavillon Noir** | Scripts, données, illustrations et images du dossier `public/modules/pavillon-noir/` servis localement ; des liens vers des VOD Twitch et YouTube dans `data/sessions.js` | Les scripts et images sont chargés sur le portail ; les pages Twitch/YouTube des VOD ne sont ouvertes qu'au clic sur un lien dans les éléments examinés. | Aucun lecteur tiers intégré ni appel externe autonome relevé dans les fichiers du module inspectés. La navigation vers les plateformes reste externe. |
| **TikTok / Discord / réseaux sociaux** | Liens simples dans l'accueil, les panneaux et le footer | Navigation explicite vers un autre site lorsque le visiteur clique. | Aucun script, widget ou bouton social tiers chargé depuis ces domaines repéré dans le code examiné. |
| **OVH** | Fournisseur du site statique et futur endpoint de statut Twitch | À chaque visite | Journaux techniques serveur et éventuels cookies définis par l'infrastructure à vérifier auprès de l'administrateur ; non auditables avec les seuls fichiers GitHub. |

## Synthèse

**Connexions externes dès l'ouverture sur la branche actualisée :** la miniature YouTube de l'accueil peut être demandée selon la visibilité et le chargement différé du navigateur. Les polices sont désormais prévues en fichiers locaux ; l'absence de requête Google Fonts sera confirmée par un nouveau test navigateur. **Au clic ou dans une rubrique dédiée :** Supabase et avatars en accédant à Crew, miniatures Phasmo, liens vidéo ou sociaux. Le lecteur Twitch est conditionné à l'accord dans cette branche, pas encore sur la production.

Aucun code Google Analytics, GTM, Meta Pixel, widget Discord, lecteur YouTube iframe ou SDK TikTok n'a été identifié dans les principaux HTML/CSS/JS examinés. **Ce n'est pas une preuve d'absence globale de traceurs**, notamment côté hébergement, bibliothèques, services tiers et configurations non présentes dans le dépôt.

Ne pas confondre : (a) cookie/traceur facultatif nécessitant potentiellement un accord, (b) stockage fonctionnel lié à une session ou au choix cookies et (c) simple appel HTTP vers un domaine tiers. Les règles et bases légales restent à vérifier pour chaque traitement. Les recommandations CNIL indiquent notamment que les traceurs nécessaires à l'authentification ou à la mémorisation du consentement peuvent être exemptés de consentement. Référence : https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite ; documentation Supabase : https://supabase.com/docs/reference/javascript/auth

## Vérifications à effectuer dans Chrome (session privée vraiment vierge)

1. **Avant tout clic :** fermer toutes les fenêtres privées, rouvrir une fenêtre privée neuve, F12 → Réseau et Application, cocher « Conserver le journal » et désactiver le cache pour le test. Charger `www.deadelustv.com` sur la version de la branche.
2. **Accueil, consentement refusé :** relever les hôtes sollicités (Google Fonts, YouTube miniature, OVH) ; s'assurer qu'aucune ressource `player.twitch.tv`, `twitchcdn.net`, `k.twitchcdn.net` n'est téléchargée ; inspecter cookies, localStorage et sessionStorage. Un filtre « twitch » seul ne couvre pas toutes les URL de services tiers.
3. **Phasmophobia :** vérifier les requêtes `i.ytimg.com` quand les Shorts deviennent visibles ; constater l'absence de lecteur intégré.
4. **Crew'mong Us :** vérifier les appels `*.supabase.co`, les clés de stockage de session si connexion, et surtout les **hôtes réels des avatars affichés**. Distinguer consultation anonyme, session existante et connexion.
5. **Pavillon Noir / TCG :** confirmer l'absence d'autres appels tiers inattendus ; noter les liens qui ouvrent un autre domaine seulement après clic.
6. **Twitch en direct :** consentement accepté, puis révocation pendant la lecture ; vérifier destruction de l'iframe et absence de nouvelles requêtes du lecteur après retrait. L'endpoint OVH doit d'abord être raccordé pour reproduire cette partie en conditions réelles.
7. **Comparer avec `main`** sans confondre comportement en production et branche en cours. Noter les fournisseurs, usages, cookies effectifs, durée et destination des données.

## Recette manuelle Chrome du 26 octobre 2026 — navigation anonyme avec refus

**Rapport utilisateur, environnement :** Chrome en navigation privée, extensions de blocage désactivées pour les essais, site local Live Server `http://127.0.0.1:5500`, branche `developpement/legal-et-consentement`. Ces résultats portent sur **ce scénario**, pas sur le site OVH en production. Le service `/api/twitch-status` retourne 404 en local tant qu'il n'est pas raccordé.

- **Accueil :** bandeau « Lecture du live Twitch » visible à la première visite, boutons « Refuser » et « Accepter » présentés ; après « Refuser », aucune requête vers le lecteur externe Twitch observée dans le filtre Réseau. Seuls les fichiers Twitch *locaux* et le contrôle de statut 404 y apparaissaient. Un retour/rechargement de l'accueil n'a pas rouvert spontanément le bandeau.
- **Google Fonts :** requête HTTP 200 vers `fonts.googleapis.com`, depuis `public/index.html`.
- **Miniatures :** requête HTTP 200 vers `i.ytimg.com` sur l'accueil et plusieurs miniatures `maxresdefault.jpg` ajoutées en visitant les Shorts Phasmophobia.
- **Crew'mong Us :** requêtes Supabase publiques `players`, `sessions`, `games`, `session_participants`, `records` renvoyant 200 ; pas de nouvelles requêtes Supabase constatées pendant la navigation interne. Au rechargement de la page Joueurs, plusieurs images de profil ont été téléchargées depuis le domaine `static-cdn.jtvnw.net` de Twitch. L'utilisation des images Twitch est **intentionnelle**. Les URLs précises doivent rester actualisées si Twitch change leurs chemins.
- **Stockages :** aucune entrée cookie visible pour `127.0.0.1` pendant les essais ; `localStorage` contient uniquement `deadelustv_twitch_consent_v1` avec un choix de refus et sa date ; `sessionStorage` contient `IsThisFirstTime_Log_From_LiveServer` (environnement local).
- **Pavillon Noir, TCG et pages légales :** après navigation dans ces rubriques, aucun cookie ou stockage supplémentaire observé par l'utilisatrice dans les panneaux consultés. Aucun changement de la liste des stockages en revenant à l'accueil.
- **Gestion des cookies :** le bouton du footer rouvre correctement le panneau avec « Accepter » et « Refuser » après mémorisation du choix ; le choix ne se redemande pas spontanément au simple rechargement.

**Portée exacte :** recette manuelle partielle **validée pour la navigation anonyme avec refus** ; les captures et observations ne prouvent pas l'absence universelle de cookies tiers ni de connexions réseau sur toutes les vues.

**Encore en attente :** simulation/recette d'un vrai live après raccordement du serveur OVH, consentement accepté avec lecteur puis révocation, connexion réelle Crew'mong Us et tests de conformité/mentions définitives. **Aucun changement du site public ni du code fonctionnel dans cette mise à jour documentaire.**

## Recette complémentaire Microsoft Edge — cookies tiers autorisés

**Rapport utilisateur du 26 octobre 2026 :** nouveau profil Edge distinct, navigation normale (pas InPrivate / Invité), capture des paramètres confirmant « Autoriser les sites à enregistrer et à lire les données des cookies » **activé** et « Bloquer les cookies tiers » **désactivé**. Le site local `http://127.0.0.1:5500` a été parcouru anonymement avec **Refuser** pour Twitch : accueil, Phasmophobia, Crewmong Us, Pavillon Noir, TCG et pages légales.

**Résultat observé :** utilisateur signale **zéro cookie** après parcours de toutes les rubriques et **aucune nouvelle entrée** en `localStorage` et `sessionStorage` par rapport au contrôle Chrome précédent (choix `deadelustv_twitch_consent_v1` et marqueur de Live Server). Les connexions tierces aux polices, miniatures et images ont été constatées séparément dans le réseau Chrome.

**Portée :** ce résultat renforce les essais précédents, car Edge n'avait pas le blocage explicite des cookies tiers. D'autres mécanismes de prévention du suivi peuvent s'appliquer ; aucune garantie globale d'absence de cookies pour tous les navigateurs, toutes les versions ou toutes les situations. Le lecteur Twitch *avec consentement et véritable live*, la révocation pendant le live et les sessions Crew authentifiées restent **non testés en conditions réelles**. Pas de changement de code ni de serveur effectué.

**Test complémentaire du choix utilisateur (Edge local, 26/10/2026) :** aller-retour de consentement « Refuser → Accepter → Refuser », répété via le bouton « Gestion des cookies » du footer. L'utilisatrice a vérifié dans le stockage local que la propriété `choice` passe effectivement à `accept` puis à `refuse` à chaque clic. **VALIDÉ : fonctionnement et mémorisation du choix.** Ne vaut pas validation de la suppression de l'iframe pendant un direct, car `/api/twitch-status` est encore indisponible en local.

## Évolution du 26 octobre 2026 — polices locales (non publiées)

La branche `developpement/legal-et-consentement` remplace la feuille Google Fonts du HTML par `assets/local-fonts.css`. Deux fichiers WOFF2 latins légers (~21 et ~43 Ko) sont ajoutés sous `public/assets/fonts/`, accompagnés de leurs licences SIL OFL. Les familles CSS `Bungee Inline` et `Great Vibes` ainsi que les coordonnées du texte néon restent inchangées. Contrôle automatisé ajouté au workflow de développement. **Rendu réel, glyphes et absence de requêtes Google à vérifier dans Chrome/Edge après Pull.**

La police **Academy** reçue dans une archive fournie par l'utilisatrice, destinée potentiellement au titre `HORS LIGNE`, est **exclue de ce déploiement** : les fichiers fournis ne contiennent aucune licence d'exploitation commerciale/web ; l'auteur la diffuse en accès gratuit uniquement personnel. L'usage professionnel et l'intégration de la police dans une page publique demandent la vérification/obtention de la licence adéquate auprès du titulaire. Voir [localisation des polices](font-localisation.md).

## Suites suggérées (non décidées, non développées)

- **Développé sur la branche, non validé visuellement :** Bungee Inline et Great Vibes hébergées localement en WOFF2 avec licences OFL, sans changement des réglages néon. Confirmer le rendu et l'absence de `fonts.googleapis.com` / `fonts.gstatic.com` dans un navigateur après Pull.
- Tester puis documenter les requêtes de miniatures YouTube. Éviter de copier/mirrorer sans vérifier les conditions de la plateforme.
- Auditer les URL `avatar_url` réellement enregistrées dans Crew'mong Us avant de proposer une limitation de domaines : fonctionnalité spécialisée à préserver.
- Compléter la politique de confidentialité avec les traitements réels (Supabase Crew, connexion, hébergement OVH, images externes et lecteur Twitch). Les textes seront validés par Deadelus.
- Après raccordement OVH, mener une **recette navigateur réelle**, non couverte par ce rapport statique.

**Aucun de ces constats ne vaut autorisation de modifier les modules spécialisés, ni validation de conformité RGPD.**
