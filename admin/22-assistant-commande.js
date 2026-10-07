/* Admin CVDL — assistant nouvelle commande. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ════════════════════════════════════════════════════════════════════════════════════
   Nouvelle commande (saisie par l'équipe) — assistant en étapes, même principe que la
   création de structure : Structure → Produits → Personnes & livraison → Paiement & suivi
   → Récapitulatif. Les champs du portail qui manquaient (personnes, mode de livraison, date
   souhaitée/urgence, responsable, moyen de paiement, devis, notification) y sont repris.
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_COMMANDE = [
  {
    cle: 'structure',
    titre: 'Structure',
    ill: 'structures',
    h: 'Pour quelle structure ?',
    p: 'Son type fixe le tarif, le paiement et les documents de la commande.',
  },
  {
    cle: 'produits',
    titre: 'Produits',
    ill: 'commander',
    h: 'Que commande-t-elle ?',
    p: 'Ajoutez chaque produit avec sa quantité. Le prix suit la grille tarifaire de la structure.',
  },
  {
    cle: 'livraison',
    titre: 'Personnes & livraison',
    ill: 'personne',
    h: 'Pour qui, et comment livrer ?',
    p: 'Les personnes accompagnées (bons d’orientation), le mode de livraison et l’échéance.',
  },
  {
    cle: 'paiement',
    titre: 'Paiement & suivi',
    ill: 'facture',
    h: 'Comment est-elle réglée ?',
    p: 'Moyen et statut de paiement, statut de départ, commentaire interne.',
  },
  {
    cle: 'recap',
    titre: 'Récapitulatif',
    ill: 'attestations',
    h: 'Tout est bon ?',
    p: 'Relisez avant de créer — chaque bloc se modifie d’un clic.',
  },
];
const MOYENS_PAIEMENT_ADMIN = ['Paiement en ligne (CB)', 'Chèque', 'Espèces', 'Comptoir solidaire', 'Virement'];
function structureNc() {
  const v = state.modal && state.modal.v;
  return v ? state.structures.find((s) => s.code === v.code) : null;
}
function typeNc(s) {
  return s ? typeStructure(s) : '';
}
function sansPaiementNc(s) {
  const t = typeNc(s);
  return t === 'Interne' || t === 'ESN' || !!(s && s.depotVente);
}
function prixUnitaireNc(p, s) {
  if (!p || !s || sansPaiementNc(s)) return null;
  const v = parseFloat(typeNc(s) === 'Relais Numérique' ? p.prixRN : p.prixStandard);
  return isNaN(v) ? null : v;
}
function moyensNc(s) {
  const t = typeNc(s);
  if (t === 'Relais Numérique') return ['Virement (Relais Numérique)'];
  if (t === 'Vente solidaire') {
    const l = String(s.moyensPaiement || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    return l.length ? l : Object.keys(AIDE_MOYENS_PAIEMENT);
  }
  if (t === 'Projets') return MOYENS_PAIEMENT_ADMIN;
  return [];
}
function valeursInitialesCommande() {
  return {
    code: state.ncCode || '',
    personnes: [],
    paiementSepare: false,
    modeLivraison: '',
    urgent: false,
    dateSouhaitee: '',
    responsable: '',
    moyenPaiement: '',
    statutPaiement: 'Non payé',
    statutCommande: 'Reçue',
    demandeDevis: false,
    commentaire: '',
    notifier: true,
  };
}
function vueCreerCommande() {
  const m = state.modal;
  if (!m.v) m.v = valeursInitialesCommande();
  if (m.etape == null) m.etape = 0;
  if (m.vues == null) m.vues = 0;
  const v = m.v,
    s = structureNc();
  const et = ETAPES_COMMANDE[m.etape];
  const derniere = m.etape === ETAPES_COMMANDE.length - 1;
  const frise = ETAPES_COMMANDE.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-nc-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = {
    structure: etapeNcStructure,
    produits: etapeNcProduits,
    livraison: etapeNcLivraison,
    paiement: etapeNcPaiement,
    recap: etapeNcRecap,
  }[et.cle](v, s);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw ncw" role="dialog" aria-modal="true" aria-labelledby="ncw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">Nouvelle commande · étape ${m.etape + 1} sur ${ETAPES_COMMANDE.length}</div>
            <h2 class="csw-titre" id="ncw-titre">${s ? echapper(s.nom) : 'Nouvelle commande'}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <ol class="csw-frise fc2-frise">${frise}</ol>
        <div class="csw-corps">
          <div class="csw-intro"><span data-ill="${et.ill}" class="ill xl"></span><div><h3>${echapper(et.h)}</h3><p>${echapper(et.p)}</p></div></div>
          ${corps}
        </div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions csw-pied">
          <span style="flex:1"></span>
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-nc-precedent>← Précédent</button>' : ''}
          ${!derniere ? '<button type="button" class="btn btn-primary" data-nc-suivant>Suivant →</button>' : '<button type="button" class="btn btn-primary" id="cc-enregistrer">Créer la commande</button>'}
        </div>
      </div>
    </div>`;
}
function etapeNcStructure(v) {
  const liste = state.structures.slice().sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
  const q = String(v.recherche || '')
    .trim()
    .toLowerCase();
  const texte = (s) => (s.nom + ' ' + s.code + ' ' + typeStructure(s) + ' ' + (s.region || '')).toLowerCase();
  return `
    <input class="input" id="nc-recherche" type="search" placeholder="Rechercher une structure (nom, code, type, région)…" autocomplete="off" value="${echapper(v.recherche || '')}">
    <div class="ncw-structures" role="radiogroup" aria-label="Structure">
      ${
        liste
          .map((s) => {
            const t = typeStructure(s);
            return `
      <label class="csw-moyen ncw-structure${v.code === s.code ? ' choisi' : ''}" data-texte="${echapper(texte(s))}" ${q && !texte(s).includes(q) ? 'hidden' : ''}>
        <input type="radio" name="nc-structure" value="${echapper(s.code)}" ${v.code === s.code ? 'checked' : ''}>
        <span class="csw-type-ic" aria-hidden="true">${icon('building', 18)}</span>
        <span><b>${echapper(s.nom)}</b><small>${echapper(t)}${s.region ? ' · ' + echapper(s.region) : ''}${s.depotVente ? ' · dépôt-vente' : ''}</small></span>
        <span class="coche-choix-admin" aria-hidden="true">✓</span>
      </label>`;
          })
          .join('') || '<p class="csw-aide">Aucune structure enregistrée.</p>'
      }
    </div>
    <p class="csw-aide ncw-aucune" ${q && !liste.some((s) => texte(s).includes(q)) ? '' : 'hidden'}>Aucune structure ne correspond à cette recherche.</p>`;
}
function etapeNcProduits(v, s) {
  const t = typeNc(s);
  const optionsProduits = state.produits
    .map((p) => {
      const pu = prixUnitaireNc(p, s);
      return `<option value="${echapper(p.nom)}">${echapper(p.nom)}${pu != null ? ' — ' + formaterMontant(pu) : ''} · stock ${parseInt(p.stock, 10) || 0}</option>`;
    })
    .join('');
  let total = 0,
    totalConnu = true;
  const lignes = state.ncLignes
    .map((l, i) => {
      const p = state.produits.find((x) => x.nom === l.produit);
      const stock = p ? parseInt(p.stock, 10) || 0 : null;
      const insuffisant = stock !== null && l.quantite > stock;
      const pu = prixUnitaireNc(p, s);
      if (pu == null) totalConnu = false;
      else total += pu * l.quantite;
      return `<tr class="${insuffisant ? 'ko' : ''}"><td><b>${echapper(l.produit)}</b>${insuffisant ? `<small>Stock disponible : ${stock}</small>` : ''}</td>
      <td class="num">${l.quantite}</td><td class="num">${pu != null ? formaterMontant(pu) : '—'}</td><td class="num">${pu != null ? formaterMontant(pu * l.quantite) : '—'}</td>
      <td><button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-nc-retirer-ligne="${i}" aria-label="Retirer">${icon('x', 14)}</button></td></tr>`;
    })
    .join('');
  return `
    <div class="ncw-ajout">
      <select class="input" id="nc-produit-select" aria-label="Produit">${optionsProduits}</select>
      <input class="input" id="nc-produit-qte" type="number" min="1" value="1" aria-label="Quantité">
      <button type="button" class="btn btn-secondary" data-nc-ajouter-ligne>${icon('plus', 15)}Ajouter</button>
    </div>
    ${
      state.ncLignes.length
        ? `<table class="ncw-lignes"><thead><tr><th>Produit</th><th class="num">Qté</th><th class="num">Prix unit.</th><th class="num">Total</th><th></th></tr></thead><tbody>${lignes}</tbody>
      ${sansPaiementNc(s) ? '' : `<tfoot><tr><td colspan="3">Montant estimé${totalConnu ? '' : ' (partiel)'}</td><td class="num">${formaterMontant(total)}</td><td></td></tr></tfoot>`}</table>`
        : '<div class="csw-info"><span class="csw-type-ic">' +
          icon('package', 18) +
          '</span><span><b>Aucun produit ajouté</b><small>Choisissez un produit et sa quantité, puis « Ajouter ».</small></span></div>'
    }
    ${t === 'Projets' ? `<div class="csw-info"><span class="csw-type-ic">${icon('alert', 18)}</span><span><b>Structure Projets</b><small>Une quantité supérieure au stock est autorisée (commande par prévision).</small></span></div>` : ''}
    ${sansPaiementNc(s) ? `<p class="csw-aide">${echapper(t)} : aucun paiement ni prix pour cette structure.</p>` : `<p class="csw-aide">Tarif ${t === 'Relais Numérique' ? 'Relais Numérique' : 'standard'} de base — un tarif personnalisé éventuel s’applique au calcul final.</p>`}`;
}
function etapeNcLivraison(v, s) {
  const t = typeNc(s);
  const nbUnites = state.ncLignes.reduce((n, l) => n + (parseInt(l.quantite, 10) || 0), 0);
  const personnes = v.personnes;
  const blocPersonnes = `
    <section class="csw-section">
      <h4>Personnes accompagnées ${t === 'Vente solidaire' ? '*' : '<em>(facultatif)</em>'}</h4>
      ${t === 'Vente solidaire' ? `<p class="csw-aide" style="margin:0">Une personne par appareil${nbUnites ? ` — ${nbUnites} attendue${nbUnites > 1 ? 's' : ''}` : ''}. La date de naissance sert aux attestations.</p>` : ''}
      <div class="ncw-personnes">
        ${personnes
          .map(
            (p, i) => `
        <div class="ncw-personne">
          <span data-ill="personne" class="ill"></span>
          <input class="input" data-nc-pers="${i}" data-champ="prenom" placeholder="Prénom" value="${echapper(p.prenom)}" aria-label="Prénom">
          <input class="input" data-nc-pers="${i}" data-champ="nom" placeholder="NOM" value="${echapper(p.nom)}" aria-label="Nom">
          <input class="input" data-nc-pers="${i}" data-champ="naissance" placeholder="jj/mm/aaaa" inputmode="numeric" maxlength="10" value="${echapper(p.naissance)}" aria-label="Date de naissance">
          <button type="button" class="btn btn-ghost btn-icon" style="width:28px;height:28px" data-nc-pers-retirer="${i}" aria-label="Retirer">${icon('x', 14)}</button>
        </div>`,
          )
          .join('')}
      </div>
      <div><button type="button" class="btn btn-secondary" data-nc-pers-ajouter>${icon('plus', 14)}Ajouter une personne</button></div>
    </section>`;
  return `
    ${blocPersonnes}
    <section class="csw-section">
      <h4>Mode de livraison <em>(peut être choisi plus tard, à la préparation)</em></h4>
      <div class="ml-cartes" role="radiogroup" aria-label="Mode de livraison">${MODES_LIVRAISON.map(
        (md) => `
        <button type="button" role="radio" class="ml-carte${v.modeLivraison === md.valeur ? ' choisi' : ''}" aria-checked="${v.modeLivraison === md.valeur}" data-nc-mode="${echapper(md.valeur)}">
          <span class="ml-ill">${illustrationModeLivraison(md.valeur, 54)}</span>
          <b>${echapper(md.label)}</b><small>${echapper(md.aide)}</small>
          <span class="coche-choix-admin" aria-hidden="true">✓</span>
        </button>`,
      ).join('')}</div>
    </section>
    <section class="csw-section">
      <h4>Échéance</h4>
      <div class="csw-grille">
        <label class="csw-option${v.urgent ? ' choisi' : ''} csw-large" style="padding:12px 14px"><span class="rp-switch"><input type="checkbox" data-nc="urgent" ${v.urgent ? 'checked' : ''}><span class="rp-switch-piste"></span></span><span class="csw-option-txt"><b>Urgente — dès que possible</b><small>La commande apparaît en tête, avec le badge « Urgent ».</small></span></label>
        ${v.urgent ? '' : `<div class="field"><label for="nc-date-souhaitee">Date de livraison souhaitée <em>(facultatif)</em></label><input class="input" type="date" id="nc-date-souhaitee" data-nc="dateSouhaitee" value="${echapper(v.dateSouhaitee)}"></div>`}
        <div class="field"><label for="nc-responsable">Personne prescriptrice</label><input class="input" id="nc-responsable" data-nc="responsable" value="${echapper(v.responsable)}" placeholder="${echapper((s && s.responsable) || 'Prénom NOM')}"></div>
      </div>
    </section>`;
}
function etapeNcPaiement(v, s) {
  const t = typeNc(s);
  const moyens = moyensNc(s);
  let blocMoyen = '';
  if (s && s.depotVente)
    blocMoyen = `<div class="csw-info"><span class="csw-type-ic">${icon('check', 18)}</span><span><b>Mise en dépôt</b><small>Structure en dépôt-vente : rien à payer à la commande, le matériel reste à Emmaüs Connect jusqu’à sa vente.</small></span></div>`;
  else if (sansPaiementNc(s))
    blocMoyen = `<div class="csw-info"><span class="csw-type-ic">${icon('check', 18)}</span><span><b>Aucun paiement</b><small>Structure ${echapper(t)} : ni paiement, ni facture.</small></span></div>`;
  else if (t === 'Relais Numérique')
    blocMoyen = `<div class="csw-info"><span class="csw-type-ic">${iconeMoyenPaiementAdmin('Virement', 20)}</span><span><b>Virement (Relais Numérique)</b><small>Moyen imposé aux Relais Numérique : devis puis facture.</small></span></div>`;
  else
    blocMoyen = `
    <div class="csw-moyens" role="radiogroup" aria-label="Moyen de paiement">
      ${t === 'Projets' ? `<label class="csw-moyen${!v.moyenPaiement ? ' choisi' : ''}"><input type="radio" name="nc-moyen" value="" ${!v.moyenPaiement ? 'checked' : ''}><span class="csw-type-ic">${icon('clock', 18)}</span><span><b>À définir plus tard</b><small>Fixé par l’équipe à la validation.</small></span><span class="coche-choix-admin" aria-hidden="true">✓</span></label>` : ''}
      ${moyens
        .map((mo) => {
          const a = AIDE_MOYENS_PAIEMENT[mo] || { ic: 'receipt', txt: '' };
          return `
      <label class="csw-moyen${v.moyenPaiement === mo ? ' choisi' : ''}"><input type="radio" name="nc-moyen" value="${echapper(mo)}" ${v.moyenPaiement === mo ? 'checked' : ''}><span class="csw-type-ic">${iconeMoyenPaiementAdmin(mo, 20)}</span><span><b>${echapper(mo)}</b>${a.txt ? `<small>${echapper(a.txt)}</small>` : ''}</span><span class="coche-choix-admin" aria-hidden="true">✓</span></label>`;
        })
        .join('')}
    </div>`;
  const nbPersonnes = v.personnes.filter((p) => (p.prenom + p.nom).trim()).length;
  return `
    <section class="csw-section"><h4>Moyen de paiement${t === 'Vente solidaire' ? ' *' : ''}</h4>${blocMoyen}
      ${t === 'Vente solidaire' && v.moyenPaiement === 'Paiement en ligne (CB)' && nbPersonnes > 1 ? `<label class="csw-option${v.paiementSepare ? ' choisi' : ''}" style="padding:12px 14px"><span class="rp-switch"><input type="checkbox" data-nc="paiementSepare" ${v.paiementSepare ? 'checked' : ''}><span class="rp-switch-piste"></span></span><span class="csw-option-txt"><b>Un lien de paiement par personne</b><small>Chaque personne règle sa part ; sinon un seul lien pour toute la commande.</small></span></label>` : ''}
    </section>
    <section class="csw-section"><h4>Suivi</h4>
      <div class="csw-grille">
        ${sansPaiementNc(s) ? '' : `<div class="field"><label for="nc-statut-paiement">Statut du paiement</label><select class="input" id="nc-statut-paiement" data-nc="statutPaiement">${['Non payé', 'Payé'].map((x) => `<option ${v.statutPaiement === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`}
        <div class="field"><label for="nc-statut">Statut de départ</label><select class="input" id="nc-statut" data-nc="statutCommande">${ORDER_STATUSES.map((x) => `<option value="${echapper(x)}" ${v.statutCommande === x ? 'selected' : ''}>${echapper(x)}</option>`).join('')}</select></div>
        <div class="field csw-large"><label for="nc-commentaire">Commentaire <em>(facultatif)</em></label><textarea class="input" id="nc-commentaire" data-nc="commentaire" rows="3">${echapper(v.commentaire)}</textarea></div>
      </div>
      <div class="csw-cases">
        ${t === 'Relais Numérique' || t === 'Projets' ? `<label><input type="checkbox" data-nc="demandeDevis" ${v.demandeDevis ? 'checked' : ''}>Devis demandé par la structure</label>` : ''}
        <label><input type="checkbox" data-nc="notifier" ${v.notifier ? 'checked' : ''}>Envoyer l’e-mail de confirmation à la structure</label>
      </div>
    </section>`;
}
function libellePersonneNc(p) {
  return (
    [p.prenom.trim(), p.nom.trim().toUpperCase()].filter(Boolean).join(' ') +
    (p.naissance.trim() ? ' — ' + p.naissance.trim() : '')
  );
}
function etapeNcRecap(v, s) {
  const bloc = (
    i,
    titre,
    lignes,
  ) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-nc-aller="${i}">Modifier</button></div>
    ${lignes
      .filter((l) => l)
      .map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`)
      .join('')}</section>`;
  const total = state.ncLignes.reduce((n, l) => {
    const pu = prixUnitaireNc(
      state.produits.find((x) => x.nom === l.produit),
      s,
    );
    return pu == null ? n : n + pu * l.quantite;
  }, 0);
  const personnes = v.personnes.filter((p) => (p.prenom + p.nom).trim());
  const mode = MODES_LIVRAISON.find((md) => md.valeur === v.modeLivraison);
  const moyen =
    s && s.depotVente
      ? 'Mise en dépôt (payé à la vente)'
      : sansPaiementNc(s)
        ? 'Aucun paiement'
        : typeNc(s) === 'Relais Numérique'
          ? 'Virement (Relais Numérique)'
          : v.moyenPaiement || 'À définir';
  return `<div class="csw-recap">
    ${bloc(0, 'Structure', [
      ['Nom', s && s.nom],
      ['Type', typeNc(s)],
      ['E-mail', s && s.email],
    ])}
    ${bloc(1, 'Produits', [...state.ncLignes.map((l) => [l.produit, '× ' + l.quantite]), sansPaiementNc(s) ? null : ['Montant estimé', formaterMontant(total)]])}
    ${bloc(2, 'Personnes & livraison', [
      ['Personnes', personnes.length ? personnes.map((p) => libellePersonneNc(p).split(' — ')[0]).join(', ') : ''],
      ['Livraison', mode ? mode.label : 'À définir'],
      ['Échéance', v.urgent ? 'Urgente' : v.dateSouhaitee ? isoVersFrNc(v.dateSouhaitee) : ''],
      ['Prescripteur', v.responsable || (s && s.responsable)],
    ])}
    ${bloc(3, 'Paiement & suivi', [['Moyen', moyen], sansPaiementNc(s) ? null : ['Paiement', v.statutPaiement + (v.paiementSepare ? ' · un lien par personne' : '')], ['Statut', v.statutCommande], v.demandeDevis ? ['Devis', 'Demandé'] : null, ['E-mail structure', v.notifier ? 'Envoyé' : 'Non'], ['Commentaire', v.commentaire]])}
  </div>`;
}
function isoVersFrNc(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
}
function verifierEtapeCommande(i) {
  const v = state.modal.v,
    s = structureNc();
  const cle = ETAPES_COMMANDE[i].cle;
  if (cle === 'structure' && !s) return 'Choisissez une structure.';
  if (cle === 'produits') {
    if (!state.ncLignes.length) return 'Ajoutez au moins un produit.';
    if (typeNc(s) !== 'Projets') {
      const insuffisantes = state.ncLignes.filter((l) => {
        const p = state.produits.find((x) => x.nom === l.produit);
        return p && l.quantite > (parseInt(p.stock, 10) || 0);
      });
      if (insuffisantes.length)
        return `Stock insuffisant pour : ${insuffisantes.map((l) => l.produit).join(', ')}. Seules les structures Projets peuvent commander au-delà du stock.`;
    }
  }
  if (cle === 'livraison') {
    const remplies = v.personnes.filter((p) => (p.prenom + p.nom + p.naissance).trim());
    if (remplies.some((p) => !p.prenom.trim() || !p.nom.trim()))
      return 'Chaque personne doit avoir un prénom et un nom.';
    if (remplies.some((p) => p.naissance.trim() && !/^\d{2}\/\d{2}\/\d{4}$/.test(p.naissance.trim())))
      return 'Date de naissance au format jj/mm/aaaa.';
    if (typeNc(s) === 'Vente solidaire' && !remplies.length) return 'Ajoutez au moins une personne accompagnée.';
  }
  if (cle === 'paiement' && typeNc(s) === 'Vente solidaire' && !v.moyenPaiement)
    return 'Choisissez un moyen de paiement.';
  return '';
}
function allerEtapeCommande(cible) {
  const m = state.modal;
  if (cible > m.etape) {
    for (let i = m.etape; i < cible; i++) {
      const err = verifierEtapeCommande(i);
      if (err) {
        m.etape = i;
        render();
        $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
        return;
      }
    }
  }
  m.etape = Math.max(0, Math.min(ETAPES_COMMANDE.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps');
  if (corps) corps.scrollTop = 0;
}
document.addEventListener('click', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-commande' || !m.v) return;
  const aller = e.target.closest('[data-nc-aller]');
  if (aller) {
    allerEtapeCommande(parseInt(aller.dataset.ncAller, 10));
    return;
  }
  if (e.target.closest('[data-nc-suivant]')) {
    allerEtapeCommande(m.etape + 1);
    return;
  }
  if (e.target.closest('[data-nc-precedent]')) {
    allerEtapeCommande(m.etape - 1);
    return;
  }
  const mode = e.target.closest('[data-nc-mode]');
  if (mode) {
    m.v.modeLivraison = m.v.modeLivraison === mode.dataset.ncMode ? '' : mode.dataset.ncMode;
    render();
    return;
  }
  if (e.target.closest('[data-nc-pers-ajouter]')) {
    m.v.personnes.push({ prenom: '', nom: '', naissance: '' });
    render();
    const champs = document.querySelectorAll('[data-nc-pers][data-champ="prenom"]');
    if (champs.length) champs[champs.length - 1].focus();
    return;
  }
  const retirer = e.target.closest('[data-nc-pers-retirer]');
  if (retirer) {
    m.v.personnes.splice(parseInt(retirer.dataset.ncPersRetirer, 10), 1);
    render();
    return;
  }
});
document.addEventListener('input', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-commande' || !m.v) return;
  const el = e.target;
  if (el.id === 'nc-recherche') {
    m.v.recherche = el.value;
    const q = el.value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll('.ncw-structure').forEach((l) => {
      const ok = !q || l.dataset.texte.includes(q);
      l.hidden = !ok;
      if (ok) n++;
    });
    const vide = document.querySelector('.ncw-aucune');
    if (vide) vide.hidden = n > 0;
    return;
  }
  if (el.dataset.ncPers != null) {
    const p = m.v.personnes[parseInt(el.dataset.ncPers, 10)];
    if (!p) return;
    if (el.dataset.champ === 'prenom') {
      const pos = el.selectionStart;
      el.value = capitaliserPrenom(el.value);
      el.setSelectionRange(pos, pos);
    }
    if (el.dataset.champ === 'nom') {
      const pos = el.selectionStart;
      el.value = el.value.toUpperCase();
      el.setSelectionRange(pos, pos);
    }
    if (el.dataset.champ === 'naissance') {
      const ch = el.value.replace(/\D/g, '').slice(0, 8);
      el.value = [ch.slice(0, 2), ch.slice(2, 4), ch.slice(4)].filter(Boolean).join('/');
    }
    p[el.dataset.champ] = el.value;
    return;
  }
  if (el.dataset.nc && el.type !== 'checkbox') m.v[el.dataset.nc] = el.value;
});
document.addEventListener('change', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-commande' || !m.v) return;
  const el = e.target;
  if (el.name === 'nc-structure') {
    if (m.v.code !== el.value) {
      m.v.code = el.value;
      state.ncCode = el.value;
      m.v.moyenPaiement = '';
      m.v.paiementSepare = false;
      m.vues = 0;
    }
    render();
    return;
  }
  if (el.name === 'nc-moyen') {
    m.v.moyenPaiement = el.value;
    if (el.value !== 'Paiement en ligne (CB)') m.v.paiementSepare = false;
    render();
    return;
  }
  if (el.dataset.nc) {
    m.v[el.dataset.nc] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'checkbox' || el.tagName === 'SELECT') render();
  }
});
async function enregistrerCommande() {
  const m = state.modal,
    v = m.v;
  for (let i = 0; i < ETAPES_COMMANDE.length - 1; i++) {
    const err = verifierEtapeCommande(i);
    if (err) {
      m.etape = i;
      render();
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
      return;
    }
  }
  const s = structureNc();
  const t = typeNc(s);
  const personnes = v.personnes.filter((p) => (p.prenom + p.nom).trim()).map(libellePersonneNc);
  const donnees = {
    action: 'commande-create-manuelle',
    code: s.code,
    lignes: state.ncLignes,
    statutCommande: v.statutCommande,
    statutPaiement: sansPaiementNc(s) ? '' : v.statutPaiement,
    moyenPaiement: sansPaiementNc(s) ? '' : t === 'Relais Numérique' ? 'Virement (Relais Numérique)' : v.moyenPaiement,
    paiementSepare: !!(v.paiementSepare && personnes.length > 1 && v.moyenPaiement === 'Paiement en ligne (CB)'),
    personnes,
    modeLivraison: v.modeLivraison,
    dateLivraisonSouhaitee: v.urgent ? 'ASAP' : isoVersFrNc(v.dateSouhaitee),
    responsableCommande: (v.responsable || '').trim(),
    demandeDevis: !!v.demandeDevis,
    notifierStructure: !!v.notifier,
    commentaire: (v.commentaire || '').trim(),
    urlSuivi: '',
    urlPortail: '',
  };
  $('cc-enregistrer').disabled = true;
  try {
    const r = await posterEtat(donnees, 'Création…', 'Commande créée');
    if (r.ok) {
      const rc = await jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' });
      if (rc.ok) state.commandes = rc.commandes;
      // Créée depuis un devis libre (bouton "Générer la commande liée") : rattache
      // automatiquement le nouveau devis à cette commande fraîchement créée.
      if (m.rattacherDevisLigne) {
        const nouvelleCommande = state.commandes.find((c) => c.reference === r.reference);
        if (nouvelleCommande) {
          await poster({
            action: 'devis-rattacher-commande',
            ligneDevis: m.rattacherDevisLigne,
            ligneCommande: nouvelleCommande.ligne,
          });
          const rd = await jsonp({ action: 'devis', password: motDePasse, limite: 0 });
          if (rd.ok) state.devis = rd.devis;
        }
      }
      state.modal = null;
      state.ncLignes = [];
      state.ncCode = '';
      render();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('cc-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
    const b = $('cc-enregistrer');
    if (b) b.disabled = false;
  }
}
