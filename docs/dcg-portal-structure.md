## Avenant bloc 3 — 27 novembre 2026

État actuel : développé et testé localement sur codex/dcg-block3-portal, base 07f3b91 de origin/developpement/tcg-attente. Aucun déploiement, aucune modification de l'instance TEST. Les paragraphes anciens du portail mono-DCG sont conservés plus bas comme historique.

La configuration ne contient plus d'entrée DeadelusTV comme DCG de secours. Mes DCG lit les appartenances du Viewer et les propriétés vérifiées ; l'annuaire lit un registre public activé volontairement par chaque propriétaire. Recherche, stocks, niveau et live sont liés au UUID du DCG et à sa propre connexion Twitch. Données indisponibles honnêtes, pas d'API centrale de repli. L'inscription publique à une communauté résout l'invitation côté serveur et conserve les contrôles d'acceptation/version du règlement ; aucune nouvelle admission Streamer publique.

Le profil et le Pass gardent leurs composants et animations, avec les nouveaux contrats serveur. Le broker partagé avec TCG ouvre le jeu par DCG en conservant la session du portail : seul un access token en mémoire est transmis à une fenêtre et une origine exactes, avec vérification acteur/session/nonce/DCG. Aucun refresh token transféré ou stocké dans le jeu. F5, navigation, renouvellement et changement de compte qualifiés. Si le navigateur perd opener au retour Twitch, fermeture sûre et réouverture depuis le portail ; la recette OAuth hébergée n'est pas réalisée.

Collections communes, boutique et votes sont développés dans cette intervention sur décision explicite. Offres centrales configurées par Admin, quantité et portefeuille DCG choisis sans cumul ; achat/ouverture avec reçus idempotents, lecteur TCG existant, finition normale sans FIRST et zéro XP. Exemplaires communs échangés à rareté égale, sans marché/enchère/évolution. Vote unique définitif par propriétaire Streamer vérifié ; résultats Admin et aucune publication automatique du gagnant. Prix, pools et scrutins des tests sont fictifs, aucun contenu réel configuré. Les éditeurs existants de collections/cartes sont accessibles en contexte central explicite, indépendamment de la sélection mémorisée d'un DCG.

Qualification : 87 tests portail/UI, SQL jetable et vrais rôles PostgreSQL avec safeupdate côté TCG ; deux propriétaires sans Admin, Viewers partagé/distincts, Helper A, Admin indépendant. Recette ordinateur, Pass J1 dans A/B sans double crédit, achat dans B seulement, lecture commune, vote définitif et édition centrale, galerie/provenance ; boutique et galerie dans un cadre de viewport réel 320 px sans débordement horizontal. Les preuves détaillées et le manifeste coordonné sont dans TCG/docs/DCG_BLOCK3_PORTAL.md et TCG/docs/manifests/DCG_BLOCK3_PORTAL.json.

Publication retenue : DCG_PORTAL_PUBLICATION_HOLD en preinstall racine/public pour Cloudflare et garde avant OVH. TCG conserve DCG_STREAMER_VIEWER_PUBLICATION_HOLD ; le refus post-fusion #290 a été observé, ancienne version TCG 8a8e2a5 conservée. Les deux retenues doivent être conservées jusqu'à installation B2/B3, qualification hébergée, reset ciblé approuvé puis bascule GitHub autorisée. Aucun mécanisme automatique d'installation SQL/Edge. Main/OVH du site général ne doit pas recevoir une fusion aveugle de toute la branche portail.

Restent : contenus/tarifs/dates réels approuvés, installation serveur TEST et transports, contrôle retour OAuth réel lors d'une intervention autorisée, volumétrie publique, inventaire/reset précis et bascule coordonnée. Le soutien payant reste indisponible. Cette liste ne masque aucun écran boutique/vote derrière un simple raccordement.

# Portail DCG — structure sur la branche de test, 5 novembre 2026

Ajout préparé le 9 novembre : [niveau général du Pass XP](dcg-xp-pass.md), avec récompenses au clic dans chaque DCG rejoint. Le Pass de connexion reste distinct.

Destination confirmée par Yekelle : dépôt `DeadelusTV/deadelusTV`, branche `developpement/tcg-attente`. Yekelle a terminé son alignement avec `main` avant l’intégration. Base contrôlée : `0e10a9da6d83902c779a86438bac20ede5539baa`. Aucun changement n’est fusionné sur `main` et aucun déploiement OVH n’est demandé.

## Parcours préparés

| Adresse sur un aperçu de cette branche | Contenu |
| --- | --- |
| `#tcg` | Accueil DCG commun, Mes DCG personnels, recherche globale en fenêtre flottante, découverte aléatoire en carrousel, raccourci DeadelusTV et dix losanges de progression du Pass |
| `#tcg/regles` | Présentation des règles actuelles du jeu |
| `#tcg/mon-compte` | Accueil du profil et détails du Pass quotidien |
| `#tcg/mon-compte/constellations` | Mes constellations, affichage par DCG et constellations communes |
| `#tcg/mon-compte/cartes` | Mes constellations, Constellation compacte des cartes possédées et aperçu en lecture seule |
| `#tcg/collections-communes` | Boutique à venir ; Phasmophobia et Valorant présentées comme collections envisagées |

L'onglet Connexion Pass est retiré du menu. Les anciens liens `#tcg/connexion-pass` reviennent à `#tcg` ; les détails du Pass restent dans Mon compte.

L’entrée du menu et les accès de l’accueil portent le libellé **DCG**. Les sous-pages restent dans la rubrique TCG du routeur existant ; les anciennes adresses `#tcg` continuent de fonctionner. Aucun routage serveur `/tcg` ou `/tcg/<streamer>` n’est activé par ce lot.

Cliquer sur le logo DeadelusTV ou son bouton dans le carrousel ou sa carte dans Mes DCG ouvre le jeu existant : `https://tcg.yekelle-boulet.workers.dev/#/boosters`. Son adresse est centralisée dans `public/modules/dcg/config.js`. Le jeu est un lien, sans iframe ni copie de ses clients ou fonctions de jeu dans le site principal.

Le déplacement de Boosters en premier dans le menu du jeu reste préparé dans le projet distinct `Yekelle/TCG` avec ses tests. Il n’est pas publié par cette modification du portail. L’inventaire transversal, les achats communs et le Pass ne sont pas activés ici. La boutique future débitera un seul solde d’Alkahests choisi par le joueur, sans addition des portefeuilles ; le dos reste commun à la collection.

## Intégration

- `public/modules/dcg/portal.js` : écrans communs, Mes DCG et carrousel de découverte ; seul DeadelusTV est raccordé.
- `public/modules/dcg/portal.css` : styles tous limités à `#page-tcg`, adaptation mobile et mouvements réduits.
- `public/modules/dcg/config.js` : adresse du jeu, liste des DCG raccordés et réglages de découverte, sans secret.
- `public/index.html` : contenu de la seule rubrique d’attente remplacé et chargement des fichiers du module ; logo du site réutilisé.
- `public/assets/app.js` : reconnaissance de `tcg/...`, montage et annulation du module ; autres répartitions de routes conservées.

Mon compte réutilise `DEADELUSTV_AUTH` et sa session existante. Le module ne crée pas de second client Supabase, ne reçoit pas de jeton via URL et n’attribue aucun rôle à partir du pseudo. Une déconnexion ou un changement de route invalide les réponses en attente ; les textes personnels sont échappés. Le Pass XP ajoute les lectures et récupérations décrites dans son guide ; les achats, ouvertures de boosters et lancements restent dans les jeux.

Le Pass quotidien est préparé séparément dans `docs/connexion-pass.md` ; seule une visite connectée du site DeadelusTV peut enregistrer sa présence. L'organisation du profil et la consultation des cartes sont décrites dans [Profil du portail DCG](dcg-profile.md).

## Vérifications

Commande sans dépendance ni réseau :

```sh
node --test scripts/test_dcg_portal.cjs scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs
```

**29 tests réussis**, dont dix nouveaux scénarios du portail et du routeur réel. Un contrôle local supplémentaire sur le DOM complet vérifie les liens, sous-pages, recherche, connexion/déconnexion simulée, absence d’identifiants répétés et analyse de la feuille CSS. Les ressources référencées sont contrôlées contre l’arbre de la base GitHub et les nouveaux fichiers.

Le workflow `check-dcg-portal.yml` exécute les contrôles statiques, la syntaxe et ces tests sur la branche de test et les PR concernées. Le workflow OVH existant n’est pas modifié : seule `main` peut y être déployée. Une branche GitHub ne fournit pas à elle seule un aperçu public.

Limites : pas de nouvelle recette visuelle dans un navigateur, pas de migration ni de mutation distante de données de jeu, pas de publication du portail ou du jeu. Les 713 tests précédemment annoncés concernaient la préparation distincte du projet TCG et ne constituent pas le nombre de tests de cette intégration au site principal.

## Recette de l’aperçu de branche

Ouvrir `#tcg`, vérifier le logo et l’annuaire, ouvrir la recherche et trouver DeadelusTV, y compris avant inscription, parcourir les quatre entrées du menu commun, vérifier le retour de l'ancien lien `#tcg/connexion-pass` vers l'accueil DCG, se connecter puis se déconnecter dans Mon compte. Le logo mène aux boosters Workers actuels. Vérifier ensuite les retours vers l’accueil principal, Phasmophobia, Crew et Pavillon Noir, ainsi que l’affichage sur téléphone. Aucun TCG ne doit être lancé pour cette recette du portail.


## Accueil personnel et découverte — 5 novembre 2026

La première zone devient **Mes DCG**. Elle garde les cartes de présentation, mais affiche uniquement le DCG auquel le joueur est inscrit. Sans connexion Twitch, elle propose de se connecter ; sans inscription, elle affiche un état vide. La consultation n’inscrit personne et ne crée ni carte, ni booster, ni compteur. Une carte Viewer n’est pas nécessaire pour apparaître ici.

Le portail réutilise le client `DEADELUSTV_AUTH`. Il vérifie l’utilisateur avec `getUser()`, puis lit uniquement `tcg_accounts.user_id`, filtré par l’identifiant de cet utilisateur et protégé par les RLS existantes. Même un administrateur n’effectue pas de lecture des comptes des autres joueurs. Le serveur actuel est encore limité à DeadelusTV : `accountSpaceId` relie explicitement cette inscription à son seul DCG. Le raccordement de plusieurs communautés nécessitera la séparation serveur et un annuaire d’inscriptions par streamer, pas la réutilisation de cette inscription pour tous.

Sous **Mes DCG**, le bandeau appelle `tcg_portal_discovery()` avec le client Supabase du site, y compris pour un visiteur déconnecté. La base tire au hasard jusqu’à 19 autres streamers puis ajoute DeadelusTV (ID Twitch `99977368`) en dernier. Le résultat est conservé pendant la visite. Chaque pastille affiche la photo et le pseudo Twitch lus dans `tcg_viewers` et pointe sur l’URL publique du deck.

Pour apparaître dans le bandeau, une chaîne doit avoir une collection publiée et non archivée, un profil Twitch avec photo et une URL HTTPS dans `tcg_private.creator_channels.portal_deck_url`. Renseigner cette URL lorsqu'un deck obtient son adresse publique. La migration `20261123000153_tcg_portal_discovery.sql` renseigne celle de DeadelusTV. Pendant le chargement ou en cas d’échec, le site affiche sa pastille de secours.

La lecture publique du bandeau est indépendante de la recherche et de **Mes DCG**. Elle remplace seulement le contenu du bandeau et préserve le Connexion Pass, les données du joueur et le champ de recherche.

## Recherche de streamers en fenêtre flottante

Le bouton **Rechercher un streamer**, à côté de Mes DCG, ouvre une fenêtre modale. La saisie et tous les résultats restent dans cette fenêtre. Elle recherche dans l’intégralité des DCG raccordés, y compris ceux que le joueur n’a pas encore rejoints et ceux absents du tirage de vingt du carrousel. Elle est accessible sans connexion Twitch. Aucun compte de jeu n’est créé en ouvrant la fenêtre ou en effectuant une recherche.

Les résultats sont triés par pseudo, avec la PP et un lien vers les Boosters du streamer. La recherche ignore la casse et les accents. Mes DCG conserve sa liste personnelle sans être filtrée par cette saisie. La fermeture est possible avec la croix, Échap ou le fond extérieur ; le focus revient au bouton d’ouverture. Quitter le portail ferme la fenêtre. Les changements de compte et les rafraîchissements des inscriptions conservent la recherche publique en cours.

Les 24 scénarios du portail couvrent également les résultats hors carrousel, les visiteurs anonymes, la fermeture et le retour du focus, la navigation et l’échappement des noms de streamers.

## Niveau dans Mes DCG

Chaque encart personnel remplace la flèche de droite par le médaillon du niveau local, avec l’anneau de progression et le décor XP existants. Le médaillon reste une information dans le lien vers le DCG ; aucune commande de récupération n’est imbriquée dans ce lien. Le niveau général conserve son médaillon distinct dans l’en-tête.

Après vérification de l’utilisateur et de son inscription, le lecteur actuel consulte `tcg_my_xp` sans paramètre, puis vérifie le périmètre streamer et la chaîne `accountBroadcasterId`. Il concerne uniquement le DCG actuellement raccordé, DeadelusTV. Les autres lecteurs seront raccordés avec leurs DCG. Un échec laisse le lien disponible et montre un tiret, jamais un niveau zéro inventé. Les réponses après changement de compte ou de page sont ignorées ; le retour sur la fenêtre relit la progression.

## Réserves et réception des gains sur l’accueil

Le bas de chaque encart personnel affiche « Boosters : … » et « Alkahests : … ». Le lecteur raccordé reprend `tcg_my_boosters({p_offset:0})`, comme la navigation du jeu : champ `available` pour les boosters à ouvrir, `shop.dust.balance` pour le solde. Cette RPC existante actualise aussi les réserves arrivées à échéance selon les règles du DCG ; elle ne choisit ni bénéficiaire ni gain. Le périmètre streamer, la chaîne et les entiers sûrs sont vérifiés avant affichage. Les soldes restent séparés entre DCG.

Les compteurs sont relus dès réception d’un gain confirmé, au retour sur la fenêtre et toutes les 60 secondes quand elle est visible. Une réponse antérieure ne peut remplacer une lecture plus récente ; une lecture indisponible n’invente pas de zéro. Le changement de compte et la sortie de l’accueil détruisent lecteur et effets. Le DOM des encarts est conservé lorsque seule une valeur change.

Les crédits de niveau général ciblent uniquement les DCG présents dans le reçu serveur. L’icône se dédouble vers les compteurs concernés, puis les encarts brillent brièvement à la réception. Le Pass quotidien utilise la même distribution pour ses gains confirmés ; son service reste en préparation. Aucun vol pour les reçus rejoués, destinataires absents ou mouvement réduit. Dans le profil, l’affichage fixe des gains pendant 1,5 seconde est conservé. Les scénarios à deux destinataires sont vérifiés sur données fictives ; seul DeadelusTV est actuellement raccordé au portail. Aucune migration ni activation du Pass.

## Indicateur « En live » dans Mes DCG — 25 novembre 2026

Le portail affiche uniquement un petit point et le libellé rouge « En live », centrés sous la photo du streamer et au-dessus de la ligne des compteurs. Aucune mention hors direct ni en cas de statut indisponible. Le lien, les autres éléments et l'ordre des DCG restent inchangés. La mise en page et la couleur restent à vérifier sur l'aperçu, notamment sur mobile.

`portal-live.js` lit uniquement les identifiants Twitch des DCG personnels raccordés, par groupes de 100, toutes les 60 secondes pendant la consultation visible de l'accueil et au retour sur l'onglet. Il masque les statuts inconnus, annule les lectures lors d'un changement de compte ou de page et met à jour l'indicateur sans remplacer les compteurs. Le statut ne dépend ni du compte Twitch du viewer ni de son éligibilité aux drops.

Sur Cloudflare Pages TEST, `functions/api/dcg-live-status.js` relaie la lecture publique GET de `https://www.deadelustv.com/api/twitch-status`, avec cache facultatif de 15 secondes, sans compte joueur, secret ni iframe. Le service historique OVH décrit uniquement DeadelusTV (99977368). Le module peut aussi utiliser ce service même origine comme repli pour cette chaîne uniquement. Les autres identifiants sont inconnus jusqu'au raccordement d'une source de statut serveur multi-chaînes ; l'interface n'invente jamais leur état. Aucun serveur OVH ni Supabase n'est modifié. Le relais est préparé pour un projet Pages dont la racine de build est celle du dépôt. Son fonctionnement réel et la disponibilité de l'API OVH depuis Pages restent à confirmer.

Vérifications locales sur réponses fictives : `node --test scripts/test_portal_live.cjs`. La suite `scripts/test_dcg_portal.cjs` contient un contrôle d'intégration du cycle de vie. La recette connectée live/hors live, l'absence de chevauchement responsive, les tests complets et le déploiement TEST restent à vérifier séparément.
