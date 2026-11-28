**28 novembre 2026 — correction P1/P2 Admin qualifiée localement.** La connexion et les outils Admin sont désormais préparés sur une origine dédiée, proposée pour un Worker TEST distinct. Les menus Pages ne transmettent aucune session. Les tests concernés du site et la qualification Chrome multi-origines passent ; détails dans TCG docs/ADMIN_TEST_ORIGIN_ISOLATION.md et manifeste coordonné. Aucun site publié ou réglage distant modifié ; retenues Cloudflare/OVH, session Viewer et autres modules préservés. Les deux droits historiques restent conservés et les deux nouveaux accès ne sont pas déclarés opérationnels.

**27 novembre 2026 — connexion Admin dédiée développée localement, publication retenue.** Page Pages TEST admin/dcg-auth.html, e-mail/mot de passe, confirmation par code, TOTP et statut serveur. Client/stockage/broker Admin distincts du Viewer ; déconnexions indépendantes, F5, réponses tardives et pannes qualifiés. Le mode vue Streamer conserve l’identité Admin sans propriété Twitch. Additif MFA serveur et modèle e-mail TEST préparés dans TCG, aucun réglage distant, attribution ou publication. Deux Admin historiques et anciens raccordements conservés. CI étendue aux tests Admin, assertion de cache du seul broker mise à jour ; autres modules et retenues npm/compilation Pages/OVH intacts. Branche codex/admin-dedicated-auth, destination future developpement/tcg-attente, aucun upstream vers main. Bilan/manifeste coordonnés : docs/ADMIN_TEST_DEDICATED_AUTH.md et docs/manifests/ADMIN_TEST_DEDICATED_AUTH.json dans TCG. Le compte Auth réel de Yekelle n’est pas encore un accès Admin validé ; Deadelus peut suivre ultérieurement. Les états suivants restent l’historique.

**27 novembre 2026 — raccordements de bascule TEST développés localement.** Menu global avatar → Administration DCG, visibilité vérifiée par tcg_is_admin, zéro DCG, broker/session existants conservés. Copie Pages TEST qualifiée par DOM avec deux Admin ; lien masqué sur le vrai domaine www. Nouveau cache site-auth dcg-cutover-1, autres modules préservés. Sept nouveaux scénarios réussis et 22 tests Node ciblés au total (dont le fichier Journal avec ses neuf scénarios internes). TCG : hub central/defaults et choix du nom, admission Viewer serveur préparée dans un additif manuel, texte provisoire à valider ; création après nettoyage sous barrière conservée qualifiée avec deux DCG fictifs. Branche codex/streamer-cutover-connectors, destination future PR developpement/tcg-attente, aucun upstream vers main ou la branche de destination. Les retenues npm/compilation Pages/OVH restent intactes. Aucun changement distant, consentement, publication, activation, commit ou push. Bilan et manifeste coordonnés dans TCG : docs/STREAMER_TEST_CUTOVER_CONNECTORS.md et docs/manifests/STREAMER_TEST_CUTOVER_CONNECTORS.json. Les états suivants restent l’historique.

**27 novembre 2026 — correctifs CI des PR #56 et #291 préparés localement.** Sources B3 initiales publiées, PR non fusionnées. Workflow Contact : dépendances verrouillées avant tests, 33+9 tests réussis dans une copie vierge. Assertion TCG du lecteur dcg-block3-1 corrigée, 101 tests ciblés réussis. Pages avait sauté npm et publié l'aperçu 963b0fb ; nouvelle retenue de compilation qualifiée avec Wrangler 3.114.17, sans configuration distante. Workers TCG refusé sur son marqueur attendu. Versions habituelles inchangées (10 ressources HTTP). Corrections non committées/poussées ; nouveau build Pages à vérifier après publication autorisée, aucune fusion ou installation serveur. Les relevés suivants sont historiques.

## Bloc 3 DCG — développement local du 27 novembre 2026

Le portail est raccordé au registre et aux appartenances multi-DCG : accueil, annuaire/recherche, stocks/live/XP par DCG, profil, inventaire transversal paginé, Pass et navigation authentifiée vers le jeu. Collections communes, boutique avec un portefeuille choisi, échanges à rareté égale et votes sont inclus. Décisions validées : une voix définitive par propriétaire Streamer ; aucune XP sur les boosters communs. Éditeurs centraux existants réutilisés, sans rôle Admin accordé au propriétaire.

Branche codex/dcg-block3-portal, base distante developpement/tcg-attente 07f3b91 ; la branche locale divergente du même ancien nom est préservée. 87 tests portail/interface réussis, recette à deux DCG fictifs et galerie/boutique à 320 px. Développé/testé localement seulement : aucun commit, push ou déploiement. Retenues Cloudflare et OVH préparées pour préserver les versions actuellement servies ; verrou TCG post-PR #290 conservé. Serveur B2/B3 et bascule TEST restent à autoriser, admissions fermées et maintenance non modifiées. Soutien payant indisponible ; aucune publication automatique d'une collection par le vote. Détails : docs/dcg-portal-structure.md et bilan coordonné docs/DCG_BLOCK3_PORTAL.md dans TCG.

Les états du site officiel ci-dessous restent des historiques datés.

# DEADELUSTV — roadmap du site général

Mise à jour : 31 octobre 2026. Les états ci-dessous sont ceux du site principal `DeadelusTV/deadelusTV`. Ils ne remplacent pas les suivis propres au TCG, à Crewmong Us, à Pavillon Noir ou à Bingophobia.

**Branche de test du 5 novembre :** [portail DCG commun](dcg-portal-structure.md) préparé sur `developpement/tcg-attente`, sans publication sur `main`. Les statuts du tableau ci-dessous décrivent le site officiel ; sa page TCG d’attente reste publiée tant que ce lot de test n’est pas retenu.

| Sujet | État | Portée et limites |
| --- | --- | --- |
| Site principal sur OVH | Publié | Déployé depuis `main` ; conserver l'accueil et les corrections existantes. |
| Accueil : Twitch, YouTube, TikTok et navigation | Publié | Le lecteur Twitch et son écran hors ligne néon restent sur le code officiel actuel ; TikTok est un lien illustratif. |
| Dernière vidéo YouTube | Automatisé | Workflow indépendant toutes les 15 minutes prévues ; seules les métadonnées JSON sont transférées. |
| Phasmophobia V2 : présentation, galerie Shorts, visuel de carnet | Publié | Version validée par Deadelus, intégration ciblée du 25/10/2026. |
| News Phasmophobia et éditeur privé | **Terminé, validé — maintenance** | Validation officielle confirmée par Yekelle le 28/10/2026 après retour de Mattarix ; mise en page publique validée. Suite : bugs remontés ou suggestions d’amélioration.  Gestion des articles en français via Twitch OAuth + permissions RLS ; brouillons, images animées, YouTube/Shorts, aperçus, publication/retrait. [Documentation](phasmo-news-editor.md). |
| Séparation éditoriale preview / production | **En place** | `phasmo_news_drafts` côté dev, `phasmo_news_drafts_production` côté main ; `phasmo_news_articles` filtré par `stage` et `status`. Aucun transfert de brouillons de test. |
| TCG : page « À venir » | Publié | Univers TCG annoncé sans dévoiler les mécaniques ; site de jeu TCG distinct et encore en développement. |
| Actualisation automatique des Shorts Phasmo | Publiée, première exécution réussie | YouTube Data API v3, secret `YOUTUBE_API_KEY`, quatre vérifications quotidiennes prévues ; premier transfert OVH réussi (run `40218578291`). Suivi des prochains déclenchements à poursuivre. |
| Livre interactif Phasmo V7 | Interface validée ; code livré | Éditeur, listes libres, zoom et lecteur officiel ; départ vierge demandé, brouillon actif révision 14. Contenu non publié, verrou conservé. |
| Compte Twitch commun et Crew | Code intégré | Menu partagé News/carnet/Crew, droits existants conservés ; associations et écritures Admin/Helper réelles à confirmer. |
| Pages légales | Textes intégrés autorisés pour publication | Mentions, confidentialité/cookies et CGU sans note de relecture ; CGV masquées. |
| Crewmong Us et Pavillon Noir | Intégrations existantes | Préserver leurs pages, données et décisions ; revue des chantiers séparément. |
| Démo temporaire Cloudflare | Présentation validée, conservée | `preview/presentation-deadelus` ; elle peut être supprimée ultérieurement sans toucher à `main`. |
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

## Documentation News / éditeur privé

- [Guide technique et décisionnel](phasmo-news-editor.md)
- [Documentation complète sur Drive](https://docs.google.com/document/d/1vqHaregg5l-UjjADw3qtzpt79vX0nfxGjt9LFng2kvI/edit)
- Le Livre de preuves interactif reste un chantier indépendant de la livraison du blog.


