# Connexion Pass — structure du site au 10 novembre 2026

Préparation dans la PR [#8](https://github.com/DeadelusTV/deadelusTV/pull/8) vers `developpement/tcg-attente`. Moteur associé : [Yekelle/TCG #60](https://github.com/Yekelle/TCG/pull/60), guide `docs/CONNEXION_PASS_FOUNDATION.md`. Le Pass et le bonus donateur restent désactivés ; aucune mise en service de production n'est réalisée ici.

## Présence du site, consultation facultative

`assets/daily-pass.js` est chargé une seule fois après `site-auth.js`, avant le portail. Une session locale est restaurée et vérifiée auprès d'Auth ; un simple stockage ne prouve pas une connexion. Depuis toute rubrique visible du site, le contrôleur peut appeler `tcg-daily-pass` avec un corps vide. Le serveur vérifie l'origine et le JWT, choisit le jour Paris et les DCG éligibles, puis distribue les récompenses en transaction.

Une visite sur le jeu seul n'enregistre aucune présence. Le même module y utilise uniquement `tcg_daily_pass_status()`. L'appel utilisateur direct à l'ancienne RPC d'attribution a été retiré du contrat serveur.

Le premier passage éligible commence à J1, indépendamment du jour de la semaine. Le cycle dure dix jours : J1–J8 = 5, 10, 15, 20, 25, 30, 35, 40 Alkahests ; J9 = un booster de trois cartes ; J10 = deux boosters distincts de trois cartes. J11 reprend à J1. Un jour civil manqué fait reprendre à J1. Minuit Europe/Paris définit le changement de journée, avec heure d'été/hiver.

La progression appartient au compte global et chaque DCG joué reçoit sa récompense, avec ses cartes, ses probabilités et son portefeuille. La présence ne crée aucune inscription dans un jeu. Les contrôles de follow, lancement, suspension et bannissement sont conservés. Seul DeadelusTV est actuellement raccordé.

## Vue du Pass

Le visuel du ZIP `DCG-Connexion-Pass-Codex.zip` fourni le 10 novembre 2026 conserve dix losanges J1–J10 sur une ligne droite, une texture minérale sombre et des étoiles crème et or. Après simplification demandée par l'utilisatrice, l'accueil DCG `#tcg` n'affiche que l'échelle de progression, sans panneau, titre, légende, quantités ni règles visibles autour des losanges. L'onglet Connexion Pass est supprimé ; son ancienne adresse `#tcg/connexion-pass` revient à l'accueil DCG et remplace l'URL sans ajouter d'étape dans l'historique. Les dix jours tiennent dans la largeur disponible, y compris à 320 px.

Tous les détails sont regroupés dans `#tcg/mon-compte` : état du cycle, quantités, règles, confirmations et attentes par DCG, bonus de soutien lorsqu'il sera activé et bouton d'actualisation. Le calendrier et ses règles restent consultables anonymement ; seuls les gains personnels exigent une identité vérifiée. Le bandeau du TCG renvoie vers cet espace. Aucun contrôle de démonstration ni donnée fictive n'est livré dans le parcours public.

Les jours futurs restent argentés et éteints. Le jour courant en attente d'un gain éligible utilise le halo renforcé ; son bouton clavier relance uniquement la vérification existante. La présence continue à attribuer les gains automatiquement, sans clic obligatoire. Une coche signifie qu'au moins un DCG possède un reçu confirmé pour ce jour ; le détail par DCG présente séparément les attributions du jour et les attentes. Une présence sans reçu n'est pas présentée comme une récompense récupérée.

La réponse serveur contient maintenant `history`, limité au compte et au cycle courants : `step`, `reward` figée lors de la visite et `claimed`, calculé depuis les reçus. Cet ajout est une lecture ; il ne change ni l'attribution ni les permissions. Un ancien serveur sans historique n'invente pas de coches pour les jours précédents.

Un nouveau reçu déclenche une concentration de lumière de 420 ms, puis un éclat de 550 ms et le retour à l'apparence commune des jours récupérés. Les minuteries sont décoratives : aucun crédit ni changement de jour ne dépend de leur fin. Une même confirmation ne rejoue pas l'effet lors d'un remontage. Les textures et les géométries d'étoiles sont mises en cache ; les minuteries et l'observation de visibilité sont nettoyées au démontage. Les animations sont suspendues hors écran/onglet et neutralisées avec `prefers-reduced-motion`. Les styles du Pass XP ne sont pas modifiés.

`DCGDailyPass.mount(element, {view:'progress'})` monte les seuls losanges ; `{view:'details'}` (valeur par défaut) monte la vue complète de Mon compte. Le montage affiche l'état déjà obtenu ; `unmount()` retire la vue sans interrompre la présence du site. `refresh()` relance explicitement la vérification. Passer de la progression aux détails ne refait aucune demande et ne rejoue pas une confirmation. Le focus clavier reste dans l'échelle après réception du gain, même pendant l'animation. La déconnexion et le changement de compte effacent immédiatement les données personnelles ; les réponses tardives sont ignorées.

Le contrôle reprend au retour d'un onglet ou chaque minute visible, avec temporisation après erreur ou désactivation. L'horloge du navigateur ne choisit jamais la récompense. Une installation serveur absente reste présentée comme préparation.

## Soutien du site

La structure prévoit un bonus global au compte : J9 deux boosters et J10 quatre, chacun de trois cartes, dans tous les DCG éligibles ; J1–J8 restent identiques. Le serveur doit confirmer un droit de soutien et son activation avant tout changement de calendrier. Le réglage est désactivé, aucun statut n'est attribué par le navigateur et aucun paiement n'est raccordé.

Tipeee classique, TipeeeStream et une intégration PayPal ont été étudiés pour financer le site et ses fonctionnalités intercommunautaires. Le choix du prestataire, la liaison, le montant et la durée restent à confirmer ; l'utilisatrice reporte ce chantier. Aucun recours obligatoire à Discord n'est décidé. Aucun paiement ni contour de PP donateur n'est ajouté par le lot visuel.

## Raccordement et vérification

Les origines publiques sont `https://www.deadelustv.com` et `https://deadelustv.com`. Ajouter chaque origine de recette exacte dans `TCG_PASS_SITE_ORIGINS` du nouveau service de présence et `TCG_PASS_ORIGINS` du service Twitch. Ces variables sont des listes séparées par des virgules, sans joker. L'origine du jeu ne peut pas enregistrer de présence. Le filtrage CORS/origine n'est pas une preuve anti-bot et ne remplace pas les contrôles serveur.

Le JavaScript et le CSS sont identiques aux copies `public/daily-pass.*` du TCG. Conserver leur synchronisation lors des évolutions du contrat. Le Pass XP et les autres rubriques du portail restent en place.

Tests du portail : `node --test scripts/test_dcg_portal.cjs scripts/test_daily_pass.cjs scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs scripts/test_journal_account_access.cjs`. Le dépôt TCG possède les tests PostgreSQL, HTTP et UI du Pass. Les comptes de tests sont fictifs.

La recette Twitch réelle, les appels simultanés sur PostgreSQL réel et l'installation coordonnée restent nécessaires avant activation. Les écrans J1–J6 reçus/J7 en attente utilisés pour la recette visuelle sont servis uniquement par un harnais local hors dépôt public ; ils ne constituent pas une attribution réelle. Les essais couvrent les largeurs 1366/736/320 px, le clavier, l'échec de vérification et la transition confirmée sans allumer J8. Le prestataire de soutien sera raccordé séparément après décision.
