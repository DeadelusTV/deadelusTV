# Phasmophobia V2 — suivi des travaux du carnet (branche de développement)

**Statut : prototype en cours, non publié sur `main`.** Ce fichier rassemble les notes spécifiques de `developpement/phasmo-v2`, précédemment consignées dans son README, afin de ne pas les perdre lors de la synchronisation avec la documentation officielle. Il ne valide pas la publication du livre interactif.

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


### Phasmophobia — clarification de la navigation et idées futures (25/10/2026)

**Statuts distincts :** les menus déroulants existants relèvent du **développement de la page en cours**. Le blog/news, la rédaction en ligne, le carrousel d'actualités, les tutos à structurer et les tournois communautaires sont des **pistes à développer après finalisation de la page**, sauf décision ultérieure explicite.

#### Navigation déroulante : chantier actuel
- La capture utilisateur montre la section « Où trouver les ressources ? » et des **accordéons** : « Les tutoriels en vidéo », « Le carnet des entités », « Les enquêtes ensemble » ; un clic sur la flèche ouvre/referme le contenu du panneau. Cette interaction de déroulement fait partie des travaux de page **actuels**.
- Il ne s'agit **pas** d'un défilement automatique de la page, ni des cinq onglets physiques du journal, ni nécessairement de trois pages Web distinctes.
- La structure envisagée à terme est **News / Livre / Tutos**, en conservant le principe d'accès par rubriques déroulantes à discuter lors du développement final. Ne pas remplacer les panneaux actuels sans validation.

#### Blog / actualités Phasmophobia : fonctionnalité future
- Source : actualités du **blog des développeurs Kinetic Games**, liées à Phasmophobia. Une autre personne de la communauté effectue déjà les **traductions françaises** des actualités du blog développeur ; l'objectif est de les publier sur le site sous forme d'articles, avec crédit/source et lien vers l'original.
- **Carrousel** : **9 vignettes d'actualités traduites**, plus **une 10e vignette fixe** qui renvoie directement à **https://www.kineticgames.co.uk/news**. Cette 10e vignette ne doit pas être remplacée par une actualité. Prévoir un **système d'archives** pour les anciennes publications.
- Prévoir un **accès de rédaction spécifique** à la personne chargée des traductions, qui **n'est ni Deadelus ni l'utilisatrice** ; permissions limitées à l'espace news Phasmophobia, sans droits d'administrateur général, sans accès aux autres univers ni aux réglages sensibles. Identité, authentification et workflow de publication à déterminer avant implémentation.
- L'éditeur de news sera **simple et en ligne** : formulaire guidé avec titre, source originale, texte riche, mise en page et insertion d'images **en blocs dans le flux du texte**, à l'emplacement choisi (pas en arrière-plan du texte, pas besoin d'écrire du HTML). Aperçu avant publication, gestion de stockage d'images et contenus à concevoir. Prévoir sécurité des fichiers et du contenu saisi.
- Ne pas supposer que la reproduction intégrale des articles ou images Kinetic est automatiquement autorisée : clarifier droits d'usage/crédits avant publication.

#### Livre et tutos
- **Rubrique « Livre »** : accès au journal Phasmophobia interactif actuellement prototypé en dehors du déploiement public. Navigation interne du livre conservée : Sommaire général → liste par catégorie → fiche ; onglet de catégorie = retour à sa liste ; flèches dans une fiche = fiche précédente/suivante de la même catégorie.
- **Rubrique « Tutos »** : accès aux ressources pédagogiques et tutoriels ; forme et alimentation à décider ultérieurement.

#### Événements participatifs / tournois : idée future, pas de développement immédiat
- Idée : **duels de badges Phasmophobia**, ou de **fantômes/entités**, d'**équipements/matériel**, ou de toute autre catégorie choisie pour l'événement. Chaque confrontation est soumise au **vote de la communauté** ; un arbre affiche gagnants/perdants et progressions jusqu'au vainqueur.
- **Durée variable en fonction de l'événement et de son sujet** : l'exemple « deux semaines » évoqué précédemment n'est **pas** une durée fixe. Le format, les dates, le nombre de manches et les règles sont à paramétrer pour chaque événement.
- **Récompense envisageable, acceptée comme piste :** un booster TCG lié à la participation au vote. Plafonds, timing de l'attribution, conditions d'éligibilité et intégration TCG restent à décider ; ne pas créer de boosters automatiquement sans ces validations.
- **Connexion et anti-abus à étudier :** authentification Twitch **ou** Discord (choix non arrêté), contrôle d'ancienneté du compte ou autre signal approprié, prévention des comptes multiples/votes répétés, cohérence avec les règles existantes du TCG, protection des données.
- Le vote ne devrait pas exiger des permissions disproportionnées et la solution de vérification d'ancienneté dépendra des données effectivement accessibles à la plateforme choisie.

**Priorités enregistrées :** 1) finir les menus accordéon et la page Phasmophobia en cours, avec prototypes du journal hors ligne ; 2) développer ensuite news, édition déléguée, archives et tutos selon validation ; 3) étudier les tournois, le vote sécurisé et les boosters comme évolution ultérieure.

**Limite :** notes seulement dans la branche developpement/phasmo-v2. Aucune modification de main, du site public, des permissions ni des règles du TCG.


### Mise en page Phasmophobia : prototype du 26/10/2026

**Statut : sur `developpement/phasmo-v2` uniquement ; non validé visuellement et non publié.**

- Trois accordéons accessibles : **News**, **Livre**, **Tutos**. Les trois rubriques sont désormais fermées par défaut. Les rubriques peuvent être ouvertes indépendamment.
- Livre reprend l'accès au carnet interactif existant, sans changer la navigation à l'intérieur.
- Tutos conserve la synchronisation YouTube et l'accès à la playlist entière, mais affiche au plus **10 Shorts au lieu de 12**, dans l'ordre choisi dans la playlist. Ses flèches se recalculent lors de l'ouverture.
- News contient une zone d'attente et un lien externe vers Kinetic Games. **Aucune actualité fictive et aucun éditeur ou traitement automatique** n'a été ajouté.
- À développer après validation : 9 cartes d'actualités traduites + 1 carte fixe vers Kinetic Games, archives, gestion des images et des droits de reproduction, permissions de rédaction limitées à Phasmophobia et validation avant publication. Les 9+1 cartes News sont indépendantes de la limite des 10 Shorts.


### Retours de mise en page (26/10/2026)

- Garder la présentation et le style des menus News / Livre / Tutos. Les trois accordéons sont fermés par défaut.
- Shorts YouTube : 10 vidéos maximum conservées dans leur ordre, suivies d'une 11e carte permanente vers la playlist complète, même en cas d'indisponibilité des miniatures.
- News : garder la présentation actuelle pour l'instant. Lorsque des articles seront disponibles, créer un carrousel de neuf vignettes d'articles traduits et une dixième vignette fixe vers Kinetic Games. La vignette fixe, illustrée comme les autres, remplacera alors le bouton actuel « Actualités officielles ». Référence visuelle : vignettes des news Kinetic Games, avec présentation horizontale en carrousel plutôt qu'en grille.
- Ne pas créer d'articles fictifs. Aucun changement sur la branche principale.

### Priorité blog Phasmophobia (26/10/2026)

Décision : la rubrique **News devient un chantier prioritaire**, après validation de l'aspect des accordéons. Le déroulant News reste fermé par défaut et sa présentation d'attente n'est pas remplacée tant qu'il n'y a aucun article réel.

- **Socle de lecture seule développé sur cette branche :** `modules/phasmophobia/news.js`, `news.css`, `data/phasmo-news.json` (vide), prise en charge des liens `#phasmophobia/news` et `#phasmophobia/news/{slug}`.
- Contenu prévu : **9 vignettes de traductions + 1 vignette Kinetic permanente**, lecture intégrée, attribution de la traduction, lien original et archives au-delà des neuf plus récentes.
- **Non réalisé à ce stade :** éditeur en ligne, stockage et publication serveur, authentification, permissions du compte rédacteur, workflow de relecture. Ne pas confondre l'interface de lecture avec un blog opérationnel.
- **Référence de spécification :** `docs/phasmo-blog-spec.md`, avec décisions prises, fonctionnement du prototype et points restant à arbitrer.
- **Droits à clarifier :** la politique officielle Kinetic relative aux créations de fans n'est pas une autorisation explicite de republier toutes leurs actualités et images traduites. Obtenir une autorisation adaptée si nécessaire, ou préférer des résumés originaux avec un lien vers la source.
- **Périmètre strict :** aucun changement sur `main` ni sur les données Supabase.


### Publication directe du blog — décision du 26/10/2026

- Le rédacteur des traductions Phasmophobia est un membre expérimenté de la modération de DeadelusTV. Il assure déjà les publications d'actualités Discord en autonomie et est considéré comme une personne de confiance.
- **Publication directe validée** : création, brouillons, aperçu, publication immédiate et corrections après publication **sans validation préalable** par Deadelus ou par la responsable du site.
- Les droits restent strictement réservés à **News Phasmophobia** ; pas d'accès administrateur général, au TCG ni aux autres modules. L'authentification et les permissions doivent être effectivement vérifiées côté serveur.
- À choisir ultérieurement : mode de connexion, modalités de dépublication/suppression, historique. Les autorisations ne seront pas automatiquement déduites de son statut de modérateur Discord.
- Les comptes, services de publication et droits réels **ne sont pas encore configurés**. La décision est documentée dans `docs/phasmo-blog-spec.md` ; aucun changement à la branche `main` ni à la base Supabase.


### Prototype de rédaction News (26/10/2026)

- Éditeur accessible dans la branche `developpement/phasmo-v2` via `public/modules/phasmophobia/editor-preview.html` ; il n'est pas ajouté au menu public.
- Plusieurs brouillons locaux, champs de l'article, création/déplacement/suppression de blocs paragraphes, titres, listes et images, aperçu et export JSON.
- Les images locales sont temporaires, sans persistance ni transfert serveur ; **aucune publication active**, aucun compte ni droit éditorial attribué.
- Les identités Twitch/Discord sont prévues au niveau d'un profil DeadelusTV commun, avec le rôle éditorial `phasmo_news_editor` strictement limité au blog.
- Attention : Supabase héberge actuellement deux projets distincts, Crewmong Us et TCG ; les connexions ne sont pas automatiquement communes. L'architecture de compte unifié reste à mettre en œuvre avant d'activer le blog.
- Ne touche pas à `main` ni aux bases Supabase.


### Images dans l'éditeur de blog (26/10/2026)

- Validation utilisateur : les illustrations **ne doivent pas nécessiter une manipulation du dossier `assets`**. Deux choix dans l'interface : importer depuis le PC ou coller une URL directe d'image (HTTPS), autant pour la couverture que pour les images au fil des paragraphes.
- Le prototype `editor-preview.html/js/css` accepte désormais les deux méthodes, plus les anciens chemins `assets/phasmo-news/...` pour compatibilité.
- Une image PC donne un aperçu temporaire, sans envoi serveur et sans inclusion dans l'export JSON. Une image externe est prévisualisée directement par le navigateur et son URL reste dans le brouillon local, mais elle peut être bloquée par le site source.
- **Pour la publication réelle** : héberger les fichiers et les images autorisées via un stockage contrôlé, sans faire dépendre les articles de liens externes ni permettre de récupérer n'importe quelle URL côté serveur. Règles d'upload, droits et sécurité à définir lors du raccordement.
- Aucun changement dans `main`, aucune modification de Supabase.


### Mise en page des articles : images au milieu du texte (26/10/2026)

- **Disposition validée :** paragraphe → paragraphe → image dans le flux du texte → paragraphe → paragraphe, comme les billets du blog Kinetic Games. Aucun placement en arrière-plan et pas de galerie distincte.
- L'éditeur `editor-preview.js` propose sous chaque bloc « + Texte ici » et « + Image ici », insérant le nouveau bloc **juste après celui qui précède** ; on peut toujours réordonner ensuite avec les boutons Monter / Descendre.
- Chaque image peut être ajoutée via sélection PC ou lien HTTPS, avec texte alternatif et légende facultative. L'aperçu et le lecteur public respectent l'ordre des blocs.
- Ce chantier reste sur `developpement/phasmo-v2` ; pas d'authentification ou publication serveur ajoutée, pas de changement sur `main` ou sur Supabase.
