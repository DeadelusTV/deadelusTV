# Connexion Pass — structure du site au 10 novembre 2026

Préparation dans la PR [#8](https://github.com/DeadelusTV/deadelusTV/pull/8) vers `developpement/tcg-attente`. Moteur associé : [Yekelle/TCG #60](https://github.com/Yekelle/TCG/pull/60), guide `docs/CONNEXION_PASS_FOUNDATION.md`. Le Pass et le bonus donateur restent désactivés ; aucune mise en service de production n'est réalisée ici.

## Présence du site, consultation facultative

`assets/daily-pass.js` est chargé une seule fois après `site-auth.js`, avant le portail. Une session locale est restaurée et vérifiée auprès d'Auth ; un simple stockage ne prouve pas une connexion. Depuis toute rubrique visible du site, le contrôleur peut appeler `tcg-daily-pass` avec un corps vide. Le serveur vérifie l'origine et le JWT, choisit le jour Paris et les DCG éligibles, puis distribue les récompenses en transaction.

Une visite sur le jeu seul n'enregistre aucune présence. Le même module y utilise uniquement `tcg_daily_pass_status()`. L'appel utilisateur direct à l'ancienne RPC d'attribution a été retiré du contrat serveur.

Le premier passage éligible commence à J1, indépendamment du jour de la semaine. Le cycle dure dix jours : J1–J8 = 5, 10, 15, 20, 25, 30, 35, 40 Alkahests ; J9 = un booster de trois cartes ; J10 = deux boosters distincts de trois cartes. J11 reprend à J1. Un jour civil manqué fait reprendre à J1. Minuit Europe/Paris définit le changement de journée, avec heure d'été/hiver.

La progression appartient au compte global et chaque DCG joué reçoit sa récompense, avec ses cartes, ses probabilités et son portefeuille. La présence ne crée aucune inscription dans un jeu. Les contrôles de follow, lancement, suspension et bannissement sont conservés. Seul DeadelusTV est actuellement raccordé.

## Vue du Pass

La route `#tcg/connexion-pass` montre dix jalons dorés alignés avec les quantités, les règles de reprise et la connexion Twitch du site. Le calendrier reste lisible anonymement. La progression personnelle et les gains ne sont affichés qu'après réponse serveur. La rangée est défilable sur mobile et accessible au clavier.

`DCGDailyPass.mount(element)` affiche l'état déjà obtenu ; `unmount()` retire la vue sans interrompre la présence du site. `refresh()` relance explicitement la vérification. Naviguer ne réclame pas deux fois les récompenses. La déconnexion et le changement de compte effacent immédiatement les données personnelles ; les réponses tardives sont ignorées.

Le contrôle reprend au retour d'un onglet ou chaque minute visible, avec temporisation après erreur ou désactivation. L'horloge du navigateur ne choisit jamais la récompense. Une installation serveur absente reste présentée comme préparation.

## Soutien du site

La structure prévoit un bonus global au compte : J9 deux boosters et J10 quatre, chacun de trois cartes, dans tous les DCG éligibles ; J1–J8 restent identiques. Le serveur doit confirmer un droit de soutien et son activation avant tout changement de calendrier. Le réglage est désactivé, aucun statut n'est attribué par le navigateur et aucun paiement n'est raccordé.

Tipeee classique est la piste retenue pour financer le site et ses fonctionnalités intercommunautaires. Méthode de liaison, montant et durée restent à confirmer. Aucun recours obligatoire à Discord n'est décidé. L'interface ne propose pas encore d'achat ni ne promet cet avantage.

## Raccordement et vérification

Les origines publiques sont `https://www.deadelustv.com` et `https://deadelustv.com`. Ajouter chaque origine de recette exacte dans `TCG_PASS_SITE_ORIGINS` du nouveau service de présence et `TCG_PASS_ORIGINS` du service Twitch. Ces variables sont des listes séparées par des virgules, sans joker. L'origine du jeu ne peut pas enregistrer de présence. Le filtrage CORS/origine n'est pas une preuve anti-bot et ne remplace pas les contrôles serveur.

Le JavaScript et le CSS sont identiques aux copies `public/daily-pass.*` du TCG. Conserver leur synchronisation lors des évolutions du contrat. Le Pass XP et les autres rubriques du portail restent en place.

Tests du portail : `node --test scripts/test_dcg_portal.cjs scripts/test_daily_pass.cjs scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs scripts/test_journal_account_access.cjs`. Le dépôt TCG possède les tests PostgreSQL, HTTP et UI du Pass. Les comptes de tests sont fictifs.

La recette Twitch réelle, les appels simultanés sur PostgreSQL réel et l'installation coordonnée restent nécessaires avant activation. La connexion de Tipeee sera traitée séparément après confirmation de son fonctionnement.
