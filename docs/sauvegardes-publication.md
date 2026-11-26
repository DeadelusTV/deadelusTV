# Sauvegardes du site avant et après publication

## État au 7 novembre 2026

**Développé sur `securite/pre-tcg-20261107`, PR #15 non fusionnée. Le nouveau déploiement n'est donc pas encore actif sur main.**

La cadence quotidienne du miroir Git, configurée séparément dans `DeadelusTV/DeadelusTV-backups` à 03:17 UTC, est conservée. Ce lot ajoute deux copies indépendantes encadrant chaque publication OVH du portail. Il ne modifie ni les bases Supabase, ni leurs sauvegardes, ni la configuration Caddy/Twitch du VPS.

## Fonctionnement préparé

1. Préparer localement les fichiers publics, en conservant les exclusions et le fonctionnement YouTube/Phasmo existants.
2. **AVANT** : lire le lien `current` sur OVH et archiver les fichiers publics de cette version réelle. Ne pas confondre ce dossier avec le nouveau `main` qui vient d'être fusionné.
3. Ajouter un miroir Git complet du dépôt du portail, puis déposer archive du site, bundle Git et sommes SHA-256 dans une Release du dépôt privé `DeadelusTV-backups`.
4. Télécharger les pièces jointes, vérifier tous les fichiers contre le manifeste, restaurer le bundle dans un dépôt temporaire, contrôler `git fsck`, les branches et les tags. La Release reste un brouillon tant que ces vérifications n'ont pas réussi.
5. Après validation et publication de la Release privée, produire un reçu lié au commit et au numéro d'opération. Tout échec de cette étape empêche le transfert et l'activation de la nouvelle version.
6. Transférer puis activer la nouvelle version, uniquement si `current` pointe encore sur la version sauvegardée. Conserver `previous` comme dans le dispositif existant.
7. **APRÈS** : capturer la nouvelle version depuis OVH. Vérifier son identifiant et son marqueur `data/deployment-version.json` (commit + opération), puis déposer et contrôler une seconde Release privée selon la même procédure.

Le marqueur public ne contient aucun secret. Chaque paire utilise le même identifiant d'opération, avec les suffixes `avant` et `apres`. Les archives `controle` sont des essais de lecture/sauvegarde sans publication, pas une preuve de mise en ligne.

## Gestion des échecs

- Secret absent, expiré, droits insuffisants ou dépôt non privé : arrêt ; aucune activation.
- Fichiers spéciaux, liens symboliques, chemins sensibles inattendus, index absent, copie altérée ou fichiers modifiés pendant la capture : arrêt ; aucune sauvegarde présentée comme validée.
- Échec d'upload, de téléchargement, de SHA-256 ou de restauration Git : pas de reçu préalable, donc pas de publication.
- Version active changée depuis la sauvegarde : activation refusée pour ne pas remplacer une version non sauvegardée par cette opération.
- Erreur après une tentative d'activation : le workflow tente la sauvegarde APRES si la nouvelle version est effectivement active. Le script refuse d'étiqueter l'ancienne version comme nouvelle. Vérifier `current` avant une relance en cas de résultat incertain.
- Échec de la sauvegarde APRÈS alors que la publication a réussi : workflow en erreur, message explicite, sauvegarde AVANT conservée. Aucun retour arrière automatique ni effacement d'archive.
- Une panne totale du runner, une annulation forcée ou une panne réseau durable peut empêcher la sauvegarde APRÈS ; cela ne rend pas la publication antérieure inexistante. Une intervention reste nécessaire.

## Tests réellement réalisés

- 18 tests Python sans réseau : capture de l'ancienne version, reconstruction locale des fichiers publics, contrôle du marqueur après publication simulée, refus des chemins/symlinks/secrets, détection d'une copie altérée, absence de reçu si SSH échoue et restauration réelle d'un bundle Git de test avec branches/tags.
- Syntaxe YAML et Bash et ordre AVANT → activation → APRÈS contrôlés localement. Les tests Python sont intégrés au contrôle obligatoire `Controle portail avant fusion`.
- [Test du jeton après correction du nettoyage](https://github.com/DeadelusTV/deadelusTV/actions/runs/42347139117) : SUCCESS. Une petite Release privée fictive a été créée, téléchargée, vérifiée puis supprimée. Le premier essai avait échoué uniquement en tentant de supprimer un tag inexistant associé au brouillon ; aucun backup historique concerné.
- [Essai réel OVH sans publication](https://github.com/DeadelusTV/deadelusTV/actions/runs/42347881791) : SUCCESS. Lecture SSH de la version active `41950570613-1`, archive indépendante, téléchargement et vérification des fichiers, restauration et contrôle du miroir Git. Aucun transfert de nouvelle version, aucune modification de `current` ou de la base.
- [Archive de contrôle conservée](https://github.com/DeadelusTV/DeadelusTV-backups/releases/tag/backup-deadelustv-git-publication-42347881791-1-controle) : archive des fichiers publics de 62 988 896 octets, bundle Git de 71 346 391 octets, sommes SHA-256. Le commit de l'opération de contrôle identifie la branche de test, pas une nouvelle version mise en ligne.

**Non validé à ce stade :** un cycle réel AVANT → activation → APRÈS sur main et une restauration fonctionnelle complète d'OVH depuis l'archive. La réussite d'une copie en lecture seule ne remplace pas ce premier déploiement contrôlé.

## Secrets et sécurité

- `BACKUPS_REPOSITORY_TOKEN` est utilisé uniquement côté Actions pour le dépôt privé de sauvegardes. Sa valeur n'est ni commitée ni demandée dans une conversation.
- Les identifiants SSH existants restent utilisés avec contrôle strict de la clé du serveur. Le script de capture est envoyé par entrée standard, n'installe aucun fichier et n'écrit rien sur le site OVH.
- Les workflows de contrôle avec secrets sont limités à main et à la branche de sécurité connue, jamais aux événements provenant de PR de forks. Le contrôle de fusion ordinaire ne reçoit pas ces secrets.
- Le jeton a une durée de vie limitée : renouvellement à prévoir. Une révocation ou expiration fera échouer la sauvegarde préalable et bloquera la publication, conformément au choix de sécurité.

## Conservation

Les nouvelles Releases utilisent le préfixe `backup-deadelustv-git-publication-`, inclus dans le filtre existant `backup-deadelustv-git-`. Les durées de code déjà validées restent inchangées : toutes les générations pendant 90 jours, puis une génération mensuelle sur 12 mois, minimum 6, première archive historique préservée. La suppression reste en simulation au dernier état vérifié. Au-delà de 90 jours, cette politique n'assure pas la conservation des deux côtés de chaque paire ; elle conserve les générations mensuelles sélectionnées.

## Périmètre et limites

La copie OVH concerne uniquement les fichiers du portail sous `accueil/current`. Elle n'inclut ni Supabase, ni Auth/Storage distants, ni secrets, ni services Python, ni configuration Caddy ou système. Le bundle Git contient les objets Git et références accessibles, mais pas les contenus historiques Git LFS hors Git ; les fichiers effectivement déployés sont présents dans l'archive du site.

Les mises à jour autonomes des JSON YouTube/Shorts ne sont pas des publications complètes : elles restent séparées. Une modification détectée pendant la capture provoque un échec prudent. Il ne s'agit pas d'un instantané transactionnel de l'ensemble OVH + Supabase. Les restaurations de base et les accès administrateurs restent des chantiers distincts.

## Activation à réaliser

Vérifier le dernier contrôle de la PR #15, puis autoriser explicitement sa fusion. Celle-ci déclenchera le premier cycle réel du nouveau workflow OVH. Contrôler les deux Releases, leurs reçus, la présence du marqueur de la version active et le rendu public. Ne pas contourner les protections de main ou retirer un test bloquant pour forcer ce premier déploiement.
