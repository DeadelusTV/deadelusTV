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
