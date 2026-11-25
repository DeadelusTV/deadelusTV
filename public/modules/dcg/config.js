/* Adresse actuelle du jeu ; aucun secret dans ce fichier. */
(() => {
  const deadelus = {
    id:'deadelustv',broadcasterId:'99977368',name:'DeadelusTV',
    avatar:'https://static-cdn.jtvnw.net/jtv_user_pictures/e65e9352-416f-49d1-b958-9b8218fc4b65-profile_image-300x300.png',
    gameBase:'https://tcg.yekelle-boulet.workers.dev/',status:'Version de test'
  };
  window.DEADELUSTV_DCG_CONFIG=Object.freeze({
    gameBase:deadelus.gameBase,
    accountSpaceId:deadelus.id,
    accountBroadcasterId:deadelus.broadcasterId,
    // Le statut historique OVH ne décrit que cette chaîne Twitch.
    legacyLiveBroadcasterId:deadelus.broadcasterId,
    authStorageKey:'sb-eodtxlhnfzyapkyvvxdi-auth-token',
    // Service installé sur le projet de recette ; origine autorisée : https://deadelustv.pages.dev.
    dailyPassServiceReady:true,
    // Profil affiché pendant le chargement du bandeau ou si son annuaire est indisponible.
    discoveryOwner:deadelus,
    spaces:[deadelus]
  });
})();

