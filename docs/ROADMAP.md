# DEADELUSTV — roadmap du site général

Mise à jour : 25 octobre 2026. Les états ci-dessous sont ceux du site principal `DeadelusTV/deadelusTV`. Ils ne remplacent pas les suivis propres au TCG, à Crewmong Us, à Pavillon Noir ou à Bingophobia.

| Sujet | État | Portée et limites |
| --- | --- | --- |
| Site principal sur OVH | Publié | Déployé depuis `main` ; conserver l'accueil et les corrections existantes. |
| Accueil : Twitch, YouTube, TikTok et navigation | Publié | Le lecteur Twitch et son écran hors ligne néon restent sur le code officiel actuel ; TikTok est un lien illustratif. |
| Dernière vidéo YouTube | Automatisé | Workflow indépendant toutes les 15 minutes prévues ; seules les métadonnées JSON sont transférées. |
| Phasmophobia V2 : présentation, galerie Shorts, visuel de carnet | Publié | Version validée par Deadelus, intégration ciblée du 25/10/2026. |
| TCG : page « À venir » | Publié | Univers TCG annoncé sans dévoiler les mécaniques ; site de jeu TCG distinct et encore en développement. |
| Actualisation automatique des Shorts Phasmo | Publiée, première exécution réussie | YouTube Data API v3, secret `YOUTUBE_API_KEY`, quatre vérifications quotidiennes prévues ; premier transfert OVH réussi (run `40218578291`). Suivi des prochains déclenchements à poursuivre. |
| Livre interactif Phasmo avancé | En développement, non validé | Prototype `developpement/phasmo-v2` : rendu, animation et données réelles des fiches restent à travailler. Aucun import du prototype dans `main`. |
| Crewmong Us et Pavillon Noir | Intégrations existantes | Préserver leurs pages, données et décisions ; revue des chantiers séparément. |
| Démo temporaire Cloudflare | Présentation validée, conservée | `preview/presentation-deadelus` ; elle peut être supprimée ultérieurement sans toucher à `main`. |
| Pages légales et consentement Twitch | Développé sur branche, non validé / non publié | `developpement/legal-et-consentement` : pages légales provisoires, footer, choix cookies révocable ; en attente textes officiels, raccordement OVH et tests fonctionnels. |
| Webhook Discord des futures news Phasmo | Idée à étudier | Non développé, pas de publication automatique actuellement. |

## Règles de livraison

1. Toujours partir du `main` réel avant d'intégrer une rubrique. Ne pas remplacer ses corrections par les anciens fichiers d'une démo.
2. Transférer uniquement les sections, styles, scripts et médias validés ; éviter les fusions globales des branches de travail.
3. Un workflow de synchronisation doit préserver les dernières métadonnées correctes lorsqu'une API est indisponible ; ne jamais placer de secret côté navigateur.
4. Documenter séparément les fonctionnalités *envisagées*, *développées*, *validées* et *publiées*.
5. Vérifier l'exécution GitHub Actions et le rendu du site après un push sur `main`, puis mettre à jour le suivi.

## Références

- [README du site général](../README.md)
- [Intégration Crewmong Us](crewmongus-integration.md)
- [Intégration Pavillon Noir](pavillon-noir-integration.md)
- Document transversal Google Drive « DEADELUSTV - Banque d'idées et projets futurs » pour les pistes transversales et décisions datées.


