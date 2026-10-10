/* Admin CVDL — recherche, import CSV tec.tech, changements de statut, rapprochements. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
let rechercheDebounce = null;
const CHAMPS_RECHERCHE = {
  'rp-recherche-commandes': 'commandeSearch',
  'rp-recherche-sav': 'savSearch',
  'rp-recherche-docs': 'docSearch',
};
/** Même règle de casse que commande.html/flotte-structure.html (dupliquée ici, pas de module
 *  commun dans ce projet) : le prénom ne prend une majuscule qu'en début de chaque mot (gère
 *  les prénoms composés, tiret ou espace), le nom de famille passe entièrement en majuscule. */
function capitaliserPrenom(valeur) {
  let resultat = '',
    debutMot = true;
  for (const car of valeur) {
    if (car === ' ' || car === '-') {
      resultat += car;
      debutMot = true;
    } else if (debutMot) {
      resultat += car.toUpperCase();
      debutMot = false;
    } else resultat += car.toLowerCase();
  }
  return resultat;
}
document.addEventListener('compositionend', (e) => {
  if (e.target.id === 'cs-responsable-prenom' || e.target.id === 'cs-responsable-facturation-prenom') {
    const p = e.target.selectionStart;
    e.target.value = capitaliserPrenom(e.target.value);
    e.target.setSelectionRange(p, p);
  }
  if (e.target.id === 'cs-responsable-nom' || e.target.id === 'cs-responsable-facturation-nom') {
    const p = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(p, p);
  }
});
document.addEventListener('input', (e) => {
  if (
    (e.target.id === 'cs-responsable-prenom' || e.target.id === 'cs-responsable-facturation-prenom') &&
    !e.isComposing
  ) {
    const position = e.target.selectionStart;
    e.target.value = capitaliserPrenom(e.target.value);
    e.target.setSelectionRange(position, position);
    return;
  }
  if ((e.target.id === 'cs-responsable-nom' || e.target.id === 'cs-responsable-facturation-nom') && !e.isComposing) {
    const position = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(position, position);
    return;
  }
  if (e.target.matches && e.target.matches('[data-serie-index]')) {
    synchroSeriesDepuisLignes();
    return;
  }
  if (e.target.id === 'pn-series') {
    const attendu = parseInt(e.target.dataset.quantiteAttendue, 10) || 0;
    const n = e.target.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean).length;
    const compteur = $('pn-series-compteur');
    if (compteur) compteur.textContent = `${n}/${attendu} saisi${n > 1 ? 's' : ''}`;
    return;
  }
  const cle = CHAMPS_RECHERCHE[e.target.id];
  if (!cle) return;
  state[cle] = e.target.value;
  if (cle === 'commandeSearch') state.commandesPage = 0;
  const id = e.target.id,
    curseur = e.target.selectionStart;
  clearTimeout(rechercheDebounce);
  rechercheDebounce = setTimeout(() => {
    render();
    const champ = $(id);
    if (champ) {
      champ.focus();
      champ.setSelectionRange(curseur, curseur);
    }
  }, 300);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-statut-config]');
  if (el) {
    modifierStatutSav(
      parseInt(el.dataset.statutConfig, 10),
      el.dataset.champ,
      el.type === 'checkbox' ? el.checked : el.value,
    );
    return;
  }
  if (e.target.id === 'pn-series-csv') {
    importerCsvSeries(e.target.files[0]);
    return;
  }
  if (e.target.id === 'nc-code') {
    state.ncCode = e.target.value;
    render();
    return;
  }
  if (e.target.id === 'nd-structure-select') {
    const st = state.structures.find((x) => x.code === e.target.value);
    state.ndStructureNom = st ? st.nom : '';
    state.ndEmail = st ? st.email || '' : '';
    state.ndAdresse = st ? st.adresse || '' : '';
    $('cdl-structure').value = state.ndStructureNom;
    $('cdl-email').value = state.ndEmail;
    $('cdl-adresse').value = state.ndAdresse;
    return;
  }
  const ndPrixLigne = e.target.closest('[data-nd-prix-ligne]');
  if (ndPrixLigne) {
    const i = parseInt(ndPrixLigne.dataset.ndPrixLigne, 10);
    if (state.ndLignes[i]) state.ndLignes[i].prixUnitaire = parseFloat(ndPrixLigne.value) || 0;
    render();
    return;
  }
  if (e.target.dataset.groupesMode) {
    $(`${e.target.dataset.groupesMode}-mixte`).style.display = e.target.value === 'mixte' ? 'flex' : 'none';
    return;
  }
  if (e.target.id === 'bilan-annee') {
    state.bilanAnnee = parseInt(e.target.value, 10);
    render();
    return;
  }
  if (e.target.id === 'sav-stats-annee') {
    state.savStatsAnnee = parseInt(e.target.value, 10);
    render();
    return;
  }
  if (e.target.id === 'cp-icone') {
    const v = e.target.value;
    const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(v);
    const estTablette = v === 'tablette';
    const zoneMateriel = $('cp-tech-materiel');
    if (zoneMateriel) zoneMateriel.style.display = estOrdiOuTelephone || estTablette ? 'grid' : 'none';
    const zoneProcesseur = $('cp-champ-processeur');
    if (zoneProcesseur) zoneProcesseur.style.display = estOrdiOuTelephone ? 'block' : 'none';
    const zoneRecharge = $('cp-tech-recharge');
    if (zoneRecharge) zoneRecharge.style.display = v === 'recharge' ? 'grid' : 'none';
    return;
  }
});
/* Saisie « un appareil = une ligne » : le champ #pn-series (source envoyée au serveur) est
   reconstruit à partir des lignes ; l'import CSV remplit les lignes dans l'ordre. */
function synchroSeriesDepuisLignes() {
  const champs = [...document.querySelectorAll('[data-serie-index]')];
  const zone = $('pn-series');
  if (!zone || !champs.length) return;
  zone.value = champs
    .map((x) => x.value.trim())
    .join('\n')
    .replace(/\n+$/, '');
  const prets = champs.filter((x) => x.value.trim()).length;
  champs.forEach((x) => x.closest('.ul-ligne').classList.toggle('ok', !!x.value.trim()));
  const compteur = $('pn-series-compteur');
  const total = champs.length;
  if (compteur) compteur.textContent = `${prets} / ${total} prêt${prets > 1 ? 's' : ''}`;
  const barre = $('ul-barre');
  if (barre) barre.style.width = `${total ? Math.round((prets / total) * 100) : 0}%`;
  // Enregistrement automatique dès que toutes les lignes sont remplies (plus de bouton « Confirmer »).
  clearTimeout(synchroSeriesDepuisLignes.t);
  if (total && prets === total && zone.dataset.ref) {
    const c = state.commandes.find((x) => x.reference === zone.dataset.ref);
    if (c && zone.value !== String(c.numerosSerie || '').replace(/\n+$/, ''))
      synchroSeriesDepuisLignes.t = setTimeout(() => confirmerSeriesCommande(zone.dataset.ref), 700);
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.matches || !e.target.matches('[data-serie-index]')) return;
  e.preventDefault();
  const champs = [...document.querySelectorAll('[data-serie-index]')];
  const suivant = champs[champs.indexOf(e.target) + 1];
  if (suivant) suivant.focus();
  else {
    const b = document.querySelector('.et-principal');
    if (b) b.focus();
  }
});
/* ── Import CSV tec.tech : chaque numéro va sur la ligne du BON produit (tectech-csv.js) ── */
/** Place les appareils du CSV sur les lignes vides de la préparation. Renvoie le bilan. */
function placerSeriesParProduit(c, appareils) {
  const champs = [...document.querySelectorAll('[data-serie-index]')];
  const bilan = placerSeriesCsv(
    unitesSeriePersonnes(c),
    champs.map((x) => x.value),
    appareils,
    (nom) => state.produits.find((p) => p.nom === nom),
  );
  champs.forEach((ch, i) => (ch.value = bilan.valeurs[i] || ''));
  synchroSeriesDepuisLignes();
  return bilan;
}
function importerCsvSeries(fichier) {
  if (!fichier) return;
  const c = state.modal && state.commandes.find((x) => x.reference === state.modal.ref);
  const lecteur = new FileReader();
  lecteur.onload = async () => {
    const appareils = lireCsvTecTech(lecteur.result);
    if (!appareils) {
      etat('CSV vide ou sans ligne de données (2ᵉ ligne).', 'erreur');
      return;
    }
    if (!appareils.length) {
      etat('Aucun numéro de série trouvé dans le CSV.', 'erreur');
      return;
    }
    if (!c || !document.querySelector('[data-serie-index]')) {
      const zone = $('pn-series');
      if (zone) zone.value = appareils.map((a) => a.numeroSerie).join('\n');
      etat(
        `${appareils.length} numéro${appareils.length > 1 ? 's' : ''} importé${appareils.length > 1 ? 's' : ''}`,
        'succes',
      );
      return;
    }
    if (appareils.some((a) => !a.type)) etat('Recherche des appareils chez tec.tech…', 'chargement');
    await completerParTecTech(appareils, (numeros) => poster({ action: 'tectech-classer-series', numeros }));
    const bilan = placerSeriesParProduit(c, appareils);
    const n = bilan.places.length;
    const hors = bilan.nonPlaces.length
      ? ` · ${bilan.nonPlaces.length} hors commande (${bilan.nonPlaces
          .slice(0, 3)
          .map((a) => a.numeroSerie)
          .join(', ')}${bilan.nonPlaces.length > 3 ? '…' : ''})`
      : '';
    etat(
      n
        ? `${n} numéro${n > 1 ? 's' : ''} placé${n > 1 ? 's' : ''} sur le bon produit${hors}`
        : 'Aucun numéro ne correspond aux produits de la commande',
      n ? 'succes' : 'erreur',
      hors ? 12000 : undefined,
    );
    const z = $('pn-erreur-series');
    if (z)
      z.innerHTML = bilan.nonPlaces.length
        ? `<div class="msg msg-warn">${bilan.nonPlaces.length} numéro${bilan.nonPlaces.length > 1 ? 's' : ''} du CSV ne correspond${bilan.nonPlaces.length > 1 ? 'ent' : ''} à aucune ligne restante : ${bilan.nonPlaces
            .slice(0, 8)
            .map((a) => echapper(libelleNonPlace(a)))
            .join(
              ', ',
            )}${bilan.nonPlaces.length > 8 ? '…' : ''}. Vérifiez le Type / la Catégorie tec.tech des fiches produit.</div>`
        : '';
  };
  lecteur.readAsText(fichier);
}
/** Marquer livrée avec une date choisie explicitement — évite que le back complète tout seul
 *  la date du jour (il ne le fait que si le champ est vide, donc l'envoyer nous-mêmes suffit à
 *  éviter cet auto-remplissage). */
async function marquerCommandeLivree(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const iso = $('pn-date-livraison-directe').value;
  if (!iso) return;
  const [y, mo, d] = iso.split('-');
  const dateFr = `${d}/${mo}/${y}`;
  etat('Enregistrement…', 'chargement');
  try {
    const rDate = await poster({ action: 'update', id: c.id, champ: 'dateLivraison', valeur: dateFr });
    if (!rDate.ok) {
      etat(rDate.erreur || 'Enregistrement impossible', 'erreur');
      return;
    }
    c.dateLivraison = dateFr;
    const rStatut = await poster({ action: 'update', id: c.id, champ: 'statutCommande', valeur: 'Livrée' });
    if (rStatut.ok) {
      c.statutCommande = 'Livrée';
      etat('Commande livrée', 'succes');
      render();
    } else etat(rStatut.erreur || 'Enregistrement impossible', 'erreur');
  } catch (e) {
    etat('Enregistrement impossible', 'erreur');
  }
}
async function changerStatutCommande(ref, nouveauStatut) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const avant = c.statutCommande;
  c.statutCommande = nouveauStatut; // optimiste
  render();
  try {
    const r = await posterEtat(
      { action: 'update', id: c.id, champ: 'statutCommande', valeur: nouveauStatut },
      'Changement de statut…',
      'Statut mis à jour',
    );
    if (!r || !r.ok) {
      c.statutCommande = avant;
      render();
      afficherErreurModale(r && r.erreur);
    }
  } catch (e) {
    c.statutCommande = avant;
    render();
    afficherErreurModale('Une erreur est survenue.');
  }
}

async function changerStatutSav(ref, nouveauStatut) {
  const s = state.sav.find((x) => x.reference === ref);
  if (!s) return;
  const avant = s.statut;
  s.statut = nouveauStatut; // optimiste
  render();
  try {
    const r = await posterEtat(
      { action: 'sav-update', id: s.id, champ: 'statut', valeur: nouveauStatut },
      'Changement de statut…',
      'Statut mis à jour',
    );
    if (!r || !r.ok) {
      s.statut = avant;
      render();
    }
  } catch (e) {
    s.statut = avant;
    render();
  }
}
/** Clôture d'un dossier SAV (via un statut Terminal existant, "Annulé" y compris) avec motif
 *  obligatoire — enregistré dans "notes", déjà affiché sur les pages de suivi public
 *  (bénéficiaire et structure), donc rien à modifier côté back pour que ça s'y voie. */
async function clotureSavAvecMotif(ref, statut, raison) {
  const s = state.sav.find((x) => x.reference === ref);
  if (!s) return;
  etat('Clôture du dossier…', 'chargement');
  try {
    const [rs, rn] = await Promise.all([
      poster({ action: 'sav-update', id: s.id, champ: 'statut', valeur: statut }),
      poster({ action: 'sav-update', id: s.id, champ: 'notes', valeur: raison }),
    ]);
    if (rs.ok && rn.ok) {
      s.statut = statut;
      s.notes = raison;
      etat('Dossier clôturé', 'succes');
      render();
    } else etat(rs.erreur || rn.erreur || 'Clôture impossible', 'erreur');
  } catch (e) {
    etat('Clôture impossible', 'erreur');
  }
}
/** "Annuler ce SAV" — crée un statut Terminal "Annulé" à la volée s'il n'existe pas encore
 *  (même mécanisme que les autres statuts, juste ajouté une fois pour toutes), puis clôture
 *  dessus avec le motif obligatoire. */
async function annulerSav(ref) {
  const s = state.sav.find((x) => x.reference === ref);
  if (!s) return;
  const raison = await demanderCvdl(
    'Annuler ce dossier SAV ? Cette action est définitive.\n\nMotif (visible par la structure/la personne accompagnée dans son suivi) :',
  );
  if (raison === null) return;
  if (!raison.trim()) {
    etat('Un motif est obligatoire pour annuler le dossier.', 'erreur');
    return;
  }
  let statutAnnule = state.statutsSav.find((x) => x.terminal && x.statut.toLowerCase().includes('annul'));
  if (!statutAnnule) {
    etat('Création du statut « Annulé »…', 'chargement');
    const rAjout = await poster({ action: 'sav-statut-ajouter', statut: 'Annulé' });
    if (!rAjout.ok) {
      etat(rAjout.erreur || 'Création du statut impossible', 'erreur');
      return;
    }
    await rechargerStatutsSav();
    const cree = state.statutsSav.find((x) => x.statut === 'Annulé');
    if (cree) await poster({ action: 'sav-statut-modifier', id: cree.id, champ: 'terminal', valeur: true });
    await rechargerStatutsSav();
    statutAnnule = state.statutsSav.find((x) => x.statut === 'Annulé');
  }
  if (!statutAnnule) {
    etat('Impossible de créer le statut « Annulé »', 'erreur');
    return;
  }
  clotureSavAvecMotif(ref, statutAnnule.statut, raison.trim());
}

/** Rapprochement bancaire : le statut vit sur la commande liée (statutComptable), pas sur la
 *  facture elle-même — jointure par référence, comme partout ailleurs dans l'appli. */
const STATUTS_COMPTABLES = ['Non rapproché', 'Rapproché', 'Clôturé'];
function vueRattacherDevis() {
  const d = state.devis.find((x) => x.id === state.modal.idDevis);
  if (!d) return '';
  const eligibles = state.commandes.filter((c) => !c.referenceDevis && !structureExclueDevisFacture(c));
  return dialogShell(
    `Rattacher ${d.referenceDevis} à une commande`,
    `
    ${
      eligibles.length
        ? champ(
            'Commande *',
            `<select class="input" id="rd-commande">${eligibles.map((c) => `<option value="${c.id}">${echapper(c.reference)} — ${echapper(c.nom)}</option>`).join('')}</select>`,
          )
        : '<p style="opacity:0.6;font-size:13px;margin-top:var(--space-2)">Aucune commande sans devis à rattacher.</p>'
    }
  `,
    'rd-enregistrer',
  );
}
async function enregistrerRattachementDevis() {
  const select = $('rd-commande');
  if (!select) {
    state.modal = null;
    render();
    return;
  }
  const idCommande = parseInt(select.value, 10);
  const idDevis = state.modal.idDevis;
  $('rd-enregistrer').disabled = true;
  try {
    const r = await posterEtat(
      { action: 'devis-rattacher-commande', idDevis, idCommande },
      'Rattachement…',
      'Devis rattaché',
    );
    if (r.ok) {
      const [rc, rd] = await Promise.all([
        jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
        jsonp({ action: 'devis', password: motDePasse, limite: 0 }),
      ]);
      if (rc.ok) state.commandes = rc.commandes;
      if (rd.ok) state.devis = rd.devis;
      state.modal = null;
      render();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('rd-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Rattachement impossible.</div>';
    $('rd-enregistrer').disabled = false;
  }
}
function vueRapprochement() {
  const c = state.commandes.find((x) => x.referenceFacture === state.modal.refFacture);
  if (!c) return '';
  return dialogShell(
    `Rapprochement — ${c.reference}`,
    `
    ${champ(
      'Statut',
      `<select class="input" id="rp-statut-comptable">
      ${STATUTS_COMPTABLES.map((s) => `<option value="${s}" ${c.statutComptable === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>`,
    )}
    ${champ('Note', `<textarea class="input" id="rp-note-depot" rows="2" placeholder="Numéro de dépôt bancaire, reçu Zettle etc.">${echapper(c.numeroDepot || '')}</textarea>`)}
    <p style="font-size:12.5px;opacity:0.6;margin:0">Passer en "Rapproché" ou "Clôturé" marque aussi la commande et sa facture comme payées.</p>
  `,
    'rp-enregistrer-rappro',
  );
}
async function enregistrerRapprochement() {
  const c = state.commandes.find((x) => x.referenceFacture === state.modal.refFacture);
  if (!c) return;
  const statut = $('rp-statut-comptable').value;
  const note = $('rp-note-depot').value.trim();
  const f = state.factures.find((x) => x.referenceFacture === c.referenceFacture);
  // Rapproché ou Clôturé = la commande figure sur le relevé bancaire : elle est payée, quel
  // que soit le moyen de paiement.
  const marquerPaye = statut === 'Rapproché' || statut === 'Clôturé';
  $('rp-enregistrer-rappro').disabled = true;
  try {
    const appels = [
      poster({ action: 'update', id: c.id, champ: 'statutComptable', valeur: statut }),
      poster({ action: 'update', id: c.id, champ: 'numeroDepot', valeur: note }),
    ];
    if (marquerPaye) appels.push(poster({ action: 'update', id: c.id, champ: 'statutPaiement', valeur: 'Payé' }));
    if (marquerPaye && f) appels.push(poster({ action: 'facture-update', id: f.id, champ: 'statut', valeur: 'Payée' }));
    const reponses = await Promise.all(appels);
    if (!reponses.find((r) => !r.ok)) {
      c.statutComptable = statut;
      c.numeroDepot = note;
      if (marquerPaye) c.statutPaiement = 'Payé';
      if (marquerPaye && f) f.statut = 'Payée';
      etat('Rapprochement mis à jour', 'succes');
      state.modal = null;
      render();
    } else {
      etat('Enregistrement impossible', 'erreur');
      $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
      $('rp-enregistrer-rappro').disabled = false;
    }
  } catch (e) {
    etat('Enregistrement impossible', 'erreur');
    $('rp-enregistrer-rappro').disabled = false;
  }
}

/* ============================================================
   Dashboard
   ============================================================ */
