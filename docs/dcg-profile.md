# Profil du portail DCG

## Navigation

`#tcg/mon-compte` est l'Accueil du profil : identité Twitch et Pass quotidien. Les cartes et accès aux collections sont déplacés dans **Mes constellations**.

- `#tcg/mon-compte/constellations` : affichage **Par constellation**, avec les DCG rejoints et un emplacement pour les constellations communes lorsqu'elles ouvriront.
- `#tcg/mon-compte/cartes` : affichage **Toutes mes cartes**, sous forme de Constellation compacte, avec recherche et pages de 24 versions. Les doublons sont regroupés côté serveur ; raretés, finitions et First restent séparées. Le menu **Trier par** propose Alphabétique, Numéro de carte, Rareté, Collection et Streamer ; le menu **Ordre** permet Croissant ou Décroissant. Le tri initial est alphabétique croissant.

Les adresses fonctionnent directement, au rechargement et avec les boutons précédent/suivant du navigateur. Le Pass n'est monté que dans l'Accueil du profil et dans l'accueil général DCG.

## Lecture des cartes

Le seul DCG actuellement raccordé est DeadelusTV (`99977368`). La session est réutilisée depuis `DEADELUSTV_AUTH`, vérifiée par `getUser()`, puis seule l'inscription du compte courant est lue. La Constellation appelle la RPC **stable, en lecture seule** `tcg_inventory_groups`, avec `p_context:'inventory'`, recherche et décalage. Aucun propriétaire n'est envoyé : le serveur utilise `auth.uid()`. Le retour est refusé si son propriétaire ou sa chaîne ne correspondent pas au compte et au DCG attendus. Consulter le profil ne crée ni inscription, carte, booster ni solde.

Toutes les pages de versions correspondant à la recherche sont réunies avant le tri, puis affichées par pages de 24. Changer le tri, son sens ou la page ne relance pas ces lectures. Les numéros officiels sont rapprochés des versions à l’aide de la RPC existante, stable et en lecture seule, `tcg_owned_catalogue_page` ; modèle, finition, rareté, étoiles et First identifient la version. Les cartes possédées sans numéro restent présentes, à la fin du tri numérique dans les deux sens. Un numéro répété ne fusionne jamais les cartes. Le streamer de provenance reste affiché avec le numéro.

L’identité est revérifiée à la fin du chargement. Une page en erreur, une pagination incohérente ou un inventaire modifié pendant sa lecture n’affiche pas de classement partiel. Les réponses après changement de compte ou de rubrique sont ignorées. Cette version réutilise les API existantes sans migration serveur ; pour de très grandes galeries et le futur raccordement de plusieurs DCG, une pagination triée côté serveur évitera de parcourir toutes les pages au chargement.

La galerie et l'aperçu réutilisent le composant `tcg-card` de la Constellation TCG, copié avec ses styles et effets dans `modules/dcg/cards/`. Ses feuilles de styles sont résolues depuis le script local ; la texture Galactique réutilise l'asset public du DCG. Aucun module d'action de jeu n'est chargé. Les données de carte sont échappées, et les URL d'illustration sont limitées à HTTP(S).

Un clic ouvre une fenêtre avec la carte agrandie, sa collection, sa rareté, sa finition et sa quantité. Son unique action métier est **Aller voir ma carte sur le DCG de [Streamer]** ; fermer l'aperçu reste possible avec la croix, Échap ou le fond extérieur. Le lien mène à la Constellation des cartes possédées du DCG, filtré sur la collection lorsque son identifiant est fourni. L'ouverture automatique d'un exemplaire précis dans le jeu n'est pas ajoutée par ce lot.

Les futures communautés et collections communes nécessiteront leurs lectures d'inventaire et identifiants de provenance avant d'apparaître dans cette galerie. Aucune carte fictive n'est ajoutée au produit. Les six cartes de recette visuelle sont servies uniquement par le harnais local hors dépôt.

## Vérification

64 tests site/portail/profil/presence/consentement passent, dont sept scénarios du nouveau lecteur : inventaire propre au compte, consultation sans inscription, aperçu sans actions, rejet des réponses d'un autre compte ou DCG, réponses tardives, échappement et pagination. Les sessions des tests sont fictives. La recette navigateur couvre les deux niveaux de navigation, le rendu compact des six finitions, l'aperçu en lecture seule et son retour au bouton d'origine. Aucune migration distante ou activation du Pass n'est réalisée.

## Niveau général et gains dans le profil

L’accueil du profil affiche le médaillon du niveau général et la barre du profil DCG adaptée au compteur `dcg_my_xp` : ouvertures cumulées, ouvertures restantes et récompense par DCG. Les deux compteurs individuels et général ne sont pas confondus ; le calcul et les RPC existantes sont conservés. Les autres sous-onglets ne chargent pas ce bloc.

Dans le profil, les gains confirmés apparaissent sur place sous forme d’icône et de quantité ×, puis disparaissent après 1,5 seconde. La récupération d’un niveau utilise cette présentation, sans trajectoire ni cible. Le clic sur le losange ou l’icône du gain quotidien déclenche la vérification existante et ne présente un gain que si le serveur en confirme un. Les erreurs, relectures automatiques et réponses après changement de compte ou de page ne présentent pas de faux gain. Les effets sont nettoyés en quittant le profil, y compris avec le mouvement réduit.

L’animation du Pass quotidien est prête pour l’activation du service, qui reste en préparation sur le site de test. Aucune migration, activation du Pass ou modification des crédits serveur.
