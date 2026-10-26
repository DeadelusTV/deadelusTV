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

L'auteur indique sur DaFont « Free for personal use », mais **Creative Fabrica propose Academy à 0 € via une offre d'essai d'abonnement** et annonce une licence commerciale incluse, ce qui peut permettre de créer des **visuels statiques commerciaux** (dont un planning), selon les conditions applicables au téléchargement : https://www.dafont.com/fr/academy.font et https://www.creativefabrica.com/product/academy-3/ . **À ne pas confondre avec l'intégration d'un fichier de police dans un site** : la licence d'abonnement Creative Fabrica en vigueur exclut expressément l'incorporation de webfonts dans un site, et renvoie vers une **licence Web Font spécifique**. Sources : https://www.creativefabrica.com/subscription-license/ et https://www.creativefabrica.com/enterprise-license/ . Vérifier la licence réellement obtenue, le périmètre web et l'autorisation éventuelle de conversion WOFF2 avant tout hébergement public. Le prix 0 € est associé à une période d'essai avec possible renouvellement ; vérifier les conditions avant inscription.

Après validation de licence, ajuster le titre `HORS LIGNE` (ne pas toucher automatiquement au sous-titre) et effectuer un contrôle de rendu mobile/desktop, car les métriques des glyphes peuvent modifier l'alignement validé de la maquette. La police Academy reçue ne contient pas tous les caractères accentués du français ; cela ne pose pas de problème pour « HORS LIGNE » mais peut limiter d'autres textes.

**Décision :** hébergement local des polices OFL approuvé ; utilisation web d'Academy uniquement envisagée et subordonnée à la licence ; aucune modification de la production.
