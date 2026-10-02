/* Admin CVDL — liste et statistiques SAV. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueSav() {
  const q = state.savSearch.trim().toLowerCase();
  const listeAvantFiltreStatut = q
    ? state.sav.filter(
        (s) =>
          s.reference.toLowerCase().includes(q) ||
          (s.structureNom || '').toLowerCase().includes(q) ||
          (s.numeroSerie || '').toLowerCase().includes(q) ||
          (s.nom || '').toLowerCase().includes(q),
      )
    : state.sav;
  const liste = state.savFiltreStatut
    ? listeAvantFiltreStatut.filter((s) => s.statut === state.savFiltreStatut)
    : listeAvantFiltreStatut;

  const ordreComplet = state.statutsSav.length
    ? state.statutsSav
    : [...new Set(listeAvantFiltreStatut.map((s) => s.statut))].map((statut) => ({ statut, couleur: 't-gris' }));
  const nonTerminauxOrdre = ordreComplet.filter((d) => !d.terminal);

  // Couleur par rôle dans le cycle de vie plutôt que par la teinte propre à chaque statut
  // (réglable une à une dans "Réglages statuts") : jaune pour la toute première étape, bleu
  // pour les étapes intermédiaires, vert pour une clôture réussie (le statut terminal encore
  // colorié "vert" dans les réglages), magenta pour toute autre clôture (annulé, refusé...).
  const fractionPour = (def) => {
    if (!def) return 0;
    if (def.terminal) return 1;
    const pos = nonTerminauxOrdre.findIndex((d) => d.statut === def.statut);
    return (pos + 1) / Math.max(1, nonTerminauxOrdre.length);
  };

  const couleurHex = (def) => {
    if (!def) return '#8FA3B3';
    if (def.terminal) return def.couleur === 't-vert' ? '#1F9D55' : '#E62460';
    const pos = nonTerminauxOrdre.findIndex((d) => d.statut === def.statut);
    return pos === 0 ? '#FECC38' : '#00ACB0';
  };
  const pilulesFiltre = `
    <div class="rp-filtres">
      <button type="button" class="rp-filtre ${!state.savFiltreStatut ? 'actif' : ''}" data-filtrer-statut-sav="">Tous<span class="n">${listeAvantFiltreStatut.length}</span></button>
      ${ordreComplet
        .map((def) => {
          const n = listeAvantFiltreStatut.filter((x) => x.statut === def.statut).length;
          return `<button type="button" class="rp-filtre ${state.savFiltreStatut === def.statut ? 'actif' : ''}" style="--st:${couleurHex(def)}" data-filtrer-statut-sav="${echapper(def.statut)}"><span class="rp-point"></span>${echapper(def.statut)}<span class="n">${n}</span></button>`;
        })
        .join('')}
    </div>`;
  const ordreIndex = new Map(ordreComplet.map((d, i) => [d.statut, i]));
  const listeTriee = [...liste].sort((a, b) => (ordreIndex.get(a.statut) ?? 999) - (ordreIndex.get(b.statut) ?? 999));
  const cartes = listeTriee
    .map((t) => {
      const def = ordreComplet.find((d) => d.statut === t.statut);
      const coul = couleurHex(def);
      const frac = fractionPour(def);
      const nbBarres = Math.max(3, Math.min(6, nonTerminauxOrdre.length));
      const pleines = def && def.terminal ? nbBarres : Math.max(1, Math.round(frac * nbBarres));
      return `
    <div class="rp-sav-carte sv2 ${def && def.terminal ? 'clos' : ''}" style="--st:${coul}" data-sav-ouvrir="${echapper(t.reference)}" role="button" tabindex="0">
      <div class="sv2-haut">
        <span class="sv2-anneau" title="Avancement : ${pleines} étape${pleines > 1 ? 's' : ''} sur ${nbBarres}">${anneauSavSvg(nbBarres ? Math.round((pleines / nbBarres) * 100) : 0)}<span class="sv2-anneau-in">${window.illustrationCvdl ? window.illustrationCvdl('sym-' + cleSymptomeAdmin(t.symptome), 34) : ''}</span></span>
        <span class="sv2-id"><b>${echapper(t.reference)}${typeof pastilleFilSav === 'function' ? pastilleFilSav(t) : ''}</b><small>${echapper(t.structureNom || t.nom || '')}</small></span>
      </div>
      <div class="sv2-corps">
        <b>${echapper([t.marque, t.modele].filter(Boolean).join(' ') || 'Appareil')}</b>
        <span>${echapper(t.symptome || 'Symptôme non précisé')}</span>
      </div>
      <div class="sv2-pied">
        <span class="rp-statut" style="--st:${coul}">${echapper(t.statut)}</span>
        <small>${echapper(t.date || '')}</small>
      </div>
    </div>`;
    })
    .join('');

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">SAV</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Dossiers de retour (statuts personnalisables).</p>
      </div>
      <div style="display:flex;gap:var(--space-3);align-items:center">
        <div class="rp-seg">
          <button type="button" class="${state.savVue === 'stats' ? '' : 'actif'}" data-sav-vue="liste">Dossiers</button>
          <button type="button" class="${state.savVue === 'stats' ? 'actif' : ''}" data-sav-vue="stats">Statistiques</button>
        </div>
        <button type="button" class="btn btn-secondary" data-ouvrir-reglages-statuts>${icon('wrench', 15)}Réglages statuts</button>
        <button type="button" class="btn btn-primary" data-ouvrir-creation="sav">${icon('plus', 15)}Nouveau SAV</button>
      </div>
    </div>
    ${
      state.savVue === 'stats'
        ? vueSavStatistiques()
        : `
    ${champRecherche('rp-recherche-sav', 'Rechercher par nom ou n° de série...', state.savSearch)}
    ${pilulesFiltre}
    <div class="rp-sav-grille">
      ${cartes || '<div class="pk-etat"><span data-ill="vide" class="ill"></span>Aucun dossier SAV.</div>'}
    </div>`
    }`;
}

/** Statistiques SAV — même base que l'onglet Statistiques général (anneauUnique,
 *  barreClassement, graphique en barres par mois) : par motif, par reconditionneur, par
 *  statut actuel, par structure, et quelques indicateurs de délai de traitement. */
function vueSavStatistiques() {
  const tickets = state.sav;
  const anneeCourante = new Date().getFullYear();
  const anneesDispo = new Set([anneeCourante]);
  tickets.forEach((s) => {
    const iso = dateVersISO(s.date);
    if (iso) anneesDispo.add(new Date(iso).getFullYear());
  });
  const anneeSelectionnee = state.savStatsAnnee || anneeCourante;
  anneesDispo.add(anneeSelectionnee);
  const listeAnnees = [...anneesDispo].sort((a, b) => b - a);

  const ticketsAnnee = tickets.filter((s) => {
    const iso = dateVersISO(s.date);
    return iso && new Date(iso).getFullYear() === anneeSelectionnee;
  });

  const grouperPar = (champ, libelleVide) => {
    const compte = {};
    ticketsAnnee.forEach((s) => {
      const v = (s[champ] || '').trim() || libelleVide;
      compte[v] = (compte[v] || 0) + 1;
    });
    return Object.keys(compte)
      .map((label) => ({ label, valeur: compte[label] }))
      .sort((a, b) => b.valeur - a.valeur);
  };
  const parMotif = grouperPar('symptome', 'Non renseigné').slice(0, 8);
  const parReconditionneur = grouperPar('reconditionneur', 'Inconnu / non renseigné').slice(0, 8);
  const parStatut = grouperPar('statut', '—');
  const parMarque = grouperPar('marque', 'Non renseignée').slice(0, 8);

  const parStructure = {};
  ticketsAnnee.forEach((s) => {
    const nom = s.structureNom || 'Sans structure';
    parStructure[nom] = (parStructure[nom] || 0) + 1;
  });
  const topStructures = Object.keys(parStructure)
    .map((nom) => ({ label: nom, valeur: parStructure[nom] }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, 8);

  // Délai moyen de résolution (jours entre l'ouverture et dateResolution) — uniquement les
  // dossiers effectivement résolus dans l'année sélectionnée, sinon la moyenne n'aurait aucun
  // sens (un dossier encore ouvert n'a pas de délai à mesurer).
  const resolus = ticketsAnnee.filter((s) => s.dateResolution);
  const delais = resolus
    .map((s) => {
      const debut = dateVersISO(s.date),
        fin = dateVersISO(s.dateResolution);
      if (!debut || !fin) return null;
      return Math.max(0, Math.round((new Date(fin) - new Date(debut)) / 86400000));
    })
    .filter((n) => n != null);
  const delaiMoyen = delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) : null;

  const statutsTerminaux = new Set((state.statutsSav || []).filter((d) => d.terminal).map((d) => d.statut));
  const nbOuverts = ticketsAnnee.filter((s) => !statutsTerminaux.has(s.statut)).length;
  const tauxResolu = ticketsAnnee.length
    ? Math.round(((ticketsAnnee.length - nbOuverts) / ticketsAnnee.length) * 100)
    : 0;

  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const parMois = new Array(12).fill(0);
  ticketsAnnee.forEach((s) => {
    const iso = dateVersISO(s.date);
    if (iso) parMois[new Date(iso).getMonth()]++;
  });
  const maxMois = Math.max(1, ...parMois);

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-4)">
      <select class="input" id="sav-stats-annee" style="width:auto;flex:none">
        ${listeAnnees.map((a) => `<option value="${a}" ${a === anneeSelectionnee ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${ticketsAnnee.length}</div>
        <div style="font-size:12.5px;opacity:0.6">dossiers ouverts en ${anneeSelectionnee}</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${nbOuverts}</div>
        <div style="font-size:12.5px;opacity:0.6">encore en cours</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${tauxResolu}%</div>
        <div style="font-size:12.5px;opacity:0.6">clôturés</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${delaiMoyen != null ? `${delaiMoyen} j` : '—'}</div>
        <div style="font-size:12.5px;opacity:0.6">délai moyen de résolution</div>
      </div>
    </div>

    <div class="card elev-sm" style="padding:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Dossiers par mois — ${anneeSelectionnee}</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px">
        ${parMois
          .map(
            (n, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%">
            <span style="font-size:11px;opacity:0.6">${n || ''}</span>
            <div class="rp-histo-barre" style="width:100%;border-radius:6px 6px 0 0;background:var(--color-accent-2);height:${Math.max(2, Math.round((n / maxMois) * 100))}%"></div>
            <span style="font-size:11px;opacity:0.5">${MOIS[i]}</span>
          </div>`,
          )
          .join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par motif</div>
        ${anneauUnique(parMotif)}
      </div>
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par reconditionneur</div>
        ${anneauUnique(parReconditionneur)}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par statut actuel</div>
        ${anneauUnique(parStatut)}
      </div>
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par marque</div>
        ${anneauUnique(parMarque)}
      </div>
    </div>
    <div class="card elev-sm" style="padding:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Structures avec le plus de dossiers SAV</div>
      ${barreClassement(topStructures)}
    </div>`;
}

/* ============================================================
   Devis / Factures
   ============================================================ */
