# Phasmophobia — Blog / actualités traduites

**Priorité : élevée (26 octobre 2026).**
**Branche de travail :** `developpement/phasmo-v2`.
**État :** socle de lecture préparé ; aucun article publié et aucun compte rédacteur créé. Aucun changement sur `main`.

## 1. Objectif

Réunir sur DeadelusTV les traductions françaises d'actualités Phasmophobia publiées à l'origine par Kinetic Games. Les traductions sont rédigées et publiées directement par le rédacteur autorisé. Il ne s'agit ni d'une copie ni d'un import automatique du site Kinetic.

La liste officielle https://www.kineticgames.co.uk/news couvre aussi d'autres catégories (par exemple Kinetic Publishing). Seules les actualités pertinentes pour Phasmophobia sont prévues ici.

## 2. Consultation publique

- L'accordéon **News** demeure **fermé par défaut**, comme Livre et Tutos ; la DA validée des trois panneaux est conservée.
- Tant qu'aucun article n'est publié, l'ancienne présentation d'attente et le bouton « Actualités officielles » restent en place.
- À partir du premier véritable article : carrousel horizontal de **9 articles traduits maximum + une 10e carte fixe** vers le blog original Kinetic Games. Les premières cartes sont triées par date de publication sur DeadelusTV, la carte officielle est toujours la dernière.
- Carte article : vignette illustrative si média autorisé, date de publication, titre et courte présentation.
- Lecteur intégré à l'onglet Phasmophobia avec URL partageable `#phasmophobia/news/identifiant`, contenu lisible, crédit à la personne ayant traduit et lien explicite vers l'original.
- Archives `#phasmophobia/news` : publications plus anciennes que les 9 du carrousel, sans les perdre à chaque nouvel article ; affichage des archives proposé lorsqu'il existe au moins 10 publications.
- Aucun article de démonstration, texte original, image de Kinetic ou traduction n'a été copié automatiquement.

## 3. Architecture du prototype lecture seule

- `public/modules/phasmophobia/news.js` : galerie, archives, lecteur et navigation de liens.
- `public/modules/phasmophobia/news.css` : styles isolés à Phasmophobia.
- `public/data/phasmo-news.json` : source **vide** (`{"schemaVersion":1,"articles":[]}`), en attendant une source de publication réelle.
- `public/assets/app.js` : les liens `#phasmophobia/news` et `#phasmophobia/news/{slug}` restent sur la page Phasmo au lieu de retourner à l'accueil.
- Pas d'appel d'API Kinetic ni de changement de Supabase. La synchronisation Shorts YouTube et le livre sont inchangés.

Schéma de lecture envisagé pour chaque publication : `slug`, `title`, `excerpt`, `publishedAt` (AAAA-MM-JJ), `cover` (média local), `translator`, `sourceUrl` (article Kinetic), `blocks` (paragraphes, titres, listes, images dans le flux du texte). Les contenus sont insérés dans le DOM via les API texte et jamais via `innerHTML` ; les adresses source et les chemins de médias sont contraints.

**Limite :** ce JSON statique est une interface provisoire de lecture. Ajouter des fichiers au dépôt ne constitue pas une interface de rédaction ni un mécanisme sécurisé de publication. Un CMS/API contrôlé doit remplacer la source JSON avant usage régulier.

## 4. Espace de rédaction : prototype local créé, publication réelle à développer

**Prototype de rédaction :** `public/modules/phasmophobia/editor-preview.html` (avec `editor-preview.js` et `editor-preview.css`), accessible par son adresse directe de prévisualisation de branche, **non lié depuis le menu public**, et présenté explicitement comme une démonstration sans connexion.

**Fonctions du prototype :** plusieurs brouillons et sauvegarde de texte dans le navigateur, formulaires titre/résumé/date/source/auteur/identifiant/couverture, blocs paragraphes/intertitres/listes/images réordonnables, aperçu de l'article et export d'un brouillon JSON. Pour les images (couverture comme illustrations insérées entre les paragraphes), le rédacteur peut désormais **choisir un fichier depuis son ordinateur (PNG/JPEG/WebP, 2 Mo maximum)** ou **coller directement l'URL HTTPS d'une image**. Le chemin `assets/phasmo-news/...` reste accepté pour les essais, mais n'est plus obligatoire. Un fichier PC sert **uniquement à l'aperçu temporaire** et n'est ni enregistré sur le serveur, ni inclus dans l'export JSON. Une URL HTTPS reste enregistrée dans le brouillon du navigateur et peut être prévisualisée tant que son hébergeur l'autorise.

**Insertion d'images dans le corps de l'article, validée le 26/10/2026 :** le rédacteur peut créer une suite arbitraire de blocs, par exemple **paragraphe → paragraphe → image → paragraphe → paragraphe**, comme dans les articles Kinetic Games. Ce ne sont ni des images de fond ni une galerie séparée. Sous chaque bloc, les actions « + Texte ici » et « + Image ici » insèrent immédiatement un nouveau bloc à l'emplacement choisi ; les commandes déplacer vers le haut/bas restent disponibles. L'illustration peut être chargée du PC ou par URL HTTPS, avec texte alternatif et légende facultative. Le lecteur public et l'aperçu restituent cet ordre naturellement.

**Absents pour le moment :** authentification, partage des brouillons entre machines, stockage d'images, droit d'éditeur côté serveur, vrai bouton Publier et historique des corrections. Le bouton Publier est désactivé, sans simuler de mise en ligne.

**Stockage définitif à développer :** pour publier, les fichiers PC devront être transmis à un stockage contrôlé (p. ex. Supabase Storage ou hébergement équivalent), et les URL externes devront être téléchargées **par le service de publication, uniquement après validation stricte et avec autorisation de réutilisation**, puis hébergées à une adresse stable sur le site. Ne pas effectuer un téléchargement serveur naïf depuis une URL arbitraire (risque de SSRF) : filtrer domaine/IP, taille, redirections, type MIME et contenu, et envisager une liste de sources autorisées. Ne pas utiliser durablement une URL externe comme image publiée sans décider de la politique de sécurité, de confidentialité et de droits. Le lecteur public `news.js` limite actuellement les images aux chemins `assets/phasmo-news/...` : l'URL acceptée par le prototype n'est **pas encore compatible avec la publication réelle**.

**Architecture de comptes prévue :** connexion principale Twitch, association Discord facultative, **un seul compte utilisateur DeadelusTV** ; le rôle `phasmo_news_editor` est affecté à l'utilisateur et non à Discord ou Twitch en tant que tel. Il ne sera pas accordé automatiquement aux modérateurs Discord.

**Point d'architecture à résoudre avant l'authentification :** deux projets Supabase distincts existent aujourd'hui, **Crew'mong Us** et **DeadelusTV TCG**. Les sessions et utilisateurs Auth ne sont pas automatiquement partagés entre ces projets. Définir une source d'identité commune et la stratégie de rattachement des profils existants avant d'ajouter l'accès au blog. Aucun changement n'a été fait sur leurs bases.



Le rédacteur, membre de longue date de la modération DeadelusTV et déjà responsable des actualités Discord en autonomie, doit rédiger et publier en ligne sans manipuler GitHub, HTML ou JSON. Sa confiance éditoriale est actée, tout en conservant des autorisations techniques limitées.

Écran envisagé :
- Liste de ses articles publiés et de ses brouillons.
- Formulaire guidé : titre français, résumé, date, URL de l'original, traduction, crédit, image de couverture et texte alternatif.
- Éditeur de blocs, dans l'ordre librement choisi : paragraphe, intertitre, liste, illustration avec légende ; insertion des images **entre les paragraphes**, jamais en arrière-plan.
- Sauvegarde de brouillon, aperçu fidèle au lecteur public et bouton **Publier** qui met en ligne directement, sans validation par un autre membre de l'équipe.
- Possibilité de corriger et mettre à jour ses articles déjà publiés. La dépublication et les suppressions définitives restent à préciser.

**Décision validée le 26/10/2026 : publication directe et autonome.** Aucun système de demande d'approbation préalable à Deadelus ou à la responsable du site. Parcours retenu : **brouillon → aperçu facultatif → publier → article visible sur le site** ; édition et correction possibles après publication.

**Points encore à arbitrer :** mode de connexion du rédacteur (par exemple Discord OAuth ou compte spécifique), droit de dépublier et de supprimer, gestion des révisions et du journal d'audit. L'ancienneté dans la modération n'octroie pas automatiquement de permission technique : le rôle éditorial doit être attribué explicitement à un compte authentifié.

**Conditions techniques incontournables :**
- Authentification vérifiée côté serveur et droits d'accès réellement limités à Phasmophobia News. Cacher simplement un bouton dans le navigateur ne protège rien.
- Rôle limité **`phasmo_news_editor`** : créer des brouillons Phasmo, les consulter, les modifier, publier sans validation et corriger ses publications. Aucun droit général de configuration, de gestion des comptes, d'administration du TCG ou des autres univers. Dépublication/suppression à décider explicitement avant activation.
- Validation du contenu riche (pas de HTML/script arbitraire), limitation de taille et de type MIME, nettoyage et contrôle des images ; ne pas supposer que toutes les images de l'article d'origine sont réutilisables.
- États **brouillon / publié** (pas d'étape de relecture obligatoire), horodatage, crédit et historique des changements. Les écrans de saisie et les API ne devront pas permettre à une personne non autorisée de lire les brouillons du rédacteur.
- Si Supabase est retenu : schéma dédié et règles RLS testées, politiques Storage restrictives, jamais de clé service-role dans le navigateur. **Aucune base n'a été modifiée à ce stade.**

## 5. À vérifier avant la mise en ligne

- Autorisation ou base juridique suffisante pour republier les traductions intégrales et éventuelles images de Kinetic ; sinon, privilégier des résumés originaux avec lien.
- Accessibilité clavier, téléphone, images et contrastes ; contrôle de l'URL directe d'article, du retour navigateur et des archives.
- Premier article réel utilisé pour tester la mise en page et les liens avant le lancement, sans texte fictif ni obligation d'approbation éditoriale systématique.
- Revue de sécurité du circuit de rédaction avant l'ouverture au rédacteur.
- Publication ciblée sur `main` **seulement après validation visuelle et fonctionnelle**.

## 6. Pas dans le périmètre immédiat

Webhook Discord automatique des News, import automatisé du blog Kinetic, newsletters, votes/tournois, fonctions du TCG.
