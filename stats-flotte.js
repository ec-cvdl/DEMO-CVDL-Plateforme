/* Statistiques d'une flotte (calcul serveur : regles/statsFlotte.js) : rendu partagé par la
   modale « Statistiques » de flotte-structure.html et le détail d'un partenaire
   (structures-partenaires.html). Graphiques en SVG / CSS, styles dans stats-flotte.css.
   StatsFlotte.html(stats, { onglet, materiel, periodes }) → chaîne HTML ;
   les onglets et la période portent data-sf-onglet / data-sf-periode (gérés par l'appelant). */
window.StatsFlotte = (function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const COUL = ['#00ACB0', '#E62460', '#7C5CE0', '#FECC38', '#1F9D55', '#002743', '#D97706', '#8FA3B3'];
  const COUL_AGES = ['#FECC38', '#00ACB0', '#E62460', '#7C5CE0'];
  const COUL_STATUT = { 'En stock': '#1F9D55', Remis: '#00ACB0', Vendu: '#00ACB0', SAV: '#E24B4A', D3E: '#8FA3B3' };
  const nb = (n) => Number(n || 0).toLocaleString('fr-FR');
  const pc = (n, t) => (t ? Math.round((n / t) * 100) : 0);
  const somme = (l) => l.reduce((t, x) => t + x.valeur, 0);
  const vide = '<p class="sf-vide">Pas encore de données.</p>';

  const ONGLETS = [
    ['ensemble', 'Vue d’ensemble'],
    ['ventes', 'Ventes et paiements'],
    ['personnes', 'Personnes'],
    ['materiel', 'Matériel et stock'],
  ];

  function bloc(titre, aide, contenu, cls) {
    return `<section class="sf-p ${cls || ''}"><h4>${esc(titre)}${aide ? `<small>${esc(aide)}</small>` : ''}</h4>${contenu}</section>`;
  }
  function tuile(valeur, libelle, note) {
    return `<div class="sf-k"><b>${valeur}</b><span>${esc(libelle)}</span>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
  }

  /** Colonnes par mois, mois en cours en rose. */
  function colonnes(parMois) {
    const max = Math.max(1, ...parMois.map((m) => m.valeur));
    if (!parMois.some((m) => m.valeur)) return vide;
    return `<div class="sf-cols" role="img" aria-label="${esc(parMois.map((m) => `${m.libelle} : ${m.valeur}`).join(', '))}">${parMois
      .map(
        (m, i) =>
          `<div><b>${m.valeur || ''}</b><i class="${i === parMois.length - 1 ? 'cur' : ''}" style="height:${Math.round((m.valeur / max) * 100)}%"></i><span>${esc(m.libelle)}</span></div>`,
      )
      .join('')}</div>`;
  }
  /** Anneau segmenté + légende. */
  function anneau(lignes, unite, couleurs) {
    const total = somme(lignes);
    if (!total) return vide;
    const r = 44;
    const c = 2 * Math.PI * r;
    let cumul = 0;
    const coul = (l, i) => (couleurs && couleurs[l.label]) || COUL[i % COUL.length];
    const arcs = lignes
      .map((l, i) => {
        const long = (l.valeur / total) * c;
        const arc = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${coul(l, i)}" stroke-width="18" stroke-dasharray="${Math.max(0, long - 1.5)} ${c}" stroke-dashoffset="${-cumul}" transform="rotate(-90 60 60)"/>`;
        cumul += long;
        return arc;
      })
      .join('');
    return `<div class="sf-anneau"><svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="#EEF2F5" stroke-width="18"/>${arcs}
        <text x="60" y="60" text-anchor="middle" font-size="22" font-weight="700" fill="#002743">${nb(total)}</text>
        <text x="60" y="76" text-anchor="middle" font-size="10" fill="#5A6D7D">${esc(unite)}</text></svg>
      <ul>${lignes
        .slice(0, 8)
        .map(
          (l, i) =>
            `<li><i style="background:${coul(l, i)}"></i><span>${esc(l.label)}</span><b>${pc(l.valeur, total)} %</b></li>`,
        )
        .join('')}</ul></div>`;
  }
  /** Barres horizontales (6 premières lignes). */
  function barres(lignes, couleur) {
    const total = somme(lignes);
    if (!total) return vide;
    const max = lignes[0].valeur;
    return lignes
      .slice(0, 6)
      .map(
        (l) =>
          `<div class="sf-bar"><span title="${esc(l.label)}">${esc(l.label)}</span><span class="sf-t"><i style="width:${Math.max(3, pc(l.valeur, max))}%;background:${couleur}"></i></span><b>${nb(l.valeur)} <small>${pc(l.valeur, total)} %</small></b></div>`,
      )
      .join('');
  }
  /** Barre empilée + légende. */
  function empilee(lignes, couleurs, enPourcent) {
    const total = somme(lignes);
    if (!total) return '';
    return `<div class="sf-empile">${lignes
      .filter((l) => l.valeur)
      .map(
        (l) =>
          `<i style="flex:${l.valeur};background:${couleurs[lignes.indexOf(l)] || '#A3B3C0'}" title="${esc(l.label)}">${enPourcent ? pc(l.valeur, total) + ' %' : l.valeur}</i>`,
      )
      .join('')}</div><div class="sf-leg">${lignes
      .map((l, i) => `<span><i style="background:${couleurs[i] || '#A3B3C0'}"></i>${esc(l.label)}</span>`)
      .join('')}</div>`;
  }

  function oriente(s) {
    const total = somme(s.orientePar);
    const t = s.orientePar[0];
    return bloc(
      'Qui oriente les personnes',
      'ventes',
      (t && total
        ? `<div class="sf-top"><b>${pc(t.valeur, total)} %</b><span>des personnes orientées viennent de <b>${esc(t.label)}</b></span></div>`
        : '') + barres(s.orientePar, '#7C5CE0'),
    );
  }
  function personnes(s) {
    const genres = ['Homme', 'Femme'].map((g) => s.genres.find((x) => x.label === g) || { label: g, valeur: 0 });
    const contenu = empilee(s.ages, COUL_AGES) + (somme(genres) ? empilee(genres, ['#002743', '#E62460'], true) : '');
    return bloc('Personnes équipées', 'âge et genre', contenu || vide);
  }

  function html(s, opts) {
    const o = opts || {};
    const onglet = o.materiel && !['ensemble', 'materiel'].includes(o.onglet) ? 'ensemble' : o.onglet || 'ensemble';
    const t = s.totaux;
    const libellePeriode =
      s.periode === 'tout' ? 'depuis le début' : s.periode === '12m' ? '12 derniers mois' : `année ${s.periode}`;
    const tete = `<div class="sf-barre-outils">
      <div class="sf-onglets" role="tablist">${ONGLETS.filter(
        ([k]) => !o.materiel || ['ensemble', 'materiel'].includes(k),
      )
        .map(
          ([k, l]) =>
            `<button type="button" role="tab" aria-selected="${k === onglet}" data-sf-onglet="${k}">${l}</button>`,
        )
        .join('')}</div>
      ${
        o.periodes === false
          ? ''
          : `<label class="sf-periode">Période <select class="input" data-sf-periode>${[
              ['12m', '12 derniers mois'],
              ...s.annees.map((a) => [a, a]),
              ['tout', 'Depuis le début'],
            ]
              .map(([v, l]) => `<option value="${v}"${v === s.periode ? ' selected' : ''}>${l}</option>`)
              .join('')}</select></label>`
      }</div>`;
    const kpis = `<div class="sf-kpis">
      ${tuile(nb(t.remis), 'appareils remis', t.remis3Mois ? `▲ ${t.remis3Mois} ces 3 derniers mois` : '')}
      ${tuile(nb(t.enStock), 'en stock', t.anciens ? `dont ${t.anciens} depuis + de 2 mois` : '')}
      ${o.materiel ? tuile(nb(t.appareils), 'appareils au total') : tuile(t.montantVentes == null ? '—' : `${nb(Math.round(t.montantVentes))} €`, 'montant des ventes')}
      ${tuile(t.delaiMoyenJours == null ? '—' : `${t.delaiMoyenJours} j`, 'délai moyen livraison → remise')}
      ${o.materiel ? '' : tuile(t.tauxRapproches == null ? '—' : `${t.tauxRapproches} %`, 'ventes rapprochées')}
    </div>`;
    const remises = bloc('Remises par mois', '12 derniers mois · mois en cours en rose', colonnes(s.parMois));
    const paiements = bloc(
      'Moyens de paiement',
      s.paiements[0] ? `${s.paiements[0].label} en tête` : '',
      anneau(s.paiements, 'ventes'),
    );
    const vendeurs = bloc('Vendeurs', 'ventes', barres(s.vendeurs, '#00ACB0'));
    const statuts = bloc('Par statut', 'aujourd’hui', anneau(s.parStatut, 'appareils', COUL_STATUT));
    const produits = bloc('Par produit', 'toute la flotte', barres(s.parProduit, '#002743'));
    let corps;
    if (onglet === 'ventes')
      corps = `<div class="sf-g">${remises}${paiements}</div><div class="sf-g2">${vendeurs}${oriente(s)}</div>`;
    else if (onglet === 'personnes') corps = `<div class="sf-g2">${oriente(s)}${personnes(s)}</div>`;
    else if (onglet === 'materiel') corps = `<div class="sf-g2">${statuts}${produits}</div>`;
    else if (o.materiel) corps = `<div class="sf-g">${remises}${statuts}</div>`;
    else
      corps = `<div class="sf-g">${remises}${paiements}</div><div class="sf-g3">${oriente(s)}${vendeurs}${personnes(s)}</div>`;
    return `${tete}<div class="sf-corps" data-sf-image><p class="sf-periode-txt">${esc(libellePeriode)}</p>${kpis}${corps}</div>`;
  }

  /** Télécharge la zone affichée en PNG (html-to-image.min.js, si la page le charge). */
  async function exporterImage(conteneur, nom) {
    const zone = conteneur.querySelector('[data-sf-image]');
    if (!zone || !window.htmlToImage) return false;
    const url = await window.htmlToImage.toPng(zone, { pixelRatio: 2, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.click();
    return true;
  }

  return { html, exporterImage };
})();
