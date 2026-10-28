# Publication sélective : mini-lecteur Twitch flottant

Date : 26 octobre 2026. Source validée : branche `developpement/legal-et-consentement` ; diffusion uniquement des modifications liées au lecteur.

## Fonctionnement

Lors d'un vrai direct, et uniquement après consentement Twitch, le lecteur se positionne en fenêtre flottante dès que son ancre dans l'accueil n'est plus entièrement visible, ou pendant la navigation interne entre les rubriques du portail principal. La fenêtre est placée en bas à gauche, avec un bouton de fermeture et un bouton de réouverture volontaire. L'iframe Twitch est conservée pendant les transitions normales/flottantes afin de maintenir le flux. Le refus/retrait du consentement retire immédiatement l'iframe. Hors ligne et pour les écrans trop étroits, ne pas ouvrir de fenêtre flottante ; renvoyer vers Twitch quand son intégration ne peut pas respecter les 400 × 300 px requis.

Seuil provisoire desktop : au moins 901 px de largeur et 450 px de hauteur, fenêtre flottante 540 px de large. Le fonctionnement mobile est volontairement laissé inchangé : aucun effort pour forcer un lecteur sur un petit écran, les visiteurs peuvent utiliser Twitch directement.

## Tests et validations

Confirmés manuellement par l'utilisatrice sur branche de développement : lecteur flottant fonctionnel sur Chrome, Firefox et Edge invité ; croix fermant le lecteur ; conservation de lecture pendant la navigation entre rubriques ; réouverture ; retrait du consentement pendant flottant puis nouvelle acceptation sur accueil. Le cas du profil Edge personnel (configuration ou extension suspectée) a été exclu du périmètre des anomalies du site.

Tests automatisés sans réseau : `scripts/test_twitch_floating.cjs` et les tests de consentement de la branche de développement. GitHub Actions de développement : https://github.com/DeadelusTV/deadelusTV/actions/runs/40399369761 (succès). Les essais réels réalisés avant publication ne remplacent pas le contrôle de l'instance publiée après déploiement.

## Fichiers inclus

- `public/index.html` : ajout du CSS et du JS flottants à partir du **main existant**, sans reprendre la version divergente de la branche de développement.
- `public/assets/twitch-player.js` : version testée sur la branche de développement ; le reste du module Twitch est inchangé.
- `public/assets/twitch-floating.js` et `public/assets/twitch-floating.css` : nouveaux fichiers du mini-lecteur.
- `scripts/test_twitch_floating.cjs` : tests isolés du comportement de la fenêtre.
- Ce document de publication.

**Important :** ne pas fusionner globalement `developpement/legal-et-consentement` : ses versions de fichiers `index.html`, `app.js` et `legal.css` sont antérieures à des modifications déjà validées sur `main`.

## Liens légaux et consentement : contrainte impérative

Les cinq liens du pied de page `Mentions légales`, `Politique de confidentialité`, `CGU`, `CGV` et `Politique de cookies` gardent leur attribut `hidden`. Le bouton **Gestion des cookies** reste le **seul contrôle légal visible au pied de page**. Les pages d'attente conservent `data-legal-pending="true"` et restent disponibles via leur adresse directe. Le lien vers la confidentialité à l'intérieur de la gestion du consentement est préservé. Aucun texte légal définitif n'a été fourni ni validé ; ce masquage temporaire ne vaut pas conformité réglementaire.

## Déploiement

La fusion de la PR de publication vers `main` déclenche le workflow de déploiement OVH déjà existant. Vérifier qu'il réussit, puis tester sur https://www.deadelustv.com pendant un direct en conditions réelles. Ne pas confondre `main` fusionnée avec le résultat effectif du déploiement. Aucune modification à Supabase, aux scripts OVH, ni aux modules spécialisés.

## Correctif mobile — 27 octobre 2026

L'utilisatrice signale un léger décalage du panneau Twitch pendant le défilement sur iPhone et Samsung. Le dock utilisait `position: fixed` et des coordonnées recalculées au scroll, même quand seul le panneau/image était affiché.

À 900 px de largeur et moins, le dock est désormais placé dans son emplacement sur l'accueil, avec `position: static` et une hauteur naturelle incluant les textes et boutons. Il n'utilise plus de mesures ni de coordonnées de défilement. Le lien Twitch reste accessible aux technologies d'assistance. Au-delà de 900 px, le dock permanent et les règles du mini-lecteur sont conservés. Si un redimensionnement franchit ce seuil pendant une lecture, celle-ci est arrêtée avant de déplacer son conteneur, puis réévaluée dans le nouveau format ; les transitions normales/flottantes sur ordinateur conservent l'iframe.

Vérifications : 17 tests Node du mini-lecteur et du consentement réussis, dont flux mobile, navigation, absence de calcul de position mobile et changement de format ; contrôle des fichiers statiques et de la syntaxe. La confirmation visuelle du défilement sur iPhone et Samsung réels reste attendue après déploiement. Le seuil minimal du lecteur Twitch, le consentement et les autres rubriques restent inchangés.

### Retour mobile et actualisation des fichiers

Après publication, l'utilisatrice indique que le panneau saute toujours, éventuellement un peu moins. Le correctif n'est donc pas validé sur téléphone réel. Une lecture HTTP confirme les nouveaux fichiers sur le serveur, mais elle ne prouve pas la version utilisée par son navigateur. Les références HTML du CSS et du JavaScript flottants portent désormais `?v=20261027-mobile1` pour demander une nouvelle copie des deux ressources. Il s'agit d'écarter l'hypothèse du cache, pas d'une cause du saut démontrée. Ressources locales et différences HTML vérifiées ; nouveau test iPhone/Samsung attendu après déploiement. Si le décalage persiste avec cette version, poursuivre le diagnostic visuel plutôt que déclarer le problème résolu.

Validation ultérieure du 27 octobre : l'utilisatrice confirme que le problème est réparé sur son téléphone après cette actualisation. Cette confirmation ne couvre pas tous les modèles et navigateurs.

## Panneau hors live sur ordinateur — 28 octobre 2026

Nouveau signalement : l'image hors live se décale pendant le défilement sur PC. Le correctif du 27 octobre ne modifiait le positionnement que pour les écrans de 900 px et moins : le panneau desktop utilisait encore un dock fixe recalé par JavaScript.

Désormais, tous les panneaux sans lecture autorisée (chargement, hors ligne, refus de consentement, état incertain, écran trop petit) restent dans le flux normal de l'accueil, quelle que soit la largeur. Le dock persistant est réservé au direct autorisé sur écran compatible. La préparation du dock avant création de l'iframe ne doit pas interrompre la vérification du direct en cours. Seul un lecteur déjà créé est arrêté avant un changement de conteneur ; les transitions normale/flottante pendant un direct desktop conservent son iframe. L'emplacement du lecteur fermé reste réservé pour le message de réouverture.

Les références CSS/JS passent à `?v=20261028-inline2` pour renouveler les deux ressources ensemble. 19 tests Node du consentement et du dock réussis, incluant les panneaux desktop et les transitions chargement/direct/hors ligne ; syntaxe JavaScript et fichiers statiques vérifiés. La validation finale du défilement sur le PC de l'utilisatrice reste attendue. Aucun changement des modules News, carnet, TCG, Crewmong Us, Pavillon Noir ou de la configuration Supabase.
