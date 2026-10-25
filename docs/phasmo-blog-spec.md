# Phasmophobia — Blog / actualités traduites

**Priorité : élevée (26 octobre 2026).**
**Branche de travail :** `developpement/phasmo-v2`.
**État :** socle de lecture préparé ; aucun article publié et aucun compte rédacteur créé. Aucun changement sur `main`.

## 1. Objectif

Réunir sur DeadelusTV les traductions françaises d'actualités Phasmophobia publiées à l'origine par Kinetic Games. Il s'agit de publications éditoriales validées par l'équipe, pas d'une copie ni d'un import automatique du site Kinetic.

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

## 4. Espace de rédaction : prochaine étape prioritaire (NON développé)

La traductrice, distincte de Deadelus et de la personne qui maintient le site, doit rédiger en ligne sans manipuler GitHub, HTML ou JSON.

Écran envisagé :
- Liste de ses articles et brouillons.
- Formulaire guidé : titre français, résumé, date, URL de l'original, traduction, crédit, image de couverture et texte alternatif.
- Éditeur de blocs, dans l'ordre librement choisi : paragraphe, intertitre, liste, illustration avec légende ; insertion des images **entre les paragraphes**, jamais en arrière-plan.
- Sauvegarde de brouillon, aperçu fidèle au lecteur public et bouton de soumission pour publication.

**Décisions encore nécessaires :** mécanisme de connexion, possibilité de publier directement ou validation préalable, personnes habilitées à valider, règles de modification / dépublication, révisions et journal d'audit.

**Conditions techniques incontournables :**
- Authentification vérifiée côté serveur et droits d'accès réellement limités à Phasmophobia News. Cacher simplement un bouton dans le navigateur ne protège rien.
- Autorisations séparées pour publier, modifier, supprimer, gérer les utilisateurs et les autres modules. Une identité de rédaction ne reçoit pas les privilèges du site entier.
- Validation du contenu riche (pas de HTML/script arbitraire), limitation de taille et de type MIME, nettoyage et contrôle des images ; ne pas supposer que toutes les images de l'article d'origine sont réutilisables.
- États brouillon / relecture / publié, horodatage, crédit et historique des changements. Les écrans de saisie et les API ne devront pas permettre à une personne non autorisée de lire les brouillons d'autrui.
- Si Supabase est retenu : schéma dédié et règles RLS testées, politiques Storage restrictives, jamais de clé service-role dans le navigateur. **Aucune base n'a été modifiée à ce stade.**

## 5. À vérifier avant la mise en ligne

- Autorisation ou base juridique suffisante pour republier les traductions intégrales et éventuelles images de Kinetic ; sinon, privilégier des résumés originaux avec lien.
- Accessibilité clavier, téléphone, images et contrastes ; contrôle de l'URL directe d'article, du retour navigateur et des archives.
- Premier article réel validé par l'équipe pour tester la mise en page, sans texte fictif.
- Revue de sécurité du circuit de rédaction avant l'ouverture à la traductrice.
- Publication ciblée sur `main` **seulement après validation visuelle et fonctionnelle**.

## 6. Pas dans le périmètre immédiat

Webhook Discord automatique des News, import automatisé du blog Kinetic, newsletters, votes/tournois, fonctions du TCG.
