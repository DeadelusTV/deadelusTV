# Profil du portail DCG

## Navigation

`#tcg/mon-compte` est l'Accueil du profil : identité Twitch et Pass quotidien. Les cartes et accès aux collections sont déplacés dans **Mes constellations**.

- `#tcg/mon-compte/constellations` : affichage **Par constellation**, avec les DCG rejoints et un emplacement pour les constellations communes lorsqu'elles ouvriront.
- `#tcg/mon-compte/cartes` : affichage **Toutes mes cartes**, sous forme de catalogue compact, avec recherche et pages de 24 versions. Les doublons sont regroupés côté serveur ; raretés, finitions et First restent séparées.

Les adresses fonctionnent directement, au rechargement et avec les boutons précédent/suivant du navigateur. Le Pass n'est monté que dans l'Accueil du profil et dans l'accueil général DCG.

## Lecture des cartes

Le seul DCG actuellement raccordé est DeadelusTV (`99977368`). La session est réutilisée depuis `DEADELUSTV_AUTH`, vérifiée par `getUser()`, puis seule l'inscription du compte courant est lue. Le catalogue appelle la RPC **stable, en lecture seule** `tcg_inventory_groups`, avec `p_context:'inventory'`, recherche et décalage. Aucun propriétaire n'est envoyé : le serveur utilise `auth.uid()`. Le retour est refusé si son propriétaire ou sa chaîne ne correspondent pas au compte et au DCG attendus. Consulter le profil ne crée ni inscription, carte, booster ni solde.

La galerie et l'aperçu réutilisent le composant `tcg-card` du catalogue TCG, copié avec ses styles et effets dans `modules/dcg/cards/`. Ses feuilles de styles sont résolues depuis le script local ; la texture Galactique réutilise l'asset public du DCG. Aucun module d'action de jeu n'est chargé. Les données de carte sont échappées, et les URL d'illustration sont limitées à HTTP(S).

Un clic ouvre une fenêtre avec la carte agrandie, sa collection, sa rareté, sa finition et sa quantité. Son unique action métier est **Aller voir ma carte sur le DCG de [Streamer]** ; fermer l'aperçu reste possible avec la croix, Échap ou le fond extérieur. Le lien mène au catalogue des cartes possédées du DCG, filtré sur la collection lorsque son identifiant est fourni. L'ouverture automatique d'un exemplaire précis dans le jeu n'est pas ajoutée par ce lot.

Les futures communautés et collections communes nécessiteront leurs lectures d'inventaire et identifiants de provenance avant d'apparaître dans cette galerie. Aucune carte fictive n'est ajoutée au produit. Les six cartes de recette visuelle sont servies uniquement par le harnais local hors dépôt.

## Vérification

64 tests site/portail/profil/presence/consentement passent, dont sept scénarios du nouveau lecteur : inventaire propre au compte, consultation sans inscription, aperçu sans actions, rejet des réponses d'un autre compte ou DCG, réponses tardives, échappement et pagination. Les sessions des tests sont fictives. La recette navigateur couvre les deux niveaux de navigation, le rendu compact des six finitions, l'aperçu en lecture seule et son retour au bouton d'origine. Aucune migration distante ou activation du Pass n'est réalisée.
