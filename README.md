# DeadelusTV — site principal

Site public : https://www.deadelustv.com/
Dépôt : https://github.com/DeadelusTV/deadelusTV
Roadmap : [docs/ROADMAP.md](docs/ROADMAP.md)

## Architecture et publication

Le portail est un site statique (HTML, CSS, JavaScript), servi depuis `public/` sur OVH. Aucun service Supabase supplémentaire n'est nécessaire pour les pages de présentation Phasmophobia et TCG. Les modules Crewmong Us et Pavillon Noir suivent leurs intégrations propres ; ne pas considérer leurs données ou leur administration comme celles du TCG.

`main` est la branche qui déclenche `.github/workflows/deploy-ovh.yml` : construction des fichiers statiques dans une nouvelle release OVH, transfert SSH vérifié puis activation de `/var/www/deadelustv/accueil/current`. Le workflow ne publie que `public/`, et les clés d'accès OVH sont des secrets/variables GitHub Actions. Ne jamais ajouter de secret dans `public/`.

Les branches de développement sont indépendantes. La démo `preview/presentation-deadelus`, publiée séparément sur Cloudflare Pages, n'est pas une source de vérité pour le reste de l'accueil : **ne jamais fusionner l'intégralité de cette branche sur `main`** sans revue des fichiers.

## Pages actuellement publiées

- **Accueil** : lecteur Twitch avec écran hors ligne personnalisé et texte néon ; dernière vidéo principale YouTube, rubrique TikTok, liens sociaux et accès aux univers. Conserver le fonctionnement et les ajustements du site officiel en faisant évoluer d'autres pages.
- **Phasmophobia V2** (`#phasmophobia`) : bandeau visuel, galerie des tutoriels Shorts issus de la playlist officielle et présentation visuelle du carnet des enquêteurs. Galerie : `public/modules/phasmophobia/module.js`, styles : `public/modules/phasmophobia/style.css`, données : `public/data/phasmo-shorts.json`. Le carnet représenté sur la page n'est **pas** encore le livre interactif terminé.
- **TCG** (`#tcg`) : page d'attente immersive « Un nouvel univers se prépare » avec cartes symboliques, sans révélation des mécaniques du futur jeu. Style isolé dans `public/assets/tcg-attente.css`. L'ancien booster fictif n'est plus proposé sur cette page.
- **Crewmong Us / Pavillon Noir** : intégrations existantes, conservées lors de la publication ciblée des deux rubriques ci-dessus. Se référer aussi à `docs/crewmongus-integration.md` et `docs/pavillon-noir-integration.md` pour leur historique d'intégration.

Les pages Phasmo V2 et TCG d'attente ont été publiées sur `main` le **25 octobre 2026** (commit `8db665fbf9d4b966e815a7d580fbbb4991ca3e1a`). La correction de libellé « Pavillon Noir » déjà présente sur `main` a été conservée. Ne pas confondre cette publication avec le **prototype de livre interactif Phasmo** en cours sur `developpement/phasmo-v2`, non retenu pour cette publication.

## Deux actualisations YouTube distinctes

### 1. Dernière vidéo principale de l'accueil

- `scripts/update-youtube.py` consulte la page publique des vidéos YouTube (pas la playlist Phasmo), sans clé API.
- `public/data/latest-youtube.json` fournit la vignette et le titre.
- `.github/workflows/refresh-youtube.yml` vérifie aux minutes 7, 22, 37 et 52 de chaque heure (UTC), et publie le seul JSON via OVH. Le navigateur vérifie périodiquement ce fichier lorsque l'accueil est visible.

### 2. Galerie de tutoriels Phasmophobia

- Source : https://www.youtube.com/playlist?list=PL-fyrrZ6KfGkn4a2bt07-HqyjIncP_X7g.
- `scripts/update-phasmo-shorts.py` utilise YouTube Data API v3 pour récupérer les métadonnées publiques de la playlist, avec pagination. Il vérifie les identifiants, déduplique, conserve l'ordre de la playlist et écrit atomiquement le JSON. Il ne télécharge **aucune vidéo**.
- Le secret GitHub Actions `YOUTUBE_API_KEY` est lu **uniquement par GitHub Actions**. La clé doit être limitée à l'API YouTube Data API v3 et jamais ajoutée au dépôt ni exposée dans le navigateur. Le test sur la branche de développement a réussi le 25/10/2026. Le premier workflow sur `main` a également réussi le 25/10/2026 : récupération YouTube, vérifications locales et transfert SSH OVH, exécution GitHub Actions `40218578291`. La fiabilité des prochains déclenchements programmés reste à surveiller via Actions.
- `.github/workflows/refresh-phasmo-shorts.yml` vérifie **quatre fois par jour**, à **01:13, 07:13, 13:13 et 19:13 UTC**, avec lancement manuel possible sur `main`. La publication modifie uniquement `data/phasmo-shorts.json` sur le VPS, sans commit automatique.
- La galerie affiche jusqu'à **12 cartes** et propose le lien vers la playlist. Son affichage dépend de la disponibilité des miniatures YouTube.

En cas d'échec ou de réponse vide de YouTube, ne pas écraser le dernier JSON valide. Le déploiement général OVH tente lui aussi l'actualisation et conserve les données du site précédent si la collecte échoue ou si la clé manque. Les deux workflows YouTube et le workflow de déploiement partagent un même groupe de concurrence pour éviter des écritures simultanées sur `current`.

**Limites :** les horaires GitHub Actions sont indicatifs, pas des garanties de déclenchement à la minute ; sur les dépôts publics inactifs, les workflows planifiés peuvent être désactivés. La clé et les quotas de YouTube Data API v3 restent à surveiller. Les données et leur actualisation sont indépendantes de Supabase.

## Contrôles et tests

- Tests de récupération sans réseau : `python3 -m unittest discover -s scripts -p 'test_phasmo_shorts.py'`.
- Lancer manuellement **Actualiser les Shorts Phasmophobia** dans GitHub → Actions après la mise en place sur `main`. Vérifier que l'étape de transfert OVH réussit ; un simple test sur une branche de développement ne prouve pas la publication.
- Vérifier dans le navigateur : `/#accueil`, `/#phasmophobia`, `/#tcg`, mobile, lecture Twitch et contenu de la galerie Phasmo.
- Après tout changement de `main`, vérifier le workflow **Deployer l'accueil sur OVH**, puis le rendu du site officiel.

## Ce qui n'est PAS publié

Le livre interactif Phasmo, sa direction artistique avancée, son feuilletage et ses éventuelles fiches issues du bot Discord restent **en développement / à valider** sur `developpement/phasmo-v2`. Ils ne doivent pas être assimilés au carnet décoratif actuellement publié ni intégrés automatiquement sur `main`.

Voir [la roadmap](docs/ROADMAP.md) pour le statut, les limites et les prochaines décisions.

## Travaux propres à cette branche

Le prototype du carnet interactif Phasmophobia et ses styles/scripts restent exclusivement dans `developpement/phasmo-v2` et ne sont pas déployés. Les notes d'interface, de navigation, les limites et les idées en suspens ont été préservées dans [docs/phasmo-journal-suivi.md](docs/phasmo-journal-suivi.md).


### Journal Phasmophobia — administration évolutive des contenus (27/10/2026)

**Demande utilisateur : à prévoir pour l'intégration future du carnet, non implémentée dans le prototype local.** Phasmophobia évolue régulièrement : la liste des entités, lieux/maps, équipements, objets maudits, médias et autres contenus, ainsi que les astuces et conseils, ne doit pas être figée dans le code.

- **Administration en ligne pour Deadelus** : pouvoir **ajouter, consulter, modifier, réorganiser, publier, masquer/archiver et supprimer** des fiches sans intervention GitHub et sans devoir modifier le JavaScript, le HTML ou les fichiers JSON du dépôt.
- **Toutes les rubriques sont concernées** : Entités, Maps, Équipements, Objets maudits, Divers, et tout autre sous-type de fiche ou de conseil nécessaire ; si la structure du jeu évolue, pouvoir également **ajouter ou renommer des catégories/sous-catégories** sans refonte du moteur du livre.
- **Éditeur de fiches flexible** : titre, texte enrichi (gras, souligné, etc.), sections multiples, images multiples placées dans la page, images décoratives et ordre d'affichage/plan, liens, conseils, champs propres à certains types de fiche. Prévoir des gabarits réutilisables mais **non bloquants** : pas de limitation à trois preuves ou à un nombre fixe de sections.
- **Le carnet s'actualise depuis les données publiées** : sommaire général, listes des rubriques, fiches cliquables, onglets, recherche éventuelle et flèches suivant/précédent doivent refléter les contenus et leur ordre réel, sans réécrire le code à chaque ajout.
- **Publication maîtrisée** : distinguer brouillon et publication ; possibilité de corriger les conseils devenus obsolètes et, de préférence, de conserver un historique ou des sauvegardes pour éviter les pertes accidentelles. Les suppressions définitives nécessitent confirmation ; l'archivage est à privilégier selon la situation.
- **Accès sécurisé** : Deadelus a le contrôle éditorial complet du carnet ; droits différenciés des comptes dédiés à d'autres fonctions (notamment futur traducteur/rédacteur du blog), sans octroyer des droits globaux par défaut.
- **Implémentation future** : modèle de données extensible et stockage des médias approprié (ex. base et stockage du projet) à définir lors de la mise en place. Les prototypes HTML locaux servent à valider l'interface et les gabarits, **pas** à imposer des listes statiques dans l'application finale.

**Périmètre de cette modification : documentation uniquement sur developpement/phasmo-v2 ; ne pas toucher à main ni aux fichiers du site.**


### Branche Phasmo V2 synchronisée le 27 octobre 2026

Base officielle : `0edd2e07f66ff8f02f70fda503c171b5768cb179`. Chantier actif : livre de preuves / carnet interactif et son administration future. Les News sont déjà publiées sur main ; cette branche conserve uniquement leur canal de test et ses brouillons distincts. Voir le suivi pour le point de retour et les limites.


### Carnet Phasmophobia — image de référence provisoire (27/10/2026)

**Référence de travail provisoire, pas encore une validation définitive par Deadelus.** La personne pilote du projet a fourni dans la conversation Onglet Phasmo l'image « carnet brun(1).png » (27/10/2026) et demandé explicitement de s'en servir **comme base visuelle du journal**, dans le doute sur la préférence finale de Deadelus.

- Livre ouvert brun, couverture en cuir brun foncé, pages beige clair légèrement vieillies, cinq onglets supérieurs et deux languettes de navigation latérales ; pages vierges sans texte imprimé.
- Préserver cette image **à l'identique** comme référence et éviter de repartir d'un carnet inventé ou d'un des comparatifs générés ultérieurement. Les textes, preuves, images et zones cliquables seront ajoutés **en calques HTML** par-dessus dans l'atelier.
- Ne pas confondre le choix du **fond graphique du carnet** avec les visuels de démonstration Aswang, qui ne sont pas les fonds à intégrer.
- Le choix de Deadelus reste à confirmer. Ne pas remplacer le fond de l'éditeur V4.2, ni les médias du site, ni publier sur `main` avant validation explicite ou demande d'intégration.
- Le fichier image original est joint à la conversation du projet, et **n'est pas encore copié dans le dépôt** : cette note documente la référence mais ne constitue pas à elle seule un actif présent dans GitHub.
