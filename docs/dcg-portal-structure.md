# Portail DCG — structure sur la branche de test, 5 novembre 2026

Ajout préparé le 9 novembre : [niveau général du Pass XP](dcg-xp-pass.md), avec récompenses au clic dans chaque DCG rejoint. Le Pass de connexion reste distinct.

Destination confirmée par Yekelle : dépôt `DeadelusTV/deadelusTV`, branche `developpement/tcg-attente`. Yekelle a terminé son alignement avec `main` avant l’intégration. Base contrôlée : `0e10a9da6d83902c779a86438bac20ede5539baa`. Aucun changement n’est fusionné sur `main` et aucun déploiement OVH n’est demandé.

## Parcours préparés

| Adresse sur un aperçu de cette branche | Contenu |
| --- | --- |
| `#tcg` | Accueil DCG commun, Mes DCG personnels, recherche globale en fenêtre flottante, découverte aléatoire en carrousel, raccourci DeadelusTV et emplacement du Pass |
| `#tcg/regles` | Présentation des règles actuelles du jeu |
| `#tcg/mon-compte` | Connexion Twitch commune puis accès au Cartodex et au profil DeadelusTV |
| `#tcg/collections-communes` | Boutique à venir ; Phasmophobia et Valorant présentées comme collections envisagées |
| `#tcg/connexion-pass` | Consultation du Pass ; suivi de présence commun préparé, gains désactivés |

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

Le Pass quotidien est préparé séparément dans `docs/connexion-pass.md` ; seule une visite connectée du site DeadelusTV peut enregistrer sa présence.

## Vérifications

Commande sans dépendance ni réseau :

```sh
node --test scripts/test_dcg_portal.cjs scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs
```

**29 tests réussis**, dont dix nouveaux scénarios du portail et du routeur réel. Un contrôle local supplémentaire sur le DOM complet vérifie les liens, sous-pages, recherche, connexion/déconnexion simulée, absence d’identifiants répétés et analyse de la feuille CSS. Les ressources référencées sont contrôlées contre l’arbre de la base GitHub et les nouveaux fichiers.

Le workflow `check-dcg-portal.yml` exécute les contrôles statiques, la syntaxe et ces tests sur la branche de test et les PR concernées. Le workflow OVH existant n’est pas modifié : seule `main` peut y être déployée. Une branche GitHub ne fournit pas à elle seule un aperçu public.

Limites : pas de nouvelle recette visuelle dans un navigateur, pas de migration ni de mutation distante de données de jeu, pas de publication du portail ou du jeu. Les 713 tests précédemment annoncés concernaient la préparation distincte du projet TCG et ne constituent pas le nombre de tests de cette intégration au site principal.

## Recette de l’aperçu de branche

Ouvrir `#tcg`, vérifier le logo et l’annuaire, ouvrir la recherche et trouver DeadelusTV, y compris avant inscription, parcourir les cinq entrées du menu commun, se connecter puis se déconnecter dans Mon compte. Le logo mène aux boosters Workers actuels. Vérifier ensuite les retours vers l’accueil principal, Phasmophobia, Crew et Pavillon Noir, ainsi que l’affichage sur téléphone. Aucun TCG ne doit être lancé pour cette recette du portail.


## Accueil personnel et découverte — 5 novembre 2026

La première zone devient **Mes DCG**. Elle garde les cartes de présentation, mais affiche uniquement le DCG auquel le joueur est inscrit. Sans connexion Twitch, elle propose de se connecter ; sans inscription, elle affiche un état vide. La consultation n’inscrit personne et ne crée ni carte, ni booster, ni compteur. Une carte Viewer n’est pas nécessaire pour apparaître ici.

Le portail réutilise le client `DEADELUSTV_AUTH`. Il vérifie l’utilisateur avec `getUser()`, puis lit uniquement `tcg_accounts.user_id`, filtré par l’identifiant de cet utilisateur et protégé par les RLS existantes. Même un administrateur n’effectue pas de lecture des comptes des autres joueurs. Le serveur actuel est encore limité à DeadelusTV : `accountSpaceId` relie explicitement cette inscription à son seul DCG. Le raccordement de plusieurs communautés nécessitera la séparation serveur et un annuaire d’inscriptions par streamer, pas la réutilisation de cette inscription pour tous.

Sous Mes DCG, **Les DCG** présente au maximum vingt streamers distincts, tirés au hasard parmi les espaces raccordés. Le tirage est fait une fois par chargement de page : F5 le renouvelle ; une recherche, une connexion ou un aller-retour entre les rubriques ne le modifie pas. Chaque lien est un bouton ovale contenant uniquement la PP et le pseudo du streamer. Aucun nombre de cartes n’est affiché. Le carrousel défile horizontalement, au clavier, au toucher et avec les flèches ; les mouvements réduits sont respectés.

Dans `config.js`, `showDiscoveryWithSingleStreamer: true` garde la zone visible sur cette branche de test avec DeadelusTV seul. Passer ce réglage à `false` masque la zone lorsqu’il n’y a qu’un seul DCG ; dès qu’il y en a plusieurs, elle s’affiche. `discoveryLimit` est plafonné à 20. Aucun faux streamer n’est ajouté pour remplir l’aperçu. La photo utilise la même PP Twitch publique que l’en-tête du jeu.

Les réponses tardives sont ignorées après déconnexion, changement de compte ou sortie du portail. Le rafraîchissement de Mes DCG conserve les autres éléments de la page et le champ de recherche. Les scénarios du portail couvrent l’inscription réelle, les comptes sans carte Viewer, les erreurs, les réponses tardives, le plafond et la stabilité du tirage, le masquage avec un seul streamer et les commandes de défilement.

## Recherche de streamers en fenêtre flottante

Le bouton **Rechercher un streamer**, à côté de Mes DCG, ouvre une fenêtre modale. La saisie et tous les résultats restent dans cette fenêtre. Elle recherche dans l’intégralité des DCG raccordés, y compris ceux que le joueur n’a pas encore rejoints et ceux absents du tirage de vingt du carrousel. Elle est accessible sans connexion Twitch. Aucun compte de jeu n’est créé en ouvrant la fenêtre ou en effectuant une recherche.

Les résultats sont triés par pseudo, avec la PP et un lien vers les Boosters du streamer. La recherche ignore la casse et les accents. Mes DCG conserve sa liste personnelle sans être filtrée par cette saisie. La fermeture est possible avec la croix, Échap ou le fond extérieur ; le focus revient au bouton d’ouverture. Quitter le portail ferme la fenêtre. Les changements de compte et les rafraîchissements des inscriptions conservent la recherche publique en cours.

Les 24 scénarios du portail couvrent également les résultats hors carrousel, les visiteurs anonymes, la fermeture et le retour du focus, la navigation et l’échappement des noms de streamers.
