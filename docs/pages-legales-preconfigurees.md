# Pages légales et contractuelles préconfigurées — 26 octobre 2026

## Objectif

Préparer les destinations des textes de Deadelus sans modifier les modules Phasmophobia, Crewmong Us, Pavillon Noir ou TCG.

## Pages disponibles

- `/#mentions-legales` : mentions légales, texte encore provisoire ;
- `/#confidentialite` : politique de confidentialité, texte encore provisoire ;
- `/#conditions-utilisation` : conditions générales d'utilisation (CGU), page réservée ;
- `/#conditions-vente` : conditions générales de vente (CGV), page réservée pour une éventuelle activité de vente ;
- `/#politique-cookies` : politique de cookies, inventaire des traceurs restant à compléter.

Tous les blocs d'attente portent `data-legal-pending="true"` pour les identifier sans ambiguïté. Les cinq routes sont intégrées à la navigation existante. Les cinq liens du pied de page portent l'attribut `hidden` ; l'entrée **« Gestion des cookies » reste affichée et fonctionnelle sur toutes les pages**. La politique de confidentialité reste accessible directement depuis le bandeau de consentement, même si son lien de pied de page est caché.

## Activation après réception du texte

1. Dans `public/index.html`, trouver `id="page-..."` correspondant.
2. Remplacer exclusivement le contenu du bloc `<article class="legal-document" data-legal-pending="true"> ... </article>` après validation du texte.
3. Retirer `data-legal-pending="true"` sur ce bloc.
4. Trouver le lien `<a href="#... " hidden>` correspondant dans `<nav class="legal-links">` et retirer **uniquement** l'attribut `hidden`.
5. Vérifier la page dans le navigateur, ses ancres, son rendu mobile et le lien depuis le pied de page ; publier via le workflow GitHub habituel.

## Statut et conformité

**Technique : préparé ; textes officiels : non fournis/non validés.** Les CGU et CGV sont des projets de pages, pas des contrats actifs ni une annonce d'activité commerciale. Des CGV deviennent pertinentes/obligatoires selon les ventes effectivement réalisées ; ne pas les activer avant que la fonctionnalité de vente et les conditions adaptées aient été décidées.

**Avertissement important :** masquer les liens des mentions légales et de la confidentialité ne répond pas aux obligations légales d'information et réduit leur accessibilité. C'est une mesure d'interface temporaire demandée par l'utilisatrice, à supprimer au plus vite. Le lien de gestion des cookies reste toujours accessible, ainsi que l'accès direct à la page confidentialité depuis la bannière.


## Intégration documentaire sur developpement/phasmo-v2 — 29 octobre 2026

- Mentions légales : texte Drive « Mentions légales.txt » intégré au HTML pour relecture ; validation finale non confirmée ; lien du pied de page masqué.
- Confidentialité et cookies : texte Drive « Confidentialité et cookies.txt » déclaré validé par l’utilisatrice, intégré en une seule page #confidentialite ; lien visible sur V2 et bouton « Gestion des cookies » conservé.
- Ancienne adresse #politique-cookies : affiche désormais le document #confidentialite ; doublon HTML supprimé et lien doublon retiré.
- CGU : texte Drive « Conditions générales d’utilisation.txt » intégré pour relecture ; validation finale non confirmée ; lien masqué.
- CGV : page et lien masqués conservés.
- Notes de relecture visibles sur les articles non encore validés ; les textes Drive d’origine ne sont pas modifiés.
- Avant future fusion : confirmer les mentions légales et CGU, tester les liens, la navigation, la version mobile et le gestionnaire Twitch/YouTube. Aucun changement sur main.

## Visibilité des liens légaux sur V2 — 29 octobre 2026

À la demande de l'utilisatrice, les liens « Mentions légales » et « CGU » du pied de page sont désormais affichés sur la branche developpement/phasmo-v2 pour faciliter leur relecture, comme le lien « Confidentialité et cookies » déjà visible. Le gestionnaire « Gestion des cookies » reste actif et indépendant. L'ancienne adresse #politique-cookies continue d'afficher la page confidentialité commune. Les mentions légales et CGU conservent sur cette branche leur note de relecture et leur statut « à valider » ; rendre leurs liens visibles sur la branche de test ne constitue pas une validation juridique ou une autorisation de publication sur main. La page et le lien CGV demeurent masqués en l'absence de conditions définitives. Aucun changement sur main ni déploiement public.



## Publication autorisée — 31 octobre 2026

Yekelle demande le transfert des documents intégrés sur main et le retrait des notes de relecture. Les mentions légales et CGU perdent `data-legal-pending` et leur note visible ; la confidentialité/cookies est déjà intégrée sans ce marqueur. Les trois liens sont visibles. CGV masquées et gestion des cookies conservées. Cette mise à jour décrit la publication technique des textes fournis ; aucune formulation juridique n'est ajoutée.
