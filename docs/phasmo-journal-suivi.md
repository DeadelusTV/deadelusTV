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


### Éditeur visuel WYSIWYG pour le blog (26/10/2026)

- À la demande de simplification, la rédaction passe à un **éditeur façon traitement de texte** (Tiptap 3 en JavaScript vanilla). Il remplace à l'écran le système de blocs précédent, dont les fichiers sont conservés mais non chargés.
- L'éditeur autorise le texte libre, gras, italique, souligné, deux styles de sous-titre, alignements, listes, liens, annuler/rétablir, avec images insérées directement au curseur par fichier, URL HTTPS, collage ou glisser-déposer.
- Les anciens brouillons locaux sont migrés dans une nouvelle clé sans effacer le stockage du prototype précédent ; l'aperçu restitue le document riche, et l'export reste un brouillon JSON.
- Attention : le fichier PC n'est pas conservé après rechargement ; un rappel remplace l'image dans le document sauvegardé. La publication et les permissions serveur restent inactives. L'éditeur dépend pour l'instant de la disponibilité du CDN Tiptap (`3.31.3`) pendant les tests.
- La lecture publique attend encore l'ancien schéma par blocs. Il faudra sécuriser l'interprétation du nouveau document riche lorsque le blog sera relié au stockage de publication.
- Travail exclusivement sur `developpement/phasmo-v2`, sans modification de `main` ni des projets Supabase.


### Correctif WYSIWYG après test utilisateur (26/10/2026)

**Constats du test initial :** touche Entrée inactive, boutons gras/italique/alignement/listes/images sans effet, clic possible seulement sur le rectangle blanc de la première ligne au lieu de l'ensemble de la zone.

- Correctif ciblé sur `developpement/phasmo-v2` : la page de test charge désormais `editor-native.js` à la place du prototype Tiptap/CDN, dont le fichier est conservé hors exécution. Aucun téléchargement externe de bibliothèques n'est nécessaire pour l'éditeur.
- CSS corrigé pour que `#wys-editor.tiptap` et non un descendant hypothétique occupe la hauteur, prenne le focus et accepte les clics sur toute la surface.
- Commandes de mise en forme via fonctions natives du navigateur pour la démonstration : **limitation** importante, `document.execCommand` est déprécié. La future version destinée à la publication devra revenir à un éditeur maintenu correctement bundlé et testé en navigateur.
- Le système conserve le format de brouillon JSON, la sauvegarde locale, la lecture des anciens brouillons, l'aperçu et l'export. Les images PC restent temporaires. Le bouton Publier reste désactivé.
- Une duplication de versions internes de ProseMirror constitue une **cause possible**, déjà documentée par ses mainteneurs pour des symptômes similaires lors de l'utilisation de CDN ; sans trace console de ce navigateur, ne pas la présenter comme certaine.
- Correctifs de code vérifiés statiquement et par tests de conversion, mais **régression interactive dans le navigateur encore à confirmer**. Aucune modification de `main` ou des projets Supabase.


### Validation éditeur et protection du rédacteur unique (26/10/2026)

- **Ergonomie de l'éditeur WYSIWYG corrigé validée par l'utilisatrice après test.** Ce n'est pas une validation technique de son moteur déprécié pour la production.
- Prochain chantier : intégrer le blog aux News Phasmo et afficher les articles en page de lecture dédiée, avec une URL partageable, un fond adapté et les archives.
- Ajouter un espace privé de rédaction avec bouton « Gérer les actualités » visible uniquement pour le compte autorisé. Une URL cachée ne constitue pas une sécurité.
- Connexion principale prévue avec Twitch, Discord associable ; accorder `phasmo_news_editor` **manuellement à un seul UUID utilisateur**, avec RLS et restrictions Storage/API côté serveur. Aucun privilège administrateur général ni sur le TCG.
- Le blog public charge encore un JSON statique de test vide : prévoir une source dynamique des articles publiés ou un déploiement serveur à la publication, sans exposer les brouillons.
- Auth commune à définir entre les projets Supabase existants avant attribution effective des droits. **Aucun déploiement, aucune table ni aucun compte nouveau créés à ce stade.**


### Clarification connexion unique et droits indépendants (26/10/2026)

- Crewmong Us utilise un **compte e-mail d'une personne différente** : il ne participe pas aux comptes visiteurs / rédacteur du site DeadelusTV ; ne plus l'introduire comme obstacle au blog.
- Proposition préférée pour minimiser les connexions : **Twitch comme connexion principale DeadelusTV**, liaison **Discord facultative** pour les fonctionnalités utiles, sans connexion distincte obligatoire au blog.
- Le rédacteur Phasmo est aussi modérateur Twitch et doit conserver **ses droits de modération TCG**, qui sont partagés avec d'autres comptes modérateurs ; **seul son compte** doit obtenir séparément `phasmo_news_editor`.
- Protection côté API/RLS/Storage avec identifiant Auth exact ; ne jamais accorder l'édition News automatiquement en fonction des rôles Discord, Twitch ou TCG.
- Principe enregistré dans `docs/phasmo-blog-spec.md` sans implémentation ni changement de base, ni déploiement sur `main`.


### Audit technique Twitch / TCG → authentification DeadelusTV (26/10/2026)

- Audit **en lecture seule** de l'existant Supabase TCG : identités `twitch` présentes, `tcg_accounts.user_id` et `tcg_admins.user_id` rattachés à `auth.users`, `tcg_is_admin()` fondé sur les seuls rôles TCG `owner/admin/editor`, politique de lecture privée déjà en place pour les comptes et inventaires TCG.
- `tcg_viewers.is_moderator` (statut Twitch) **ne vaut pas** autorisation de rédaction ou pouvoir administrateur TCG. Seul le compte exact du rédacteur recevra `phasmo_news_editor`.
- **Condition pour la connexion unique** : vérifier le véritable frontend TCG actuellement déployé, son origine et la gestion des sessions OAuth. Des origines différentes ne partagent pas automatiquement le stockage du navigateur.
- Discord facultatif ; aucun lien d'identité Discord n'est présumé déjà opérationnel.
- Rapport complet, risques, prérequis et plan de tests : `docs/phasmo-audit-auth-twitch.md`.
- **Aucune écriture Supabase, aucun compte créé et aucune modification de `main`**.

### Préparation de l'accès privé pour le rédacteur (26/10/2026)

- Priorité utilisatrice : rendre l'éditeur rapidement accessible au rédacteur, **sans attendre le TCG complet**.
- Nouvelle page privée `public/modules/phasmophobia/editor-private.html`, contrôlée par `editor-private.js` (Twitch via Supabase Auth TCG, profil vérifié côté serveur, rôle News séparé des droits TCG). Le moteur `editor-native.js` sauvegarde sur Supabase uniquement si le backend privé est injecté ; la démo validée reste en mode local.
- Règles de tables privées préparées dans `docs/phasmo-news-sql-a-revoir.sql`, avec un seul compte rédacteur actif et RLS. **SQL jamais appliqué à la base** ; aucune personne n'a reçu le rôle.
- La connexion ne sera opérationnelle qu'après ajout de la redirection OAuth, application contrôlée des tables et RLS, identification et attribution du compte Twitch. Guide : `docs/phasmo-acces-redacteur-mvp.md`.
- Premier lot : brouillons de texte côté serveur, export local de secours ; fichiers images du PC encore temporaires, et publication désactivée.
- Tests de contrôles d'accès sur mocks 9/9 réussis, tests RLS et authentification Twitch réelle encore à conduire après configuration. Aucun changement `main` ni production TCG.


### Migration des droits de rédaction Phasmo activée (26/10/2026)

- Autorisation utilisateur de passer à la suite : installation de la migration Supabase `phasmo_news_editor_single_account_private_drafts_v1` dans le projet **DeadelusTV TCG**, sans modification des tables TCG existantes.
- Vérification post-migration : `phasmo_news_editors` et `phasmo_news_drafts` créées, RLS activée, **5 politiques**, **0 rédacteur autorisé**, **0 brouillon enregistré**. La migration a retourné succès.
- Le code privé reste sur `developpement/phasmo-v2`, sans publication sur `main`.
- **À faire pour premier accès réel :** ajouter l'URL exacte de l'éditeur dans les Redirect URLs Supabase Authentication, vérifier le retour OAuth Twitch et recueillir l'UUID du compte Twitch authentifié du rédacteur pour attribuer `phasmo_news_editor`. Ne pas ouvrir par défaut à tous les modérateurs.
- Un contrôle des conseillers de sécurité Supabase a affiché des avertissements liés à des composants préexistants du TCG / de la base ; aucun ne concerne les deux nouvelles tables Phasmo. Aucun changement hors périmètre appliqué.


### Compte rédacteur et lien direct News (26/10/2026)

- Rédacteur désigné : **mattarix_**, profil public https://www.twitch.tv/mattarix_. Le pseudo sert à organiser les essais, pas à fournir une preuve d'identité ni un rôle automatiquement.
- Contrôle en lecture seule Supabase : **aucune identité Twitch existante contenant mattarix dans les champs d'identité**, et zéro rédaction habilitée. Il faut une première connexion Twitch pour obtenir l'UUID Auth exact avant attribution manuelle ; aucun compte n'a été créé/autorisé.
- Rubrique News `public/index.html` enrichie d'un petit lien de connexion Twitch et du bouton « Gérer les actualités » ; logique `public/modules/phasmophobia/news-access.js` + CSS. Bouton d'édition rendu **seulement après validation côté base** de `phasmo_news_editors.enabled` pour `auth.uid()`.
- 11/11 scénarios JavaScript simulés validés (anon, viewer non autorisé, rédacteur, callback, logout). Pas encore de test OAuth réel ni de publication.
- Environnement de présentation Cloudflare déjà existant `https://deadelustv.pages.dev`, branche `preview/presentation-deadelus` : la branche de démo est en retard sur les nouveaux modules Phasmo ; **pas de fusion ni de remplacement global effectué**. `main` non modifiée.


### Premier test réel par l'administratrice sur Cloudflare (26/10/2026)

- **Retour utilisatrice positif :** la connexion Twitch sur l'URL de développement Cloudflare a fonctionné, avec accès effectif à l'éditeur depuis son compte administratrice.
- L'éditeur WYSIWYG a été testé avec succès, notamment le **collage direct d'une image copiée** ; l'**export d'un brouillon au format JSON** sur le PC fonctionne.
- **Portée précise de la validation :** l'authentification réelle, le contrôle d'accès administrateur, l'ouverture de l'éditeur, le collage visuel et l'export local sont validés par essai utilisateur. **La persistance après F5 d'un brouillon Supabase n'a pas encore été explicitement confirmée** dans ce retour ; le stockage durable des images collées n'est pas implémenté : les images du PC/presse-papiers utilisent encore des blobs temporaires et ne sont pas intégrées au JSON exporté.
- **Suite recommandée :** vérifier création d'un brouillon, saisie de texte, clic « Enregistrer », F5 et restauration du contenu ; puis implémenter le stockage persistant des images avant de préparer la publication publique. La connexion du rédacteur mattarix_ reste à effectuer séparément.


### Confirmation persistance des brouillons après F5 (26/10/2026)

- **Validation réelle par l'utilisatrice** sur la branche de développement Cloudflare : après enregistrement puis actualisation **F5**, le brouillon et son contenu textuel sont **conservés et retrouvés**.
- Confirmation concomitante : une **image collée dans le corps de l'article disparaît au rechargement**. C'est le comportement temporaire attendu du prototype, qui n'a pas encore de stockage permanent des images.
- **Statut :** connexion Twitch administratrice et restauration du brouillon validées en essai réel ; prochaine étape technique recommandée : stockage pérenne des images de rédaction dans Supabase Storage avec restrictions d'accès par rôle News et sécurité RLS, sans toucher aux droits TCG. Le flux de publication publique reste hors service.


### Images des brouillons persistantes : Storage privé (26/10/2026)

- Accord utilisatrice pour implémenter la sauvegarde permanente des **images collées dans le texte**, importées depuis le PC et des **couvertures** après validation du stockage textuel après F5.
- Migration SQL **appliquée avec succès** : `phasmo_news_draft_private_images_storage_v1` (source conservée dans `docs/phasmo-news-storage-migration.sql`). Création d'un bucket **privé** `phasmo-news-draft-images`, **2 Mio par fichier**, PNG/JPEG/WebP uniquement ; RLS SELECT pour le rédacteur sur son dossier et pour l'administratrice News, INSERT uniquement dans le propre dossier de l'utilisateur autorisé. **Aucune modification du bucket public TCG**. Pas d'UPDATE ni DELETE de ces fichiers depuis le navigateur à ce stade.
- Backend `editor-private.js` : upload authentifié vers Supabase Storage, stockage en JSON d'une **référence `phasmo-media:<UUID>/<UUID>.<extension>`**, téléchargement privé à l'affichage et URL blob locale temporaire. Les octets de l'image ne sont jamais insérés dans les brouillons JSON. Compatible session Twitch commune.
- Éditeur `editor-native.js` : collage, dépôt/choix image, couverture, conversion de la référence après upload, sauvegarde du brouillon attendant les envois en cours. Statut de sauvegarde visible ; erreur signalée si upload refusé. La démo `editor-preview.html` **reste 100 % locale et inchangée**.
- Aperçu privé `editor-private.html` et messages actualisés. L'export JSON inclut les références de fichiers mais **n'embarque pas les fichiers images** et n'est pas autonome hors du site.
- Vérifications : état bucket et deux politiques RLS confirmés en base, 9/9 simulations backend upload/lecture/F5, 10/10 tests statiques d'intégration du moteur. **Le fonctionnement en session Twitch réelle avec collage puis F5 doit encore être validé par l'utilisatrice**, ainsi que les images de couverture et la reconnexion depuis un autre appareil.
- À prévoir après la publication : mécanisme distinct de publication d'images (les références de brouillons restent privées) et nettoyage audité des fichiers orphelins/supprimés. Aucune publication publique activée.


### Validation réelle de la persistance texte + images après F5 (26/10/2026)

- **Test validé explicitement par l'utilisatrice** sur l'éditeur privé de la branche Phasmo déployée sur Cloudflare : après sauvegarde et actualisation **F5**, **le texte ET l'image insérée sont toujours présents** dans le brouillon.
- Ce résultat confirme dans un navigateur réel la restauration du brouillon texte et de son image depuis le stockage privé Supabase après rechargement, pour le parcours testé avec le compte administratrice Twitch.
- **Statut : fonctionnalité « images persistantes dans les brouillons » validée pour le cas testé.** Ne pas confondre avec une validation exhaustive des formats, des couvertures, d'un autre appareil, ou de la publication publique.
- Prochaine étape possible : premier accès du rédacteur mattarix_ (connexion Twitch, attribution du rôle après vérification de l'UUID) et/ou chantier de publication avec images rendues publiques par un flux distinct, sans exposer les fichiers des brouillons.
