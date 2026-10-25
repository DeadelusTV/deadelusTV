# DeadelusTV — accueil public

Site : https://www.deadelustv.com/#accueil

Sources : https://github.com/DeadelusTV/deadelusTV

Le site est statique : seuls les fichiers de `public/` sont servis. HTML, CSS et JavaScript sont séparés ; aucune dépendance ni compilation n’est nécessaire pour l’affichage. Les services Supabase existants ne sont pas utilisés par cet accueil.

## Accueil

- Photo de profil dans l’entête et en favicon ; le logo permet de revenir à l’accueil.
- Menu et raccourcis : Phasmophobia, TCG, Crewmong Us, Jeux de rôle.
- Lecteur Twitch chargé directement, en mode muet au départ. Si la largeur disponible est inférieure aux 400 px requis par Twitch, un lien vers la chaîne est proposé. Le badge violet ouvre également Twitch. Le lecteur est déchargé lorsqu’on quitte l’accueil.
- Réseaux flottants sur le côté sur ordinateur et en barre basse sur mobile ; ils disparaissent lorsque les liens du pied de page sont entièrement visibles.
- Grande vignette YouTube : dernière vidéo publiée dans l’onglet Vidéos, hors Shorts. La miniature mène à la vidéo, le titre à la chaîne. Le titre de rubrique « À retrouver en vidéo » reste à renommer.
- Un seul bloc de vidéos courtes : TikTok. Son contenu reste illustratif et son lien ouvre le profil ; aucune récupération automatique TikTok n’est ajoutée.
- Les présentations des univers restent distinctes des sites existants. Le booster TCG est une démonstration fictive.

## Actualisation YouTube

`scripts/update-youtube.py` lit uniquement la page publique `https://www.youtube.com/@deadelustv/videos?hl=fr&gl=FR`. Il vérifie l’identifiant de chaîne, l’onglet sélectionné et le tri récent avant de retenir la première vidéo publiée. Les Shorts sont exclus par le choix de l’onglet, pas par un seuil de durée. Une vidéo classique courte reste donc éligible. Les directs en cours et les publications à venir ne sont pas retenus.

Le script extrait seulement l’identifiant, le titre et l’adresse de la miniature. Il ne télécharge aucune vidéo. Python 3 et sa bibliothèque standard suffisent ; aucune clé API, aucun cookie ni compte YouTube n’est nécessaire. Cette lecture de page publique n’est pas l’API officielle : un changement de structure YouTube peut demander une adaptation. Une erreur ne remplace pas les données précédentes par un résultat vide.

Les métadonnées sont écrites atomiquement dans `public/data/latest-youtube.json`. Le fichier du dépôt est un premier instantané ; les actualisations suivantes sont publiées directement sur le site, sans créer de commits automatiques. Le navigateur relit ce fichier au chargement et environ toutes les cinq minutes quand l’accueil est visible. Les liens et le dernier affichage restent utilisables en cas d’erreur de récupération.

## GitHub → OVH

`.github/workflows/deploy-ovh.yml` conserve le déploiement sur chaque push vers `main`, ainsi que son lancement manuel. Il actualise les métadonnées YouTube avant de préparer `public/`, transfère la nouvelle version puis bascule le lien `current`. Si YouTube est indisponible, les métadonnées de la version déjà en ligne sont reprises avant activation.

`.github/workflows/refresh-youtube.yml` vérifie YouTube aux minutes 7, 22, 37 et 52 de chaque heure, soit un intervalle prévu de quinze minutes. Il peut aussi être lancé manuellement dans Actions. Il ne transfère que le JSON de métadonnées et ne crée pas de nouvelle version complète du site. Le groupe de concurrence est partagé avec le déploiement pour éviter une écriture pendant la bascule de version.

Les deux workflows utilisent les paramètres déjà présents dans le dépôt : variables `VPS_HOST`, `VPS_USER`, `VPS_KNOWN_HOSTS` et secret `VPS_SSH_KEY`. La vérification de la clé du serveur SSH reste activée et les permissions GitHub restent en lecture seule. La racine de publication est `/var/www/deadelustv/accueil/current` ; aucune nouvelle configuration Caddy, tâche cron du VPS ou intervention Supabase n’est nécessaire.

La planification GitHub n’est pas une garantie à la minute : GitHub peut retarder ou omettre une exécution en période de charge. Sur un dépôt public, les exécutions planifiées sont désactivées après soixante jours sans activité du dépôt ; il faut alors réactiver le workflow dans Actions. Source : https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

## Installation de cette évolution

Récupérer d’abord les derniers changements de `main`. Appliquer les huit fichiers de cette mise à jour dans le dépôt en conservant exactement leurs chemins, puis faire un commit et un push. Aucun fichier existant supplémentaire n’est à supprimer.

| Fichiers à remplacer | Fichiers à ajouter |
| --- | --- |
| `public/index.html` | `public/data/latest-youtube.json` |
| `public/assets/styles.css` | `scripts/update-youtube.py` |
| `public/assets/app.js` | `.github/workflows/refresh-youtube.yml` |
| `.github/workflows/deploy-ovh.yml` | |
| `README.md` | |

Avec GitHub Desktop : récupérer les changements avec Fetch/Pull, copier les fichiers fournis dans le dossier du dépôt local, vérifier les huit chemins dans la liste des changements, puis Commit et Push. Depuis GitHub web : remplacer ou ajouter ces mêmes fichiers ; appliquer les workflows après les fichiers publics et le script Python.

Après publication, attendre la réussite de « Deployer l’accueil sur OVH », puis vérifier l’accueil en rechargeant la page. Dans Actions, lancer une fois « Actualiser la derniere video YouTube » sur `main` pour vérifier le transfert du JSON avec les droits SSH réels. Une exécution réussie confirme ce branchement ; les tests locaux ne le prouvent pas.

L’archive contient des fichiers complets à appliquer, pas un nouveau site à placer dans un sous-dossier. `scripts/deploy-ovh.sh` reste un ancien utilitaire distinct ; les workflows actuels utilisent leur propre procédure.

## Vérifications et limites avant publication

La récupération réelle sur la chaîne a été exécutée. Les cas onglet incorrect, mauvais tri, Shorts, vidéo classique courte et panne ont été contrôlés. Les syntaxes JavaScript, Python, YAML et Bash ainsi que la publication et le repli ont été vérifiés localement ; le transfert SSH a été simulé sans toucher au serveur. La logique JavaScript des liens et du rafraîchissement a été contrôlée.

Le rendu visuel de cette évolution et l’exécution réelle des nouveaux workflows restent à vérifier après publication par Yekelle. L’aperçu local n’était pas accessible depuis le navigateur de contrôle. Ne pas confondre ces fichiers préparés avec un déploiement déjà effectué.


## Phasmophobia : synchronisation des Shorts (en développement)

La galerie de la rubrique Phasmophobia lit public/data/phasmo-shorts.json.
Elle affiche les vrais titres, miniatures et liens publics, fournis par YouTube.
Le navigateur ne contacte pas directement l'API Google et ne reçoit aucune clé.

Playlist : https://www.youtube.com/playlist?list=PL-fyrrZ6KfGkn4a2bt07-HqyjIncP_X7g

### Configuration
1. Créer une clé Google Cloud, activer YouTube Data API v3 et restreindre
   la clé à cette API. Ne jamais l'ajouter au HTML, JavaScript ou à un commit.
2. Dans le dépôt GitHub : Settings > Secrets and variables > Actions >
   New repository secret, nom YOUTUBE_API_KEY, valeur = clé API.
3. Sur un ordinateur de confiance, pour un test local : définir temporairement
   la variable YOUTUBE_API_KEY puis lancer le script ci-dessous.
4. Pour les tests sans réseau :
   python -m unittest discover -s scripts -p 'test_phasmo_shorts.py'

### Test local (Live Server)
Dans le terminal VS Code du dépôt, après définition de la variable :
python scripts/update-phasmo-shorts.py

Le script écrit public/data/phasmo-shorts.json, lu immédiatement par Live Server.
Ne jamais mettre la clé elle-même dans les fichiers du dépôt.

### Publication
Le script scripts/update-phasmo-shorts.py utilise playlistItems.list avec
pagination, vérifie les métadonnées, puis écrit atomiquement le JSON.
En cas d'erreur ou de liste vide, l'ancienne version est conservée.

Après fusion dans main, le workflow refresh-phasmo-shorts.yml vérifie la playlist
à 01:13, 07:13, 13:13 et 19:13 UTC (déclenchements non garantis à la minute).
Il transfère uniquement le JSON vers OVH, sans commit.
Le déploiement du site tente également une synchronisation et conserve
les dernières données publiées si YouTube est indisponible.

La branche de développement ne publie rien sur OVH. Les nouveaux workflows
ne sont disponibles au déclenchement manuel GitHub qu'après présence dans main.
Aucune synchronisation réelle avec l'API n'a encore été confirmée.


## Phasmophobia — carnet interactif : remarques et travaux à reprendre (25/10/2026)

État : prototype fonctionnel sur `developpement/phasmo-v2`. Le livre s'ouvre, les onglets naviguent et le changement de double page fonctionne, mais le rendu n'est PAS validé.

- **Animation de changement d'onglet / page : à refaire.** Observation utilisateur : les pages au centre semblent s'écarter / se séparer au lieu de se tourner. Cause probable à traiter : le prototype fait pivoter très légèrement une demi-page avec variation d'opacité (`journal.css`, `journal.js`), sans véritable feuille animée. Objectif : une seule feuille indépendante tourne naturellement autour de la reliure centrale, sans ouverture artificielle des deux pages. Travailler ce comportement après validation de la base du carnet ; éviter de conserver l'animation trompeuse comme finition.
- **Direction artistique du livre : à reprendre après la structure.** Le carnet ouvert est provisoire. Une fois la navigation et les fiches structurées, rapprocher son aspect du journal de Phasmophobia : couverture/reliure, proportions, texture papier, onglets, disposition intérieure et effet de feuilletage. Ne pas considérer l'interface actuelle comme la version finale.
- **Contenu :** ne pas inventer les informations du bot Discord ; récupérer les vraies fiches et faire valider leur organisation avant intégration.
- **Validation :** présenter d'abord les principes et l'apparence à Deadelus ; ne rien publier sur `main` sans accord.



## Phasmophobia — direction artistique proposée : journal V2 (25/10/2026)

**Statut : proposition visuelle à valider avant codage.** Référence : captures fournies du journal et des fiches du bot Discord DeadelusTV. Ne pas confondre ce cahier des charges avec un rendu déjà implémenté.

### Direction esthétique
- Journal ancien très large et presque plein écran : tranche visible, feuillets empilés, angles usés, parchemin jaune/beige texturé et reliure centrale foncée.
- Titres manuscrits noirs, fortement hiérarchisés, lignes de séparation épaisses ; police libre lisible à choisir après essais. Pas de gros boutons web au milieu des pages.
- Silhouettes de fantômes très discrètes en filigrane, à partir de médias autorisés ; texte et fond doivent rester distincts pour l'accessibilité.
- Arrière-plan extérieur noir, commandes discrètes, sans l'actuelle barre de modalité trop visible.

### Sommaire : disposition des deux pages d'après la capture Discord
- Page gauche : Les Entités en haut (noms en trois colonnes), Les Équipements en bas (noms en colonnes). Illustration spectrale pâle en arrière-plan.
- Page droite : Les Maps en haut, Les Objets Maudits au milieu, Divers en bas. Les noms sont en colonnes, avec filigrane spectral pâle.
- Titres manuscrits centrés, soulignés de traits noirs. Chaque nom est cliquable et utilisable au clavier, avec retour visible mais discret.
- Flèches en languettes parchemin de chaque côté du livre pour tourner la double page.
- Le sommaire constitue la navigation principale, sans imposer les onglets épais du prototype actuel. Réévaluer les onglets s'ils apportent une vraie utilité.
- Ne pas inventer de noms, de descriptions ou de catégories : utiliser les données validées du bot Discord.

### Gabarits après le sommaire
- Fiche entité : titre, preuves, seuil de chasse et illustration à gauche ; comportement, vitesse et astuces à droite.
- Fiche objet maudit : visuel de l'objet à gauche ; description, fonctionnement et conseils à droite.
- Page map : grande carte annotée, autre gabarit de lecture distinct.
- Fiche équipement : visuel, fonctionnement et astuces selon le contenu réel du bot.
- Tableau récapitulatif preuves / santé mentale : complément envisageable, pas automatiquement une double page de carnet.

### Feuilletage à corriger
- Défaut actuel confirmé : les pages centrales semblent s'écarter au lieu de se tourner.
- La V2 doit faire pivoter UNE feuille indépendante avec recto/verso autour de la reliure, perspective cohérente et ombres, et non animer les deux pages fixes.
- Respecter le mode mouvement réduit ; navigation clavier, fermeture par Échap, état de focus clair. Bruit de page éventuel plus tard, désactivé par défaut.

### Adaptation et ordre de travail
- Ordinateur : double page large, fidèle au rapport d'aspect du journal Discord ; mobile : lecture page par page sans texte minuscule.
- Étape 1 : valider le système visuel de la coque + double page sommaire avant de coder les fiches.
- Étape 2 : correction de la véritable animation de feuilletage.
- Étape 3 : gabarits et première fiche réelle vérifiée par type.
- Étape 4 : récupération et import contrôlé des vraies fiches Discord.
- Travailler exclusivement sur la branche developpement/phasmo-v2 et ne rien publier sur main sans validation.


### Mise en oeuvre expérimentale du 25/10/2026 — NON VALIDÉE VISUELLEMENT
- V2 coque et sommaire codée sur developpement/phasmo-v2, via public/index.html et public/modules/phasmophobia/journal.{css,js}.
- Décor de livre entièrement CSS : parchemin texturé, tranche/reliure, légers filigranes provisoires. Aucune capture Discord incorporée dans la page ou utilisée comme arrière-plan.
- Sommaire à deux pages reprenant les cinq rubriques visibles dans les captures : Entités, Équipements, Maps, Objets maudits, Divers.
- Libellés visibles transcrits manuellement depuis la capture Discord uniquement pour tester la navigation ; orthographe, listes exhaustives et contenus des fiches encore à vérifier avant publication.
- Les noms du sommaire ouvrent des fiches vides dédiées. Retour au sommaire et languettes latérales opérationnels ; sur téléphone, lecture page gauche / page droite séparément.
- L'ancienne animation de demi-pages qui s'écartent a été SUPPRIMÉE ; elle est remplacée par un bref fondu sans faux tournage. Une véritable feuille qui pivote reste explicitement À FAIRE après validation visuelle.
- Police manuscrite Caveat / Kalam récupérée via Google Fonts avec polices de repli si indisponible.
- Aucune modification de main ni déploiement OVH ; demander une capture Live Server pour valider dimensions, disposition et lisibilité.


### Journal V2 — navigation hiérarchique validée (25/10/2026)

Décision utilisateur à appliquer sur le journal interactif. Cette section décrit la navigation souhaitée ; elle ne signifie pas que le code actuel l'implémente déjà entièrement.

- **Première ouverture du journal / accueil :** afficher un sommaire général présentant les différents accès cliquables : Entités, Maps, Équipements, Objets maudits, Divers et les sous-sections comme Médias selon l'organisation finale. Un bouton discret permet de revenir au sommaire général depuis chaque vue.
- **Clic sur une catégorie depuis le sommaire ou sur son onglet physique :** ouvrir systématiquement la **page d'accueil de cette catégorie**, avec sa liste de fiches cliquables. Exemple : cliquer « Entités » affiche la liste des entités, même si on se trouvait précédemment sur la fiche Obambo.
- **Clic sur un élément de la liste :** ouvrir sa fiche détaillée dans la catégorie correspondante, sans quitter le livre. Exemple : « Obambo » → catégorie Entités → fiche Obambo.
- **Flèches latérales depuis une fiche :** parcourir la fiche précédente/suivante **dans la même catégorie**, dans un ordre déterminé par la liste de cette catégorie ; ne pas passer automatiquement à une catégorie différente.
- **Retour à la liste :** un clic sur l'onglet de la catégorie courante ramène immédiatement à la liste de ses fiches. Cette règle vaut pour Entités, Maps, Équipements, Objets maudits, Divers et leurs éventuelles subdivisions.
- **Navigation directe entre catégories :** depuis n'importe quelle fiche, sélectionner un autre onglet ouvre l'accueil de l'autre catégorie ; aucun passage obligé par le sommaire général.
- **À préciser pendant l'implémentation :** comportement en début/fin de liste (flèche désactivée ou boucle) ; classement des entrées ; placement exact de Médias parmi les cinq onglets physiques existants ; éventuel découpage des longues listes en plusieurs pages. Ne pas présumer ces arbitrages.
- **Technique :** séparer l'état de navigation (accueil général / catégorie / fiche, identifiant de catégorie, identifiant de fiche), afin que contenu, onglets et flèches reflètent tous la même sélection.
