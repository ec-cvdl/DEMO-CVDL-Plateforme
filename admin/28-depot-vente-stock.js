/* Admin CVDL — dépôt-vente, stock bas, stock restreint. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ════════════════════════════════════════════════════════════════════════════════════
   Dépôt-vente — stock des structures en dépôt-vente, géré aussi depuis l'admin
   · state.depotVente : état par structure (routes/depotVente.js) — onglet Stock, fiche
     structure, fil des priorités / cloche (stock ancien, stock divisé par deux) ;
   · modale « flotte-structure » : la flotte de la structure (même feuille que son espace),
     modifiable en direct — statut, personne, date de vente, lieu de stockage, commentaire.
   ════════════════════════════════════════════════════════════════════════════════════ */
async function chargerDepotVente() {
  try {
    const r = await jsonp({ action: 'depot-vente-etat', password: motDePasse });
    if (r && r.ok) {
      state.depotVente = r.structures || [];
      if (!state.modal || state.modal.kind !== 'creer-structure') render();
    }
  } catch (e) {
    /* non bloquant */
  }
}
function etatDepotVente(code) {
  return (state.depotVente || []).find((x) => x.code === code) || null;
}
/** Lignes du fil des priorités (et donc de la cloche) pour le dépôt-vente. */
function feedDepotVente() {
  const out = [];
  (state.depotVente || []).forEach((d) => {
    if (d.anciens)
      out.push({
        icon: icon('clock', 15),
        badgeBg: 'var(--th-bg-fff3ccff, #FFF3CC)',
        badgeFg: 'var(--th-tx-7a5a00ff, #7A5A00)',
        tagCls: '',
        tagStyle: 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)',
        type: 'Dépôt-vente',
        id: d.nom,
        structure: 'Dépôt-vente',
        statut: `${d.anciens} appareil${d.anciens > 1 ? 's' : ''} en stock depuis + de 2 mois`,
        urgent: false,
        date: new Date(),
        attrs: `data-flotte-structure="${echapper(d.code)}"`,
      });
    const bas = d.stockBas || {};
    if (bas.global || (bas.produits || []).length)
      out.push({
        icon: icon('package', 15),
        badgeBg: 'var(--th-bg-fff3ccff, #FFF3CC)',
        badgeFg: 'var(--th-tx-7a5a00ff, #7A5A00)',
        tagCls: '',
        tagStyle: 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)',
        type: 'Dépôt-vente',
        id: d.nom,
        structure: 'Stock bas',
        statut: bas.global
          ? `Stock bas : ${d.enStock} appareil${d.enStock > 1 ? 's' : ''} (seuil ${d.limites.seuilBas})`
          : `Stock bas : ${bas.produits.map((p) => `${p.produit} (${p.enStock})`).join(', ')}`,
        urgent: true,
        date: new Date(),
        attrs: `data-flotte-structure="${echapper(d.code)}"`,
      });
    if (d.moitie)
      out.push({
        icon: icon('package', 15),
        badgeBg: 'var(--color-accent-100)',
        badgeFg: 'var(--color-accent-700)',
        tagCls: 'tag-accent',
        type: 'Dépôt-vente',
        id: d.nom,
        structure: 'Dépôt-vente',
        statut: `Stock divisé par deux (${d.enStock}/${d.reference})`,
        urgent: true,
        date: new Date(),
        attrs: `data-flotte-structure="${echapper(d.code)}"`,
      });
  });
  return out;
}
/** Pastilles d'alerte d'une structure en dépôt-vente (fiche, onglet Stock). */
function pucesAlertesDepot(d) {
  const bas = d.stockBas || {};
  return [
    d.anciens ? `<span class="att">${d.anciens} depuis + de 2 mois</span>` : '',
    d.moitie ? '<span class="ko">Stock divisé par deux</span>' : '',
    bas.global ? `<span class="ko">Stock bas (≤ ${d.limites.seuilBas})</span>` : '',
    ...(bas.produits || []).map((p) => `<span class="ko">${echapper(p.produit)} : stock bas (${p.enStock})</span>`),
    d.auPlafond ? `<span class="att">Plafond atteint (${d.limites.plafond})</span>` : '',
  ].join('');
}

/* ── « Mode stock bas » (onglet Stock) : limite TOUTES les commandes des structures sur le
   portail — total d'articles par commande, quantité par produit (défaut + réglage par produit),
   message affiché sur le formulaire. Les saisies manuelles de l'admin ne sont pas limitées. ── */
function msbActif() {
  return !!(state.modeStockBas && state.modeStockBas.actif);
}
async function chargerModeStockBas() {
  try {
    const r = await jsonp({ action: 'mode-stock-bas', password: motDePasse });
    if (r && r.ok) {
      state.modeStockBas = r.mode;
      if (state.activeTab === 'stock' && !state.modal) render();
    }
  } catch (e) {
    /* non bloquant */
  }
}
function resumeModeStockBas(m) {
  const parties = [];
  if (m.maxParCommande != null)
    parties.push(`${m.maxParCommande} article${m.maxParCommande > 1 ? 's' : ''} max. par commande`);
  if (m.maxParProduit != null) parties.push(`${m.maxParProduit} par produit`);
  const n = Object.keys(m.produits || {}).length;
  if (n) parties.push(`${n} produit${n > 1 ? 's' : ''} réglé${n > 1 ? 's' : ''} à part`);
  return parties.join(' · ') || 'aucune limite chiffrée pour l’instant';
}
function bandeauModeStockBas() {
  if (!msbActif()) return '';
  const m = state.modeStockBas;
  return `<div class="msb-bandeau" role="status">${icon('alert', 18)}<div><b>Mode stock bas actif</b>${m.depuis ? ` <small>depuis le ${echapper(new Date(m.depuis).toLocaleDateString('fr-FR'))}</small>` : ''}<span>Toutes les commandes des structures sont limitées : ${echapper(resumeModeStockBas(m))}.</span></div><button type="button" class="btn btn-secondary" data-mode-stock-bas>Modifier</button></div>`;
}
function vueModeStockBas() {
  const m = state.modal;
  const v = m.v;
  const val = (x) => (x === null || x === undefined ? '' : x);
  const produits = (state.produits || []).filter((p) => p.visible && !p.dematerialise);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="msb-titre" style="width:min(780px,100%)">
        <header class="csw-tete">
          <div class="csw-tete-txt"><div class="rp-surtitre">Stock</div><h2 class="csw-titre" id="msb-titre">Mode stock bas</h2></div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <div class="dialog-corps"><div style="grid-column:1 / -1;min-width:0;display:flex;flex-direction:column;gap:14px">
          <label class="csw-option${v.actif ? ' choisi' : ''}">
            <span class="rp-switch"><input type="checkbox" data-msb="actif" ${v.actif ? 'checked' : ''}><span class="rp-switch-piste"></span></span>
            <span class="csw-option-txt"><b>Activer le mode stock bas</b><small>Limite toutes les commandes passées par les structures sur le portail, quel que soit leur type. Les quantités proposées dans le formulaire sont réduites en conséquence et le serveur refuse tout dépassement. Vos saisies de commande dans l’admin ne sont pas limitées.</small></span>
          </label>
          <div class="sr-global msb-global${v.actif ? '' : ' sr-off'}">
            <label class="field"><span>Articles max. par commande</span><input class="input" type="number" min="1" data-msb="maxParCommande" value="${val(v.maxParCommande)}" placeholder="Sans limite"></label>
            <label class="field"><span>Max. par produit (tous produits)</span><input class="input" type="number" min="1" data-msb="maxParProduit" value="${val(v.maxParProduit)}" placeholder="Sans limite"></label>
            <label class="field msb-message"><span>Message affiché aux structures <em>(facultatif)</em></span><input class="input" data-msb="message" maxlength="300" value="${echapper(v.message || '')}" placeholder="Ex. : Stock tendu jusqu’à fin octobre, merci de limiter vos demandes."></label>
          </div>
          <div class="sr-produits${v.actif ? '' : ' sr-off'}">
            <div class="sr-ligne msb-ligne sr-entete"><span>Produit</span><span>Stock EC</span><span>Max. par commande</span></div>
            ${
              produits
                .map(
                  (p) => `<div class="sr-ligne msb-ligne">
              <span class="sr-nom">${window.illustrationCvdl && window.cleIllustrationProduit ? window.illustrationCvdl(window.cleIllustrationProduit(p.nom, p.icone), 26) : ''}<b>${echapper(p.nom)}</b></span>
              <span class="${p.stock <= 5 ? 'msb-stock-bas' : ''}">${p.stock}</span>
              <input class="input" type="number" min="1" data-msb-produit="${echapper(p.nom)}" value="${val((v.produits || {})[p.nom])}" placeholder="${v.maxParProduit != null ? v.maxParProduit : '—'}" aria-label="Maximum par commande ${echapper(p.nom)}">
            </div>`,
                )
                .join('') || '<p class="csw-aide">Aucun produit visible.</p>'
            }
            <p class="csw-aide">Champ vide = le « max. par produit » ci-dessus s’applique.</p>
          </div>
        </div></div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-modal-fermer>Annuler</button>
          <button type="button" class="btn btn-primary" data-msb-enregistrer>${icon('check', 15)}Enregistrer</button>
        </div>
      </div>
    </div>`;
}
document.addEventListener('change', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'mode-stock-bas') return;
  const t = e.target;
  const n = (x) => (x === '' ? null : Math.max(1, parseInt(x, 10) || 1));
  if (t.dataset.msb === 'actif') {
    m.v.actif = t.checked;
    render();
    return;
  }
  if (t.dataset.msb === 'message') {
    m.v.message = t.value;
    return;
  }
  if (t.dataset.msb) {
    m.v[t.dataset.msb] = n(t.value);
    return;
  }
  if (t.dataset.msbProduit) {
    const x = n(t.value);
    if (x === null) delete m.v.produits[t.dataset.msbProduit];
    else m.v.produits[t.dataset.msbProduit] = x;
  }
});
document.addEventListener(
  'click',
  async (e) => {
    if (e.target.closest('[data-mode-stock-bas]')) {
      e.stopPropagation();
      state.modal = {
        kind: 'mode-stock-bas',
        v: JSON.parse(
          JSON.stringify(
            state.modeStockBas || {
              actif: false,
              maxParCommande: null,
              maxParProduit: null,
              produits: {},
              message: '',
            },
          ),
        ),
      };
      state.modal.v.produits = state.modal.v.produits || {};
      render();
      return;
    }
    if (!e.target.closest('[data-msb-enregistrer]')) return;
    const m = state.modal;
    if (!m || m.kind !== 'mode-stock-bas') return;
    document
      .querySelectorAll('[data-msb]:not([type=checkbox]), [data-msb-produit]')
      .forEach((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    const r = await posterEtat(
      { action: 'mode-stock-bas', mode: m.v },
      'Enregistrement…',
      m.v.actif ? 'Mode stock bas activé' : 'Mode stock bas désactivé',
    );
    if (r && r.ok) {
      state.modeStockBas = r.mode;
      state.modal = null;
      render();
    }
  },
  true,
);

/* ── « Stock restreint » : plafonds (global / par produit) et seuils de stock bas d'une
   structure en dépôt-vente, réglés dans une seule fenêtre (routes/depotVente.js). ── */
async function ouvrirStockRestreint(code) {
  state.modal = {
    kind: 'stock-restreint',
    ref: code,
    chargement: true,
    modalParent: state.modal && state.modal.kind === 'structure-360' ? state.modal : null,
  };
  render();
  try {
    const r = await jsonp({ action: 'depot-vente-limites', password: motDePasse, code });
    if (state.modal && state.modal.kind === 'stock-restreint') {
      if (r && r.ok) {
        state.modal.limites = JSON.parse(JSON.stringify(r.limites));
        state.modal.occupation = r.occupation;
      } else state.modal.erreur = (r && r.erreur) || 'Chargement impossible.';
      state.modal.chargement = false;
      render();
    }
  } catch (e) {
    if (state.modal) {
      state.modal.chargement = false;
      state.modal.erreur = 'Chargement impossible.';
      render();
    }
  }
}
function vueStockRestreint() {
  const m = state.modal;
  const s = state.structures.find((x) => x.code === m.ref) || { nom: m.ref };
  const l = m.limites || { actif: false, plafond: null, seuilBas: null, produits: {} };
  const occ = m.occupation || { total: 0, parProduit: {} };
  const d = etatDepotVente(m.ref) || {};
  const enStockP = d.parProduit || {};
  const noms = [
    ...new Set([
      ...(state.produits || []).filter((p) => p.visible && !p.dematerialise).map((p) => p.nom),
      ...Object.keys(occ.parProduit || {}),
      ...Object.keys(l.produits || {}),
    ]),
  ].filter(Boolean);
  const val = (v) => (v === null || v === undefined ? '' : v);
  const corps = m.chargement
    ? '<p style="opacity:.6">Chargement…</p>'
    : m.erreur
      ? `<div class="msg msg-erreur">${echapper(m.erreur)}</div>`
      : `
    <label class="csw-option${l.actif ? ' choisi' : ''}">
      <span class="rp-switch"><input type="checkbox" data-sr="actif" ${l.actif ? 'checked' : ''}><span class="rp-switch-piste"></span></span>
      <span class="csw-option-txt"><b>Activer le stock restreint</b><small>Limite le matériel confié à cette structure : au-delà d’un plafond, elle ne peut plus commander (le formulaire ne propose que ce qui reste possible). Le seuil de stock bas déclenche une alerte de réassort (fil des priorités, cloche, e-mail).</small></span>
    </label>
    <div class="sr-global${l.actif ? '' : ' sr-off'}">
      <div class="sr-chiffre"><b>${occ.total}</b><span>en dépôt ou en commande<br>(${d.enStock != null ? d.enStock : '—'} en stock)</span></div>
      <label class="field"><span>Plafond global</span><input class="input" type="number" min="0" inputmode="numeric" data-sr="plafond" value="${val(l.plafond)}" placeholder="Sans limite"></label>
      <label class="field"><span>Seuil de stock bas</span><input class="input" type="number" min="0" inputmode="numeric" data-sr="seuilBas" value="${val(l.seuilBas)}" placeholder="Aucune alerte"></label>
    </div>
    <div class="sr-produits${l.actif ? '' : ' sr-off'}">
      <div class="sr-ligne sr-entete"><span>Produit</span><span>En stock</span><span>Dépôt + commandes</span><span>Plafond</span><span>Seuil bas</span></div>
      ${
        noms
          .map((n) => {
            const lp = (l.produits || {})[n] || {};
            return `<div class="sr-ligne">
        <span class="sr-nom">${window.illustrationCvdl && window.cleIllustrationProduit ? window.illustrationCvdl(window.cleIllustrationProduit(n, ((state.produits || []).find((p) => p.nom === n) || {}).icone), 26) : ''}<b>${echapper(n)}</b></span>
        <span>${enStockP[n] || 0}</span><span>${(occ.parProduit || {})[n] || 0}</span>
        <input class="input" type="number" min="0" inputmode="numeric" data-sr-produit="${echapper(n)}" data-sr-champ="plafond" value="${val(lp.plafond)}" placeholder="—" aria-label="Plafond ${echapper(n)}">
        <input class="input" type="number" min="0" inputmode="numeric" data-sr-produit="${echapper(n)}" data-sr-champ="seuilBas" value="${val(lp.seuilBas)}" placeholder="—" aria-label="Seuil bas ${echapper(n)}">
      </div>`;
          })
          .join('') || '<p class="csw-aide">Aucun produit au catalogue.</p>'
      }
      <p class="csw-aide">Champ vide = pas de limite pour ce produit (seul le plafond global s’applique).</p>
    </div>`;
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="sr-titre" style="width:min(820px,100%)">
        <header class="csw-tete">
          <div class="csw-tete-txt"><div class="rp-surtitre">Dépôt-vente · Stock restreint</div><h2 class="csw-titre" id="sr-titre">${echapper(s.nom)}</h2></div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <div class="dialog-corps"><div style="grid-column:1 / -1;min-width:0;display:flex;flex-direction:column;gap:14px">${corps}</div></div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-modal-fermer>Annuler</button>
          <button type="button" class="btn btn-primary" data-sr-enregistrer ${m.chargement || m.erreur ? 'disabled' : ''}>${icon('check', 15)}Enregistrer</button>
        </div>
      </div>
    </div>`;
}
document.addEventListener('change', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'stock-restreint' || !m.limites) return;
  const t = e.target;
  const n = (v) => (v === '' ? null : Math.max(0, parseInt(v, 10) || 0));
  if (t.dataset.sr === 'actif') {
    m.limites.actif = t.checked;
    render();
    return;
  }
  if (t.dataset.sr) {
    m.limites[t.dataset.sr] = n(t.value);
    return;
  }
  if (t.dataset.srProduit) {
    const p = (m.limites.produits[t.dataset.srProduit] = m.limites.produits[t.dataset.srProduit] || {
      plafond: null,
      seuilBas: null,
    });
    p[t.dataset.srChamp] = n(t.value);
  }
});
document.addEventListener(
  'click',
  async (e) => {
    const o = e.target.closest('[data-stock-restreint]');
    if (o) {
      e.stopPropagation();
      e.preventDefault();
      ouvrirStockRestreint(o.dataset.stockRestreint);
      return;
    }
    if (!e.target.closest('[data-sr-enregistrer]')) return;
    const m = state.modal;
    if (!m || m.kind !== 'stock-restreint') return;
    document
      .querySelectorAll('[data-sr], [data-sr-produit]')
      .forEach((el) => el.dispatchEvent(new Event('change', { bubbles: true }))); // valeurs en cours de saisie
    const r = await posterEtat(
      { action: 'depot-vente-limites', code: m.ref, limites: m.limites },
      'Enregistrement…',
      'Stock restreint enregistré',
    );
    if (r && r.ok) {
      state.modal = m.modalParent || null;
      render();
      chargerDepotVente();
    }
  },
  true,
);

/** Section « Dépôt-vente » de l'onglet Stock : stock restant par structure, lien direct. */
function sectionDepotVenteStock() {
  const liste = state.depotVente || [];
  if (!liste.length) return '';
  return `
    <section class="dv-section">
      <div class="dv-tete"><span data-ill="flotte" class="ill"></span><div><h2>Dépôt-vente</h2><p>Matériel confié en dépôt : stock restant et ventes déclarées, mis à jour à chaque modification, chez elles comme ici.</p></div></div>
      <div class="dv-grille">
        ${liste
          .map((d) => {
            const pct = d.reference ? Math.round((d.enStock / d.reference) * 100) : 100;
            return `
        <article class="card dv-carte${d.moitie ? ' alerte' : ''}" data-flotte-structure="${echapper(d.code)}" role="button" tabindex="0" aria-label="Gérer la flotte de ${echapper(d.nom)}">
          <div class="dv-carte-tete"><b>${echapper(d.nom)}</b><span class="et-lien">Gérer →</span></div>
          <div class="dv-chiffre"><b>${d.enStock}</b><span>en stock${d.reference ? ` sur ${d.reference} au dernier réassort` : ''}</span></div>
          <div class="dv-barre" aria-hidden="true"><i style="width:${Math.max(3, Math.min(100, pct))}%"></i></div>
          <div class="dv-puces">
            <span>${d.vendus} vendu${d.vendus > 1 ? 's' : ''}</span>${d.sav ? `<span>${d.sav} en SAV</span>` : ''}
            ${pucesAlertesDepot(d)}
          </div>
          <button type="button" class="et-lien dv-carte-restreint" data-stock-restreint="${echapper(d.code)}">${icon('gear', 13)}Stock restreint${d.limites && d.limites.actif ? ' · actif' : ''}</button>
        </article>`;
          })
          .join('')}
      </div>
    </section>`;
}
/* Modale « Flotte » : la page flotte de la structure elle-même (même design, mêmes outils :
   liste / fiches / comptabilité, statistiques, personnes, lieux…) intégrée dans l'admin — les
   modifications sont donc exactement celles que voit la structure. Les appareils livrés sont
   ajoutés à la flotte juste avant l'ouverture. */
async function ouvrirFlotteStructure(code, modalParent) {
  state.modal = { kind: 'flotte-structure', ref: code, chargement: true, modalParent: modalParent || null };
  render();
  try {
    await jsonp({ action: 'flotte-lister-admin', password: motDePasse, code, synchroniser: 'oui' });
  } catch (e) {
    /* la page se charge quand même */
  }
  if (state.modal && state.modal.kind === 'flotte-structure' && state.modal.ref === code) {
    state.modal.chargement = false;
    render();
  }
}
function vueFlotteStructure() {
  const m = state.modal;
  const s = state.structures.find((x) => x.code === m.ref) || { nom: m.ref };
  const d = etatDepotVente(m.ref);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dv-modale" role="dialog" aria-modal="true" aria-labelledby="dv-titre">
        <header class="csw-tete dv-tete">
          <div class="csw-tete-txt"><div class="rp-surtitre">Flotte${s.depotVente ? ' · dépôt-vente' : ''}</div><h2 class="csw-titre" id="dv-titre">${echapper(s.nom)}</h2></div>
          ${d ? `<div class="dv-puces"><span><b>${d.enStock}</b> en stock${d.reference ? ` / ${d.reference}` : ''}</span><span><b>${d.vendus}</b> vendu${d.vendus > 1 ? 's' : ''}</span>${d.anciens ? `<span class="att">${d.anciens} depuis + de 2 mois</span>` : ''}${d.moitie ? '<span class="ko">Stock divisé par deux</span>' : ''}</div>` : ''}
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        ${
          m.chargement
            ? '<div class="pk-etat">Mise à jour de la flotte…</div>'
            : `<iframe class="dv-cadre" title="Flotte de ${echapper(s.nom)}" src="flotte-structure.html?code=${encodeURIComponent(m.ref)}&integre=1"></iframe>`
        }
      </div>
    </div>`;
}
document.addEventListener(
  'click',
  (e) => {
    const f = e.target.closest('[data-flotte-structure]');
    if (f) {
      e.stopPropagation();
      state.notifOuverte = false;
      ouvrirFlotteStructure(
        f.dataset.flotteStructure,
        state.modal && state.modal.kind === 'structure-360' ? state.modal : null,
      );
      return;
    }
    // En quittant la modale flotte, le stock affiché (onglet Stock, fiche, cloche) est rafraîchi.
    if (
      state.modal &&
      state.modal.kind === 'flotte-structure' &&
      (e.target.closest('[data-modal-fermer]') || e.target.matches('.dialog-backdrop'))
    )
      setTimeout(chargerDepotVente, 50);
  },
  true,
);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches && e.target.matches('.dv-carte[data-flotte-structure]')) e.target.click();
});
/* ── SAV : bon Colissimo (PDF) déposé à l'étape « Colissimo » — retrouvé par la structure et la
   personne accompagnée dans leur suivi SAV. Lien de suivi facultatif à côté. ── */
function blocColissimoSav(s) {
  return `<div class="rpd-colis">
    <div class="rpd-colis-tete"><span class="rpd-di amb">${icon('truck', 14)}</span><b>Envoi Colissimo</b><small>visible dans le suivi SAV de la structure / de la personne</small></div>
    ${
      s.bonColissimo
        ? `<div class="rpd-colis-fichier"><a href="${echapper(urlSure(s.bonColissimo))}" target="_blank" rel="noopener">${icon('file', 15)}Bon Colissimo (PDF)</a>
          <label class="et-lien">Remplacer<input type="file" accept="application/pdf,.pdf" data-sav-bon-colissimo="${s.ligne}" hidden></label>
          <button type="button" class="et-lien" data-sav-bon-retirer="${s.ligne}">Retirer</button></div>`
        : `<label class="rpd-colis-depot"><input type="file" accept="application/pdf,.pdf" data-sav-bon-colissimo="${s.ligne}" hidden>${icon('plus', 16)}<span><b>Déposer le bon Colissimo</b><small>PDF, 10 Mo maximum</small></span></label>`
    }
    <label class="rpd-colis-lien"><span>Lien de suivi du colis <em>(facultatif)</em></span>
      <input class="input" type="url" data-sav-colissimo-lien="${s.ligne}" value="${echapper(String(s.colissimo || '').split('\\n')[0] || '')}" placeholder="https://www.laposte.fr/outils/suivre-vos-envois?code=…"></label>
  </div>`;
}
async function deposerBonColissimoSav(ligne, fichier) {
  const s = state.sav.find((x) => x.ligne === ligne);
  if (!s) return;
  const base64 = fichier
    ? await new Promise((ok, ko) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result).split(',')[1] || '');
        r.onerror = ko;
        r.readAsDataURL(fichier);
      })
    : '';
  const r = await posterEtat(
    {
      action: 'sav-bon-colissimo',
      ligne,
      fichier: fichier ? { nom: fichier.name, type: fichier.type || 'application/pdf', base64 } : null,
    },
    fichier ? 'Dépôt du bon Colissimo…' : 'Retrait…',
    fichier ? 'Bon Colissimo déposé' : 'Bon retiré',
  );
  if (r && r.ok) {
    s.bonColissimo = r.url || '';
    if (typeof filSavAdminInvalider === 'function') filSavAdminInvalider(ligne);
    render();
  }
}
document.addEventListener('change', (e) => {
  const f = e.target.closest && e.target.closest('[data-sav-bon-colissimo]');
  if (f && f.files && f.files[0]) {
    deposerBonColissimoSav(parseInt(f.dataset.savBonColissimo, 10), f.files[0]);
    return;
  }
  const l = e.target.closest && e.target.closest('[data-sav-colissimo-lien]');
  if (l) {
    const s = state.sav.find((x) => x.ligne === parseInt(l.dataset.savColissimoLien, 10));
    if (!s) return;
    const v = l.value.trim();
    if (v && !/^https?:\/\//i.test(v)) {
      etat('Le lien doit commencer par https://', 'erreur');
      return;
    }
    posterEtat(
      { action: 'sav-update', ligne: s.ligne, champ: 'colissimo', valeur: v },
      'Enregistrement…',
      'Lien de suivi enregistré',
    ).then((r) => {
      if (r && r.ok) {
        s.colissimo = v;
        render();
      }
    });
  }
});
document.addEventListener('click', async (e) => {
  const r = e.target.closest('[data-sav-bon-retirer]');
  if (r && (await confirmerCvdl('Retirer le bon Colissimo de ce dossier ? Il ne sera plus proposé dans le suivi SAV.')))
    deposerBonColissimoSav(parseInt(r.dataset.savBonRetirer, 10), null);
});
