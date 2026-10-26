# Prévisualisation du lecteur Twitch avec la vraie API OVH

**Branche :** `developpement/legal-et-consentement`, pas de déploiement OVH.

## Démarrer sur Windows, sans installation

1. GitHub Desktop : branche `developpement/legal-et-consentement` puis **Fetch origin / Pull origin**.
2. Dans le dossier `scripts`, double-cliquer sur `tester-twitch-local.bat`. Ce lanceur utilise **Windows PowerShell intégré à Windows**, sans installer Python.
3. **Garder la fenêtre PowerShell ouverte**, puis visiter **http://127.0.0.1:8766/** (pas 5500 de Live Server).
4. Tester aussi **http://127.0.0.1:8766/api/twitch-status**. La demande est transmise à la vraie URL publique `https://www.deadelustv.com/api/twitch-status` ; l'API et les fichiers apparaissent sur une origine locale commune. Aucune modification Caddy ni OVH.
5. Arrêter avec Ctrl+C ou en fermant la fenêtre du lanceur.

Si le lancement PowerShell échoue, copier le message d'erreur sans informations sensibles. Alternative technique facultative pour un développeur ayant Python 3 : `python scripts/preview-twitch-ovh.py`.

Le port 8766 écoute sur l'interface locale 127.0.0.1. Les cookies et localStorage y sont différents du port 5500 et du domaine public.

## Tests à effectuer

- **API false, hors direct :** image de briques et « HORS LIGNE » en Graduate, aucun SDK/iframe Twitch chargé.
- **API true, refus :** aucun lecteur intégré et lien « Regarder sur Twitch ».
- **API true, acceptation :** SDK et lecteur Twitch chargés, tentative de lecture muette.
- **Retrait du consentement pendant le live :** l'iframe est retirée.
- **API 502/503 ou réponse JSON invalide :** statut inconnu, sans fausse annonce « HORS LIGNE ».
- Vérifier dans F12 > Réseau l'absence de requêtes vers Twitch avant consentement ; tester aussi Chrome/Edge, mobile et clavier.

Une lecture Twitch intégrée peut être bloquée sur une origine HTTP locale ; dans ce cas, la lecture elle-même devra être revalidée sur le domaine HTTPS réel.

## Publication sur main : attention

Les pages légales contiennent encore `data-legal-pending="true"` ; le déploiement `scripts/verify-static.py` est volontairement bloqué tant que Deadelus n'a pas fourni et validé les textes. **Ne pas désactiver cette vérification.**
