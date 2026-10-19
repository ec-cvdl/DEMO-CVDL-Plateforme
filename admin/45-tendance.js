/* Admin CVDL — tableau de bord : tendance des 12 dernières semaines (commandes reçues et
   appareils livrés par semaine), dans le territoire filtré. Préfixe td-. */
function blocTendance() {
  const SEMAINES = 12;
  const lundi = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const debut = lundi(new Date());
  debut.setDate(debut.getDate() - 7 * (SEMAINES - 1));
  const semaines = Array.from({ length: SEMAINES }, (_, i) => {
    const d = new Date(debut);
    d.setDate(d.getDate() + 7 * i);
    return { d, commandes: 0, livres: 0 };
  });
  const index = (v) => {
    const iso = dateVersISO(v);
    if (!iso) return -1;
    const i = Math.floor((new Date(`${iso}T12:00:00`) - debut) / (7 * 864e5));
    return i >= 0 && i < SEMAINES ? i : -1;
  };
  const nb = (c) => (c.lignes || []).reduce((t, l) => t + (parseInt(l.quantite, 10) || 0), 0);
  (state.commandes || [])
    .filter((c) => c.statutCommande !== 'Annulée')
    .forEach((c) => {
      const i = index(c.date);
      if (i >= 0) semaines[i].commandes++;
      const j = c.statutCommande === 'Livrée' ? index(c.dateLivraison) : -1;
      if (j >= 0) semaines[j].livres += nb(c);
    });
  const totalC = semaines.reduce((t, s) => t + s.commandes, 0);
  const totalL = semaines.reduce((t, s) => t + s.livres, 0);
  if (!totalC && !totalL) return '';
  const maxC = Math.max(1, ...semaines.map((s) => s.commandes));
  const maxL = Math.max(1, ...semaines.map((s) => s.livres));
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const barres = (cle, max, cls) =>
    semaines
      .map(
        (s, i) =>
          `<span class="td-col" title="Semaine du ${fmt(s.d)} : ${s[cle]}"><i class="td-barre ${cls}" style="height:${Math.max(4, Math.round((s[cle] / max) * 100))}%;animation-delay:${i * 35}ms"></i></span>`,
      )
      .join('');
  return `<section class="td" aria-label="Tendance des 12 dernières semaines">
    <div class="td-carte">
      <div class="td-tete"><span class="td-k">Commandes reçues</span><b>${fmtNombre(totalC)}</b><small>sur 12 semaines</small></div>
      <div class="td-graphe" role="img" aria-label="Commandes reçues par semaine">${barres('commandes', maxC, 'td-tur')}</div>
      <div class="td-axe"><span>${fmt(semaines[0].d)}</span><span>cette semaine</span></div>
    </div>
    <div class="td-carte">
      <div class="td-tete"><span class="td-k">Appareils livrés</span><b>${fmtNombre(totalL)}</b><small>sur 12 semaines</small></div>
      <div class="td-graphe" role="img" aria-label="Appareils livrés par semaine">${barres('livres', maxL, 'td-mag')}</div>
      <div class="td-axe"><span>${fmt(semaines[0].d)}</span><span>cette semaine</span></div>
    </div>
  </section>`;
}
