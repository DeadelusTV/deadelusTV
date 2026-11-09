# Niveau général XP — 9 novembre 2026

L'accueil `#tcg` affiche un médaillon **Niveau général**. Il reprend toutes les ouvertures de paquets enregistrées dans les DCG du joueur. Le niveau individuel reste dans chaque jeu. Le futur **Connexion Pass** conserve son emplacement séparé.

Le médaillon réutilise `dcg-xp.js`, `dcg-xp.css` et `dcg-xp-pass.js`, identiques aux composants du dépôt TCG. La session et le client sont ceux de `DEADELUSTV_AUTH`, sans copie d'identifiants ni nouveau client. Le module est détruit à la déconnexion, au changement de compte et en quittant l'accueil ; les réponses tardives ne restaurent pas de contenu privé.

`dcg_my_xp` lit la progression du compte authentifié. `dcg_claim_general_xp` récupère un niveau précis au clic, avec son numéro comme clé de reprise. Le serveur crédite **10 × niveau Alkahests dans chacun des DCG rejoints**, intégralement, et conserve les portefeuilles séparés. Un nouveau DCG ne récupère pas les récompenses déjà réclamées avant son arrivée.

La migration correspondante est préparée dans `Yekelle/TCG`, `supabase/migrations/20261109020743_dcg_xp_pass.sql`. Elle ignore l'historique et les anciens lancements de test. Le routage et l'inscription autonome de plusieurs streamers ne sont pas ajoutés par cette évolution ; le scénario de cumul est testé avec plusieurs chaînes fictives côté serveur.

Publication à coordonner avec la migration TCG. Tant qu'elle n'est pas installée, le widget propose de réessayer, sans inventer de niveau. Destination du code : branche de test du portail, sans fusion sur `main` ni déploiement OVH dans cette livraison.
