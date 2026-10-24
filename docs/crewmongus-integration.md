# Crewmong Us dans DeadelusTV

Lot préparé le 25 octobre 2026, à installer. Aucune publication par Jarvis.

## Installer

1. Dans GitHub Desktop, sélectionner DeadelusTV, puis Fetch origin et Pull si proposé, avant de copier les fichiers.
2. Garder une copie de public/index.html, public/assets/app.js et public/assets/config.js avant remplacement.
3. Extraire l'archive. Copier les dossiers public et docs à la racine du dépôt local, en fusionnant les dossiers. Accepter le remplacement des trois fichiers. Ne pas supprimer le public existant et ne pas créer public/public.
4. Commit puis Push origin. Le workflow OVH actuel publie déjà tout public ; il n'est pas modifié par ce lot.
5. Attendre le déploiement, recharger avec Ctrl + F5 puis ouvrir Crew depuis le menu, l'image, le titre ou le bouton de la tuile.

Le lot part du dépôt général au commit d91c2acc17ed1dcf337e17132c6c9a3e50342149. Si ces trois fichiers ont été modifiés après ce commit, comparer les changements avant remplacement pour conserver les modifications plus récentes.

## Organisation

Le module public/modules/crewmongus/ contient le fragment d'interface, crew-app.js, module.js, style.css, assets/ et vendor/. Il n'est chargé qu'à la première ouverture de Crew. Aucune iframe n'est utilisée pour cette rubrique. Les styles et les sélecteurs Crew sont limités au module. Le menu principal DeadelusTV et les autres rubriques restent disponibles.

Les sous-vues sont #crewmongus/stats, #crewmongus/sessions, #crewmongus/players, #crewmongus/entry et #crewmongus/admin. Les boutons Stats, Sessions, Joueurs, Saisie et Gestion mettent à jour cette navigation. La saisie conserve ses conditions d'accès ; Gestion présente la connexion aux visiteurs non connectés.

La base, les comptes et les rôles restent ceux du projet Supabase existant. Les calculs, requêtes et fonctions métier d'origine sont repris ; aucune table, politique RLS ou fonction SQL n'est modifiée. Les statistiques ne sont pas copiées dans le dépôt. La session du navigateur sur l'ancien domaine GitHub Pages n'est pas transférée automatiquement : se reconnecter avec le même compte peut être nécessaire.

L'interface conserve ses visuels sur ordinateur. Sur téléphone, les statistiques sont disposées dans des blocs à hauteur naturelle afin de rendre les textes lisibles sans les superposer aux cadres fixes des illustrations.

## Invitations et récupération de mot de passe

Le nouveau retour des e-mails est l'adresse du site général suivie de ?crew_auth=1. Pour le domaine actuel : https://www.deadelustv.com/?crew_auth=1

Dans le projet Supabase Crew : Authentication → URL Configuration → Redirect URLs, vérifier que cette adresse est autorisée et l'ajouter si nécessaire. Garder les anciennes adresses pendant la transition ; ne pas changer le Site URL global sans examiner les autres usages. Si le site est aussi utilisé sans www, prévoir également le retour exact correspondant à ce domaine.

Cette configuration n'a pas été modifiée ou vérifiée par Jarvis. La connexion e-mail/mot de passe réutilise les comptes existants ; la validation de l'envoi et du retour d'un véritable e-mail reste nécessaire. Les nouvelles invitations doivent viser l'adresse autorisée du nouveau site. Les anciens liens ont leur destination d'origine.

Le routeur reconnaît les paramètres d'Auth, laisse le SDK les traiter, puis revient dans #crewmongus/admin. Le mode récupération présente le choix du nouveau mot de passe même si le compte avait déjà terminé sa configuration initiale. Ce marqueur de configuration n'accorde aucun rôle.

## Source et dépendance

Source Crew : DeadelusTV/Crew-mong-Us, commit 33addb066a22f7f886502b24b650a50aeb9481ee. Médias copiés sans modification de leur contenu. Les données applicatives continuent d'être lues dans Supabase.

Bibliothèque cliente Supabase JS fixée à la version 2.118.0 et servie localement dans vendor/, avec sa licence. Documentation consultée : https://supabase.com/docs/guides/auth/sessions/implicit-flow ; https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail ; https://supabase.com/docs/guides/auth/redirect-urls

## Vérifications et limites

- Syntaxe des fichiers JavaScript ; absence d'identifiants HTML dupliqués ; présence des médias locaux.
- Appels from/rpc de l'application d'origine conservés à l'identique.
- Lecture REST publique réelle : 15 joueurs, 2 sessions, 12 games, 21 participations, 125 fiches au moment du contrôle.
- Navigateur : statistiques réelles, cumul global, sessions, liste des 15 joueurs, Gestion anonyme avec saisie et outils protégés masqués.
- Simulations locales : public, compte sans rôle, Helper, Admin, invitation et récupération.
- Retour Auth simulé sans jeton : arrivée dans Gestion puis navigation vers Pavillon Noir et retour à l'accueil.
- Contrôle mobile en cadre de 390 px, largeur utile observée 375 px sans débordement horizontal sur les vues contrôlées ; adaptation des statistiques vérifiée visuellement.

Aucun import, écriture métier, e-mail, changement de mot de passe ou connexion à un compte privilégié réel n'a été effectué pendant ces tests. Les tests de logique client ne certifient pas les politiques serveur. Après déploiement, vérifier les connexions Admin et Helper, puis les opérations de saisie/import dans un scénario contrôlé. Vérifier séparément les invitations et la récupération.

## Maintenance et retour arrière

Après adoption, modifier l'interface Crew dans public/modules/crewmongus/ du dépôt DeadelusTV. Il n'y a pas de synchronisation automatique avec l'ancien dépôt. Les modifications de statistiques continuent de passer par l'interface et Supabase.

L'ancien site reste accessible et n'est pas retiré par ce lot. Décider de sa fermeture ou de ses redirections après recette. Pour revenir en arrière, restaurer les trois fichiers sauvegardés ou annuler le commit de migration, puis publier ; la base n'a pas été migrée.
