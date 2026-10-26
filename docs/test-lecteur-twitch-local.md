# Prévisualisation du lecteur Twitch avec la vraie API OVH

**Branche :** `developpement/legal-et-consentement`. Aucun déploiement OVH n'est effectué.

## Démarrer sous Windows

1. Dans GitHub Desktop, choisir la branche `developpement/legal-et-consentement`, puis **Fetch origin / Pull origin**.
2. Dans le dossier `scripts`, double-cliquer `tester-twitch-local.bat`. Il faut Python 3 sur le PC ; le script indique s'il manque. Alternative dans un terminal : `py -3 scripts/preview-twitch-ovh.py`.
3. Ouvrir **http://127.0.0.1:8766/**, pas le port 5500 de Live Server.
4. Vérifier **http://127.0.0.1:8766/api/twitch-status** : le proxy transmet la requête à **https://www.deadelustv.com/api/twitch-status** sans changer Caddy, les secrets ou le service OVH.
5. Fermer le terminal avec Ctrl+C pour arrêter.

Le proxy écoute sur 127.0.0.1 uniquement et sert le dossier public/. Le site et l'API deviennent de même origine. Le stockage local et les choix de cookies du port 8766 sont séparés de ceux du port 5500.

## Cas à tester

- **API false, hors direct :** afficher mur de briques + « HORS LIGNE » en Graduate, sans iframe Twitch.
- **API true, refus :** pas de lecteur intégré ; lien « Regarder sur Twitch ».
- **API true, acceptation :** SDK et lecteur Twitch autorisés ; lecture muette possible selon les restrictions du navigateur et de Twitch.
- **Retrait de l'accord en direct :** iframe retirée.
- **API 502/503 ou réponse erronée :** ne pas annoncer « HORS LIGNE », afficher l'indisponibilité.
- Dans DevTools > Réseau, confirmer l'absence de chargement Twitch hors direct/refus ; vérifier aussi mobile et navigation clavier.

Un lecteur Twitch embarqué peut être limité sur une URL locale HTTP : si c'est le cas, effectuer la validation finale sur le domaine HTTPS réel.

## Bloqueur pour le déploiement

Les pages légales ont encore `data-legal-pending="true"` ; le contrôle de publication `python3 scripts/verify-static.py` refuse volontairement un déploiement sans les textes de Deadelus. **Ne pas supprimer ce contrôle pour publier plus vite.**
