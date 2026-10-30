# Crew — connexion Twitch préparée sur Phasmo V2

Date : 30 octobre 2026. Branche : `developpement/phasmo-v2`.

**Statut : développé et testé avec fournisseurs simulés ; activation Supabase et recette OAuth réelle encore à faire.** Aucun changement appliqué au schéma actif, aucun compte ou rôle existant modifié, aucune fusion vers `main`.

## Comportement retenu

- Connexion Twitch proposée dans Gestion à la place du formulaire principal e-mail/mot de passe.
- Tous les modérateurs **de la chaîne DeadelusTV** peuvent accéder à Gestion avec le niveau Helper existant : saisie et modification des fiches. Import JSON, bruts du Logger, suppressions et réglages structurels restent réservés aux admins.
- Les admins Crew existants conservent leur UUID et leur rôle. Une association Twitch depuis leur ancien compte est proposée ; l'ancien accès e-mail est conservé dans un volet de transition.
- Le propriétaire de la chaîne DeadelusTV est reconnu par son identifiant Twitch vérifié et dispose du niveau Admin.
- La consultation des statistiques reste publique. Une connexion Twitch ordinaire n'accorde aucun droit de gestion et ne demande pas de créer un mot de passe.

Le niveau Helper des nouveaux modos est un choix d'implémentation conservateur, annoncé pendant le travail. La demande explicite confirme **tous les modos Twitch**, sans leur attribuer tous les pouvoirs Admin.

## Périmètre de la connexion

Crew reste dans son projet Supabase `qonkgfbxmtmmwdjzyxuf`. Le portail / News / TCG utilise `eodtxlhnfzyapkyvvxdi`. Cette étape **remplace le moyen de connexion à Crew** ; elle ne crée pas de session unique entre les deux projets. Le bouton Compte du portail continue de gérer sa propre session. Aucun jeton n'est transféré d'un projet à l'autre et aucune donnée Crew n'est migrée vers le TCG.

Une connexion unique portail/Crew nécessiterait une intégration supplémentaire à concevoir et valider. L'audit Twitch Phasmo antérieur excluait explicitement Crew.

## Protection des droits

L'Edge Function `crew-twitch-access` valide la session Crew auprès de Supabase Auth, valide le jeton fournisseur auprès de Twitch, vérifie le Client ID et interroge `GET /helix/moderation/channels` avec le scope `user:read:moderated_channels`. La pagination est prise en charge avec durée totale bornée. La chaîne cible `99977368` / DeadelusTV provient de la configuration TCG consultée en lecture seule.

La fonction SQL serveur vérifie que `auth.identities.provider_id` correspond à l'identité Twitch validée avant d'accorder le moindre droit. Aucun pseudo, champ `user_metadata`, rôle envoyé par le navigateur ou statut viewer TCG ne sert à autoriser une opération.

Les droits automatiques sont stockés dans une table privée avec RLS, interdite aux visiteurs et utilisateurs connectés. La fonction publique d'octroi est `SECURITY INVOKER`, exécutable uniquement par `service_role` ; sa fonction privilégiée reste dans le schéma privé. Les clés serveur restent dans les variables intégrées des Edge Functions.

La vérification reste valable au maximum cinq minutes, avec renouvellement dans le module ouvert au plus toutes les quatre minutes. Les contrôles SQL des opérations utilisent aussi cette expiration : garder un ancien JWT ne prolonge pas indéfiniment un accès de modo. Le retrait du statut Twitch cesse donc d'accorder l'accès **au plus tard à l'expiration de la dernière vérification**, pas instantanément. Une erreur Twitch ne renouvelle aucun droit automatique. Les rôles manuels existants sont indépendants.

Supabase ne renouvelle pas ici le jeton fournisseur Twitch ; si celui-ci expire, le bouton de renouvellement relance OAuth. Aucun jeton fournisseur supplémentaire n'est copié dans un autre stockage par ce code.

## Activation nécessaire avant la recette réelle

Les réglages Supabase sont communs à `main` et aux branches de développement. Un push Git ne les isole pas. Ce lot les prépare sans les activer.

1. Dans le projet **Crew**, configurer le fournisseur **Twitch** dans Authentication → Sign In / Providers avec une application Twitch et ses identifiants. Son callback Supabase est `https://qonkgfbxmtmmwdjzyxuf.supabase.co/auth/v1/callback` ; l'ajouter dans l'application Twitch sans retirer les callbacks existants. Ne pas publier le Client Secret dans Git ou dans le navigateur.
2. Autoriser le retour de prévisualisation `https://developpement-phasmo-v2.deadelustv.pages.dev/?crew_auth=1` dans Authentication → URL Configuration → Redirect URLs. Cette origine est identifiée dans le suivi Drive du déploiement Phasmo V2 ; le retour OAuth Crew lui-même reste à recetter. Ajouter celui de production lors de sa préparation, sans retirer les autres : `https://www.deadelustv.com/?crew_auth=1`.
3. Pour associer Twitch aux comptes admins dont l'adresse Twitch est différente, activer **Manual identity linking** dans les réglages Auth. Un admin doit ouvrir son ancien compte Crew, puis cliquer sur **Associer mon compte Twitch** ; vérifier ensuite qu'il retrouve ses droits. La liaison automatique par e-mail, lorsqu'elle est applicable, relève de Supabase ; aucun rapprochement maison par pseudo n'est effectué.
4. Relire puis appliquer `docs/crew-twitch-sql-a-appliquer.sql` **sur Crew uniquement**. L'exécuter une seule fois. Il étend les gardes de droits existantes et ajoute une table privée de vérifications temporaires ; il ne modifie pas `user_roles`.
5. Déployer `supabase/functions/crew-twitch-access/` avec `index.ts` comme point d'entrée. La fonction vérifie elle-même chaque session via Auth ; configurer `verify_jwt=false` pour accepter les JWT modernes sans dépendre du vérificateur historique de la passerelle. La fonction reste protégée par cette vérification interne.
6. Ajouter aux variables de l'Edge Function `CREW_TWITCH_CLIENT_ID` = Client ID de l'application du fournisseur Crew et `CREW_ALLOWED_ORIGINS` = `https://developpement-phasmo-v2.deadelustv.pages.dev` pour l'essai de branche. Ajouter `,https://www.deadelustv.com` lors de la préparation de production. Utiliser des origines exactes sans chemin ni slash final. Les variables serveur Supabase intégrées sont réutilisées ; le Client Secret Twitch reste dans la configuration du fournisseur Auth et n'est pas nécessaire à cette fonction.
7. Tester les parcours ci-dessous sur Phasmo V2 avant de décider la fusion vers `main`. Ne retirer le volet d'ancien compte qu'après association et validation des comptes admins concernés.

## Vérification réalisée

- `node scripts/test_crew_twitch_access.cjs` : 18 contrôles serveur sur réponses simulées, dont viewer, modo, propriétaire, admin manuel, pagination, faux rôle client, jeton révoqué, application incorrecte, scope absent, panne Twitch et identité différente.
- `node scripts/test_crew_twitch_ui.cjs` : 11 parcours de logique d'interface avec DOM/SDK simulés, dont association explicite, conservation des admins, absence de formulaire de création de mot de passe pour un viewer, réponse tardive après déconnexion et séparation des callbacks OAuth Crew / portail.
- Vérification PostgreSQL dans un schéma de test séparé, avec données fictives et transaction intégralement annulée : rôles manuels, privilèges Helper/Admin, expiration, retrait du statut, identité associée, TTL et interdiction des appels d'octroi par `anon`/`authenticated`. Appel serveur et refus client vérifiés en changeant réellement de rôle SQL. Absence du schéma de test et absence d'activation confirmées après l'essai.
- Analyse syntaxique JavaScript réussie. L'exécution navigateur Playwright n'a pas pu démarrer, car le binaire Chromium n'est pas disponible dans cet environnement ; les contrôles UI ci-dessus restent des simulations.
- Le conseiller de sécurité signale les fonctions métier publiques `SECURITY DEFINER` déjà existantes. Elles conservent leurs gardes de rôles ; ce lot ne les réécrit pas et n'a pas ajouté de fonction publique privilégiée en production.

## Recette encore requise

Connexion et annulation OAuth réelles ; retour sur Gestion dans la prévisualisation ; association des deux comptes admins existants ; accès d'un modo de DeadelusTV ; refus d'un viewer et d'un modo d'une autre chaîne ; droits de saisie sans import/suppression pour Helper ; écriture réelle Admin/Helper sur données d'essai ; expiration/retrait du rôle ; déconnexion et reconnexion ; absence d'interférence avec le Compte et les éditeurs Phasmo du portail.

## Sources techniques

- https://supabase.com/docs/guides/auth/social-sign-in/auth-twitch
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://dev.twitch.tv/docs/api/reference/#get-moderated-channels
- https://dev.twitch.tv/docs/authentication/validate-tokens/
- Code et schéma Crew consultés le 30/10/2026 ; documentation Drive « Crewmong Us - Documentation et décisions » et audit Twitch Phasmo du dépôt.
