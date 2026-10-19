/* ============================================================
   Transferts de stock : tableurs envoyés par les structures (carte
   « Transférer mon stock » de leur espace). Fil des priorités, bloc
   de la fiche structure, import prérempli (import-appareils.js),
   téléchargement du fichier, « traité ».
   Serveur : routes/transfertsStock.js.
   ============================================================ */
async function chargerTransfertsStock() {
  try {
    const r = await lireApi({ action: 'transferts-stock' });
    if (r && r.ok) {
      state.transfertsStock = r.demandes || [];
      if (!state.modal || state.modal.kind === 'structure-360') render();
    }
  } catch (e) {
    /* non bloquant */
  }
}
const transfertsStockATraiter = () => (state.transfertsStock || []).filter((d) => !d.traiteLe);
const libelleAppareils = (n) => (n == null ? '' : `${n} appareil${n > 1 ? 's' : ''}`);

/** Lignes du fil des priorités (tableau de bord et cloche). */
function feedTransfertsStock() {
  return transfertsStockATraiter().map((d) => {
    const s = state.structures.find((x) => x.code === d.code);
    // Même règle que les nouvelles commandes : signalé en jaune après 3 jours d'attente.
    const j = Math.floor((Date.now() - new Date(d.deposeLe).getTime()) / 86400000);
    return {
      icon: icon('package', 15),
      badgeBg: j >= 3 ? '#FFF3CC' : 'var(--color-accent-2-100)',
      badgeFg: j >= 3 ? '#7A5A00' : 'var(--color-accent-2-700)',
      tagCls: j >= 3 ? '' : 'tag-accent',
      tagStyle: j >= 3 ? 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)' : '',
      type: 'Transfert de stock',
      id: d.nomFichier,
      structure: d.nomStructure,
      statut:
        j >= 3
          ? `Tableur en attente depuis ${j} jours`
          : `Tableur à importer${d.appareils != null ? ` (${libelleAppareils(d.appareils)})` : ''}`,
      urgent: false,
      date: new Date(d.deposeLe),
      attrs: s ? `data-structure-vue="${s.id}"` : '',
    };
  });
}

/** Bloc de la fiche structure : envois de la structure, à importer ou déjà traités. */
function blocTransfertsStructure360(s) {
  const demandes = (state.transfertsStock || []).filter((d) => d.code === s.code);
  if (!demandes.length) return '';
  const date = (iso) => new Date(iso).toLocaleDateString('fr-FR');
  return `<section class="s3-bloc s3-large ts-s3">
    <div class="s3-bloc-tete"><span data-ill="flotte" class="ill s"></span><h3>Transferts de stock</h3><span>${demandes.length}</span></div>
    ${demandes
      .map(
        (d) => `<div class="ts-s3-ligne${d.traiteLe ? ' fait' : ''}">
        <div class="ts-s3-txt"><b>${echapper(d.nomFichier)}</b>
          <small>Envoyé le ${date(d.deposeLe)}${d.appareils != null ? ` · ${libelleAppareils(d.appareils)}` : ' · tableur à lire à la main'}${d.traiteLe ? ` · traité le ${date(d.traiteLe)} par ${echapper(d.traitePar)}${d.resultat ? ` (${echapper(d.resultat)})` : ''}` : ''}</small>
          ${d.message ? `<p class="ts-s3-message">« ${echapper(d.message)} »</p>` : ''}
        </div>
        <div class="ts-s3-actions">
          ${d.fichierDisponible ? `<button type="button" class="btn btn-ghost" data-ts-telecharger="${d.id}">${icon('file', 14)}Télécharger</button>` : '<span class="ts-s3-efface">Fichier effacé</span>'}
          ${
            d.traiteLe
              ? ''
              : `${d.fichierDisponible && d.appareils != null ? `<button type="button" class="btn btn-primary" data-ts-importer="${d.id}">${icon('plus', 14)}Importer</button>` : ''}
          <button type="button" class="btn btn-secondary" data-ts-traiter="${d.id}">${icon('check', 14)}Traité</button>`
          }
        </div>
      </div>`,
      )
      .join('')}
  </section>`;
}

/** Bilan d'import en une phrase, gardé avec la demande (« 12 ajoutés, 3 déjà connus »). */
function resumeBilanImport(b) {
  const deja = (b.deja || 0) + (b.ailleurs || 0);
  return [`${b.ajoute} ajouté${b.ajoute > 1 ? 's' : ''}`, deja ? `${deja} déjà connu${deja > 1 ? 's' : ''}` : '']
    .filter(Boolean)
    .join(', ');
}
async function marquerTransfertTraite(id, resultat) {
  const r = await poster({ action: 'transfert-stock-traiter', id, resultat });
  if (!r.ok) return etat(r.erreur || 'Enregistrement impossible.', 'erreur');
  await chargerTransfertsStock();
}

document.addEventListener('click', async (e) => {
  const tele = e.target.closest('[data-ts-telecharger]');
  if (tele) {
    const r = await poster({ action: 'transfert-stock-fichier', id: Number(tele.dataset.tsTelecharger) });
    if (!r.ok) return etat(r.erreur || 'Téléchargement impossible.', 'erreur');
    const octets = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([octets], { type: 'application/octet-stream' }));
    a.download = r.nom;
    a.click();
    return;
  }
  const imp = e.target.closest('[data-ts-importer]');
  if (imp) {
    const id = Number(imp.dataset.tsImporter);
    const d = (state.transfertsStock || []).find((x) => x.id === id);
    const s = d && state.structures.find((x) => x.code === d.code);
    if (!s) return;
    const r = await poster({ action: 'transfert-stock-csv', id });
    if (!r.ok) return etat(r.erreur || 'Lecture du tableur impossible.', 'erreur');
    window.ImportAppareils.ouvrir({
      structureId: s.id,
      nomStructure: s.nom,
      poster: (action, donnees) => poster(Object.assign({ action }, donnees)),
      csv: r.csv,
      fichier: d.nomFichier,
      apresImport: (rep) => marquerTransfertTraite(id, resumeBilanImport(rep.bilan)),
    });
    return;
  }
  const fait = e.target.closest('[data-ts-traiter]');
  if (fait && (await confirmerCvdl('Marquer cet envoi comme traité ? La structure le verra « ajouté ».')))
    marquerTransfertTraite(Number(fait.dataset.tsTraiter), 'traité à la main');
});
