# DeadelusTV — Le repaire de la communauté

Première version statique de l’accueil, issue de l’ébauche HTML fournie par Yekelle. Identité anthracite et dorée, illustrations d’origine, emplacement Twitch, accès YouTube/Shorts/TikTok, quatre univers et invitation Discord.

## Ce qui fonctionne

- Navigation entre l’accueil et les présentations Jeux de rôle, Crewmong Us, TCG et Phasmophobia ; retour navigateur et liens directs par fragment.
- Accès directs aux sites existants Pavillon Noir et Crewmong Us.
- Menu mobile, raccourcis vers les univers, liens sociaux et navigation au clavier.
- Lecteur Twitch chargé au clic en HTTPS lorsque l’espace disponible est suffisant (400 × 300 px minimum). Le bouton vers Twitch reste accessible. L’intégration réelle devra être vérifiée sur le domaine final.
- Animation de trois cartes fictives dans la présentation TCG. Elle ne représente ni les règles ni les boosters du véritable TCG.

Les illustrations YouTube, Shorts et TikTok sont provisoires. Les liens ouvrent les chaînes ; aucune liste de publications ni aucun statut de live n’est récupéré automatiquement. Les services Supabase existants ne sont ni appelés ni modifiés.

## Organisation

```text
public/
  index.html                  Accueil et présentations des univers
  assets/
    config.js                 Liens publics et paramètres du lecteur Twitch
    app.js                    Navigation, menu, lecteur et démo
    styles.css                Identité visuelle et adaptations d’écran
    illustrations.png         Atlas d’illustrations extrait du fichier fourni
    favicon.svg
scripts/
  verify-static.py            Vérification des fichiers à publier
  deploy-ovh.sh               Transfert SSH et activation d’une version sur le VPS
.github/workflows/
  deploy-ovh.yml              Contrôle à chaque envoi sur main, puis OVH si configuré
```

Pas de dépendance à installer ni de compilation. Les fichiers à servir sont exclusivement ceux de `public/`. Les illustrations conservent leur résolution d’origine ; des visuels dédiés pourront remplacer l’atlas plus tard.

Pour un aperçu local, depuis la racine du dépôt :

```sh
python3 -m http.server 8000 --directory public
```

Puis ouvrir `http://localhost:8000`. Le fichier `public/index.html` fonctionne aussi en ouverture locale avec ses fichiers voisins ; le lecteur intégré demande un contexte compatible et propose sinon un accès à Twitch.

## GitHub → VPS OVH

Le workflow est préparé. Il vérifie la page à chaque envoi sur `main`. Tant que les cinq paramètres obligatoires sont absents, il signale l’attente de configuration et ne lance pas le transfert. Un contrôle réussi ne signifie donc pas que le site est déjà en ligne.

Cette procédure cible le **VPS OVH** évoqué pour DeadelusTV, accessible en SSH. Elle ne cible pas une offre d’hébergement mutualisé par FTP. Le serveur HTTP, le domaine et HTTPS restent à configurer sur le VPS.

Avant le premier déploiement :

1. Préparer un dossier dédié, par exemple `/var/www/deadelustv`, accessible en écriture à un compte de déploiement. Utiliser de préférence un compte distinct de l’administration du serveur.
2. Configurer le serveur HTTP pour servir `/var/www/deadelustv/current`. Le workflow créera ce lien lors de la première publication ; il ne remplace pas une configuration Nginx existante.
3. Ajouter les paramètres ci-dessous dans **Settings → Secrets and variables → Actions → Repository secrets**. Ne pas publier de clé privée dans le dépôt ou dans une conversation.
4. Lancer **Actions → Vérifier le site et déployer sur OVH → Run workflow**, ou envoyer une nouvelle modification sur `main`.

| Secret | Contenu |
| --- | --- |
| `OVH_HOST` | Adresse IPv4 ou nom DNS du VPS, sans `https://`. |
| `OVH_USER` | Compte SSH ayant accès au dossier dédié. |
| `OVH_SSH_KEY` | Clé privée de déploiement correspondant à une clé publique autorisée pour ce compte. |
| `OVH_KNOWN_HOSTS` | Entrée OpenSSH du serveur, obtenue et vérifiée depuis une source de confiance, par exemple la console du VPS. |
| `OVH_PATH` | Dossier dédié, par exemple `/var/www/deadelustv`, sans `/current` ni barre finale. |
| `OVH_PORT` | Facultatif : port SSH, `22` par défaut. |

`OVH_KNOWN_HOSTS` est une ligne au format `nom-du-vps ssh-ed25519 CLE_PUBLIQUE_DU_SERVEUR`. Pour un port différent de 22, le nom devient `[nom-du-vps]:port`. Cette clé est celle du serveur SSH, différente de la clé publique du compte de déploiement. La vérification de l’identité du serveur reste activée.

Chaque publication crée `releases/<SHA-du-commit>`, transfère uniquement les fichiers publics puis bascule le lien `current`. Les anciennes versions sont conservées pour permettre un retour arrière. Aucune commande ne modifie Supabase ni les autres sites. Une version déjà présente est refusée sans écrasement ; après un transfert interrompu, inspecter le dossier correspondant avant de le retirer manuellement ou publier un nouveau commit.

L’activation du lien ne vérifie pas à elle seule le domaine public : contrôler ensuite la page en HTTPS et la lecture Twitch sur l’adresse finale.

## À définir ensuite

- Adresse finale du portail et branchement réel au VPS.
- Visuels définitifs et sélection des vidéos.
- Contenu hors live, éventuelle actualisation des vidéos et statut Twitch.
- Évolution des présentations d’univers et futur lien vers le TCG.

Les choix de migration des autres sites et de leurs données restent séparés de cette première page.
