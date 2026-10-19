/* Répartition de distribution autonome (distribution-autonome.html) : programmes et répartition
   prévisionnelle par structure (repartition.js), sans compte ni serveur. Données dans ce
   navigateur, sauvegarde par fichier (autonome.js). */
const CLE = 'cvdl-autonome-distribution';
const MODULE = 'distribution';
const D = { programmes: [], selection: null, ...window.AutonomeCvdl.lire(CLE, {}) };
const entier = (v) => Math.max(0, parseInt(v, 10) || 0);
const courant = () => D.programmes.find((p) => p.id === D.selection);
const total = (p) => (p.repartition || []).reduce((t, l) => t + l.quantite, 0);
const objectifDe = (p) => p.objectifGlobal || p.objectifs.reduce((t, x) => t + x.quantite, 0);

function sauver() {
  if (!window.AutonomeCvdl.ecrire(CLE, D)) {
    $('da-alerte').textContent = 'Enregistrement impossible dans ce navigateur (stockage plein ou bloqué) : exportez.';
    return false;
  }
  return true;
}

/* ── Liste des programmes et vue par structure ── */
function renderListe() {
  $('da-liste').innerHTML = D.programmes.length
    ? D.programmes
        .map((p) => {
          const obj = objectifDe(p);
          const tot = total(p);
          return `<button type="button" class="da-prog${p.id === D.selection ? ' on' : ''}" data-prog="${p.id}">
            <b>${echapper(p.nom || 'Sans nom')}</b>
            <small>${tot}${obj ? ` / ${obj}` : ''} appareils prévus · ${(p.repartition || []).length} structure${(p.repartition || []).length > 1 ? 's' : ''}</small>
            ${obj ? `<i class="da-jauge"><i style="width:${Math.min(100, (tot / obj) * 100)}%"></i></i>` : ''}</button>`;
        })
        .join('')
    : '<p class="da-vide">Aucun programme pour l’instant.</p>';
  // Toutes structures confondues : où part le matériel, programme par programme.
  const parStructure = {};
  D.programmes.forEach((p) =>
    (p.repartition || []).forEach((l) => {
      const k = l.nom.toLowerCase();
      parStructure[k] = parStructure[k] || { nom: l.nom, total: 0, programmes: 0 };
      parStructure[k].total += l.quantite;
      parStructure[k].programmes++;
    }),
  );
  const lignes = Object.values(parStructure).sort((a, b) => b.total - a.total);
  $('da-structures').hidden = !lignes.length || D.programmes.length < 2;
  $('da-structures-liste').innerHTML = lignes
    .map(
      (s) =>
        `<li><span>${echapper(s.nom)}<small>${s.programmes} programme${s.programmes > 1 ? 's' : ''}</small></span><b>${s.total}</b></li>`,
    )
    .join('');
}

/* ── Fiche du programme sélectionné ── */
function renderFiche() {
  const p = courant();
  $('da-fiche').hidden = !p;
  $('da-accueil').hidden = !!p;
  if (!p) return;
  $('da-nom').value = p.nom;
  $('da-objectif').value = p.objectifGlobal || '';
  $('da-debut').value = p.debut || '';
  $('da-butoir').value = p.butoir || '';
  renderCategories();
  monter();
}

function renderCategories() {
  const p = courant();
  $('da-categories').innerHTML = p.objectifs
    .map(
      (x, i) => `<div class="da-cat">
        <input class="input" value="${echapper(x.produit)}" data-cat-produit="${i}" maxlength="120" placeholder="Catégorie (ex. PC portable)" aria-label="Catégorie">
        <input class="input" type="number" min="0" value="${x.quantite || ''}" data-cat-quantite="${i}" placeholder="Objectif" aria-label="Objectif de la catégorie">
        <button type="button" class="da-retirer" data-cat-retirer="${i}" aria-label="Retirer la catégorie">✕</button></div>`,
    )
    .join('');
}

/** (Re)monte la répartition : nouvel élément, l'ancien emporte ses écouteurs. */
function monter() {
  const p = courant();
  const zone = document.createElement('div');
  $('da-repartition').replaceChildren(zone);
  window.RepartitionCvdl.monter(zone, {
    lignes: p.repartition,
    objectifGlobal: p.objectifGlobal,
    objectifs: p.objectifs.filter((x) => x.produit),
    structures: [],
    realise: null,
    enregistrer: (lignes) => {
      p.repartition = lignes.map((l) => ({ ...l, parProduit: { ...l.parProduit } }));
      const ok = sauver();
      renderListe();
      return { ok };
    },
  });
}

/** Retire des lignes le détail d'une catégorie disparue ; la quantité suit le détail restant. */
function nettoyerDetail(p) {
  const produits = new Set(p.objectifs.map((x) => x.produit).filter(Boolean));
  p.repartition.forEach((l) => {
    const avant = Object.keys(l.parProduit || {});
    if (!avant.length) return;
    l.parProduit = Object.fromEntries(Object.entries(l.parProduit).filter(([k]) => produits.has(k)));
    if (Object.keys(l.parProduit).length !== avant.length)
      l.quantite = Object.values(l.parProduit).reduce((t, x) => t + x, 0);
  });
}

let minuteurReglages = null;
function reglagesChanges(remonter) {
  const p = courant();
  p.nom = $('da-nom').value.trim().slice(0, 150);
  p.objectifGlobal = entier($('da-objectif').value);
  p.debut = $('da-debut').value;
  p.butoir = $('da-butoir').value;
  sauver();
  renderListe();
  if (remonter) {
    clearTimeout(minuteurReglages);
    minuteurReglages = setTimeout(monter, 400);
  }
}

/* ── Événements ── */
document.addEventListener('click', async (e) => {
  const prog = e.target.closest('[data-prog]');
  if (prog) {
    D.selection = Number(prog.dataset.prog);
    sauver();
    renderListe();
    renderFiche();
    return;
  }
  if (e.target.closest('#da-nouveau')) {
    const id = Math.max(0, ...D.programmes.map((p) => p.id)) + 1;
    D.programmes.push({
      id,
      nom: `Programme ${id}`,
      objectifGlobal: 0,
      objectifs: [],
      debut: '',
      butoir: '',
      repartition: [],
    });
    D.selection = id;
    sauver();
    renderListe();
    renderFiche();
    $('da-nom').select();
    return;
  }
  if (e.target.closest('#da-supprimer')) {
    const p = courant();
    if (!confirm(`Supprimer « ${p.nom} » et sa répartition ?`)) return;
    D.programmes = D.programmes.filter((x) => x !== p);
    D.selection = D.programmes.length ? D.programmes[0].id : null;
    sauver();
    renderListe();
    renderFiche();
    return;
  }
  if (e.target.closest('#da-ajouter-cat')) {
    courant().objectifs.push({ produit: '', quantite: 0 });
    renderCategories();
    $('da-categories').querySelector('.da-cat:last-child input').focus();
    return;
  }
  const retirer = e.target.closest('[data-cat-retirer]');
  if (retirer) {
    const p = courant();
    p.objectifs.splice(Number(retirer.dataset.catRetirer), 1);
    nettoyerDetail(p);
    sauver();
    renderCategories();
    renderListe();
    monter();
    return;
  }
  if (e.target.closest('#auto-exporter')) window.AutonomeCvdl.exporter(MODULE, { programmes: D.programmes });
  if (e.target.closest('#auto-importer')) {
    try {
      const n = await window.AutonomeCvdl.importer(MODULE);
      if (!Array.isArray(n.programmes)) throw new Error('Fichier incomplet.');
      if (D.programmes.length && !confirm('Remplacer les programmes de ce navigateur par ceux du fichier ?')) return;
      D.programmes = n.programmes.map(programmeValide);
      D.selection = D.programmes.length ? D.programmes[0].id : null;
      sauver();
      renderListe();
      renderFiche();
    } catch (err) {
      alert(err.message);
    }
  }
});

document.addEventListener('input', (e) => {
  if (['da-nom', 'da-debut', 'da-butoir'].includes(e.target.id)) reglagesChanges(false);
  if (e.target.id === 'da-objectif') reglagesChanges(true);
  const i = e.target.dataset.catProduit ?? e.target.dataset.catQuantite;
  if (i !== undefined) {
    const x = courant().objectifs[Number(i)];
    if (e.target.dataset.catProduit !== undefined) x.produit = e.target.value.trim().slice(0, 120);
    else x.quantite = entier(e.target.value);
    nettoyerDetail(courant());
    reglagesChanges(true);
  }
});

/** Programme lu dans un fichier importé : champs attendus, valeurs bornées. */
function programmeValide(p, i) {
  const txt = (v, max) => String(v == null ? '' : v).slice(0, max);
  const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  return {
    id: entier(p.id) || i + 1,
    nom: txt(p.nom, 150),
    objectifGlobal: entier(p.objectifGlobal),
    objectifs: (Array.isArray(p.objectifs) ? p.objectifs : [])
      .slice(0, 30)
      .map((x) => ({ produit: txt(x.produit, 120), quantite: entier(x.quantite) })),
    debut: date(p.debut),
    butoir: date(p.butoir),
    repartition: (Array.isArray(p.repartition) ? p.repartition : []).slice(0, 200).map((l) => ({
      structureId: null,
      nom: txt(l.nom, 150),
      quantite: entier(l.quantite),
      parProduit: Object.fromEntries(
        Object.entries(l.parProduit && typeof l.parProduit === 'object' ? l.parProduit : {}).map(([k, v]) => [
          txt(k, 120),
          entier(v),
        ]),
      ),
    })),
  };
}

D.programmes = D.programmes.map(programmeValide);
if (!courant() && D.programmes.length) D.selection = D.programmes[0].id;
renderListe();
renderFiche();
