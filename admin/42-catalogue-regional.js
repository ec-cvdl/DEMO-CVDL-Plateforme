/* Admin CVDL — catalogue régional (onglet Stock). Chaque région active les produits communs,
   ajuste leurs prix, son stock, sa quantité max, son stock Salesforce, et peut avoir ses propres
   produits. Le stock de la région se synchronise depuis ses stocks tec.tech. Préfixe cr-. */

/** Région affichée dans l'onglet Stock : '' = vue nationale (comptes nationaux seulement). */
function regionStock() {
  if (estRegional() && !state.regions.includes(state.stockRegion)) state.stockRegion = state.regions[0] || '';
  return state.stockRegion || '';
}
/** Régions en puces : celles qui ont des structures ou un catalogue ; les autres dans un menu
 *  (ouvrir une nouvelle région). Un compte régional ne voit que les siennes. */
function barreRegionsStock() {
  const actuelle = regionStock();
  const utilisees = new Set([
    ...state.structures.map((s) => s.region),
    ...state.produits.flatMap((p) => Object.keys(p.regions || {})),
    actuelle,
  ]);
  const puces = estRegional() ? state.regions : state.regions.filter((r) => utilisees.has(r));
  const autres = estRegional() ? [] : state.regions.filter((r) => !utilisees.has(r));
  const choix = [...(estRegional() ? [] : [['', 'Toutes les régions']]), ...puces.map((r) => [r, r])];
  if (choix.length < 2 && !autres.length) return '';
  return `<div class="cr-regions" role="tablist" aria-label="Région du catalogue">${choix
    .map(
      ([v, l]) =>
        `<button type="button" role="tab" aria-selected="${v === actuelle}" class="${v === actuelle ? 'on' : ''}" data-stock-region="${echapper(v)}">${echapper(l)}</button>`,
    )
    .join('')}${
    autres.length
      ? `<select class="input cr-autre" data-stock-autre aria-label="Autre région"><option value="">Autre région…</option>${autres.map((r) => `<option>${echapper(r)}</option>`).join('')}</select>`
      : ''
  }</div>`;
}
async function chargerCatalogueRegion(region) {
  state.catalogueRegion = region ? { region, chargement: true } : null;
  render();
  if (!region) return;
  const r = await lireApi({ action: 'catalogue-region', region }).catch(() => null);
  if (regionStock() !== region) return; // une autre région a été choisie entre-temps
  state.catalogueRegion = r && r.ok ? r : { region, erreur: (r && r.erreur) || 'Catalogue indisponible' };
  render();
}

/** Vue d'une région : cartes produit avec prix et stock de la région. */
function vueCatalogueRegion(region) {
  const c = state.catalogueRegion;
  if (!c || c.region !== region) setTimeout(() => chargerCatalogueRegion(region));
  if (!c || c.region !== region || c.chargement) return '<p class="cr-vide">Chargement du catalogue…</p>';
  if (c.erreur) return `<div class="msg msg-erreur">${echapper(c.erreur)}</div>`;
  const cartes = c.produits
    .map((p) => {
      const l = p.reglage;
      const actif = l && l.actif;
      const stock = actif ? l.stock : 0;
      const prix = l && l.prixStandard != null ? l.prixStandard : p.prixStandard;
      const tag = !actif
        ? ['tag-neutral', 'Non proposé']
        : stock <= 0
          ? ['tag-accent', 'Épuisé']
          : stock < SEUIL_STOCK_FAIBLE
            ? ['tag-warn', 'Stock faible']
            : ['tag-accent-2', 'Disponible'];
      return `<button type="button" class="card elev-sm cr-carte${actif ? '' : ' cr-inactif'}" data-reglage-region="${p.id}">
        <span class="cr-carte-tete"><span class="cr-ill">${illustrationProduitAdmin(p.nom, p.icone, 46)}</span><span class="tag ${tag[0]}">${tag[1]}</span></span>
        <b class="cr-nom">${echapper(p.nom)}</b>
        <span class="cr-puces">${p.region ? '<span>Propre à la région</span>' : ''}${/linux/i.test(p.systeme || '') ? '<span>Linux</span>' : ''}${l && (l.prixStandard != null || l.prixRN != null) ? '<span>Tarif régional</span>' : ''}</span>
        <span class="cr-pied"><span>${actif ? `${stock} en stock` : '—'}</span><b>${formaterMontant(prix)}</b></span>
      </button>`;
    })
    .join('');
  return `
    <section class="cr-tectech${(c.stocksTectech || []).length ? '' : ' cr-afaire'}">
      <label for="cr-tectech"><b>Stocks tec.tech de la région${(c.stocksTectech || []).length ? '' : ' <span class="cr-pastille">À faire</span>'}</b><small>Identifiants séparés par une virgule : la synchronisation additionne leurs appareils.</small></label>
      <div class="cr-tectech-ligne"><input class="input" id="cr-tectech" value="${echapper((c.stocksTectech || []).join(', '))}" placeholder="Ex. S-0454, S-0460">
      <button type="button" class="btn btn-secondary" data-cr-tectech>Enregistrer</button></div>
    </section>
    <div class="cr-grille">${cartes || '<p class="cr-vide">Aucun produit.</p>'}</div>`;
}

/** Réglages d'un produit dans la région affichée. */
function vueReglageRegion() {
  const m = state.modal;
  const c = state.catalogueRegion || { produits: [] };
  const p = c.produits.find((x) => x.id === m.id);
  if (!p) return '';
  const l = p.reglage || {};
  const val = (x) => (x == null ? '' : echapper(x));
  const national = !estRegional() || p.region;
  return dialogShell(
    `${p.nom} · ${c.region}`,
    `
    <label class="rp-switch"><input type="checkbox" id="cr-actif" ${l.actif ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Proposé dans la région</b><small>Les structures de ${echapper(c.region)} le voient dans leur catalogue.</small></span></label>
    <div class="cp-section"><div class="rp-surtitre">Prix et stock dans la région</div>
    <div class="cp-grille2">
      ${champ('Prix standard (€)', `<input class="input" id="cr-prixStandard" type="number" step="0.01" min="0" value="${val(l.prixStandard)}" placeholder="${val(p.prixStandard)} (prix de la fiche)">`)}
      ${champ('Prix Relais Numérique (€)', `<input class="input" id="cr-prixRN" type="number" step="0.01" min="0" value="${val(l.prixRN)}" placeholder="${val(p.prixRN)} (prix de la fiche)">`)}
      ${champ('Stock', `<input class="input" id="cr-stock" type="number" step="1" min="0" value="${val(l.stock || 0)}">`)}
      ${champ('Quantité max. par commande', `<input class="input" id="cr-quantiteMax" type="number" step="1" min="1" max="1000" value="${val(l.quantiteMax)}" placeholder="${p.quantiteMax ? val(p.quantiteMax) : 'Par défaut'}">`)}
    </div>
    ${champ("Message d'indisponibilité", `<textarea class="input" id="cr-messageRupture" rows="2" placeholder="${val(p.messageRupture) || 'Ce produit est temporairement indisponible.'}">${val(l.messageRupture)}</textarea>`)}
    <p class="cr-aide">Champ vide = valeur de la fiche produit.</p></div>
    <details class="cp-section cp-avance"${l.sfStock ? ' open' : ''}><summary class="rp-surtitre">Salesforce</summary>
    ${champ('Stock Salesforce de la région', `<input class="input" id="cr-sfStock" type="url" value="${val(l.sfStock)}" placeholder="${val(p.sfStock) || 'https://emmaus-connect.lightning.force.com/lightning/r/…'}">`)}
    <p class="cr-aide">Case « Linux » de la vente : ${/linux/i.test(p.systeme || '') ? '<b>Oui</b>' : '<b>Non</b>'} (d’après le système de la fiche : ${echapper(p.systeme || '—')}).</p>
    </details>`,
    'cr-enregistrer',
    national
      ? `<button type="button" class="btn btn-ghost" data-produit-modifier="${p.id}">Modifier la fiche produit</button>`
      : '<span class="cr-aide">Fiche commune : modifiable par l’admin national.</span>',
  );
}
const CHAMPS_REGLAGE = ['actif', 'prixStandard', 'prixRN', 'stock', 'quantiteMax', 'messageRupture', 'sfStock'];
async function enregistrerReglageRegion() {
  const c = state.catalogueRegion;
  const p = c.produits.find((x) => x.id === state.modal.id);
  const l = p.reglage || {};
  const lire = (k) => (k === 'actif' ? $('cr-actif').checked : $(`cr-${k}`).value.trim());
  const avant = (k) => (k === 'actif' ? !!l.actif : l[k] == null ? '' : String(l[k]));
  const changes = CHAMPS_REGLAGE.filter((k) => lire(k) !== avant(k));
  $('cr-enregistrer').disabled = true;
  const erreurs = [];
  for (const champ of changes) {
    const r = await poster({
      action: 'produit-region-regler',
      id: p.id,
      region: c.region,
      champ,
      valeur: lire(champ),
    }).catch(() => ({ ok: false, erreur: 'Erreur réseau' }));
    if (!r.ok) erreurs.push(r.erreur || champ);
  }
  if (erreurs.length) {
    $('cr-enregistrer').disabled = false;
    $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(erreurs.join(' · '))}</div>`;
    return;
  }
  etat('Réglages enregistrés', 'succes');
  state.modal = null;
  chargerCatalogueRegion(c.region);
}
async function enregistrerTectechRegion() {
  const c = state.catalogueRegion;
  const r = await posterEtat(
    { action: 'region-tectech-regler', region: c.region, identifiants: $('cr-tectech').value },
    'Enregistrement…',
    'Stocks tec.tech enregistrés',
  );
  if (r.ok) {
    c.stocksTectech = r.stocksTectech;
    render();
  }
}

document.addEventListener('change', (e) => {
  const autre = e.target.closest('[data-stock-autre]');
  if (autre && autre.value) {
    state.stockRegion = autre.value;
    chargerCatalogueRegion(autre.value);
  }
});
document.addEventListener('click', (e) => {
  const reg = e.target.closest('[data-stock-region]');
  if (reg) {
    state.stockRegion = reg.dataset.stockRegion;
    chargerCatalogueRegion(state.stockRegion);
    return;
  }
  const carte = e.target.closest('[data-reglage-region]');
  if (carte) {
    state.modal = { kind: 'reglage-region', id: parseInt(carte.dataset.reglageRegion, 10) };
    render();
    return;
  }
  if (e.target.closest('#cr-enregistrer')) enregistrerReglageRegion();
  if (e.target.closest('[data-cr-tectech]')) enregistrerTectechRegion();
});
