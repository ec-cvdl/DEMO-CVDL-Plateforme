/* Admin CVDL — calendrier global. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ── Calendrier global ── */
/* Même langage visuel que le calendrier « Livraisons » du tableau de bord (cal2) : grandes
 * cases arrondies, repères colorés dans la case, détail du jour choisi dans le panneau de
 * droite — plus de texte tassé dans la grille. Livraison livrée = point vert, prévue = carré
 * ambre (mêmes repères que le tableau de bord), programme = losange violet, factures = magenta. */
function evenementsCalendrier() {
  const ev = [];
  const f = state.calFiltres;
  if (f.livraisons)
    state.commandes.forEach((c) => {
      if (c.statutCommande === 'Annulée') return;
      const livree = c.statutCommande === 'Livrée';
      const d = dateVersISO(livree ? c.dateLivraison : c.dateLivraisonCible || '');
      if (!d) return;
      const nb = (c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
      const mode = MODES_LIVRAISON.find((m) => m.valeur === c.modeLivraison);
      ev.push({
        date: d,
        type: 'liv',
        marque: livree ? 'conf' : 'est',
        court: c.nom || c.reference,
        titre: c.nom || c.reference,
        sous: `${c.reference}${nb ? ` · ${nb} article${nb > 1 ? 's' : ''}` : ''}${mode ? ` · ${mode.label}` : ''}`,
        etat: livree ? 'Livrée' : 'Prévue',
        ic: 'truck',
        attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
        fait: livree,
      });
    });
  if (f.programmes)
    state.distributions
      .filter((p) => p.statut !== 'archive')
      .forEach((p) => {
        const base = {
          type: 'prog',
          marque: 'prog',
          ic: 'calendrier',
          titre: p.nom,
          attrs: `data-dist-ouvrir="${echapper(p.id)}"`,
        };
        if (p.debut)
          ev.push({ ...base, date: p.debut, court: `Début · ${p.nom}`, sous: 'Début du programme', etat: 'Début' });
        (p.jalons || []).forEach((j) =>
          ev.push({
            ...base,
            date: j.date,
            court: `${j.libelle || 'Point d’étape'} · ${p.nom}`,
            sous: j.libelle || 'Point d’étape',
            etat: 'Étape',
          }),
        );
        if (p.butoir)
          ev.push({
            ...base,
            date: p.butoir,
            fin: true,
            court: `Butoir · ${p.nom}`,
            sous: 'Date butoir du programme',
            etat: 'Butoir',
          });
      });
  if (f.factures && state.produits.some((p) => p.facturationMensuelle)) {
    const now = new Date();
    for (let k = -2; k <= 3; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
      ev.push({
        date: isoJour(d),
        type: 'fact',
        marque: 'fact',
        ic: 'receipt',
        court: 'Factures mensuelles',
        titre: 'Factures mensuelles',
        sous: 'Envoi automatique aux structures',
        etat: 'Auto',
        attrs: 'data-factures-mensuelles',
      });
    }
  }
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}
function carteEvenementCalendrier(x) {
  return `<div class="calx-ev ${x.type}${x.fin ? ' fin' : ''}${x.fait ? ' fait' : ''}" ${x.attrs} role="button" tabindex="0">
    <span class="calx-ev-ic" aria-hidden="true">${icon(x.ic, 18)}</span>
    <span class="calx-ev-txt"><b>${echapper(x.titre)}</b><small>${echapper(x.sous)}</small></span>
    <span class="calx-etat">${echapper(x.etat)}</span>
  </div>`;
}
function vueCalendrierGlobal() {
  const auj = new Date();
  const isoAuj = isoJour(auj);
  const [an, mo] = (state.calMois || isoAuj.slice(0, 7)).split('-').map(Number);
  const premier = new Date(an, mo - 1, 1);
  const ev = evenementsCalendrier();
  const parJour = {};
  ev.forEach((x) => {
    (parJour[x.date] = parJour[x.date] || []).push(x);
  });
  const nbJours = new Date(an, mo, 0).getDate();
  const decalage = (premier.getDay() + 6) % 7;
  const moisIso = `${an}-${String(mo).padStart(2, '0')}`;
  if (!state.calJour || state.calJour.slice(0, 7) !== moisIso) {
    const premierAvec = Object.keys(parJour)
      .filter((k) => k.startsWith(moisIso) && k >= isoAuj)
      .sort()[0];
    state.calJour = isoAuj.startsWith(moisIso) ? isoAuj : premierAvec || `${moisIso}-01`;
  }
  const compte = { livraisons: 0, programmes: 0, factures: 0 };
  ev.forEach((x) => {
    if (x.date.startsWith(moisIso)) compte[{ liv: 'livraisons', prog: 'programmes', fact: 'factures' }[x.type]]++;
  });
  const cellules = Array(decalage)
    .fill(null)
    .concat(Array.from({ length: nbJours }, (_, i) => i + 1));
  const grille = cellules
    .map((j, k) => {
      if (!j) return '<span class="cal2-vide" aria-hidden="true"></span>';
      const iso = `${moisIso}-${String(j).padStart(2, '0')}`;
      const l = parJour[iso] || [];
      const cls = [
        'calx-jour',
        iso === state.calJour ? 'choisi' : '',
        iso === isoAuj ? 'auj' : '',
        iso < isoAuj ? 'passe' : '',
        k % 7 >= 5 ? 'weekend' : '',
        l.length ? 'avec' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<button type="button" class="${cls}" data-calx-jour="${iso}" aria-pressed="${iso === state.calJour}"${iso === isoAuj ? ' aria-current="date"' : ''} aria-label="${j} ${MOIS_CAL[mo - 1]}${l.length ? ` : ${l.length} événement${l.length > 1 ? 's' : ''}` : ''}">
      <span class="calx-num">${j}</span>
      ${l
        .slice(0, 3)
        .map(
          (x) =>
            `<span class="calx-puce ${x.marque}${x.fin ? ' fin' : ''}"><i></i><span>${echapper(x.court)}</span></span>`,
        )
        .join('')}
      ${l.length > 3 ? `<span class="calx-plus">+${l.length - 3} autre${l.length - 3 > 1 ? 's' : ''}</span>` : ''}
    </button>`;
    })
    .join('');
  const duJour = parJour[state.calJour] || [];
  const dateChoisie = new Date(state.calJour + 'T00:00:00');
  const libJour =
    state.calJour === isoAuj
      ? 'Aujourd’hui'
      : dateChoisie.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fin30 = isoJour(new Date(auj.getTime() + 30 * 86400000));
  const prochains = ev.filter((x) => x.date > isoAuj && x.date <= fin30);
  const parDateProchains = [];
  prochains.forEach((x) => {
    const g = parDateProchains[parDateProchains.length - 1];
    if (g && g.date === x.date) g.l.push(x);
    else parDateProchains.push({ date: x.date, l: [x] });
  });
  const filtre = (k, l, m) =>
    `<button type="button" class="calx-filtre${state.calFiltres[k] ? ' on' : ''}" data-cal-filtre="${k}" aria-pressed="${state.calFiltres[k]}"><i class="${m}"></i>${l}${state.calFiltres[k] ? `<b>${compte[k]}</b>` : ''}</button>`;
  const moisCourant = moisIso === isoAuj.slice(0, 7);
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5)">
      <div><h1 style="font-size:32px;margin-bottom:var(--space-2)">Calendrier</h1><p style="opacity:0.65;margin:0;font-size:15px">Livraisons, échéances des programmes de distribution et factures mensuelles.</p></div>
    </div>
    <div class="calx">
      <section class="card calx-main">
        <div class="calx-barre">
          <div class="cal2-nav calx-nav">
            <button type="button" class="cal2-fleche" data-cal-mois="-1" aria-label="Mois précédent">‹</button>
            <span class="cal2-mois" aria-live="polite">${MOIS_CAL[mo - 1]} ${an}</span>
            <button type="button" class="cal2-fleche" data-cal-mois="1" aria-label="Mois suivant">›</button>
          </div>
          ${moisCourant ? '' : '<button type="button" class="cal2-auj" data-cal-mois="0">Aujourd’hui</button>'}
          <div class="calx-filtres">${filtre('livraisons', 'Livraisons', 'conf')}${filtre('programmes', 'Programmes', 'prog')}${filtre('factures', 'Factures mensuelles', 'fact')}</div>
        </div>
        <div class="cal2-semaine" aria-hidden="true">${JOURS_SEMAINE_CAL.map((j) => `<span>${j}</span>`).join('')}</div>
        <div class="calx-grille" role="group" aria-label="${MOIS_CAL[mo - 1]} ${an}">${grille}</div>
        <div class="cal2-legende calx-legende"><span><i class="conf"></i>Livrée</span><span><i class="est"></i>Livraison prévue</span><span><i class="prog"></i>Programme</span><span><i class="fact"></i>Factures mensuelles</span></div>
      </section>
      <aside class="calx-cote">
        <section class="card calx-panneau">
          <div class="cal2-jourchoisi-titre calx-jour-titre"><span>${echapper(libJour)}</span>${duJour.length ? `<b>${duJour.length}</b>` : ''}</div>
          ${duJour.length ? `<div class="calx-evs">${duJour.map(carteEvenementCalendrier).join('')}</div>` : '<p class="cal2-rien">Rien de prévu ce jour-là.</p>'}
        </section>
        <section class="card calx-panneau">
          <div class="cal2-titre" style="font-size:16px">30 prochains jours</div>
          ${parDateProchains.length ? '<div class="calx-prochains">' + parDateProchains.map((g) => `<div class="calx-groupe"><div class="calx-groupe-date">${echapper(new Date(g.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }))}</div><div class="calx-evs">${g.l.map(carteEvenementCalendrier).join('')}</div></div>`).join('') + '</div>' : '<p class="cal2-rien">Rien de prévu.</p>'}
        </section>
      </aside>
    </div>`;
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-cal-filtre]');
  if (f) {
    state.calFiltres[f.dataset.calFiltre] = !state.calFiltres[f.dataset.calFiltre];
    render();
    return;
  }
  const j = e.target.closest('[data-calx-jour]');
  if (j) {
    state.calJour = j.dataset.calxJour;
    render();
    return;
  }
  const m = e.target.closest('[data-cal-mois]');
  if (m) {
    const d =
      m.dataset.calMois === '0'
        ? new Date()
        : (() => {
            const [a, mo] = (state.calMois || isoJour(new Date()).slice(0, 7)).split('-').map(Number);
            return new Date(a, mo - 1 + parseInt(m.dataset.calMois, 10), 1);
          })();
    state.calMois = isoJour(d).slice(0, 7);
    state.calJour = m.dataset.calMois === '0' ? isoJour(new Date()) : '';
    render();
  }
});
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'Enter' &&
    e.target.matches &&
    e.target.matches('.calx-ev[data-commande-ouvrir], .calx-ev[data-factures-mensuelles]')
  )
    e.target.click();
});
