/* Pilotage du projet (projet.html) : rétroplanning modifiable et journal des mises à jour.
   Lecture publique. Mode édition réservé à l'admin connecté (jeton de session de l'admin,
   même onglet) : couloirs, tâches, jalons, glisser-déposer avec tâches liées, corrections du
   journal. Le journal est lu dans CHANGELOG-CVDL.md (publié avec le site) et complété par les
   corrections / entrées manuelles enregistrées en base. Back : src/routes/projet.js. */

/* ── Constantes et outils ── */
const COULEURS = {
  navy: '#002743',
  rouge: '#e5484d',
  tur: '#00acb0',
  mag: '#e62460',
  orange: '#d97706',
  vert: '#1f9d55',
  jaune: '#fecc38',
};
const NOMS_COULEURS = {
  navy: 'Bleu nuit',
  rouge: 'Rouge',
  tur: 'Turquoise',
  mag: 'Magenta',
  orange: 'Orange',
  vert: 'Vert',
  jaune: 'Jaune',
};
const CATEGORIES = { Sécurité: '#e5484d', Données: '#00acb0', Back: '#002743', Front: '#e62460', Démo: '#d97706' };
const STATUTS = { 'a-faire': 'À faire', 'en-cours': 'En cours', termine: 'Terminé', bloque: 'Bloqué' };
const ZOOMS = { semaines: 22, mois: 7 }; // pixels par jour
const H_LIGNE = 46; // hauteur d'une ligne de barres dans un couloir
const MARGE_COULOIR = 14;

const $ = (id) => document.getElementById(id);
const echapper = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const JOUR = 864e5;
const enJours = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / JOUR;
const versIso = (n) => new Date(n * JOUR).toISOString().slice(0, 10);
const auj = () => {
  const d = new Date();
  return versIso(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / JOUR);
};
const frDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const frCourt = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/* Le pilotage concerne le projet réel : la page lit toujours le back de production, même
   depuis le site démo (lecture seule là-bas : le jeton de l'admin démo n'est pas valable en prod). */
const API_PROJET = API.replace(/-demo$/, '');
const SITE_DEMO = API_PROJET !== API;

/* ── État ── */
const P = {
  couloirs: [],
  taches: [],
  corrections: [],
  changelog: [],
  jeton: '',
  peutModifier: false,
  edition: false,
  vue: 'planning',
  zoom: 'mois',
  filtre: 'Tout',
  recherche: '',
  ouverts: new Set(),
  joursAffiches: 12,
  voirMasquees: false,
};
try {
  P.jeton = SITE_DEMO ? '' : sessionStorage.getItem('cvdl-admin-jeton') || '';
  P.zoom = localStorage.getItem('cvdl-projet-zoom') || 'mois';
  P.pleineLargeur = localStorage.getItem('cvdl-projet-largeur') === 'pleine';
} catch (e) {}
if (!ZOOMS[P.zoom]) P.zoom = 'mois';

async function appel(action, donnees = {}) {
  const entetes = { 'Content-Type': 'text/plain;charset=utf-8' };
  if (P.jeton && action !== 'projet') entetes['X-CVDL-Admin'] = encodeURIComponent(P.jeton);
  try {
    const r = await fetch(API_PROJET, {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify({ action, ...donnees }),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, erreur: 'Serveur injoignable.' };
  }
}

let minuteurToast = null;
function toast(message, { erreur = false, action = null, libelle = 'Annuler' } = {}) {
  const t = $('pj-toast');
  t.className = 'pj-toast' + (erreur ? ' erreur' : '');
  t.innerHTML = `<span>${echapper(message)}</span>${action ? `<button type="button">${echapper(libelle)}</button>` : ''}`;
  t.hidden = false;
  if (action)
    t.querySelector('button').onclick = () => {
      t.hidden = true;
      action();
    };
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => (t.hidden = true), action ? 9000 : 3500);
}

/* ── Chargement ── */
async function charger() {
  const r = await appel('projet');
  if (!r.ok) {
    $('pj-chargement').textContent = 'Impossible de charger le projet pour le moment.';
    return false;
  }
  P.couloirs = r.couloirs;
  P.taches = r.taches;
  P.corrections = r.journal;
  return true;
}
async function chargerChangelog() {
  try {
    const r = await fetch('CHANGELOG-CVDL.md', { cache: 'no-cache' });
    const texte = r.ok ? await r.text() : '';
    // Un hébergeur qui ne sert pas le fichier brut (ex. GitHub Pages avec Jekyll) renvoie du HTML.
    P.changelogIntrouvable = !/^#\s/m.test(texte);
    P.changelog = P.changelogIntrouvable ? [] : lireChangelog(texte);
  } catch (e) {
    P.changelogIntrouvable = true;
    P.changelog = [];
  }
}

/* ════════════════ Journal : lecture du changelog ════════════════ */

const MOTS_CLES = [
  ['Sécurité', /sécurité|faille|mot de passe|jeton|audit|injection|xss|authentif|connexion google|anti-/i],
  ['Données', /postgres|base de données|\bbase\b|stockage|migration|google sheets|données/i],
  ['Démo', /démo\b|démonstration|\bdemo\b/i],
  ['Back', /\bback\b|backend|serveur|route|src\/|tec\.tech|e-mail|\bmail\b|\bapi\b/i],
  ['Front', /\bfront\b|page|écran|portail|admin|affichage|visuel|bouton|formulaire|mode sombre|\.html|\.css/i],
];
function deduireCategories(titre, corps) {
  const dansTitre = MOTS_CLES.filter(([, re]) => re.test(titre)).map(([c]) => c);
  if (dansTitre.length) return dansTitre;
  return MOTS_CLES.filter(([, re]) => re.test(corps))
    .map(([c]) => c)
    .slice(0, 2);
}
const cleEntree = (date, titre) =>
  `${date || 'sans-date'}-${titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)}`;

/** Sections « ## Titre (JJ/MM/AAAA) » de CHANGELOG-CVDL.md → entrées du journal. Une ligne
 *  « Catégories : Back, Front » dans une section fixe ses étiquettes, sinon elles sont déduites. */
function lireChangelog(md) {
  const sections = [];
  let cur = null;
  for (const ligne of md.split('\n')) {
    const m = ligne.match(/^## (.+)$/);
    if (m) {
      cur = { titre: m[1].trim(), lignes: [] };
      sections.push(cur);
    } else if (cur) cur.lignes.push(ligne);
  }
  return sections.map((s, ordre) => {
    let titre = s.titre;
    let date = '';
    const fin = titre.match(/\s*\((\d{2})\/(\d{2})\/(\d{4})[^)]*\)\s*$/);
    const dedans = titre.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (fin) {
      date = `${fin[3]}-${fin[2]}-${fin[1]}`;
      titre = titre.slice(0, fin.index).trim();
    } else if (dedans) date = `${dedans[3]}-${dedans[2]}-${dedans[1]}`;
    let categories = null;
    const blocs = []; // { type: 'li' | 'h' | 'p', texte }
    let nouveauParagraphe = true;
    for (const brute of s.lignes) {
      const l = brute.replace(/\s+$/, '');
      const cat = l.match(/^Catégories\s*:\s*(.+)$/i);
      if (cat) {
        categories = cat[1]
          .split(',')
          .map((c) => c.trim())
          .filter((c) => CATEGORIES[c]);
        continue;
      }
      if (!l.trim()) {
        nouveauParagraphe = true;
        continue;
      }
      if (/^>/.test(l)) continue;
      const puce = l.match(/^\s*[-*] (.*)$/);
      if (puce && !/^\s{4,}/.test(l)) blocs.push({ type: 'li', texte: puce[1] });
      else if (/^\*\*[^*]+\*\*$/.test(l.trim())) blocs.push({ type: 'h', texte: l.trim().slice(2, -2) });
      else if (blocs.length && (/^\s+/.test(l) || (!nouveauParagraphe && blocs[blocs.length - 1].type === 'p')))
        blocs[blocs.length - 1].texte += ' ' + l.trim();
      else blocs.push({ type: 'p', texte: l.trim() });
      nouveauParagraphe = false;
    }
    const corps = blocs.map((b) => b.texte).join(' ');
    return {
      cle: cleEntree(date, titre),
      source: 'changelog',
      ordre,
      date,
      titre,
      blocs,
      categories: categories || deduireCategories(titre, corps),
    };
  });
}

/** Changelog + corrections enregistrées + entrées manuelles, triés du plus récent au plus ancien. */
function entreesJournal() {
  const corr = new Map(P.corrections.filter((c) => c.cle).map((c) => [c.cle, c]));
  const versBlocs = (texte) =>
    texte
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ type: 'li', texte: l.replace(/^[-*] /, '') }));
  const liste = P.changelog.map((e) => {
    const c = corr.get(e.cle);
    if (!c) return e;
    return {
      ...e,
      idCorrection: c.id,
      titre: c.titre || e.titre,
      date: c.date || e.date,
      blocs: c.texte ? versBlocs(c.texte) : e.blocs,
      texteCorrige: c.texte,
      categories: c.categories.length ? c.categories : e.categories,
      masque: c.masque,
      epingle: c.epingle,
    };
  });
  P.corrections
    .filter((c) => !c.cle)
    .forEach((c, i) =>
      liste.push({
        cle: `manuel-${c.id}`,
        source: 'manuel',
        idCorrection: c.id,
        ordre: -1 - i,
        date: c.date,
        titre: c.titre,
        blocs: versBlocs(c.texte),
        texteCorrige: c.texte,
        categories: c.categories,
        masque: c.masque,
        epingle: c.epingle,
      }),
    );
  return liste.sort((a, b) => (b.date || '0').localeCompare(a.date || '0') || a.ordre - b.ordre);
}

const enLigne = (t) =>
  echapper(t)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

function htmlBlocs(blocs) {
  let html = '';
  let liste = false;
  for (const b of blocs) {
    if (b.type === 'li' && !liste) {
      html += '<ul>';
      liste = true;
    }
    if (b.type !== 'li' && liste) {
      html += '</ul>';
      liste = false;
    }
    html +=
      b.type === 'li'
        ? `<li>${enLigne(b.texte)}</li>`
        : b.type === 'h'
          ? `<h4>${enLigne(b.texte)}</h4>`
          : `<p>${enLigne(b.texte)}</p>`;
  }
  return html + (liste ? '</ul>' : '');
}

/* ════════════════ Rétroplanning : calculs ════════════════ */

const tache = (id) => P.taches.find((t) => t.id === id);
const couleurCouloir = (id) => COULEURS[(P.couloirs.find((c) => c.id === id) || {}).couleur] || COULEURS.navy;
const enRetard = (t) => t.type === 'tache' && t.statut !== 'termine' && t.fin < auj();

/** Pousse les tâches liées (« doit être fini avant ») qui commenceraient avant la fin de leur
 *  prédécesseur. `dates` : Map id → { debut, fin }, modifiée en place. Renvoie les ids décalés. */
function cascade(dates, depart) {
  const decales = new Set();
  const file = [depart];
  let garde = 0;
  while (file.length && garde++ < 500) {
    const t = tache(file.shift());
    const finT = enJours(dates.get(t.id).fin);
    for (const s of t.avant) {
      const ds = dates.get(s);
      const ts = tache(s);
      if (!ds || !ts) continue;
      const minimum = t.type === 'jalon' ? finT : finT + 1;
      const debutS = enJours(ds.debut);
      if (debutS >= minimum) continue;
      const ecart = minimum - debutS;
      ds.debut = versIso(debutS + ecart);
      ds.fin = versIso(enJours(ds.fin) + ecart);
      decales.add(s);
      file.push(s);
    }
  }
  return decales;
}

/** Bornes de la ligne de temps : de la première à la dernière date (+ aujourd'hui), en semaines entières. */
function bornes() {
  const dates = P.taches.flatMap((t) => [enJours(t.debut), enJours(t.fin)]);
  dates.push(enJours(auj()));
  let d0 = Math.min(...dates) - 7;
  const d1 = Math.max(...dates) + 21;
  d0 -= (new Date(d0 * JOUR).getUTCDay() + 6) % 7; // lundi
  return { d0, d1, jours: d1 - d0 };
}

let mesureur = null;
function largeurTexte(t) {
  mesureur = mesureur || document.createElement('canvas').getContext('2d');
  mesureur.font = '700 12.5px Inter, system-ui, sans-serif';
  return mesureur.measureText(t).width;
}

/** Position (px) de chaque tâche et répartition en lignes dans son couloir, sans chevauchement
 *  (le libellé placé à droite d'une barre courte compte dans la place occupée). */
function disposition(dates) {
  const { d0, d1, jours } = bornes();
  const px = ZOOMS[P.zoom];
  const pos = new Map();
  const lignesParCouloir = new Map();
  for (const c of P.couloirs) {
    const liste = P.taches
      .filter((t) => t.couloir === c.id)
      .sort((a, b) => a.debut.localeCompare(b.debut) || a.id - b.id);
    const finsLignes = [];
    for (const t of liste) {
      const dt = dates.get(t.id);
      const x = (enJours(dt.debut) - d0) * px;
      const jalon = t.type === 'jalon';
      const l = jalon ? 0 : (enJours(dt.fin) - enJours(dt.debut) + 1) * px;
      const lib = largeurTexte(t.titre) + 26;
      const dehors = jalon || lib > l;
      const occupeFin = jalon ? x + 20 + lib : x + l + (dehors ? lib : 6);
      const occupeDebut = jalon ? x - 14 : x;
      let ligne = finsLignes.findIndex((f) => f + 8 <= occupeDebut);
      if (ligne < 0) {
        ligne = finsLignes.length;
        finsLignes.push(0);
      }
      finsLignes[ligne] = occupeFin;
      pos.set(t.id, { x, l, ligne, dehors });
    }
    lignesParCouloir.set(c.id, Math.max(1, finsLignes.length));
  }
  return { d0, d1, jours, px, pos, lignesParCouloir };
}

/* ════════════════ Rendu général ════════════════ */

function render() {
  $('pj-chargement').hidden = true;
  document.body.classList.toggle('pj-edition-on', P.edition);
  document.body.classList.toggle('pj-pleine-largeur', !!P.pleineLargeur);
  renderTete();
  renderKpis();
  document
    .querySelectorAll('[data-vue]')
    .forEach((b) => b.setAttribute('aria-selected', String(b.dataset.vue === P.vue)));
  $('pj-vue-planning').hidden = P.vue !== 'planning';
  $('pj-vue-journal').hidden = P.vue !== 'journal';
  renderBarreDroite();
  if (P.vue === 'planning') renderPlanning();
  else renderJournal();
}

function renderTete() {
  const z = $('pj-tete-actions');
  if (P.peutModifier)
    z.innerHTML = `<button type="button" class="pj-edition" id="pj-bascule-edition" aria-pressed="${P.edition}">Mode édition <i></i></button>`;
  else
    z.innerHTML = SITE_DEMO
      ? '<span class="pj-sous">Données réelles du projet · modification depuis l’admin de production</span>'
      : `<a class="btn btn-ghost" href="admin.html?retour=projet" title="Réservé à l'équipe CVDL">Connexion équipe</a>`;
}

function renderKpis() {
  const principal = P.taches.find((t) => t.principal);
  const taches = P.taches.filter((t) => t.type === 'tache');
  const faites = taches.filter((t) => t.statut === 'termine').length;
  const retards = taches.filter(enRetard).length;
  const maj = entreesJournal().filter((e) => !e.masque).length;
  const reste = principal ? enJours(principal.debut) - enJours(auj()) : null;
  const ic = (d) =>
    `<span class="pj-kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;
  $('pj-kpis').innerHTML = `
    <div class="pj-kpi">${ic('<path d="M12 3 21 12 12 21 3 12z"/>')}<div><b>${
      principal ? (reste >= 0 ? `J-${reste}` : 'Passé') : '—'
    }</b><small>${principal ? `${echapper(principal.titre)} · ${frDate(principal.debut)}` : 'Aucun jalon principal'}</small></div></div>
    <div class="pj-kpi">${ic('<path d="M4 6h16M4 12h10M4 18h6"/>')}<div><b>${faites} / ${taches.length}</b><small>Tâches terminées</small></div></div>
    <div class="pj-kpi ${retards ? 'alerte' : ''}">${ic('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>')}<div><b>${retards}</b><small>${retards > 1 ? 'Tâches en retard' : 'Tâche en retard'}</small></div></div>
    <div class="pj-kpi">${ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')}<div><b>${maj}</b><small>Mises à jour publiées</small></div></div>`;
}

function renderBarreDroite() {
  const z = $('pj-barre-droite');
  const largeur = `<button type="button" class="pj-pil" id="pj-largeur" aria-pressed="${!!P.pleineLargeur}" title="${
    P.pleineLargeur ? 'Revenir à la largeur limitée' : 'Utiliser toute la largeur de l’écran'
  }"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    P.pleineLargeur ? '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>' : '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>'
  }</svg>${P.pleineLargeur ? 'Largeur limitée' : 'Pleine largeur'}</button>`;
  if (P.vue === 'planning')
    z.innerHTML = `${largeur}<div class="pj-seg" role="group" aria-label="Échelle">${Object.keys(ZOOMS)
      .map(
        (k) =>
          `<button type="button" data-zoom="${k}" class="${P.zoom === k ? 'actif' : ''}">${k === 'mois' ? 'Mois' : 'Semaines'}</button>`,
      )
      .join('')}</div>
      <button type="button" class="pj-pil" id="pj-aller-auj">Aujourd’hui</button>
      ${P.edition ? '<button type="button" class="btn btn-primary" id="pj-ajouter-tache">＋ Ajouter une tâche</button>' : ''}`;
  else
    z.innerHTML =
      largeur +
      (P.edition
        ? '<button type="button" class="btn btn-primary" id="pj-ajouter-entree">＋ Nouvelle entrée</button>'
        : '');
}

/* ════════════════ Rendu du rétroplanning ════════════════ */

let geo = null; // dernière disposition (utilisée pendant un glissement)

function renderPlanning() {
  const zone = $('pj-vue-planning');
  if (!P.couloirs.length) {
    zone.innerHTML = `<div class="pj-carte pj-vide">Aucun couloir pour l’instant.${
      P.edition
        ? '<br><br><button type="button" class="btn btn-primary" data-ajout-couloir>＋ Ajouter un couloir</button>'
        : ''
    }</div>`;
    return;
  }
  const defile = zone.querySelector('.pj-defile');
  const scroll = defile ? defile.scrollLeft : null;
  const dates = new Map(P.taches.map((t) => [t.id, { debut: t.debut, fin: t.fin }]));
  geo = disposition(dates);
  const { d0, d1, jours, px, pos, lignesParCouloir } = geo;
  const hCouloir = (id) => lignesParCouloir.get(id) * H_LIGNE + MARGE_COULOIR;

  // Colonne des couloirs
  const gauche =
    `<div class="pj-coin">Couloirs</div>` +
    P.couloirs
      .map(
        (
          c,
        ) => `<div class="pj-couloir-nom" style="height:${hCouloir(c.id)}px;--c:${COULEURS[c.couleur]}" data-couloir="${c.id}" ${
          P.edition ? 'draggable="true"' : ''
        }>
        ${P.edition ? '<button type="button" class="poignee" title="Glisser pour réordonner" aria-hidden="true" tabindex="-1">⋮⋮</button>' : ''}
        <i class="pj-tagc"></i><span>${echapper(c.nom)}</span>
        ${P.edition ? `<button type="button" data-modifier-couloir="${c.id}" title="Modifier le couloir" aria-label="Modifier le couloir ${echapper(c.nom)}">✎</button>` : ''}
      </div>`,
      )
      .join('') +
    (P.edition
      ? '<button type="button" class="pj-ajout-couloir" data-ajout-couloir>＋ Ajouter un couloir</button>'
      : '');

  // En-têtes mois / semaines
  let mois = '';
  for (let j = d0; j < d1;) {
    const d = new Date(j * JOUR);
    const suivant = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / JOUR;
    const fin = Math.min(suivant, d1);
    const w = (fin - j) * px;
    const lib =
      w < 110
        ? d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
        : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    mois += `<div style="width:${w}px">${w > 34 ? lib : ''}</div>`;
    j = fin;
  }
  let sem = '';
  for (let j = d0; j < d1; j += 7)
    sem += `<div style="width:${Math.min(7, d1 - j) * px}px">${px * 7 > 24 ? new Date(j * JOUR).getUTCDate() : ''}</div>`;

  // Couloirs et barres
  let y = 62;
  const yCouloir = new Map();
  let couloirs = '';
  for (const c of P.couloirs) {
    yCouloir.set(c.id, y);
    let contenu = '';
    for (const t of P.taches.filter((x) => x.couloir === c.id)) contenu += htmlTache(t, pos.get(t.id), c);
    couloirs += `<div class="pj-couloir" style="height:${hCouloir(c.id)}px;--sem:${7 * px}px;background-position:${
      (((7 - ((d0 + 3) % 7)) % 7) * px) % (7 * px)
    }px 0" data-couloir-zone="${c.id}">${contenu}</div>`;
    y += hCouloir(c.id);
  }
  geo.yCouloir = yCouloir;

  const xAuj = (enJours(auj()) - d0) * px;
  const principal = P.taches.find((t) => t.principal);
  const reperes =
    `<div class="pj-repere auj" style="left:${xAuj}px"><span>AUJ.</span></div>` +
    (principal
      ? `<div class="pj-repere prod" style="left:${(enJours(principal.debut) - d0) * px + px / 2}px"><span>${echapper(
          principal.titre.toUpperCase(),
        )}</span></div>`
      : '');

  zone.innerHTML = `<div class="pj-carte">
    <div class="pj-gantt">
      <div class="pj-gauche" id="pj-gauche">${gauche}</div>
      <div class="pj-defile" id="pj-defile"><div class="pj-toile" id="pj-toile" style="width:${jours * px}px">
        <div class="pj-mois">${mois}</div><div class="pj-sem">${sem}</div>
        ${couloirs}${reperes}<svg class="pj-liens" id="pj-liens"></svg>
      </div></div>
    </div>
    <div class="pj-legende">
      <span><i style="width:22px;height:12px;border:1.5px solid var(--navy);border-radius:4px"></i>Tâche</span>
      <span><i style="width:11px;height:11px;transform:rotate(45deg);border:1.5px solid var(--navy);background:var(--jaune)"></i>Jalon</span>
      <span><i style="width:22px;height:12px;border-radius:4px;border:1.5px solid var(--vert);background:color-mix(in srgb,var(--vert) 16%,#fff)"></i>Terminé</span>
      <span><i style="width:22px;height:12px;border-radius:4px;border:1.5px solid var(--rouge)"></i>En retard</span>
      <span><i style="width:22px;border-top:2px solid var(--mag)"></i>Aujourd’hui</span>
      <span><i style="width:22px;border-top:2px dashed #8aa0b2"></i>Lien entre tâches</span>
      <span class="pj-astuce">${
        P.edition
          ? '↔ Glisser une tâche la déplace · son bord l’allonge · les tâches liées suivent'
          : 'Cliquer sur une tâche pour voir le détail'
      }</span>
    </div></div>`;
  dessinerLiens(dates);
  const nouveau = $('pj-defile');
  if (scroll != null) nouveau.scrollLeft = scroll;
  else nouveau.scrollLeft = Math.max(0, xAuj - 140);
}

function htmlTache(t, p, c) {
  const top = MARGE_COULOIR / 2 + p.ligne * H_LIGNE + 6;
  const couleur = COULEURS[c.couleur];
  const titre = `${t.titre} — ${t.type === 'jalon' ? frDate(t.debut) : `${frDate(t.debut)} → ${frDate(t.fin)}`} · ${
    STATUTS[t.statut]
  }`;
  if (t.type === 'jalon')
    return `<div class="pj-jalon st-${t.statut}" data-tache="${t.id}" style="left:${p.x + ZOOMS[P.zoom] / 2}px;top:${
      top + 5
    }px" title="${echapper(titre)}" tabindex="0" role="button"></div><div class="pj-jalon-lib" data-lib="${t.id}" style="left:${
      p.x + ZOOMS[P.zoom] / 2 + 18
    }px;top:${top + 9}px">${t.statut === 'termine' ? '✓ ' : ''}${echapper(t.titre)}</div>`;
  const avancement = t.statut === 'termine' ? 0 : t.avancement;
  return `<div class="pj-barre-t st-${t.statut} ${enRetard(t) ? 'retard' : ''}" data-tache="${t.id}" style="left:${p.x}px;top:${top}px;width:${
    p.l
  }px;--c:${couleur}" title="${echapper(titre)}" tabindex="0" role="button">
    ${avancement ? `<i class="av" style="width:${avancement}%"></i>` : ''}
    ${P.edition ? '<i class="poi g"></i><i class="poi d"></i>' : ''}
    <span class="lib ${p.dehors ? 'dehors' : ''}">${t.statut === 'termine' ? '✓ ' : t.statut === 'bloque' ? '⚠ ' : ''}${echapper(t.titre)}</span>
  </div>`;
}

/** Flèches « doit être fini avant » ; rouge si l'ordre n'est pas respecté. */
function dessinerLiens(dates) {
  const svg = $('pj-liens');
  if (!svg || !geo) return;
  const { d0, px, pos, yCouloir } = geo;
  const milieu = (t) => yCouloir.get(t.couloir) + MARGE_COULOIR / 2 + pos.get(t.id).ligne * H_LIGNE + 6 + 17;
  let chemins = '';
  for (const t of P.taches) {
    if (!pos.has(t.id)) continue;
    for (const s of t.avant) {
      const ts = tache(s);
      if (!ts || !pos.has(s)) continue;
      const dt = dates.get(t.id);
      const ds = dates.get(s);
      const x1 = (enJours(dt.fin) - d0 + 1) * px;
      const x2 = (enJours(ds.debut) - d0) * px + (ts.type === 'jalon' ? px / 2 - 12 : 0);
      const y1 = milieu(t);
      const y2 = milieu(ts);
      const conflit = enJours(ds.debut) < enJours(dt.fin) + (t.type === 'jalon' ? 0 : 1);
      const c = Math.max(30, Math.abs(x2 - x1) / 2);
      chemins += `<path d="M${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}" fill="none" stroke="${
        conflit ? '#e5484d' : '#8aa0b2'
      }" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#${conflit ? 'pj-fl-r' : 'pj-fl'})"/>`;
    }
  }
  svg.innerHTML = `<defs><marker id="pj-fl" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#8aa0b2"/></marker><marker id="pj-fl-r" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#e5484d"/></marker></defs>${chemins}`;
}

/* ── Glisser-déposer des tâches (mode édition) ── */
let saisie = null;

function debutSaisie(e) {
  const el = e.target.closest('[data-tache]');
  if (!el || e.button !== 0) return;
  const t = tache(+el.dataset.tache);
  if (!t) return;
  if (!P.edition) return; // simple clic → détail (géré par le clic)
  const r = el.getBoundingClientRect();
  const dx = e.clientX - r.left;
  const mode = t.type === 'jalon' ? 'deplacer' : dx < 9 ? 'debut' : dx > r.width - 9 ? 'fin' : 'deplacer';
  saisie = {
    t,
    el,
    mode,
    x0: e.clientX,
    bouge: false,
    avant: new Map(P.taches.map((x) => [x.id, { debut: x.debut, fin: x.fin }])),
  };
  el.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function pendantSaisie(e) {
  if (!saisie) return;
  const dx = e.clientX - saisie.x0;
  if (!saisie.bouge && Math.abs(dx) < 4) return;
  if (!saisie.bouge) {
    saisie.bouge = true;
    saisie.el.classList.add('saisie');
    const p = geo.pos.get(saisie.t.id);
    const f = document.createElement('div');
    f.className = 'pj-fantome';
    if (saisie.t.type === 'jalon') Object.assign(f.style, { width: '24px', marginLeft: '-12px', height: '24px' });
    f.style.left = saisie.el.style.left;
    f.style.top = saisie.el.style.top;
    if (saisie.t.type !== 'jalon') f.style.width = p.l + 'px';
    saisie.el.parentNode.insertBefore(f, saisie.el);
    saisie.fantome = f;
    saisie.bulle = document.createElement('div');
    saisie.bulle.className = 'pj-bulle';
    $('pj-toile').appendChild(saisie.bulle);
  }
  const dj = Math.round(dx / geo.px);
  const t = saisie.t;
  const o = saisie.avant.get(t.id);
  const dates = new Map([...saisie.avant].map(([k, v]) => [k, { ...v }]));
  const d = dates.get(t.id);
  if (saisie.mode === 'deplacer') {
    d.debut = versIso(enJours(o.debut) + dj);
    d.fin = versIso(enJours(o.fin) + dj);
  } else if (saisie.mode === 'debut') d.debut = versIso(Math.min(enJours(o.debut) + dj, enJours(o.fin)));
  else d.fin = versIso(Math.max(enJours(o.fin) + dj, enJours(o.debut)));
  const decales = cascade(dates, t.id);
  saisie.dates = dates;
  saisie.decales = decales;
  // Mise à jour visuelle des barres concernées, sans tout redessiner (garde la saisie du pointeur).
  for (const id of [t.id, ...decales]) {
    const x = tache(id);
    const dd = dates.get(id);
    const el = document.querySelector(`[data-tache="${id}"]`);
    if (!el) continue;
    const left = (enJours(dd.debut) - geo.d0) * geo.px;
    if (x.type === 'jalon') {
      el.style.left = left + geo.px / 2 + 'px';
      const lib = document.querySelector(`[data-lib="${id}"]`);
      if (lib) lib.style.left = left + geo.px / 2 + 18 + 'px';
    } else {
      el.style.left = left + 'px';
      el.style.width = (enJours(dd.fin) - enJours(dd.debut) + 1) * geo.px + 'px';
    }
  }
  dessinerLiens(dates);
  const ecart = saisie.mode === 'fin' ? enJours(d.fin) - enJours(o.fin) : enJours(d.debut) - enJours(o.debut);
  const signe = ecart > 0 ? '+' : '';
  const periode = t.type === 'jalon' ? frCourt(d.debut) : `${frCourt(d.debut)} → ${frCourt(d.fin)}`;
  saisie.bulle.innerHTML = `${saisie.mode === 'deplacer' ? 'Glissement' : 'Durée'} <b>${signe}${ecart} j</b> · ${periode}${
    decales.size ? ` · décale ${decales.size} ${decales.size > 1 ? 'tâches liées' : 'tâche liée'}` : ''
  }`;
  const p = geo.pos.get(t.id);
  saisie.bulle.style.left = (enJours(d.debut) - geo.d0) * geo.px + 'px';
  saisie.bulle.style.top = geo.yCouloir.get(t.couloir) + MARGE_COULOIR / 2 + p.ligne * H_LIGNE - 2 + 'px';
}

async function finSaisie() {
  if (!saisie) return;
  const s = saisie;
  saisie = null;
  if (!s.bouge) {
    ouvrirTache(s.t.id);
    return;
  }
  const changees = [...s.dates]
    .filter(([id, d]) => {
      const o = s.avant.get(id);
      return d.debut !== o.debut || d.fin !== o.fin;
    })
    .map(([id, d]) => ({ id, ...d }));
  if (!changees.length) return renderPlanning();
  appliquerDates(changees);
  renderPlanning();
  renderKpis();
  const r = await appel('projet-taches-dates', { taches: changees });
  if (!r.ok) {
    appliquerDates(changees.map((c) => ({ id: c.id, ...s.avant.get(c.id) })));
    renderPlanning();
    return toast(r.erreur || 'Enregistrement impossible', { erreur: true });
  }
  const anciennes = changees.map((c) => ({ id: c.id, ...s.avant.get(c.id) }));
  toast(changees.length > 1 ? `${changees.length} tâches déplacées` : 'Tâche déplacée', {
    action: async () => {
      appliquerDates(anciennes);
      render();
      const r2 = await appel('projet-taches-dates', { taches: anciennes });
      if (!r2.ok) toast(r2.erreur || 'Annulation impossible', { erreur: true });
    },
  });
}
function appliquerDates(liste) {
  for (const c of liste) {
    const t = tache(c.id);
    if (t) Object.assign(t, { debut: c.debut, fin: c.fin });
  }
}

/* ── Réordonner les couloirs (glisser le nom, mode édition) ── */
let couloirSaisi = null;
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest && e.target.closest('[data-couloir]');
  if (!c || !P.edition) return;
  couloirSaisi = +c.dataset.couloir;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(couloirSaisi));
});
document.addEventListener('dragover', (e) => {
  const c = e.target.closest && e.target.closest('[data-couloir]');
  if (!c || couloirSaisi == null) return;
  e.preventDefault();
  document.querySelectorAll('.pj-couloir-nom.survol').forEach((x) => x.classList.remove('survol'));
  c.classList.add('survol');
});
document.addEventListener('drop', async (e) => {
  const c = e.target.closest && e.target.closest('[data-couloir]');
  if (!c || couloirSaisi == null) return;
  e.preventDefault();
  const cible = +c.dataset.couloir;
  const ids = P.couloirs.map((x) => x.id).filter((id) => id !== couloirSaisi);
  ids.splice(ids.indexOf(cible), 0, couloirSaisi);
  couloirSaisi = null;
  P.couloirs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  renderPlanning();
  const r = await appel('projet-couloirs-ordre', { ids });
  if (!r.ok) toast(r.erreur || 'Enregistrement impossible', { erreur: true });
});
document.addEventListener('dragend', () => {
  couloirSaisi = null;
  document.querySelectorAll('.pj-couloir-nom.survol').forEach((x) => x.classList.remove('survol'));
});

/* ════════════════ Panneaux (détail / édition) ════════════════ */

let auFermer = null;
function ouvrirPanneau(html, lier) {
  const p = $('pj-panneau');
  p.innerHTML = `<button type="button" class="pj-fermer" data-fermer aria-label="Fermer">✕</button>${html}`;
  p.hidden = false;
  $('pj-voile').hidden = false;
  if (lier) lier(p);
  const champ = p.querySelector('input:not([type=hidden]), textarea, select');
  (champ || p.querySelector('[data-fermer]')).focus();
}
function fermerPanneau() {
  $('pj-panneau').hidden = true;
  $('pj-voile').hidden = true;
  if (auFermer) auFermer();
  auFermer = null;
}
const seg = (nom, options, valeur) =>
  `<div class="pj-seg" data-seg="${nom}" role="group">${Object.entries(options)
    .map(([v, l]) => `<button type="button" data-val="${v}" class="${v === valeur ? 'actif' : ''}">${l}</button>`)
    .join('')}</div>`;
const valeurSeg = (p, nom) => (p.querySelector(`[data-seg="${nom}"] .actif`) || {}).dataset?.val;

function ouvrirTache(id) {
  const t = id ? tache(id) : null;
  if (!P.edition) return t && detailTache(t);
  const debutDefaut = auj();
  const v = t || {
    type: 'tache',
    titre: '',
    debut: debutDefaut,
    fin: versIso(enJours(debutDefaut) + 6),
    couloir: P.couloirs[0] && P.couloirs[0].id,
    statut: 'a-faire',
    avancement: 0,
    avant: [],
    principal: false,
    note: '',
  };
  const etat = { avant: [...v.avant] };
  const optionsAvant = () =>
    P.taches
      .filter((x) => x.id !== (t && t.id) && !etat.avant.includes(x.id))
      .sort((a, b) => a.debut.localeCompare(b.debut))
      .map((x) => `<option value="${x.id}">${echapper(x.titre)} (${frCourt(x.debut)})</option>`)
      .join('');
  const chipsAvant = () =>
    etat.avant
      .map((x) => tache(x))
      .filter(Boolean)
      .map(
        (x) =>
          `<span class="pj-chip">${echapper(x.titre)}<button type="button" data-retirer-avant="${x.id}" aria-label="Retirer le lien">✕</button></span>`,
      )
      .join('');
  ouvrirPanneau(
    `<span class="cvdl-surtitre" style="color:var(--tur)">${t ? 'Modifier' : 'Nouvelle'} ${v.type === 'jalon' ? 'jalon' : 'tâche'}</span>
    <h2 id="pj-panneau-titre">${t ? echapper(t.titre) : 'Ajouter au rétroplanning'}</h2>
    <div class="pj-ch"><span class="lab">Type</span>${seg('type', { tache: 'Tâche', jalon: 'Jalon' }, v.type)}</div>
    <div class="pj-ch"><label for="pj-f-titre">Titre</label><input class="input" id="pj-f-titre" maxlength="120" value="${echapper(v.titre)}"></div>
    <div class="pj-2"><div class="pj-ch"><label for="pj-f-debut" id="pj-l-debut">${v.type === 'jalon' ? 'Date' : 'Début'}</label><input class="input" type="date" id="pj-f-debut" value="${v.debut}"></div>
      <div class="pj-ch" id="pj-z-fin" ${v.type === 'jalon' ? 'hidden' : ''}><label for="pj-f-fin">Fin</label><input class="input" type="date" id="pj-f-fin" value="${v.fin}"></div></div>
    <div class="pj-ch"><label for="pj-f-couloir">Couloir</label><select class="input" id="pj-f-couloir">${P.couloirs
      .map((c) => `<option value="${c.id}" ${c.id === v.couloir ? 'selected' : ''}>${echapper(c.nom)}</option>`)
      .join('')}</select></div>
    <div class="pj-ch"><span class="lab">Statut</span>${seg('statut', STATUTS, v.statut)}</div>
    <div class="pj-ch" id="pj-z-avancement" ${v.type === 'jalon' ? 'hidden' : ''}><label for="pj-f-avancement">Avancement · <span id="pj-v-avancement">${v.avancement}</span> %</label><input type="range" id="pj-f-avancement" min="0" max="100" step="5" value="${v.avancement}" style="width:100%"></div>
    <div class="pj-ch"><span class="lab">Doit être fini avant</span><div class="pj-chips" id="pj-avant">${chipsAvant()}</div>
      <select class="input" id="pj-f-avant" style="margin-top:8px"><option value="">＋ Lier une tâche…</option>${optionsAvant()}</select></div>
    <label class="pj-case" id="pj-z-principal" ${v.type === 'jalon' ? '' : 'hidden'}><input type="checkbox" id="pj-f-principal" ${v.principal ? 'checked' : ''}> Jalon principal (compte à rebours en haut de page)</label>
    <div class="pj-ch"><label for="pj-f-note">Note</label><textarea class="input" id="pj-f-note" rows="3" maxlength="2000">${echapper(v.note)}</textarea></div>
    <p class="pj-erreur" id="pj-f-erreur" role="alert"></p>
    <div class="pj-actions"><button type="button" class="btn btn-primary" id="pj-f-enregistrer">Enregistrer</button><button type="button" class="btn btn-secondary" data-fermer>Annuler</button><span class="espace"></span>${
      t ? '<button type="button" class="btn btn-danger" id="pj-f-supprimer">Supprimer</button>' : ''
    }</div>`,
    (p) => {
      const majType = () => {
        const jalon = valeurSeg(p, 'type') === 'jalon';
        $('pj-z-fin').hidden = jalon;
        $('pj-z-avancement').hidden = jalon;
        $('pj-z-principal').hidden = !jalon;
        $('pj-l-debut').textContent = jalon ? 'Date' : 'Début';
      };
      p.addEventListener('click', (e) => {
        const b = e.target.closest('[data-seg] button');
        if (b) {
          b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('actif', x === b));
          majType();
        }
        const r = e.target.closest('[data-retirer-avant]');
        if (r) {
          etat.avant = etat.avant.filter((x) => x !== +r.dataset.retirerAvant);
          $('pj-avant').innerHTML = chipsAvant();
          $('pj-f-avant').innerHTML = `<option value="">＋ Lier une tâche…</option>${optionsAvant()}`;
        }
      });
      $('pj-f-avant').addEventListener('change', (e) => {
        if (!e.target.value) return;
        etat.avant.push(+e.target.value);
        $('pj-avant').innerHTML = chipsAvant();
        e.target.innerHTML = `<option value="">＋ Lier une tâche…</option>${optionsAvant()}`;
      });
      $('pj-f-avancement').addEventListener('input', (e) => ($('pj-v-avancement').textContent = e.target.value));
      $('pj-f-enregistrer').addEventListener('click', async () => {
        const type = valeurSeg(p, 'type');
        const donnees = {
          id: t ? t.id : '',
          type,
          titre: $('pj-f-titre').value,
          debut: $('pj-f-debut').value,
          fin: type === 'jalon' ? $('pj-f-debut').value : $('pj-f-fin').value,
          couloir: $('pj-f-couloir').value,
          statut: valeurSeg(p, 'statut'),
          avancement: $('pj-f-avancement').value,
          avant: etat.avant,
          principal: $('pj-f-principal').checked,
          note: $('pj-f-note').value,
        };
        await enregistrer('projet-tache', donnees, t ? 'Tâche enregistrée' : 'Tâche ajoutée');
      });
      if (t)
        $('pj-f-supprimer').addEventListener('click', async () => {
          if (!confirm(`Supprimer « ${t.titre} » ?`)) return;
          await enregistrer('projet-tache', { id: t.id, supprimer: true }, 'Tâche supprimée');
        });
    },
  );
}

function detailTache(t) {
  const c = P.couloirs.find((x) => x.id === t.couloir);
  const liees = t.avant.map(tache).filter(Boolean);
  const avant = P.taches.filter((x) => x.avant.includes(t.id));
  const duree = enJours(t.fin) - enJours(t.debut) + 1;
  ouvrirPanneau(`<span class="cvdl-surtitre" style="color:${COULEURS[c ? c.couleur : 'navy']}">${echapper(c ? c.nom : '')}</span>
    <h2 id="pj-panneau-titre">${echapper(t.titre)}</h2>
    <dl class="pj-lecture">
      <dt>${t.type === 'jalon' ? 'Date' : 'Période'}</dt><dd>${
        t.type === 'jalon' ? frDate(t.debut) : `${frDate(t.debut)} → ${frDate(t.fin)} · ${pluriel(duree, 'jour')}`
      }</dd>
      <dt>Statut</dt><dd>${STATUTS[t.statut]}${enRetard(t) ? ' · <b style="color:var(--rouge)">en retard</b>' : ''}</dd>
      ${t.type === 'tache' ? `<dt>Avancement · ${t.avancement} %</dt><dd><div class="pj-jauge"><div style="width:${t.avancement}%"></div></div></dd>` : ''}
      ${avant.length ? `<dt>Après</dt><dd>${avant.map((x) => echapper(x.titre)).join(', ')}</dd>` : ''}
      ${liees.length ? `<dt>Doit être fini avant</dt><dd>${liees.map((x) => echapper(x.titre)).join(', ')}</dd>` : ''}
      ${t.note ? `<dt>Note</dt><dd>${echapper(t.note)}</dd>` : ''}
    </dl>`);
}

function ouvrirCouloir(id) {
  const c = id ? P.couloirs.find((x) => x.id === id) : { nom: '', couleur: 'navy' };
  const nb = id ? P.taches.filter((t) => t.couloir === id).length : 0;
  ouvrirPanneau(
    `<span class="cvdl-surtitre" style="color:var(--tur)">${id ? 'Modifier le couloir' : 'Nouveau couloir'}</span>
    <h2 id="pj-panneau-titre">${id ? echapper(c.nom) : 'Ajouter un couloir'}</h2>
    <div class="pj-ch"><label for="pj-c-nom">Nom</label><input class="input" id="pj-c-nom" maxlength="60" value="${echapper(c.nom)}"></div>
    <div class="pj-ch"><span class="lab">Couleur</span><div class="pj-couleurs" id="pj-c-couleurs">${Object.entries(
      COULEURS,
    )
      .map(
        ([k, v]) =>
          `<button type="button" data-couleur="${k}" style="--c:${v}" class="${k === c.couleur ? 'actif' : ''}" title="${NOMS_COULEURS[k]}" aria-label="${NOMS_COULEURS[k]}"></button>`,
      )
      .join('')}</div></div>
    ${id ? `<p class="pj-sous" style="margin:0 0 12px">${nb ? `${pluriel(nb, 'tâche')} dans ce couloir.` : 'Couloir vide.'}</p>` : ''}
    <p class="pj-erreur" id="pj-f-erreur" role="alert"></p>
    <div class="pj-actions"><button type="button" class="btn btn-primary" id="pj-c-enregistrer">Enregistrer</button><button type="button" class="btn btn-secondary" data-fermer>Annuler</button><span class="espace"></span>${
      id
        ? `<button type="button" class="btn btn-danger" id="pj-c-supprimer" ${nb ? 'disabled title="Déplacez ou supprimez d’abord ses tâches"' : ''}>Supprimer</button>`
        : ''
    }</div>`,
    (p) => {
      p.addEventListener('click', (e) => {
        const b = e.target.closest('[data-couleur]');
        if (b) p.querySelectorAll('[data-couleur]').forEach((x) => x.classList.toggle('actif', x === b));
      });
      $('pj-c-enregistrer').addEventListener('click', () =>
        enregistrer(
          'projet-couloir',
          {
            id: id || '',
            nom: $('pj-c-nom').value,
            couleur: (p.querySelector('[data-couleur].actif') || {}).dataset?.couleur || 'navy',
          },
          'Couloir enregistré',
        ),
      );
      if (id)
        $('pj-c-supprimer').addEventListener('click', async () => {
          if (!confirm(`Supprimer le couloir « ${c.nom} » ?`)) return;
          await enregistrer('projet-couloir', { id, supprimer: true }, 'Couloir supprimé');
        });
    },
  );
}

function ouvrirEntree(cle) {
  const e = cle ? entreesJournal().find((x) => x.cle === cle) : null;
  const manuelle = !e || e.source === 'manuel';
  const v = e || { titre: '', date: auj(), categories: [], texteCorrige: '', masque: false, epingle: false };
  ouvrirPanneau(
    `<span class="cvdl-surtitre" style="color:var(--tur)">${
      e ? (manuelle ? 'Entrée ajoutée à la main' : 'Entrée du changelog') : 'Nouvelle entrée'
    }</span>
    <h2 id="pj-panneau-titre">${e ? echapper(e.titre) : 'Ajouter au journal'}</h2>
    ${manuelle ? '' : '<p class="pj-sous" style="margin:-8px 0 14px">Lue dans CHANGELOG-CVDL.md. Les modifications ci-dessous la corrigent sur cette page, sans toucher au fichier.</p>'}
    <div class="pj-ch"><label for="pj-j-titre">Titre</label><input class="input" id="pj-j-titre" maxlength="200" value="${echapper(v.titre)}"></div>
    <div class="pj-ch"><label for="pj-j-date">Date</label><input class="input" type="date" id="pj-j-date" value="${v.date || ''}"></div>
    <div class="pj-ch"><span class="lab">Catégories</span><div class="pj-chips">${Object.keys(CATEGORIES)
      .map(
        (c) =>
          `<button type="button" class="pj-chip choix ${v.categories.includes(c) ? 'actif' : ''}" data-categorie="${c}" aria-pressed="${v.categories.includes(c)}">${c}</button>`,
      )
      .join('')}</div></div>
    <div class="pj-ch"><label for="pj-j-texte">Texte (un point par ligne)</label><textarea class="input" id="pj-j-texte" rows="6" maxlength="5000" placeholder="${
      manuelle ? 'Ce qui a changé, une ligne par point.' : 'Laisser vide pour garder le texte du changelog.'
    }">${echapper(v.texteCorrige || '')}</textarea></div>
    <label class="pj-case"><input type="checkbox" id="pj-j-epingle" ${v.epingle ? 'checked' : ''}> Mettre en avant (« À la une »)</label>
    <label class="pj-case"><input type="checkbox" id="pj-j-masque" ${v.masque ? 'checked' : ''}> Masquer de la page publique</label>
    <p class="pj-erreur" id="pj-f-erreur" role="alert"></p>
    <div class="pj-actions"><button type="button" class="btn btn-primary" id="pj-j-enregistrer">Enregistrer</button><button type="button" class="btn btn-secondary" data-fermer>Annuler</button><span class="espace"></span>${
      e && e.idCorrection
        ? `<button type="button" class="btn btn-danger" id="pj-j-supprimer">${manuelle ? 'Supprimer' : 'Revenir au changelog'}</button>`
        : ''
    }</div>`,
    (p) => {
      p.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-categorie]');
        if (b) {
          b.classList.toggle('actif');
          b.setAttribute('aria-pressed', String(b.classList.contains('actif')));
        }
      });
      $('pj-j-enregistrer').addEventListener('click', () => {
        const categories = [...p.querySelectorAll('[data-categorie].actif')].map((b) => b.dataset.categorie);
        const titre = $('pj-j-titre').value.trim();
        const date = $('pj-j-date').value;
        enregistrer(
          'projet-journal',
          {
            id: e && e.idCorrection ? e.idCorrection : '',
            cle: manuelle ? '' : e.cle,
            // Pour une entrée du changelog, on n'enregistre que ce qui diffère du fichier.
            titre: manuelle || titre !== e.titre ? titre : '',
            date: manuelle || date !== e.date ? date : '',
            texte: $('pj-j-texte').value,
            categories,
            epingle: $('pj-j-epingle').checked,
            masque: $('pj-j-masque').checked,
          },
          'Journal mis à jour',
        );
      });
      if (e && e.idCorrection)
        $('pj-j-supprimer').addEventListener('click', async () => {
          if (manuelle && !confirm(`Supprimer « ${e.titre} » ?`)) return;
          await enregistrer('projet-journal', { id: e.idCorrection, supprimer: true }, 'Journal mis à jour');
        });
    },
  );
}

async function enregistrer(action, donnees, succes) {
  const bouton = $('pj-panneau').querySelector('.btn-primary');
  if (bouton) bouton.disabled = true;
  const r = await appel(action, donnees);
  if (bouton) bouton.disabled = false;
  if (!r.ok) {
    const zone = $('pj-f-erreur');
    if (zone) zone.textContent = r.erreur || 'Enregistrement impossible.';
    else toast(r.erreur || 'Enregistrement impossible.', { erreur: true });
    return false;
  }
  fermerPanneau();
  await charger();
  render();
  toast(succes);
  return true;
}

/* ════════════════ Rendu du journal ════════════════ */

function renderJournal() {
  const zone = $('pj-vue-journal');
  const toutes = entreesJournal();
  const q = P.recherche.trim().toLowerCase();
  const visibles = toutes.filter(
    (e) =>
      (!e.masque || (P.edition && P.voirMasquees)) &&
      (P.filtre === 'Tout' || e.categories.includes(P.filtre)) &&
      (!q || (e.titre + ' ' + e.blocs.map((b) => b.texte).join(' ')).toLowerCase().includes(q)),
  );
  const filtres = ['Tout', ...Object.keys(CATEGORIES)]
    .map(
      (c) =>
        `<button type="button" class="pj-pil ${P.filtre === c ? 'actif' : ''}" data-filtre="${c}">${
          CATEGORIES[c] ? `<i class="pt" style="--c:${CATEGORIES[c]}"></i>` : ''
        }${c}</button>`,
    )
    .join('');
  let html = `<div class="pj-journal-outils"><div class="pj-filtres">${filtres}</div>
    ${P.edition ? `<label class="pj-case" style="margin:0"><input type="checkbox" id="pj-voir-masquees" ${P.voirMasquees ? 'checked' : ''}> Voir les entrées masquées</label>` : ''}
    <input class="input" type="search" id="pj-recherche" placeholder="Rechercher dans le journal…" value="${echapper(P.recherche)}" aria-label="Rechercher dans le journal"></div>`;

  const une = visibles.filter((e) => e.epingle);
  if (une.length && P.filtre === 'Tout' && !q)
    html += `<div class="pj-une"><span class="cvdl-surtitre">À la une</span>${une.map((e) => htmlEntree(e, true)).join('')}</div>`;
  if (P.edition)
    html += '<button type="button" class="pj-nouvelle" id="pj-nouvelle-entree">＋ Nouvelle entrée</button>';

  // Regroupement par jour, puis par préfixe commun (« Démo : … ») dans un même jour.
  const jours = [];
  for (const e of visibles) {
    const j = jours[jours.length - 1];
    if (j && j.date === e.date) j.entrees.push(e);
    else jours.push({ date: e.date, entrees: [e] });
  }
  if (P.changelogIntrouvable)
    html +=
      '<p class="pj-vide">Le fichier CHANGELOG-CVDL.md n’a pas pu être lu sur ce site : vérifier qu’il est bien publié (fichier <code>.nojekyll</code> présent à la racine sur GitHub Pages).</p>';
  else if (!jours.length) html += '<p class="pj-vide">Aucune entrée ne correspond.</p>';
  const premier = jours[0] && jours[0].entrees[0];
  jours.slice(0, P.joursAffiches).forEach((j) => {
    const groupes = [];
    for (const e of j.entrees) {
      const prefixe = (e.titre.match(/^([^:]{2,30}) : /) || [])[1];
      const g = groupes[groupes.length - 1];
      if (prefixe && g && g.prefixe === prefixe) g.entrees.push(e);
      else groupes.push({ prefixe, entrees: [e] });
    }
    html += `<div class="pj-jour"><div class="pj-jour-date">${
      j.date
        ? `<b>${frCourt(j.date)}</b><small>${j.date.slice(0, 4)}</small>`
        : '<b>Avant</b><small>le suivi daté</small>'
    }</div><div class="pj-jour-liste">${groupes
      .map((g) =>
        g.entrees.length > 1 && !q
          ? htmlGroupe(g, j.date)
          : g.entrees.map((e) => htmlEntree(e, e === premier)).join(''),
      )
      .join('')}</div></div>`;
  });
  if (jours.length > P.joursAffiches)
    html += `<button type="button" class="btn btn-secondary pj-plus" id="pj-plus">Voir les mises à jour plus anciennes</button>`;
  zone.innerHTML = html;
}

function htmlTags(e) {
  return e.categories.map((c) => `<span class="pj-tag" style="--c:${CATEGORIES[c]}">${c}</span>`).join('');
}
function htmlEntree(e, ouvertParDefaut) {
  const ouvert = P.ouverts.has(e.cle) || (ouvertParDefaut && !P.ouverts.has('!' + e.cle));
  const vide = !e.blocs.length;
  return `<article class="pj-entree ${e.masque ? 'masquee' : ''} ${e.epingle ? 'epinglee' : ''}">
    <div class="pj-entree-tete" ${vide ? '' : `data-plier="${echapper(e.cle)}" role="button" tabindex="0" aria-expanded="${ouvert}"`}>
      <h3>${enLigne(e.titre)}</h3>${htmlTags(e)}${e.masque ? '<span class="pj-plie">masquée</span>' : ''}
      ${vide ? '' : `<span class="pj-plie" aria-hidden="true">${ouvert ? '▴' : '▾'}</span>`}
      ${P.edition ? `<button type="button" class="pj-crayon" data-modifier-entree="${echapper(e.cle)}" aria-label="Modifier « ${echapper(e.titre)} »">✎</button>` : ''}
    </div>
    ${ouvert && !vide ? `<div class="pj-entree-corps">${htmlBlocs(e.blocs)}</div>` : ''}
  </article>`;
}
function htmlGroupe(g, date) {
  const cle = `groupe-${date}-${g.prefixe}`;
  const ouvert = P.ouverts.has(cle);
  const categories = [...new Set(g.entrees.flatMap((e) => e.categories))];
  return `<article class="pj-entree pj-groupe">
    <div class="pj-entree-tete" data-plier="${echapper(cle)}" role="button" tabindex="0" aria-expanded="${ouvert}">
      <h3>${echapper(g.prefixe)} : ${pluriel(g.entrees.length, 'mise')} à jour</h3>${htmlTags({ categories })}
      <span class="pj-plie">${ouvert ? 'Replier ▴' : 'Détailler ▾'}</span>
    </div>
    ${ouvert ? `<div class="pj-groupe-corps">${g.entrees.map((e) => htmlEntree(e, false)).join('')}</div>` : ''}
  </article>`;
}

/* ════════════════ Évènements ════════════════ */

function changerVue(vue) {
  P.vue = vue;
  history.replaceState(null, '', '#' + vue);
  render();
}

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-fermer]') || t.id === 'pj-voile') return fermerPanneau();
  const vue = t.closest('[data-vue]');
  if (vue) return changerVue(vue.dataset.vue);
  if (t.closest('#pj-bascule-edition')) {
    P.edition = !P.edition;
    return render();
  }
  const zoom = t.closest('[data-zoom]');
  if (zoom) {
    P.zoom = zoom.dataset.zoom;
    try {
      localStorage.setItem('cvdl-projet-zoom', P.zoom);
    } catch (err) {}
    const d = $('pj-defile');
    if (d) d.scrollLeft = 0;
    renderBarreDroite();
    const ancien = $('pj-vue-planning').querySelector('.pj-defile');
    if (ancien) ancien.remove();
    return renderPlanning();
  }
  if (t.closest('#pj-largeur')) {
    P.pleineLargeur = !P.pleineLargeur;
    try {
      localStorage.setItem('cvdl-projet-largeur', P.pleineLargeur ? 'pleine' : 'limitee');
    } catch (err) {}
    return render();
  }
  if (t.closest('#pj-aller-auj')) {
    const d = $('pj-defile');
    if (d && geo) d.scrollTo({ left: Math.max(0, (enJours(auj()) - geo.d0) * geo.px - 140), behavior: 'smooth' });
    return;
  }
  if (t.closest('#pj-ajouter-tache')) return P.couloirs.length ? ouvrirTache(null) : ouvrirCouloir(null);
  if (t.closest('[data-ajout-couloir]')) return ouvrirCouloir(null);
  const mc = t.closest('[data-modifier-couloir]');
  if (mc) return ouvrirCouloir(+mc.dataset.modifierCouloir);
  if (!P.edition) {
    const tc = t.closest('[data-tache]');
    if (tc) return ouvrirTache(+tc.dataset.tache);
  }
  if (t.closest('#pj-ajouter-entree, #pj-nouvelle-entree')) return ouvrirEntree(null);
  const me = t.closest('[data-modifier-entree]');
  if (me) return ouvrirEntree(me.dataset.modifierEntree);
  const filtre = t.closest('[data-filtre]');
  if (filtre) {
    P.filtre = filtre.dataset.filtre;
    return renderJournal();
  }
  if (t.closest('#pj-plus')) {
    P.joursAffiches += 12;
    return renderJournal();
  }
  const plier = t.closest('[data-plier]');
  if (plier) {
    const cle = plier.dataset.plier;
    const ouvert = plier.getAttribute('aria-expanded') === 'true';
    P.ouverts.delete(cle);
    P.ouverts.delete('!' + cle);
    P.ouverts.add(ouvert ? '!' + cle : cle);
    return renderJournal();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('pj-panneau').hidden) return fermerPanneau();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-tache], [data-plier]')) {
    e.preventDefault();
    if (e.target.matches('[data-tache]')) ouvrirTache(+e.target.dataset.tache);
    else e.target.click();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'pj-recherche') {
    P.recherche = e.target.value;
    const pos = e.target.selectionStart;
    renderJournal();
    const champ = $('pj-recherche');
    champ.focus();
    champ.setSelectionRange(pos, pos);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'pj-voir-masquees') {
    P.voirMasquees = e.target.checked;
    renderJournal();
  }
});
document.addEventListener('pointerdown', debutSaisie);
document.addEventListener('pointermove', pendantSaisie);
document.addEventListener('pointerup', finSaisie);
document.addEventListener('pointercancel', () => {
  if (saisie) {
    saisie = null;
    renderPlanning();
  }
});

/* Bouton « Partager » dans l'en-tête (construit par cvdl-ui.js). */
document.addEventListener('DOMContentLoaded', () => {
  const actions = document.querySelector('.cvdl-entete-actions');
  if (!actions) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-secondary';
  b.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v14"/></svg>Partager';
  b.addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#' + P.vue;
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien copié');
    } catch (err) {
      prompt('Lien de la page :', url);
    }
  });
  actions.appendChild(b);
});

/* ── Démarrage ── */
(async () => {
  const ancre = location.hash.slice(1);
  if (ancre === 'journal') P.vue = 'journal';
  const [ok] = await Promise.all([charger(), chargerChangelog()]);
  if (!ok) return;
  if (P.jeton) {
    const r = await appel('projet-droits');
    P.peutModifier = !!r.ok;
    if (!P.peutModifier && r.sessionExpiree) {
      try {
        sessionStorage.removeItem('cvdl-admin-jeton');
      } catch (e) {}
      P.jeton = '';
    }
  }
  P.edition = P.peutModifier && ancre === 'edition';
  if (ancre === 'edition') history.replaceState(null, '', '#' + P.vue);
  render();
})();
