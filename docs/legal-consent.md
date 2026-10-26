# Préparation légale, consentement Twitch et mise en ligne

**Branche de développement :** `developpement/legal-et-consentement` (pas de modification de `main`).

## Textes légaux
Les routes sont des pages du portail : `/#mentions-legales` et `/#confidentialite`. Les liens sont dans le footer **commun** aux univers existants. Remplacer uniquement le contenu des deux blocs `<article class="legal-document" data-legal-pending="true">` dans `public/index.html` avec les textes validés par Deadelus, et **supprimer** l'attribut `data-legal-pending` sur chacun. Les commentaires début/fin encadrent les zones à remplacer. Les données personnelles et mentions obligatoires ne doivent pas être inventées.

La vérification `python3 scripts/verify-static.py` refuse les textes d'attente ; le workflow de déploiement appelle désormais ce contrôle. Ne publier **ni** l'intégration **ni** des mentions provisoires avant finalisation.

## Consentement
`public/assets/consent.js` conserve pendant au plus 180 jours `accept` ou `refuse` dans le stockage local du portail (un choix nécessaire pour mémoriser le refus ou le consentement). Des boutons de même niveau permettent d'accepter et de refuser. Le footer propose « Gestion des cookies » à tout moment. Le retrait empêche les chargements futurs et détruit l'iframe Twitch en cours. Les cookies appartenant à Twitch ne peuvent pas nécessairement être supprimés depuis deadelustv.com. Le refus affiche « Regarder sur Twitch » ouvrant un autre site, sans seconde autorisation.

**Ne pas interpréter ce mécanisme comme un audit RGPD complet :** examiner aussi les autres ressources externes et la finalité des traitements ; vérifier la notice définitive avec Deadelus.

## Statut live sans chargement du lecteur
Le navigateur appelle uniquement `GET /api/twitch-status` sur **son propre domaine**. Réponse attendue : HTTP 200, JSON `{"live":true}` ou `{"live":false}`. Si l'appel échoue, le statut est **inconnu**, pas hors ligne ; l'utilisateur conserve le lien direct vers Twitch. Tant que la réponse n'est pas `true` **et** que le consentement n'est pas accordé, aucun SDK ni iframe Twitch n'est chargé. La vérification est répétée environ toutes les 60 secondes hors live.

`scripts/twitch_status_service.py` est un service Python standard library **préparé mais non déployé** à connecter derrière Caddy sur OVH. Il n'est pas copié dans `public/`. Il requiert des secrets **uniquement côté serveur** : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` d'une application Twitch créée par le propriétaire. Il utilise l'OAuth `client_credentials` puis Helix `GET /streams?user_login=deadelustv`, avec cache serveur 45 secondes. Il écoute seulement sur `127.0.0.1:8765`.

La configuration Caddy existante étant hors du dépôt, ne rien y modifier automatiquement. Exigences de raccordement par l'administrateur :
- faire démarrer le service Python en tant qu'utilisateur peu privilégié, avec les secrets fournis par un fichier d'environnement protégé ;
- **raccorder uniquement** `/api/twitch-status` à `127.0.0.1:8765`, avant la règle de fichiers statiques ; conserver toutes les autres règles de Caddy ;
- vérifier TLS, réponses en direct/hors direct, rate limit ou cache si nécessaire, redémarrage et logs ;
- jamais de secret Twitch dans `public/`, dans un JSON accessible ou dans JavaScript ;
- adapter si le serveur utilise déjà une API ou une technologie plus appropriée.

## Tests avant toute fusion
1. `python3 -m unittest discover -s scripts -p 'test_twitch_status.py'`
2. `python3 scripts/verify-static.py` **doit échouer tant que les textes provisoires restent** ; ensuite réussir.
3. Valider syntaxe JS : `node --check public/assets/consent.js` et `node --check public/assets/twitch-player.js`.
4. Navigateur vierge, hors live : aucune requête à `player.twitch.tv` ou `k.twitchcdn.net` ; même chose après refus.
5. En live et refus : bouton « Regarder sur Twitch » sans iframe ; en live et accord : lecteur chargé, tentative de lecture muette.
6. Révocation pendant le live : iframe supprimée immédiatement, aucun nouveau chargement.
7. Consentement supprimé/expiré : demande renouvelée. Tester mobile, clavier et toutes les rubriques.
8. Statut OVH indisponible : message sans fausse annonce « Hors ligne », lien Twitch conservé.
9. Vérifier que les modules Phasmo, Crewmong Us, Pavillon Noir, TCG et la démo ne subissent aucune régression.

## À ne pas faire
Ne pas fusionner cette branche sur `main` tant que les textes officiels, le service OVH, les tests réels et la validation humaine ne sont pas terminés.
