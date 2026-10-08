/* Admin CVDL — création de devis et de facture. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueCreerDevis() {
  const libre = state.modal.libre;
  const eligibles = state.commandes.filter((c) => !c.referenceDevis && !structureExclueDevisFacture(c));
  const options = eligibles
    .map((c) => `<option value="${c.id}">${echapper(c.reference)} — ${echapper(c.nom)}</option>`)
    .join('');
  const optionsStructures =
    '<option value="">— Non listée / saisie libre —</option>' +
    state.structures.map((s) => `<option value="${echapper(s.code)}">${echapper(s.nom)}</option>`).join('');
  const optionsProduitsDevis = state.produits
    .map(
      (p) =>
        `<option value="${echapper(p.nom)}" data-prix="${p.prixStandard}">${echapper(p.nom)} (${p.prixStandard}€)</option>`,
    )
    .join('');
  const total = state.ndLignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  return dialogShell(
    'Nouveau devis',
    `
    <div class="rp-seg" style="margin-bottom:var(--space-2);width:fit-content;grid-column:1/-1">
      <button type="button" class="${libre ? '' : 'actif'}" data-toggle-devis-libre="0">Depuis une commande</button>
      <button type="button" class="${libre ? 'actif' : ''}" data-toggle-devis-libre="1">Devis libre</button>
    </div>
    ${
      libre
        ? `
      <p style="opacity:0.6;font-size:12.5px;margin:0 0 var(--space-3)">Pour un devis envoyé avant que la commande existe côté admin — à rattacher plus tard depuis la section "Devis libres".</p>
      ${champ('Structure', `<select class="input" id="nd-structure-select">${optionsStructures}</select>`)}
      ${champ('Structure / destinataire *', `<input class="input" id="cdl-structure" value="${echapper(state.ndStructureNom)}">`)}
      ${champ('Email', `<input class="input" id="cdl-email" type="email" value="${echapper(state.ndEmail)}">`)}
      ${champ('Adresse', `<textarea class="input" id="cdl-adresse" rows="2">${echapper(state.ndAdresse)}</textarea>`)}
      ${champ(
        'Ajouter un produit ou une prestation',
        `
        <div style="display:flex;gap:8px">
          <select class="input" id="nd-produit-select" style="flex:1">${optionsProduitsDevis}</select>
          <input class="input" id="nd-produit-qte" type="number" min="1" value="1" style="width:70px">
          <button type="button" class="btn btn-secondary" data-nd-ajouter-ligne>${icon('plus', 15)}</button>
        </div>`,
      )}
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:var(--space-2)">
        ${
          state.ndLignes
            .map(
              (l, i) => `
        <div style="display:flex;align-items:center;gap:8px;background:var(--color-neutral-100);border-radius:var(--radius-md);padding:8px 12px">
          <span style="flex:1;font-size:13px">${l.quantite}× ${echapper(l.produit)}</span>
          <input type="number" class="input" data-nd-prix-ligne="${i}" value="${l.prixUnitaire}" step="0.01" min="0" style="width:90px" title="Prix unitaire (€)">
          <span style="font-size:12.5px;opacity:0.6;width:70px;text-align:right">${(l.quantite * l.prixUnitaire).toFixed(2)}€</span>
          <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-nd-retirer-ligne="${i}">${icon('x', 14)}</button>
        </div>`,
            )
            .join('') || '<p style="opacity:0.5;font-size:12.5px">Aucun produit ajouté.</p>'
        }
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-divider)">
        <span style="font-weight:700;font-size:13.5px">Montant total</span>
        <span style="font-family:var(--font-heading);font-weight:700;font-size:19px">${total.toFixed(2)}€</span>
      </div>
    `
        : eligibles.length
          ? champ('Commande *', `<select class="input" id="cd-commande">${options}</select>`)
          : '<p style="opacity:0.6;font-size:13px;margin-top:var(--space-2)">Aucune commande sans devis à facturer.</p>'
    }
    ${liensRaccourcis('devis')}
  `,
    'cd-enregistrer',
  );
}
async function enregistrerDevis() {
  if (state.modal.libre) return enregistrerDevisLibre();
  const select = $('cd-commande');
  if (!select) {
    state.modal = null;
    render();
    return;
  }
  const id = parseInt(select.value, 10);
  $('cd-enregistrer').disabled = true;
  try {
    etat('Génération…', 'chargement');
    const r = await poster({ action: 'commande-devis-direct', id });
    if (r.ok) {
      etat(r.avertissement || 'Devis généré', 'succes', r.avertissement ? 6000 : 2600);
      const [rc, rd] = await Promise.all([
        jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
        jsonp({ action: 'devis', password: motDePasse, limite: 0 }),
      ]);
      if (rc.ok) state.commandes = rc.commandes;
      if (rd.ok) state.devis = rd.devis;
      state.modal = null;
      render();
    } else {
      etat(r.erreur || 'Génération impossible', 'erreur');
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('cd-enregistrer').disabled = false;
    }
  } catch (e) {
    etat('Génération impossible', 'erreur');
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
    $('cd-enregistrer').disabled = false;
  }
}
async function annulerDocumentAction(type, id, motif) {
  const r = await posterEtat(
    { action: `${type}-annuler`, id, motif },
    'Annulation…',
    type === 'devis' ? 'Devis annulé' : 'Facture annulée',
  );
  if (r.ok) {
    const [rc, rd, rf] = await Promise.all([
      jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
      jsonp({ action: 'devis', password: motDePasse, limite: 0 }),
      jsonp({ action: 'factures', password: motDePasse, limite: 0 }),
    ]);
    if (rc.ok) state.commandes = rc.commandes;
    if (rd.ok) state.devis = rd.devis;
    if (rf.ok) state.factures = rf.factures;
    state.modal = null;
    state.documentGenere = null;
    render();
  }
}
async function genererDocumentPdf() {
  const dg = state.documentGenere;
  if (!dg) return;
  const estDevis = dg.type === 'devis';
  const doc = estDevis
    ? state.devis.find((x) => x.referenceDevis === dg.ref)
    : state.factures.find((x) => x.referenceFacture === dg.ref);
  if (!doc) return;
  dg.chargement = true;
  dg.erreur = null;
  render();
  try {
    const r = await poster({ action: estDevis ? 'devis-generer-pdf' : 'facture-generer-pdf', id: doc.id });
    if (r.ok) {
      dg.url = r.url;
    } else {
      dg.erreur = r.erreur || 'Génération impossible.';
    }
  } catch (e) {
    dg.erreur = 'Génération impossible — réessaie.';
  }
  dg.chargement = false;
  render();
}
async function envoyerDocumentGenere() {
  const dg = state.documentGenere;
  if (!dg) return;
  const doc =
    dg.type === 'devis'
      ? state.devis.find((x) => x.referenceDevis === dg.ref)
      : state.factures.find((x) => x.referenceFacture === dg.ref);
  if (!doc) return;
  const email = $('dg-email').value.trim();
  if (!email) {
    dg.erreur = 'Renseigne une adresse email.';
    render();
    return;
  }
  dg.envoiChargement = true;
  dg.erreur = null;
  dg.envoiOk = false;
  render();
  try {
    const r = await poster({
      action: dg.type === 'devis' ? 'devis-envoyer' : 'facture-envoyer',
      id: doc.id,
      email,
      url: dg.url,
      sujet: $('dg-sujet').value.trim(),
      texte: $('dg-texte').value,
    });
    if (r.ok) {
      dg.envoiOk = true;
      dg.envoiOuvert = false;
      const [rd, rf] = await Promise.all([
        jsonp({ action: 'devis', password: motDePasse, limite: 0 }),
        jsonp({ action: 'factures', password: motDePasse, limite: 0 }),
      ]);
      if (rd.ok) state.devis = rd.devis;
      if (rf.ok) state.factures = rf.factures;
    } else {
      dg.erreur = r.erreur || 'Envoi impossible.';
    }
  } catch (e) {
    dg.erreur = 'Envoi impossible — réessaie.';
  }
  dg.envoiChargement = false;
  render();
}
async function enregistrerDevisLibre() {
  const nomStructure = $('cdl-structure').value.trim();
  if (!nomStructure) {
    $('rp-retour-modale').innerHTML =
      '<div class="msg msg-erreur">La structure / le destinataire est obligatoire.</div>';
    return;
  }
  if (!state.ndLignes.length) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Ajoute au moins un produit ou une prestation.</div>';
    return;
  }
  $('cd-enregistrer').disabled = true;
  try {
    const r = await posterEtat(
      {
        action: 'devis-creer-libre',
        nomStructure,
        lignes: state.ndLignes,
        email: $('cdl-email').value.trim(),
        adresse: $('cdl-adresse').value.trim(),
      },
      'Génération…',
      'Devis libre créé',
    );
    if (r.ok) {
      const rd = await jsonp({ action: 'devis', password: motDePasse, limite: 0 });
      if (rd.ok) state.devis = rd.devis;
      state.modal = null;
      state.ndLignes = [];
      render();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('cd-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
    $('cd-enregistrer').disabled = false;
  }
}

function vueCreerFacture() {
  const eligibles = state.commandes.filter((c) => !c.referenceFacture && !structureExclueDevisFacture(c));
  const options = eligibles
    .map((c) => `<option value="${c.id}">${echapper(c.reference)} — ${echapper(c.nom)}</option>`)
    .join('');
  return dialogShell(
    'Nouvelle facture',
    `
    ${
      eligibles.length
        ? `
      ${champ('Commande *', `<select class="input" id="cf-commande">${options}</select>`)}
      ${champ('Numéro de facture *', '<input class="input" id="cf-numero">')}
    `
        : '<p style="opacity:0.6;font-size:13px;margin-top:var(--space-2)">Aucune commande sans facture à facturer.</p>'
    }
    ${liensRaccourcis('facture')}
  `,
    'cf-enregistrer',
  );
}
async function enregistrerFacture() {
  const select = $('cf-commande');
  if (!select) {
    state.modal = null;
    render();
    return;
  }
  const id = parseInt(select.value, 10);
  const numeroFacture = $('cf-numero').value.trim();
  if (!numeroFacture) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Le numéro de facture est obligatoire.</div>';
    return;
  }
  $('cf-enregistrer').disabled = true;
  try {
    const r = await posterEtat(
      { action: 'commande-facturer-direct', id, numeroFacture },
      'Génération…',
      'Facture générée',
    );
    if (r.ok) {
      const [rc, rf] = await Promise.all([
        jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
        jsonp({ action: 'factures', password: motDePasse, limite: 0 }),
      ]);
      if (rc.ok) state.commandes = rc.commandes;
      if (rf.ok) state.factures = rf.factures;
      state.modal = null;
      render();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('cf-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
    $('cf-enregistrer').disabled = false;
  }
}

/* ============================================================
   Thème clair / sombre
   ============================================================ */
function basculerTheme() {
  const sombre = document.documentElement.classList.toggle('rp-dark');
  try {
    localStorage.setItem('cvdl-theme', sombre ? 'dark' : 'light');
  } catch (e) {}
  majLabelTheme();
}
function majLabelTheme() {
  const label = $('rp-toggle-theme-label');
  if (label) label.textContent = document.documentElement.classList.contains('rp-dark') ? 'Mode clair' : 'Mode sombre';
}

/* Style unifié (admin-unifie.css) / ancien style — le fichier ne s'applique que sous
   html.rp-unifie, donc retirer la classe suffit à revenir exactement à l'ancien rendu. */
function basculerStyle() {
  const unifie = document.documentElement.classList.toggle('rp-unifie');
  try {
    localStorage.setItem('cvdl-style', unifie ? 'unifie' : 'ancien');
  } catch (e) {}
  majLabelStyle();
  render();
}
/* Contenu en pleine largeur / largeur limitée (mémorisé). */
function basculerLargeur() {
  const pleine = document.documentElement.classList.toggle('rp-pleine');
  try {
    localStorage.setItem('cvdl-largeur', pleine ? 'pleine' : 'limitee');
  } catch (e) {}
  majLabelLargeur();
}
function majLabelLargeur() {
  const l = $('rp-toggle-largeur-label');
  if (l)
    l.textContent = document.documentElement.classList.contains('rp-pleine') ? 'Largeur limitée' : 'Pleine largeur';
}
/** Modale « parente » quand on en ouvre une par-dessus une autre (fiche 360° → commande,
 *  commande → fiche 360°…) : la fermeture ne referme alors que la dernière ouverte. */
function modalParentPour(kind) {
  if (!state.modal || state.modal.kind === kind) return state.modal ? state.modal.modalParent || null : null;
  return state.modal;
}
/** Pictogramme des actions d'annulation (commande, SAV…), toujours en bas à gauche des fiches. */
function iconeAnnuler(t) {
  t = t || 18;
  return `<svg class="ic-annuler" viewBox="0 0 24 24" width="${t}" height="${t}" aria-hidden="true"><circle cx="13" cy="13" r="8.5" fill="#F5A3BC"/><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11.5" cy="11.5" r="8.5"/><path d="M8.5 8.5l6 6M14.5 8.5l-6 6"/></g></svg>`;
}
function estUnifie() {
  return document.documentElement.classList.contains('rp-unifie');
}
/* Formes des statuts (style unifié) — losange : en attente d'une décision, carré : pris en
   charge / en cours, rond : terminé. Déduites du libellé affiché, pour couvrir toutes les
   pastilles existantes sans toucher à chacun de leurs rendus. */
const FORMES_STATUT = {
  Reçue: 'losange',
  Validée: 'carre',
  Préparée: 'carre',
  'En cours de livraison': 'carre',
  'En livraison': 'carre',
  Livrée: 'rond',
  Annulée: 'rond',
  'En attente': 'losange',
  Émis: 'losange',
  Émise: 'losange',
  Envoyé: 'losange',
  Envoyée: 'losange',
  'En retard': 'losange',
  'Non payé': 'losange',
  'Non payée': 'losange',
  Accepté: 'rond',
  'Accepté sans réserve': 'rond',
  Payé: 'rond',
  Payée: 'rond',
  Remboursé: 'rond',
  Annulé: 'rond',
  Refusé: 'rond',
  Rapproché: 'carre',
  Estimée: 'carre',
  Confirmée: 'rond',
  'Non rapproché': 'losange',
  Clôturé: 'rond',
};
function formeStatut(texte) {
  const t = String(texte || '')
    .trim()
    .replace(/^SAV\s+/, '')
    .split(' · ')[0]
    .trim();
  if (FORMES_STATUT[t]) return FORMES_STATUT[t];
  const sav = state.statutsSav || [];
  const def = sav.find((d) => d.statut === t);
  if (def) {
    if (def.terminal || def.finCycle) return 'rond';
    const premier = sav.find((d) => !d.terminal);
    return premier && premier.statut === t ? 'losange' : 'carre';
  }
  return null;
}
const ILL_MODALE = [
  [/statut/i, 'suiviSav'],
  [/structure/i, 'structures'],
  [/cat[ée]gorie|organiser/i, 'categories'],
  [/attestation/i, 'attestations'],
  [/mod[èe]le|devis|facture|^(DEV|FAC)/i, 'facture'],
  [/bon de livraison|livr/i, 'commandes'],
  [/synchro|tec\.tech/i, 'reglages'],
  [/sav/i, 'suiviSav'],
  [/commande/i, 'commandes'],
  [/produit|mat[ée]riel|stock/i, 'stock'],
];
function decorerElementsUnifies(racine) {
  if (!racine || !racine.querySelectorAll) return;
  racine.querySelectorAll('.tag, .rp-statut, .rpd-statut').forEach((el) => {
    const f = formeStatut(el.textContent) || (el.closest('.rp-fil-ligne') ? 'losange' : null);
    if (f) el.dataset.forme = f;
    else delete el.dataset.forme;
  });
  racine.querySelectorAll('.rp-filtre .rp-point, .rp-kb-point').forEach((pt) => {
    const porteur = pt.closest('.rp-filtre') || pt.closest('.rp-kb-tete') || pt.parentNode;
    const clone = porteur.cloneNode(true);
    clone.querySelectorAll('.n').forEach((x) => x.remove());
    const f = formeStatut(clone.textContent.replace(/\d+\s*$/, ''));
    if (f) pt.dataset.forme = f;
    else delete pt.dataset.forme;
  });
  racine.querySelectorAll('.dialog-title').forEach((t) => {
    if (t.dataset.illOk) return;
    t.dataset.illOk = '1';
    const trouve = ILL_MODALE.find(([re]) => re.test(t.textContent));
    const ill = document.createElement('span');
    ill.className = 'ill rp-dialog-ill';
    ill.style.display = 'none';
    ill.dataset.ill = trouve ? trouve[1] : 'tableau';
    t.parentNode.insertBefore(ill, t);
    if (window.portailIllustrations) window.portailIllustrations(t.parentNode);
  });
}
new MutationObserver((muts) =>
  muts.forEach((m) =>
    m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      decorerElementsUnifies(n.parentNode || n);
    }),
  ),
).observe(document.body, { childList: true, subtree: true });
function majLabelStyle() {
  const label = $('rp-toggle-style-label');
  if (label)
    label.textContent = document.documentElement.classList.contains('rp-unifie') ? 'Ancien style' : 'Nouveau style';
}

/* Éléments role="button" activables au clavier (Entrée / Espace) — lignes du fil, livraisons… */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest && e.target.closest('[role="button"]:not(button):not(a)');
  if (!el || el !== e.target) return;
  e.preventDefault();
  el.click();
});
