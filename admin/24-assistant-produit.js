/* Admin CVDL — assistant produit, décorations du style unifié. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ════════════════════════════════════════════════════════════════════════════════════
   Nouveau produit — assistant en étapes (même principe que nouvelle commande / nouveau SAV).
   La modification d'un produit existant garde le formulaire complet (vueCreerProduit).
   Les champs gardent les mêmes identifiants (cp-…) : enregistrerProduit() lit les valeurs
   mémorisées dans state.modal.v quand l'assistant est utilisé.
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_PRODUIT = [
  {
    cle: 'categorie',
    titre: 'Catégorie',
    ill: 'categories',
    h: 'Quel produit ?',
    p: 'Son nom, sa catégorie (elle choisit l’illustration et les caractéristiques proposées) et son groupe de commande.',
  },
  {
    cle: 'prix',
    titre: 'Prix et stock',
    ill: 'facture',
    h: 'Prix et stock',
    p: 'Le prix standard et le prix Vente solidaire / RNum, le stock de départ.',
  },
  {
    cle: 'caracteristiques',
    titre: 'Caractéristiques',
    ill: 'passeport',
    h: 'Caractéristiques',
    p: 'Ce que les structures verront dans le catalogue au moment de commander.',
  },
  {
    cle: 'comportement',
    titre: 'Comportement',
    ill: 'reglages',
    h: 'Comment se comporte-t-il dans une commande ?',
    p: 'Visibilité, numéro de série, dématérialisé, facturation en fin de mois.',
  },
  {
    cle: 'recap',
    titre: 'Récapitulatif',
    ill: 'attestations',
    h: 'Tout est bon ?',
    p: 'Relisez avant de créer — chaque bloc se modifie d’un clic.',
  },
];
/** Maximum par commande appliqué aux produits qui n'ont pas le leur (Réglages → Commandes). */
function quantiteMaxDefautAffiche() {
  return (state.reglages && state.reglages.quantiteMaxDefaut) || 5;
}
function valeursInitialesProduit() {
  return {
    'cp-nom': '',
    'cp-icone': '',
    'cp-groupe': GROUPES_COMMANDE[0],
    'cp-prix-standard': '',
    'cp-prix-rn': '',
    'cp-prix-revente-max': '',
    'cp-stock': '0',
    'cp-quantite-max': '',
    'cp-message-rupture': '',
    'cp-systeme': '',
    'cp-ram': '',
    'cp-processeur': '',
    'cp-disque': '',
    'cp-donnees-mobiles': '',
    'cp-sms': '',
    'cp-appels': '',
    'cp-visible': true,
    'cp-sans-suivi': false,
    'cp-dematerialise': false,
    'cp-facturation-mensuelle': false,
    'cp-tectech-type': '',
    'cp-tectech-categorie': '',
  };
}
/** Recopie dans state.modal.v ce qui est saisi à l'étape affichée. */
function memoriserEtapeProduit() {
  const m = state.modal;
  if (!m || !m.v) return;
  document.querySelectorAll('.cpw [id^="cp-"]').forEach((el) => {
    if (!(el.id in m.v)) return;
    m.v[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  });
}
function categorieProduitCp(icone) {
  return {
    materiel: ['portable', 'fixe', 'telephone', 'tablette'].includes(icone),
    processeur: ['portable', 'fixe', 'telephone'].includes(icone),
    recharge: icone === 'recharge',
  };
}
function vueAssistantProduit() {
  const m = state.modal;
  if (!m.v) m.v = valeursInitialesProduit();
  if (m.etape == null) m.etape = 0;
  if (m.vues == null) m.vues = 0;
  const v = m.v,
    et = ETAPES_PRODUIT[m.etape],
    derniere = m.etape === ETAPES_PRODUIT.length - 1;
  const frise = ETAPES_PRODUIT.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-cpw-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = {
    categorie: etapeCpCategorie,
    prix: etapeCpPrix,
    caracteristiques: etapeCpCaracteristiques,
    comportement: etapeCpComportement,
    recap: etapeCpRecap,
  }[et.cle](v);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw ncw cpw" role="dialog" aria-modal="true" aria-labelledby="cpw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">Nouveau produit · étape ${m.etape + 1} sur ${ETAPES_PRODUIT.length}</div>
            <h2 class="csw-titre" id="cpw-titre">${v['cp-nom'].trim() ? echapper(v['cp-nom'].trim()) : 'Nouveau produit'}</h2>
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
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-cpw-precedent>← Précédent</button>' : ''}
          ${!derniere ? '<button type="button" class="btn btn-primary" data-cpw-suivant>Suivant →</button>' : '<button type="button" class="btn btn-primary" id="cp-enregistrer">Créer le produit</button>'}
        </div>
      </div>
    </div>`;
}
function etapeCpCategorie(v) {
  const cartes = ICONES_PRODUIT_OPTIONS.map(
    (o) => `
    <label class="csw-moyen cpw-cat${v['cp-icone'] === o.value ? ' choisi' : ''}">
      <input type="radio" name="cpw-icone" value="${echapper(o.value)}" ${v['cp-icone'] === o.value ? 'checked' : ''}>
      <span class="cpw-cat-ill" aria-hidden="true">${o.value ? illustrationProduitAdmin(o.label, o.value, 40) : `<span class="csw-type-ic">${icon('package', 18)}</span>`}</span>
      <span><b>${echapper(o.label)}</b>${o.value ? '' : '<small>D’après le nom du produit</small>'}</span>
      <span class="coche-choix-admin" aria-hidden="true">✓</span>
    </label>`,
  ).join('');
  return `
    <section class="csw-section">
      <h4>Nom</h4>
      <div class="field"><label for="cp-nom">Nom du produit *</label><input class="input" id="cp-nom" value="${echapper(v['cp-nom'])}" placeholder="Ex. Ordinateur portable 14″" autocomplete="off"></div>
    </section>
    <section class="csw-section">
      <h4>Catégorie</h4>
      <div class="cpw-cats" role="radiogroup" aria-label="Catégorie">${cartes}</div>
    </section>
    <section class="csw-section">
      <h4>Groupe de commande</h4>
      <div class="cpw-groupes" role="radiogroup" aria-label="Groupe de commande">
        ${GROUPES_COMMANDE.map((g) => `<label class="csw-option${v['cp-groupe'] === g ? ' choisi' : ''}"><input type="radio" name="cpw-groupe" value="${echapper(g)}" ${v['cp-groupe'] === g ? 'checked' : ''}><span class="csw-option-txt"><b>${echapper(g)}</b></span></label>`).join('')}
      </div>
    </section>`;
}
function etapeCpPrix(v) {
  return `
    <section class="csw-section">
      <h4>Prix</h4>
      <div class="csw-grille">
        <div class="field"><label for="cp-prix-standard">Prix standard (€) *</label><input class="input" id="cp-prix-standard" type="number" step="0.01" min="0" inputmode="decimal" value="${echapper(v['cp-prix-standard'])}"></div>
        <div class="field"><label for="cp-prix-rn">Prix Vente solidaire / RNum (€) *</label><input class="input" id="cp-prix-rn" type="number" step="0.01" min="0" inputmode="decimal" value="${echapper(v['cp-prix-rn'])}"></div>
        <div class="field"><label for="cp-prix-revente-max">Prix de revente maximal (€) <em>(facultatif)</em></label><input class="input" id="cp-prix-revente-max" type="number" step="0.01" min="0" inputmode="decimal" value="${echapper(v['cp-prix-revente-max'])}" placeholder="Pas de plafond"><small class="cpw-aide">Plafond du prix auquel une structure peut revendre l’appareil (ex. Relais Numériques).</small></div>
      </div>
    </section>
    <section class="csw-section">
      <h4>Stock</h4>
      <div class="csw-grille">
        <div class="field"><label for="cp-stock">Stock de départ *</label><input class="input" id="cp-stock" type="number" step="1" min="0" inputmode="numeric" value="${echapper(v['cp-stock'])}"></div>
        <div class="field"><label for="cp-message-rupture">Message si indisponible <em>(facultatif)</em></label><textarea class="input" id="cp-message-rupture" rows="2" placeholder="Ce produit est temporairement indisponible.">${echapper(v['cp-message-rupture'])}</textarea></div>
      </div>
    </section>
    <section class="csw-section">
      <h4>Commande</h4>
      <div class="csw-grille">
        <div class="field"><label for="cp-quantite-max">Quantité maximale par commande <em>(facultatif)</em></label><input class="input" id="cp-quantite-max" type="number" step="1" min="1" max="1000" inputmode="numeric" value="${echapper(v['cp-quantite-max'])}" placeholder="Par défaut : ${quantiteMaxDefautAffiche()}"><small class="cpw-aide">Vide = le réglage par défaut (Réglages → Commandes).</small></div>
      </div>
    </section>`;
}
function etapeCpCaracteristiques(v) {
  const c = categorieProduitCp(v['cp-icone']);
  if (!c.materiel && !c.recharge) {
    return `<div class="pk-etat"><span data-ill="vide" class="ill"></span>Rien à renseigner pour cette catégorie.<br><small style="opacity:.7">Système, RAM et disque concernent ordinateurs, smartphones et tablettes ; données et appels, les recharges.</small></div>`;
  }
  if (c.recharge) {
    return `<section class="csw-section"><h4>Forfait</h4><div class="csw-grille">
      <div class="field"><label for="cp-donnees-mobiles">Données mobiles</label>${selectAvecUnite('cp-donnees-mobiles', DONNEES_MOBILES_OPTIONS, 'Go', v['cp-donnees-mobiles'])}</div>
      <div class="field"><label for="cp-sms">SMS</label><input class="input" id="cp-sms" placeholder="Illimités" value="${echapper(v['cp-sms'])}"></div>
      <div class="field"><label for="cp-appels">Appels</label><input class="input" id="cp-appels" placeholder="Illimités" value="${echapper(v['cp-appels'])}"></div>
    </div></section>`;
  }
  return `<section class="csw-section"><h4>Fiche technique</h4><div class="csw-grille">
    <div class="field"><label for="cp-systeme">Système</label>${selectSimple('cp-systeme', SYSTEMES_OPTIONS, v['cp-systeme'])}</div>
    <div class="field"><label for="cp-ram">Mémoire (RAM)</label>${selectAvecUnite('cp-ram', RAM_OPTIONS, 'Go', v['cp-ram'])}</div>
    <div class="field"><label for="cp-disque">Stockage (disque)</label>${selectSimple('cp-disque', DISQUE_OPTIONS, v['cp-disque'])}</div>
    ${c.processeur ? `<div class="field"><label for="cp-processeur">Processeur</label><input class="input" id="cp-processeur" placeholder="Intel Core i5" value="${echapper(v['cp-processeur'])}"></div>` : ''}
  </div></section>`;
}
function etapeCpComportement(v) {
  const sw = (id, titre, aide) =>
    `<label class="rp-switch"><input type="checkbox" id="${id}" ${v[id] ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>${titre}</b><small>${aide}</small></span></label>`;
  return `
    <section class="csw-section">
      <div class="cp-effets">
        ${sw('cp-visible', 'Visible dans le formulaire de commande', 'Sinon, le produit reste en stock mais personne ne peut le commander.')}
        ${sw('cp-sans-suivi', 'Sans numéro de série ni personne', 'Carte SIM, accessoire… : aucun numéro exigé à la préparation, pas de passeport, pas de personne à renseigner.')}
        ${sw('cp-dematerialise', 'Dématérialisé', 'Recharge, code… : pas de livraison, des codes au lieu des numéros de série.')}
        ${sw('cp-facturation-mensuelle', 'Payé en fin de mois (facture mensuelle)', 'Regroupé chaque mois dans une facture par structure, envoyée automatiquement.')}
      </div>
    </section>
    <details class="csw-section cp-avance"${v['cp-tectech-type'] || v['cp-tectech-categorie'] ? ' open' : ''}><summary class="rp-surtitre">Synchronisation tec.tech (avancé)</summary>
      <div class="csw-grille">
        <div class="field"><label for="cp-tectech-type">Type tec.tech</label><select class="input" id="cp-tectech-type"><option value="">—</option>${TECTECH_TYPES.map((t) => `<option value="${t}" ${v['cp-tectech-type'] === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label for="cp-tectech-categorie">Catégorie tec.tech</label><select class="input" id="cp-tectech-categorie"><option value="">—</option>${TECTECH_CATEGORIES.map((c) => `<option value="${c}" ${v['cp-tectech-categorie'] === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
    </details>`;
}
function etapeCpRecap(v) {
  const c = categorieProduitCp(v['cp-icone']);
  const cat = (ICONES_PRODUIT_OPTIONS.find((o) => o.value === v['cp-icone']) || {}).label || '';
  const go = (x) => (x && /^\d+$/.test(x) ? `${x} Go` : x);
  const euros = (x) => (x === '' ? '' : formaterMontant(parseFloat(x) || 0));
  const oui = (b) => (b ? 'Oui' : 'Non');
  const bloc = (
    i,
    titre,
    lignes,
  ) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-cpw-aller="${i}">Modifier</button></div>
    ${lignes
      .filter((l) => l)
      .map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`)
      .join('')}</section>`;
  const tech = c.materiel
    ? [
        ['Système', v['cp-systeme']],
        ['RAM', go(v['cp-ram'])],
        ['Disque', v['cp-disque']],
        c.processeur ? ['Processeur', v['cp-processeur']] : null,
      ]
    : c.recharge
      ? [
          ['Données', go(v['cp-donnees-mobiles'])],
          ['SMS', v['cp-sms']],
          ['Appels', v['cp-appels']],
        ]
      : [['—', 'Rien pour cette catégorie']];
  return `<div class="csw-recap">
    <section class="csw-recap-bloc cpw-apercu"><span aria-hidden="true">${illustrationProduitAdmin(v['cp-nom'], v['cp-icone'], 56)}</span><div><b>${echapper(v['cp-nom'])}</b><small>${echapper(cat)} · ${echapper(v['cp-groupe'])}</small></div></section>
    ${bloc(0, 'Produit', [
      ['Nom', v['cp-nom']],
      ['Catégorie', cat],
      ['Groupe', v['cp-groupe']],
    ])}
    ${bloc(1, 'Prix et stock', [
      ['Prix standard', euros(v['cp-prix-standard'])],
      ['Prix RNum', euros(v['cp-prix-rn'])],
      ['Revente max.', v['cp-prix-revente-max'] ? euros(v['cp-prix-revente-max']) : 'Pas de plafond'],
      ['Stock', v['cp-stock']],
      ['Si indisponible', v['cp-message-rupture']],
      ['Max. par commande', v['cp-quantite-max'] || `Par défaut (${quantiteMaxDefautAffiche()})`],
    ])}
    ${bloc(2, 'Caractéristiques', tech)}
    ${bloc(3, 'Comportement', [
      ['Visible', oui(v['cp-visible'])],
      ['Sans n° de série ni personne', oui(v['cp-sans-suivi'])],
      ['Dématérialisé', oui(v['cp-dematerialise'])],
      ['Facture mensuelle', oui(v['cp-facturation-mensuelle'])],
    ])}
  </div>`;
}
function verifierEtapeProduit(i) {
  const v = state.modal.v,
    cle = ETAPES_PRODUIT[i].cle;
  if (cle === 'categorie') {
    const nom = v['cp-nom'].trim();
    if (!nom) return 'Le nom du produit est obligatoire.';
    if (state.produits.some((p) => String(p.nom).trim().toLowerCase() === nom.toLowerCase()))
      return 'Un produit porte déjà ce nom.';
  }
  if (cle === 'prix') {
    if (v['cp-prix-standard'] === '' || v['cp-prix-rn'] === '')
      return 'Les deux prix sont obligatoires (0 si gratuit).';
    if (v['cp-stock'] === '') return 'Indiquez le stock de départ (0 si aucun).';
    if ([v['cp-prix-standard'], v['cp-prix-rn'], v['cp-stock']].some((x) => parseFloat(x) < 0))
      return 'Les prix et le stock ne peuvent pas être négatifs.';
    const qm = String(v['cp-quantite-max'] || '').trim();
    if (qm && !(parseInt(qm, 10) >= 1 && parseInt(qm, 10) <= 1000))
      return 'La quantité maximale doit être entre 1 et 1000 (ou vide).';
  }
  return '';
}
function allerEtapeProduit(cible) {
  const m = state.modal;
  memoriserEtapeProduit();
  if (cible > m.etape) {
    for (let i = m.etape; i < cible; i++) {
      const err = verifierEtapeProduit(i);
      if (err) {
        m.etape = i;
        render();
        $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
        return;
      }
    }
  }
  m.etape = Math.max(0, Math.min(ETAPES_PRODUIT.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps');
  if (corps) corps.scrollTop = 0;
  const premier = document.querySelector(
    '.cpw .csw-corps input:not([type=radio]):not([type=checkbox]), .cpw .csw-corps select',
  );
  if (premier && m.etape < ETAPES_PRODUIT.length - 1) premier.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-produit' || !m.v) return;
  const aller = e.target.closest('[data-cpw-aller]');
  if (aller) {
    allerEtapeProduit(parseInt(aller.dataset.cpwAller, 10));
    return;
  }
  if (e.target.closest('[data-cpw-suivant]')) {
    allerEtapeProduit(m.etape + 1);
    return;
  }
  if (e.target.closest('[data-cpw-precedent]')) {
    allerEtapeProduit(m.etape - 1);
    return;
  }
});
document.addEventListener('change', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-produit' || !m.v) return;
  const el = e.target;
  if (el.name === 'cpw-icone' || el.name === 'cpw-groupe') {
    memoriserEtapeProduit();
    m.v[el.name === 'cpw-icone' ? 'cp-icone' : 'cp-groupe'] = el.value;
    document
      .querySelectorAll(`input[name="${el.name}"]`)
      .forEach((r) => r.closest('label').classList.toggle('choisi', r.checked));
  }
});
document.addEventListener('keydown', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-produit' || !m.v || e.key !== 'Enter') return;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
  if (m.etape < ETAPES_PRODUIT.length - 1) {
    e.preventDefault();
    allerEtapeProduit(m.etape + 1);
  }
});

function vueCreerProduit() {
  const ligne = state.modal.ligne;
  if (!ligne) return vueAssistantProduit();
  const p = ligne ? state.produits.find((x) => x.ligne === ligne) : null;
  const icone = p ? p.icone : '';
  const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(icone);
  const estTablette = icone === 'tablette';
  const estRecharge = icone === 'recharge';
  return dialogShell(
    p ? `Modifier ${p.nom}` : 'Nouveau produit',
    `
    <div class="cp-section"><div class="rp-surtitre">Produit</div>
    ${champ('Nom *', `<input class="input" id="cp-nom" value="${p ? echapper(p.nom) : ''}">`)}
    ${champ('Icône (détermine la catégorie et les caractéristiques ci-dessous)', `<select class="input" id="cp-icone">${ICONES_PRODUIT_OPTIONS.map((o) => `<option value="${o.value}" ${p && p.icone === o.value ? 'selected' : ''}>${echapper(o.label)}</option>`).join('')}</select>`)}
    ${champ('Groupe de commande *', `<select class="input" id="cp-groupe">${GROUPES_COMMANDE.map((g) => `<option value="${echapper(g)}" ${p && p.groupe === g ? 'selected' : ''}>${echapper(g)}</option>`).join('')}</select>`)}
    </div>
    <div class="cp-section"><div class="rp-surtitre">Prix et stock</div>
    <div class="cp-grille2">
    ${champ('Prix standard (€) *', `<input class="input" id="cp-prix-standard" type="number" step="0.01" value="${p ? echapper(p.prixStandard) : ''}">`)}
    ${champ('Prix Vente solidaire / RNum (€) *', `<input class="input" id="cp-prix-rn" type="number" step="0.01" value="${p ? echapper(p.prixRN) : ''}">`)}
    <div class="field" style="margin-top:var(--space-2)"><label for="cp-prix-revente-max">Prix de revente maximal (€) <em style="font-weight:400">— ex. Relais Numériques, facultatif</em></label>
      <input class="input" id="cp-prix-revente-max" type="number" step="0.01" min="0" value="${p && p.prixReventeMax != null ? echapper(p.prixReventeMax) : ''}" placeholder="Pas de plafond">
      <p style="margin:4px 0 0;font-size:12px;opacity:.65">Plafond du prix auquel une structure peut revendre cet appareil à la personne accompagnée (tarifs de revente dans sa flotte).</p></div>
    </div>
    ${champ('Stock *', `<input class="input" id="cp-stock" type="number" step="1" value="${p ? echapper(p.stock) : ''}">`)}
    ${champ(`Quantité maximale par commande (vide = par défaut : ${quantiteMaxDefautAffiche()})`, `<input class="input" id="cp-quantite-max" type="number" step="1" min="1" max="1000" value="${p && p.quantiteMax ? echapper(p.quantiteMax) : ''}" placeholder="Par défaut">`)}
    ${champ("Message d'indisponibilité", `<textarea class="input" id="cp-message-rupture" rows="2" placeholder="Ce produit est temporairement indisponible.">${p ? echapper(p.messageRupture || '') : ''}</textarea>`)}
    </div>
    <div class="cp-section"><div class="rp-surtitre">Caractéristiques</div>
    <div id="cp-tech-materiel" style="display:${estOrdiOuTelephone || estTablette ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:var(--space-3)">
      ${champ('Système', selectSimple('cp-systeme', SYSTEMES_OPTIONS, p ? p.systeme : ''))}
      ${champ('RAM', selectAvecUnite('cp-ram', RAM_OPTIONS, 'Go', p ? p.ram : ''))}
      <div id="cp-champ-processeur" style="display:${estOrdiOuTelephone ? 'block' : 'none'}">
        ${champ('Processeur', `<input class="input" id="cp-processeur" placeholder="Intel Core i5" value="${p ? echapper(p.processeur || '') : ''}">`)}
      </div>
      ${champ('Disque', selectSimple('cp-disque', DISQUE_OPTIONS, p ? p.disque : ''))}
    </div>
    <div id="cp-tech-recharge" style="display:${estRecharge ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:var(--space-3)">
      ${champ('Données mobiles', selectAvecUnite('cp-donnees-mobiles', DONNEES_MOBILES_OPTIONS, 'Go', p ? p.donneesMobiles : ''))}
      ${champ('SMS', `<input class="input" id="cp-sms" placeholder="Illimités" value="${p ? echapper(p.sms || '') : ''}">`)}
      ${champ('Appels', `<input class="input" id="cp-appels" placeholder="Illimités" value="${p ? echapper(p.appels || '') : ''}">`)}
    </div>
    <p style="font-size:11.5px;opacity:0.55;margin:2px 0 0">Système/RAM/disque : ordinateur, smartphone ou tablette (processeur en plus pour ordinateur et smartphone). Données mobiles/SMS/appels : recharge uniquement. Rien pour les autres catégories.</p>
    </div>
    <div class="cp-section"><div class="rp-surtitre">Comportement dans une commande</div>
    <div class="cp-effets">
      <label class="rp-switch"><input type="checkbox" id="cp-visible" ${!p || p.visible ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Visible dans le formulaire de commande</b><small>Sinon, le produit reste en stock mais personne ne peut le commander.</small></span></label>
      <label class="rp-switch"><input type="checkbox" id="cp-sans-suivi" ${p && p.sansPersonne && p.exclureDuPasseport ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Sans numéro de série ni personne</b><small>Carte SIM, accessoire… : aucun numéro exigé à la préparation, pas de passeport, pas de personne à renseigner.</small></span></label>
      <label class="rp-switch"><input type="checkbox" id="cp-dematerialise" ${p && p.dematerialise ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Dématérialisé</b><small>Recharge, code… : pas de livraison, des codes au lieu des numéros de série ; la commande peut passer de « Préparée » à « Livrée ».</small></span></label>
      <label class="rp-switch"><input type="checkbox" id="cp-facturation-mensuelle" ${p && p.facturationMensuelle ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Payé en fin de mois (facture mensuelle)</b><small>Recharges… : jamais sur la facture de la commande ; regroupé chaque mois dans une facture par structure, envoyée automatiquement par mail.</small></span></label>
    </div>
    </div>
    <details class="cp-section cp-avance"><summary class="rp-surtitre">Synchronisation tec.tech (avancé)</summary>
    <div class="cp-grille2">
    ${champ('Type tec.tech', `<select class="input" id="cp-tectech-type"><option value="">—</option>${TECTECH_TYPES.map((t) => `<option value="${t}" ${p && p.tectechType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
    ${champ('Catégorie tec.tech', `<select class="input" id="cp-tectech-categorie"><option value="">—</option>${TECTECH_CATEGORIES.map((c) => `<option value="${c}" ${p && p.tectechCategorie === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}
    </div>
    </details>
  `,
    'cp-enregistrer',
    p
      ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-produit="${p.ligne}" data-nom-produit="${echapper(p.nom)}">Supprimer</button>`
      : null,
  );
}
async function synchroniserStockTecTech() {
  etat('Synchronisation tec.tech…', 'chargement');
  try {
    const r = await poster({ action: 'stock-synchroniser-tectech' });
    if (r.ok) {
      state.produits = r.produits || state.produits;
      etat('Synchronisation terminée', 'succes');
      state.modal = { kind: 'tectech-resultats', resultats: r.resultats || [] };
      render();
    } else {
      etat(r.erreur || 'Synchronisation impossible', 'erreur');
    }
  } catch (e) {
    etat('Synchronisation impossible', 'erreur');
  }
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-synchroniser-tectech')) synchroniserStockTecTech();
});

async function supprimerProduitAction(ligne) {
  const r = await posterEtat({ action: 'produit-supprimer', ligne }, 'Suppression…', 'Produit supprimé');
  if (r.ok) {
    const rp = await jsonp({ action: 'produits', password: motDePasse });
    if (rp.ok) state.produits = rp.produits;
    state.modal = null;
    render();
  }
}
async function supprimerStructureAction(ligne) {
  const r = await posterEtat({ action: 'structure-delete', ligne }, 'Suppression…', 'Structure supprimée');
  if (r.ok) {
    const rst = await jsonp({ action: 'structures', password: motDePasse });
    if (rst.ok) state.structures = rst.structures.slice().sort((a, b) => b.ligne - a.ligne);
    state.modal = null;
    render();
  }
}
async function enregistrerProduit() {
  const ligne = state.modal.ligne;
  // Assistant (nouveau produit) : les valeurs viennent de state.modal.v, pas des champs
  // (seule l'étape affichée est dans la page). Formulaire complet (modification) : les champs.
  const assistant = !ligne && state.modal.v;
  if (assistant) {
    for (let i = 0; i < ETAPES_PRODUIT.length - 1; i++) {
      const err = verifierEtapeProduit(i);
      if (err) {
        state.modal.etape = i;
        render();
        $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
        return;
      }
    }
  }
  const lire = (id) => (assistant ? String(state.modal.v[id] == null ? '' : state.modal.v[id]) : $(id).value);
  const coche = (id) => (assistant ? !!state.modal.v[id] : $(id).checked);
  const nom = lire('cp-nom').trim();
  const prixStandard = lire('cp-prix-standard'),
    prixRN = lire('cp-prix-rn'),
    stock = lire('cp-stock');
  if (!nom || prixStandard === '' || prixRN === '' || stock === '') {
    $('rp-retour-modale').innerHTML =
      '<div class="msg msg-erreur">Nom, prix standard, prix RNum et stock sont obligatoires.</div>';
    return;
  }
  {
    const b = $('cp-enregistrer');
    if (b) b.disabled = true;
  }
  // Le toggle "sans suivi" pilote deux drapeaux (nominatif, passeport) — le troisième (sans
  // numéro de série) est forcé à faux si le produit est dématérialisé : un code reste requis
  // par unité dans ce cas (voir "Codes" à l'étape Validée), même si l'ancien toggle "sans
  // suivi" est aussi coché sur ce produit (ex. une recharge qui avait déjà ce toggle avant
  // l'ajout du concept "dématérialisé").
  const sansSuivi = coche('cp-sans-suivi');
  const dematerialise = coche('cp-dematerialise');
  // Système/RAM/disque : ordinateur, smartphone ou tablette. Processeur : ordinateur/smartphone
  // uniquement (pas tablette). Données mobiles/SMS/appels : recharge uniquement. Ailleurs, tout
  // est envoyé vide plutôt que de garder ce qui traîne dans des champs masqués (utile si le
  // produit change de catégorie). RAM et données mobiles arrivent en nombre nu depuis leur
  // <select> — le "Go" est rajouté ici, pas dans le formulaire.
  const icone = lire('cp-icone');
  const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(icone);
  const estTablette = icone === 'tablette';
  const estMaterielTechnique = estOrdiOuTelephone || estTablette;
  const estRecharge = icone === 'recharge';
  const avecGo = (valeur) => (valeur && /^\d+$/.test(valeur) ? `${valeur} Go` : valeur);
  const champsCommuns = {
    nom,
    prixStandard,
    prixRN,
    stock,
    icone,
    prixReventeMax: lire('cp-prix-revente-max').trim(),
    quantiteMax: lire('cp-quantite-max').trim(),
    visible: coche('cp-visible'),
    sansPersonne: sansSuivi,
    exclureDuPasseport: sansSuivi,
    sansNumeroSerie: sansSuivi && !dematerialise,
    groupe: lire('cp-groupe'),
    tectechType: lire('cp-tectech-type'),
    tectechCategorie: lire('cp-tectech-categorie'),
    dematerialise,
    messageRupture: lire('cp-message-rupture').trim(),
    facturationMensuelle: coche('cp-facturation-mensuelle'),
    systeme: estMaterielTechnique ? lire('cp-systeme').trim() : '',
    ram: estMaterielTechnique ? avecGo(lire('cp-ram').trim()) : '',
    processeur: estOrdiOuTelephone ? lire('cp-processeur').trim() : '',
    disque: estMaterielTechnique ? lire('cp-disque').trim() : '',
    donneesMobiles: estRecharge ? avecGo(lire('cp-donnees-mobiles').trim()) : '',
    sms: estRecharge ? lire('cp-sms').trim() : '',
    appels: estRecharge ? lire('cp-appels').trim() : '',
  };
  try {
    etat(ligne ? 'Enregistrement…' : 'Création…', 'chargement');
    let ok, reponses, r;
    if (ligne) {
      // Chaque appel est isolé dans son propre catch : sans ça, un seul des ~20 champs qui
      // renvoie une réponse invalide (erreur réseau, réponse HTML au lieu de JSON...) fait
      // rejeter tout le Promise.all d'un coup — alors que les autres appels, déjà partis, ont
      // très bien pu réussir côté serveur entre-temps. D'où l'impression contradictoire
      // "erreur interne" à l'écran alors que le reste s'enregistre bel et bien.
      reponses = await Promise.all(
        Object.keys(champsCommuns).map((c) =>
          poster({ action: 'produit-update', ligne, champ: c, valeur: champsCommuns[c] })
            .then((res) => ({ ...res, champ: c }))
            .catch((err) => ({
              ok: false,
              champ: c,
              erreur: err && err.message ? `${c} : ${err.message}` : `${c} : erreur réseau`,
            })),
        ),
      );
      // "Champ non modifiable" = le back ne connaît pas encore cette colonne (front redéployé
      // avant le back, par ex. juste après l'ajout d'un nouveau champ) — pas une vraie erreur
      // d'enregistrement, tous les AUTRES champs de cette même sauvegarde ont bien été écrits.
      // Sans cette distinction, un seul champ "en avance" faisait échouer tout l'enregistrement
      // aux yeux de l'utilisateur alors que le reste avait bien été pris en compte.
      const echecsReels = reponses.filter((x) => !x.ok && x.erreur !== 'Champ non modifiable');
      ok = echecsReels.length === 0;
    } else {
      r = await poster({
        // Tous les champs saisis sont envoyés dès la création (RAM, disque, système, message de
        // rupture… étaient auparavant remis à vide ici : ils n'apparaissaient qu'après une
        // seconde modification du produit).
        action: 'produit-create',
        ...champsCommuns,
        structureDediee: '',
      });
      ok = r.ok;
    }
    if (ok) {
      etat(ligne ? 'Produit mis à jour' : 'Produit créé', 'succes');
      const rp = await jsonp({ action: 'produits', password: motDePasse });
      if (rp.ok) state.produits = rp.produits;
      // Les commandes déjà chargées portent des champs calculés à partir de la config produit du
      // moment (dematerialisee, quantiteAvecNumeroSerie) — sans ce rafraîchissement, corriger un
      // toggle produit (ex. "dématérialisé") pendant que l'onglet Commandes est déjà ouvert
      // laissait ces commandes figées sur l'ancienne config : l'étape de saisie affichait "aucun
      // code requis" au lieu du champ Codes, jusqu'au prochain rechargement complet de la page.
      if (ligne) {
        const rc = await jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' });
        if (rc.ok) state.commandes = rc.commandes;
      }
      state.modal = null;
      render();
    } else {
      const echecTrouve = ligne ? reponses.find((x) => !x.ok && x.erreur !== 'Champ non modifiable') : null;
      const messageErreur = ligne ? (echecTrouve ? `${echecTrouve.champ} : ${echecTrouve.erreur}` : null) : r.erreur;
      etat(messageErreur || 'Enregistrement impossible', 'erreur');
      $('rp-retour-modale').innerHTML =
        `<div class="msg msg-erreur">${echapper(messageErreur || 'Enregistrement impossible.')}</div>`;
      $('cp-enregistrer').disabled = false;
    }
  } catch (e) {
    console.error('enregistrerProduit', e);
    etat('Enregistrement impossible', 'erreur');
    $('rp-retour-modale').innerHTML =
      `<div class="msg msg-erreur">Enregistrement impossible — ${echapper(e.message || 'erreur inconnue')}.</div>`;
    $('cp-enregistrer').disabled = false;
  }
}

/* ============================================================
   Devis / Facture directs, depuis une commande existante
   ============================================================ */
