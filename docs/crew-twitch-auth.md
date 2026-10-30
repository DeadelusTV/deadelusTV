# Crew — connexion Twitch commune du portail

30 octobre 2026 · branche `developpement/phasmo-v2`.

## Parcours demandé et correction

Le premier lot (`6dc4a9d`) proposait une connexion Twitch séparée dans Crew. L'utilisatrice a précisé que la connexion doit passer par le bouton **Compte / Twitch commun** du site. Ce document remplace donc le précédent guide d'activation : **ne pas activer un second fournisseur Twitch Crew pour ce parcours**.

Le message `Unsupported provider: provider is not enabled` rapporté lors du premier essai correspondait à l'appel OAuth du projet Crew, où Twitch n'était pas activé. Le nouveau parcours utilise le fournisseur déjà en place sur le portail.

- Le menu Compte affiche **Gestion Crew’mong Us** pour les comptes autorisés, à côté des liens Phasmo et Journal lorsque leurs permissions propres le permettent.
- Tous les modérateurs de **DeadelusTV** reçoivent le niveau Helper existant : saisie et modification des fiches. Les opérations structurelles, suppressions, imports et bruts du Logger restent Admin.
- Le propriétaire de la chaîne est reconnu par l'identifiant Twitch vérifié `99977368` et reçoit Admin.
- Les autres viewers gardent la consultation publique.
- Les droits News et Journal ne sont pas déduits du rôle Crew et restent indépendants.

## Architecture et sécurité

Le portail Auth reste sur `eodtxlhnfzyapkyvvxdi` ; les données Crew restent sur `qonkgfbxmtmmwdjzyxuf`. Le compte visible et le parcours de connexion sont communs. Une session technique Crew est émise côté serveur afin de conserver les RLS et fonctions métier existantes.

L'Edge Function Crew `crew-twitch-access` vérifie le jeton portail auprès de l'URL Auth fixe du portail. Elle utilise exclusivement `auth.identities.provider_id` de l'identité Twitch retournée par Auth, jamais les métadonnées utilisateur ni un pseudo. Pour les modos, elle valide le jeton Twitch, exige qu'il appartienne exactement à cette identité puis interroge `GET /helix/moderation/channels`, avec pagination bornée. Le Client ID utilisé pour Helix provient de la réponse de validation Twitch, pas du navigateur. Aucun secret Twitch supplémentaire n'est nécessaire.

Le bouton commun demande désormais `user:read:email user:read:moderated_channels`. Une session ouverte avant ce changement peut nécessiter une déconnexion/reconnexion commune pour obtenir le nouveau scope. Si le jeton Twitch manque ou expire, les droits automatiques ne sont pas renouvelés ; une reconnexion est proposée. Le jeton fournisseur n'est conservé en plus qu'en mémoire pendant la page ; aucune copie persistante additionnelle n'est créée.

Les associations portail → compte Crew et les droits temporaires sont dans deux tables privées, avec RLS et sans accès client. La RPC publique est `SECURITY INVOKER` et exécutable seulement par `service_role` ; la fonction privilégiée est dans le schéma privé. Les gardes existantes acceptent les rôles manuels ou les baux temporaires valables au maximum cinq minutes. Une erreur de vérification n'accorde pas de nouveau droit. La suppression du statut de modo cesse d'accorder l'accès au plus tard à l'expiration du dernier bail.

Pour un nouveau gestionnaire, Auth Crew émet une session à partir d'un compte technique déterministe ; les liens à usage unique sont générés et consommés côté serveur, sans envoi d'e-mail. Aucun JWT n'est fabriqué et aucune clé serveur n'est envoyée au client. Aucun compte technique n'est créé lors d'un simple contrôle du menu ou pour un viewer sans rôle.

La session technique Crew reste en mémoire dans le module (`persistSession:false`). Elle est invalidée localement à la déconnexion du compte commun ; le serveur supprime aussi son bail quand cette demande aboutit. Les JWT déjà émis restent soumis aux gardes SQL et à leur expiration. Les rôles manuels historiques continuent d'être indépendants des baux automatiques.

## Transition des admins existants

Aucun rapprochement par pseudo ou e-mail n'est effectué. Aucun rôle manuel existant n'est réécrit.

1. Se connecter avec le bouton Twitch **commun** du site.
2. Ouvrir Crew / Gestion. Dans **Ancien compte Crew — transition**, ouvrir l'ancien compte e-mail/mot de passe.
3. Cliquer **Associer au compte Twitch du site**.
4. Vérifier Admin et les opérations autorisées ; les connexions suivantes passent seulement par le compte commun.

L'association exige simultanément une session portail vérifiée et une session Crew vérifiée dont le rôle manuel est Admin ou Helper. L'UUID Crew historique est alors conservé. Le formulaire de transition reste disponible pour un modo déjà connecté en Helper, afin qu'il puisse récupérer son rôle Admin historique. Un compte Crew déjà associé à un autre compte portail ne peut pas être repris.

## Mise en place et état réel

- SQL `docs/crew-twitch-sql-a-appliquer.sql` appliqué sur **Crew**, migration `crew_portal_twitch_common_login`. Ne pas le réexécuter.
- Edge Function `crew-twitch-access` déployée sur Crew. `verify_jwt=false` car le jeton du portail est vérifié explicitement auprès d'Auth portail dans la fonction.
- Origine autorisée par défaut : `https://developpement-phasmo-v2.deadelustv.pages.dev` uniquement. La production doit être ajoutée explicitement lors de sa préparation, via `CREW_ALLOWED_ORIGINS`. Pas d'activation du parcours commun sur main par ce lot.
- Variables serveur Supabase intégrées réutilisées ; pas de nouveau fournisseur OAuth Crew ni de secret Twitch à configurer.
- Aucun changement appliqué au schéma portail/TCG, aux droits Phasmo ou Journal, aux statistiques, aux parties, aux sauvegardes ou à la DLL.

## Vérifications et limites

- 20 contrôles HTTP serveur simulés : identité portail, faux rôles/métadonnées, identité Twitch différente, viewer/modo/propriétaire, session émise, association protégée, pagination, panne Twitch, révocation, expiration, origine interdite, absence de secrets dans les réponses.
- 10 scénarios UI simulés : connexion commune, présence du menu selon le rôle, permissions Phasmo/Journal indépendantes, Admin/Helper, transition, déconnexion et réponse concurrente tardive.
- Tests PostgreSQL avec comptes fictifs dans une transaction intégralement annulée : viewer refusé, Helper sans Admin, expiration, retrait, conservation Admin, substitution d'identité refusée, TTL borné et exécution cliente de la RPC interdite. Contrôle sous le rôle SQL `authenticated` inclus.
- Après activation : tables privées avec RLS, RPC interdite au client, absence des comptes de test et absence d'association créée à ce stade confirmées. Le conseiller relève deux infos « RLS sans politique », intentionnelles pour ces tables privées interdites aux clients, et les avertissements préexistants des fonctions métier et mots de passe ; aucun nouvel avertissement de fonction publique privilégiée.
- Syntaxe JavaScript vérifiée. Ces contrôles ne constituent pas une recette OAuth/navigateur réelle.

**Encore à valider sur la prévisualisation :** reconnexion Twitch commune, menu et ouverture de Gestion avec un modo réel, association des deux admins existants, écritures Admin/Helper sur données d'essai, refus d'un viewer et d'un modo d'une autre chaîne, déconnexion, F5, expiration/retrait du rôle et absence d'interférence avec les éditeurs Phasmo/Journal. Pas de fusion vers main avant validation.

## Références techniques

- https://supabase.com/docs/guides/auth/social-sign-in/auth-twitch
- https://supabase.com/docs/reference/javascript/auth-admin-generatelink
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://github.com/supabase/auth/blob/master/internal/api/mail.go
- https://dev.twitch.tv/docs/api/reference/#get-moderated-channels
- https://dev.twitch.tv/docs/authentication/validate-tokens/
