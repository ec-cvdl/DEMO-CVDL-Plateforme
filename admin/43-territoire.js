/* Admin CVDL — filtre « Territoire » (région, département) commun aux onglets. Le filtre est
   appliqué au rendu : render() (04) affiche les vues avec les structures, commandes, SAV, devis,
   factures et programmes du territoire choisi, puis rend les listes complètes (les actions
   gardent tout). Le département d'une structure est le sien (obligatoire depuis la migration
   050), sinon celui du code postal de son adresse. Préfixe ter-. */

/** Onglets qui affichent la barre et suivent le filtre (Finances garde ses propres filtres,
 *  synchronisés avec celui-ci). */
const ONGLETS_TERRITOIRE = [
  'dashboard',
  'commandes',
  'sav',
  'factures',
  'structures',
  'distribution',
  'calendrier',
  'bilan',
];

state.filtreTerritoire = (() => {
  try {
    return JSON.parse(localStorage.getItem('cvdl-admin-territoire')) || { region: '', departement: '' };
  } catch (e) {
    return { region: '', departement: '' };
  }
})();
state.departements = state.departements || [];

const deptStructure = (s) => (s && (s.departement || departementDeAdresse(s.adresse))) || '';
const nomDepartement = (code) => {
  const d = (state.departements || []).find((x) => x.code === code);
  return d ? `${d.code} · ${d.nom}` : code || '—';
};
function structureDansTerritoire(s, f = state.filtreTerritoire) {
  if (!s) return false;
  if (f.departement) return deptStructure(s) === f.departement;
  if (f.region) return s.region === f.region;
  return true;
}
const territoireActif = () => !!(state.filtreTerritoire.region || state.filtreTerritoire.departement);

/** Remplace les listes de state par celles du territoire ; renvoie la fonction qui les rend. */
function appliquerFiltreTerritoire() {
  if (!territoireActif() || !ONGLETS_TERRITOIRE.includes(state.activeTab)) return () => {};
  const f = state.filtreTerritoire;
  const brut = {
    structures: state.structures,
    commandes: state.commandes,
    sav: state.sav,
    devis: state.devis,
    factures: state.factures,
    distributions: state.distributions,
  };
  const dedans = brut.structures.filter((s) => structureDansTerritoire(s));
  const codes = new Set(dedans.map((s) => s.code));
  const noms = new Set(dedans.map((s) => s.nom));
  const parCode = (x) => codes.has(x.code) || (!x.code && noms.has(x.nomStructure || x.nom));
  state.structures = dedans;
  state.commandes = (brut.commandes || []).filter(parCode);
  state.sav = (brut.sav || []).filter(parCode);
  state.devis = (brut.devis || []).filter(parCode);
  state.factures = (brut.factures || []).filter(parCode);
  // Programmes : nationaux, ou dont le périmètre touche le territoire.
  state.distributions = (brut.distributions || []).filter((p) => {
    const per = p.perimetre || {};
    if (per.structures && per.structures.length) return per.structures.some((c) => codes.has(c));
    const dep = (per.departements || []).length;
    const reg = (per.regions || []).length;
    if (!dep && !reg) return true;
    if (f.departement)
      return (
        (per.departements || []).includes(f.departement) ||
        (!dep && (per.regions || []).includes((state.departements.find((d) => d.code === f.departement) || {}).region))
      );
    return (
      (per.regions || []).includes(f.region) ||
      (per.departements || []).some((c) => (state.departements.find((d) => d.code === c) || {}).region === f.region)
    );
  });
  return () => Object.assign(state, brut);
}

/** Barre du filtre, en tête des onglets concernés. */
function barreTerritoire() {
  if (!ONGLETS_TERRITOIRE.includes(state.activeTab)) return '';
  const f = state.filtreTerritoire;
  const toutes = state.structures; // listes complètes : la barre est ajoutée après le rendu
  const compte = (pred) => toutes.filter(pred).length;
  const regions = (state.regions || []).filter((r) => compte((s) => s.region === r));
  const deps = (state.departements || []).filter(
    (d) => (!f.region || d.region === f.region) && compte((s) => deptStructure(s) === d.code),
  );
  const sansDep = compte((s) => !deptStructure(s));
  const opt = (v, l, actif) => `<option value="${echapper(v)}"${actif ? ' selected' : ''}>${echapper(l)}</option>`;
  if (!regions.length && !deps.length) return '';
  return `<div class="ter-barre" role="group" aria-label="Filtrer par territoire">
    <span class="ter-ic" aria-hidden="true">${icon('pin', 16)}</span>
    <label class="ter-champ"><span>Région</span><select class="input" data-ter="region">${opt('', `Toutes (${toutes.length})`, !f.region)}${regions
      .map((r) => opt(r, `${r} (${compte((s) => s.region === r)})`, f.region === r))
      .join('')}</select></label>
    <label class="ter-champ"><span>Département</span><select class="input" data-ter="departement">${opt('', 'Tous', !f.departement)}${deps
      .map((d) =>
        opt(d.code, `${d.code} · ${d.nom} (${compte((s) => deptStructure(s) === d.code)})`, f.departement === d.code),
      )
      .join('')}</select></label>
    ${territoireActif() ? `<span class="ter-actif">${echapper(f.departement ? nomDepartement(f.departement) : f.region)}</span><button type="button" class="ter-reinit" data-ter-reinit>Tout le territoire</button>` : ''}
    ${sansDep && state.activeTab === 'structures' ? `<span class="ter-alerte" title="Structures créées avant les départements, sans code postal lisible">${sansDep} sans département</span>` : ''}
  </div>`;
}

function changerTerritoire(region, departement) {
  state.filtreTerritoire = { region, departement };
  try {
    localStorage.setItem('cvdl-admin-territoire', JSON.stringify(state.filtreTerritoire));
  } catch (e) {}
  if (typeof fin !== 'undefined') {
    fin.filtres.region = region;
    fin.filtres.departement = departement;
    fin.d = null;
  }
  render();
}
document.addEventListener('change', (e) => {
  const s = e.target.closest && e.target.closest('[data-ter]');
  if (!s) return;
  const f = state.filtreTerritoire;
  if (s.dataset.ter === 'region') return changerTerritoire(s.value, '');
  const d = state.departements.find((x) => x.code === s.value);
  changerTerritoire(d ? d.region : f.region, s.value);
});
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-ter-reinit]')) changerTerritoire('', '');
});

/** Chiffres par territoire (onglet Statistiques) : structures, commandes, appareils commandés
 *  et livrés, SAV ouverts, montant facturé sur l'année affichée, regroupés par `cleDe(structure)`
 *  ('' = sans territoire). */
function chiffresTerritoire(annee, cleDe) {
  const lignes = new Map();
  const ligne = (cle) => {
    if (!lignes.has(cle))
      lignes.set(cle, { cle, structures: 0, commandes: 0, appareils: 0, livres: 0, sav: 0, facture: 0 });
    return lignes.get(cle);
  };
  const deCode = new Map(state.structures.map((s) => [s.code, cleDe(s) || '']));
  const deNom = new Map(state.structures.map((s) => [s.nom, cleDe(s) || '']));
  state.structures.forEach((s) => ligne(cleDe(s) || '').structures++);
  const dansAnnee = (d) => {
    const iso = dateVersISO(d);
    return iso && new Date(iso).getFullYear() === annee;
  };
  state.commandes
    .filter((c) => c.statutCommande !== 'Annulée' && dansAnnee(c.date) && deCode.has(c.code))
    .forEach((c) => {
      const l = ligne(deCode.get(c.code));
      const n = (c.lignes || []).reduce((t, x) => t + (parseInt(x.quantite, 10) || 0), 0);
      l.commandes++;
      l.appareils += n;
      if (c.statutCommande === 'Livrée') l.livres += n;
    });
  savOuvertsListe()
    .filter((t) => deCode.has(t.code))
    .forEach((t) => ligne(deCode.get(t.code)).sav++);
  state.factures
    .filter((f) => dansAnnee(f.date))
    .forEach((f) => {
      const cle = deCode.has(f.code) ? deCode.get(f.code) : deNom.get(f.nomStructure);
      if (cle !== undefined) ligne(cle).facture += parseFloat(f.montantTotal) || 0;
    });
  return [...lignes.values()].sort((a, b) => b.appareils - a.appareils || b.structures - a.structures);
}

/** Tableau comparatif : une ligne par territoire (cliquable) et une ligne Total. */
function tableauTerritoire(titre, colonne, annee, liste, libelle, attribut, aide) {
  if (!liste.length) return '';
  const max = Math.max(1, ...liste.map((l) => l.appareils));
  const total = liste.reduce(
    (t, l) => {
      ['structures', 'commandes', 'appareils', 'livres', 'sav', 'facture'].forEach((k) => (t[k] += l[k]));
      return t;
    },
    { structures: 0, commandes: 0, appareils: 0, livres: 0, sav: 0, facture: 0 },
  );
  const cellules = (l, barre) => `
        <span role="cell">${l.structures}</span><span role="cell">${l.commandes}</span>
        <span role="cell" class="ter-barre-cell">${barre ? `<i style="width:${Math.round((l.appareils / max) * 100)}%"></i>` : ''}<em>${l.appareils}</em></span>
        <span role="cell">${l.livres}${l.appareils ? ` <small>(${Math.round((l.livres / l.appareils) * 100)} %)</small>` : ''}</span><span role="cell">${l.sav}</span><span role="cell">${formaterMontant(l.facture)}</span>`;
  return `<section class="ter-stats">
    <h2>${titre} <small>${annee}</small></h2>
    <div class="ter-tableau" role="table">
      <div class="ter-ligne ter-tete" role="row"><span role="columnheader">${colonne}</span><span role="columnheader">Structures</span><span role="columnheader">Commandes</span><span role="columnheader">Appareils commandés</span><span role="columnheader">Livrés</span><span role="columnheader">SAV ouverts</span><span role="columnheader">Facturé</span></div>
      ${liste
        .map((l) =>
          l.cle
            ? `<button type="button" class="ter-ligne" role="row" ${attribut}="${echapper(l.cle)}" title="Filtrer sur ${echapper(libelle(l.cle))}"><span role="cell"><b>${echapper(libelle(l.cle))}</b></span>${cellules(l, true)}</button>`
            : `<div class="ter-ligne ter-sans" role="row"><span role="cell"><b>Non renseigné</b></span>${cellules(l, true)}</div>`,
        )
        .join('')}
      ${liste.length > 1 ? `<div class="ter-ligne ter-total" role="row"><span role="cell"><b>Total</b></span>${cellules(total, false)}</div>` : ''}
    </div>
    <p class="ter-aide">${aide}</p>
  </section>`;
}

/** Statistiques : au niveau national, comparaison des régions puis des départements ; dans une
 *  région, ses départements ; dans un département, rien de plus (tout l'onglet le concerne). */
function sectionTerritoiresStats(annee) {
  const f = state.filtreTerritoire;
  if (f.departement) return '';
  const regions = f.region
    ? ''
    : tableauTerritoire(
        'Par région',
        'Région',
        annee,
        chiffresTerritoire(annee, (s) => s.region),
        (r) => r,
        'data-ter-reg',
        'Cliquez sur une région pour voir ses départements et filtrer tout l’admin dessus.',
      );
  return (
    regions +
    tableauTerritoire(
      f.region ? `Par département — ${echapper(f.region)}` : 'Par département',
      'Département',
      annee,
      chiffresTerritoire(annee, deptStructure),
      nomDepartement,
      'data-ter-dep',
      'Cliquez sur un département pour filtrer tout l’admin dessus.',
    )
  );
}
document.addEventListener('click', (e) => {
  const r = e.target.closest('[data-ter-reg]');
  if (r) changerTerritoire(r.dataset.terReg, '');
});
document.addEventListener('click', (e) => {
  const d = e.target.closest('[data-ter-dep]');
  if (!d) return;
  const dep = state.departements.find((x) => x.code === d.dataset.terDep);
  if (dep) changerTerritoire(dep.region, dep.code);
});
