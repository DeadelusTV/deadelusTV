# Ombre Curieuse — suivi de la branche

## Synchronisation du 27 octobre 2026

- Branche : `prototype/ombre-curieuse`, prototype toujours non publié sur main.
- Base main intégrée : `0edd2e07f66ff8f02f70fda503c171b5768cb179`.
- Point de retour avant fusion : `d8e00d7e0c684cfa987ad45a3947ed058ac5aaca`, conservé comme premier parent du commit de fusion.
- Tous les fichiers du site principal sont repris sans autre différence que les imports de l'Ombre dans index.html, les trois ressources de son prototype et ce suivi.
- Illustration SVG conservée à l'octet près : personnage, regard ambré et amulette inchangés. Dimensions, recadrages, respiration, clignement, mouvement réduit, absence d'interaction et règles aléatoires conservés.
- Adaptation nécessaire de trois sélecteurs de cachettes : `.page-header` TCG accepte aussi `.tcg-awaiting__copy`, `.tcg-demo` accepte aussi `.tcg-awaiting__after`, `.faq-list` Phasmo accepte aussi `.phasma-resources`. Les anciens sélecteurs restent compatibles. CSS de position relative ajouté sur ces nouveaux blocs uniquement ; aucune refonte du personnage ou de ses animations.
- Une seule Ombre à la fois ; cachette aléatoire par rubrique et environ 20 % d'absence. Tests forcés : `?ombre=1#accueil` ; désactivation : `?ombre=0#accueil`.
- Les pages légales ne possèdent pas de cachette configurée : pas d'ajout automatique à ce périmètre.
- Direction artistique et placements définitifs restent à valider. La synchronisation n'intègre aucun ZIP ou prototype extérieur à cette branche et ne publie pas l'Ombre sur le site officiel.
