# Portail DCG — structure sur la branche de test, 5 novembre 2026

Destination confirmée par Yekelle : dépôt `DeadelusTV/deadelusTV`, branche `developpement/tcg-attente`. Yekelle a terminé son alignement avec `main` avant l’intégration. Base contrôlée : `0e10a9da6d83902c779a86438bac20ede5539baa`. Aucun changement n’est fusionné sur `main` et aucun déploiement OVH n’est demandé.

## Parcours préparés

| Adresse sur un aperçu de cette branche | Contenu |
| --- | --- |
| `#tcg` | Accueil DCG commun, annuaire avec recherche et ordre alphabétique, raccourci par le logo DeadelusTV, emplacement du Pass |
| `#tcg/regles` | Présentation des règles actuelles du jeu |
| `#tcg/mon-compte` | Connexion Twitch commune puis accès au Cartodex et au profil DeadelusTV |
| `#tcg/collections-communes` | Boutique à venir ; Phasmophobia et Valorant présentées comme collections envisagées |
| `#tcg/connexion-pass` | Emplacement du Pass, explicitement non activé |

L’entrée du menu et les accès de l’accueil portent le libellé **DCG**. Les sous-pages restent dans la rubrique TCG du routeur existant ; les anciennes adresses `#tcg` continuent de fonctionner. Aucun routage serveur `/tcg` ou `/tcg/<streamer>` n’est activé par ce lot.

Cliquer sur le logo DeadelusTV ou sa ligne dans l’annuaire ouvre le jeu existant : `https://tcg.yekelle-boulet.workers.dev/#/boosters`. Son adresse est centralisée dans `public/modules/dcg/config.js`. Le jeu est un lien, sans iframe ni copie de ses clients ou fonctions de jeu dans le site principal.

Le déplacement de Boosters en premier dans le menu du jeu reste préparé dans le projet distinct `Yekelle/TCG` avec ses tests. Il n’est pas publié par cette modification du portail. L’inventaire transversal, les achats communs et le Pass ne sont pas activés ici. La boutique future débitera un seul solde d’Alkahests choisi par le joueur, sans addition des portefeuilles ; le dos reste commun à la collection.

## Intégration

- `public/modules/dcg/portal.js` : écrans communs et annuaire ; seul DeadelusTV est raccordé.
- `public/modules/dcg/portal.css` : styles tous limités à `#page-tcg`, adaptation mobile et mouvements réduits.
- `public/modules/dcg/config.js` : adresse actuelle du jeu, sans secret.
- `public/index.html` : contenu de la seule rubrique d’attente remplacé et chargement des fichiers du module ; logo du site réutilisé.
- `public/assets/app.js` : reconnaissance de `tcg/...`, montage et annulation du module ; autres répartitions de routes conservées.

Mon compte réutilise `DEADELUSTV_AUTH` et sa session existante. Le module ne crée pas de second client Supabase, ne reçoit pas de jeton via URL et n’attribue aucun rôle à partir du pseudo. Une déconnexion ou un changement de route invalide les réponses en attente ; les textes personnels sont échappés. Aucun appel de jeu, gain, achat ou lancement n’est ajouté par le portail.

## Vérifications

Commande sans dépendance ni réseau :

```sh
node --test scripts/test_dcg_portal.cjs scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs
```

**29 tests réussis**, dont dix nouveaux scénarios du portail et du routeur réel. Un contrôle local supplémentaire sur le DOM complet vérifie les liens, sous-pages, recherche, connexion/déconnexion simulée, absence d’identifiants répétés et analyse de la feuille CSS. Les ressources référencées sont contrôlées contre l’arbre de la base GitHub et les nouveaux fichiers.

Le workflow `check-dcg-portal.yml` exécute les contrôles statiques, la syntaxe et ces tests sur la branche de test et les PR concernées. Le workflow OVH existant n’est pas modifié : seule `main` peut y être déployée. Une branche GitHub ne fournit pas à elle seule un aperçu public.

Limites : pas de nouvelle recette visuelle dans un navigateur, pas de migration ni de mutation distante de données de jeu, pas de publication du portail ou du jeu. Les 713 tests précédemment annoncés concernaient la préparation distincte du projet TCG et ne constituent pas le nombre de tests de cette intégration au site principal.

## Recette de l’aperçu de branche

Ouvrir `#tcg`, vérifier le logo et l’annuaire, rechercher DeadelusTV, parcourir les cinq entrées du menu commun, se connecter puis se déconnecter dans Mon compte. Le logo mène aux boosters Workers actuels. Vérifier ensuite les retours vers l’accueil principal, Phasmophobia, Crew et Pavillon Noir, ainsi que l’affichage sur téléphone. Aucun TCG ne doit être lancé pour cette recette du portail.
