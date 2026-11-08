# Connexion Pass — raccordement du site, 8 novembre 2026

Préparé dans la PR brouillon [#8](https://github.com/DeadelusTV/deadelusTV/pull/8), ciblant `developpement/tcg-attente`. Moteur associé : [Yekelle/TCG #60](https://github.com/Yekelle/TCG/pull/60). Le Pass reste désactivé. Aucun déploiement, migration distante ou gain réel ne fait partie de ce lot.

## Présence commune, vue facultative

Le script `assets/daily-pass.js` est chargé une seule fois sur toutes les pages, après `site-auth.js`, avant le portail et le routeur. Il fonctionne sans élément visible : visiter l'accueil, Phasmophobia ou toute autre rubrique peut enregistrer la présence d'un joueur connecté.

Une session Supabase déjà stockée sur cette origine est restaurée et revérifiée par `getUser()`. La présence n'utilise que l'identité ainsi confirmée, exposée en lecture par `DEADELUSTV_AUTH.userId`. Un stockage présent ne prouve pas une connexion. Sans session, le SDK reste différé ; le retour OAuth Crew conserve son projet distinct et son code.

Le contrôleur partage le client Auth existant. Il n'envoie aucun identifiant de bénéficiaire ni calendrier : `tcg_claim_daily_pass()` et `tcg_daily_pass_status()` sont appelés sans paramètre. Le serveur choisit date Paris, progression commune et DCG réellement joués, puis crédite leurs portefeuilles et leurs boosters séparés, dans une transaction.

Le cycle confirmé comporte J1–J8 : 5, 10, 15, 20, 25, 30, 35, 40 Alkahests ; J9 : un booster de trois cartes ; J10 : deux boosters distincts de trois cartes, dans chaque DCG joué. J11 revient au J1. Un jour civil manqué remet au J1, avec changement de journée à minuit Europe/Paris et gestion de l'heure d'été. Les tirages sont ceux des boosters classiques du DCG.

## Affichage interchangeable

`window.DCGDailyPass.mount(element)` branche une vue de consultation simple sur l'état déjà obtenu ; `unmount()` retire son branchement sans interrompre la présence. `refresh()` permet une relance explicite. Monter, démonter ou changer de rubrique ne redemande pas de gains. Le futur visuel pourra remplacer cette vue sans modifier les règles serveur.

La rubrique `#tcg/connexion-pass` monte un seul élément `daily-pass-root`. Elle réutilise la connexion Twitch du site. À la déconnexion ou au changement de compte, l'identité et l'état précédent sont invalidés immédiatement ; les réponses tardives sont ignorées. Quitter la rubrique retire la vue. Les requêtes simultanées partagent un appel ; les contraintes et reçus serveur empêchent les doublons entre onglets ou origines.

Le module vérifie de nouveau le serveur au retour d'un onglet ou toutes les minutes quand la page est visible, avec temporisation après erreur ou désactivation. L'horloge du navigateur ne choisit jamais le jour. Une fonction serveur encore absente est affichée comme préparation, sans annoncer de récompense.

Le fichier JavaScript est identique à `public/daily-pass.js` du dépôt TCG ; ses styles de consultation sont également repris. Garder les deux copies synchronisées lors des changements de contrat.

## Follow et accès

Quand le serveur demande une vérification, le client appelle uniquement `tcg-twitch-sync` avec `{action:'verify_follow'}`, puis reprend la demande. Une erreur Twitch laisse la chaîne en attente et conserve les gains déjà confirmés ailleurs. Le service actuel autorise les origines du site seulement pour cette action ; les commandes administratives restent réservées au jeu. Les aperçus nécessitent une origine exacte dans `TCG_PASS_ORIGINS`, sans joker.

Un passage sur le portail n'inscrit personne dans un jeu. Le moteur réutilise les inscriptions/dotations serveur existantes par DCG. Un follow seul ne donne pas de récompense. Aujourd'hui seul DeadelusTV est réellement raccordé. Meteoran et les autres communautés devront disposer de leur DCG, de leur inscription serveur et de leurs contrôles Twitch avant activation ; les scénarios multichaînes locaux sont des données fictives.

La liste « Mes DCG » actuelle demeure l'annuaire mono-DCG documenté dans `dcg-portal-structure.md`. Son extension et le parcours d'inscription multi-DCG devront accompagner l'arrivée des autres communautés.

Les dons restent futurs : calendrier prévu J9 deux boosters et J10 quatre, mais aucun avantage donateur ni paiement n'est raccordé tant que les modalités ne sont pas définies.

## Validation

```sh
node --test scripts/test_dcg_portal.cjs scripts/test_daily_pass.cjs scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs scripts/test_journal_account_access.cjs
```

54 tests Node réussis, dont huit cas du raccordement Auth/Pass et deux cas de montage des routes. Le contrôle local supplémentaire sur le DOM HTML complet valide la présence depuis l'accueil, les allers-retours entre rubriques, la déconnexion, les identifiants uniques et toutes les ressources locales. Aucun réseau ni compte réel n'est utilisé.

Le test indépendant `test_crew_twitch_ui.cjs` échoue déjà sur la base inchangée avec un faux DOM incomplet (`insertBefore` dans `renderAdminAccess`), avant d'exécuter son contrôle du menu Auth. Il n'est pas inclus dans les 54 tests et n'est pas modifié ici. Les permissions du carnet et le callback OAuth Crew sont vérifiés séparément.

Le workflow du portail exécute syntaxe, fichiers statiques et les tests ci-dessus. Le lanceur Python Windows n'étant pas disponible localement, le contrôle équivalent des ressources a été effectué avec le parseur DOM ; le script Python reste exécuté dans la CI Linux.

## Mise en service ultérieure

Installer ensemble la fondation SQL du TCG, le service de vérification Twitch et ces interfaces, en gardant le Pass désactivé pendant la recette. Vérifier une vraie connexion Twitch, son retour OAuth, une inscription de jeu existante, le crédit unique depuis les deux sites et l'apparition des boosters dans le jeu. Contrôler également la concurrence sur deux sessions PostgreSQL réelles avant ouverture.

L'activation globale et par DCG constitue une étape distincte. Cette PR ne fusionne pas sur main, ne publie pas sur OVH et ne lance aucun DCG. Le visuel définitif peut être travaillé ensuite.
