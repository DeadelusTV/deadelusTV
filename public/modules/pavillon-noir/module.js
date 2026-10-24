/* Pavillon Noir : rubrique native de DeadelusTV, données et médias locaux. */
(() => {
  'use strict';
  const moduleBase = new URL('.', document.currentScript.src);
  const app = document.getElementById('pn-content');
  const nav = document.getElementById('pn-nav');
  let data;
  let loading;
  let generation = 0;

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(path, moduleBase).href;
      const timer = setTimeout(() => fail(), 15000);
      function fail() {
        clearTimeout(timer);
        script.remove();
        reject(new Error('Chargement de Pavillon Noir indisponible.'));
      }
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = fail;
      document.head.append(script);
    });
  }

  function loadData() {
    if (data) return Promise.resolve();
    if (!loading) {
      loading = (async () => {
        await Promise.all(['site', 'personnages', 'pnj', 'lore', 'sessions',
          'chronologie', 'coulisses', 'systeme'].map(name => loadScript('data/' + name + '.js')));
        await loadScript('content.js');
        const content = window.PAVILLON_DATA;
        if (!content || !Array.isArray(content.sessions) || !Array.isArray(content.personnages)) {
          throw new Error('Données de campagne indisponibles.');
        }
        data = content;
      })().catch(error => { loading = null; throw error; });
    }
    return loading;
  }

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const initials = (name) => name
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

const byId = (collection, id) => collection.find(item => item.id === id);

const characterImageById = {
  "solenn-brissac": "assets/solenn-brissac.png",
  "baron-bayard": "assets/baron-bayard.png",
  "anduin-marleau": "assets/anduin-marleau.png",
  "aldry-barat": "assets/aldry-barat.png"
};

const characterImage = (p) => p.image || characterImageById[p.id] || "";

const vodLink = (session, className = "btn bronze") => {
  if (!session.vod || !session.vod.url) return "";
  const plateforme = session.vod.plateforme || "VOD";
  return `<a class="${className}" href="${escapeHtml(session.vod.url)}" target="_blank" rel="noopener noreferrer">Voir la VOD sur ${escapeHtml(plateforme)} <span aria-hidden="true">↗</span></a>`;
};

const imageFigure = (src, alt, _caption, crop = false, extraClass = "") => `
  <figure class="campaign-image ${crop ? "campaign-image--crop" : ""} ${extraClass}">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(alt || "Illustration de campagne")}" loading="lazy" />
  </figure>
`;

const tags = (items = []) => items.length ? `
  <div class="tag-row">${items.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
` : "";

const breadcrumb = (items) => `
  <nav class="breadcrumb" aria-label="Fil d'Ariane">
    ${items.map((item, index) => item.href
      ? `<a href="${item.href}">${escapeHtml(item.label)}</a>${index < items.length - 1 ? "<span>›</span>" : ""}`
      : `<span aria-current="page">${escapeHtml(item.label)}</span>`).join("")}
  </nav>
`;

const personCard = (p) => {
  const image = characterImage(p);
  return `
    <article class="entity-card character-card">
      ${image
        ? `<div class="character-card-media"><img src="${escapeHtml(image)}" alt="Illustration de ${escapeHtml(p.nom)}" loading="lazy" /></div>`
        : `<div class="avatar" aria-hidden="true">${initials(p.nom)}</div>`}
      <div class="character-card-body">
        <span class="role">${escapeHtml(p.role)}</span>
        <h3>${escapeHtml(p.nom)}</h3>
        ${p.surnom ? `<p class="entity-subtitle">« ${escapeHtml(p.surnom)} »</p>` : ""}
        <p>${escapeHtml(p.resume)}</p>
        <div class="character-card-links">
          <a class="card-link" href="#personnage-${p.id}">Voir le profil <span aria-hidden="true">→</span></a>
          ${p.fiche ? `<a class="card-link card-link--sheet" href="${escapeHtml(p.fiche)}" target="_blank" rel="noopener noreferrer">Fiche personnage <span aria-hidden="true">↗</span></a>` : ""}
        </div>
      </div>
    </article>
  `;
};

const pnjCard = (p) => `
  <article class="entity-card entity-card--compact">
    <div class="card-topline">
      <span class="role">${escapeHtml(p.categorie)}</span>
      ${p.nomIncertain ? `<span class="status-badge">Nom à confirmer</span>` : ""}
    </div>
    <h3>${escapeHtml(p.nom)}</h3>
    <p class="entity-subtitle">${escapeHtml(p.role)}</p>
    <p>${escapeHtml(p.resume)}</p>
    <a class="card-link" href="#pnj-${p.id}">Voir la fiche <span aria-hidden="true">→</span></a>
  </article>
`;

const loreCard = (item) => `
  <article class="lore-card ${item.image ? "lore-card--visual" : ""}">
    ${item.image ? `<div class="lore-thumb"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" /></div>` : ""}
    <div>
      <span class="role">${escapeHtml(item.categorie)}</span>
      <h3>${escapeHtml(item.titre)}</h3>
      <p class="entity-subtitle">${escapeHtml(item.sousTitre)}</p>
      <p>${escapeHtml(item.resume)}</p>
      <a class="card-link" href="#lore-${item.id}">Ouvrir <span aria-hidden="true">→</span></a>
    </div>
  </article>
`;

function renderHome() {
  const latest = data.sessions[data.sessions.length - 1];
  return `
    <section class="hero section">
      <div class="hero-content parchment">
        <p class="eyebrow">${escapeHtml(data.site.saison)} · Chroniques d'une campagne JDR</p>
        <h1>Pavillon Noir</h1>
        <p class="hero-copy">${escapeHtml(data.site.intro)}</p>
        <div class="hero-actions">
          <a class="btn primary" href="#sessions">Lire le journal de bord</a>
          <a class="btn ghost" href="#equipage">Voir l'équipage</a>
        </div>
      </div>

      <aside class="latest-card wood-panel" aria-label="Situation actuelle">
        <span class="panel-label">Situation actuelle</span>
        <h2>En mer</h2>
        <p>${escapeHtml(data.site.situation)}</p>
        <div class="mini-divider"></div>
        <span class="panel-label">Dernière entrée</span>
        <h3>${escapeHtml(latest.numero)} — ${escapeHtml(latest.titre)}</h3>
        <a href="#${latest.id}" class="text-link">Lire la session →</a>
      </aside>
    </section>

    <section class="section section-tight">
      ${imageFigure("assets/saint-malo-session-01.png", "Illustration de Saint-Malo", "Illustration utilisée pendant la Session 01.", false, "hero-image")}
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">Dernière session</p>
        <h2>${escapeHtml(latest.numero)} — ${escapeHtml(latest.titre)}</h2>
        <p>${escapeHtml(latest.resumeCourt)}</p>
      </div>
      <div class="cta-row">
        <a class="btn bronze" href="#${latest.id}">Lire le résumé complet</a>
        ${vodLink(latest, "btn ghost")}
        <a class="text-link" href="#chronologie">Voir la chronologie →</a>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">Personnages</p>
        <h2>L'équipage</h2>
        <p>Quatre trajectoires encore au début de leur histoire. C'est donc le moment idéal pour faire semblant que tout restera simple.</p>
      </div>
      <div class="card-grid card-grid--four">${data.personnages.map(personCard).join("")}</div>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">Explorer le carnet</p>
        <h2>Repères de campagne</h2>
      </div>
      <div class="portal-grid">
        <a class="portal-card" href="#pnj"><strong>PNJ</strong><span>Alliés, adversaires et rencontres</span></a>
        <a class="portal-card" href="#lore"><strong>Lore</strong><span>Lieux, navires, objets et vie maritime</span></a>
        <a class="portal-card" href="#systeme"><strong>Système</strong><span>Comprendre les dés et les jets sans lire un grimoire de règles</span></a>
        <a class="portal-card" href="#chronologie"><strong>Chronologie</strong><span>Les grands événements dans l'ordre</span></a>
        <a class="portal-card" href="#coulisses"><strong>Coulisses</strong><span>Votes du public et fonctionnement de la campagne</span></a>
      </div>
    </section>
  `;
}

function renderSessions() {
  return `
    <section class="page-hero section page-hero--small">
      <p class="eyebrow">Journal de bord</p>
      <h1>Sessions</h1>
      <p>Les événements de la campagne, débarrassés des jets de dés, des réglages d'overlay et des discussions qui n'ont pas survécu au passage à l'écrit.</p>
    </section>
    <section class="section section-tight">
      <div class="season-heading"><span>${escapeHtml(data.site.saison)}</span></div>
      <div class="session-grid">
        ${data.sessions.map(session => `
          <article class="session-card">
            ${session.image ? `<div class="session-card-image"><img src="${escapeHtml(session.image)}" alt="" loading="lazy" /></div>` : ""}
            <div class="session-card-body">
              <span class="role">${escapeHtml(session.numero)}</span>
              <h2>${escapeHtml(session.titre)}</h2>
              <p>${escapeHtml(session.resumeCourt)}</p>
              <a class="card-link" href="#${session.id}">Lire la session <span aria-hidden="true">→</span></a>
              ${vodLink(session, "card-link")}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSession(session) {
  const persons = session.personnages.map(id => byId(data.personnages, id)).filter(Boolean);
  const npcs = session.pnj.map(id => byId(data.pnj, id)).filter(Boolean);
  const loreItems = session.lore.map(id => byId(data.lore, id)).filter(Boolean);
  const illustrations = Array.isArray(session.illustrations) ? session.illustrations : [];
  const galleryItems = illustrations.filter(item => !(session.image && item.image === session.image));
  return `
    <section class="detail-page section">
      ${breadcrumb([{ label: "Sessions", href: "#sessions" }, { label: session.numero }])}
      <header class="detail-header">
        <p class="eyebrow">${escapeHtml(session.saison)} · ${escapeHtml(session.numero)}</p>
        <h1>${escapeHtml(session.titre)}</h1>
        <p class="lede">${escapeHtml(session.resumeCourt)}</p>
        ${session.vod && session.vod.url ? `<div class="cta-row">${vodLink(session)}</div>` : ""}
      </header>

      ${session.image ? imageFigure(session.image, session.imageAlt || "", "Illustration utilisée pendant la session.") : ""}

      <div class="article-layout">
        <article class="prose-panel">
          <h2>Résumé</h2>
          ${session.resumeDetaille.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}

          ${session.imageBataille
            ? imageFigure(
                session.imageBataille,
                session.imageBatailleAlt || "Illustration d'ambiance d'une bataille navale",
                "Illustration d'ambiance de l'affrontement naval.",
                false
              )
            : ""}

          <h2>Événements majeurs</h2>
          <ol class="event-list">${session.evenements.map(event => `<li>${escapeHtml(event)}</li>`).join("")}</ol>

          ${galleryItems.length ? `
            <section class="subsection">
              <div class="section-heading">
                <p class="eyebrow">Supports visuels</p>
                <h2>Illustrations de campagne</h2>
                <p>Images utilisées pendant la session, dans leur ordre d'apparition.</p>
              </div>
              <div class="illustration-grid">
                ${galleryItems.map(item => imageFigure(item.image, item.alt || "Illustration de campagne", "", !!item.imageCrop)).join("")}
              </div>
            </section>
          ` : ""}
        </article>

        <aside class="side-panel">
          <div class="side-block">
            <span class="panel-label">Personnages</span>
            ${persons.map(p => `<a href="#personnage-${p.id}">${escapeHtml(p.nom)}</a>`).join("")}
          </div>
          <div class="side-block">
            <span class="panel-label">PNJ rencontrés</span>
            ${npcs.map(p => `<a href="#pnj-${p.id}">${escapeHtml(p.nom)}</a>`).join("")}
          </div>
          <div class="side-block">
            <span class="panel-label">Lore lié</span>
            ${loreItems.map(item => `<a href="#lore-${item.id}">${escapeHtml(item.titre)}</a>`).join("")}
          </div>
        </aside>
      </div>

      <section class="subsection">
        <div class="section-heading">
          <p class="eyebrow">Coulisses</p>
          <h2>Ce que le public a changé</h2>
        </div>
        <div class="note-panel">${session.coulisses.map(item => `<p>${escapeHtml(item)}</p>`).join("")}</div>
      </section>

      ${(session.finTitre || session.finTexte || session.imageFin) ? `
        <section class="subsection">
          <div class="section-heading">
            <p class="eyebrow">Fin de session</p>
            ${session.finTitre ? `<h2>${escapeHtml(session.finTitre)}</h2>` : ""}
            ${session.finTexte ? `<p>${escapeHtml(session.finTexte)}</p>` : ""}
          </div>
          ${session.imageFin ? imageFigure(
  session.imageFin,
  session.imageFinAlt || "",
  "Illustration utilisée pendant la session.",
  session.imageFinCrop !== false
) : ""}
        </section>
      ` : ""}
    </section>
  `;
}

function renderEquipage() {
  return `
    <section class="page-hero section page-hero--small">
      <p class="eyebrow">Personnages joueurs</p>
      <h1>L'équipage</h1>
      <p>Historiques, traits connus, relations et évolution au fil des sessions.</p>
    </section>
    <section class="section section-tight">
      <div class="card-grid card-grid--four">${data.personnages.map(personCard).join("")}</div>
    </section>
  `;
}

function renderPersonnage(p) {
  const identityRows = [
    ["Nom", p.nomComplet || p.nom],
    ["Surnom", p.surnom || "—"],
    ["Origine", p.origine],
    ["Âge", p.age],
    ["Fonction", p.role]
  ];
  return `
    <section class="detail-page section">
      ${breadcrumb([{ label: "Équipage", href: "#equipage" }, { label: p.nom }])}
      <header class="character-hero">
        ${characterImage(p)
          ? `<figure class="character-sheet">
              <img src="${escapeHtml(characterImage(p))}" alt="Fiche illustrée de ${escapeHtml(p.nom)}" />
            </figure>`
          : `<div class="avatar avatar--large" aria-hidden="true">${initials(p.nom)}</div>`}
        <div class="character-hero-copy">
          <p class="eyebrow">Personnage joueur</p>
          <h1>${escapeHtml(p.nom)}</h1>
          ${p.surnom ? `<p class="character-surname">« ${escapeHtml(p.surnom)} »</p>` : ""}
          <p class="lede">${escapeHtml(p.resume)}</p>
          ${p.fiche ? `<div class="cta-row"><a class="btn bronze" href="${escapeHtml(p.fiche)}" target="_blank" rel="noopener noreferrer">Voir la fiche personnage <span aria-hidden="true">↗</span></a></div>` : ""}
        </div>
      </header>

      <div class="detail-grid">
        <section class="prose-panel">
          <h2>Histoire connue</h2>
          ${p.histoire.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}

          ${p.secrets?.length ? `<h2>Informations particulières</h2><ul>${p.secrets.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}

          <h2>Évolution</h2>
          <div class="evolution-list">
            ${p.evolution.map(item => `<article><span>${escapeHtml(item.session)}</span><p>${escapeHtml(item.texte)}</p></article>`).join("")}
          </div>
        </section>

        <aside class="profile-panel">
          <h2>Fiche rapide</h2>
          <dl class="identity-list">
            ${identityRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
          </dl>
          <h3>Traits</h3>
          ${tags(p.traits)}
          <h3>Compétences repérées</h3>
          ${tags(p.competences)}
        </aside>
      </div>


      ${p.relations?.length ? `
        <section class="subsection">
          <div class="section-heading"><p class="eyebrow">Liens</p><h2>Relations connues</h2></div>
          <div class="relation-grid">
            ${p.relations.map(item => `<article><h3>${escapeHtml(item.cible)}</h3><p>${escapeHtml(item.texte)}</p></article>`).join("")}
          </div>
        </section>
      ` : ""}
    </section>
  `;
}

function renderPnjList() {
  const categories = [...new Set(data.pnj.map(item => item.categorie))];
  return `
    <section class="page-hero section page-hero--small">
      <p class="eyebrow">Personnages non joueurs</p>
      <h1>PNJ</h1>
      <p>Équipage, adversaires et rencontres. Les personnages fictifs portent les noms d'abonnés de DeadelusTV ; les personnages historiques garderont leur identité réelle.</p>
    </section>
    ${categories.map(category => `
      <section class="section section-tight">
        <div class="section-heading"><p class="eyebrow">${escapeHtml(category)}</p><h2>${escapeHtml(category)}</h2></div>
        <div class="card-grid card-grid--three">${data.pnj.filter(p => p.categorie === category).map(pnjCard).join("")}</div>
      </section>
    `).join("")}
  `;
}

function renderPnj(p) {
  return `
    <section class="detail-page section">
      ${breadcrumb([{ label: "PNJ", href: "#pnj" }, { label: p.nom }])}
      <header class="detail-header">
        <div class="card-topline">
          <p class="eyebrow">${escapeHtml(p.categorie)} · Première apparition : ${escapeHtml(p.premiere)}</p>
          ${p.nomIncertain ? `<span class="status-badge">Orthographe provisoire</span>` : ""}
        </div>
        <h1>${escapeHtml(p.nom)}</h1>
        <p class="character-surname">${escapeHtml(p.role)}</p>
        <p class="lede">${escapeHtml(p.resume)}</p>
      </header>

      <div class="detail-grid">
        <article class="prose-panel">
          <h2>Ce que l'on sait</h2>
          <ul class="fact-list">${p.faits.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <aside class="profile-panel">
          <span class="panel-label">Origine du nom</span>
          <p>${escapeHtml(p.origineNom)}</p>
        </aside>
      </div>
    </section>
  `;
}

function renderLoreList() {
  const categories = [...new Set(data.lore.map(item => item.categorie))];
  return `
    <section class="page-hero section page-hero--small">
      <p class="eyebrow">Univers</p>
      <h1>Lore</h1>
      <p>Lieux, navires, contexte, vie maritime et objets importants. Le grand placard où l'on range tout avant que le scénario ne décide d'y mettre le feu.</p>
    </section>
    ${categories.map(category => `
      <section class="section section-tight">
        <div class="section-heading"><p class="eyebrow">${escapeHtml(category)}</p><h2>${escapeHtml(category)}</h2></div>
        <div class="lore-grid">${data.lore.filter(item => item.categorie === category).map(loreCard).join("")}</div>
      </section>
    `).join("")}
  `;
}

function renderLore(item) {
  return `
    <section class="detail-page section">
      ${breadcrumb([{ label: "Lore", href: "#lore" }, { label: item.categorie, href: "#lore" }, { label: item.titre }])}
      <header class="detail-header">
        <p class="eyebrow">${escapeHtml(item.categorie)}</p>
        <h1>${escapeHtml(item.titre)}</h1>
        <p class="character-surname">${escapeHtml(item.sousTitre)}</p>
        <p class="lede">${escapeHtml(item.resume)}</p>
      </header>
      ${item.image ? imageFigure(item.image, item.imageAlt, "Illustration utilisée pendant la Session 01.") : ""}
      <article class="prose-panel prose-panel--centered">
        <h2>Ce que l'on sait</h2>
        ${item.details.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </article>
    </section>
  `;
}


function renderSysteme() {
  const s = data.systeme;
  return `
    <section class="page-hero section page-hero--small">
      <p class="eyebrow">Les dés & les règles</p>
      <h1>${escapeHtml(s.titre)}</h1>
      <p>${escapeHtml(s.intro)}</p>
    </section>

    <section class="section section-tight">
      <div class="section-heading">
        <p class="eyebrow">Le principe</p>
        <h2>${escapeHtml(s.regleBase.titre)}</h2>
      </div>
      <div class="principle-grid">
        ${s.regleBase.etapes.map(item => `
          <article class="principle-card">
            <h2>${escapeHtml(item.titre)}</h2>
            <p>${escapeHtml(item.texte)}</p>
          </article>
        `).join("")}
      </div>
      <div class="note-panel"><p><strong>Exemple :</strong> ${escapeHtml(s.regleBase.exemple)}</p></div>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">Résultats particuliers</p>
        <h2>Les chiffres à repérer</h2>
      </div>
      <div class="principle-grid">
        ${s.critiques.map(item => `
          <article class="principle-card">
            <h2>${escapeHtml(item.titre)}</h2>
            <p>${escapeHtml(item.texte)}</p>
          </article>
        `).join("")}
      </div>
      <div class="note-panel"><p><strong>Compétence à 0 :</strong> ${escapeHtml(s.exempleZero)}</p></div>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">À l'écran</p>
        <h2>Pourquoi les jets changent</h2>
      </div>
      <div class="principle-grid">
        ${s.variantes.map(item => `
          <article class="principle-card">
            <h2>${escapeHtml(item.titre)}</h2>
            <p>${escapeHtml(item.texte)}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="section">
      <div class="article-layout">
        <article class="prose-panel">
          <h2>${escapeHtml(s.blessures.titre)}</h2>
          <p>${escapeHtml(s.blessures.texte)}</p>
          <p><strong>Exemple :</strong> ${escapeHtml(s.blessures.exemple)}</p>

          <h2>${escapeHtml(s.progression.titre)}</h2>
          <p>${escapeHtml(s.progression.texte)}</p>
        </article>

        <aside class="side-panel">
          <div class="side-block">
            <span class="panel-label">Mémo express</span>
            ${s.memo.map(item => `<p>${escapeHtml(item)}</p>`).join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderChronologie() {
  return `
    <section class="page-hero section page-hero--small">
      <p class="eyebrow">Repères</p>
      <h1>Chronologie</h1>
      <p>Les grands événements canoniques dans l'ordre. Pas chaque bière, pas chaque jet de dés : seulement les choses que le futur équipage regrettera probablement d'avoir déclenchées.</p>
    </section>
    <section class="section section-tight">
      <div class="chronology">
        ${data.chronologie.map((item, index) => `
          <article class="chronology-entry">
            <div class="chronology-marker"><span>${index + 1}</span></div>
            <div class="chronology-content">
              <span class="role">${escapeHtml(item.annee)}</span>
              <h2>${escapeHtml(item.titre)}</h2>
              <p>${escapeHtml(item.texte)}</p>
              ${item.image ? imageFigure(item.image, `Illustration : ${item.titre}`, "Illustration utilisée pendant la Session 01.", !!item.imageCrop, "chronology-image") : ""}
              ${item.lien ? `<a class="card-link" href="${item.lien}">Voir le détail <span aria-hidden="true">→</span></a>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCoulisses() {
  return `
    <section class="page-hero section page-hero--small">
      <p class="eyebrow">Hors du récit</p>
      <h1>Coulisses</h1>
      <p>Ce que le public influence, comment les PNJ sont nommés et ce qui appartient au dispositif de la campagne plutôt qu'au monde des personnages.</p>
    </section>

    <section class="section section-tight">
      <div class="principle-grid">
        ${data.coulisses.principes.map(item => `<article class="principle-card"><h2>${escapeHtml(item.titre)}</h2><p>${escapeHtml(item.texte)}</p></article>`).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-heading"><p class="eyebrow">Votes du public</p><h2>Décisions du chat</h2></div>
      <div class="vote-list">
        ${data.coulisses.votes.map(vote => `
          <article class="vote-card">
            <span class="role">${escapeHtml(vote.session)}</span>
            <h3>${escapeHtml(vote.question)}</h3>
            <div class="vote-options">
              <div class="vote-winner"><span>Choix retenu</span><strong>${escapeHtml(vote.gagnant)}</strong></div>
              <div><span>Autre possibilité</span><strong>${escapeHtml(vote.autre)}</strong></div>
            </div>
            <p>${escapeHtml(vote.consequence)}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-heading"><p class="eyebrow">Supports visuels</p><h2>Illustrations de campagne</h2><p>Ces images ont servi de support pendant le JDR ; elles ne sont pas traitées comme des plans exacts et exhaustifs du monde.</p></div>
      <div class="illustration-grid">
        ${data.coulisses.illustrations.map(item => imageFigure(item.image, `Illustration ${item.titre}`, item.legende, !!item.imageCrop)).join("")}
      </div>
    </section>
  `;
}

function renderNotFound() {
  return `
    <section class="page-hero section">
      <p class="eyebrow">Carte illisible</p>
      <h1>Page introuvable</h1>
      <p>Cette route maritime n'existe pas encore dans le carnet.</p>
      <a class="btn bronze" href="#accueil">Retour à l'accueil</a>
    </section>
  `;
}

function renderPage(hash) {
  let html;

  if (hash === "accueil") html = renderHome();
  else if (hash === "sessions") html = renderSessions();
  else if (hash === "equipage") html = renderEquipage();
  else if (hash === "pnj") html = renderPnjList();
  else if (hash === "lore") html = renderLoreList();
  else if (hash === "systeme") html = renderSysteme();
  else if (hash === "chronologie") html = renderChronologie();
  else if (hash === "coulisses") html = renderCoulisses();
  else if (hash.startsWith("personnage-")) {
    const item = byId(data.personnages, hash.replace("personnage-", ""));
    html = item ? renderPersonnage(item) : renderNotFound();
  }
  else if (hash.startsWith("pnj-")) {
    const item = byId(data.pnj, hash.replace("pnj-", ""));
    html = item ? renderPnj(item) : renderNotFound();
  }
  else if (hash.startsWith("lore-")) {
    const item = byId(data.lore, hash.replace("lore-", ""));
    html = item ? renderLore(item) : renderNotFound();
  }
  else {
    const session = byId(data.sessions, hash);
    html = session ? renderSession(session) : renderNotFound();
  }

  return html;
}


  function updateNav(hash) {
    const section = hash.startsWith('session-') ? 'sessions'
      : hash.startsWith('personnage-') ? 'equipage'
      : hash.startsWith('pnj-') ? 'pnj'
      : hash.startsWith('lore-') ? 'lore' : hash;
    nav.querySelectorAll('[data-campaign-nav]').forEach(link => {
      if (link.dataset.campaignNav === section) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function localizeContent() {
    app.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        link.setAttribute('href', '#pavillon-noir/' + href.slice(1));
        if (href === '#accueil' && link.textContent.trim() === 'Accueil') {
          link.textContent = 'Carnet Pavillon Noir';
        }
      } else if (href.startsWith('assets/')) {
        link.href = new URL(href, moduleBase).href;
      }
    });
    app.querySelectorAll('img[src]').forEach(image => {
      const src = image.getAttribute('src');
      if (src.startsWith('assets/')) image.src = new URL(src, moduleBase).href;
    });
  }

  async function render(hash = 'accueil', focus = false) {
    const current = ++generation;
    updateNav(hash);
    if (!data) {
      app.innerHTML = '<div class="pn-status" role="status"><p>Chargement du carnet de campagne…</p></div>';
    }
    try {
      await loadData();
      if (current !== generation) return;
      app.innerHTML = renderPage(hash);
      localizeContent();
      const heading = app.querySelector('h1');
      if (heading) heading.setAttribute('tabindex', '-1');
      document.title = 'DeadelusTV — Pavillon Noir' + (hash !== 'accueil' && heading ? ' — ' + heading.textContent.trim() : '');
      if (focus) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        (heading || app).focus({ preventScroll: true });
      }
    } catch (error) {
      if (current !== generation) return;
      app.innerHTML = '<div class="pn-status" role="alert"><h1 tabindex="-1">Le carnet n’a pas pu être chargé.</h1><p>Tu peux réessayer sans quitter DeadelusTV.</p><button type="button" class="btn bronze">Réessayer</button></div>';
      app.querySelector('button').addEventListener('click', () => render(hash, true));
      if (focus) app.querySelector('h1').focus({ preventScroll: true });
    }
  }

  window.DEADELUSTV_PAVILLON = Object.freeze({ render, cancel() { generation++; } });
})();
