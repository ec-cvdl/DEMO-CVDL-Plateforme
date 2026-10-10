function categorieImpact(nomProduit) {
  const p = (state.produits || []).find((x) => x.nom === nomProduit) || {};
  const cle = `${p.icone || ''} ${nomProduit || ''}`.toLowerCase();
  if (p.dematerialise || /recharge|forfait|\bsim\b/.test(cle)) return 'Recharge / forfait';
  if (/tablette|ipad|\btab\b/.test(cle)) return 'Tablette';
  if (/smartphone|t[ée]l[ée]phone|mobile|iphone|galaxy/.test(cle)) return 'Smartphone';
  if (/[ée]cran|moniteur/.test(cle)) return 'Écran';
  if (/fixe|\btour\b|unit[ée] centrale|desktop/.test(cle)) return 'PC fixe';
  if (/portable|laptop|ordinateur|\bpc\b/.test(cle)) return 'PC portable';
  return 'Accessoire';
}
const EST_APPAREIL = (cat) => cat !== 'Accessoire' && cat !== 'Recharge / forfait';
function coefficientsImpact() {
  try {
    return JSON.parse((state.reglages && state.reglages.impactCoefficients) || '{}') || {};
  } catch (e) {
    return {};
  }
}
function nbPersonnesCommande(c) {
  return String(c.personnes || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean).length;
}
/** Impact d'un ensemble de commandes (seules les commandes livrées comptent). */
function calculImpact(commandes) {
  const coef = coefficientsImpact();
  const livrees = commandes.filter((c) => c.statutCommande === 'Livrée');
  const parCat = {};
  let appareils = 0,
    personnes = 0,
    co2 = 0,
    dechets = 0,
    coefConnu = false;
  livrees.forEach((c) => {
    (c.lignes || []).forEach((l) => {
      const q = parseInt(l.quantite, 10) || 0,
        cat = categorieImpact(l.produit);
      parCat[cat] = (parCat[cat] || 0) + q;
      if (EST_APPAREIL(cat)) appareils += q;
      const k = coef[cat];
      if (k) {
        const a = parseFloat(k.co2),
          d = parseFloat(k.dechets);
        if (isFinite(a)) {
          co2 += a * q;
          coefConnu = true;
        }
        if (isFinite(d)) {
          dechets += d * q;
          coefConnu = true;
        }
      }
    });
    personnes += nbPersonnesCommande(c);
  });
  return { livrees, parCat, appareils, personnes, co2, dechets, coefConnu };
}
const fmtNombre = (n) => Math.round(n).toLocaleString('fr-FR');

/** Coefficients d'impact par catégorie (kg CO2e et kg de déchets évités par appareil). */
function vueCoefficientsImpact() {
  const coef = coefficientsImpact();
  // Valeurs ADEME appliquées automatiquement (étude 2022 sur le reconditionnement) — affichées en
  // grisé ; une saisie ici les remplace pour la catégorie concernée.
  const ADEME = {
    'PC portable': { co2: 27, matieres: 127, dechets: 0.314 },
    Smartphone: { co2: 24.6, matieres: 76.9 },
    Tablette: { co2: 20, matieres: 80 },
  };
  const champ = (cat, type, lib) =>
    `<input class="input" type="number" min="0" step="0.1" inputmode="decimal" data-coef-cat="${echapper(cat)}" data-coef-type="${type}" value="${coef[cat] && coef[cat][type] != null ? echapper(coef[cat][type]) : ''}" placeholder="${ADEME[cat] && ADEME[cat][type] != null ? String(ADEME[cat][type]).replace('.', ',') : '—'}" aria-label="${lib} pour ${cat}">`;
  return dialogShell(
    'Impact : valeurs de calcul',
    `
    <div class="msg msg-info" data-pleine-largeur>Le rapport utilise automatiquement les chiffres de l’ADEME (étude 2022 sur les produits reconditionnés), par année d’utilisation d’un appareil reconditionné à la place d’un neuf. Ils apparaissent en grisé. Ne remplis une case que pour les remplacer, en citant ta source.</div>
    <div class="imp-coefs" data-pleine-largeur>
      <div class="imp-coefs-tete imp-4"><span>Catégorie</span><span>kg CO₂e évités / an</span><span>kg de matières / an</span><span>kg de déchets électroniques / an</span></div>
      ${['PC portable', 'Smartphone', 'Tablette', 'PC fixe', 'Écran'].map((cat) => `<div class="imp-coefs-ligne imp-4"><b>${cat}</b>${champ(cat, 'co2', 'CO₂e évités')}${champ(cat, 'matieres', 'Matières évitées')}${champ(cat, 'dechets', 'Déchets évités')}</div>`).join('')}
    </div>
    <div class="field" data-pleine-largeur><label for="coef-source">Source des valeurs remplacées</label><input class="input" id="coef-source" value="${echapper(coef._source || '')}" placeholder="Obligatoire si tu remplaces une valeur ADEME"></div>
  `,
    'coef-enregistrer',
  );
}

async function enregistrerCoefficientsImpact() {
  const coef = { _source: ($('coef-source') || {}).value || '' };
  document.querySelectorAll('[data-coef-cat]').forEach((i) => {
    const v = i.value.trim();
    if (v === '') return;
    coef[i.dataset.coefCat] = coef[i.dataset.coefCat] || {};
    coef[i.dataset.coefCat][i.dataset.coefType] = parseFloat(v.replace(',', '.'));
  });
  const r = await poster({ action: 'reglages-set', champ: 'impactCoefficients', valeur: JSON.stringify(coef) });
  if (!r.ok) {
    etat('Enregistrement impossible', 'erreur');
    return;
  }
  state.reglages = state.reglages || {};
  state.reglages.impactCoefficients = JSON.stringify(coef);
  etat('Coefficients enregistrés', 'succes');
  state.modal = state.modal && state.modal.modalParent ? state.modal.modalParent : null;
  render();
}

/** Vue 360° d'une structure : identité, chiffres, commandes, SAV, documents, impact. */
/** Couleur d'un statut SAV hors de l'onglet SAV (fiche 360°) — même règle que couleurHex de
 *  vueSav, qui n'existe que dans cette fonction (la fiche plantait dès qu'un SAV était listé). */
function couleurStatutSavGlobale(statut) {
  const def = (state.statutsSav || []).find((d) => d.statut === statut);
  if (!def) return '#8FA3B3';
  if (def.terminal) return def.couleur === 't-vert' ? '#1F9D55' : '#E62460';
  const premier = (state.statutsSav || []).filter((d) => !d.terminal).sort((a, b) => a.ordre - b.ordre)[0];
  return premier && premier.statut === def.statut ? '#FECC38' : '#00ACB0';
}
function vueStructure360() {
  const s = state.structures.find((x) => x.id === state.modal.id);
  if (!s) return '';
  const commandes = state.commandes.filter((c) => c.code === s.code).sort((a, b) => b.id - a.id);
  const sav = (state.sav || []).filter((t) => t.code === s.code || (!t.code && t.structureNom === s.nom));
  const refsDevis = new Set(commandes.map((c) => c.referenceDevis).filter(Boolean));
  const refsFact = new Set(commandes.map((c) => c.referenceFacture).filter(Boolean));
  const memeStructure = (x) =>
    (x.code && x.code === s.code) || [x.nomStructure, x.structureNom, x.structure].some((n) => n && n === s.nom);
  const devis = (state.devis || []).filter((d) => refsDevis.has(d.referenceDevis) || memeStructure(d));
  const factures = (state.factures || []).filter((f) => refsFact.has(f.referenceFacture) || memeStructure(f));
  const enCours = commandes.filter((c) => c.statutCommande !== 'Livrée' && c.statutCommande !== 'Annulée');
  const savOuverts = sav.filter((t) => {
    const d = state.statutsSav.find((x) => x.statut === t.statut);
    return !(d && (d.terminal || d.finCycle));
  });
  const impayees = factures.filter((f) => f.statut === 'En attente' || f.statut === 'En retard');
  const montantImpaye = impayees.reduce((m, f) => m + (parseFloat(f.montantTotal) || 0), 0);
  const im = impactServeurStructure(s.code) || calculImpact(commandes);
  const type = typeStructure(s);
  const tuile = (v, l, alerte, ill) =>
    `<div class="s3-kpi${alerte ? ' alerte' : ''}"><span data-ill="${ill}" class="ill"></span><span class="s3-kpi-txt"><b>${v}</b><span>${l}</span></span></div>`;
  const illProduit = (c) =>
    window.illustrationCvdl && window.cleIllustrationProduit && (c.lignes || [])[0]
      ? window.illustrationCvdl(window.cleIllustrationProduit(c.lignes[0].produit), 30)
      : '<span data-ill="commandes" class="ill s"></span>';
  const vide = (t) => `<p class="s3-vide">${t}</p>`;
  return `
    <div class="dialog-backdrop">
      <div class="dialog s3" role="dialog" aria-modal="true" aria-labelledby="s3-titre">
        <header class="s3-tete">
          <span data-ill="structures" class="ill xl"></span>
          <div class="s3-tete-txt">
            <div class="rp-surtitre">Structure · ${echapper(typeAChoisir(s) ? 'type à définir' : type)}${s.structurePartenaireDe ? ' · partenaire d’une Interne' : ''}</div>
            <h2 id="s3-titre">${echapper(s.nom)}</h2>
            <div class="s3-contact">${[s.email, s.telephone || s.tel, s.adresse].filter(Boolean).map(echapper).join(' · ')}</div>
            ${s.siret || s.region ? `<div class="s3-contact">${[s.siret ? 'SIRET ' + s.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4') : '', s.region ? 'Région : ' + s.region : ''].filter(Boolean).map(echapper).join(' · ')}</div>` : ''}
          </div>
          <div class="s3-actions">
            <button type="button" class="btn btn-secondary" data-structure-modifier="${s.id}">${icon('gear', 14)}Modifier</button>
            <button type="button" class="btn btn-secondary" data-import-appareils="${s.id}">${icon('plus', 14)}Appareils déjà sur place</button>
            <button type="button" class="btn btn-secondary" data-rapport-structure="${s.id}">${icon('stats', 14)}Rapport d’impact</button>
            ${s.lienConvention ? `<a class="btn btn-secondary" href="${echapper(urlSure(s.lienConvention))}" target="_blank" rel="noopener">${icon('lien_externe', 14)}Convention</a>` : ''}
            <button type="button" class="btn btn-ghost btn-icon" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
          </div>
        </header>
        <div class="s3-kpis">
          ${tuile(commandes.length, 'commandes', false, 'commandes')}
          ${tuile(enCours.length, 'en cours', false, 'commander')}
          ${tuile(fmtNombre(im.appareils), 'appareils remis', false, 'flotte')}
          ${tuile(savOuverts.length, 'SAV ouverts', savOuverts.length > 0, 'panne')}
          ${tuile(impayees.length ? `${fmtNombre(montantImpaye)} €` : '0 €', `impayé${impayees.length > 1 ? 's' : ''} (${impayees.length})`, impayees.length > 0, 'facture')}
        </div>
        ${
          s.depotVente
            ? (() => {
                const d = etatDepotVente(s.code);
                return `<section class="s3-bloc dv-s3">
          <div class="dv-s3-corps">
            <div class="dv-s3-titre"><span data-ill="flotte" class="ill s"></span><h3>Dépôt-vente</h3>${d && d.limites && d.limites.actif ? '<span class="dv-badge-restreint">Stock restreint</span>' : ''}</div>
            ${d ? `<div class="dv-puces"><span><b>${d.enStock}</b> en stock${d.reference ? ` sur ${d.reference} au dernier réassort` : ''}</span><span><b>${d.vendus}</b> vendu${d.vendus > 1 ? 's' : ''}</span>${d.sav ? `<span><b>${d.sav}</b> en SAV</span>` : ''}${pucesAlertesDepot(d)}<span>${d.facturation === 'chaque-vente' ? 'Facture à chaque vente' : 'Sans facturation auto.'}</span></div>` : '<p class="s3-vide">Stock en cours de chargement…</p>'}
          </div>
          <div class="dv-s3-actions">
            <button type="button" class="btn btn-secondary" data-stock-restreint="${echapper(s.code)}">${icon('gear', 14)}Stock restreint</button>
            <button type="button" class="btn btn-primary" data-flotte-structure="${echapper(s.code)}">${icon('package', 14)}Gérer la flotte</button>
          </div>
        </section>`;
              })()
            : ''
        }
        ${type === 'Interne' || s.type === 'interne' ? blocProjetsStructure360(s) : ''}
        <div class="s3-grille">
          <section class="s3-bloc s3-large">
            <div class="s3-bloc-tete"><span data-ill="commandes" class="ill s"></span><h3>Commandes</h3><span>${commandes.length}</span></div>
            ${
              commandes.length
                ? commandes
                    .slice(0, 12)
                    .map(
                      (
                        c,
                      ) => `<div class="s3-ligne" data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0">
              <span class="s3-ic">${illProduit(c)}</span>
              <span class="s3-ligne-txt"><b>${echapper(c.reference)}</b><small>${echapper(c.date || '')} · ${(c.lignes || []).reduce((n, l) => n + (parseInt(l.quantite, 10) || 0), 0)} article(s)</small></span>
              <span class="s3-ligne-droite">${pastilleStatutCommande(c.statutCommande)}${prochaineActionCommande(c)}</span></div>`,
                    )
                    .join('') +
                  (commandes.length > 12
                    ? `<p class="s3-vide">… et ${commandes.length - 12} plus ancienne(s).</p>`
                    : '')
                : vide('Aucune commande.')
            }
          </section>
          <section class="s3-bloc">
            <div class="s3-bloc-tete"><span data-ill="suiviSav" class="ill s"></span><h3>SAV</h3><span>${sav.length}</span></div>
            ${
              sav.length
                ? sav
                    .slice(0, 8)
                    .map(
                      (
                        t,
                      ) => `<div class="s3-ligne" data-sav-ouvrir="${echapper(t.reference)}" role="button" tabindex="0">
              <span class="s3-ic"><span data-ill="panne" class="ill s"></span></span>
              <span class="s3-ligne-txt"><b>${echapper(t.reference)}</b><small>${echapper(t.symptome || t.marque || '')}</small></span>
              <span class="rp-statut" style="--st:${couleurStatutSavGlobale(t.statut)}">${echapper(t.statut || '')}</span></div>`,
                    )
                    .join('')
                : vide('Aucune demande SAV.')
            }
          </section>
          <section class="s3-bloc">
            <div class="s3-bloc-tete"><span data-ill="facture" class="ill s"></span><h3>Devis et factures</h3><span>${devis.length + factures.length}</span></div>
            ${
              devis.length + factures.length
                ? [
                    ...devis.map((d) => ({ t: 'Devis', ref: d.referenceDevis, st: d.statut })),
                    ...factures.map((f) => ({
                      t: 'Facture',
                      ref: f.referenceFacture,
                      st: f.statut,
                      m: f.montantTotal,
                    })),
                  ]
                    .slice(0, 10)
                    .map(
                      (d) => `<div class="s3-ligne s3-doc">
              <span class="s3-ic"><span data-ill="facture" class="ill s"></span></span>
              <span class="s3-ligne-txt"><b>${echapper(d.ref || '')}</b><small>${d.t}${d.m ? ` · ${fmtNombre(parseFloat(d.m) || 0)} €` : ''}</small></span>
              <span class="tag">${echapper(d.st || '')}</span></div>`,
                    )
                    .join('')
                : vide(
                    politiqueAffichee(s) ? 'Aucun document.' : 'Pas de devis ni de facture pour ce type de structure.',
                  )
            }
          </section>
          <section class="s3-bloc">
            <div class="s3-bloc-tete"><span data-ill="impact" class="ill s"></span><h3>Impact</h3><button type="button" class="s3-lien" data-coefficients-impact>Valeurs de calcul</button></div>
            <div class="s3-impact">
              <div><span data-ill="flotte" class="ill s"></span><span><b>${fmtNombre(im.appareils)}</b><span>appareils remis</span></span></div>
              <div><span data-ill="personne" class="ill s"></span><span><b>${fmtNombre(im.personnes)}</b><span>personnes équipées</span></span></div>
              ${im.co2 ? `<div><span data-ill="impact" class="ill s"></span><span><b>${fmtNombre(im.co2)} kg</b><span>CO₂e évités / an</span></span></div>` : ''}${im.matieres ? `<div><span data-ill="stock" class="ill s"></span><span><b>${fmtNombre(im.matieres)} kg</b><span>matières non extraites / an</span></span></div>` : ''}
            </div>
            <p class="s3-vide">Calcul automatique : chiffres ADEME par année d’utilisation.</p>
          </section>
        </div>
      </div>
    </div>`;
}
/** Projets de distribution d'une structure Interne (créés depuis son espace, portail) : lecture
 *  seule dans l'admin. Chargés à l'ouverture de la fiche, mis en cache ; la fiche se redessine. */
const cacheProjetsStructures = {};
function projetsStructureAdmin(code) {
  const c = cacheProjetsStructures[code];
  if (c && (c.donnees || c.enCours)) return c.donnees || null;
  cacheProjetsStructures[code] = { enCours: true };
  jsonp({ action: 'projets-structure-admin', password: motDePasse, code })
    .then((r) => {
      cacheProjetsStructures[code] = { donnees: r && r.ok ? r : { projets: [], remisSansProjet: 0 } };
      if (state.modal && state.modal.kind === 'structure-360') render();
    })
    .catch(() => {
      cacheProjetsStructures[code] = { donnees: { projets: [], remisSansProjet: 0, echec: true } };
    });
  return null;
}
function blocProjetsStructure360(s) {
  const d = projetsStructureAdmin(s.code);
  const projets = d ? d.projets.filter((p) => p.statut !== 'archive') : [];
  const archives = d ? d.projets.length - projets.length : 0;
  return `<section class="s3-bloc s3-projets">
    <div class="s3-bloc-tete"><span data-ill="distribution" class="ill s"></span><h3>Projets de distribution</h3><span>${d ? projets.length : '…'}</span>
      <button type="button" class="s3-lien" data-flotte-structure="${echapper(s.code)}" style="margin-left:auto">Voir la flotte</button></div>
    ${
      !d
        ? '<p class="s3-vide">Chargement…</p>'
        : !projets.length
          ? `<p class="s3-vide">Aucun projet en cours${archives ? ` (${archives} archivé${archives > 1 ? 's' : ''})` : ''}. La structure les crée depuis son espace (« Projets de distribution ») et y rattache les appareils remis.</p>`
          : projets
              .map((p) => {
                const av = p.avancement || {};
                const tot = av.totalObjectif || 0,
                  liv = av.totalLivre || 0;
                return `
        <div class="s3-projet">
          <div class="s3-projet-l"><span><b>${echapper(p.nom)}</b><small>${echapper([p.financeur, `${p.debut ? frDate(p.debut) : '…'} → ${p.butoir ? frDate(p.butoir) : '…'}`].filter(Boolean).join(' · '))}</small></span>
            <span class="s3-projet-chiffre"><b>${liv}</b> / ${tot || '—'}</span></div>
          <div class="di-barre" role="img" aria-label="${liv} distribués sur ${tot}"><i class="liv" style="width:${tot ? Math.min(100, (liv / tot) * 100) : 0}%"></i></div>
          <div class="s3-projet-pied">${tagRythme(av)}${(av.objectifs || [])
            .filter((o) => o.objectif || o.livre)
            .map(
              (o) =>
                `<span class="di-tag">${echapper(o.produit)} ${o.livre}${o.objectif ? '/' + o.objectif : ''}</span>`,
            )
            .join('')}</div>
        </div>`;
              })
              .join('')
    }
    ${d && d.remisSansProjet ? `<p class="s3-vide">${d.remisSansProjet} appareil${d.remisSansProjet > 1 ? 's' : ''} remis sans projet.</p>` : ''}
  </section>`;
}
/** Impact d'une structure calculé par le serveur (regles/impact.js) — le même que celui du
 *  rapport côté portail ; mis en cache, la vue se redessine à la réception. */
const cacheImpactStructures = {};
function impactServeurStructure(code) {
  const c = cacheImpactStructures[code];
  if (c && c.donnees) return c.donnees;
  if (!c) {
    cacheImpactStructures[code] = { enCours: true };
    jsonp({ action: 'rapport-impact-par-code', code })
      .then((r) => {
        if (!r || !r.ok) {
          cacheImpactStructures[code] = { donnees: null, echec: true };
          return;
        }
        const t = { appareils: 0, personnes: 0, co2: 0, matieres: 0, dechets: 0, coefConnu: false };
        r.commandes.forEach((x) => {
          t.appareils += x.appareils;
          t.personnes += x.personnes;
          t.co2 += x.co2 || 0;
          t.matieres += x.matieres || 0;
          t.dechets += x.dechets || 0;
          t.coefConnu = t.coefConnu || x.coefConnu;
        });
        cacheImpactStructures[code] = { donnees: t };
        if (state.modal && state.modal.kind === 'structure-360') render();
      })
      .catch(() => {
        cacheImpactStructures[code] = { donnees: null, echec: true };
      });
  }
  return null;
}
function politiqueAffichee(s) {
  return !(s.bo || s.interne || s.esn);
}
document.addEventListener('click', (e) => {
  const ia = e.target.closest('[data-import-appareils]');
  if (ia) {
    const s = state.structures.find((x) => x.id === parseInt(ia.dataset.importAppareils, 10));
    if (s)
      window.ImportAppareils.ouvrir({
        structureId: s.id,
        nomStructure: s.nom,
        poster: (action, donnees) => poster(Object.assign({ action }, donnees)),
      });
    return;
  }
  const r = e.target.closest('[data-rapport-structure]');
  if (r) {
    const s = state.structures.find((x) => x.id === parseInt(r.dataset.rapportStructure, 10));
    if (s) window.open(`rapport-impact.html?code=${encodeURIComponent(s.code)}`, '_blank', 'noopener');
    return;
  }
  const rc = e.target.closest('[data-rapport-commande]');
  if (rc) {
    const c = state.commandes.find((x) => x.reference === rc.dataset.rapportCommande);
    if (c)
      window.open(
        `rapport-impact.html?code=${encodeURIComponent(c.code)}&ref=${encodeURIComponent(c.reference)}`,
        '_blank',
        'noopener',
      );
    return;
  }
  if (e.target.closest('[data-coefficients-impact]')) {
    state.modal = { kind: 'coefficients-impact', modalParent: modalParentPour('coefficients-impact') };
    render();
    return;
  }
  if (e.target.id === 'coef-enregistrer') {
    enregistrerCoefficientsImpact();
    return;
  }
  const s3 = e.target.closest('[data-structure-vue]');
  if (s3 && s3.classList.contains('lien-structure')) e.stopPropagation();
  if (s3 && !e.target.closest('[data-reveal-code], [data-structure-modifier]')) {
    state.modal = {
      kind: 'structure-360',
      id: parseInt(s3.dataset.structureVue, 10),
      modalParent: modalParentPour('structure-360'),
    };
    render();
  }
});

/* Échap : ferme la dernière modale ouverte (la précédente reste affichée). */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !state.modal || document.querySelector('.cvdl-conf-voile')) return;
  state.modal = state.modal.modalParent || null;
  state.ncLignes = [];
  state.ndLignes = [];
  render();
});
