# Livraison du 31 octobre 2026 — Phasmo V2 vers le site officiel

Périmètre autorisé par Yekelle : journal complet, carte TikTok, connexion Twitch déplacée, pages légales sans note de relecture, illustration Crew ; connexion Crew ajoutée explicitement pendant la préparation.

## Contenu livré

- Journal : éditeur V7, lecteur officiel, bibliothèque, listes personnalisées, espacement des noms, zoom des images et contrôles de publication.
- Accueil : carte TikTok animée et nouvelle illustration Crew. Les correctifs Twitch, bandeaux Discord et la VOD Pavillon Noir de `main` sont conservés.
- Menu Compte Twitch commun : accès News, carnet et gestion Crew selon les droits existants. Les tables et canaux News de production sont conservés.
- Mentions légales, confidentialité/cookies et CGU intégrées ; notes et marqueurs de relecture retirés. Liens visibles, ancienne adresse cookies redirigée vers la page commune. CGV toujours masquées.
- Crew : connexion commune, transition des comptes historiques, Admin/Helper et contrôles d'identité existants. Aucun rôle ni jeu réécrit par le transfert.

## Démarrage vierge du livre

À la demande de Yekelle, le brouillon actif est réinitialisé en **révision 14** : zéro fiche, dossier, image importée et police importée ; structure de 48 calques conservée. Les 14 révisions de l'historique et la bibliothèque privée restent disponibles. Les anciennes publications de recette actives et le candidat privé sont retirés. Aucune publication officielle n'existe et le verrou reste fermé.

Le nouveau carnet local part également d'une base vide et d'une nouvelle clé de sauvegarde ; aucun ancien test navigateur n'est repris automatiquement. Le bouton Publier sait démarrer sans candidat préexistant une fois l'activation autorisée ; la préparation reste privée puis passe par le serveur. La séquence des versions de recette reprend après l'historique conservé, vérifiée dans une transaction annulée.

Le message de dépublication « problème technique, le journal revient bientôt » reste une demande pour plus tard : aucun texte d'attente du lecteur n'est modifié dans cette livraison.

## Raccordement serveur

`phasmo-journal-release` v7 autorise exactement les origines DEV, www.deadelustv.com et deadelustv.com, en conservant JWT, contrôle admin, verrou, confirmations, intégrité médias et réservations.

`crew-twitch-access` v5 ajoute ces domaines aux origines par défaut. Les sessions restent vérifiées côté serveur, les rôles et les durées des autorisations ne changent pas. Aucun secret n'est ajouté au dépôt ni au navigateur.

## Vérification

Tests : listes et persistance (35 contrôles + base vide), zoom (25), serveur Crew (26), interface Crew (10), origines et auth du carnet (13), première publication sans candidat (3), consentement (10), lecteur Twitch flottant (9). Syntaxe et références locales contrôlées. La reprise de la numérotation de recette est testée en SQL avec rollback.

Déploiement OVH et recette du site à consigner après le push. Les actions Admin/Helper réelles qui écrivent des parties ou associent un ancien compte ne sont pas simulées sur des données de production.
