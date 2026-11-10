/* Adresse actuelle du jeu ; aucun secret dans ce fichier. */
window.DEADELUSTV_DCG_CONFIG=Object.freeze({
  gameBase:'https://tcg.yekelle-boulet.workers.dev/',
  // Le serveur actuel héberge uniquement le DCG DeadelusTV.
  accountSpaceId:'deadelustv',
  accountBroadcasterId:'99977368',
  authStorageKey:'sb-eodtxlhnfzyapkyvvxdi-auth-token',
  discoveryLimit:20,
  // Activer seulement après installation et recette du service de présence.
  dailyPassServiceReady:false,
  // Aperçu de test : mettre false pour masquer la découverte avec un seul DCG.
  showDiscoveryWithSingleStreamer:true,
  spaces:[{
    id:'deadelustv',name:'DeadelusTV',
    avatar:'https://static-cdn.jtvnw.net/jtv_user_pictures/e65e9352-416f-49d1-b958-9b8218fc4b65-profile_image-300x300.png',
    gameBase:'https://tcg.yekelle-boulet.workers.dev/',status:'Version de test'
  }]
});

