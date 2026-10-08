/* Admin CVDL — devis et factures. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueFactures() {
  const q = state.docSearch.trim().toLowerCase();

  // Un "dossier" = une commande qui a un devis, une facture, un état de rapprochement, ou qui a
  // demandé un devis pas encore généré (sinon ces commandes-là restaient invisibles ici alors
  // que c'est justement une tâche à faire) — les 3 blocs sont alignés sur cette même commande.
  let dossiers = state.commandes
    .filter(
      (c) =>
        c.referenceDevis ||
        c.referenceFacture ||
        c.statutComptable ||
        (c.devisDemande && !structureExclueDevisFacture(c)),
    )
    .map((c) => ({
      c,
      d: state.devis.find((x) => x.referenceDevis === c.referenceDevis),
      f: state.factures.find((x) => x.referenceFacture === c.referenceFacture),
    }));
  if (q)
    dossiers = dossiers.filter(
      ({ c, d, f }) =>
        c.nom.toLowerCase().includes(q) ||
        (d && d.referenceDevis.toLowerCase().includes(q)) ||
        (f && f.referenceFacture.toLowerCase().includes(q)),
    );
  // Un devis "en attente" est un devis pas encore généré pour une commande qui en a demandé un
  // — pas un devis déjà émis (qui restait compté indéfiniment tant que son statut ne progresse
  // jamais au-delà de "Émis" côté back, ce qui revenait à compter TOUS les devis existants).
  const nbDevisAttente = dossiers.filter(({ c, d }) => !d && c.devisDemande).length;
  const nbFactureImpayee = dossiers.filter(({ f }) => f && f.statut !== 'Payée' && f.statut !== 'Annulée').length;
  if (state.docsFiltre === 'devis-attente') dossiers = dossiers.filter(({ c, d }) => !d && c.devisDemande);
  if (state.docsFiltre === 'facture-impayee')
    dossiers = dossiers.filter(({ f }) => f && f.statut !== 'Payée' && f.statut !== 'Annulée');

  // Couleur de fond selon le statut réel de chaque pièce (DOC_META / BADGE) : un dossier soldé
  // (devis accepté, facture payée, rapproché) ressort en vert. `vert` (paiement reçu) recolore
  // aussi l'icône, la référence et le statut.
  const infosDevis = (d, vert) =>
    d
      ? {
          present: true,
          type: 'devis',
          ref: d.referenceDevis,
          bg: vert
            ? BADGE['tag-accent-2'].bg
            : d.dateEnvoiEmail
              ? BADGE['tag-warn'].bg
              : mkTag(d.statut, DOC_META).badgeBg,
          html: (() => {
            // Étape intermédiaire "envoyé par email" (jaune pâle, comme le vert pour "tout clôturé")
            // — n'écrase l'affichage du statut que si le dossier n'est pas déjà totalement clôturé.
            const envoye = !vert && !!d.dateEnvoiEmail;
            const fg = vert
              ? BADGE['tag-accent-2'].fg
              : envoye
                ? BADGE['tag-warn'].fg
                : mkTag(d.statut, DOC_META).badgeFg;
            const ic = vert ? icon('check', 15) : envoye ? icon('mail', 15) : mkTag(d.statut, DOC_META).icon;
            const titreEnvoi = envoye
              ? ` title="Envoyé à ${echapper(d.destinataireEnvoiEmail)} le ${echapper(d.dateEnvoiEmail)}"`
              : '';
            return `<span${titreEnvoi} class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${fg} 18%, var(--color-surface));color:${fg}">${ic}</span>
      <span style="font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${fg}">${echapper(d.referenceDevis)}</span>
      <span class="tag" style="flex:none;background:var(--color-surface);color:${fg}">${echapper(vert ? 'Accepté' : envoye ? 'Envoyé' : d.statut)}</span>
      <div style="font-size:13px;font-weight:600;flex:1;text-align:right;white-space:nowrap;color:${fg}">${echapper(formaterMontant(d.montantTotal))}</div>`;
          })(),
        }
      : {
          present: false,
          bg: vert ? BADGE['tag-accent-2'].bg : null,
          html: vert
            ? `<span style="font-size:12.5px;color:${BADGE['tag-accent-2'].fg}">Pas de devis</span>`
            : `<span style="font-size:12.5px">Pas de devis</span>`,
        };

  const infosFacture = (f, vert) =>
    f
      ? {
          present: true,
          type: 'facture',
          ref: f.referenceFacture,
          bg: vert
            ? BADGE['tag-accent-2'].bg
            : f.dateEnvoiEmail
              ? BADGE['tag-warn'].bg
              : mkTag(f.statut, DOC_META).badgeBg,
          html: (() => {
            const envoye = !vert && !!f.dateEnvoiEmail;
            const fg = vert
              ? BADGE['tag-accent-2'].fg
              : envoye
                ? BADGE['tag-warn'].fg
                : mkTag(f.statut, DOC_META).badgeFg;
            const ic = vert ? icon('check', 15) : envoye ? icon('mail', 15) : mkTag(f.statut, DOC_META).icon;
            const titreEnvoi = envoye
              ? ` title="Envoyé à ${echapper(f.destinataireEnvoiEmail)} le ${echapper(f.dateEnvoiEmail)}"`
              : '';
            return `<span${titreEnvoi} class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${fg} 18%, var(--color-surface));color:${fg}">${ic}</span>
      <span style="font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${fg}">${echapper(f.referenceFacture)}</span>
      <span class="tag" style="flex:none;background:var(--color-surface);color:${fg}">${echapper(vert ? 'Payée' : envoye ? 'Envoyée' : f.statut)}</span>
      <div style="font-size:13px;font-weight:600;flex:1;text-align:right;white-space:nowrap;color:${fg}">${echapper(formaterMontant(f.montantTotal))}</div>`;
          })(),
        }
      : {
          present: false,
          bg: vert ? BADGE['tag-accent-2'].bg : null,
          html: vert
            ? `<span style="font-size:12.5px;color:${BADGE['tag-accent-2'].fg}">Pas de facture</span>`
            : `<span style="font-size:12.5px">Pas de facture</span>`,
        };

  const infosRappro = (c, f) => {
    if (!f) return { present: false, bg: null, html: `<span style="font-size:12.5px">—</span>` };
    // Trois niveaux : Non rapproché (rouge) → Rapproché (jaune, pointé mais pas clos) →
    // Clôturé (vert).
    const b =
      c.statutComptable === 'Clôturé'
        ? BADGE['tag-accent-2']
        : c.statutComptable === 'Rapproché'
          ? BADGE['tag-warn']
          : { bg: 'var(--color-corail-100)', fg: 'var(--color-corail-700)' };
    const icone = c.statutComptable === 'Clôturé' ? 'check' : c.statutComptable === 'Rapproché' ? 'clock' : 'alert';
    // ajustement optique d'un pixel pour le triangle et l'horloge, qui paraissent décalés une
    // fois centrés
    const decalageIcone = icone === 'alert' ? '-1px' : icone === 'clock' ? '0.5px' : '0px';
    return {
      present: true,
      bg: b.bg,
      html: `
      <span class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;line-height:0;background:color-mix(in srgb, ${b.fg} 18%, var(--color-surface));color:${b.fg}"><span style="display:block;position:relative;top:${decalageIcone}">${icon(icone, 15)}</span></span>
      <div style="flex:1;min-width:0;color:${b.fg}">
        <div style="font-size:13px">${echapper(c.nom)}</div>
        ${c.numeroDepot ? `<div style="font-size:11.5px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(c.numeroDepot)}</div>` : ''}
      </div>
      <button type="button" class="tag" style="border:none;cursor:pointer;flex:none;background:var(--color-surface);color:${b.fg}" data-ouvrir-rapprochement="${echapper(f.referenceFacture)}">${echapper(c.statutComptable || 'Non rapproché')}</button>`,
      rappro: f.referenceFacture,
    };
  };

  const cellule = (info, hauteurPleine) => `
    <div class="rp-doc-cel${info.present ? ' plein' : ''}" style="min-width:0;padding:var(--space-3);border-radius:var(--radius-md);display:flex;align-items:center;gap:var(--space-3);${hauteurPleine ? 'height:100%;' : ''}background:${info.bg || 'transparent'};border:${info.present || info.bg ? 'none' : '2.5px dashed var(--color-neutral-400)'};opacity:${info.present || info.bg ? '1' : '0.55'};overflow:hidden${info.type || info.rappro ? ';cursor:pointer' : ''}" ${info.type ? `data-doc-ouvrir="${info.type}:${echapper(info.ref)}"` : ''}${info.rappro ? ` data-ouvrir-rapprochement="${echapper(info.rappro)}" role="button" tabindex="0" title="Ouvrir la clôture"` : ''}>
      ${info.html}
    </div>`;
  const traitVertical = (present) =>
    `<div class="rp-doc-trait${present ? ' ok' : ''}" style="width:2px;height:12px;margin-left:26px;background:${present ? 'var(--color-accent-2)' : 'var(--color-divider)'}"></div>`;
  const traitHorizontal = (present) =>
    `<div class="rp-doc-trait h${present ? ' ok' : ''}" style="align-self:center;height:2px;background:${present ? 'var(--color-accent-2)' : 'var(--color-divider)'};min-width:20px"></div>`;

  const vueColonne = state.docsVue !== 'ligne';

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Devis / Factures</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">${vueColonne ? 'Devis, facture et rapprochement de chaque commande, empilés dossier par dossier.' : 'Devis, facture et rapprochement de chaque commande, alignés sur une même ligne.'}</p>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <div class="rp-seg">
          <button type="button" class="${vueColonne ? 'actif' : ''}" data-docs-vue="colonne">Colonne</button>
          <button type="button" class="${vueColonne ? '' : 'actif'}" data-docs-vue="ligne">Ligne</button>
        </div>
        <button type="button" class="btn btn-secondary" data-factures-mensuelles title="Produits payés en fin de mois (recharges…) : une facture par structure et par mois">${icon('calendrier', 15)}Factures mensuelles</button>
        <button type="button" class="btn btn-secondary" data-ouvrir-creation="devis">${icon('plus', 15)}Nouveau devis</button>
        <button type="button" class="btn btn-primary" data-ouvrir-creation="facture">${icon('plus', 15)}Nouvelle facture</button>
      </div>
    </div>
    ${champRecherche('rp-recherche-docs', 'Rechercher par nom de facture/devis...', state.docSearch)}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:var(--space-3) 0 var(--space-5)">
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${!state.docsFiltre ? 'var(--color-neutral-900)' : 'var(--color-surface)'};color:${!state.docsFiltre ? 'var(--th-tx-ffffffff, #fff)' : 'var(--color-text)'};border:1.5px solid ${!state.docsFiltre ? 'var(--color-neutral-900)' : 'var(--color-divider)'}" data-filtrer-docs="">
        Tous
      </button>
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${state.docsFiltre === 'devis-attente' ? 'var(--color-accent)' : 'var(--color-surface)'};color:${state.docsFiltre === 'devis-attente' ? 'var(--th-tx-ffffffff, #fff)' : 'var(--color-text)'};border:1.5px solid ${state.docsFiltre === 'devis-attente' ? 'transparent' : 'var(--color-divider)'}" data-filtrer-docs="devis-attente">
        Devis en attente <span style="opacity:0.65;font-weight:600">${nbDevisAttente}</span>
      </button>
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${state.docsFiltre === 'facture-impayee' ? 'var(--color-accent)' : 'var(--color-surface)'};color:${state.docsFiltre === 'facture-impayee' ? 'var(--th-tx-ffffffff, #fff)' : 'var(--color-text)'};border:1.5px solid ${state.docsFiltre === 'facture-impayee' ? 'transparent' : 'var(--color-divider)'}" data-filtrer-docs="facture-impayee">
        Facture impayée <span style="opacity:0.65;font-weight:600">${nbFactureImpayee}</span>
      </button>
    </div>
    ${
      dossiers.length
        ? vueColonne
          ? `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-4)">
      ${dossiers
        .map(({ c, d, f }) => {
          const surligne =
            state.highlightRef &&
            (state.highlightRef === (d && d.referenceDevis) || state.highlightRef === (f && f.referenceFacture));
          // Clôturé = les 3 cases passent en vert ensemble (icône, référence et libellé compris,
          // pas juste le fond), plutôt que chacune sa propre couleur de statut individuel — un
          // dossier soldé doit se voir d'un coup d'œil, sans avoir à lire le détail de chaque case.
          const toutClôture = c.statutComptable === 'Clôturé';
          const iD = infosDevis(d, toutClôture),
            iF = infosFacture(f, toutClôture),
            iR = infosRappro(c, f);
          return `
        <div class="card elev-sm ${surligne ? 'rp-surligne' : ''}" style="padding:var(--space-4);gap:0">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;opacity:0.5;padding:0 4px 8px">${echapper(c.reference)} · ${echapper(c.nom)}</div>
          <div style="display:flex;flex-direction:column">
            ${cellule(iD)}
            ${traitVertical(iD.present && iF.present)}
            ${cellule(iF)}
            ${traitVertical(iF.present)}
            ${cellule(iR)}
          </div>
        </div>`;
        })
        .join('')}
    </div>`
          : `
    <div style="display:flex;flex-direction:column;gap:var(--space-5)">
      ${dossiers
        .map(({ c, d, f }) => {
          const surligne =
            state.highlightRef &&
            (state.highlightRef === (d && d.referenceDevis) || state.highlightRef === (f && f.referenceFacture));
          const toutClôture = c.statutComptable === 'Clôturé';
          const iD = infosDevis(d, toutClôture),
            iF = infosFacture(f, toutClôture),
            iR = infosRappro(c, f);
          return `
        <div class="card elev-sm ${surligne ? 'rp-surligne' : ''}" style="padding:var(--space-3);display:grid;grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr) 24px minmax(0,1fr);align-items:stretch;gap:0">
          ${cellule(iD, true)}
          ${traitHorizontal(iD.present && iF.present)}
          ${cellule(iF, true)}
          ${traitHorizontal(iF.present)}
          ${cellule(iR, true)}
        </div>`;
        })
        .join('')}
    </div>`
        : '<p style="opacity:0.5;font-size:13px;padding:var(--space-6)">Aucun dossier devis/facture.</p>'
    }
    ${(() => {
      // Devis créés "libres" (sans commande rattachée) — la liste des dossiers ci-dessus se
      // construit à partir des commandes, elle ne les verrait donc jamais.
      const devisLibres = state.devis.filter((d) => !d.referenceCommande);
      if (!devisLibres.length) return '';
      return `
      <div style="margin-top:var(--space-6)">
        <div class="card-title" style="font-size:16px;margin-bottom:var(--space-3)">Devis libres <span style="opacity:0.5;font-weight:400">· pas encore rattachés à une commande</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${devisLibres
            .map(
              (d) => `
            <div class="card elev-sm" style="padding:var(--space-3) var(--space-4);flex-direction:row;align-items:center;gap:var(--space-3)">
              <span style="font-size:13px;font-weight:700;flex:none">${echapper(d.referenceDevis)}</span>
              <span style="font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(d.nomStructure)} — ${echapper(d.produit)}</span>
              <span style="font-size:13px;font-weight:600;flex:none">${echapper(formaterMontant(d.montantTotal))}</span>
              <button type="button" class="btn btn-secondary" style="flex:none" data-rattacher-devis="${d.id}">Rattacher une commande</button>
            </div>`,
            )
            .join('')}
        </div>
      </div>`;
    })()}`;
}
function formaterMontant(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') + ' €' : v || '—';
}

/* ============================================================
   Stock — pas encore branché
   ============================================================ */
const SEUIL_STOCK_FAIBLE = 3;
