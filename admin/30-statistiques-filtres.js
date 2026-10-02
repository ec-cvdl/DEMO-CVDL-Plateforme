/* Admin CVDL — filtres des statistiques, programmes. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ── Statistiques : filtres + section programmes ── */
function commandeDansFiltresStats(c) {
  const f = state.statsFiltres;
  const s = state.structures.find((x) => x.code === c.code) || state.structures.find((x) => x.nom === c.nom) || {};
  if (f.region && s.region !== f.region) return false;
  if (f.type && (s.type || 'standard') !== f.type) return false;
  if (f.departement && departementDeAdresse(c.adresse || s.adresse) !== f.departement) return false;
  if (f.programme) {
    const r = (state.rattachements || []).find((x) => x.reference === c.reference);
    const aff = (c.distribution && c.distribution.affectation) || (r && r.affectation) || {};
    const ids = Object.values(aff);
    if (f.programme === '__hors' ? ids.length : !ids.includes(f.programme)) return false;
  }
  return true;
}
function barreFiltresStats() {
  const f = state.statsFiltres;
  const regions = [...new Set(state.structures.map((s) => s.region).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
  const deps = [...new Set(state.structures.map((s) => departementDeAdresse(s.adresse)).filter(Boolean))].sort();
  const sel = (id, lib, opts, val) =>
    `<label class="st-f"><span>${lib}</span><select class="input" data-stats-filtre="${id}">${opts.map(([v, l]) => `<option value="${echapper(v)}" ${val === v ? 'selected' : ''}>${echapper(l)}</option>`).join('')}</select></label>`;
  return `<div class="st-filtres">
    ${sel('programme', 'Programme', [['', 'Tous'], ...state.distributions.map((p) => [p.id, p.nom]), ['__hors', 'Hors programme']], f.programme)}
    ${sel('region', 'Région', [['', 'Toutes'], ...regions.map((r) => [r, r])], f.region)}
    ${sel('departement', 'Département', [['', 'Tous'], ...deps.map((d) => [d, d])], f.departement)}
    ${sel('type', 'Type de structure', [['', 'Tous'], ...TYPES_PERIMETRE.map(([k, l]) => [k, l])], f.type)}
    ${Object.values(f).some(Boolean) ? '<button type="button" class="et-lien" data-stats-reinit>Réinitialiser</button>' : ''}
  </div>`;
}
document.addEventListener('change', (e) => {
  const s = e.target.closest && e.target.closest('[data-stats-filtre]');
  if (s) {
    state.statsFiltres[s.dataset.statsFiltre] = s.value;
    render();
  }
});
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-stats-reinit]')) {
    state.statsFiltres = { programme: '', region: '', departement: '', type: '' };
    render();
  }
});
function courbeProgramme(p) {
  const av = p.avancement || {};
  const pts = av.cumul || [];
  const obj = av.totalObjectif || 0;
  if (!pts.length || !obj) return '<p class="di-aide">Pas encore de livraison à tracer.</p>';
  const d0 = new Date(p.debut).getTime(),
    d1 = new Date(p.butoir).getTime();
  const W = 620,
    H = 220,
    PL = 40,
    PR = 96,
    PT = 16,
    PB = 26;
  const X = (t) => PL + (W - PL - PR) * Math.min(1, Math.max(0, (t - d0) / Math.max(1, d1 - d0)));
  const maxY = Math.max(obj, pts[pts.length - 1].livre);
  const Y = (v) => PT + (H - PT - PB) * (1 - v / maxY);
  const ligne = pts.map((x) => `${X(new Date(x.semaine).getTime()).toFixed(1)},${Y(x.livre).toFixed(1)}`).join(' ');
  const dernier = pts[pts.length - 1];
  const lx = X(new Date(dernier.semaine).getTime()),
    ly = Y(dernier.livre);
  const graduations = [0, Math.round(maxY / 2), maxY]
    .map(
      (v) =>
        `<line x1="${PL}" x2="${W - PR}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${PL - 8}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`,
    )
    .join('');
  const points = pts
    .map(
      (x) =>
        `<circle cx="${X(new Date(x.semaine).getTime()).toFixed(1)}" cy="${Y(x.livre).toFixed(1)}" r="8" class="hit"><title>Semaine du ${frDate(x.semaine)} : ${x.livre} livrés (cumul)</title></circle>`,
    )
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="st-graph" role="img" aria-label="Cumul livré ${dernier.livre} sur ${obj}, trajectoire nécessaire en pointillés">${graduations}
    <text x="${PL}" y="${H - 6}" class="ax">${frDate(p.debut)}</text><text x="${W - PR}" y="${H - 6}" class="ax" text-anchor="end">${frDate(p.butoir)}</text>
    <line x1="${X(d0)}" y1="${Y(0)}" x2="${X(d1)}" y2="${Y(obj)}" class="ideal"/><text x="${X(d1) + 6}" y="${Y(obj) + 4}" class="lab2">objectif ${obj}</text>
    <polygon points="${X(d0)},${Y(0)} ${ligne} ${lx},${Y(0)}" class="aire"/><polyline points="${ligne}" class="courbe"/>
    <circle cx="${lx}" cy="${ly}" r="5" class="pt"/><text x="${lx + 9}" y="${ly - 8}" class="lab">${dernier.livre} livrés</text>${points}</svg>`;
}
function sectionProgrammesStats() {
  if (!state.distributions.length) return '';
  const f = state.statsFiltres;
  const progs = state.distributions.filter((p) => p.statut !== 'archive' && (!f.programme || f.programme === p.id));
  if (!progs.length) return '';
  const un = progs.length === 1 ? progs[0] : null;
  const tot = progs.reduce(
    (a, p) => {
      const av = p.avancement || {};
      a.livre += av.totalLivre || 0;
      a.objectif += av.totalObjectif || 0;
      a.engage += av.totalEngage || 0;
      a.personnes += av.personnes || 0;
      return a;
    },
    { livre: 0, objectif: 0, engage: 0, personnes: 0 },
  );
  const deps = {};
  progs.forEach((p) =>
    Object.entries((p.avancement || {}).parDepartement || {}).forEach(([d, q]) => {
      deps[d] = (deps[d] || 0) + q;
    }),
  );
  const depsTri = Object.entries(deps).sort((a, b) => b[1] - a[1]);
  const maxD = Math.max(1, ...depsTri.map((d) => d[1]));
  return `<section class="st-prog">
    <h2 class="st-h2">Programmes de distribution${un ? ` · ${echapper(un.nom)}` : ''}</h2>
    <div class="st-tuiles">
      <div class="st-tuile"><small>Livrés</small><b>${tot.livre}</b><span>sur ${tot.objectif} prévus</span></div>
      <div class="st-tuile"><small>Objectif atteint</small><b>${tot.objectif ? Math.round((tot.livre / tot.objectif) * 100) : 0} %</b><span>${Math.max(0, tot.objectif - tot.livre)} restants</span></div>
      <div class="st-tuile"><small>Engagés</small><b>${tot.engage}</b><span>validés, pas encore livrés</span></div>
      <div class="st-tuile"><small>Personnes équipées</small><b>${tot.personnes}</b><span>personnes nommées</span></div>
    </div>
    <div class="di-detail">
      <section class="di-bloc"><h3>${un ? 'Livré vs trajectoire' : 'Comparaison'}</h3>${
        un
          ? `<p class="di-aide">Cumul des livraisons ; pointillés = rythme nécessaire pour tenir la date butoir.</p>${courbeProgramme(un)}${tagRythme(un.avancement)}`
          : `<div class="di-table"><table><thead><tr><th>Programme</th><th>Butoir</th><th>Livré / objectif</th><th>Engagé</th><th>Rythme</th><th>Structures</th></tr></thead><tbody>${progs
              .map((p) => {
                const av = p.avancement || {};
                return `<tr data-dist-ouvrir="${echapper(p.id)}" role="button" tabindex="0"><td><b>${echapper(p.nom)}</b></td><td>${frDate(p.butoir)}</td><td>${av.totalLivre || 0} / ${av.totalObjectif || 0} · ${av.totalObjectif ? Math.round(((av.totalLivre || 0) / av.totalObjectif) * 100) : 0} %</td><td>${av.totalEngage || 0}</td><td>${tagRythme(av)}</td><td>${Object.keys(av.parStructure || {}).length}</td></tr>`;
              })
              .join(
                '',
              )}</tbody></table></div><p class="di-aide">Choisissez un programme dans les filtres pour voir sa courbe.</p>`
      }</section>
      <section class="di-bloc"><h3>Par département</h3>${depsTri.length ? depsTri.map(([d, q]) => `<div class="di-hb"><b>${echapper(d)}</b><span class="di-hbt"><i style="width:${(q / maxD) * 100}%"></i></span><span>${q}</span></div>`).join('') : '<p class="di-aide">Rien de livré.</p>'}</section>
    </div></section>`;
}
