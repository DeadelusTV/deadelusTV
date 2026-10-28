# Phasmophobia — News et éditeur privé

**État : 28 octobre 2026 — terminé et validé.** Yekelle confirme la clôture officielle de l’éditeur News après validation de Mattarix ; mise en page publique également validée. Les prochaines interventions relèvent de la maintenance sur remontée de bugs ou de suggestions d’amélioration. Le livre interactif des preuves est un **chantier distinct, non validé**.

Documentation complète sur Drive : [Phasmophobia — Actualités et éditeur privé : documentation et suivi](https://docs.google.com/document/d/1vqHaregg5l-UjjADw3qtzpt79vX0nfxGjt9LFng2kvI/edit).

## Accès et parcours

- Public : https://www.deadelustv.com/#phasmophobia ; sous-onglets **News / Livre / Tutos**.
- Éditeur production : https://www.deadelustv.com/modules/phasmophobia/editor-private.html
- La connexion passe par **Supabase Auth / OAuth Twitch**. La page HTML peut être ouverte publiquement, mais les requêtes de lecture/écriture ne doivent passer qu'avec les **droits RLS** appropriés.
- Droits indépendants de l'administration TCG/Twitch : `public.phasmo_news_editors` ou `public.phasmo_news_admins` avec `enabled=true`. Ne jamais supposer un droit depuis un pseudonyme ou un rôle de modération Twitch.
- URLs de redirection OAuth à autoriser pour les domaines concernés. Ne pas committer de secret.

## Fonctionnalités livrées

- Brouillons privés persistants sur Supabase après F5, autosauvegarde et bouton **Enregistrer**.
- **Nouveau brouillon**, liste de brouillons, **Rédaction/Aperçu**, import/export de sauvegardes **JSON**.
- Barre d'actions : Enregistrer, Exporter, Importer, Publier/Mettre à jour et **Supprimer ce brouillon**. Ce dernier a été déplacé en haut et validé.
- Éditeur WYSIWYG : texte mis en forme, titres, alignements, listes, citations, liens, images intégrées dans le corps et vidéos YouTube/Shorts.
- Métadonnées contrôlées : titre (≤160), résumé (≤350), date, crédit de traduction, URL HTTPS **kineticgames.co.uk/news[/...]**, slug (≤100, minuscules/chiffres/tirets). Le slug publié est immuable.
- **Publication, mise à jour, retrait** des articles via `phasmo_news_articles` ; retrait = `status='unpublished'`, distinct de la suppression d'un brouillon.
- **Vignettes News** (articles publiés), carte permanente de la source officielle avec `public/assets/kinetic-games-news.webp`.
- YouTube sur le lecteur public : intégration et miniatures régies par le consentement existant ; ne pas contourner `DEADELUSTV_CONSENT` / `DEADELUSTV_EMBEDS`.

## Cloisonnement impératif test / production

| | Développement (`developpement/phasmo-v2`) | Production (`main`) |
|---|---|---|
| Brouillons | `public.phasmo_news_drafts` | `public.phasmo_news_drafts_production` |
| Articles | `phasmo_news_articles.stage='preview'` | `phasmo_news_articles.stage='production'` |
| Médias publiés | `preview/<uuid>/...` | `production/<uuid>/...` |
| Lecteur public | stage preview + published | stage production + published |

Le bucket `phasmo-news-draft-images` est **privé** ; `phasmo-news-published-images` est public pour les images publiées. La publication copie les originaux requis du premier vers le second. **Ne jamais transférer automatiquement les brouillons de dev vers la production** à l'occasion d'une fusion de code.

## Formats, limites, sauvegardes

- Couverture ou images dans l'article : upload PC ou URL HTTPS ; PNG, JPEG, GIF (animé), WebP (animé), **10 Mio maximum par fichier**. Au plus 40 images par article publié et 40 brouillons chargés dans le bureau.
- Préférer l'import du GIF/WebP d'origine : le copier-coller presse-papiers peut convertir l'animation en image fixe.
- La sauvegarde JSON ne comprend pas nécessairement les binaires du bucket privé : ne pas interpréter un export JSON comme migration automatique de médias.
- YouTube : liens vidéo, Shorts, live et `youtu.be` acceptés si l'identifiant est valide ; le lecteur public impose son contrôle de consentement.
- Les articles publics Supabase priment sur les éventuelles archives statiques `public/data/phasmo-news.json` lors de la déduplication.

## Fichiers principaux

- `public/modules/phasmophobia/editor-private.html` : interface.
- `public/modules/phasmophobia/editor-private.js` : Auth Twitch, ACL, backend des brouillons privés et stockage.
- `public/modules/phasmophobia/editor-native.js` : rédaction WYSIWYG, prévisualisation, enregistrement, JSON.
- `public/modules/phasmophobia/news-publication.js` : validation, publication et retrait, par `STAGE`.
- `public/modules/phasmophobia/news-access.js` : entrée de gestion du site public et droits d'accès.
- `public/modules/phasmophobia/news.js` : lecteur, cartes, publications `status='published'`.
- `public/modules/phasmophobia/news.css`, `editor-*.css` : styles isolés.

## Contrôles de régression

1. Accès Twitch autorisé et refus pour un compte sans rôle News.
2. Saisie + autosauvegarde + F5 ; import/export JSON ; suppression uniquement du brouillon.
3. Images privées et publiées, animation GIF/WebP originale, limites de taille ; lien HTTPS et URL Kinetic.
4. YouTube et Shorts, lecteurs et miniatures avec/sans consentement.
5. Publier, modifier et retirer ; conserver les slugs ; vérifier la carte permanente Kinetic.
6. Isoler la production du preview : vérifier qu'aucun brouillon ou article de test ne se retrouve sur `main`.
7. Vérifier le responsive, la navigation, et absence de modification des autres modules.

## À ne pas confondre

- **Livre de preuves interactif** : encore en cours sur la branche Phasmo V2, non déployé comme produit final.
- **Webhook Discord des News** : piste future, pas implémentée.
- **Visuel TikTok animé / halo** : chantier séparé de l'éditeur News.

## Retours d’utilisation — 27 octobre 2026

- Yekelle confirme la connexion de Mattarix à l’éditeur ; les corrections suivantes concernent ses premiers retours d’utilisation.
- Listes à puces et numérotées : le navigateur pouvait insérer `ul`/`ol` dans un paragraphe. La conversion vers le document JSON ne lisait que les listes à la racine et supprimait ainsi leur structure dans l’aperçu et les sauvegardes. La lecture parcourt désormais les blocs imbriqués ; la reconstruction conserve aussi les sous-listes et tous les paragraphes d’un élément.
- Régression ciblée : puces et numéros à la racine, dans un paragraphe ou un conteneur ; aperçu et aller-retour JSON/reconstruction ; sous-listes, texte autour, mises en forme et médias. Aucun changement des tables, permissions ou canaux de publication.
- Une liste déjà enregistrée sans sa structure doit être remise en forme avec le bouton correspondant : le correctif ne peut pas déduire les anciennes listes à partir du seul texte.

## Sous-listes — 28 octobre 2026

- Commandes « Sous-liste » et « Remonter » dans la barre de mise en forme ; raccourcis Tab et Maj+Tab uniquement quand le curseur est dans une liste. Ailleurs, Tab conserve sa navigation habituelle.
- Les listes à puces ou numérotées peuvent être imbriquées jusqu’à cinq niveaux au total. Un élément parent doit exister au-dessus ; les retraits ne doivent pas dépasser la profondeur conservée par le document JSON.
- Lecture des sous-listes que Chrome peut placer directement dans une autre liste, après l’élément parent. La sauvegarde les rattache au bon élément sans aplatir leur contenu.
- Contrôles ciblés : structure Chrome, sous-listes mixtes, cinq niveaux, aperçu et reconstruction depuis JSON. Conserver la séparation preview/production et les permissions existantes.

### Retour utilisateur et présentation des puces — 28 octobre 2026

- Yekelle confirme les sous-listes à puces. Elle signale que les sous-listes numérotées ne fonctionnent pas dans son essai ; point non bloquant, à examiner séparément. Les tests sur le prototype ne valent donc pas validation de la numérotation dans le bureau privé.
- Formes de puces selon la profondeur : disque plein, cercle vide, carré, puis disque plein et cercle vide pour les niveaux quatre et cinq. Styles communs à la rédaction, à l’aperçu et à l’article public ; aucun changement du contenu sauvegardé.

## Articles longs et anciens brouillons — 28 octobre 2026

- La barre de mise en forme reste en haut de l’écran pendant le défilement dans l’article : le conteneur utilise overflow:clip plutôt que hidden, qui empêchait le sticky de suivre le défilement de la page. Le focus des commandes conserve la position de défilement.
- Compatibilité après rechargement : le premier paragraphe d’un élément de liste est rendu directement dans le li, tout en conservant les sous-listes et les autres paragraphes. Dans Chrome, le p enveloppant conduisait la commande indent à créer un blockquote visuel au lieu d’une sous-liste, dont le retrait disparaissait à la sauvegarde. Le contenu JSON et les mises en forme restent conservés ; aucune écriture directe en base.
- Ressources de l’éditeur versionnées pour charger le même moteur et les mêmes styles après une mise à jour. Le cas exact du brouillon de Mattarix reste à confirmer avec son retour ; aucune lecture de ses métadonnées d’authentification n’a été effectuée.

## Lecture publique : largeur et listes — 28 octobre 2026

- Le corps de l’article public utilise la même largeur intérieure que la couverture ; la limite de 800 px est conservée sur les figures du corps, centrées, pour ne pas agrandir les images.
- Listes et sous-listes publiques : interligne à 1,6, marges entre éléments à 4 px, suppression de la marge de paragraphe de 23 px à l’intérieur des puces et espacement réduit des sous-listes. Les paragraphes successifs d’un même élément conservent une petite séparation.
- Modifications limitées au lecteur public ; styles et contenu de l’éditeur inchangés. Feuille news.css versionnée dans l’accueil pour charger le nouvel habillage.

## Validation de Mattarix et navigation publique — 28 octobre 2026

- Retour utilisateur : Mattarix valide l'éditeur pour le moment ainsi que la mise en page publique. Les éventuels nouveaux bugs ou besoins seront signalés au fil de l'usage.
- Les images du corps peuvent désormais occuper la même largeur que le texte et la bannière, selon la modification CSS appliquée par Yekelle sur main. Les listes restent resserrées.
- Un bouton « Retour aux news » figure après le contenu et les crédits de chaque article. Il ramène aux cartes des News et replace la vue sur le panneau News.
- Fermer le panneau déroulant News quitte l'article ou les archives en cours et rétablit la liste. Sa réouverture montre donc les cartes ; l'URL de lecture est retirée sans ajouter une entrée dans l'historique et sans remonter la page.
- Ces changements concernent la consultation publique ; les contenus, droits et brouillons ne sont pas modifiés.
- Vérifications : retour du bas vers les cartes, fermeture/réouverture après lecture, liens directs et archives sur la version de test ; retour du bas et fermeture/réouverture également contrôlés sur le site officiel dans Chrome.

## Clôture officielle — 28 octobre 2026

28 octobre 2026 — clôture officielle : Yekelle déclare l’éditeur News officiellement terminé après validation de Mattarix. La mise en page publique est également validée. Le chantier passe en maintenance : corrections sur remontée de bugs et évolutions sur suggestion d’amélioration. Cette clôture concerne les News et leur éditeur ; elle ne clôt pas le chantier distinct du Livre de preuves. Le signalement antérieur sur les sous-listes numérotées reste une limite connue non bloquante, sans nouvelle confirmation de résolution.
