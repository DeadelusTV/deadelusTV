# Connexion Pass — structure du site au 10 novembre 2026

Raccordement de recette du 10 novembre 2026 sur `developpement/tcg-attente`. Le service et la structure du Pass sont installés dans le projet TCG ; le calendrier standard et le canal DeadelusTV sont activés après accord explicite. Le bonus donateur reste désactivé. Seule l'adresse `https://deadelustv.pages.dev` est autorisée pour la présence ; les domaines de production ne sont pas activés.

## Présence du site, consultation facultative

`assets/daily-pass.js` est chargé une seule fois après `site-auth.js`, avant le portail. Une session locale est restaurée et vérifiée auprès d'Auth ; un simple stockage ne prouve pas une connexion. Depuis toute rubrique visible du site, le contrôleur peut appeler `tcg-daily-pass` avec un corps vide. Le serveur vérifie l'origine et le JWT, choisit le jour Paris et les DCG éligibles, puis distribue les récompenses en transaction.

Une visite sur le jeu seul n'enregistre aucune présence. Le même module y utilise uniquement `tcg_daily_pass_status()`. L'appel utilisateur direct à l'ancienne RPC d'attribution a été retiré du contrat serveur.

Le premier passage éligible commence à J1, indépendamment du jour de la semaine. Le cycle dure dix jours : J1–J8 = 5, 10, 15, 20, 25, 30, 35, 40 Alkahests ; J9 = un booster de trois cartes ; J10 = deux boosters distincts de trois cartes. J11 reprend à J1. Un jour civil manqué fait reprendre à J1. Minuit Europe/Paris définit le changement de journée, avec heure d'été/hiver.

La progression appartient au compte global et chaque DCG joué reçoit sa récompense, avec ses cartes, ses probabilités et son portefeuille. La présence ne crée aucune inscription dans un jeu. Les contrôles de follow, lancement, suspension et bannissement sont conservés. Seul DeadelusTV est actuellement raccordé.

## Vue du Pass

Le visuel du ZIP `DCG-Connexion-Pass-Codex.zip` fourni le 10 novembre 2026 conserve dix losanges J1–J10 sur une ligne droite, une texture minérale sombre et des étoiles crème et or. Après simplification demandée par l'utilisatrice, l'accueil DCG `#tcg` n'affiche que l'échelle de progression, sans panneau, titre, légende, quantités ni règles visibles autour des losanges. L'onglet Connexion Pass est supprimé ; son ancienne adresse `#tcg/connexion-pass` revient à l'accueil DCG et remplace l'URL sans ajouter d'étape dans l'historique. Les dix jours tiennent dans la largeur disponible, y compris à 320 px.

Sur l'accueil, l'échelle se trouve après le bloc « Explorer les DCG » et avant « Mes communautés / Mes DCG ». Les losanges et leurs effets sont réduits autour de leurs centres (68 % sur ordinateur, 85 % sur petit écran pour garder les jours lisibles) : les dix centres gardent le même espacement et les traits visibles entre les losanges s'allongent. La zone de vérification du jour reste d'au moins 44 px. La vue détaillée de Mon compte reprend la même réduction des losanges et de la hauteur de l'échelle ; son panneau, ses textes et ses récompenses conservent leurs dimensions.

Dans `#tcg/mon-compte`, une icône d'Alkahest ou de booster et sa quantité se trouvent directement sous chacun des dix losanges, sur la même grille, y compris sur téléphone. Les icônes réutilisent les visuels du Pass XP ; leurs libellés accessibles précisent la récompense et le nombre de cartes du booster. Les quantités et éventuels bonus proviennent du serveur, avec la récompense figée du reçu lorsqu'elle existe. Le compteur de jours récompensés, le texte de première présence, la liste séparée des dix jours, les règles en pied de panneau et le bouton Actualiser sont retirés. Les confirmations par DCG et le bonus de soutien restent affichés lorsqu'ils existent.

Les règles de départ à J1, cycle de dix jours, absence et minuit Paris sont regroupées dans la **FAQ du Pass quotidien**, en tête de `#tcg/regles`. Le lien « FAQ du Pass » y mène depuis Mon compte. Le calendrier reste consultable anonymement ; seuls les gains personnels exigent une identité vérifiée. Le bandeau du TCG renvoie vers Mon compte. Aucun contrôle de démonstration ni donnée fictive n'est livré dans le parcours public.

Le diagnostic initial du 10 novembre constatait l'absence de `tcg-daily-pass`. Le service est maintenant installé (version 2), avec la migration `tcg_site_daily_pass_structure` et les réglages de recette activés. `dailyPassServiceReady:true` permet les appels sur le site test. Le service accepte son origine exacte, vérifie Auth et refuse les domaines de production, le jeu et les appels anonymes. Aucun paiement n'est raccordé. En cas d'arrêt volontaire, remettre ce drapeau à false coupe les appels du client ; la désactivation serveur reste le contrôle d'attribution.

Les jours futurs restent argentés et éteints. Le jour courant en attente d'un gain éligible utilise le halo renforcé ; son bouton clavier relance uniquement la vérification existante. La présence continue à attribuer les gains automatiquement, sans clic obligatoire. Une coche signifie qu'au moins un DCG possède un reçu confirmé pour ce jour ; le détail par DCG présente séparément les attributions du jour et les attentes. Une présence sans reçu n'est pas présentée comme une récompense récupérée.

La réponse serveur contient maintenant `history`, limité au compte et au cycle courants : `step`, `reward` figée lors de la visite et `claimed`, calculé depuis les reçus. Cet ajout est une lecture ; il ne change ni l'attribution ni les permissions. Un ancien serveur sans historique n'invente pas de coches pour les jours précédents.

Un nouveau reçu déclenche une concentration de lumière de 420 ms, puis un éclat de 550 ms et le retour à l'apparence commune des jours récupérés. Les minuteries sont décoratives : aucun crédit ni changement de jour ne dépend de leur fin. Une même confirmation ne rejoue pas l'effet lors d'un remontage. Les textures et les géométries d'étoiles sont mises en cache ; les minuteries et l'observation de visibilité sont nettoyées au démontage. Les animations sont suspendues hors écran/onglet et neutralisées avec `prefers-reduced-motion`. Les styles du Pass XP ne sont pas modifiés.

`DCGDailyPass.mount(element, {view:'progress'})` monte les seuls losanges ; `{view:'details'}` (valeur par défaut) monte la vue complète de Mon compte. Le montage affiche l'état déjà obtenu ; `unmount()` retire la vue sans interrompre la présence du site. `refresh()` relance explicitement la vérification. Passer de la progression aux détails ne refait aucune demande et ne rejoue pas une confirmation. Le focus clavier reste dans l'échelle après réception du gain, même pendant l'animation. La déconnexion et le changement de compte effacent immédiatement les données personnelles ; les réponses tardives sont ignorées.

Le contrôle reprend au retour d'un onglet ou chaque minute visible, avec temporisation après erreur ou désactivation. L'horloge du navigateur ne choisit jamais la récompense. Une installation serveur absente reste présentée comme préparation.

## Soutien du site

La structure prévoit un bonus global au compte : J9 deux boosters et J10 quatre, chacun de trois cartes, dans tous les DCG éligibles ; J1–J8 restent identiques. Le serveur doit confirmer un droit de soutien et son activation avant tout changement de calendrier. Le réglage est désactivé, aucun statut n'est attribué par le navigateur et aucun paiement n'est raccordé.

Tipeee classique, TipeeeStream et une intégration PayPal ont été étudiés pour financer le site et ses fonctionnalités intercommunautaires. Le choix du prestataire, la liaison, le montant et la durée restent à confirmer ; l'utilisatrice reporte ce chantier. Aucun recours obligatoire à Discord n'est décidé. Aucun paiement ni contour de PP donateur n'est ajouté par le lot visuel.

## Raccordement et vérification

L'entrée du service dédié configure actuellement `https://deadelustv.pages.dev`. Une liste explicite `TCG_PASS_SITE_ORIGINS` remplace les origines par défaut ; une liste vide ferme les accès. Aucun joker. L'origine du jeu et les domaines de production ne peuvent pas enregistrer de présence. Le filtrage d'origine n'est pas une preuve anti-bot et ne remplace pas Auth, l'inscription et les reçus serveur. Pour renouveler le follow, le navigateur appelle le même service du Pass avec `{action:'verify_follow'}`. Celui-ci relaie uniquement le contrôle utilisateur existant vers Twitch avec le JWT confirmé ; le service partagé reste inchangé dans sa version 17, sans nouvelles commandes administratives exposées.

Le JavaScript et le CSS sont identiques aux copies `public/daily-pass.*` du TCG. Conserver leur synchronisation lors des évolutions du contrat. Le Pass XP et les autres rubriques du portail restent en place.

Tests du portail : `node --test scripts/test_dcg_portal.cjs scripts/test_daily_pass.cjs scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs scripts/test_journal_account_access.cjs`. Le dépôt TCG possède les tests PostgreSQL, HTTP et UI du Pass. Les comptes de tests sont fictifs.

La connexion réelle et le crédit unique de J1 ont été vérifiés après installation coordonnée du service dédié, de la structure et du portail de recette. La concurrence sur deux sessions PostgreSQL et la transition de journée réelle restent à confirmer avant une ouverture de production. Les écrans J1–J6 reçus/J7 en attente utilisés pour la recette visuelle sont servis uniquement par un harnais local hors dépôt public ; ils ne constituent pas une attribution réelle. Les essais couvrent les largeurs 1366/736/320 px, le clavier, l'échec de vérification et la transition confirmée sans allumer J8. Le prestataire de soutien sera raccordé séparément après décision.

## Vérifications de mise en service

88 tests moteur/HTTP/interface/Twitch et 45 tests portail/session/routes réussis. Les vérifications HTTP réelles confirment l'origine de test (204), le refus des autres origines (403) et des appels anonymes (401). La recette sur session réelle confirme J1 et l'absence de double crédit au rechargement. Le cycle complet, les absences et les jours Paris de 23/25 heures sont testés sur des données fictives ; aucun jour futur n'est forcé sur les comptes réels.

Recette réelle du 10 novembre 2026 : la session connectée du site test reçoit J1, +5 Alkahests chez DeadelusTV, avec un solde après crédit de 45. Un rechargement conserve une seule visite, un seul reçu, un total distribué de 5 et le même solde de 45 ; aucun booster quotidien n'est créé à J1. L'affichage confirme la réception de J1 et garde J2–J10 à venir. Aucun jour futur, autre compte ou autre DCG n'est forcé pour cette recette.

La vue de consultation du TCG reste préparée dans la PR Yekelle/TCG #60. Sa fusion vers main n'est pas réalisée, car la revue automatique limite l'autorisation actuelle au site de test ; les crédits du portail ne dépendent pas de cette fusion.
