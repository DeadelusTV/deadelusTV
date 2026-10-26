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

## Prototype du lecteur flottant (uniquement sur cette branche)

Un essai du mini-lecteur est intégré dans `public/assets/twitch-floating.js` et `twitch-floating.css`. Avant de construire une iframe, le conteneur Twitch est déplacé une seule fois dans une couche persistante au niveau de `body`. Le lecteur n'est ensuite déplacé que visuellement (position CSS fixe), sans remplacer l'iframe lors du défilement ou du changement d'onglet interne.

**Pour tester :** lancer `scripts/tester-twitch-local.bat` comme lors du test précédent, ouvrir `http://127.0.0.1:8766/`, puis accepter les cookies Twitch. Pendant un direct réel, démarrer la lecture et défiler vers le bas : dès que la vidéo n'est plus entièrement visible, un lecteur de 540px de large passe dans le coin inférieur gauche, avec une barre supérieure et une croix. Remonter sur l'accueil pour vérifier son retour à son emplacement initial. Cliquer sur les onglets Phasmophobia, TCG et Pavillon Noir du **portail principal** : la même iframe doit rester en place dans la fenêtre flottante, sans coupure, car elle n'est pas recréée. Fermer avec la croix doit arrêter la diffusion et afficher « Rouvrir le lecteur Twitch » ; ce bouton relance uniquement après une action explicite. Retirer le consentement doit arrêter immédiatement le lecteur, quel que soit l'onglet. Hors ligne ou sans consentement, aucun lecteur flottant ne doit apparaître.

Twitch exige une vidéo d'au moins 400 × 300 pixels et une visibilité non occultée. La fenêtre flottante utilise environ 540 × 304 pixels pour la vidéo et n'apparaît que lorsque le viewport atteint au moins 780 × 450 pixels. Pour une fenêtre plus petite ou un mobile, seul le lecteur de l'accueil est conservé. Twitch peut toujours imposer ses restrictions sur l'autoplay ; valider son comportement pendant un vrai live sur Edge et Chrome.

**Statut : PROTOTYPE sur `developpement/legal-et-consentement`.** Le code n'est pas déployé sur `main`. Les essais réels de continuité, autoplay, croix et responsive restent à effectuer.
