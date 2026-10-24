# Pavillon Noir dans DeadelusTV

Première intégration native préparée le 25 octobre 2026. Ce document décrit un lot à installer ; il n'atteste pas de sa publication.

## Installation du lot

1. Dans GitHub Desktop, sélectionner DeadelusTV, faire Fetch origin puis Pull si proposé.
2. Conserver une copie des trois fichiers actuels `public/index.html`, `public/assets/app.js` et `public/assets/config.js` avant remplacement.
3. Extraire l'archive et copier son dossier `public` dans le dépôt, en fusionnant les dossiers et en remplaçant ces trois fichiers. Ne pas supprimer le dossier public existant : les autres images, styles et fichiers restent nécessaires.
4. Le lot ajoute `public/modules/pavillon-noir/` avec les données, les images, le moteur d'affichage et le style de campagne. Copier aussi les deux fichiers docs si souhaité.
5. Commit puis Push origin. Le workflow OVH existant publie le contenu de public ; aucune modification du workflow n'est requise.
6. Après déploiement, Ctrl + F5 puis ouvrir Jeux de rôle → Ouvrir le carnet, ou le bouton Ouvrir Pavillon Noir sur l'accueil.

Le lot part du dépôt DeadelusTV/deadelusTV au commit c98214c66eb83c3157678bfda4fe5ef2613e15be. S'il y a eu de nouvelles modifications dans les trois fichiers remplacés depuis ce commit, les comparer avant remplacement pour préserver ces modifications.

## Parcours

Le carnet s'ouvre sur `#pavillon-noir`. Ses sous-rubriques utilisent `#pavillon-noir/sessions`, `#pavillon-noir/equipage`, etc. Les détails de session, personnage, PNJ et lore ont aussi leurs liens internes et peuvent être partagés ou rechargés directement.

Le menu DeadelusTV reste présent et Jeux de rôle reste sélectionné. Une navigation propre à la campagne donne accès au carnet, aux sessions, à l'équipage, aux PNJ, au lore, au système, à la chronologie et aux coulisses. Le logo retourne à l'accueil DeadelusTV.

L'application charge les données de campagne à la première ouverture de sa rubrique. Tout le code et tous les médias de campagne proviennent ensuite du même déploiement que DeadelusTV. Le site Pavillon Noir externe n'est pas chargé, et aucun cadre intégré n'est utilisé pour cette rubrique.

## Contenu et maintenance

Source importée : DeadelusTV/pavillon-noir, commit d599f1dada6f8ec7f1a4ab2b9799cd1fc5091a0d. Les huit fichiers de données et les images sont recopiés sans modification éditoriale. Les fonctions de présentation d'origine sont conservées ; les liens et chemins des médias sont adaptés à la rubrique lors de l'affichage. Les styles sont limités à la campagne.

Après adoption de cette migration, modifier les données dans `public/modules/pavillon-noir/data/` du dépôt DeadelusTV. Il n'y a aucune synchronisation automatique avec l'ancien dépôt. Ajouter les nouveaux médias dans `public/modules/pavillon-noir/assets/` et garder les chemins `assets/nom-du-fichier` dans les données de campagne. Le module les résout vers son propre dossier.

Les liens vers les VOD YouTube/Twitch restent externes. Les fiches personnages PNG s'ouvrent séparément comme auparavant, mais sont servies par DeadelusTV.

## Vérifications réalisées

- Syntaxe JavaScript du module et du routeur principal.
- Production des 52 pages et fiches existantes : 8 rubriques, 5 sessions, 4 PJ, 18 PNJ et 17 entrées de lore.
- Résolution de 240 liens internes et présence de 59 références aux médias locaux.
- Comparaison des huit fichiers de données importés avec la source : identiques.
- Parcours dans le navigateur : ouverture depuis l'accueil, liste des sessions, session 05, fiche d'Aldry et retour à l'accueil.
- Affichage de campagne en largeur de cadre mobile de 390 px : pas de débordement horizontal sur l'équipage ; navigation de campagne accessible.

Le déploiement OVH et la validation finale du rendu en ligne restent à effectuer après installation. L'ancien site est encore en place. Son éventuel retrait ou ses redirections ne sont pas réalisés par ce lot.

## Retour arrière

Restaurer les trois fichiers sauvegardés, ou annuler le commit de migration depuis GitHub Desktop, puis publier le retour arrière. Les nouveaux fichiers de module non référencés ne modifient pas l'affichage de l'ancienne version.
