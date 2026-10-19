/* Admin CVDL — stocks Salesforce ↔ produits du catalogue. Les stocks Salesforce sont régionaux :
   chaque produit a le sien (champ sfStock), repris par le favori « CVDL › Salesforce » pour
   remplir le champ Stock de la vente. La liste des stocks se colle depuis le relevé du favori ;
   le serveur propose un stock pour chaque produit d'après son type et sa catégorie. */

async function ouvrirStocksSalesforce() {
  state.stocksSalesforce = null;
  state.modal = { kind: 'stocks-salesforce' };
  render();
  try {
    const r = await poster({ action: 'salesforce-stocks' });
    if (!r.ok) throw new Error(r.erreur || 'Lecture impossible');
    state.stocksSalesforce = r;
  } catch (e) {
    etat(e.message || 'Lecture impossible', 'erreur');
    state.modal = null;
  }
  render();
}

function vueStocksSalesforce() {
  const d = state.stocksSalesforce;
  if (!d) return dialogShell('Stocks Salesforce', '<p>Chargement…</p>', 'ss-enregistrer');
  const releve = `<details class="ss-releve"${d.stocks.length ? '' : ' open'}>
      <summary>${d.stocks.length ? `Mettre à jour la liste des stocks (${d.stocks.length} connus)` : 'Coller la liste des stocks Salesforce'}</summary>
      <p class="ss-note">Dans Salesforce, ouvrez la liste des Stocks (vue « Stock CVDL » ou « Tous »), faites défiler jusqu’en bas, cliquez sur le favori « Relevé stocks » et collez ici ce qu’il affiche.</p>
      <textarea class="input" id="ss-texte" rows="5" placeholder="a0WAZ000000hth62AA | Ordinateur - Catégorie A"></textarea>
      <button type="button" class="btn btn-secondary" id="ss-lire">Lire le relevé</button>
    </details>`;
  if (!d.stocks.length) return dialogShell('Stocks Salesforce', releve, 'ss-enregistrer');
  const options = (choisi) =>
    `<option value="">— Aucun —</option>${d.stocks
      .map((s) => `<option value="${echapper(s.id)}" ${s.id === choisi ? 'selected' : ''}>${echapper(s.nom)}</option>`)
      .join('')}`;
  const aValider = d.produits.filter((p) => !p.stockId && p.propose).length;
  const lignes = d.produits
    .map((p) => {
      const choisi = p.stockId || p.propose;
      const etiquette = p.stockId
        ? ''
        : p.propose
          ? '<span class="tag tag-warn">Proposé</span>'
          : p.materiel
            ? '<span class="ss-vide">à choisir</span>'
            : '';
      return `<div class="ss-ligne"><span class="ss-produit">${echapper(p.nom)}</span>
        <select class="input" data-ss-produit="${p.id}" data-ss-actuel="${echapper(p.stockId)}" aria-label="Stock Salesforce de ${echapper(p.nom)}">${options(choisi)}</select>${etiquette}</div>`;
    })
    .join('');
  return dialogShell(
    'Stocks Salesforce',
    `<p class="ss-note" data-pleine-largeur>Le stock de chaque produit est repris par le favori « CVDL › Salesforce » dans les ventes. ${aValider ? `<b>${aValider} correspondance${aValider > 1 ? 's' : ''} proposée${aValider > 1 ? 's' : ''}</b> d’après le type et la catégorie : vérifiez, puis enregistrez.` : ''}</p>
    <div class="ss-liste" data-pleine-largeur>${lignes}</div>
    <div data-pleine-largeur>${releve}</div>`,
    'ss-enregistrer',
  );
}

async function lireReleveStocksSalesforce() {
  const texte = ($('ss-texte') || {}).value || '';
  const r = await posterEtat(
    { action: 'salesforce-stocks-releve', texte },
    'Lecture du relevé…',
    'Liste des stocks mise à jour',
  );
  if (!r.ok) return;
  state.stocksSalesforce = r;
  render();
}

async function enregistrerStocksSalesforce() {
  const associations = {};
  document.querySelectorAll('[data-ss-produit]').forEach((s) => {
    if (s.value !== s.dataset.ssActuel) associations[s.dataset.ssProduit] = s.value;
  });
  if (!Object.keys(associations).length) {
    state.modal = null;
    render();
    return;
  }
  const r = await posterEtat(
    { action: 'salesforce-stocks-associer', associations },
    'Enregistrement…',
    'Stocks Salesforce enregistrés',
  );
  if (!r.ok) {
    $('rp-retour-modale').innerHTML =
      `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible.')}</div>`;
    return;
  }
  const rp = await lireApi({ action: 'produits' });
  if (rp.ok) state.produits = rp.produits;
  state.stocksSalesforce = null;
  state.modal = null;
  render();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-stocks-salesforce]')) return ouvrirStocksSalesforce();
  if (e.target.id === 'ss-lire') return lireReleveStocksSalesforce();
  if (e.target.id === 'ss-enregistrer' && state.modal && state.modal.kind === 'stocks-salesforce')
    return enregistrerStocksSalesforce();
});
