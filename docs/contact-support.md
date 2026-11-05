# Contact et suivi des demandes — 5 novembre 2026

Le lien **Contact** apparaît dans le pied de page du DCG et du site général de test. La FAQ du DCG reste dans son pied de page et disparaît du profil et du menu du pseudo. Ce menu donne accès à **Mes demandes**.

## Envoyer une demande

Une connexion Twitch est obligatoire. Le formulaire demande **Je suis Viewer / Streamer**, puis **Le site / Le TCG**.

- Site : Phasmophobia, Crewmong Us, Pavillon noir.
- TCG : booster, catalogue, Laboratoire, échanges et/ou marché, bug, autre.
- Dans les deux rubriques : Suggestions et Contester une suspension / sanction.
- Pour un Streamer et un sujet TCG : **Demande pour débloquer mon DCG**.

Le choix Viewer / Streamer qualifie le message : il n’attribue aucun rôle, ne débloque pas de DCG et ne change pas le minimum de cartes Viewer. Le texte précise le streamer concerné. Une demande de retrait de carte peut être envoyée avec TCG → Autre ; le raccourci du profil préremplit ce sujet et le message. Aucune carte n’est supprimée par l’envoi.

## Conversation et suivi

Le demandeur retrouve ses conversations dans **Mes demandes**, avec leur statut, les réponses non lues, l’historique paginé et un champ pour répondre. Il peut fournir les précisions demandées par l’équipe. Une réponse à une demande résolue la remet en cours. Le panneau affiche les réponses non lues dès la connexion et les vérifie discrètement pendant une session active. La conversation ouverte propose une actualisation qui conserve le brouillon.

Les demandes sont liées au compte Twitch et communes aux deux sites : elles sont accessibles après connexion au même compte sur chaque origine. Les notes internes et les historiques administratifs ne sont jamais retournés au demandeur. Aucun courriel ni message Twitch/Discord n’est envoyé.

## Administration du site

Le panneau **Administration du site** du menu du compte comprend **Demandes** et **Permissions**. Les statuts sont **Nouvelles**, **En cours**, **Résolues** ; un filtre permet de retrouver les réponses de joueurs non lues. L’équipe peut répondre, demander des précisions, clôturer avec une réponse et prendre en charge une demande. Les notes de traitement sont distinctes des messages envoyés au joueur.

Les deux admins centraux déjà enregistrés au moment de la migration reçoivent une seule fois les accès fondateurs du site. Cette initialisation n’est pas une synchronisation des rôles TCG. Un administrateur du site peut attribuer ou désactiver **Traitement des demandes** ou **Administration du site** à un compte Twitch existant. Les accès fondateurs ne sont pas modifiables dans cette interface. Les droits TCG, News, carnet, Crew et Pavillon Noir restent inchangés.

## Technique et validation

- Source partagée : `public/contact-centre.js` et `public/contact-centre.css`, copiée dans `public/assets/` du dépôt du site.
- Migration : `20261105053257_site_contact_centre.sql` ; tables privées avec RLS, aucun accès direct aux données depuis le navigateur. Les fonctions publiques invoker délèguent aux fonctions privées gardées par l’identité Twitch et les rôles serveur.
- Envois et réponses utilisent une référence stable pour résister aux reprises après une réponse réseau incertaine. Le serveur limite les envois rapprochés. Les modifications de statut et de permissions vérifient une révision et sont journalisées.
- Tests PostgreSQL isolés : authentification, refus d’accès entre joueurs, catégories, idempotence, suivi et notifications, notes privées, pagination, révocation, demande Streamer sans déblocage et absence de droits automatiques.
- Tests DOM : formulaire sur les deux hôtes, reprise d’envoi, conversation, réponse, filtres non lus, permissions, changement de compte et conservation des champs pendant les rafraîchissements.

Destination du site général confirmée : **DeadelusTV/deadelusTV → developpement/tcg-attente**. Aucun déploiement du site officiel OVH n’est inclus. Le DCG de test continue sur Workers.
