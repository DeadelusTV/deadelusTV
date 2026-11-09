# Niveau général XP — 9 novembre 2026

L'accueil `#tcg` affiche un médaillon **Niveau général**. Il reprend toutes les ouvertures de paquets enregistrées dans les DCG du joueur. Le niveau individuel reste dans chaque jeu. Le futur **Connexion Pass** conserve son emplacement séparé.

Le médaillon réutilise `dcg-xp.js`, `dcg-xp.css` et `dcg-xp-pass.js`, identiques aux composants du dépôt TCG. La session et le client sont ceux de `DEADELUSTV_AUTH`, sans copie d'identifiants ni nouveau client. Le module est détruit à la déconnexion, au changement de compte et en quittant l'accueil ; les réponses tardives ne restaurent pas de contenu privé.

Le décor est désormais l'asset transparent `public/modules/dcg/assets/xp/dcg-xp-medallion.png`, validé à partir des références visuelles. La copie TCG se trouve dans `public/assets/xp/`. Le chiffre n'est pas dans l'image : niveau, remplissage et halo restent dynamiques. Pour changer le décor, remplacer les deux PNG en conservant leur cadrage ; le chemin est également personnalisable par `--xp-medallion-image`. Les références CSS/JS sont passées à `rev=2`. Aucun changement du calcul ou de l'activation XP.

`dcg_my_xp` lit la progression du compte authentifié. `dcg_claim_general_xp` récupère un niveau précis au clic, avec son numéro comme clé de reprise. Le serveur crédite **10 × niveau Alkahests dans chacun des DCG rejoints**, intégralement, et conserve les portefeuilles séparés. Un nouveau DCG ne récupère pas les récompenses déjà réclamées avant son arrivée.

La migration correspondante est versionnée dans `Yekelle/TCG`, `supabase/migrations/20261109020743_dcg_xp_pass.sql`. Elle ignore l'historique et les anciens lancements de test. Le routage et l'inscription autonome de plusieurs streamers ne sont pas ajoutés par cette évolution ; le scénario de cumul est testé avec plusieurs chaînes fictives côté serveur.

Migration TCG `20261109024814_dcg_xp_pass` appliquée le 9 novembre. Les lectures authentifiées retournent zéro, avec activation inactive. La [PR #16](https://github.com/DeadelusTV/deadelusTV/pull/16) est intégrée à `developpement/tcg-attente` par la fusion `c9cca8bdc121c29d6be4247e35532af1f1111983`. Le [portail Cloudflare](https://deadelustv.pages.dev/#tcg) est publié ; déploiement Pages `23682dd8-de00-47ee-ae96-1c67bd1b208b`. Les six fichiers contrôlés correspondent aux sources intégrées, et la section XP est visible en navigateur sans erreur console relevée. Aucune fusion sur `main` ni publication OVH. L’XP reste inactive jusqu’au lancement du DCG.
