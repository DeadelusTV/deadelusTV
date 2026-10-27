# Polices du néon — hébergement local et droits

## État actuel après synchronisation du 27 octobre 2026

- Main intégré : `0edd2e07f66ff8f02f70fda503c171b5768cb179`. Point de retour : `17e8d167f5b27c8be316674d64a4fa4aced760df`, conservé comme premier parent du commit de fusion.
- Le consentement global Twitch/YouTube, le mini-lecteur, le néon Graduate et le contrôle du statut live sont déjà publiés. Le raccordement des News et leurs corrections actuelles sont repris depuis main ; le livre Phasmo en développement reste dans sa branche propre.
- Les deux maquettes Mentions légales / Confidentialité et leurs liens visibles en développement sont conservés. Les pages CGU, CGV et Cookies préparées sur main sont également disponibles par leurs routes ; leurs liens du footer restent masqués. Aucun texte juridique définitif ajouté ou présenté comme validé.
- `scripts/verify-static.py` et l'appel strict dans le déploiement restent bloquants tant que `data-legal-pending="true"` existe. Seuls les contrôles de branche autorisent explicitement les textes en attente avec `--allow-legal-pending`.
- Les outils de prévisualisation OVH, le service de statut, les tests et les documents de travail sont conservés. Les descriptions plus anciennes ci-dessous sont des étapes historiques, pas l'état actuel de publication.
- Aucune modification de main, du serveur OVH ou d'une base. Les futurs textes de Deadelus, leur intégration et leur validation restent à terminer.


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

## Police Varsity par Brøderbund Software — autre piste visuelle, licence inconnue

**Piste proposée par l'utilisatrice le 26 octobre 2026 :** la police « Varsity » ressemble à Academy pour le grand texte néon « HORS LIGNE ». Fiche : https://www.dafont.com/varsity-2.font . Sur DaFont, cette version est attribuée à Brøderbund Software et le téléchargement s'appelle `varsity_regular.ttf` ; aucune licence commerciale ou web explicite n'est indiquée sur la fiche. La FAQ DaFont précise qu'une licence absente ne signifie pas que la police est libre (https://www.dafont.com/faq.php). **Statut : IDÉE À ÉTUDIER, aucun droit d'auto-hébergement établi**. Ne pas intégrer de police Varsity dans le dépôt ou la feuille CSS sans preuve d'une licence commerciale et web compatible.

Les polices OFL auto-hébergées restent le choix technique actuel ; Academy et Varsity sont deux alternatives purement envisagées.

**Décision :** hébergement local des polices OFL approuvé ; utilisation web d'Academy et de Varsity uniquement envisagée et subordonnée à la preuve des licences ; aucune modification de la production.

## 26 octobre 2026 — Graduate, police validée et intégrée à la branche

La police **Graduate** (Eduardo Tunni, copyright 2012, licence SIL OFL 1.1, Reserved Font Name « Graduate ») remplace **Bungee Inline** pour le titre « HORS LIGNE ». Le fichier WOFF2 latin est auto-hébergé dans `public/assets/fonts/graduate-latin-400-normal.woff2`, avec la licence complète dans `public/assets/fonts/OFL-Graduate.txt`. Bungee Inline reste dans les assets par précaution, mais n'est plus utilisé par le titre ; le sous-titre conserve Great Vibes.

**Rendu A validé :** liseré blanc 2,2 px, halo bleu 130 %, largeur des lettres 91 %, taille 8,2 cqw, X 52 %, Y 40,5 %. Effet CSS par couche floue `::before` et lettres individuelles conservées pour le scintillement. **Développé sur `developpement/legal-et-consentement`, non publié sur `main`.** Contrôle de rendu en navigateur réel restant, y compris fond de briques, écran mobile, absence d'appels Google Fonts, animations et sous-titre.
