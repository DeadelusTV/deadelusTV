# Polices du néon — hébergement local et droits

**26 octobre 2026 — branche `developpement/legal-et-consentement`, non publié sur `main`.**

## Deux polices sous licence libre : développé sur branche, test visuel à faire

- `Bungee Inline` : titre néon actuellement libellé « HORS LIGNE », fichier `public/assets/fonts/bungee-inline-latin-400-normal.woff2`, environ 21 Ko.
- `Great Vibes` : sous-titre « Rendez-vous à 21h en live », fichier `public/assets/fonts/great-vibes-latin-400-normal.woff2`, environ 43 Ko.
- Familles déclarées en `public/assets/local-fonts.css` et chargées depuis `public/index.html`, **sans URL Google Fonts**.
- Les positions, tailles, couleurs, animations et familles de `twitch-neon.css` sont inchangées ; seule l'origine des deux familles change.
- Les variantes **latin, poids 400, WOFF2** sont extraites des paquets publics Fontsource du dépôt `fontsource/font-files` et redistribuées avec les licences **SIL Open Font License 1.1** dans `public/assets/fonts/OFL-Bungee-Inline.txt` et `public/assets/fonts/OFL-Great-Vibes.txt`.
- Références licences : https://github.com/fontsource/font-files/tree/main/fonts/google/bungee-inline et https://github.com/fontsource/font-files/tree/main/fonts/google/great-vibes .

**Vérifications restantes :** dans un navigateur actualisé sur cette branche, F12 Réseau et filtre `fonts` puis `woff2` : les fichiers WOFF2 doivent être servis par `127.0.0.1` en local (ou par le domaine du site une fois publié), **aucune** requête à `fonts.googleapis.com` ni `fonts.gstatic.com`. Vérifier sur l'écran néon hors ligne le rendu du titre et du sous-titre, accents inclus, dans Chrome et Edge.

## Police Academy fournie par Deadelus : identification, non intégrée

L'archive utilisateur `academy.zip` contient `Academy.ttf` et `AcademyFilled3D.ttf` ; métadonnées des deux fichiers : créateur **Vladimir Nikolic**, copyright 2020, `All rights reserved`. Cette police est réputée identique à celle de son planning et elle est envisagée pour le titre du néon. Elle **n'est pas publiée, copiée dans GitHub, utilisée dans une feuille CSS, ni redistribuée** dans l'état.

L'auteur précise explicitement sur DaFont « Free for personal use », et renvoie vers une licence pour usage commercial : https://www.dafont.com/fr/academy.font et https://www.creativefabrica.com/product/academy-3/ . **La simple possession des TTF ou leur utilisation dans une image de planning ne prouve pas le droit d'auto-héberger une police sur un site professionnel.** Vérifier auprès de Deadelus / du fournisseur la preuve d'une licence couvrant **l'usage commercial et l'intégration web sur le domaine** avant toute copie et modification CSS. Vérifier aussi que conversion WOFF2 et hébergement autonome sont autorisés.

Après validation de licence, ajuster le titre `HORS LIGNE` (ne pas toucher automatiquement au sous-titre) et effectuer un contrôle de rendu mobile/desktop, car les métriques des glyphes peuvent modifier l'alignement validé de la maquette. La police Academy reçue ne contient pas tous les caractères accentués du français ; cela ne pose pas de problème pour « HORS LIGNE » mais peut limiter d'autres textes.

**Décision :** hébergement local des polices OFL approuvé ; utilisation web d'Academy uniquement envisagée et subordonnée à la licence ; aucune modification de la production.
