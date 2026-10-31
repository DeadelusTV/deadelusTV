/* Raccourci privé des News Phasmo, branché sur l'authentification du portail.
 * Aucune permission n'est déduite de la modération ou du pseudo Twitch.
 * Les politiques RLS restent la seule autorité pour la publication.
 */
(() => {
  'use strict';
  const root = document.querySelector('#page-phasmophobia [data-phasma-section="news"]');
  const panel = document.getElementById('phasma-news-editor-access');
  const manage = document.getElementById('phasma-news-editor-link');
  const account = window.DEADELUSTV_AUTH;
  if (!root || !panel || !manage || !account) return;

  let requestId = 0;
  async function refresh() {
    const request = ++requestId;
    panel.hidden = true;
    manage.hidden = true;
    if (!root.open) return;
    try {
      const client = await account.getClient();
      const { data, error } = await client.auth.getUser();
      if (request !== requestId || !root.open || error || !data?.user) return;
      // Contrôle d'affichage seulement : l'éditeur et les tables appliquent leurs RLS.
      const allowed = await account.canManageNews(client, data.user.id);
      if (request !== requestId || !root.open) return;
      panel.hidden = !allowed;
      manage.hidden = !allowed;
    } catch {
      // Échec fermé : le menu Compte reste accessible, aucun accès privé affiché.
      panel.hidden = true;
      manage.hidden = true;
    }
  }
  root.addEventListener('toggle', () => { refresh(); });
  window.addEventListener('deadelustv:auth-change', () => {
    if (root.open) refresh();
  });
  if (root.open) refresh();
})();

