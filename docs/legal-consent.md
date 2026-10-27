# Préparation légale, consentement Twitch et mise en ligne

**Branche de développement :** `developpement/legal-et-consentement` (pas de modification de `main`).

## Textes légaux
Les routes sont des pages du portail : `/#mentions-legales` et `/#confidentialite`. Les liens sont dans le footer **commun** aux univers existants. Remplacer uniquement le contenu des deux blocs `<article class="legal-document" data-legal-pending="true">` dans `public/index.html` avec les textes validés par Deadelus, et **supprimer** l'attribut `data-legal-pending` sur chacun. Les commentaires début/fin encadrent les zones à remplacer. Les données personnelles et mentions obligatoires ne doivent pas être inventées.

La vérification `python3 scripts/verify-static.py` refuse les textes d'attente ; le workflow de déploiement appelle désormais ce contrôle. Ne publier **ni** l'intégration **ni** des mentions provisoires avant finalisation.

## Points à inclure ou à vérifier avec Deadelus avant publication
Cette liste est une aide à la rédaction et **ne remplace pas** les textes juridiques qu'il doit valider.

**Mentions légales :** identification de l'éditeur professionnel et du directeur de publication, coordonnées/immatriculation applicables, OVH comme hébergeur effectif. **Propriété intellectuelle :** préciser les droits sur les éléments réellement créés pour DEADELUSTV (identité graphique, illustrations, textes, code, cartes originales), la présence de contenus appartenant à des tiers (noms et logos de jeux, illustrations officielles, images Twitch/YouTube, captures, clips), leurs conditions de réutilisation et les autorisations pertinentes. Une simple mention « tous droits réservés » ne suffit pas à donner des droits sur les œuvres de tiers. Distinguer aussi les créations de contributeurs et les autorisations éventuellement accordées au site. Ne jamais supposer une cession de droits sans preuve.

**Politique de confidentialité :** préciser les traitements actuels réellement présents : journaux techniques OVH, lecteur Twitch conditionné au consentement, images/miniatures YouTube externes, polices désormais hébergées localement sur la branche en développement (les appels Google Fonts de l'ancienne version sont supprimés ; vérifier avant publication) et fonctions propres au module Crewmong Us/Supabase (comptes existants, selon le périmètre réel). Distinguer du futur TCG et de ses connexions, non encore ouverts sur ce portail. Examiner la durée de conservation, les destinataires, les droits des personnes et le moyen de contact.

**À contrôler également :** droits à l'image/voix des personnes apparaissant dans des clips ou illustrations, marques et licences des jeux, demandes de retrait de contenus, licences des bibliothèques logicielles et éventuelles conditions liées aux futurs contenus envoyés par les streamers. Aucune mention ne remplace la vérification des licences ou autorisations.

Voir aussi la [documentation des polices hébergées localement](font-localisation.md) (licences Bungee Inline/Great Vibes et mise en attente d'Academy) et l'[audit des ressources externes](audit-ressources-externes.md) pour les constats observés dans le dépôt et les tests réseau encore à effectuer.

## Consentement global aux services externes (27 octobre 2026, branche uniquement)
Le module `public/assets/consent.js` a été remplacé par un choix commun, valable dans **toutes les rubriques de cette même origine DeadelusTV**. La clé `deadelustv_external_consent_v1` mémorise pendant **180 jours maximum** un objet versionné avec les choix individuels `twitch`, `youtube` et `tiktok`. Le premier affichage permet **Tout refuser / Personnaliser / Tout accepter** ; personnaliser présente les finalités, les liens vers la confidentialité des services, et enregistre les deux cases actives. Un bouton dans le pied de page réouvre les préférences et permet leur retrait. Les deux options « Tout accepter » et « Tout refuser » ont le même niveau d'accès.

**Twitch** : le lecteur existant utilise `hasTwitchConsent()` pour rester inactif sans accord. Modifier YouTube ne coupe plus le live Twitch. **YouTube** : la nouvelle API `window.DEADELUSTV_CONSENT.hasConsent('youtube')` permet à n'importe quel univers de vérifier le choix. Pour les futures actualités Phasmo ou DBD, les développeurs doivent passer par `window.DEADELUSTV_EMBEDS.mountYouTube(conteneur, videoId, titre)` : si le choix est refusé, seul un message et un bouton de gestion des préférences apparaissent ; sinon une iframe sur `www.youtube-nocookie.com` est créée. Si l'utilisateur retire son accord, les iframes montées via cette API sont retirées. Les modules qui injectent leurs propres iframes directement **NE SONT PAS protégés par cette API** : ils doivent être adaptés lors de l'intégration de Phasmo V2.

**TikTok** : le site actuel présente uniquement des **liens sortants** vers TikTok, pas de vidéo intégrée. La ligne « TikTok (non utilisé actuellement) » est visible dans les détails, mais son choix est désactivé et sa valeur reste obligatoirement `false`, même sous « Tout accepter ». Le jour où un vrai lecteur TikTok serait ajouté, réactiver la catégorie, augmenter la version du consentement et faire valider la nouvelle finalité : **aucune acceptation anticipée n'est réputée acquise**.

**Ancien Twitch** : la clé `deadelustv_twitch_consent_v1` est lue uniquement pour **préremplir l'ancienne préférence Twitch** dans le formulaire détaillé, si elle est encore valable ; elle ne vaut PAS automatiquement consentement commun, encore moins YouTube. Après enregistrement du choix global, elle est supprimée du stockage lorsque le navigateur l'autorise.

**Limites techniques et légales :**
- Le code n'active aucun SDK ni iframe tiers à lui seul. Les liens sortants ne nécessitent pas d'accord préalable du visiteur sur DeadelusTV.
- Les **miniatures** actuelles des Shorts Phasmo et de la dernière vidéo YouTube restent appelées depuis `i.ytimg.com` même avant consentement : il s'agit de requêtes d'images déjà auditées, distinctes du chargement des lecteurs. Ne pas présenter le refus YouTube comme un blocage intégral de tous les appels à Google.
- Le stockage local est compartimenté par **origine**. Cette implementation partage les choix entre les pages du même domaine, pas entre différents domaines ou sous-domaines.
- Le retrait arrête les **chargements futurs** via nos composants et démonte les iframes concernées. Il n'efface pas nécessairement les cookies et données que des prestataires ont déjà inscrits dans leur propre domaine.
- Les textes finaux de Deadelus doivent décrire les prestataires, finalités, durées et possibilité de retrait. TikTok n'est pas déclaré comme lecteur actif avant intégration.

**Tests automatiques (branche `developpement/legal-et-consentement`)** : `node --test scripts/test_frontend_consent.cjs scripts/test_twitch_floating.cjs` vérifie 16 cas : 1ère visite, refus/acceptation, expiration, personnalisation, Twitch, TikTok inactif, migration de l'ancienne préférence, blocage et révocation YouTube, persistance locale et mini-lecteur flottant. GitHub Actions run **40436652396** : **SUCCESS** le 27/10/2026. Ces tests ne constituent PAS un test manuel complet en Chrome ni une validation juridique ni un déploiement sur main.

## Statut live sans chargement du lecteur
Le navigateur appelle uniquement `GET /api/twitch-status` sur **son propre domaine**. Réponse attendue : HTTP 200, JSON `{"live":true}` ou `{"live":false}`. Si l'appel échoue, le statut est **inconnu**, pas hors ligne ; l'utilisateur conserve le lien direct vers Twitch. Tant que la réponse n'est pas `true` **et** que le consentement n'est pas accordé, aucun SDK ni iframe Twitch n'est chargé. La vérification est répétée environ toutes les 60 secondes hors live.

`scripts/twitch_status_service.py` est le service Python standard library préparé dans le dépôt. **Premier retour positif en production de l'API le 26/10/2026 : l'utilisatrice rapporte `{"live":false}` sur l'URL publique OVH**. Reste à confirmer le redémarrage automatique du service et le test pendant un vrai live. Il n'est pas copié dans `public/`. Il requiert des secrets **uniquement côté serveur** : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` d'une application Twitch créée par le propriétaire. Il utilise l'OAuth `client_credentials` puis Helix `GET /streams?user_login=deadelustv`, avec cache serveur 45 secondes. Il écoute seulement sur `127.0.0.1:8765`.

La configuration Caddy existante étant hors du dépôt, ne rien y modifier automatiquement. Exigences de raccordement par l'administrateur :
- faire démarrer le service Python en tant qu'utilisateur peu privilégié, avec les secrets fournis par un fichier d'environnement protégé ;
- **raccorder uniquement** `/api/twitch-status` à `127.0.0.1:8765`, avant la règle de fichiers statiques ; conserver toutes les autres règles de Caddy ;
- vérifier TLS, réponses en direct/hors direct, rate limit ou cache si nécessaire, redémarrage et logs ;
- jamais de secret Twitch dans `public/`, dans un JSON accessible ou dans JavaScript ;
- adapter si le serveur utilise déjà une API ou une technologie plus appropriée.

## Tests avant toute fusion
1. `python3 -m unittest discover -s scripts -p 'test_twitch_status.py'`
2. `python3 scripts/verify-static.py` **doit échouer tant que les textes provisoires restent** ; ensuite réussir.
3. Lancer les tests sans réseau du navigateur simulé : `node --test scripts/test_frontend_consent.cjs` ; puis valider syntaxe JS : `node --check public/assets/consent.js` et `node --check public/assets/twitch-player.js`.
4. Navigateur vierge, hors live : aucune requête à `player.twitch.tv` ou `k.twitchcdn.net` ; même chose après refus.
5. En live et refus : bouton « Regarder sur Twitch » sans iframe ; en live et accord : lecteur chargé, tentative de lecture muette.
6. Révocation pendant le live : iframe supprimée immédiatement, aucun nouveau chargement.
7. Consentement supprimé/expiré : demande renouvelée. Tester mobile, clavier et toutes les rubriques.
8. Statut OVH indisponible : message sans fausse annonce « Hors ligne », lien Twitch conservé.
9. Vérifier que les modules Phasmo, Crewmong Us, Pavillon Noir, TCG et la démo ne subissent aucune régression.

## À ne pas faire
Ne pas fusionner cette branche sur `main` tant que les textes officiels, le service OVH, les tests réels et la validation humaine ne sont pas terminés.

## Prévisualisation locale connectée à OVH (26 octobre 2026)

Pour tester le nouveau lecteur **sans déployer `main` ni toucher à Caddy**, utiliser `scripts/tester-twitch-local.bat` sous Windows (Python 3 requis) ou `py -3 scripts/preview-twitch-ovh.py`. Ouvrir `http://127.0.0.1:8766/` : le serveur local sert le dossier `public/` et relaie uniquement `GET /api/twitch-status` vers la vraie API publique OVH. Voir `docs/test-lecteur-twitch-local.md` pour le protocole. Ne pas utiliser le port 5500 de Live Server pour ce test : son API locale est absente.

Le néon Graduate validé a été intégré sur cette même branche, et devra être testé sur le vrai fond. Les mentions légales et la politique de confidentialité contiennent encore `data-legal-pending="true"` : **elles restent un blocage explicite au déploiement, même si le live fonctionne parfaitement**. Ne pas désactiver le contrôle de publication.
