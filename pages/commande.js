/** Même principe que posterAvecProgression() de sav.html — la durée réelle de l'envoi n'est
 *  pas connue à l'avance, donc la progression est estimée : elle avance vite au début puis
 *  ralentit en s'approchant de 90%, et saute à 100% une fois la réponse reçue. */
function posterAvecProgressionCommande(data, onProgression) {
  let annule = false;
  let pourcentage = 0;
  const minuteur = setInterval(function () {
    if (annule) return;
    pourcentage += (90 - pourcentage) * 0.12;
    if (onProgression) onProgression(Math.min(90, Math.round(pourcentage)));
  }, 200);

  return poster(data)
    .then(function (reponse) {
      annule = true;
      clearInterval(minuteur);
      if (onProgression) onProgression(100);
      return reponse;
    })
    .catch(function (erreur) {
      annule = true;
      clearInterval(minuteur);
      throw erreur;
    });
}
// Date de livraison souhaitée (structures Internes) : pas de date dans le passé
$('champ-date-livraison-souhaitee').min = new Date().toISOString().slice(0, 10);

let indexEtapeActuelle = 0;
/** Passe à false dès qu'on sait qu'un code de session est déjà là (venant de
 *  portail-structure.html) — l'étape d'identification n'est alors ni comptée ni affichée,
 *  et "Retour" redevient simplement le bouton "Retour portail" du haut de page. */
let etapeIdentificationVisible = true;
const etat = {
  code: '',
  nomStructure: '',
  moyenImpose: null,
  estSansPaiement: false,
  estBO: false,
  moyensPaiementAutorises: [],
  produits: [],
  selection: {},
  urgent: false,
  demandeDevis: false,
  moyenPaiement: '',
  paiementSepare: '',
  commentaire: '',
};

/** Règles du formulaire : lues dans la politique de commande calculée par le serveur
 *  (regles/politique.js) — le formulaire ne décide plus lui-même ce qu'un type a le droit de
 *  faire. Repli sur les anciennes cases si le serveur n'envoie pas encore de politique. */
/* Limites en cours affichées au-dessus du catalogue : « mode stock bas » (toutes les structures)
   et « stock restreint » (structure en dépôt-vente). Le serveur les applique de toute façon. */
function afficherLimitesCommande(v) {
  etat.modeStockBas = v.modeStockBas || null;
  const blocs = [];
  const msb = v.modeStockBas;
  if (msb) {
    const limites = [
      msb.maxParCommande
        ? `<li><b>${msb.maxParCommande} article${msb.maxParCommande > 1 ? 's' : ''} au maximum</b> par commande</li>`
        : '',
      msb.maxParProduit ? `<li><b>${msb.maxParProduit} au maximum</b> pour un même produit</li>` : '',
    ]
      .filter(Boolean)
      .join('');
    blocs.push(`<div class="alerte-stock-bas" role="alert">
      <span class="asb-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg></span>
      <div class="asb-txt">
        <div class="asb-sur">Attention</div>
        <h2>Stock bas en ce moment</h2>
        <p>Les quantités sont limitées pour que chaque structure puisse être servie.</p>
        ${limites ? `<ul>${limites}</ul>` : ''}
        ${msb.message ? `<p class="asb-message">${echapper(msb.message)}</p>` : ''}
      </div>
    </div>`);
  }
  const sr = v.stockRestreint;
  if (sr && sr.plafond !== null && sr.plafond !== undefined) {
    blocs.push(
      `<div class="msg" style="margin-bottom:var(--space-4);background:var(--color-warn-100);font-weight:500"><span>${
        sr.restant > 0
          ? `<b>Stock restreint :</b> vous pouvez encore commander ${sr.restant} appareil${sr.restant > 1 ? 's' : ''} (${sr.occupe} déjà en dépôt ou en commande sur ${sr.plafond}).`
          : `<b>Stock restreint :</b> le plafond de matériel en dépôt est atteint (${sr.plafond}). Déclarez vos ventes dans « Ma flotte » pour pouvoir commander à nouveau.`
      }</span></div>`,
    );
  }
  const zone = $('bandeau-limites-commande');
  zone.hidden = !blocs.length;
  zone.innerHTML = blocs.join('');
}
/* ── Quantités : maximum par produit (fiche produit / réglage par défaut, stock, mode stock
   bas, stock restreint — déjà combinés par le serveur dans quantiteMax) et total par commande
   (mode stock bas). Bloqué ici, à l'étape Quantités, et plus seulement à l'envoi. ── */
function maxPourProduit(nom) {
  const p = (etat.produits || []).find((x) => x.nom === nom) || {};
  let m = parseInt(p.quantiteMax, 10) > 0 ? parseInt(p.quantiteMax, 10) : Infinity;
  const stock = parseInt(p.stock, 10);
  if (Number.isFinite(stock) && stock > 0) m = Math.min(m, stock);
  return m;
}
function maxParCommande() {
  const m = etat.modeStockBas && parseInt(etat.modeStockBas.maxParCommande, 10);
  return m > 0 ? m : Infinity;
}
function totalSelection() {
  return Object.values(etat.selection).reduce((t, q) => t + (parseInt(q, 10) || 0), 0);
}
/** Message d'erreur si la sélection dépasse une limite, sinon ''. */
function erreurQuantites() {
  const max = maxParCommande(),
    total = totalSelection();
  if (total > max)
    return `Stock bas : ${max} article${max > 1 ? 's' : ''} au maximum par commande pour le moment (vous en demandez ${total}). Retirez-en ${total - max}.`;
  for (const nom of Object.keys(etat.selection)) {
    const m = maxPourProduit(nom);
    if (etat.selection[nom] > m) return `« ${nom} » : ${m} au maximum par commande pour le moment.`;
  }
  return '';
}
function appliquerPolitique(v) {
  try {
    afficherLimitesCommande(v);
  } catch (e) {
    /* non bloquant */
  }
  const pol = v.politique;
  if (pol) {
    etat.typeStructure = pol.type;
    etat.estInterne = pol.type === 'interne';
    etat.estRN = pol.type === 'rn';
    etat.estBO = pol.type === 'bo';
    etat.estProjets = pol.type === 'projets';
    etat.estSansPaiement = !!pol.paiement.aucun;
    etat.paiementObligatoire = !!pol.paiement.moyenObligatoire;
    etat.moyenImpose = pol.paiement.moyenImpose || null;
    etat.moyensPaiementAutorises = pol.paiement.moyensAutorises || [];
    etat.devisPossible = !!pol.facturation.devisFactureRequis;
    etat.prixMasques = !!pol.prixMasques;
    etat.autoriseUrgent = !!pol.dateSouhaitee;
  } else {
    etat.moyenImpose = v.moyenImpose || null;
    etat.estSansPaiement = !!v.esn || !!v.interne;
    etat.estInterne = !!v.interne;
    etat.estRN = !!v.rn;
    etat.estBO = !!v.bo;
    etat.estProjets = !!v.projets;
    etat.paiementObligatoire = !etat.estSansPaiement && !etat.estProjets;
    etat.devisPossible = !etat.estSansPaiement && !etat.estBO;
    etat.prixMasques = etat.estSansPaiement || etat.estProjets;
    etat.moyensPaiementAutorises = v.moyensPaiement || [];
    etat.autoriseUrgent = !!v.dateSouhaitee;
  }
}
/* ── Personne prescriptrice : menu déroulant illustré (noms connus de la structure : responsable
   habituel + prescripteurs de ses commandes, avec leur nombre de commandes), ou « Quelqu'un
   d'autre » pour saisir un nouveau nom (retenu ensuite avec la commande). Clavier : ↑ ↓,
   Entrée, Échap, Début/Fin. ── */
const COULEURS_PRESC = [
  'color-mix(in srgb, #00ACB0 45%, #fff)',
  'color-mix(in srgb, #E62460 35%, #fff)',
  'color-mix(in srgb, #FECC38 55%, #fff)',
];
let prescListe = [],
  prescIndex = 0,
  prescActif = 0;
function initialesPresc(nom) {
  const mots = String(nom || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((mots[0] || '?')[0] + (mots.length > 1 ? mots[mots.length - 1][0] : '')).toUpperCase();
}
function detailPresc(p) {
  const date = String(p.derniere || '').replace(/\/(\d{4})$/, (m, a) =>
    a === String(new Date().getFullYear()) ? '' : m,
  );
  const cmd = p.commandes
    ? `${p.commandes} commande${p.commandes > 1 ? 's' : ''}${date ? (p.commandes > 1 ? ` · la dernière le ${date}` : ` · le ${date}`) : ''}`
    : '';
  return (
    [p.habituel ? 'Responsable de la structure' : '', cmd].filter(Boolean).join(' · ') ||
    'Déjà indiqué pour votre structure'
  );
}
function avatarPresc(p, i) {
  return `<span class="pc-av" style="--c:${COULEURS_PRESC[i % COULEURS_PRESC.length]}" aria-hidden="true">${echapper(initialesPresc(p.nom))}</span>`;
}
function preparerPrescripteurs(noms, details) {
  const parNom = {};
  (details || []).forEach((d) => {
    parNom[d.nom] = d;
  });
  prescListe = (noms || []).filter(Boolean).map((n) => parNom[n] || { nom: n });
  prescIndex = 0;
  rendrePrescripteurs();
  modePrescripteur(prescListe.length ? 'liste' : 'nouveau', prescListe.length > 0);
}
function rendrePrescripteurs() {
  const p = prescListe[prescIndex];
  $('presc-choix').outerHTML = p
    ? `<span id="presc-choix" class="pc-choix" style="display:contents">${avatarPresc(p, prescIndex)}<span class="pc-txt"><b>${echapper(p.nom)}</b><small>${echapper(detailPresc(p))}</small></span></span>`
    : '<span id="presc-choix"></span>';
  $('presc-options').innerHTML =
    prescListe
      .map(
        (
          q,
          i,
        ) => `<div class="pc-opt${i === prescActif ? ' actif' : ''}" role="option" id="presc-opt-${i}" data-presc="${i}" aria-selected="${i === prescIndex}">
      ${avatarPresc(q, i)}<span class="pc-txt"><b>${echapper(q.nom)}</b><small>${echapper(detailPresc(q))}</small></span>
      ${i === prescIndex ? '<span class="pc-coche" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>' : ''}
    </div>`,
      )
      .join('') +
    `<div class="pc-sep" role="presentation"></div><div class="pc-opt pc-autre${prescActif === prescListe.length ? ' actif' : ''}" role="option" id="presc-opt-${prescListe.length}" data-presc="autre" aria-selected="false"><span class="pc-av" aria-hidden="true">+</span><span class="pc-txt"><b>Quelqu’un d’autre…</b><small>Saisir un nouveau nom, retenu pour vos prochaines commandes</small></span></div>`;
  $('presc-options').setAttribute('aria-activedescendant', 'presc-opt-' + prescActif);
}
function ouvrirPresc(ouvrir) {
  $('presc-options').hidden = !ouvrir;
  $('champ-prescripteur').setAttribute('aria-expanded', String(ouvrir));
  if (ouvrir) {
    prescActif = prescIndex;
    rendrePrescripteurs();
    $('presc-options').focus();
    const el = $('presc-opt-' + prescActif);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
}
function choisirPresc(i) {
  if (i === 'autre' || i >= prescListe.length) {
    ouvrirPresc(false);
    modePrescripteur('nouveau', true);
    $('champ-responsable').focus();
    return;
  }
  prescIndex = i;
  ouvrirPresc(false);
  rendrePrescripteurs();
  $('champ-prescripteur').focus();
}
function modePrescripteur(mode, retourPossible) {
  const nouveau = mode === 'nouveau';
  $('presc-liste').hidden = nouveau;
  $('presc-nouveau').hidden = !nouveau;
  if (retourPossible !== undefined) $('presc-retour').hidden = !retourPossible;
  if (nouveau) $('champ-responsable').value = '';
}
function prescripteurChoisi() {
  if (!$('presc-nouveau').hidden) return $('champ-responsable').value.trim();
  const p = prescListe[prescIndex];
  return p ? p.nom.trim() : '';
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#champ-prescripteur')) {
    ouvrirPresc($('presc-options').hidden);
    return;
  }
  const opt = e.target.closest('[data-presc]');
  if (opt) {
    choisirPresc(opt.dataset.presc === 'autre' ? 'autre' : +opt.dataset.presc);
    return;
  }
  if (!e.target.closest('#presc-liste') && !$('presc-options').hidden) ouvrirPresc(false);
  if (e.target.closest('#presc-retour')) {
    modePrescripteur('liste');
    $('champ-prescripteur').focus();
  }
});
document.addEventListener('keydown', (e) => {
  const liste = $('presc-options');
  if (e.target.id === 'champ-prescripteur' && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
    e.preventDefault();
    ouvrirPresc(true);
    return;
  }
  if (liste.hidden || !liste.contains(document.activeElement)) return;
  const max = prescListe.length; // dernier = « Quelqu'un d'autre »
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    prescActif = Math.min(max, prescActif + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    prescActif = Math.max(0, prescActif - 1);
  } else if (e.key === 'Home') {
    e.preventDefault();
    prescActif = 0;
  } else if (e.key === 'End') {
    e.preventDefault();
    prescActif = max;
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    choisirPresc(prescActif === max ? 'autre' : prescActif);
    return;
  } else if (e.key === 'Escape' || e.key === 'Tab') {
    ouvrirPresc(false);
    if (e.key === 'Escape') {
      e.preventDefault();
      $('champ-prescripteur').focus();
    }
    return;
  } else return;
  rendrePrescripteurs();
  const el = $('presc-opt-' + prescActif);
  if (el) el.scrollIntoView({ block: 'nearest' });
});

const NOMS_ETAPES = {
  0: 'Structure',
  1: 'Matériel',
  quantites: 'Quantités',
  personnes: 'Personnes',
  paiement: 'Paiement',
  recap: 'Envoi',
};
function etapesActives() {
  const actives = etapeIdentificationVisible ? ['0', '1', 'quantites'] : ['1', 'quantites'];
  const necessitePersonnes = unitesCommandees().length > 0 || (etat.estProjets && etat.projetsNominatif);
  if (necessitePersonnes) actives.push('personnes');
  // Étape « Paiement » : seulement s'il y a quelque chose à y décider (moyen de paiement, devis,
  // répartition nominative Projets) — rien pour une Interne ou une ESN.
  if (etat.paiementObligatoire || etat.devisPossible || etat.estProjets || !etat.code) actives.push('paiement');
  actives.push('recap');
  return actives;
}
function majProgression() {
  const actives = etapesActives();
  const etapeAffichee = indexEtapeActuelle + 1;
  document.querySelector('.compte').textContent = `${etapeAffichee}/${actives.length}`;
  $('progression').innerHTML = actives
    .map((cle, idx) => {
      const cls = idx < indexEtapeActuelle ? 'fait' : idx === indexEtapeActuelle ? 'cours' : 'avenir';
      return `${idx ? '<span class="cm-lien"></span>' : ''}<div class="cm-etape ${cls}"${cls === 'cours' ? ' aria-current="step"' : ''}><span class="cm-pt">${cls === 'fait' ? '✓' : idx + 1}</span><b>${NOMS_ETAPES[cle] || ''}</b></div>`;
    })
    .join('');
  majRecapLateral();
}
/** Récapitulatif latéral (maquette « Commande ») : matériel choisi, quantités, priorité et
 *  total estimé, mis à jour à chaque changement — masqué sur l'étape du code structure. */
function majRecapLateral() {
  const aside = $('cm-recap');
  if (!aside) return;
  const cle = etapesActives()[indexEtapeActuelle];
  const noms = Object.keys(etat.selection);
  aside.hidden = cle === '0';
  $('cm-recap-structure').textContent = etat.nomStructure || '';
  let total = 0,
    totalConnu = false;
  $('cm-recap-lignes').innerHTML = noms.length
    ? noms
        .map((nom) => {
          const q = etat.selection[nom];
          const p = (etat.produits || []).find((x) => x.nom === nom) || {};
          const pu = etat.prixMasques ? NaN : parseFloat(p.prixUnitaire);
          if (isFinite(pu)) {
            total += pu * q;
            totalConnu = true;
          }
          return `<div class="cm-recap-ligne"><span>${q} × ${echapper(nom)}</span>${isFinite(pu) ? `<b>${formaterPrixProduit(pu * q)}</b>` : ''}</div>`;
        })
        .join('') +
      (etat.urgent ? '<div class="cm-recap-ligne cm-recap-urgent"><span>Priorité</span><b>Urgente</b></div>' : '')
    : '<div class="cm-recap-vide">Aucun matériel sélectionné pour le moment.</div>';
  $('cm-recap-total').hidden = !totalConnu;
  if (totalConnu) $('cm-recap-total-valeur').textContent = formaterPrixProduit(total);
}
function afficherEtape() {
  const cle = etapesActives()[indexEtapeActuelle];
  if (window.CvdlRetours) {
    CvdlRetours.commencerParcours('commande', NOMS_ETAPES[cle]);
    CvdlRetours.etapeParcours('commande', NOMS_ETAPES[cle]);
  }
  document.querySelectorAll('.etape').forEach((s) => s.classList.toggle('active', s.dataset.etape === cle));
  $('btn-retour').hidden = indexEtapeActuelle === 0;
  $('btn-suivant').hidden = cle === 'recap';
  majProgression();
  majBoutonSuivant();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function majBoutonSuivant() {
  const cle = etapesActives()[indexEtapeActuelle];
  const btn = $('btn-suivant');
  if (cle === '0') btn.disabled = false;
  else if (cle === '1') btn.disabled = Object.keys(etat.selection).length === 0;
  else if (cle === 'paiement') btn.disabled = !$('zone-paiement').hidden && !etat.moyenPaiement;
  else if (cle === 'quantites') btn.disabled = !!erreurQuantites();
  else btn.disabled = false;
  majRecapLateral();
}

$('btn-retour').addEventListener('click', () => {
  if (indexEtapeActuelle === 0) return;
  indexEtapeActuelle--;
  afficherEtape();
});

$('btn-suivant').addEventListener('click', async () => {
  const cle = etapesActives()[indexEtapeActuelle];
  if (cle === '0') {
    await verifierCode();
    return;
  }
  if (cle === '1') {
    if (!Object.keys(etat.selection).length) return;
    // Plus de produits choisis que d'articles autorisés : chacun compte au moins pour 1.
    const nbChoisis = Object.keys(etat.selection).length,
      maxCmd = maxParCommande();
    if (nbChoisis > maxCmd) {
      const zone =
        $('retour-selection') ||
        (() => {
          const d = document.createElement('div');
          d.id = 'retour-selection';
          d.setAttribute('aria-live', 'polite');
          $('grille-produits').closest('.card').after(d);
          return d;
        })();
      zone.innerHTML = `<div class="msg msg-erreur" style="margin-top:var(--space-3)">Stock bas : ${maxCmd} article${maxCmd > 1 ? 's' : ''} au maximum par commande. Vous avez choisi ${nbChoisis} produits : retirez-en ${nbChoisis - maxCmd}.</div>`;
      zone.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if ($('retour-selection')) $('retour-selection').innerHTML = '';
    construireEtapeQuantites();
    indexEtapeActuelle++;
    afficherEtape();
    return;
  }
  if (cle === 'quantites') {
    const err = erreurQuantites();
    if (err) {
      construireEtapeQuantites();
      $('retour-quantites').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    construireZonePersonnesBo();
    construireRecap();
    indexEtapeActuelle++;
    afficherEtape();
    return;
  }
  if (cle === 'personnes') {
    if (!personnesValides()) {
      $('retour-personnes-bo').innerHTML = '<div class="msg msg-erreur">' + messageErreurPersonnes() + '</div>';
      signalerLignesPersonnesInvalides();
      return;
    }
    $('retour-personnes-bo').innerHTML = '';
    construireRecap();
    indexEtapeActuelle++;
    afficherEtape();
    return;
  }
  if (cle === 'paiement') {
    if (!$('zone-paiement').hidden && !etat.moyenPaiement) return;
    $('bloc-date-livraison-souhaitee').hidden = !etat.estInterne || etat.urgent;
    indexEtapeActuelle++;
    afficherEtape();
    return;
  }
});

$('champ-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});

async function verifierCode() {
  const code = $('champ-code').value.trim();
  if (!code) {
    $('retour-code').innerHTML = '<div class="msg msg-erreur">Merci de saisir un code.</div>';
    return;
  }
  $('btn-suivant').disabled = true;
  $('btn-suivant').textContent = 'Vérification…';
  $('retour-code').innerHTML = '';
  try {
    const r = await jsonp({ action: 'donnees-commande', code });
    if (!r.ok) {
      $('retour-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
      $('btn-suivant').disabled = false;
      $('btn-suivant').textContent = 'Continuer';
      return;
    }
    const v = r.verification;
    etat.code = code;
    etat.nomStructure = v.nom;
    appliquerPolitique(v);
    etat.produits = (r.catalogue && r.catalogue.produits) || [];
    preparerPrescripteurs(
      v.prescripteurs || (v.responsableHabituel ? [v.responsableHabituel] : []),
      v.prescripteursDetails,
    );
    try {
      sessionStorage.setItem('cvdl-code-structure', code);
    } catch (e) {}
    construireGrilleProduits();
    indexEtapeActuelle = etapesActives().indexOf('1');
    afficherEtape();
    $('btn-suivant').disabled = false;
    $('btn-suivant').textContent = 'Continuer';
    return true;
  } catch (e) {
    $('retour-code').innerHTML = '<div class="msg msg-erreur">Vérification impossible — réessayez.</div>';
  }
  $('btn-suivant').disabled = false;
  $('btn-suivant').textContent = 'Continuer';
}

function svgIcone(nomIcone) {
  const icones = {
    laptop:
      '<rect x="3" y="3" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="12.5" width="16" height="2" rx="1" fill="currentColor" stroke="none"/>',
    ecran:
      '<rect x="2.5" y="3" width="13" height="9" rx="1" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="12.5" x2="9" y2="15" stroke="currentColor" stroke-width="1.4"/><line x1="6" y1="15" x2="12" y2="15" stroke="currentColor" stroke-width="1.4"/>',
    souris:
      '<rect x="6" y="2.5" width="6" height="13" rx="3" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="2.5" x2="9" y2="7" stroke="currentColor" stroke-width="1.4"/>',
    clavier:
      '<rect x="2" y="5" width="14" height="8" rx="1.2" stroke="currentColor" stroke-width="1.4"/><line x1="4.5" y1="10.5" x2="13.5" y2="10.5" stroke="currentColor" stroke-width="1.4"/>',
    casque:
      '<path d="M3 10V9a6 6 0 0 1 12 0v1" stroke="currentColor" stroke-width="1.4" fill="none"/><rect x="1.8" y="9.5" width="3.4" height="5" rx="1.4" stroke="currentColor" stroke-width="1.4"/><rect x="12.8" y="9.5" width="3.4" height="5" rx="1.4" stroke="currentColor" stroke-width="1.4"/>',
    webcam:
      '<circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="9" r="2" fill="currentColor" stroke="none"/>',
    station:
      '<rect x="3" y="4" width="12" height="4.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="6" y="10.5" width="6" height="3.5" rx="1" stroke="currentColor" stroke-width="1.4"/>',
    sim: '<path d="M5 2h6l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4"/><rect x="6" y="8" width="5" height="4.5" rx=".8" stroke="currentColor" stroke-width="1.3"/>',
    recharge:
      '<rect x="1.5" y="6" width="13" height="7" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M16.5 8.2v3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 7.3 6.8 10h1.6l-.6 2.2L10 9.5H8.4z" fill="currentColor" stroke="none"/>',
    // catégories tablette, smartphone et atelier
    tablette:
      '<rect x="3" y="1.5" width="12" height="15" rx="1.6" stroke="currentColor" stroke-width="1.4"/><line x1="7.5" y1="14" x2="10.5" y2="14" stroke="currentColor" stroke-width="1.4"/>',
    telephone:
      '<rect x="5.5" y="1.5" width="7" height="15" rx="1.8" stroke="currentColor" stroke-width="1.4"/><line x1="8" y1="14" x2="10" y2="14" stroke="currentColor" stroke-width="1.4"/>',
    atelier:
      '<circle cx="6.3" cy="5.8" r="2.1" stroke="currentColor" stroke-width="1.3"/><path d="M2 15c0-2.4 1.9-4.3 4.3-4.3S10.6 12.6 10.6 15" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="12.8" cy="6.8" r="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M10.8 15c.2-1.9 1.6-3.4 3.4-3.8" stroke="currentColor" stroke-width="1.2" fill="none"/>',
    // Manquait aussi : feuille (Écologie / sensibilisation), pourtant choisissable côté admin
    // (ICONES_PRODUIT_OPTIONS) — un atelier de sensibilisation retombait donc lui aussi sur
    // l'icône par défaut (laptop), faute de correspondance ici.
    feuille:
      '<path d="M3.5 15.5C11 15.5 15.5 11 16.5 3.5 8 4 3.5 8.5 3.5 15.5Z" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M5 14C8 9 10 6.5 15 3" stroke="currentColor" stroke-width="1.3"/>',
  };
  return icones[nomIcone] || icones.laptop;
}
// Icône choisie explicitement par l'admin (formulaire produit, même valeurs que l'admin et
// categories-materiel.html) → icône SVG locale correspondante. Prioritaire sur la déduction par
// mot-clé ci-dessous, qui ne sert que de repli pour les produits encore en "Automatique".
const CORRESPONDANCE_ICONE_PRODUIT = {
  portable: 'laptop',
  fixe: 'ecran',
  telephone: 'telephone',
  telephone_touches: 'telephone',
  tablette: 'tablette',
  sim: 'sim',
  recharge: 'recharge',
  atelier: 'atelier',
  souris: 'souris',
  feuille: 'feuille',
};
/** Illustration produit (style des cartes du portail, portail-ui.js) — repli sur l'ancienne
 *  icône si le script commun n'est pas chargé. */
function illustrationProduitCommande(nom, icone, taille) {
  if (window.illustrationCvdl && window.cleIllustrationProduit)
    return window.illustrationCvdl(window.cleIllustrationProduit(nom, icone), taille);
  return `<svg viewBox="0 0 18 18" width="${Math.round(taille / 2)}" height="${Math.round(taille / 2)}" fill="none">${svgIcone(iconePourProduit(nom, icone))}</svg>`;
}
function iconePourProduit(nom, icone) {
  if (icone && CORRESPONDANCE_ICONE_PRODUIT[icone]) return CORRESPONDANCE_ICONE_PRODUIT[icone];
  const n = (nom || '').toLowerCase();
  // Doit être vérifié avant "atelier" tout court et avant "portable"/"ordinateur" : un nom du
  // type "Atelier de sensibilisation à l'écologie" contient ces trois mots-clés à la fois.
  if (/(sensibilisation|[ée]cologi|environnement)/.test(n)) return 'feuille';
  // Doit être vérifié avant "portable"/"ordinateur" : un nom du type "Atelier initiation
  // ordinateur" contient aussi ces mots-là.
  if (n.includes('atelier') || n.includes('animation')) return 'atelier';
  if (/\btouches?\b/.test(n)) return 'telephone';
  if (n.includes('smartphone') || n.includes('téléphone') || n.includes('telephone') || n.includes('mobile'))
    return 'telephone';
  if (n.includes('tablet')) return 'tablette';
  if (n.includes('portable') || n.includes('ordinateur') || n.includes('laptop')) return 'laptop';
  if (n.includes('écran') || n.includes('ecran') || n.includes('moniteur')) return 'ecran';
  if (/\bsim\b|carte sim/.test(n)) return 'sim';
  if (n.includes('recharge') || n.includes('forfait')) return 'recharge';
  if (n.includes('souris')) return 'souris';
  if (n.includes('clavier')) return 'clavier';
  if (n.includes('casque')) return 'casque';
  if (n.includes('webcam')) return 'webcam';
  if (n.includes('station') || n.includes('dock')) return 'station';
  return 'laptop';
}

function formaterPrixProduit(valeur) {
  const n = parseFloat(valeur);
  if (!isFinite(n)) return null;
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}
function construireGrilleProduits() {
  const zone = $('grille-produits');
  if (!etat.produits.length) {
    zone.innerHTML =
      '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucun produit disponible pour le moment.</div>';
    return;
  }
  zone.innerHTML = etat.produits
    .map((p) => {
      const dispo = p.disponible !== false;
      const selectionne = !!etat.selection[p.nom];
      const spec = [p.disque, p.ram, p.systeme].filter(Boolean).join(' · ');
      // prixUnitaire vaut null pour les structures ESN/Interne (rien n'est facturé) — pas de prix
      // affiché dans ce cas, comme pour le reste du parcours de commande côté back.
      const prixAffiche = etat.prixMasques ? null : formaterPrixProduit(p.prixUnitaire);
      return `
    <div class="carte-produit${selectionne ? ' selectionnee' : ''}${dispo ? '' : ' epuisee'}" data-produit="${echapper(p.nom)}" role="button" tabindex="0" aria-pressed="${selectionne}">
      <div class="coche-produit"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.7 9.5 3.2" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="icone-carre">${illustrationProduitCommande(p.nom, p.icone, 58)}</div>
      <div class="nom-produit">${echapper(p.nom)}</div>
      <div class="spec-produit">${dispo ? echapper(spec || 'Disponible') : echapper(p.messageRupture || 'Indisponible')}</div>
      ${prixAffiche ? `<div class="prix-produit">${prixAffiche}</div>` : ''}
    </div>`;
    })
    .join('');
}
$('grille-produits').addEventListener('click', (e) => {
  const carte = e.target.closest('[data-produit]');
  if (!carte || carte.classList.contains('epuisee')) return;
  const nom = carte.dataset.produit;
  if (etat.selection[nom]) delete etat.selection[nom];
  else etat.selection[nom] = 1;
  construireGrilleProduits();
  majBoutonSuivant();
});

function construireEtapeQuantites() {
  const zone = $('zone-quantites');
  const noms = Object.keys(etat.selection);
  const maxCmd = maxParCommande(),
    total = totalSelection();
  const resteCmd = maxCmd - total;
  zone.innerHTML = noms.length
    ? noms
        .map((nom) => {
          const q = etat.selection[nom],
            m = maxPourProduit(nom);
          const plusBloque = q >= m || resteCmd <= 0;
          const trop = q > m;
          const note = trop
            ? `<span class="qte-note ko">${m} au maximum</span>`
            : q >= m && Number.isFinite(m)
              ? `<span class="qte-note">Maximum atteint (${m})</span>`
              : resteCmd <= 0 && Number.isFinite(maxCmd)
                ? '<span class="qte-note">Limite de la commande atteinte</span>'
                : Number.isFinite(m)
                  ? `<span class="qte-note discret">jusqu’à ${m}</span>`
                  : '';
          return `
    <div class="ligne-quantite${trop ? ' qte-ko' : ''}">
      <span class="icone-quantite">${illustrationProduitCommande(nom, ((etat.produits || []).find((x) => x.nom === nom) || {}).icone, 42)}</span>
      <span class="qte-nom"><span style="font-weight:700;font-size:14px">${echapper(nom)}</span>${note}</span>
      <div class="stepper-quantite">
        <button type="button" data-dec="${echapper(nom)}" aria-label="Retirer une unité">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14"/></svg>
        </button>
        <span class="valeur-quantite">${q}</span>
        <button type="button" data-inc="${echapper(nom)}" aria-label="Ajouter une unité" ${plusBloque ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>`;
        })
        .join('')
    : '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucun produit sélectionné à l\'étape précédente.</div>';

  // Compteur « x / max articles » quand le mode stock bas limite la commande.
  const lim = $('limites-quantites');
  lim.hidden = !Number.isFinite(maxCmd) || !noms.length;
  if (!lim.hidden) {
    const pct = Math.min(100, Math.round((total / maxCmd) * 100));
    lim.innerHTML = `<div class="qte-compteur${total > maxCmd ? ' ko' : total === maxCmd ? ' plein' : ''}">
      <span class="asb-mini" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg></span>
      <span class="qte-compteur-txt"><b>Stock bas : ${total} / ${maxCmd} article${maxCmd > 1 ? 's' : ''}</b><small>${total > maxCmd ? `Retirez ${total - maxCmd} article${total - maxCmd > 1 ? 's' : ''} pour continuer.` : total === maxCmd ? 'Vous avez atteint le maximum pour cette commande.' : `Encore ${maxCmd - total} possible${maxCmd - total > 1 ? 's' : ''}.`}</small></span>
      <span class="qte-jauge"><i style="width:${pct}%"></i></span>
    </div>`;
  }
  const err = erreurQuantites();
  $('retour-quantites').innerHTML = err
    ? `<div class="msg msg-erreur" style="margin-top:var(--space-3)">${echapper(err)}</div>`
    : '';

  $('titre-etape-quantites').innerHTML = etat.autoriseUrgent
    ? 'Quelles <em>quantités</em>, et est-ce urgent ?'
    : 'Quelles <em>quantités</em> ?';
  $('bloc-urgent').hidden = !etat.autoriseUrgent;
  $('toggle-urgent').checked = etat.urgent;
  $('bloc-urgent').classList.toggle('urgent-actif', etat.urgent);
  if (typeof majBoutonSuivant === 'function' && etapesActives()[indexEtapeActuelle] === 'quantites') majBoutonSuivant();
}
$('zone-quantites').addEventListener('click', (e) => {
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (inc) {
    const nom = inc.dataset.inc;
    const q = etat.selection[nom] || 1;
    if (q >= maxPourProduit(nom) || totalSelection() >= maxParCommande()) return;
    etat.selection[nom] = q + 1;
    construireEtapeQuantites();
    construireRecap();
  }
  if (dec) {
    const nom = dec.dataset.dec;
    if (etat.selection[nom] > 1) etat.selection[nom]--;
    else delete etat.selection[nom];
    construireEtapeQuantites();
    construireZonePersonnesBo();
    construireRecap();
  }
});
$('toggle-urgent').addEventListener('change', () => {
  etat.urgent = $('toggle-urgent').checked;
  $('bloc-urgent').classList.toggle('urgent-actif', etat.urgent);
  construireRecap();
});

function unitesCommandees() {
  // Relais Numérique, comme ESN/Interne, ne déclare jamais de bénéficiaire nominatif à la commande —
  // contrairement à Vente solidaire qui en a besoin pour chaque unité.
  if (etat.estSansPaiement || etat.estRN) return [];
  if (etat.estProjets && !etat.projetsNominatif) return [];
  const unites = [];
  Object.keys(etat.selection).forEach((nom) => {
    const produit = (etat.produits || []).find((p) => p.nom === nom);
    if (produit && produit.sansPersonne) return;
    for (let i = 0; i < etat.selection[nom]; i++) unites.push(nom);
  });
  return unites;
}
function construireZonePersonnesBo() {
  const unites = unitesCommandees();
  const necessaire = unites.length > 0 || (etat.estProjets && etat.projetsNominatif);
  if (!necessaire) return;

  $('titre-etape-personnes').innerHTML = etat.estBO
    ? "Remplissez le ou les bon(s) <em>d'orientation</em>"
    : 'Qui va <em>recevoir</em> ce matériel ?';
  $('cases-attestation-bo').hidden = !etat.estBO;

  const compteurParProduit = {};
  $('zone-personnes-bo').innerHTML = unites
    .map((produit, i) => {
      compteurParProduit[produit] = (compteurParProduit[produit] || 0) + 1;
      const nbMemeProduit = unites.filter((p) => p === produit).length;
      const libelle = produit + (nbMemeProduit > 1 ? ` #${compteurParProduit[produit]}` : '');
      const illu =
        window.illustrationCvdl && window.cleIllustrationProduit
          ? window.illustrationCvdl(
              window.cleIllustrationProduit(
                produit,
                ((etat.produits || []).find((p) => p.nom === produit) || {}).icone,
              ),
              40,
            )
          : '';
      return `
    <div class="bloc-personne bp-ligne" id="personne-bloc-${i}">
      <div class="bp-app"><span class="bp-num">${i + 1}</span>${illu}<b>${echapper(libelle)}</b></div>
      <div class="grille-personne-bo">
        <div class="field"><label for="bo-prenom-${i}">Prénom</label><input type="text" class="input" id="bo-prenom-${i}" placeholder="Prénom" autocomplete="off"></div>
        <div class="field"><label for="bo-nomfamille-${i}">NOM</label><input type="text" class="input" id="bo-nomfamille-${i}" placeholder="NOM" autocomplete="off" style="text-transform:uppercase"></div>
        <div class="field"><label for="bo-naissance-${i}">Date de naissance</label><input type="date" class="input" id="bo-naissance-${i}" min="1920-01-01" max="${new Date().toISOString().slice(0, 10)}"></div>
      </div>
    </div>`;
    })
    .join('');
  document.querySelectorAll('#zone-personnes-bo input').forEach((inp) =>
    inp.addEventListener('input', () => {
      construireRecap();
    }),
  );
  // Le nom de famille est converti en majuscule au fil de la saisie — évite d'avoir à
  // retoucher toutes les commandes déjà en base côté admin si on l'avait laissé tel quel.
  // Les accents composés (touche morte ^/¨ au clavier, claviers virtuels mobiles) passent par
  // un événement "composition" : on ne touche pas à la valeur tant que ce n'est pas terminé,
  // sinon la lettre accentuée risque de ne pas se former correctement.
  const majusculeNomFamille = (inp) => {
    const position = inp.selectionStart;
    inp.value = inp.value.toUpperCase();
    inp.setSelectionRange(position, position);
  };
  document.querySelectorAll('#zone-personnes-bo [id^="bo-nomfamille-"]').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      if (!e.isComposing) majusculeNomFamille(inp);
    });
    inp.addEventListener('compositionend', () => majusculeNomFamille(inp));
  });
  // Le prénom, lui, ne passe en majuscule que sur la première lettre de chaque mot (pas tout
  // le champ comme le nom de famille) — pour distinguer les deux côté back rien qu'en lisant
  // la casse. Gère les prénoms composés, avec tiret ("Jean-Pierre") ou espace ("Marie Claire").
  const capitaliserPrenom = (valeur) => {
    let resultat = '';
    let debutMot = true;
    for (const car of valeur) {
      if (car === ' ' || car === '-') {
        resultat += car;
        debutMot = true;
      } else if (debutMot) {
        resultat += car.toUpperCase();
        debutMot = false;
      } else {
        resultat += car.toLowerCase();
      }
    }
    return resultat;
  };
  const majusculePrenom = (inp) => {
    const position = inp.selectionStart;
    inp.value = capitaliserPrenom(inp.value);
    inp.setSelectionRange(position, position);
  };
  document.querySelectorAll('#zone-personnes-bo [id^="bo-prenom-"]').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      if (!e.isComposing) majusculePrenom(inp);
    });
    inp.addEventListener('compositionend', () => majusculePrenom(inp));
  });
}
function listePersonnesBo() {
  return unitesCommandees().map((_, i) => {
    const prenom = ($('bo-prenom-' + i)?.value || '').trim();
    const nom = ($('bo-nomfamille-' + i)?.value || '').trim();
    return {
      prenom,
      nom,
      nomComplet: [prenom, nom].filter(Boolean).join(' '),
      dateNaissance: $('bo-naissance-' + i)?.value || '',
    };
  });
}
function dateNaissanceValide(s) {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const d = new Date(s);
  return !isNaN(d) && d <= aujourdhui && d.getFullYear() >= 1920;
}
/** Indices (dans unitesCommandees()) des lignes "personne" incomplètes ou invalides, avec la
 *  cause précise — sert à la fois à la validation, au message d'erreur explicite et au
 *  ciblage de la ou des lignes à signaler. */
function lignesPersonnesInvalides() {
  return listePersonnesBo()
    .map((p, i) => {
      const nomInvalide = p.nomComplet.length <= 1;
      const dateInvalide = !p.dateNaissance || !dateNaissanceValide(p.dateNaissance);
      return nomInvalide || dateInvalide ? { index: i, nomInvalide, dateInvalide } : null;
    })
    .filter(Boolean);
}
function personnesValides() {
  const necessaire = unitesCommandees().length > 0 || (etat.estProjets && etat.projetsNominatif);
  if (!necessaire) return true;
  const attestationOk =
    !etat.estBO || Array.from(document.querySelectorAll('.case-attestation-bo')).every((c) => c.checked);
  return lignesPersonnesInvalides().length === 0 && attestationOk;
}
/** Message d'erreur explicite : distingue nom manquant, date de naissance invalide, ou les
 *  deux, plutôt que le même message générique quelle que soit la cause. */
function messageErreurPersonnes() {
  const invalides = lignesPersonnesInvalides();
  const attestationOk =
    !etat.estBO || Array.from(document.querySelectorAll('.case-attestation-bo')).every((c) => c.checked);
  if (!invalides.length) {
    return attestationOk ? '' : "Merci de cocher les 3 cases d'attestation avant de continuer.";
  }
  const dateSeule = invalides.every((l) => l.dateInvalide && !l.nomInvalide);
  const nomSeul = invalides.every((l) => l.nomInvalide && !l.dateInvalide);
  let texte;
  if (dateSeule) {
    texte =
      invalides.length > 1
        ? `La date de naissance n'est pas valide sur ${invalides.length} lignes (ni dans le futur, ni avant le 01/01/1920).`
        : `La date de naissance n'est pas valide (ni dans le futur, ni avant le 01/01/1920).`;
  } else if (nomSeul) {
    texte =
      invalides.length > 1
        ? `Le prénom et le nom sont incomplets sur ${invalides.length} lignes.`
        : `Le prénom et le nom sont incomplets pour cette personne.`;
  } else {
    texte = `Merci de vérifier le prénom, le nom et la date de naissance (ni dans le futur, ni avant le 01/01/1920) de chaque personne.`;
  }
  if (!attestationOk) texte += " Et n'oubliez pas de cocher la case d'attestation.";
  return texte;
}
let timersErreurPersonnes = {};
/** Fait clignoter la ou les lignes "personne" en cause plutôt que de laisser le message
 *  d'erreur générique seul en bas du formulaire — reste en rouge ~5s puis s'efface en douceur,
 *  et centre l'écran sur la première ligne fautive. */
function signalerLignesPersonnesInvalides() {
  document.querySelectorAll('.bloc-personne-erreur').forEach((el) => el.classList.remove('bloc-personne-erreur'));
  Object.values(timersErreurPersonnes).forEach((t) => clearTimeout(t));
  timersErreurPersonnes = {};
  const invalides = lignesPersonnesInvalides();
  invalides.forEach((l) => {
    const bloc = $('personne-bloc-' + l.index);
    if (!bloc) return;
    void bloc.offsetWidth; // force le navigateur à relancer l'animation même si elle vient d'être jouée
    bloc.classList.add('bloc-personne-erreur');
    timersErreurPersonnes[l.index] = setTimeout(() => bloc.classList.remove('bloc-personne-erreur'), 5000);
  });
  if (invalides.length)
    $('personne-bloc-' + invalides[0].index)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const MOYENS_PAIEMENT = ['Paiement en ligne (CB)', 'Chèque', 'Espèces'];
const SVG_MOYEN_PAIEMENT = {
  'Paiement en ligne (CB)':
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  Chèque:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M6 16h4"/><path d="M14 16h4"/></svg>',
  Espèces:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  // Étal/échoppe — canopy en angle + bord festonné (comme un auvent de marché) et un comptoir
  // avec une ouverture arrondie en dessous : moyen de paiement propre aux commandes passées par
  // une structure BO (paiement en direct, physique, au comptoir solidaire du partenaire).
  'Comptoir solidaire':
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 5 4h14l2 5"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9v10h14V9"/><path d="M9 19v-4a3 3 0 0 1 6 0v4"/></svg>',
};
function construireRecap() {
  majRecapLateral();
  const noms = Object.keys(etat.selection);
  $('recap-structure').textContent = etat.nomStructure || '—';
  $('recap-materiel').textContent = noms.length ? noms.map((n) => `${etat.selection[n]}× ${n}`).join(', ') : '—';
  $('recap-priorite').textContent = etat.urgent ? 'Urgente' : 'Standard';

  if (!etat.paiementObligatoire) {
    $('zone-paiement').hidden = true;
    $('titre-etape-paiement').innerHTML = 'Récapitulatif de la <em>commande</em>';
    $('soustitre-etape-paiement').textContent = 'Vérifiez les informations avant de continuer.';
  } else {
    $('zone-paiement').hidden = false;
    $('titre-etape-paiement').innerHTML = 'Comment souhaitez-vous <em>régler</em> ?';
    $('soustitre-etape-paiement').textContent = 'Choisissez le moyen de paiement de cette commande.';
    const moyensDeBase = etat.estBO ? [...MOYENS_PAIEMENT, 'Comptoir solidaire'] : MOYENS_PAIEMENT;
    const moyens = etat.moyenImpose
      ? [etat.moyenImpose]
      : etat.moyensPaiementAutorises.length
        ? moyensDeBase.filter((m) => etat.moyensPaiementAutorises.includes(m))
        : moyensDeBase;
    $('grille-paiement').innerHTML = moyens
      .map((m) => {
        const choisi = etat.moyenPaiement === m;
        return `<button type="button" class="carte-moyen-paiement${choisi ? ' choisi' : ''}" aria-pressed="${choisi}" data-moyen-paiement="${echapper(m)}">
        <span class="coche-produit coche-choix" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.7 9.5 3.2" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        ${SVG_MOYEN_PAIEMENT[m] || ''}
        <span>${echapper(m)}</span>
        <small class="etat-choix">${choisi ? 'Sélectionné' : 'Choisir'}</small>
      </button>`;
      })
      .join('');
    if (!etat.moyenPaiement && moyens.length === 1) {
      etat.moyenPaiement = moyens[0];
      construireRecap();
      return;
    }
  }
  $('case-devis').hidden = !etat.devisPossible;
  $('case-projets-nominatif').hidden = !etat.estProjets;

  const personnes = listePersonnesBo();
  $('zone-paiement-partage').hidden = !(
    etat.moyenPaiement === 'Paiement en ligne (CB)' &&
    personnes.length >= 2 &&
    !etat.estSansPaiement
  );
}
$('grille-paiement').addEventListener('click', (e) => {
  const b = e.target.closest('[data-moyen-paiement]');
  if (!b) return;
  etat.moyenPaiement = b.dataset.moyenPaiement;
  construireRecap();
  majBoutonSuivant();
});
$('grille-paiement-partage').addEventListener('click', (e) => {
  const b = e.target.closest('[data-valeur-partage]');
  if (!b) return;
  etat.paiementSepare = b.dataset.valeurPartage;
  document.querySelectorAll('#grille-paiement-partage [data-valeur-partage]').forEach((x) => {
    x.classList.toggle('choisi', x === b);
    x.setAttribute('aria-pressed', x === b);
  });
});
$('case-devis-input').addEventListener('change', () => {
  etat.demandeDevis = $('case-devis-input').checked;
});
$('case-projets-nominatif-input').addEventListener('change', () => {
  etat.projetsNominatif = $('case-projets-nominatif-input').checked;
  construireZonePersonnesBo();
  construireRecap();
  if (etat.projetsNominatif) {
    const iPersonnes = etapesActives().indexOf('personnes');
    if (iPersonnes !== -1) {
      indexEtapeActuelle = iPersonnes;
      afficherEtape();
    }
  }
});
$('champ-commentaire').addEventListener('input', () => {
  etat.commentaire = $('champ-commentaire').value;
});

async function envoyerCommande() {
  const personnesRequises = unitesCommandees().length > 0 || (etat.estProjets && etat.projetsNominatif);
  if (!personnesValides()) {
    const iPersonnes = etapesActives().indexOf('personnes');
    if (iPersonnes !== -1) {
      indexEtapeActuelle = iPersonnes;
      afficherEtape();
    }
    $('retour-personnes-bo').innerHTML = '<div class="msg msg-erreur">' + messageErreurPersonnes() + '</div>';
    signalerLignesPersonnesInvalides();
    return;
  }
  const responsableCommande = prescripteurChoisi();
  if (!responsableCommande) {
    $('retour-envoi').innerHTML =
      '<div class="msg msg-erreur">Merci d\'indiquer le nom de la personne en charge de cette commande.</div>';
    return;
  }
  if (etat.paiementObligatoire && !etat.moyenPaiement) {
    $('retour-envoi').innerHTML = '<div class="msg msg-erreur">Merci de choisir un moyen de paiement.</div>';
    return;
  }
  const lignes = Object.keys(etat.selection).map((nom) => ({ produit: nom, quantite: etat.selection[nom] }));
  const moyenPaiementEnvoye =
    etat.moyenImpose ||
    (etat.estSansPaiement ? 'Non applicable (ESN/Interne)' : etat.estProjets ? '' : etat.moyenPaiement);
  const dateSouhaiteeSaisie = isoVersDateFr($('champ-date-livraison-souhaitee').value);
  const payload = {
    action: 'create',
    // Lien de commande dédié à un programme de distribution (commande.html?programme=ID).
    programme: (() => {
      try {
        return new URLSearchParams(location.search).get('programme') || '';
      } catch (e) {
        return '';
      }
    })(),
    code: etat.code,
    lignes,
    moyenPaiement: moyenPaiementEnvoye,
    commentaire: etat.commentaire,
    responsableCommande,
    demandeDevis: etat.devisPossible ? etat.demandeDevis : false,
    dateLivraisonSouhaitee: etat.urgent ? 'ASAP' : etat.estInterne ? dateSouhaiteeSaisie : '',
    personnes: personnesRequises ? listePersonnesBo().map((p) => `${p.nomComplet} — ${p.dateNaissance}`) : [],
  };
  if (!etat.estSansPaiement && etat.moyenPaiement === 'Paiement en ligne (CB)' && etat.paiementSepare) {
    payload.paiementSepare = etat.paiementSepare === 'Oui';
  }

  $('btn-envoyer-commande').disabled = true;
  $('retour-envoi').innerHTML = '';
  const barreRemplie = $('barre-envoi-commande-remplie');
  const textePourcentage = $('texte-pourcentage-commande');
  barreRemplie.style.width = '0%';
  textePourcentage.textContent = '0%';
  $('voile-envoi-commande').hidden = false;

  try {
    const r = await posterAvecProgressionCommande(payload, function (pourcentage) {
      barreRemplie.style.width = pourcentage + '%';
      textePourcentage.textContent = pourcentage + '%';
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    $('voile-envoi-commande').hidden = true;
    if (r.ok) {
      $('zone-etapes').hidden = true;
      $('pied-etape').hidden = true;
      $('ecran-confirmation').hidden = false;
      $('confirmation-ref').textContent = r.reference || '';
      // Première commande sur cet appareil : passage par le petit tutoriel du portail, puis la
      // commande ; ensuite, lien direct vers la commande dans le suivi.
      (function () {
        let tutoVu = false;
        try {
          tutoVu = localStorage.getItem('cvdl-tuto-commande-vu') === 'oui';
        } catch (e) {}
        const ref = encodeURIComponent(r.reference || '');
        $('lien-suivre-commande').href = tutoVu
          ? `suivi.html?ref=${ref}`
          : `portail-structure.html?tuto=commande&ref=${ref}`;
      })();
      $('confirmation-2fa').hidden = etat.moyenPaiement !== 'Paiement en ligne (CB)';
      // Avis rapide (retours.js) : une seule question, une fois la commande envoyée.
      if (window.CvdlRetours) CvdlRetours.terminerParcours('commande', 'reussi');
      if (window.CvdlRetours)
        CvdlRetours.demanderAvis(document.querySelector('#ecran-confirmation .card'), {
          parcours: 'commande',
          reference: r.reference,
          question: 'Passer cette commande, c’était simple ?',
        });
    } else {
      $('retour-envoi').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Envoi impossible.')}</div>`;
      $('btn-envoyer-commande').disabled = false;
    }
  } catch (e) {
    barreRemplie.style.width = '100%';
    textePourcentage.textContent = '100%';
    await new Promise((resolve) => setTimeout(resolve, 300));
    $('voile-envoi-commande').hidden = true;
    $('retour-envoi').innerHTML = '<div class="msg msg-erreur">Envoi impossible — réessayez.</div>';
    $('btn-envoyer-commande').disabled = false;
  }
}
$('btn-envoyer-commande').addEventListener('click', envoyerCommande);

afficherEtape();

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    etapeIdentificationVisible = false;
    $('champ-code').value = codeMemorise;
    verifierCode()
      .then((succes) => {
        if (!succes) {
          // code invalide ou expiré malgré la mémorisation : retour à l'étape 0, comptée
          // normalement
          etapeIdentificationVisible = true;
          afficherEtape();
        }
      })
      .finally(() => {
        document.documentElement.classList.remove('deja-identifie');
        const v = $('voile-verification-precoce');
        if (v) v.style.display = 'none';
      });
  } else {
    majProgression();
  }
} catch (e) {}

/* Catalogue et aide au choix : ouverts dans une fenêtre, sans quitter la commande */
document.addEventListener('click', (e) => {
  const l = e.target.closest('[data-ouvrir-integre]');
  if (l) {
    e.preventDefault();
    $('titre-integre').textContent = l.dataset.titreIntegre || '';
    $('iframe-integre').title = l.dataset.titreIntegre || '';
    const url = l.dataset.ouvrirIntegre;
    $('iframe-integre').src = url + (url.startsWith('http') ? '' : (url.includes('?') ? '&' : '?') + 'integre=1');
    $('voile-integre').classList.add('visible');
    return;
  }
  if (e.target.id === 'integre-fermer' || e.target.id === 'voile-integre')
    $('voile-integre').classList.remove('visible');
});

// Retours (retours.js, chargé après ce script) : la commande commence à l'ouverture de la page.
document.addEventListener('DOMContentLoaded', () => {
  const cle = etapesActives()[indexEtapeActuelle];
  if (window.CvdlRetours) CvdlRetours.commencerParcours('commande', NOMS_ETAPES[cle]);
});
