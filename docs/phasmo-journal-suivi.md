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


### Publication des News sur le canal de développement (26/10/2026)

- Demande validée de poursuivre jusqu'à la **publication des articles**, la **lecture publique**, la **modification ultérieure** et la **gestion des images publiées**, en restant sur `developpement/phasmo-v2` pour le code.
- Migrations Supabase **appliquées** : `phasmo_news_preview_publication_and_media_v1` puis `phasmo_news_anonymous_reader_separate_rls_v1` ; sources : `docs/phasmo-news-publication-preview.sql`, `docs/phasmo-news-public-reader-rls.sql`. Table `public.phasmo_news_articles`, canal `stage='preview'`, RLS visiteurs/publications et permissions de publication réservées aux rôles Phasmo ; pas de création de publication de production depuis ce parcours. Table créée initialement vide.
- Bucket `phasmo-news-published-images` **public** distinct du bucket privé `phasmo-news-draft-images`, avec politique d'upload accordée aux seuls comptes rédaction/admin News dans leur propre chemin `preview/<UUID>/<UUID>.<ext>`. Les fichiers privés sont téléchargés puis copiés en public seulement au clic **Publier sur la démo**, pas pendant la sauvegarde du brouillon.
- `editor-private.html` : bouton publier, liste des publications, ouverture d'une révision, accès au lien de l'article et retrait de la publication. `editor-native.js` : publication du brouillon en snapshot, maintien du brouillon privé, mise à jour de la version publique et sauvegarde du lien de révision. `news-publication.js` : validation source Kinetic, slug, titre, résumé, texte et images ; upload public contrôlé ; possibilité de dépublication.
- `news.js` : chargement du flux des articles `preview/published` depuis la REST API Supabase, repli vers le fichier d'archives statique ; rendu en DOM du document JSON riche **sans `innerHTML`**, titres, marques, listes, images, liens partageables `#phasmophobia/news/<slug>`.
- **Tests** : 11/11 simulations JS du service de publication (création, copie médias, révision, dépublication, contrôles des entrées), 17/17 contrôles statiques d'intégration, lectures anonymes SQL validées, audit des règles sans nouvelle alerte propre à Phasmo. **Aucun faux article réellement publié** dans Supabase durant ces tests.
- **Test réel restant** : l'utilisatrice se connecte sur l'URL Cloudflare de branche, crée/ouvre un brouillon de test, ajoute texte et image, clique Publier sur la démo, vérifie l'article public dans News en navigation privée, rouvre la publication via la liste, modifie puis republie, retire ensuite l'article du canal preview. L'édition depuis la page privée est soumise aux droits Twitch existants.
- **Important** : les publications `preview` sont publiquement lisibles via leur URL API et les URL de démo. Ne pas y mettre de secrets. Aucun changement `main` ni déploiement `www.deadelustv.com`. Avant lancement officiel : nouveau parcours/contrôle `production` et gestion de nettoyage des images publiques orphelines à concevoir.


### Recette publication et ergonomie éditeur (26/10/2026)

- Validation réelle par l'utilisatrice sur la démo Cloudflare : **affichage public en navigation privée OK ; modification d'un article publié OK ; retrait OK ; remise en ligne OK**.
- Bug ergonomique constaté : la raison d'échec de publication était affichée sous la zone de rédaction, au bas de la page. Correction sur `developpement/phasmo-v2` : l'alerte est désormais **placée juste sous la barre d'actions**, avant les champs, avec défilement automatique vers le haut en cas d'erreur. Vérification préalable du titre, du résumé, de la date, du lien HTTPS Kinetic Games et du slug ; champs invalides signalés visuellement.
- Ajout du bouton **Importer un JSON** sur l'éditeur privé : import des exports `schemaVersion:2` / `status:draft`, fichier au maximum 1,2 Mo, parsing/normalisation du document JSON, **nouvel identifiant UUID et nouveau brouillon**, sans écraser les brouillons existants ni reproduire de référence d'article déjà publié. L'import déclenche la sauvegarde Supabase du brouillon privé.
- **Limite du format** : le JSON ne contient pas les octets des images privées. Les références d'images importées restent valables uniquement si le compte a accès aux images privées d'origine. Pour un transfert autonome/hors-ligne il faudra une fonction d'export média distincte.
- Clarification de l'image de couverture : elle sert à la **vignette dans News** et à la **grande image en tête d'article**. Elle ne constitue **pas un arrière-plan général de la rubrique News**.
- Formats import PC/presse-papiers validés par code : PNG, JPEG et WebP, maximum 2 Mio par image. GIF et SVG non acceptés.
- **Accès mattarix_ : reporté explicitement par l'utilisatrice** jusqu'à la validation et mise sur `main` ; ne pas le pousser à se connecter à la démo pour l'instant.
- Régressions techniques : 12/12 vérifications statiques sur les correctifs de l'éditeur. **Essai réel du bouton Importer et de la nouvelle position des alertes restant à valider dans le navigateur.**


### Validation utilisatrice : alertes, import JSON et F5 (26/10/2026)

- **Validation en conditions réelles** par l'utilisatrice sur l'éditeur privé de développement :
  - messages d'erreur de publication désormais bien visibles **en haut de l'éditeur** ;
  - bouton **Importer un JSON** fonctionnel ;
  - contenu du brouillon importé conservé après **F5** (persistance confirmée).
- Correctifs concernés : `editor-private.html`, `editor-private.css`, `editor-native.js`. Les essais utilisateur ferment les points ouverts de la recette précédente.
- Reste à contrôler séparément avant ouverture officielle : erreurs d'upload et limite 2 Mio, image de couverture, autres appareils/comptes, prévention des pertes de travail, liens et publication après transfert sur `main`. **L'accès du rédacteur mattarix_ attend explicitement le passage sur `main`**.
- Aucun changement demandé ni effectué sur `main` dans cette étape.


### Médias animés et vidéos YouTube : développement (26/10/2026)

- Demande utilisatrice : permettre les images animées (notamment les WebP sur les annonces Kinetic Games, p. ex. `Phasmophobia Quality of Life Preview #2` et le média `TWITCHDROPS.webp`) et les vidéos insérées dans l'article (YouTube représente l'essentiel des besoins).
- Le WebP (y compris animé) était déjà un type d'image admissible, mais **le presse-papiers peut figer une animation en capture PNG**. Aucun traitement d'image n'est effectué : le fichier GIF/WebP animé d'origine ou son URL HTTPS directe est nécessaire pour conserver les frames.
- Migration Supabase appliquée : `phasmo_news_animated_gif_webp_storage_v1`; SQL conservé dans `docs/phasmo-news-animation-gif-storage.sql`. Les **deux buckets Phasmo uniquement** acceptent désormais PNG/JPEG/WebP/GIF, maximum **10 Mio** par fichier, avec règles INSERT strictes sur l'UUID du compte et le rôle News, sans modifier les politiques TCG.
- `editor-private.js` accepte les GIF sauvegardés en `phasmo-media:<UUID>/<UUID>.gif` et les récupère après F5 ; `editor-native.js` accepte les GIF et WebP animés dans le corps et la couverture, par fichier ou par URL.
- Bouton **+ Vidéo YouTube** dans les éditeurs privé et de démonstration locale : reconnaît les liens HTTPS `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/live/`, `youtube.com/embed/` ; stockage du nœud `{type:'youtube',attrs:{videoId:'...'}}` après validation d'un identifiant de 11 caractères.
- Dans l'éditeur, un bloc vidéo non modifiable dans son contenu peut être retiré ou ouvrir YouTube. Dans l'aperçu et le lecteur News public, le panneau vidéo n'ajoute un iframe `youtube-nocookie.com` **qu'après clic**, afin d'éviter les requêtes tierces automatiques. CSS responsive et règles de sécurité inchangées pour la publication `preview`.
- Tests techniques : 13/13 vérifications statiques de l'intégration + 6/6 simulations publication GIF, couverture et YouTube ; stockage et règles confirmés par SQL. **Essai en navigateur réel des deux nouveautés à réaliser**. Les vidéos MP4 uploadées/hébergées directement ne sont pas prises en charge à cette étape ; priorité donnée à YouTube.
- Ce travail reste sur `developpement/phasmo-v2`. Accès `mattarix_` toujours en attente du passage sur `main`.


### Vignettes YouTube visibles avant lecture (27/10/2026)

- Retour test réel : la vidéo YouTube s'affiche sous forme de rectangle sombre avec bouton « Lire la vidéo YouTube » **mais sans miniature**. Comportement initial intentionnel pour ne déclencher aucune ressource YouTube avant clic, mais résultat visuel jugé insatisfaisant.
- Correction sur `developpement/phasmo-v2` : vignette `https://i.ytimg.com/vi/<videoId>/hqdefault.jpg` affichée en arrière-plan du lecteur, dans **l'éditeur / aperçu** et **la page News publique**, `loading=lazy`, `referrerPolicy=no-referrer`, cadrage responsive 16:9 avec assombrissement pour lisibilité. Si image indisponible, retour au panneau neutre existant.
- La vignette fait désormais une requête vers **i.ytimg.com** avant clic (à signaler clairement) ; l'iframe `youtube-nocookie.com` et la lecture restent créées **seulement lors du clic**.
- 10/10 vérifications statiques de rendu/absence de chargement anticipé du lecteur. Attente de la recette réelle dans Chrome/Edge, en navigation normale et privée.
- Aucun changement Supabase, TCG ou `main`.


### Validation lecteur YouTube et consentement (27/10/2026)

- **Validation en conditions réelles par l'utilisatrice** : affichage du triangle Play seul sur la vignette YouTube et lancement du lecteur fonctionnent.
- **Déclaration de l'utilisatrice** : elle a intégré ce lecteur au mécanisme de consentement de lecture du site. Cette intégration n'a pas fait l'objet d'un contrôle technique indépendant dans ce tour.
- **À contrôler côté consentement** : les miniatures `https://i.ytimg.com/vi/<videoId>/hqdefault.jpg` sont chargées automatiquement dans la version actuelle, avant le clic sur Play. Leur chargement tiers doit être pris en compte par le dispositif de consentement si le choix utilisateur est censé bloquer toute requête YouTube préalable. L'iframe `www.youtube-nocookie.com` reste créé au clic dans le code de l'éditeur/lecteur.
- Aucun changement de code ni de réglage de consentement effectué lors de cette validation ; seule la documentation de suivi est mise à jour.


## Synchronisation avec le site principal — 27 octobre 2026

- Seul chantier fonctionnel actif confirmé par l'utilisatrice : le livre de preuves / carnet interactif, y compris la future administration des fiches décrite dans le README. Le prototype et ses contenus restent non validés pour publication.
- Base officielle intégrée : `0edd2e07f66ff8f02f70fda503c171b5768cb179` ; point de retour avant synchronisation : `b4b6577fa0fe7b79cd7630f71812cf6baeccb7aa`, conservé comme premier parent du commit de fusion.
- Accueil, autres univers, textes récents, routes légales, consentement global, mini-lecteur Twitch et corrections YouTube repris de main. Les sources `journal.js` et `journal.css`, le dialogue et les commandes du livre sont conservés sans modification.
- Exception technique volontaire : l'éditeur et le lecteur News de cette branche utilisent toujours `stage=preview` et `phasmo_news_drafts`. Les publications et brouillons officiels restent isolés. Les contrôles du consentement du lecteur public sont ceux de main. Ces différences d'environnement ne constituent pas un nouveau chantier News.
- Les anciens prototypes d'éditeur et documents de migrations sont conservés pour historique ; leur présence n'atteste ni de nouveaux travaux en cours ni de migrations à rejouer.
- Aucune fusion vers main ni modification de Supabase/OVH. L'ancien point `sauvegarde/avant-refonte-phasmo` reste inchangé.


## Carnet V4.3 et connexion Twitch commune au portail — décision du 27/10/2026

**Statut : intégration planifiée sur `developpement/phasmo-v2` ; non développée par cette note, non publiée sur `main`.** La conception du carnet a été validée comme base de travail dans l'atelier HTML autonome **V4.3 Carnet brun** (fond exact `carnet brun(1).png` fourni en conversation ; calques textes/images, zones cliquables, redimensionnement, suppression intégrée, export JSON). L'intégration au module Phasmophobia V2 du site est désormais à préparer, sans importer automatiquement le HTML de démonstration comme administration de production.

### Carnet : souplesse éditoriale indispensable

- Pouvoir gérer **depuis une interface privée en ligne** les entités, maps, équipements, objets maudits, divers, ainsi que les futures catégories, sous-catégories, champs, sections, conseils et médias ; aucun nom ou nombre de fiches fixé dans le code.
- Gérer l'ajout, l'édition, le classement, les images et leurs plans, les gabarits de page, les brouillons, la publication, l'archivage et, sous confirmation, la suppression ; les sommaires et flèches se mettent à jour depuis les contenus publiés.
- Permissions explicites : **Deadelus** pourra administrer le carnet ; la responsable du site pourra également y accéder **si le besoin est confirmé**. Les droits de rédaction News ne donnent **aucun** droit implicite au carnet, et inversement.
- Prévoir une importation/normalisation des réglages visuels JSON de l'atelier V4.3, sans exposer à tout le monde le mode de conception ni figer la mise en page du prototype.

### Authentification : mutualiser la connexion Twitch déjà présente

**Constat vérifié dans le code de cette branche :** `public/index.html` affiche un bouton « Connexion Twitch » **au sein de l'accordéon News** ; `public/modules/phasmophobia/news-access.js` initialise Supabase Auth via OAuth Twitch PKCE (`signInWithOAuth`), recharge la session et vérifie `phasmo_news_editors` puis `phasmo_news_admins`. `editor-private.js` utilise également cette identité pour l'accès au blog. Le module News a donc déjà une authentification utilisable, **mais son déclencheur est placé dans une zone métier, pas dans l'interface générale du site**.

**Évolution demandée :** un **seul accès discret « Compte / Connexion Twitch »**, dans un emplacement commun du site (préférence de conception : icône/texte compact dans l'en-tête avec adaptation mobile ; emplacement final à valider), sans gros bouton de connexion au milieu de News ou du carnet. Quand l'utilisateur est connecté, ce même emplacement peut afficher son état de session, une déconnexion et les seuls raccourcis auxquels il a droit : « Gestion des actualités », « Administration du carnet », puis éventuellement « DBD », « TCG » et autres espaces.

**Architecture cible :**
- Une **identité Twitch / compte DeadelusTV** réutilisable pour les fonctionnalités du portail : Phasmophobia, DBD futur, TCG et autres modules compatibles. Réutiliser le fournisseur Supabase Auth existant ; éviter la prolifération de comptes et de boutons OAuth indépendants.
- Un **module Auth partagé** dans les assets communs du portail, chargé une fois, proposant état connecté/déconnecté, connexion, déconnexion et retour OAuth. Les modules métiers consomment ce service et n'instancient pas chacun une deuxième expérience de connexion. Vérifier la cohérence entre clients Supabase JS et les éventuels stockages de session existants avant refactorisation.
- Des **permissions séparées côté serveur/base (RLS)** : `phasmo_news_editor`, `phasmo_news_admin`, `phasmo_journal_admin` ou équivalent, futures permissions DBD/TCG. Les identifiants/UUID habilités sont affectés explicitement ; ne jamais inférer un pouvoir d'administration du pseudonyme Twitch, d'un statut modérateur, du simple login, ni d'un bouton masqué côté navigateur.
- **Rédacteur News :** conserver l'accès actuel au blog, indépendamment du carnet. **Deadelus et la responsable du site :** accès carnet selon habilitation nominative. Un viewer connecté n'obtient aucun accès administratif.
- **Compatibilité des origines/déploiements :** l'état d'authentification fonctionne naturellement à l'intérieur d'une même origine Web qui utilise la même instance/projet Supabase ; ne **pas** supposer le partage automatique de session entre OVH, un aperçu Cloudflare ou un frontend TCG séparé. Réexaminer les redirections OAuth autorisées et les callbacks avant modification ; ne pas casser la connexion News actuelle ni les comptes/permissions TCG. L'Auth de Crew'mong Us reste une intégration distincte hors de ce chantier.
- **Sécurité et ergonomie :** le point d'entrée doit être discret, mais facile à retrouver ; droits vérifiés par RLS/API, lien admin affiché seulement aux autorisés, retour vers la rubrique voulue après login, déconnexion depuis le même point, accessibilité clavier et mobile, aucune clé secrète dans le JavaScript public.

**Ordre prudent d'implémentation (sur branche uniquement) :**
1. Inventaire de la session News existante et des contraintes de redirection ; définir le point d'accès commun sans impact sur le live et les autres sections.
2. Extraire/mutualiser le service d'authentification Twitch ; déplacer le contrôle de session dans l'en-tête/panneau de compte ; maintenir l'édition News fonctionnelle et ses RLS.
3. Ajouter la permission `phasmo_journal_admin` et les contrôles réels d'accès pour Deadelus, puis éventuellement la responsable du site ; revue préalable des changements Supabase nécessaires, sans les appliquer sans validation.
4. Intégrer progressivement le moteur de carnet V4.3 (visuel + interactions) et les données dynamiques/écrans de gestion, avec brouillons et médias protégés.
5. Tester visiteur anonyme, connecté sans rôle, rédacteur News, administrateur carnet, double permission, session révoquée, mobile, retours OAuth et déploiements prévisualisés ; ensuite seulement proposer une intégration ciblée à `main` après validation.

**Ce qui n'a pas été fait ici :** pas de déplacement du bouton actuel, pas de refonte de l'Auth ni de l'éditeur News, pas de nouvelle permission ou table Supabase, pas d'attribution de rôle, pas de code de carnet intégré, pas de changement sur `main` ni sur OVH.


### Première livraison : menu Twitch commun du portail (27/10/2026)

**Statut : première étape de code livrée uniquement sur `developpement/phasmo-v2`, tests navigateur réels encore nécessaires, sans déploiement `main` ou changement Supabase.**

- Nouveau `public/assets/site-auth.js` : point d'entrée Supabase Auth Twitch commun au portail, initialisé à la demande, OAuth PKCE conservé, session persistante et gestion centralisée de la connexion/déconnexion. Le module réutilise **le même projet Supabase et la même clé publiable** que la rédaction News ; aucun secret ajouté dans le navigateur. Le retour OAuth conserve la route de départ et peut rouvrir le panneau News.
- Nouveau `public/assets/site-auth.css` : petit menu « Compte » dans l'en-tête, utilisable sur les pages publiques, dont version mobile compacte ; statut, connexion, déconnexion, lien rédaction autorisée. Aucun lien d'administration carnet actif avant création de l'autorisation serveur.
- `public/index.html` : chargement de ce CSS/JS partagé avant `news-access.js`, menu de compte en haut, **suppression des boutons Connexion Twitch et Se déconnecter de l'intérieur de l'accordéon News**. Le lien interne « Gérer les actualités » reste conditionné aux permissions déjà existantes.
- `public/modules/phasmophobia/news-access.js` : désormais consommateur de `window.DEADELUSTV_AUTH`, **plus de deuxième code OAuth** ; contrôle d'affichage des rôles `phasmo_news_editors` / `phasmo_news_admins`. Les protections RLS et le fichier d'édition privée restent inchangés.
- Vérifications de code : les deux JS modifiés/nouveaux compilent, chargement du service avant l'accès News, éléments du menu présents, anciens boutons retirés, aucune clé privée, même OAuth et permissions attendues. **Ce ne sont pas des tests de connexion Twitch en conditions réelles.**

**Recette utilisateur avant toute suite** : sur l'aperçu de branche, tester Compte → Connexion Twitch → retour à la bonne rubrique ; compte sans autorisation News (aucun accès privé), compte autorisé (lien Gérer les actualités), déconnexion, état après F5 et mobile. Vérifier également le parcours de rédaction News existant. En cas d'échec de callback, contrôler la liste des URL autorisées dans Supabase sans modifier celle du TCG.

**Étapes suivantes non encore codées** : intégration du rendu V4.3 Brun dans le site, modèle de contenus évolutif et gabarits du carnet, interface privée de gestion, création contrôlée de la permission `phasmo_journal_admin` et de RLS spécifiques, puis validation avec Deadelus. Le panneau de compte actuel ne prétend pas fournir ces fonctionnalités tant qu'elles n'existent pas.


### Validation réelle : connexion Twitch et accès News depuis le menu Compte (27/10/2026)

- **Essai utilisateur réussi dans le navigateur, sur la branche Phasmo V2 :** connexion via le nouveau menu « Compte » ; immédiatement après la connexion Twitch, le compte de l'utilisatrice a vu apparaître son accès autorisé aux actualités dans le profil/menu Compte.
- Cela valide le **chemin connexion Twitch → reconnaissance du compte → affichage conditionnel de l'accès News** pour ce compte. L'utilisatrice confirme que cela fonctionne (« nickel »).
- **Ne pas extrapoler :** déconnexion, persistance après F5, compte non autorisé, menu mobile, ouverture et édition des articles depuis ce nouveau parcours, retour OAuth d'autres rubriques et révocation des droits n'ont pas été explicitement revalidés dans ce retour.
- **Étape suivante :** conserver cette base d'authentification commune et préparer les rôles spécifiques au carnet ainsi que l'intégration du gabarit brun V4.3 et la gestion évolutive des fiches. Ne pas attribuer automatiquement les permissions carnet à tous les détenteurs de droits News.
- **Périmètre :** constat de recette documenté uniquement, aucune modification Supabase / `main` / déploiement public.


### Intégration initiale du carnet brun V4.3 et de l'atelier dans Phasmo V2 (27/10/2026)

**Chantier utilisateur lancé sur `developpement/phasmo-v2` uniquement.** Aucune publication de `main`, aucune modification de la base Supabase partagée.

#### Code livré sur la branche
- `public/assets/phasmo-carnet-brun.webp` : véritable fond WebP du carnet V4.3 reçu de l'utilisatrice, extrait sans retouche de l'atelier autonome, octets vérifiés avec son identifiant Git blob `69b6394d01fd936a06f0f619da92e7dfd9f2471a` (1 597 092 octets). Onglets et languettes sont dans l'image, textes et zones de clic sont en calques HTML séparés.
- `public/modules/phasmophobia/journal-editor.html` : atelier V4.3 extrait sans son énorme média embarqué, relié au fond WebP du site. Texte, images, calques, déplacement, redimensionnement, suppression confirmée, mode Test, navigation hiérarchique et export/import JSON conservés. Bandeau visible « prévisualisation / sauvegarde locale ». Ce fichier de prototype reste **techniquement accessible par URL sur un site statique**, mais **ne peut ni modifier la base ni publier des contenus serveur** à cette étape.
- Même fichier avec `?viewer=1` : lecture intégrée en mode Test, outils d'édition et barre latérale masqués ; les calques et la navigation sont affichés depuis les réglages locaux du navigateur (donc pas encore communs à tous les visiteurs).
- `public/modules/phasmophobia/journal-bridge.js` et `journal-embed.css` : nouveau pont dialog/iframe, chargement du livre seulement à son ouverture, accès par « Ouvrir le carnet » et par les boutons rapides des cinq catégories, retour au sommaire et fermeture. Requêtes `postMessage` contrôlées sur **la même origine**. L'ancien rendu CSS du dialogue et l'ancien `journal.js` ne sont plus utilisés par `index.html` ; fichiers historiques conservés.
- `public/index.html` : remplacement du dialogue du carnet par la visionneuse V4.3, accès futur à « Atelier du carnet » dans le menu Compte (masqué tant que l'habilitation serveur n'existe pas).
- `public/assets/site-auth.js` : contrôle distinct et **à défaut fermé** d'un éventuel rôle `phasmo_journal_admins`. Le lien reste masqué quand cette table n'existe pas ou que l'utilisateur n'est pas habilité. **Aucun droit n'est déduit des rôles News.**
- `docs/phasmo-journal-sql-a-valider.sql` : schéma **proposé, NON APPLIQUÉ** pour les administrateurs et documents journal, avec RLS deny-by-default pour les écritures et lecture publique conditionnée à publication/canal preview. Nécessite revue, contrôle des types média/Storage, historique et validation avant déploiement.

#### Limites et tests
- **Prêt pour les premiers essais visuels**, pas encore prêt comme service de publication en ligne : l'éditeur et le carnet utilisent encore le stockage local du navigateur, sans gestion collaborative ni synchronisation serveur. Les noms de fiches des démonstrations ne sont pas un contenu Phasmophobia validé.
- Les images importées dans l'éditeur sont encore intégrées aux réglages locaux ; aucune migration des médias vers Supabase Storage n'est activée. Les paramètres `file://` de l'atelier téléchargé ne passent **pas automatiquement** sur l'origine du site. Il faut exporter son JSON V4.3 puis l'importer dans l'atelier ouvert sur le site pour retrouver ses calques ; les images/polices contenues dans ce JSON y sont incluses selon les limites de l'atelier.
- Contrôles de développement effectués : compilations JavaScript du nouveau fichier éditeur, du pont et du menu Auth ; vérifications de références HTML/CSS, ordre des scripts, présence du rôle distinct ; égalité des octets du fond WebP avec la version V4.3. **Essai interactif réel sur la démo de branche encore nécessaire.** L'environnement Chromium de test a interdit l'ouverture du serveur local ; ne pas annoncer un test graphique automatisé réussi.
- L'accès à l'atelier par `modules/phasmophobia/journal-editor.html` est **un outil local de conception**. Pour une véritable administration DeadelusTV, il faut finaliser/valider puis appliquer un backend RLS, attribuer explicitement les UUID autorisés et raccorder la sauvegarde/lecture publiques. Tant que cela n'est pas fait, ne pas afficher le lien « Atelier du carnet » comme un accès administratif opérationnel.
- Le schéma actuel de l'atelier expose cinq onglets physiques. L'ajout de nouveaux noms dans ces catégories existe dans le prototype, mais **la création de catégories/sous-catégories supplémentaires et le stockage de fiches différentes par identifiant** restent à développer, ainsi que la gestion des versions, l'archivage, les médias et la publication.

**Recette proposée :** sur la prévisualisation Phasmo V2, ouvrir Livre puis carnet, essayer les cinq onglets, sommaire, fiches et flèches ; ouvrir directement `/modules/phasmophobia/journal-editor.html` pour importer/exporter un JSON et prévisualiser ses placements dans le même navigateur. Vérifier bureau/mobile et ne pas tenter de publier le prototype sur `main` avant la partie RLS / données.


#### Test local complémentaire (sans réseau ni déploiement)

- Après les contrôles statiques, le moteur original V4.3, avec les adaptations `viewer` de l'intégration et la police distante neutralisée pour le test, a été exécuté dans Chromium à partir du HTML fourni (injection locale de document, sans navigation vers le site).
- Observé : **image d'origine chargée**, **18 calques visibles sur le sommaire**, mode « Test des clics » actif, clic sur l'onglet ENTITÉS → liste affichée avec 30 entrées de démonstration, clic sur le premier nom → fiche Aswang, reclic onglet ENTITÉS → retour à la liste. **Aucune exception JavaScript** au cours de ce scénario.
- Limites du test : cette exécution reconstruit localement la logique adaptée, **pas** la branche déployée avec iframe réel, et ne valide ni les permissions Supabase, ni mobile, ni la sauvegarde partagée. Le serveur HTTP localhost est inaccessible au navigateur de test dans cet environnement ; validation réelle de la branche nécessaire.


### Fiches dynamiques locales : première implémentation (27/10/2026)

**Statut : livré uniquement sur `developpement/phasmo-v2`, non déployé sur `main` et SANS migration Supabase.** La direction artistique (carnet brun, positionnement, calques) reste à travailler manuellement dans l'atelier ; aucun changement visuel demandé sur ce chantier.

- Nouveau `public/modules/phasmophobia/journal-records.js` : modèle distinct des gabarits, identifiants durables de fiches (`fiche-UUID`), catégorie, nom, ordre et statut local (`demo`, `draft`, `archived`). Il n'effectue aucun appel réseau ni publication.
- `journal-editor.html` : le panneau « Fiches dynamiques » permet d'ajouter, renommer, ouvrir, classer, archiver, restaurer et supprimer une fiche après confirmation intégrée. La liste de chaque catégorie et les flèches précédent/suivant utilisent désormais les enregistrements, sans liste de noms codée en dur comme source de vérité.
- Chaque fiche ouverte en édition reçoit, lors de sa première ouverture, une **copie indépendante du modèle de calques de sa catégorie**. Les calques ajoutés/modifiés sur cette fiche se stockent sur la page `entry:<identifiant>`, séparée du modèle `detail:<categorie>`. Le gabarit d'une catégorie reste modifiable dans « Vue à travailler » en dehors d'une fiche ouverte. Les onglets globaux restent partagés.
- Le JSON des réglages passe en **schema version 5** avec `records` et les pages de calques spécifiques. Les importations V2/V3/V4 et la sauvegarde locale V4.3 sont reprises en créant des identifiants stables ; migration sauvegardée localement. Les anciens noms de listes deviennent des enregistrements de démonstration : **pas de contenu de gameplay validé**.
- Les anciens hotspots vers une fiche par nom sont convertis en cible par identifiant lors de son renommage. Un nom dupliqué dans la même catégorie est refusé. Une fiche archivée est retirée des listes ; sa restauration ne détruit pas ses calques ; une suppression confirmée supprime uniquement sa fiche et ses calques.
- **Vérifications automatiques limitées** : parsing du script de l'atelier, présence de ses contrôles HTML, unit tests du modèle (création, renommage/ID, tri, archive/restauration, suppression, import/export de structure, doublons). **Non encore testé dans la prévisualisation du site en vrai navigateur.** Les utilisateurs doivent tester leurs parcours et sauvegarder/exporter avant d'éditer les fiches.
- Le prototype conserve les cinq onglets de catégories existants. Gestion de catégories/sous-catégories arbitraires, publication côté serveur, rôles RLS, médias Storage, historique de versions et lecture partagée sont des étapes **distinctes et non réalisées**. L'atelier statique reste accessible par URL et ne constitue pas une interface d'administration sécurisée. Le mode visiteur peut afficher les exemples locaux ; il n'a aucune donnée commune publiée par Supabase.

**Recette à faire** : créer une fiche de test, l'ouvrir, ajouter un texte et une image ; créer une seconde fiche et vérifier que la première conserve ses calques ; tester flèches, renommage, archive/restauration, suppression, export JSON puis import et F5 sur la démo. Vérifier le comportement mobile. Ne jamais confondre cette démonstration locale avec la publication définitive.


### 27/10/2026 — Visionneuse adaptative et ergonomie future de l'atelier

**Retours de recette** : l'utilisatrice confirme que la création d'une fiche dans l'atelier et sa présence dans la liste « Entités » fonctionnent. Elle signale que l'importation d'une image nécessite trop d'étapes et que l'atelier est chargé, ainsi que des barres de défilement dans le livre ouvert depuis le site sur des écrans plus petits.

**Correctif appliqué uniquement sur `developpement/phasmo-v2`** :
- Dans `journal-editor.html?viewer=1`, adapter le rendu des 1536×1024 px à **la largeur ET à la hauteur de l'espace disponible** de l'iframe, en préservant les proportions et sans imposer le zoom de l'atelier. Centrer le carnet, supprimer le défilement interne de la visionneuse, recalculer au redimensionnement de l'écran ou du conteneur (ResizeObserver).
- Dans `journal-embed.css`, masquer uniquement le titre central de la barre du dialogue sur les très petits écrans pour conserver les commandes « Sommaire » et « Fermer » accessibles.
- Ne pas modifier la disposition de l'atelier de conception ni les calques propres au livre. Le livre reste lisible uniquement dans la limite physique de la taille d'écran : sur téléphone très étroit, les inscriptions sont forcément petites. Une solution d'accessibilité/agrandissement séparée pourra être évaluée sans réintroduire de scrollbars permanentes.

**À tester en conditions réelles** : fenêtres petites/basses, ordinateur portable, changement d'orientation mobile, zoom navigateur, tableau/ordinateur, onglets et flèches, ouverture/fermeture du dialogue, absence des barres de défilement internes, préservation du clic sur les couches interactives. Ne pas confondre contrôles statiques du code avec recette en navigateur réel.

**À conserver pour APRÈS la finalisation des fonctions du carnet** : reprise ergonomique globale de l'atelier pour simplifier au maximum les manipulations, en particulier l'import d'image directement depuis le calque (« sélectionner le cadre → importer ou remplacer » avec bouton de proximité / glisser-déposer à étudier), raccourcir les parcours de la navigation et revoir l'organisation des panneaux. C'est une décision de planification, non une demande de refonte immédiate.


### Décisions de recette après adaptation écran — 27/10/2026

- **Validation utilisateur :** le carnet entier tient désormais à l'écran dans la visionneuse après redimensionnement, y compris sur un petit écran (retour « c'est good »). Ne pas retirer le mode « taille adaptée à la fenêtre ».
- **À prévoir côté visiteurs, non développé :** zoom optionnel pour lire le livre et ses petits textes, par exemple contrôles + / − / retour « ajuster à l'écran », déplacement du livre agrandi, prise en charge tactile/pincement à étudier. Le réglage initial doit toujours montrer le livre entier, sans scrollbars visibles en taille normale. Le zoom doit conserver les clics sur les zones du carnet et rester utilisable au clavier / sur mobile. Ne pas confondre ce besoin lecteur avec le zoom de l'atelier.
- **Prochaine étape fonctionnelle : catégories et sous-catégories dynamiques**, rattachées aux fiches indépendantes déjà implémentées. Préserver les cinq onglets physiques et ne pas refondre leur visuel ; définir leur relation avec les catégories et sous-catégories éditoriales. Création, modification, classement, ordre, archivage et déplacement de fiches sans modification manuelle du JavaScript. Puis navigation hiérarchique automatique, intégration Supabase et permissions serveur lors des phases ultérieures.
- **Plus tard :** simplification globale de l'atelier, y compris import d'images, une fois les fonctions essentielles terminées. Rien de cela n'est publié en production.


### 27/10/2026 — Zoom visiteur du livre brun : implémentation V1

**Livré uniquement sur la branche `developpement/phasmo-v2`, pas sur `main`, sans changement Supabase.** Suite à la validation par l'utilisatrice du livre entièrement adapté à l'écran, ajout de la fonctionnalité de zoom destinée au public ; le zoom existant de l'atelier reste inchangé.

- `public/index.html` : barre de contrôles propre au livre de lecture, entre l'en-tête de la fenêtre et le carnet : **−**, indicateur de pourcentage, **+** et **Ajuster à l'écran**, boutons natifs clavier et libellés d'accessibilité. Par défaut 100 % = **ajusté à la fenêtre**.
- `public/modules/phasmophobia/journal-embed.css` : style de la barre de commandes, toujours dans le dialogue et séparé du fond/couches du livre.
- `public/modules/phasmophobia/journal-bridge.js` : contrôle de 100 à 300 % par pas de 25 %, désactivation des boutons aux bornes, retour à 100 % quand le dialogue est rouvert, synchronisation du pourcentage lors du zoom tactile. Messages `postMessage` contrôlés par origine et source de l'iframe.
- Nouveau `public/modules/phasmophobia/journal-viewer-zoom.js` chargé uniquement en `?viewer=1` : calcul à partir des dimensions **largeur + hauteur**, maintien des proportions, agrandissement limité à 300 %, **pan** du contenu en le faisant glisser à la souris/au doigt, navigation au trackpad via la molette quand la vue est agrandie, **pinch à deux doigts**, bornes pour ne pas perdre le livre, suppression des clics involontaires sur les fiches après glissement. Ne stocke aucune donnée.
- `public/modules/phasmophobia/journal-editor.html` : le mode lecteur délègue exclusivement au nouveau module ; **aucune modification de la disposition du carnet, des calques ni de l'interface de conception**. L'atelier V4.3 utilise toujours ses propres paramètres de zoom et ses sauvegardes.
- **Contrôles de code/simulation** : compilation des scripts ; compatibilité des ID HTML et des scripts ; 16 contrôles statiques/de fonctionnement du module de zoom sur DOM simulé, 7 scénarios des commandes de la fenêtre parent (chargement différé, boutons, synchronisation du pinch, réouverture et retour ajusté). Tests géométriques complémentaires largeur/hauteur à prévoir en réel. **Pas de validation graphique en navigateur sur le domaine de prévisualisation à cette étape.**
- **Recette utilisateur requise** : ouvrir le livre depuis Phasmo sur la branche de test, vérifier 100 % ajusté et les onglets, cliquer +/−, aller à 300 % puis Ajuster, déplacer une page agrandie sans activer un lien, vérifier fermeture/réouverture, ordinateur portable, écran bas, mobile paysage/portrait et pincement à deux doigts. Les contrôles sont dans le dialogue du livre, non dans l'atelier.
- **Suite du chantier** : catégories / sous-catégories dynamiques, puis navigation automatique. Plus tard seulement : simplification UX globale de l'atelier et de l'import d'image.


**Validation utilisateur du zoom visiteur (27/10/2026)** : l'utilisatrice confirme explicitement « ça fonctionne parfaitement » après test sur la prévisualisation Phasmo V2. Le zoom de lecture est donc **validé côté utilisation**. Aucune modification de la production ou de Supabase. Prochaine étape prévue : catégories et sous-catégories dynamiques. La recette exhaustive multi-appareils et d'accessibilité n'est pas revendiquée par ce retour.


### 27/10/2026 — Sous-catégories hiérarchiques dynamiques : première livraison

**Périmètre** : prototype en local sur `developpement/phasmo-v2` seulement. Aucune migration Supabase, aucune modification de `main` et aucune retouche de l'illustration ou des cinq onglets physiques du livre.

#### Modèle / sauvegarde

- Nouveau `public/modules/phasmophobia/journal-folders.js` : rubriques hiérarchiques par catégorie racine parmi `entites`, `cartes`, `objets`, `equipements`, `divers`. Chaque rubrique est identifiée par un `rubrique-UUID` indépendant de son titre. Champs : `id`, `group`, `parentId`, `title`, `order`, `status` (`active` ou `archived`).
- `journal-records.js` : les fiches gardent leur identifiant `fiche-UUID` et leur page de calques `entry:<id>`. Nouveau champ `folderId` nullable : `null` signifie « directement à la racine de l'onglet ». Création dans un dossier, classement, déplacement dans un autre dossier ou un autre onglet, ordre limité au dossier courant, détection des noms de fiches dupliqués par onglet.
- JSON atelier **version 6**, avec `folders` et `records[].folderId` ; importations V2/V3/V4/V5 toujours reconnues, sauvegarde locale V5 migrée automatiquement et anciens identifiants de fiches/calques conservés. Les anciennes fiches sans `folderId` restent à la racine.
- Aucun contenu n'est enregistré côté serveur ni partagé entre utilisateurs, même depuis le domaine de prévisualisation. **Exporter le JSON avant les tests d'archivage ou de déplacement importants.**

#### Interface de gestion / navigation

- Dans `journal-editor.html`, section « 5 · Fiches dynamiques » : choix de la sous-catégorie pour créer une fiche ; emplacement courant visible ; destination « catégorie + sous-catégorie » et bouton « Déplacer la fiche ». Le déplacement préserve l'UUID et les calques de la fiche. Les hotspots existants ciblant cette fiche par identifiant ou nom sont remis à jour lors d'un déplacement vers un autre onglet.
- Nouvelle section « 6 · Sous-catégories dynamiques » : choisir une sous-catégorie et son emplacement, créer, renommer, ouvrir, déplacer sous une autre rubrique du même onglet, réordonner parmi les rubriques sœurs, archiver/restaurer et supprimer si vide. Une rubrique non vide ne peut pas être supprimée : ni fiches directes ni sous-rubriques, y compris archivées. Les cycles de parenté et les sous-catégories parentes archivées sont refusés.
- Dans le carnet, sur une page « Liste » de catégorie : affichage des sous-catégories du niveau courant (préfixe `▸`), des fiches directement rangées à ce niveau et, dans une sous-catégorie, d'un retour « ← Retour ». Le titre de catégorie générique reflète le nom du dossier courant, sans modifier le calque enregistré. Les onglets physiques continuent d'ouvrir les cinq catégories racines ; le sommaire conserve ses listes globales de fiches pour compatibilité.
- En mode Test, cliquer dans une rubrique descend d'un niveau, cliquer sur une fiche l'ouvre, « Retour à la liste » remonte au dossier de la fiche et les flèches précédent/suivant parcourent seulement les fiches du dossier courant. Les sous-catégories archivées et leurs descendants sont masqués, y compris dans le sommaire ; les entrées archivées ne s'ouvrent pas même par un lien interne.
- Correction liée aux calques d'images : « + Image de fond » et import de plusieurs images utilisent maintenant la page personnelle `entry:<id>` quand une fiche est ouverte, et non le gabarit de catégorie. Cela évite qu'une image ajoutée à une fiche se perde dans la page modèle.
- Section « 7 · Sauvegardes » inchangée fonctionnellement ; seulement renumérotée.

#### Vérifications et limites

- Analyse syntaxique des scripts modifiés ; correspondance de toutes les références de contrôles HTML ; **30 vérifications unitaires/statiques** sur les modèles et la structure : création/renommage/mouvement, UUID stables, archive et descendants invisibles, refus suppression dossier non vide, prévention cycles et doublons, ordre par dossier, migration V5 et roundtrip JSON v6, modèle d'image inchangé.
- **Recette réelle navigateur NON encore validée**. Scénario à faire : exporter JSON ; créer une sous-catégorie dans « Entités », y déplacer la fiche de test ; créer une sous-catégorie enfant et une nouvelle fiche ; passer en mode Test puis vérifier onglet Entités → dossier → sous-dossier → fiche → flèches → retour ; archiver puis restaurer un dossier ; vérifier F5 et export/import JSON V6 ; tester les liens et calques/images de la fiche après déplacement entre onglets.
- Limites assumées : catégories racines physiques encore fixes (cinq), mise en page et capacité visuelle de la liste inchangées ; pagination, recherche, fil d'Ariane explicite dans les pages, édition collaborative, rôles RLS, publication Supabase et refonte simplifiée de l'atelier sont des étapes ultérieures. Une arborescence profonde ou de très nombreuses fiches nécessitera des améliorations de lecture avant publication.


### 27/10/2026 — Fiches toujours accessibles dans la liste générale malgré le classement

**Retour validé par l'utilisatrice** : les sous-catégories dynamiques fonctionnent en prévisualisation, mais une fiche comme Willow doit **rester directement accessible dans la liste principale de son onglet Maps**, même lorsqu'elle est rangée dans « Petites cartes ». La sous-catégorie est un parcours secondaire et optionnel, non un déplacement exclusif de la fiche hors du sommaire de la catégorie.

**Correctif intégré dans `journal-editor.html` sur `developpement/phasmo-v2`** :
- Liste racine des cinq catégories : afficher toutes les fiches visibles de la catégorie, y compris celles classées dans une sous-catégorie enfant ou plus profonde, en plus des liens vers les sous-catégories de premier niveau. Le sommaire global affichait déjà toutes les fiches.
- Dans une sous-catégorie : ne montrer que ses fiches directes et ses sous-catégories enfants, sans changer l'arborescence enregistrée.
- Ouverture directe d'une fiche depuis la liste générale : mémoriser que le visiteur vient de la racine de l'onglet, pour le bouton « Retour » et les flèches précédent/suivant. Ouverture depuis le dossier : conserver la navigation locale à ce dossier.
- Les archives restent invisibles partout, y compris lorsqu'un ancêtre de la fiche est archivé.
- Aucune duplication de fiche, aucun changement de `folderId`, de l'UUID, des calques, du fond, des onglets, ni de Supabase ; les JSON V6 existants restent compatibles.

**Contrôles de régression** : 18 vérifications sur une arborescence simulée « Maps → Petites cartes → Willow » avec une fiche racine, un dossier enfant, clics, retours, flèches, archives, restauration et syntaxe du script. **Recette réelle du correctif à confirmer dans le navigateur**.

**Décision de mise en page** : l'utilisatrice souhaite positionner visuellement « Petites cartes » à part, elle-même dans l'atelier ; ne pas imposer d'emplacement ni refaire le visuel à sa place. Limite actuelle : le lien de sous-catégorie et les noms des fiches sont générés dans le même calque « Liste cliquable des fiches ». Le réglage du positionnement indépendant des rubriques demandera un calque / contrôle séparé à prévoir dans l'éditeur ; cette fonctionnalité de placement n'a pas été ajoutée par ce correctif.


### 28/10/2026 — Navigation V7 : séparation des calques et pagination des listes

**Décisions de l'utilisatrice** : la première version des sous-catégories et l'accès direct aux fiches depuis le menu général sont validés. La prochaine étape approuvée porte sur quatre points : (1) emplacement visuel libre des rubriques et fiches avec une maquette réutilisée par catégorie, (2) pagination des listes devenant trop longues, (3) retours et navigation contextuelle améliorés, (4) conserver le double parcours « liste générale » et « sous-catégorie ». L'atelier doit rester modifiable sans imposer de design définitif.

**Livraison de code sur `developpement/phasmo-v2` uniquement (prototypage local ; non fusionnée sur `main` ; Supabase inchangé) :**

- Nouvelle version de l'atelier : **JSON V7**, toujours importable depuis les JSON V1 à V6 selon leurs formats pris en charge. `journal-editor.html` charge désormais `journal-pagination.js` en plus du modèle existant. Les données de fiches `fiche-UUID`, de sous-catégories `rubrique-UUID`, leurs calques privés `entry:<id>` et tous les champs de position/texte/images existants sont conservés.
- Dans chaque **vue « Liste » de catégorie**, deux calques distincts existent désormais : **Liste cliquable des fiches** (`listMode:'records'`) et **Liste des sous-catégories** (`listMode:'folders'`). Le premier affiche toutes les fiches visibles au niveau racine, même si elles sont classées dans une sous-rubrique ; à l'intérieur d'une rubrique il affiche ses seules fiches directes. Le second montre les rubriques filles du niveau courant et un retour au parent. Les sous-catégories ne sont donc plus incorporées à la liste de noms.
- Les deux calques peuvent être **déplacés, redimensionnés, pivotés, organisés en colonnes et stylisés indépendamment**, y compris dans les deux pages physiques, à l'aide de l'éditeur de calques existant. Position de départ proposée pour les rubriques : `X=55 %, Y=76 %, W=34 %, H=17 %` ; aucun emplacement n'est imposé, et le fond ainsi que les onglets restent inchangés. Les pages « Liste » d'un onglet sont **une maquette commune à sa racine et à toutes ses profondeurs**.
- Dans « 2 · Calques de cette page », nouvelles actions `+ Liste des rubriques` et `+ Fil d’Ariane`. Dans « 3 · Réglages », une liste sélectionnée dispose du choix `Fiches / Sous-catégories / Liste manuelle`. Le fil d'Ariane est un **calque facultatif**, à positionner librement, proposant des liens cliquables vers la catégorie racine et les ancêtres de la fiche ou du dossier. Les liens retour du modèle de fiche portent désormais le nom du dossier/context courant quand le calque s'appelle « Retour à la liste ».
- Nouveau `public/modules/phasmophobia/journal-pagination.js` : calcul des pages en fonction des dimensions du calque, du nombre de colonnes, de la taille de police et d'une estimation des retours à la ligne. La liste est contenue dans sa zone de mise en page au lieu de s'étendre sur le livre. Lorsqu'elle dépasse, des contrôles **‹ / compteur de pages / ›** apparaissent directement **sous la liste**, dans son calque, en mode Test/visiteur. Les pages de fiches et les pages de rubriques ont des compteurs indépendants ; chaque contexte dossier et calque garde sa page pendant les allers-retours. Ce sont des **pages de liste**, et non une animation de feuilletage du livre physique.
- La navigation conserve les deux parcours : accès direct à toute fiche visible depuis le menu général de son onglet, ou via la sous-catégorie ; une seule fiche et un seul jeu de calques sont stockés. Depuis la fiche, « Retour » rétablit le contexte général ou le sous-dossier d'origine ; les flèches parcourent la collection de ce contexte. Archivage d'une fiche ou de ses dossiers la masque dans les deux accès.
- **Migration non destructive** : au premier chargement d'une sauvegarde antérieure à V7 ou à l'import d'un JSON V6, la liste de fiches déjà placée conserve ses dimensions/positions, reçoit le mode `records`, et une liste `folders` distincte est créée si nécessaire pour la même catégorie. Si un V7 a supprimé volontairement un calque, on ne le réintroduit pas automatiquement aux chargements suivants. Les éléments importés sont validés, y compris `listMode` et `source` appartenant à une catégorie reconnue.
- **Tests réalisés** : analyse syntaxique et contrôles de structure (21 vérifications), simulation DOM de navigation/pagination (14 scénarios), migration représentative V6→V7 (9 vérifications). Exemples vérifiés : 100 entrées réparties sans pertes, pagination indépendante, accès direct Willow, ouverture via « Petites cartes », flèches et retours, préservation des calques et absence de doublons lors d'une migration répétée. **La recette graphique sur le site de prévisualisation n'a PAS encore été confirmée par l'utilisatrice**.

**À tester prioritairement** (en commençant par exporter son JSON actuel) : sur la branche de prévisualisation, ouvrir l'atelier puis « Liste · Les Maps », sélectionner et déplacer séparément les calques « Liste cliquable des fiches » et « Liste des sous-catégories » ; vérifier que « Petites cartes » est placée à part et que Willow reste directement cliquable depuis Maps ; créer assez de fiches/rubriques (ou réduire la hauteur du calque) pour faire apparaître ‹ / page / › ; tester clic, retour, plusieurs colonnes, mode visiteur, téléphone, F5 puis export/import V7. Pour créer un fil d'Ariane, sélectionner une page Liste ou un modèle de fiche puis utiliser le bouton dédié, sans modifier les calques globaux.

**Limites restantes** : pas de synchronisation Supabase ni d'administration serveur ; pagination calculée sur les dimensions/styles du calque, à vérifier visuellement avec polices importées, très longs titres et petites tailles d'écran ; menus très profonds et accessibilité nécessitent recette. Une éventuelle **pagination par feuilletage réel du carnet** est distincte de cette première pagination des listes et reste non développée. Simplification de l'éditeur toujours programmée après finalisation de ses fonctions.


### 28/10/2026 — Validation utilisateur : navigation V7

**Validation de recette utilisateur reçue** : « C'est validé ! » pour la navigation V7, la séparation libre des calques « Fiches » et « Sous-catégories », la pagination automatique des longues listes et le parcours de retour / fil d'Ariane. La version prototype sur `developpement/phasmo-v2` est acceptée par l'utilisatrice. Les vérifications multi-appareils exhaustives ne sont pas impliquées par ce retour.

**Étape suivante prévue** : étudier et préparer la sauvegarde partagée via Supabase (modèle, migration des JSON, brouillons/publication, autorisations/RLS). Conserver les cinq onglets et toutes les positions, fiches, sous-catégories, images et comportements validés. Le système « modos Twitch du canal DeadelusTV seulement = éditeurs Phasmo » reste **une idée planifiée, non activée**. Ne rien déployer sur `main` ni modifier Supabase sans définir et valider d'abord les modalités.


### 28/10/2026 — Audit Supabase du carnet V7, sans migration

**Audit en lecture seule du projet Supabase partagé `eodtxlhnfzyapkyvvxdi` :**
- PostgreSQL 17.11 ; aucune table `public.phasmo_journal_*` dans le relevé à cette date.
- Auth Twitch réutilisable dans `public/assets/site-auth.js`. Permissions News existantes (`phasmo_news_editors`, `phasmo_news_admins`), **distinctes** des futures permissions du carnet. Ne toucher ni aux tables News ni au TCG.
- Buckets Storage existants uniquement : `phasmo-news-draft-images` (privé), `phasmo-news-published-images` (public), `tcg-card-images` (public). Prévoir des buckets propres au carnet et une migration du base64 (images ET polices).
- Le SQL historique `docs/phasmo-journal-sql-a-valider.sql` était un **brouillon non appliqué**, conçu avant l'évolution V7, et ne représente pas tout le besoin. Un avertissement « OBSOLÈTE, NE PAS EXÉCUTER » y a été ajouté ; le fichier d'origine reste pour l'historique.
- Revue de documentation Supabase actuelle sur la RLS, Storage, RPC/transactions, et avis de changement concernant l'exposition Data API des nouvelles tables publiques (échéance générale annoncée au 30 octobre 2026). RLS + GRANT + vérification d'exposition Data API indispensables.

**Proposition de conception créée :** `docs/phasmo-journal-supabase-architecture-v7.md`. Elle compare les données du JSON V7, recommande cinq tables (deux permissions, brouillons partagés, publications explicites, historique), deux buckets média dédiés, une sauvegarde optimiste par `revision` et des contrôles RLS par identité, stage et rôle. Brouillon jamais public ; publication preview distincte de production. Elle documente les limites de l'édition concurrente sur JSON global et les arbitrages avant une future migration.

**Aucune action sur la base Supabase**, aucune création de rôle ou bucket, aucun changement d'authentification existante et aucune fusion de GitHub `main`. **Prochaine action seulement après validation** : figer les droits, visibilité preview, stratégie de synchronisation, puis préparer le SQL exécutable et ses tests, sans l'exécuter à ce stade.


### 28/10/2026 — Premier socle Supabase PREVIEW appliqué

Migration `phasmo_journal_preview_drafts_rls_revision_v1` appliquée avec succès au projet Supabase existant. Quatre tables créées : `phasmo_journal_admins`, `phasmo_journal_editors`, `phasmo_journal_preview_drafts`, `phasmo_journal_preview_revisions`, toutes avec RLS activée. Vérification ultérieure : les quatre tables sont présentes et **vides** (0 rôle, 0 brouillon, 0 historique). Aucun changement `main`, News ou TCG. Aucun accès carnet attribué, aucune publication ni copie des données locales.

Fichiers de branche : `docs/phasmo-journal-preview-schema-v1.sql` (SQL appliqué), `public/modules/phasmophobia/journal-preview-sync.js` (module de synchronisation volontaire préparé MAIS NON branché). Une tentative de raccordement à `journal-editor.html` a rencontré des blocages ; **les éléments temporaires de l'interface ont été retirés** pour ne pas exposer de boutons inopérants. L'atelier reste au fonctionnement local validé. Il faudra raccorder et tester la synchronisation, la gestion des collisions et la migration des médias avant toute utilisation. Le contrôle de sécurité Supabase signale d'autres avis existants du projet ; ne pas les modifier dans ce chantier sans audit spécifique.


### 28/10/2026 — Attribution administrateurs Twitch DeadelusTV et propriétaire existant

**Demande explicite de l'utilisatrice :** le compte Twitch DeadelusTV, qui s'est connecté à Supabase Auth, doit obtenir les mêmes droits administrateur de l'écosystème DeadelusTV que le compte déjà administrateur News et TCG. Sauvegarde JSON du carnet recommandée **seulement comme précaution avant import / synchronisation**, car les données locales ne sont pas encore migrées. Elle ne constitue pas une obligation pour continuer à utiliser l'éditeur.

**Audit vérifié :** compte Twitch déjà administrateur (News/TCG) et compte Twitch `deadelustv` identifiés par `auth.identities`/ID fournisseur stable. Une tentative de transaction unique pour News+TCG+Phasmo a échoué à cause de l'index unique partiel `phasmo_one_active_news_admin` (au plus un administrateur News actif) et a été annulée sans changement. Les étapes suivantes ont ensuite été vérifiées en lecture.

**Changements appliqués côté Supabase :**
- `phasmo_journal_admins` : deux comptes Twitch actifs (administrateur existant et DeadelusTV). La table reste avec RLS et attribution non ouverte aux clients ordinaires.
- `tcg_admins` : DeadelusTV ajouté avec le même rôle `admin` que l'administrateur TCG existant ; aucun autre rôle changé.
- `phasmo_news_admins` : index unique partiel limitant à un seul admin actif retiré par migration `phasmo_news_allow_multiple_admins_deadelustv_v1`; DeadelusTV ajouté en tant qu'administrateur actif. Les politiques RLS News restent fondées sur chaque `auth.uid()`, et le code du menu compte vérifie le rôle par `user_id` (donc plusieurs administrateurs sont compatibles). Le rôle administrateur News existant n'a pas été retiré. Script SQL de référence conservé sur cette branche : `docs/phasmo-news-allow-multiple-admins-v1.sql`.
- **Résultat relu en base** : exactement deux administrateurs actifs News, deux administrateurs TCG rôle `admin`, deux administrateurs carnet Phasmo ; les six affectations attendues existent. Aucune donnée de fiche, News ou TCG modifiée.
- **Limite d'appellation « admin sur tout le site » :** la vérification concerne les modules Supabase News/TCG/Carnet. Il n'existe pas de rôle global universel donnant automatiquement accès à GitHub, Cloudflare, d'autres sites autonomes ou modules non encore dotés d'autorisations.

**Carnet V7 / synchronisation :** les rôles Phasmo sont créés, mais le brouillon partagé reste vide et la synchronisation UI n'est **pas encore activée**. Le module `journal-preview-sync.js` est préparé mais non chargé par l'atelier, faute de pont achevé ; la section 7 de sauvegardes reste locale. Conserver l'export JSON comme point de restauration avant le premier import.


### 28/10/2026 — Carnet V7 : synchronisation manuelle du brouillon PREVIEW branchée

**Travail livré sur `developpement/phasmo-v2`, aucune modification du code de `main` :**

- `public/modules/phasmophobia/journal-editor.html` expose désormais un pont contrôlé `window.PHASMO_JOURNAL_REMOTE_BRIDGE` avec `exportPayload()` pour copier l'état V7 et `importPayload(payload)` pour appliquer un snapshot distant via le même validateur JSON qu'un import local. Les calques, fiches, rubriques, médias et cinq onglets restent dans leur modèle V7.
- La section `7 · Sauvegardes` contient maintenant les boutons **Charger le brouillon partagé** et **Enregistrer sur Supabase**, plus un texte d'état. Ils sont servis par `public/modules/phasmophobia/journal-preview-sync.js` et ne s'activent pas dans la visionneuse `?viewer=1`.
- `journal-preview-sync.js` : client Supabase avec clé publiable uniquement, récupération de la session Twitch de la même origine Cloudflare que le portail, contrôle en base des rôles `phasmo_journal_admins`/`phasmo_journal_editors`, lecture de la table `phasmo_journal_preview_drafts` uniquement. Une action de l'utilisateur est exigée pour charger un snapshot distant et une confirmation pour remplacer l'état local. Si la table est vide, le bouton « Charger » initialise la référence de révision à 0, sans importer ni effacer de données ; « Enregistrer » crée la révision 1. Les écritures ultérieures exigent la **révision attendue** (`WHERE revision=<ancienne>`), puis passent à N+1. Une écriture concurrente provoque un message de conflit sans effacer les modifications locales. Aucun enregistrement serveur automatique.
- Le navigateur continue de sauvegarder localement et peut exporter/importer le JSON. Dans ce pilote, le JSON du brouillon ne doit pas dépasser 7,5 Mo environ ; une vraie migration des images/polices vers un Storage privé est encore à prévoir. Un brouillon n'est **jamais** une publication publique.
- Les libellés de l'interface indiquent désormais « Atelier V7 » et « Prévisualisation » plutôt que « prototype local V4.3 ».

**Vérifications :**
- SQL live sur Supabase en transaction annulée : lecture sous identité administrateur autorisée, écriture d'une révision 1 acceptée et création d'une ligne d'historique ; mise à jour N→N+1 acceptée avec historique ; écriture sous un compte Twitch non autorisé refusée par RLS (SQLSTATE 42501). Tests annulés avec `ROLLBACK` : ils n'ont laissé ni brouillon ni ligne d'historique.
- Relecture SQL : les quatre tables ont RLS activée, les politiques attendues sont présentes, `anon` n'a pas le GRANT SELECT.
- 12 contrôles de parcours avec client Supabase simulé : premier chargement vide, création V1, deuxième éditeur charge, révision suivante, conflit sur ancien numéro, conservation des modifications locales, rejet du compte ordinaire, recharge et enregistrement après conflit, visionneuse inactive.
- Analyse syntaxique de l'éditeur V7 et du module JS, présence vérifiée des trois boutons/états et du pont entre scripts.
- **Limite** : la session Twitch réelle sur le domaine Cloudflare de prévisualisation, le déploiement effectif du commit et le rendu dans le navigateur n'ont pas pu être testés depuis cette exécution. Ne pas annoncer une recette navigateur terminée.

**Recette demandée** : l'utilisatrice et/ou Deadelus ouvrent le site de **prévisualisation Phasmo V2**, se connectent au menu Compte avec Twitch (connexion sur `main` ne partage pas automatiquement la session Cloudflare), puis ouvrent `/modules/phasmophobia/journal-editor.html`. Dans la section 7, « Charger le brouillon partagé » doit annoncer qu'il est vide ; « Enregistrer sur Supabase » crée la première version à partir de l'atelier courant (maquette et exemples). Le second administrateur fait « Charger le brouillon partagé » et retrouve le même état. Modifier une fiche, enregistrer, puis recharger sur l'autre poste ; en cas d'édition simultanée, vérifier que l'écriture obsolète est refusée et que l'état local reste intact. Tester également déconnexion et compte sans permission. En cas d'échec, reporter le message exact de la section 7.

**Restent hors périmètre de ce lot** : publication publique du carnet, Storage/media partagé hors JSON, attribution d'éditeurs supplémentaires, administration des rôles dans l'UI, fusion des changements concurrents, déploiement `main`.


### 28/10/2026 — Publication du carnet : pilote privé PREVIEW

**Recette utilisateur désormais confirmée** : le 28 octobre, l'utilisatrice a testé avec Twitch sur l'URL DEV stable `https://deadelustv.pages.dev/`. Elle a chargé un ancien brouillon depuis Supabase, modifié, enregistré, fait F5 et rechargé les modifications : cycle réel sauvegarde/relecture V7 validé. Le partage avec Deadelus depuis sa session et l'essai multi-administrateurs restent à faire. L'ancienne redirection Supabase de branche a été retirée par l'utilisatrice et la redirection `https://deadelustv.pages.dev/**` a été validée. Le projet Cloudflare de test a `developpement/phasmo-v2` comme branche de production Pages ; cela ne change pas `main` GitHub.

**Publication privée de test préparée et branchée sur `developpement/phasmo-v2` uniquement :**
- Migration Supabase appliquée : `phasmo_journal_private_preview_publication_v1`, source `docs/phasmo-journal-preview-publication-schema-v1.sql` ;
- Deux tables nouvelles : `public.phasmo_journal_preview_publications` (dernière copie publiée privée) et `public.phasmo_journal_preview_publication_history` (historique des publications), avec RLS activée et aucune lecture accordée à `anon`. Administration carnet exclusivement, y compris la lecture test. Aucune table de publication de production créée ni exposition au public.
- Fonctions trigger dans le schéma privé `phasmo_journal_private` : validation du rôle `phasmo_journal_admins`, lecture de la dernière révision du brouillon partagé avec verrou, **copie exacte du JSON enregistré en base**, refus si la révision source a changé, auteur/date et compteur de publication attribués côté serveur, historique automatique. Les utilisateurs ne peuvent pas injecter directement leur contenu local dans un snapshot publié.
- UI dans `journal-editor.html` section 7 : **Publier pour test (admin)** et **Voir le livre publié en test**, avec affichage d'état. Module `journal-preview-publish.js` : contrôle Twitch et admin, lecture de la révision courante, confirmation explicite (les modifications non sauvegardées sur Supabase ne sont pas incluses), envoi du seul numéro de révision. L'éditeur continuera de sauver le brouillon séparément.
- Module `journal-preview-publication-viewer.js` : sur `journal-editor.html?viewer=1&publication=preview`, impose la session Twitch et le rôle admin, puis lit exclusivement le snapshot publié, l'importe dans le moteur de lecture V7 et affiche le carnet. Il ne consulte aucun brouillon. Un mode dédié évite de restaurer/écraser le localStorage de l'éditeur et cache le carnet tant que l'auth et la publication n'ont pas été contrôlées. Un refus reste un écran de statut, pas la maquette locale affichée par erreur.
- **Sécurité/test réalisés** : SQL en transaction avec ROLLBACK : publication n°1 à partir du brouillon enregistré révision 4, mise à jour temporaire du brouillon révision 5 puis publication n°2 ; deux snapshots distincts historisés, chaque snapshot égal au brouillon sauvegardé de sa révision ; anonyme refusé à SELECT (absence de GRANT), compte authentifié sans rôle refusé à l'écriture. Deux nouvelles tables RLS/politiques confirmées, aucun avis de sécurité Supabase nouveau rattaché à ces tables. 13 contrôles JavaScript et de structure pour le bouton, l'import du lecteur, l'absence de fuite de localStorage, les refus sans connexion/role/version. Toutes les transactions de test ont été annulées : **brouillon enregistré préservé, 0 publication, 0 historique de publication en base**.

**Recette navigateur encore nécessaire** : attendre que Cloudflare serve le nouveau commit de branche, ouvrir `https://deadelustv.pages.dev/modules/phasmophobia/journal-editor.html` connecté Twitch. Après avoir enregistré le brouillon voulu, cliquer « Publier pour test (admin) », accepter. Cliquer « Voir le livre publié en test » dans un autre onglet : le lecteur doit retrouver les cinq onglets, fiches/calques/sous-rubriques, les images qui tiennent dans le JSON et la navigation. Modifier **ensuite** le brouillon et enregistrer sur Supabase sans republier : le lecteur publié doit **rester identique**. Republier explicitement, recharger le lecteur : nouvelle version. Tester absence de publication, compte non autorisé, et navigateur sans Twitch. Ne pas lancer la publication avant d'être prête : la copie est privée mais persistante.

**Restent à construire** : migration Storage des images/polices pour dépasser les limites JSON (~7,5 Mo), réelle publication de production lisible publiquement (politique RLS publique limitée aux snapshots `production`, séparation stricte d'avec `preview`), conservation/restauration des versions et rétention, intégration du lecteur sur la page principale, tests avec Deadelus et sur mobile, validation UX finale. Aucune fusion `main`, aucun changement des modules News/TCG.


### 28/10/2026 — Validation utilisateur : publication PREVIEW privée

**Validation utilisateur reçue** : « je valide ça fonctionne! » après test de la fonction **Publier pour test (admin)** et de l'ouverture du livre en **lecture de publication privée** sur Cloudflare DEV. Le flux de publication preview et son accès navigateur sont acceptés. La validation ne signifie pas que les tests exhaustifs de séparation brouillon/publication (modification sans republier), d'historique, d'édition concurrente depuis le compte Deadelus, ni la publication publique ont été faits.

**Statut** : publication PREVIEW privée opérationnelle, branche `developpement/phasmo-v2` uniquement. Aucune fusion `main`. Les prochains chantiers restent le stockage des médias (Supabase Storage, images/polices), la recette multi-administrateurs avec Deadelus et la vraie publication publique, qui demeure distincte du pilote privé et requiert validation avant activation.


### 28/10/2026 — Stockage des médias dans Supabase Storage : premier pilote PREVIEW

**Autorisation reçue** de l'utilisatrice de passer à Storage après validation dans le navigateur de la sauvegarde partagée et de la publication privée.

**Implémentation sur `developpement/phasmo-v2` uniquement :**
- Migration appliquée `phasmo_journal_storage_preview_private_v1`, script versionné dans `docs/phasmo-journal-storage-preview-v1.sql`. Bucket `phasmo-journal-draft-assets` **privé** et dédié uniquement au carnet preview (pas de réutilisation des buckets News/TCG). Taille maximale par objet 6 000 000 octets ; extensions/MIME pour PNG/JPEG/WebP/GIF, TTF/OTF/WOFF/WOFF2. Deux politiques `storage.objects` : lecture réservée aux admins/éditeurs du carnet connectés, insertion réservée aux mêmes rôles, dans `images/<uuid-auth>/<hash-sha256>.<ext>` ou `fonts/<uuid-auth>/<hash-sha256>.<ext>`. Aucun droit client UPDATE/DELETE et aucun accès anonyme ; fichiers immuables pour conserver la fiabilité de l'historique des publications. La purge des orphelins **n'est pas encore créée** et devra préserver les fichiers référencés par toutes les révisions et publications.
- Module `public/modules/phasmophobia/journal-storage-media.js` : transforme à la sauvegarde Supabase les chaînes `data:...;base64` des images des calques (`elements[].image`) et des polices importées (`fonts[].data`) en références `journal-storage://...`, après import privé des objets et calcul du SHA-256. Deux occurrences d'un média identique partagent le même fichier, les uploads répétés ne remplacent pas les objets. Aucun stockage distant n'est modifié si un transfert média échoue avant l'écriture du brouillon. La version de base sauvegardée contient les références, pas le base64.
- Au chargement de brouillon depuis Supabase, restauration sécurisée des références privées en base64 **en mémoire pour le moteur V7 existant**, conservant le rendu, les polices, l'édition, le JSON exportable et le `localStorage`. La publication privée copie les références et sa visionneuse utilise aussi le module pour télécharger les fichiers avec la session Twitch admin. La visionneuse de publication ne restaure ni n'écrase le brouillon local. Les snapshots plus anciens contenant du base64 continuent d'être lus sans conversion destructive. Conversion des images et polices en Storage lors de la prochaine **sauvegarde manuelle** de la révision chargée.
- `journal-editor.html` : module media ajouté avant synchro/publication. Import depuis stockage distant supporte jusqu'à 85 Mo de JSON restauré (l'import manuel de JSON local conserve sa limite à 17 Mo). La sauvegarde distante garde la limite de JSON post-conversion de 7,5 Mo (contrôle SQL max 8 Mio). Un fichier individuel reste limité à 6 Mo.
- **Tests réalisés** : syntaxe JS validée, 9 simulations de transfert + restauration, déduplication, conservation du JSON local, mémorisation des références stables, refus upload, polices OTF ; bucket vérifié privé avec la liste MIME/limite, politiques Storage en place ; expression régulière SQL vérifiée avec des chemins d'image et police valides et les extensions/chemins incorrects refusés ; aucun avis de sécurité Supabase nouveau rattaché au bucket. **Test réel de téléchargement/upload depuis le navigateur connecté restant à faire**. Aucun fichier média encore téléchargé dans le nouveau bucket à la fin des contrôles ; brouillon et publication preview existants sont préservés tels quels.

**Recette utilisateur recommandée** : une fois Cloudflare à jour, charger le brouillon partagé (et vérifier le contenu initial), sélectionner un calque image et importer une petite PNG/WebP, enregistrer sur Supabase, confirmer, F5, recharger le brouillon : image toujours visible. Vérifier le nouveau fichier dans Supabase Storage → bucket `phasmo-journal-draft-assets`. Refaire une sauvegarde sans modifier l'image : pas de remplacement ni double stockage. Publier ensuite **pour test privé** à partir de cette révision et ouvrir « Voir le livre publié en test » : l'image doit s'afficher. Tester une police personnalisée seulement si l'utilisatrice en utilise. Vérifier que le JSON local conserve des chaînes data:base64 et que le JSON distant contient des références. S'assurer que le navigateur conserve le brouillon local si l'upload est refusé.

**Encore hors périmètre** : bucket public de publication production, exposition publique du carnet, fusion sur `main`, suppression automatique des médias orphelins, conversions futures pour un accès public. Les médias du bucket privé ne peuvent pas être servis directement aux visiteurs anonymes, ce qui est voulu pour l'instant.


### 28/10/2026 — Validation du premier média réel dans Storage

**Retour utilisateur** : « Parfait l'image apparait ». L'utilisatrice confirme l'affichage de l'image après la mise en place de Supabase Storage pour le carnet V7.

**Vérification Supabase en lecture seule** : bucket privé `phasmo-journal-draft-assets` contenant **1 objet image** et **0 police** ; le brouillon partagé `preview` a atteint la **révision 7**, avec **1 image de calque référencée par `journal-storage://` dans le JSON distant**, et non un gros bloc base64. Cela valide le transfert d'un média réel au stockage distant et le bon enregistrement de sa référence. La phrase « l'image apparait » ne permet pas à elle seule de conclure que le test F5/rechargement ou la visionneuse de la publication privée ont été effectués : ces deux vérifications visuelles restent à confirmer séparément. Un test de police importée et la vérification de non-duplication lors de nouvelles sauvegardes restent également ouverts.

**Périmètre préservé** : `developpement/phasmo-v2` et bucket dédié, sans fusion `main` ni activation d'un Storage public.


### 28/10/2026 — Validation navigateur complète : images Storage et publication PREVIEW

**Recette utilisateur confirmée :** après migration des images dans le bucket privé `phasmo-journal-draft-assets`, l'utilisatrice a effectué en conditions réelles les étapes suivantes :

1. **Charger le brouillon partagé** : l'image précédemment transférée dans Storage est bien présente dans l'éditeur après rechargement.
2. **Publier pour test (admin)** : publication privée réalisée depuis l'atelier V7.
3. **Voir le livre publié en test** : l'image est bien présente dans la visionneuse de publication privée. L'utilisatrice conclut « validé ».

**Statut : circuit complet des images Storage validé en navigateur**, de l'enregistrement distant à la lecture du brouillon puis à la publication PREVIEW privée. Les médias restent privés, accessibles via authentification et contrôles RLS. Aucune activation de publication publique ni fusion `main`.

**Restent ouverts** : recette réelle des polices personnalisées importées (TTF/OTF/WOFF/WOFF2), vérification des mises à jour concurrentes avec Deadelus, gestion des fichiers orphelins et préparation ultérieure des médias de la publication publique. La validation des images ne vaut pas validation automatique de ces points.


### 28/10/2026 — Validation réelle de Supabase Storage pour les polices

**Recette rapportée par l'utilisatrice :** police importée et carnet **enregistré sur Supabase**, puis **brouillon partagé rechargé** sans problème, **publication de test administrateur** effectuée. Dans le panneau Supabase Storage, elle confirme un nouveau répertoire `fonts` avec un fichier daté du 28/10 vers 04 h 12 et le répertoire `images` issu du test précédent. Elle valide implicitement le parcours de sauvegarde/chargement/publication de la police.

**Contrôle SQL en lecture seule après la recette :** bucket privé `phasmo-journal-draft-assets` : **1 fichier font** + **1 fichier image**. Brouillon `preview` à la **révision 9** comportant **1 référence `journal-storage://` dans `fonts[].data`**. Publication privée `preview` issue de la **révision 9** et comportant elle aussi **1 référence de police Storage**. Les données distantes et l'archive publiée utilisent donc bien des références de fichiers plutôt que des blobs base64 intégrés.

**État :** stockage et restauration fonctionnelle des médias du carnet V7 (images et polices) validés dans le flux réel. **Confirmation visuelle explicite reçue ensuite** : la police personnalisée s'affiche correctement dans le livre ouvert via « Voir le livre publié en test ». Le circuit complet des polices, de l'import et la sauvegarde Storage au rechargement du brouillon, à la publication privée et au rendu typographique, est **validé en navigateur**. Tests en second compte administrateur, pilotage d'une publication publique, gestion des médias orphelins et `main` demeurent hors de cette validation.


### 28/10/2026 — Publication officielle : infrastructure préparée et désactivée

**Orientation de travail confirmée :** avancer sur la partie technique avant les retouches de détail de l'atelier et du rendu. La publication publique est préparée sur `developpement/phasmo-v2` seulement, **sans l'activer** et sans changer `main`.

- Migration Supabase `phasmo_journal_production_publication_inactive_v1` appliquée depuis `docs/phasmo-journal-production-publication-preparation-v1.sql`. Deux tables vides : `phasmo_journal_production_publications` et `phasmo_journal_production_publication_history`. RLS : une version n'est visible anonymement que si `visibility='live'`; aucune écriture directe n'est accordée aux clients `anon` ou `authenticated`. Pas encore d'opération de promotion vers `live`.
- Bucket `phasmo-journal-public-assets` créé **public et vide**. Il n'a aucune permission d'upload client ; ne pas y copier un média non approuvé. Le bucket privé `phasmo-journal-draft-assets` et les permissions de l'éditeur sont inchangés.
- Nouveau `journal-public-media.js` et `journal-publication-viewer.js` : lecteur sans session Twitch, uniquement depuis la table officielle, uniquement depuis le bucket public, sans brouillon/localStorage ni réutilisation de la preview privée. Le parent est notifié seulement une fois la publication chargée.
- `journal-editor.html` : ajout du mode `?viewer=1&publication=public`. `public/index.html` sur la **branche DEV** pointe désormais l'iframe du livre vers ce lecteur officiel ; en l'absence de version `live`, le panneau du carnet affiche volontairement un message « en préparation ». Le lien privé « Voir le livre publié en test » reste disponible dans l'atelier.
- Contrôles : 11 vérifications de structure/JS avec simulations d'une publication absente et présente, et du signal `journal-ready`. Test SQL transactionnel sur la politique RLS : brouillon officiel `disabled` invisible par `anon`, `live` lisible dans une transaction annulée, sans laisser de contenu publié. Le contrôle final confirme **0 publication officielle, 0 historique officiel, 0 média public**, lecture anonyme autorisée pour le futur seulement et aucune autorisation client d'INSERT. Aucun nouveau avis de sécurité Supabase sur ces tables.

**Plan de mise en ligne, sécurité des médias et liste des tests futurs :** `docs/phasmo-journal-publication-officielle-plan.md`. Restent notamment le mécanisme de promotion transactionnelle/autorisé par administrateur, le transfert public de médias **approuvés** avec licences de polices, les annulations/restaurations, la vérification multi-comptes et la recette navigateur de la nouvelle iframe. Aucun contenu du carnet n'est encore publiquement consultable.


### 28/10/2026 — Recette navigateur : lecteur public sans publication

**Retour utilisateur :** sur le site DEV, en ouvrant la rubrique « Livre », l'utilisatrice confirme voir le message indiquant que le carnet arrive / est en préparation. **Résultat attendu et validé** : aucune publication officielle `live` n'étant disponible, la visionneuse publique affiche un écran d'attente et ne révèle ni brouillon local, ni brouillon Supabase, ni publication de test privée. Cette confirmation valide le scénario visuel « aucune publication publique » dans le navigateur ; elle ne valide pas encore le scénario public avec une publication officielle active.

**Suite prévue :** préparer l'opération de publication officielle contrôlée (autorisation administrateur vérifiée côté serveur, médias autorisés, état `disabled` avant activation, historique, restauration/désactivation) et réaliser les tests avant mise en ligne. Ne publier aucun contenu sans validation explicite. Aucune fusion vers `main`.


### 28/10/2026 — Préparation réelle des releases officielles avec verrou serveur

**Décision utilisateur :** poursuivre le travail technique du carnet avant les retouches ergonomiques et visuelles. Travail réalisé **uniquement sur** `developpement/phasmo-v2` et les objets Supabase dédiés, sans activer de publication officielle.

**Backend préparé et déployé :**
- Migration `phasmo_journal_release_management_locked_v1` depuis `docs/phasmo-journal-release-management-v1.sql`. `phasmo_journal_production_candidates` stocke la **dernière publication preview figée** soumise à validation (snapshot JSON V7, révision source, numéro de publication privée, inventaire de médias vérifiés, auteur/date), accessible en lecture uniquement aux administrateurs du carnet. Un contrôle privé `phasmo_journal_production_release_controls.activation_enabled=false` bloque toute activation. Aucune permission d'écriture publique attribuée aux utilisateurs Twitch.
- Fonctions SQL `phasmo_journal_commit_official_release` (opération transactionnelle avec verrou, contrôles snapshot/admin, validation des médias publics existants, nouvelle publication et entrée d'historique) et `phasmo_journal_disable_official_release` (mise hors ligne d'urgence, autorisée même si le verrou activation est refermé). `EXECUTE` accordé au seul rôle serveur `service_role`, révoqué aux rôles `PUBLIC`, `anon`, `authenticated`.
- Migration `phasmo_journal_release_restore_locked_v1` depuis `docs/phasmo-journal-release-restore-v1.sql` : restauration d'une ancienne release historique en **nouvelle release numérotée**, avec vérification préalable des médias encore présents. Restauration elle aussi bloquée par le verrou serveur et réservée au service role.
- Edge Function déployée `phasmo-journal-release` (version 2, `verify_jwt=true`) depuis `supabase/functions/phasmo-journal-release/index.ts` : origine DEV autorisée, JWT de l'utilisateur Twitch revérifié, permission administrateur vérifiée en DB avant chaque action. Actions `status`, `prepare`, `activate`, `offline`, `restore`. `prepare` lit **exclusivement la publication de test déjà figée**, valide la structure V7 et chaque média privé (format, taille et empreinte SHA-256), puis enregistre un candidat privé. Elle ne copie aucun fichier dans le bucket public. Les actions `activate` et `restore` sont verrouillées en DB ; même si un utilisateur forge une requête directe, leur validation est refusée. Une future activation demandera confirmation explicite ET attestation de droits médias, ainsi qu'une approbation séparée pour ouvrir le verrou.
- UI sur `journal-editor.html` : **Vérifier l'état officiel** et **Préparer une version officielle (privée)**, avec messages détaillés. Nouveau `journal-official-prepare.js`; aucun bouton de publication officielle immédiate, de restauration ou de déverrouillage n'est exposé à l'utilisateur. La publication preview et le carnet public restent des circuits séparés.

**Tests effectués** : création des tables/fonctions + déploiement Edge réussis, 14 contrôles syntaxiques, UI, isolation du brouillon et simulations des boutons, refus SQL réel de commit/restauration quand `activation_enabled=false`, refus SQL réel d'EXECUTE par le rôle `authenticated`. Contrôle après migration : **0 candidat, 0 publication officielle, 0 historique officiel, 0 fichier public**, verrou `false`, fonctions actives seulement au rôle serveur. Aucun avis de sécurité critique nouveau lié à ces fonctions. L'avis informatif Supabase `RLS enabled, no policy` sur la table de contrôle est **intentionnel** : cette table est intégralement refusée aux rôles navigateur et utilisée seulement par le service role.

**Recette navigateur encore à faire** : attendre Cloudflare sur `developpement/phasmo-v2`, charger l'éditeur connecté administrateur Twitch, cliquer « Vérifier l'état officiel » (doit indiquer verrouillage), puis « Préparer une version officielle (privée) » (doit rapporter la révision de la publication de test et le nombre réel d'images et polices). Après préparation, le carnet côté visiteurs doit **toujours** montrer le message de préparation. Aucun fichier ne doit apparaître dans `phasmo-journal-public-assets`. Si ces points passent, le stade privé sera validé ; la mise en ligne effective et les restaurations publiques resteront à tester **après consentement explicite**.

**Note technique à approfondir** : tester une activation et une restauration *transactionnelles* sur un environnement isolé ou via un jeu de test entièrement annulé, notamment les collisions de numéros de version et la conservation de tous les fichiers historiques, avant de rendre une activation publique possible. Ne pas traiter l'existence de la fonction serveur comme une autorisation de déverrouiller `activation_enabled`.


### 28/10/2026 — Incident bouton « Vérifier l'état officiel » : réponse Edge non-2xx

**Signalement navigateur** : après mise en place de la préparation officielle, l'utilisatrice clique sur « Vérifier l'état officiel » et obtient « Contrôle refusé : Edge Function returned a non-2xx status code ». Le chargement du carnet et les versions privées antérieures ne sont pas en cause ; le refus concerne la nouvelle fonction `phasmo-journal-release`.

**Constat** : la nouvelle Edge Function (v2, `verify_jwt=true`) existe et ses logs montrent un démarrage ; le retour HTTP précis n'était pas affiché par `journal-official-prepare.js` car `functions.invoke()` remplit `error.context` (réponse HTTP) et pas forcément `data` lorsque l'HTTP est non-2xx. Le code présentait donc uniquement l'erreur générique. À ce stade, la cause HTTP exacte (session, permissions, origine, environnement serveur) **n'est pas prouvée** par les logs disponibles.

**Correctif GitHub** sur `developpement/phasmo-v2`, commit `747fe535b291d5da74e1ef5cb036e00ae670e139` : demander la session active Supabase/Twitch après `getUser()`, transmettre explicitement `Authorization: Bearer <session.access_token>` à `functions.invoke` et afficher le statut HTTP, `sb-error-code` et le message JSON sécurisé de `error.context` lorsque la fonction refuse l'appel. Aucune permission accordée, aucun déverrouillage et aucune désactivation de la vérification JWT. Huit simulations JavaScript : réussite du contrôle, envoi du Bearer, diagnostic HTTP 401 et code d'erreur, et blocage sans utilisateur/session.

**Statut** : *correctif déployable via Cloudflare*, recette navigateur à refaire sur « Vérifier l'état officiel ». **Ne pas déclarer l'incident résolu avant confirmation utilisateur**. En cas de refus persistant, le nouveau message HTTP détaillé permettra de corriger précisément la cause réelle sans affaiblir la sécurité.


### 28/10/2026 — Cause confirmée et correction SQL de l'échec HTTP lors du contrôle officiel

**Cause identifiée après le correctif diagnostic** : les objets `phasmo_journal_*` avaient explicitement révoqué les permissions SQL générales et `service_role` n'avait reçu **aucun `GRANT SELECT`** sur les tables requises par la nouvelle Edge Function, dont `phasmo_journal_production_release_controls`. La fonction pouvait démarrer, mais la lecture de ces tables via `client.from(...)` avec la clé serveur devait échouer. Vérifié avec `has_table_privilege('service_role', ...)` : avant correction, tous les accès `SELECT` pertinents étaient `false`.

**Correction appliquée sur Supabase**, migration `phasmo_journal_release_service_role_grants_v1`, script versionné `docs/phasmo-journal-release-service-role-grants-v1.sql`, commit GitHub `ceb79d7c63f82f4dad9903de3fb9631051fc7ea3` sur `developpement/phasmo-v2` : `GRANT SELECT` minimal à `service_role` pour la table admin, la dernière publication privée, le verrou serveur, le candidat privé, la publication officielle et son historique ; `GRANT INSERT,UPDATE` pour le **seul candidat privé**, nécessaire au `upsert` de préparation. Aucun `GRANT` supplémentaire à `anon` ou `authenticated`.

**Vérification réelle** : tous les privilèges serveur attendus passent à `true`. En `SET LOCAL ROLE service_role` dans une transaction de lecture annulée, 2 administrateurs, 1 publication preview, accès au verrou et aux tables de candidats/historique/publication sont tous lisibles sans refus. Les privilèges client directs restent absents ; `activation_enabled=false`, 0 version officielle, 0 fichier public. Avis sécurité Supabase examiné ; seul l'avis informatif RLS sans policy sur la table de verrou reste intentionnel pour garantir l'absence d'accès client.

**Correctif frontal complémentaire** : commit `747fe535b291d5da74e1ef5cb036e00ae670e139` : passage explicite du JWT utilisateur à l'Edge Function et affichage du statut HTTP, du code d'erreur et du motif retourné. La recette navigateur « Vérifier l'état officiel » reste **à confirmer par l'utilisatrice**, mais la cause SQL vérifiée a été supprimée. Aucun changement `main`, aucune activation publique.


### 28/10/2026 — Recette validée : Vérifier l'état officiel

**Confirmation réelle de l'utilisatrice :** après la correction des droits SQL `service_role` et du diagnostic JWT, le bouton **« Vérifier l'état officiel »** fonctionne dans l'éditeur DEV et retourne exactement : « Publication publique verrouillée. Aucun candidat officiel préparé. Aucune version publique en ligne. »

**Statut : contrôle du statut officiel validé en navigateur**, incident précédent « Edge Function returned a non-2xx status code » résolu pour cette action. La connexion authentifiée à la fonction Edge et l'accès serveur au statut sont opérationnels. Le verrou `activation_enabled=false` reste fermé. **Prochaine recette** : cliquer « Préparer une version officielle (privée) », vérifier la révision de la publication preview, les images et polices contrôlées, confirmer qu'aucun contenu ni média n'est rendu public. La préparation privée n'est pas encore validée dans le navigateur.


### 28/10/2026 — Recette validée : préparation privée d'une version officielle

**Confirmation utilisatrice :** la préparation d'une version publique/« officielle (privée) » fonctionne depuis l'atelier connecté ; la page Livre du site DEV continue correctement d'afficher « carnet en préparation ».

**Contrôle Supabase réel après la recette :** 1 candidat privé enregistré dans `phasmo_journal_production_candidates`, prélevé sur la publication privée **n°6**, brouillon source **révision 10**. Le verrou `activation_enabled=false` reste fermé ; 0 publication officielle et 0 fichier dans `phasmo-journal-public-assets`. **Attention importante pour la recette des médias :** ce candidat et la publication privée n°6 contiennent actuellement 73 calques mais **aucun calque image et aucune police importée**, leur manifeste comporte donc **0 média**. Les précédents tests Storage image/police sont distincts de cette version figée ; ne pas affirmer que le transfert d'images/polices vers les médias publics a été testé ici. Les deux fichiers Storage privés précédents ne sont pas supprimés par cette préparation.

**Statut :** préparation privée validée côté utilisatrice et enregistrée ; attente du feu vert futur de publication officielle et des tests de copie d'une version contenant des médias, restauration et activation sous contrôle. Aucun changement sur `main`.


### 28/10/2026 — Bibliothèque privée d'images et de polices existantes

**Demande utilisatrice :** proposer, dans la section « Polices et images », le choix entre **importer un fichier** et **utiliser un fichier déjà présent dans Supabase Storage**, afin d'éviter les doublons et de retrouver les médias après un reset local de l'atelier.

**Implémenté uniquement sur `developpement/phasmo-v2` :**
- Nouvelle migration `phasmo_journal_private_asset_library_v1`, versionnée dans `docs/phasmo-journal-private-asset-library-v1.sql`. Deux fonctions `SECURITY INVOKER`, `phasmo_journal_list_private_assets(kind,page)` (24 éléments/page triés par date) et `phasmo_journal_find_private_asset(kind,sha256,extension)`. Seuls les comptes Twitch **déjà autorisés** Phasmo admin/éditeur disposent des droits via les RLS existantes sur `storage.objects` et contrôles `auth.uid()`. Aucune permission visiteur, aucun ajout de `UPDATE`/`DELETE`, aucun changement sur News/TCG ou le Storage public.
- Dans `journal-editor.html`, section **4 · Polices et images** : boutons « Importer une police » / « Police déjà enregistrée » et « Importer une image » / « Image déjà enregistrée » ; nouveau dialogue commun de bibliothèque, statut et pagination. Dans le nouveau `journal-asset-library.js`, fichiers du bucket privé présentés avec miniatures pour les images et prévisualisations typographiques pour les polices quand une URL signée courte est disponible, informations de format, date et taille ; téléchargement privé authentifié uniquement après choix.
- Moteur d'édition : méthode `useLibraryAsset` du bridge permettant de remplir le **calque Image sélectionné** ou d'appliquer la **police existante** au calque texte sélectionné. La police réutilisée reçoit une famille locale déterministe basée sur le SHA-256 pour ne pas multiplier les définitions d'une même police dans le JSON. Le format JSON local reste en `data:` et la sauvegarde Supabase distante reste en références Storage.
- `journal-storage-media.js` : expose lecture/catalogue privé et recherche **SHA-256 avant upload**, réutilisant les objets existants, même déposés par un autre compte autorisé. Le contenu trouvé est re-téléchargé et sa véritable empreinte SHA-256 contrôlée avant réemploi. Conserve upload immuable et les limites existantes. Il reste possible que deux transformations/encodages différents d'une même image aient des SHA-256 différents : on déduplique par octets *identiques*, pas par ressemblance visuelle.
- Les anciens fichiers Storage restent dans la bibliothèque même si l'atelier local a été réinitialisé : vérifié dans `storage.objects`, 1 image WebP et 1 police TTF historiques présentes. Le nom original du fichier n'était pas conservé dans le chemin Storage préexistant ; la bibliothèque présente donc un identifiant SHA abrégé, une miniature ou un aperçu de police et les métadonnées, sans inventer de nom.

**Recette/tests :** migration appliquée ; RLS vérifiées en lecture SQL sous rôle `authenticated` avec identité autorisée (2 catégories renvoyées et recherche d'empreinte positive), refus d'accès non authentifié/sans rôle, aucun droit `anon` sur les RPC. 12 tests syntaxiques et mocks des méthodes média (réemploi SHA, absence de nouvel upload, intégrité des données locales, contrôle des chemins), 7 tests UI simulés (ouvrir la bibliothèque images/polices, choisir, fermeture du dialogue). Aucune publication officielle créée : `activation_enabled=false`, 0 média dans le bucket public. **Recette manuelle réelle de la nouvelle bibliothèque dans le navigateur encore à faire.**

**À vérifier par l'utilisatrice** sur la page DEV après rechargement : sélectionner un calque Image → « Image déjà enregistrée » → revoir l'ancien WebP et l'appliquer ; sélectionner un calque texte → « Police déjà enregistrée » → retrouver l'ancienne TTF, l'appliquer, puis sauvegarder/recharger depuis Supabase. Vérifier qu'aucun nouveau fichier n'est ajouté dans Storage pour la simple réutilisation, et que la publication PREVIEW privée continue de fonctionner. Pas de fusion `main`.


### 28/10/2026 — Incident : image visible en preview, police de bibliothèque absente

**Signalement réel utilisatrice :** la publication de test affiche l'image réutilisée depuis la bibliothèque privée, mais pas la police TTF sélectionnée dans cette même bibliothèque.

**Diagnostic SQL vérifié avant correctif :** le brouillon partagé **révision 11** et la publication privée **n°7** (source révision 11) possèdent tous deux **1 image Storage**, **1 calque heading** dont le champ `font` vaut `Atelier_Biblio_39b1ba451445b73ebb992afdd2438100879c73a2c0b044737f6419629037aeb9`, mais **`payload.fonts=[]`**. Le lecteur ne dispose donc pas de la définition de la police et utilise un substitut. Le vrai fichier `fonts/<uuid>/39b1ba45….ttf` existe toujours dans le bucket privé. La raison précise pour laquelle la définition a disparu de `payload.fonts` dans le flux antérieur reste inconnue ; ne pas affirmer que le choix de la police est lui-même défaillant.

**Correctifs sur `developpement/phasmo-v2` :**
- `journal-storage-media.js` : lorsque des calques référencent une famille `Atelier_Biblio_<sha256>` absente de `payload.fonts`, l'étape de restauration de publication/brouillon et la préparation d'une sauvegarde recherchent la police par empreinte dans le Storage privé, la téléchargent, vérifient le SHA-256 et rétablissent sa définition. Référence restaurée en `data:` pour le lecteur, convertie en `journal-storage://fonts/…` pour la sauvegarde distante, sans second import. Une famille personnalisée non récupérable bloque l'opération avec message explicite.
- `journal-editor.html` : en lecture de publication distante, le chargement d'une police qui échoue n'est plus silencieusement ignoré. Toute police personnalisée encore manquante empêche l'affichage d'un faux rendu « réussi ».
- Migration `phasmo_journal_preview_font_integrity_v1` appliquée depuis `docs/phasmo-journal-preview-font-integrity-v1.sql` : deux triggers `BEFORE INSERT OR UPDATE`, sur les brouillons et les publications privées preview. Ils refusent une nouvelle écriture si un calque référence une famille personnalisée sans entrée `fonts` avec référence Storage privée correctement structurée. Sur la publication, le contrôle se déclenche après le trigger de copie du brouillon enregistré. **Les anciennes lignes DB n'ont pas été modifiées ; le correctif protège les écritures suivantes.**

**Vérifications :** tests JS de restauration + réparation à la sauvegarde sur une famille `Atelier_Biblio_<sha>`, préservation du payload local original, absence de réupload et refus d'une famille sans média ; 6 contrôles supplémentaires de syntaxe et d'intégration dans les deux lecteurs. Vérification SQL du chemin privé exact par `phasmo_journal_find_private_asset` sous rôle authentifié autorisé : fichier TTF trouvé. Deux triggers installés. Côté publication **publique** : verrou toujours `false`, 0 version publique, 0 fichier public.

**Recette navigateur attendue :** rafraîchir l'aperçu « Voir le livre publié en test » avec Ctrl+F5 et vérifier que le titre utilise désormais la TTF. Pour corriger définitivement le snapshot stocké (l'actuelle révision 11 et publication #7 sont historiquement incomplètes), retourner dans l'éditeur, **Charger le brouillon partagé**, contrôler le titre, **Enregistrer sur Supabase**, puis **Publier pour test (admin)**. Le nouvel enregistrement devrait compter `fonts=1` et la prochaine publication test devrait le reprendre. Confirmer visuellement en navigateur avant de passer l'incident à « résolu ».


### 28/10/2026 — Recette navigateur : police restaurée dans l'aperçu privé

**Retour utilisateur confirmé :** après le correctif de récupération des familles `Atelier_Biblio_<SHA256>` depuis le Storage privé, l'utilisatrice confirme : « c est good j'ai la font dans l'apercu ». La **police TTF personnalisée s'affiche désormais dans le livre publié en test**, et l'image précédemment sélectionnée y était déjà visible. **Scénario de rendu navigateur validé**. Cela confirme la récupération de la police pour cette visualisation, mais pas à lui seul la persistance d'une nouvelle entrée `payload.fonts` dans la publication existante ; ne déclarer cette étape durablement réparée en base qu'après contrôle de la version enregistrée/publiée. Aucun changement `main` ni diffusion publique.


### 28/10/2026 — Police conservée dans la publication privée n°8

**Retour utilisatrice :** après l'affichage réparé de la police personnalisée dans le livre publié en test, elle a chargé le brouillon, publié une nouvelle version de test puis ouvert le livre publié en test.

**Contrôle SQL réel après les actions :** `phasmo_journal_preview_drafts` à la **révision 12** et `phasmo_journal_preview_publications` à la **publication de test n°8 (source révision 12)**. Les deux documents ont chacun **1 image** référencée dans Storage privé, **1 police personnalisée** dans `payload.fonts`, et **1 calque heading** dont le champ `font` correspond à l'entrée `fonts[].family`. La police est une référence `journal-storage://fonts/…`, pas un lien local ou une famille orpheline. **Le défaut de persistance des polices observé sur la révision 11 / publication n°7 est désormais corrigé pour la nouvelle révision et la nouvelle publication.**

**Statut :** le rendu de la police dans l'aperçu avait été confirmé visuellement par l'utilisatrice au test précédent ; la persistance dans le brouillon et la publication est **confirmée par SQL**. Les anciens snapshots historiques ne sont pas altérés. Aucun déploiement sur `main`, aucun contenu officiel rendu public.


### 28/10/2026 — Recette validée : candidat officiel privé révision 12 avec image et police

**Confirmation utilisatrice :** après avoir confirmé « Préparer PRIVÉMENT la dernière version publiée en test », l'atelier indique exactement « Version officielle préparée en privé : révision 12, publication de test n°8. Médias vérifiés : 1 image(s), 1 police(s). Aucune publication publique effectuée. Activation toujours verrouillée ».

**Vérification indépendante SQL :** `phasmo_journal_production_candidates` contient le **candidat de la publication de test n°8/source révision 12**, avec un manifeste de **2 médias** (1 image, 1 police) et un horodatage de préparation le 28 octobre 2026. La table officielle `phasmo_journal_production_publications` contient **0 ligne**, le bucket `phasmo-journal-public-assets` contient **0 fichier**, et le verrou `phasmo_journal_production_release_controls.activation_enabled` est **false**. Cette préparation valide la phase privée avec médias. Elle ne valide pas encore le transfert effectif vers le bucket public, la transaction d'activation, l'historique ou le rollback.

**Prochain chantier :** éprouver l'activation et les retours arrière sur un environnement de test isolé (ou simulations transactionnelles totalement annulées sans copier de médias publics), avant toute demande de déverrouillage réel. Aucune modification sur `main` et aucune publication publique autorisée.
