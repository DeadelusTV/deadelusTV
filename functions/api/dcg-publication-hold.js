// Deliberate BUILD-TIME hold, not a runtime endpoint or middleware.
// Pages currently skips npm/build scripts, but bundles /functions before publishing assets.
// Keep this import unresolved until the separately approved coordinated TEST switch.
// Do not create its target, mark it external or bypass bundling to make a held build green.
import './DCG_PORTAL_PUBLICATION_HOLD';

// The module must never link, deploy or execute while the hold is present.
export const onRequest = () => new Response('DCG_PORTAL_PUBLICATION_HOLD', {status: 503});
