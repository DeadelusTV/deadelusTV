# Connexion Pass — raccordement du portail

Fondation du 4 novembre 2026, préparée sur une branche issue de Phasmo V2. Non activée ; aucune modification de la production ou des soldes.

J1 donne **+5 poussières dans chaque TCG participant d'un streamer suivi**. Exemple de règle : Meteorann + PachaTV = +5 chez chacun. Les autres montants, l'absence et les boosters restent à définir.

Le module `public/assets/daily-pass.js` et sa feuille de style sont identiques à ceux du dépôt Yekelle/TCG. Ils appellent les RPC du pass depuis la session Auth du portail. La visite d'une rubrique du site suffit ; aucun passage par le TCG n'est nécessaire. L'identité, la date, les quantités et les bénéficiaires sont décidés côté serveur, jamais depuis l'URL ou le pseudo affiché.

`site-auth.js` restaure sa propre session existante dès une visite ordinaire et expose uniquement son identifiant via `DEADELUSTV_AUTH.userId`. Le chargement du SDK reste différé chez les anonymes. Le callback Crew conserve son exception. Le module du pass efface ses résultats dès qu'un compte change et ignore les réponses tardives.

Le backend, sa migration et les tests métier sont préparés dans Yekelle/TCG ; guide `docs/CONNEXION_PASS_FOUNDATION.md`. La fonction Twitch doit accepter l'action limitée `verify_follow` depuis l'origine du portail. Une prévisualisation exige une entrée HTTPS exacte dans `TCG_PASS_ORIGINS` côté serveur. Les autres commandes Twitch ne sont pas ouvertes au portail.

Seul le TCG DeadelusTV existe dans la configuration actuelle. Deux chaînes fictives vérifient la distribution séparée ; l'onboarding et la synchronisation réelle d'autres streamers ne sont pas réalisés par ce lot.

Tests portail : `node --test tests/site-auth-daily-pass.test.cjs` (4 réussis). Tests communs et backend : 78 réussis dans le dépôt TCG. Recette visuelle desktop/mobile et connexion réelle encore à faire. Aucun backend installé ni prévisualisation déployée par ce lot.
