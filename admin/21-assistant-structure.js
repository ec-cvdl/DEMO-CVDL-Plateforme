/* Admin CVDL — assistant création / modification de structure. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ════════════════════════════════════════════════════════════════════════════════════
   Création / modification d'une structure — assistant en étapes
   Une étape à la fois (type → identité → contacts → commandes & paiement → options →
   récapitulatif), avec les explications là où la décision se prend (type, moyens de
   paiement, dépôt-vente). Les saisies vivent dans state.modal.v : on peut revenir en
   arrière, ouvrir l'aide des types, changer d'étape sans rien perdre.
   En modification, toutes les étapes sont accessibles directement et « Enregistrer » reste
   disponible partout ; en création, on avance étape par étape (vérification à chaque pas).
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_STRUCTURE = [
  {
    cle: 'type',
    titre: 'Type',
    ill: 'structures',
    h: 'Quel type de structure ?',
    p: 'Le type décide du tarif appliqué, du paiement et des documents (devis, facture, attestations). Un seul type par structure.',
  },
  {
    cle: 'identite',
    titre: 'Identité',
    ill: 'cle',
    h: 'Qui est-elle ?',
    p: 'Son nom, son code d’accès au portail et ses repères administratifs.',
  },
  {
    cle: 'contacts',
    titre: 'Contacts',
    ill: 'personne',
    h: 'Qui contacter ?',
    p: 'Le responsable habituel reçoit les échanges courants ; la facturation peut être adressée à quelqu’un d’autre.',
  },
  {
    cle: 'commande',
    titre: 'Commandes & paiement',
    ill: 'commander',
    h: 'Comment commande-t-elle ?',
    p: 'Ce qu’elle peut commander et comment ses commandes sont réglées.',
  },
  {
    cle: 'options',
    titre: 'Options',
    ill: 'flotte',
    h: 'Options',
    p: 'Dépôt-vente et convention : facultatif, modifiable à tout moment.',
  },
  {
    cle: 'recap',
    titre: 'Récapitulatif',
    ill: 'attestations',
    h: 'Tout est bon ?',
    p: 'Relisez avant d’enregistrer — chaque bloc se modifie d’un clic.',
  },
];
const DETAILS_TYPE_STRUCTURE = {
  rn: {
    ic: 'receipt',
    points: [
      'Tarif Relais Numérique',
      'Paiement par virement, imposé',
      'Devis puis facture à chaque commande',
      'Rapprochement comptable',
    ],
  },
  projets: {
    ic: 'clipboard',
    points: [
      'Prix masqués pour la structure',
      'Paiement fixé par l’équipe',
      'Facture émise',
      'Flotte gérée dans la plateforme',
    ],
  },
  bo: {
    ic: 'file',
    points: [
      'Personnes nominatives et attestations',
      'Jamais de devis ni de facture',
      'Moyens de paiement au choix (étape 4)',
    ],
  },
  interne: {
    ic: 'building',
    points: [
      'Aucun paiement, aucune facture',
      'Flotte gérée dans la plateforme',
      'Crée ses propres structures partenaires (Vente solidaire)',
    ],
  },
  esn: { ic: 'package', points: ['Aucun paiement, aucune facture', 'Quantités ESN', 'Prix masqués'] },
};
const AIDE_MOYENS_PAIEMENT = {
  'Paiement en ligne (CB)': {
    ic: 'receipt',
    txt: 'Un lien de paiement est envoyé : la personne règle par carte, avec son smartphone et l’application de sa banque (double authentification).',
  },
  Chèque: { ic: 'file', txt: 'Chèque remis à la structure, qui le transmet — le rapprochement se fait à réception.' },
  Espèces: { ic: 'package', txt: 'Réglé en espèces auprès de la structure, qui reverse ensuite le montant.' },
  'Comptoir solidaire': {
    ic: 'building',
    txt: 'Paiement en direct au comptoir solidaire du partenaire (propre aux structures Vente solidaire).',
  },
};
/** Pictogrammes des moyens de paiement — les mêmes que les cartes du formulaire de commande du portail. */
function iconeMoyenPaiementAdmin(m, t) {
  const x = String(m || '').toLowerCase();
  const d =
    x.includes('chèque') || x.includes('cheque')
      ? '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M6 16h4"/><path d="M14 16h4"/>'
      : x.includes('espèce') || x.includes('espece')
        ? '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>'
        : x.includes('virement')
          ? '<path d="M3 10h18M5 10v9M9 10v9M15 10v9M19 10v9M2 20h20M12 3l9 5H3z"/>'
          : x.includes('comptoir')
            ? '<path d="M3 9 5 4h14l2 5"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9v10h14V9"/><path d="M9 19v-4a3 3 0 0 1 6 0v4"/>'
            : '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>';
  return `<svg viewBox="0 0 24 24" width="${t || 18}" height="${t || 18}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
const ALPHABET_CODE_STRUCTURE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (0/O, 1/I/l)
function genererCodeStructure() {
  const groupe = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((o) => ALPHABET_CODE_STRUCTURE[o % ALPHABET_CODE_STRUCTURE.length])
      .join('');
  return `${groupe()}-${groupe()}-${groupe()}-${groupe()}`;
}
/** Robustesse d'un code saisi librement (le serveur refuse moins de 12 caractères). */
function robustesseCode(code) {
  const c = String(code || '');
  if (!c) return null;
  const familles = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((r) => r.test(c)).length;
  if (c.length >= 14 && familles >= 2) return { niveau: 'fort', txt: 'Code robuste.' };
  if (c.length >= 12 && familles >= 2)
    return { niveau: 'moyen', txt: 'Correct, mais un code généré (16 caractères aléatoires) est plus sûr.' };
  return {
    niveau: 'faible',
    txt:
      c.length < 12
        ? 'Code refusé : 12 caractères minimum (lettres, chiffres, tirets). Mieux vaut le générer.'
        : 'Code facile à deviner : quiconque le trouve peut commander au nom de la structure. Mieux vaut le générer.',
  };
}
/** Équipe Google d'une structure, telle qu'elle se saisit : « a@x.org (responsable), … ». */
const texteEquipe = (s) => ((s && s.equipe) || []).map((m) => `${m.email} (${m.role})`).join(', ');
/** Valeurs de départ de l'assistant (structure existante, ou vide). */
function valeursInitialesStructure(s) {
  const resp = separerResponsable(s ? s.responsable : '');
  const respF = separerResponsable(s ? s.responsableFacturation : '');
  const groupes = String((s && s.groupesCommande) || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    type: s ? s.type : '',
    codeMode: 'generer',
    code: s ? '' : genererCodeStructure(),
    nouveauCode: '',
    nom: s ? s.nom || '' : '',
    siret: s ? s.siret || '' : '',
    categorie: s ? s.categorie || '' : '',
    region: s ? s.region || '' : '',
    responsablePrenom: resp.prenom,
    responsableNom: resp.nom,
    email: s ? s.email || '' : '',
    telephone: s ? s.telephone || '' : '',
    adresse: s ? s.adresse || '' : '',
    respFactPrenom: respF.prenom,
    respFactNom: respF.nom,
    emailFacturation: s ? s.emailFacturation || '' : '',
    groupesMode: !groupes.length ? 'tout' : groupes.length > 1 ? 'mixte' : groupes[0],
    groupes,
    moyensPaiement: String((s && s.moyensPaiement) || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    typePublic: s ? s.typePublic || '' : '',
    programmes: String((s && s.programmes) || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    depotVente: !!(s && s.depotVente),
    lienConvention: s ? s.lienConvention || '' : '',
    comptesGoogle: texteEquipe(s),
    facturationDepotVente: s && s.facturationDepotVente === 'chaque-vente' ? 'chaque-vente' : 'aucune',
  };
}
function vueCreerStructure() {
  const m = state.modal;
  const s = m.id ? state.structures.find((x) => x.id === m.id) : null;
  if (!m.v) m.v = valeursInitialesStructure(s);
  if (m.etape == null) m.etape = 0;
  if (m.vues == null) m.vues = s ? ETAPES_STRUCTURE.length - 1 : 0;
  const v = m.v;
  const et = ETAPES_STRUCTURE[m.etape];
  const derniere = m.etape === ETAPES_STRUCTURE.length - 1;
  const frise = ETAPES_STRUCTURE.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-cs-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = {
    type: etapeStructureType,
    identite: etapeStructureIdentite,
    contacts: etapeStructureContacts,
    commande: etapeStructureCommande,
    options: etapeStructureOptions,
    recap: etapeStructureRecap,
  }[et.cle](v, s);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw" role="dialog" aria-modal="true" aria-labelledby="csw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">${s ? 'Modifier la structure' : 'Nouvelle structure'} · étape ${m.etape + 1} sur ${ETAPES_STRUCTURE.length}</div>
            <h2 class="csw-titre" id="csw-titre">${s ? echapper(s.nom) : v.nom ? echapper(v.nom) : 'Nouvelle structure'}</h2>
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
          ${s ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-structure="${s.id}" data-nom-structure="${echapper(s.nom)}">Supprimer</button>` : ''}
          <span style="flex:1"></span>
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-cs-precedent>← Précédent</button>' : ''}
          ${!derniere ? `<button type="button" class="btn ${s ? 'btn-secondary' : 'btn-primary'}" data-cs-suivant>Suivant →</button>` : ''}
          ${s || derniere ? `<button type="button" class="btn btn-primary" id="cs-enregistrer">${s ? 'Enregistrer' : 'Créer la structure'}</button>` : ''}
        </div>
      </div>
    </div>`;
}
/** Types ouverts au lancement (Réglages → Périmètre), plus le type actuel d'une structure modifiée. */
function typesProposes(s) {
  const actifs = String((state.reglages && state.reglages.typesActifs) || 'rn,interne,bo').split(',');
  return TYPES_STRUCTURE.filter((t) => actifs.includes(t.cle) || (s && s.type === t.cle));
}
function etapeStructureType(v, s) {
  return `
    ${s && !s.type ? '<div class="msg msg-warn">Type à définir : choisissez le type de cette structure.</div>' : ''}
    ${s && v.type && s.type && v.type !== s.type ? '<div class="msg msg-warn">Changer le type modifie le tarif et la facturation des prochaines commandes de cette structure (les commandes passées ne changent pas).</div>' : ''}
    <div class="csw-types" role="radiogroup" aria-label="Type de structure">
      ${typesProposes(s)
        .map((t) => {
          const d = DETAILS_TYPE_STRUCTURE[t.cle] || { ic: 'building', points: [] };
          return `
      <label class="csw-type${v.type === t.cle ? ' choisi' : ''}">
        <input type="radio" name="cs-type" value="${t.cle}" ${v.type === t.cle ? 'checked' : ''}>
        <span class="csw-type-ic" aria-hidden="true">${icon(d.ic, 20)}</span>
        <span class="csw-type-txt"><b>${echapper(t.libelle)}</b><ul>${d.points.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul></span>
        <span class="coche-choix-admin" aria-hidden="true">✓</span>
      </label>`;
        })
        .join('')}
    </div>`;
}
function etapeStructureIdentite(v, s) {
  const force = robustesseCode(v.codeMode === 'libre' ? v.code : '');
  const blocCode = s
    ? `<div class="field"><label>Code d’accès</label>
        <div class="csw-code-actuel"><span class="pk-sn">${state.revealedCodes[s.id] ? echapper(s.code) : '••••••••••'}</span>
          <button type="button" class="btn btn-ghost btn-icon" style="width:28px;height:28px" data-reveal-code="${s.id}" aria-label="Afficher le code">${icon(state.revealedCodes[s.id] ? 'eyeoff' : 'eye', 15)}</button>
          <button type="button" class="btn btn-secondary" data-regenerer-code-structure="${s.id}">Régénérer</button></div>
        <label class="csw-sous-champ" for="cs-nouveau-code">Ou choisir un nouveau code <em>(l’ancien cessera de fonctionner)</em></label>
        <input class="input" id="cs-nouveau-code" data-cs="nouveauCode" autocomplete="off" value="${echapper(v.nouveauCode)}" placeholder="Laisser vide pour garder le code actuel">
        ${
          v.nouveauCode
            ? (() => {
                const f = robustesseCode(v.nouveauCode);
                return `<div class="csw-force ${f.niveau}"><i></i>${echapper(f.txt)}</div>`;
              })()
            : ''
        }
      </div>`
    : `<div class="field"><label>Code d’accès au portail *</label>
        <div class="csw-seg" role="radiogroup" aria-label="Mode de choix du code">
          <label class="${v.codeMode === 'generer' ? 'on' : ''}"><input type="radio" name="cs-code-mode" value="generer" ${v.codeMode === 'generer' ? 'checked' : ''}>Générer un code <em>recommandé</em></label>
          <label class="${v.codeMode === 'libre' ? 'on' : ''}"><input type="radio" name="cs-code-mode" value="libre" ${v.codeMode === 'libre' ? 'checked' : ''}>Choisir mon code</label>
        </div>
        ${
          v.codeMode === 'generer'
            ? `<div class="csw-code-actuel"><span class="pk-sn" id="cs-code-affiche">${echapper(v.code)}</span><button type="button" class="btn btn-secondary" data-generer-code-structure>${icon('refresh', 14)}Un autre</button></div>
             <p class="csw-aide">16 caractères aléatoires, sans lettres ambiguës : impossible à deviner. C’est ce code que la structure saisira sur le portail.</p>`
            : `<input class="input" id="cs-code" data-cs="code" autocomplete="off" value="${echapper(v.code)}" placeholder="Ex : un mot de passe facile à transmettre">
             ${force ? `<div class="csw-force ${force.niveau}"><i></i>${echapper(force.txt)}</div>` : '<p class="csw-aide">Pour la sécurité, un code généré reste préférable : ce code suffit pour commander au nom de la structure.</p>'}`
        }
      </div>`;
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label for="cs-nom">Nom de la structure *</label><input class="input" id="cs-nom" data-cs="nom" value="${echapper(v.nom)}" placeholder="Ex : Épicerie solidaire du Loiret"></div>
      <div class="csw-large">${blocCode}</div>
      <div class="field"><label for="cs-siret">SIRET <em>(14 chiffres, facultatif)</em></label><input class="input" id="cs-siret" data-cs="siret" inputmode="numeric" maxlength="17" placeholder="123 456 789 00012" value="${echapper(v.siret)}"></div>
      <div class="field"><label for="cs-categorie">Catégorie</label><select class="input" id="cs-categorie" data-cs="categorie"><option value="">—</option>${CATEGORIES_STRUCTURE.map((c) => `<option value="${echapper(c)}" ${v.categorie === c ? 'selected' : ''}>${echapper(c)}</option>`).join('')}</select></div>
      <div class="field csw-large"><label for="cs-region">Région analytique <em>(territoire EC, pour ventiler l’activité)</em></label><select class="input" id="cs-region" data-cs="region"><option value="">—</option>${[...REGIONS_ANALYTIQUE, ...(v.region && !REGIONS_ANALYTIQUE.includes(v.region) ? [v.region] : [])].map((r) => `<option value="${echapper(r)}" ${v.region === r ? 'selected' : ''}>${echapper(r)}</option>`).join('')}</select></div>
    </div>`;
}
function etapeStructureContacts(v) {
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label>Responsable habituel *</label><div class="csw-deux">
        <input class="input" id="cs-responsable-prenom" data-cs="responsablePrenom" placeholder="Prénom" value="${echapper(v.responsablePrenom)}">
        <input class="input" id="cs-responsable-nom" data-cs="responsableNom" placeholder="NOM" value="${echapper(v.responsableNom)}"></div></div>
      <div class="field"><label for="cs-email">E-mail</label><input class="input" id="cs-email" data-cs="email" type="email" value="${echapper(v.email)}" placeholder="contact@structure.fr"></div>
      <div class="field"><label for="cs-tel">Téléphone</label><input class="input" id="cs-tel" data-cs="telephone" value="${echapper(v.telephone)}" placeholder="02 38 00 00 00"></div>
      <div class="field csw-large"><label for="cs-adresse">Adresse</label><textarea class="input" id="cs-adresse" data-cs="adresse" rows="2">${echapper(v.adresse)}</textarea></div>
      <div class="field csw-large"><label>Responsable facturation <em>(si différent du responsable habituel)</em></label><div class="csw-deux">
        <input class="input" id="cs-responsable-facturation-prenom" data-cs="respFactPrenom" placeholder="Prénom" value="${echapper(v.respFactPrenom)}">
        <input class="input" id="cs-responsable-facturation-nom" data-cs="respFactNom" placeholder="NOM" value="${echapper(v.respFactNom)}"></div></div>
      <div class="field csw-large"><label for="cs-email-facturation">E-mail de facturation <em>(si différent)</em></label><input class="input" id="cs-email-facturation" data-cs="emailFacturation" type="email" value="${echapper(v.emailFacturation)}"></div>
    </div>`;
}
function etapeStructureCommande(v) {
  const t = v.type;
  const info = (ic, titre, txt) =>
    `<div class="csw-info"><span class="csw-type-ic">${ic === '__virement' ? iconeMoyenPaiementAdmin('Virement', 20) : icon(ic, 18)}</span><span><b>${titre}</b><small>${txt}</small></span></div>`;
  const paiement =
    t === 'bo'
      ? `<div class="csw-moyens">${MOYENS_PAIEMENT_STRUCTURE.map((mp) => {
          const a = AIDE_MOYENS_PAIEMENT[mp] || { ic: 'receipt', txt: '' };
          const on = v.moyensPaiement.includes(mp);
          return `
        <label class="csw-moyen${on ? ' choisi' : ''}"><input type="checkbox" class="cs-paiement-case" value="${echapper(mp)}" ${on ? 'checked' : ''}>
          <span class="csw-type-ic">${iconeMoyenPaiementAdmin(mp, 20)}</span><span><b>${echapper(mp)}</b><small>${echapper(a.txt)}</small></span><span class="coche-choix-admin" aria-hidden="true">✓</span></label>`;
        }).join('')}</div>
       <p class="csw-aide">${v.moyensPaiement.length ? `${v.moyensPaiement.length} moyen${v.moyensPaiement.length > 1 ? 's' : ''} proposé${v.moyensPaiement.length > 1 ? 's' : ''} à la structure au moment de commander.` : 'Aucune case cochée : les 4 moyens seront proposés.'}</p>`
      : t === 'rn'
        ? info(
            '__virement',
            'Virement (Relais Numérique)',
            'Imposé pour ce type : rien à choisir. Un devis puis une facture sont émis à chaque commande.',
          )
        : t === 'projets'
          ? info(
              'clipboard',
              'Fixé par l’équipe',
              'Le règlement est défini par l’équipe EC pour chaque projet : la structure ne choisit rien au moment de commander.',
            )
          : t === 'interne' || t === 'esn'
            ? info('check', 'Aucun paiement', 'Les commandes de ce type ne sont ni payées ni facturées.')
            : info(
                'info',
                'Choisissez d’abord le type',
                'Les moyens de paiement dépendent du type de structure (étape 1).',
              );
  const progs = (state.distributions || []).filter((p) => p.statut !== 'archive');
  return `
    <section class="csw-section"><h4>Paiement</h4>${paiement}</section>
    <section class="csw-section"><h4>Catalogue accessible</h4>
      <div class="field"><select class="input" id="cs-groupes-mode" data-cs="groupesMode">
        <option value="tout" ${v.groupesMode === 'tout' ? 'selected' : ''}>Tout le catalogue</option>
        ${GROUPES_COMMANDE.map((g) => `<option value="${echapper(g)}" ${v.groupesMode === g ? 'selected' : ''}>${echapper(g)} uniquement</option>`).join('')}
        <option value="mixte" ${v.groupesMode === 'mixte' ? 'selected' : ''}>Mixte (plusieurs groupes)</option></select>
      ${v.groupesMode === 'mixte' ? `<div class="csw-cases">${GROUPES_COMMANDE.map((g) => `<label><input type="checkbox" class="cs-groupes-case" value="${echapper(g)}" ${v.groupes.includes(g) ? 'checked' : ''}>${echapper(g)}</label>`).join('')}</div>` : ''}</div>
    </section>
    ${t === 'bo' ? `<section class="csw-section"><h4>Public visé <em>(facultatif)</em></h4><div class="field"><input class="input" id="cs-type-public" data-cs="typePublic" value="${echapper(v.typePublic)}" placeholder="Ex : Étudiants, Familles, Seniors…"><p class="csw-aide">Repère pour choisir les tarifs personnalisés à proposer.</p></div></section>` : ''}
    ${
      progs.length
        ? `<section class="csw-section"><h4>Programmes de distribution <em>(ses commandes y sont rattachées automatiquement)</em></h4>
      <div class="csw-cases">${progs.map((p) => `<label><input type="checkbox" class="cs-programme" value="${p.id}" ${v.programmes.includes(String(p.id)) ? 'checked' : ''}>${echapper(p.nom)} <small>jusqu’au ${frDate(p.butoir)}</small></label>`).join('')}</div></section>`
        : ''
    }`;
}
function etapeStructureOptions(v) {
  return `
    <label class="csw-option${v.depotVente ? ' choisi' : ''}">
      <span class="rp-switch"><input type="checkbox" id="cs-depot-vente" data-cs="depotVente" ${v.depotVente ? 'checked' : ''}><span class="rp-switch-piste"></span></span>
      <span class="csw-option-txt"><b>Dépôt-vente : payé à la vente, pas à la commande</b>
        <small>Le matériel est <strong>confié</strong> à la structure : ni paiement, ni devis, ni facture à la commande. Elle déclare chaque vente dans sa flotte (« Vendu » au lieu de « Remis »). Vous suivez depuis l’admin le stock confié, les ventes et les alertes (appareil en stock depuis 2 mois, stock bas), avec un plafond de stock possible (« Stock restreint »).</small>
      </span>
    </label>
    ${
      v.depotVente
        ? `<div class="csw-section" style="margin-top:12px"><h4>Facturation des ventes</h4>
      <div class="csw-types">
        <label class="csw-type${v.facturationDepotVente !== 'chaque-vente' ? ' choisi' : ''}"><input type="radio" name="cs-fact-dv" value="aucune" data-cs="facturationDepotVente" ${v.facturationDepotVente !== 'chaque-vente' ? 'checked' : ''}><span class="csw-option-txt"><b>Pas de facturation automatique</b><small>Les ventes sont suivies ; la facturation se règle à part (organisation à définir).</small></span></label>
        <label class="csw-type${v.facturationDepotVente === 'chaque-vente' ? ' choisi' : ''}"><input type="radio" name="cs-fact-dv" value="chaque-vente" data-cs="facturationDepotVente" ${v.facturationDepotVente === 'chaque-vente' ? 'checked' : ''}><span class="csw-option-txt"><b>Une facture à chaque vente</b><small>Dès qu’un appareil passe en « Vendu », une facture de son prix de cession est émise (onglet Devis / Factures).</small></span></label>
      </div></div>`
        : ''
    }
    <div class="field" style="margin-top:14px"><label for="cs-convention">Lien vers la convention <em>(facultatif)</em></label>
      <input class="input" id="cs-convention" data-cs="lienConvention" type="url" value="${echapper(v.lienConvention)}" placeholder="https://… (Drive, SharePoint…)">
      <p class="csw-aide">Collez le lien du document signé : il sera accessible depuis la fiche de la structure.</p></div>
    ${
      v.type === 'interne'
        ? `<div class="field" style="margin-top:14px"><label for="cs-google">Équipe (comptes Google) <em>(facultatif)</em></label>
      <input class="input" id="cs-google" data-cs="comptesGoogle" type="text" value="${echapper(v.comptesGoogle)}" placeholder="paul@emmaus-connect.org (conseiller), anne@emmaus-connect.org (responsable)">
      <p class="csw-aide">L’e-mail de contact ouvre déjà l’espace <strong>sans code</strong>, en responsable de territoire. Ajoutez d’autres adresses séparées par des virgules, suivies de <strong>(responsable)</strong> ou <strong>(conseiller)</strong> — conseiller par défaut : flotte et ventes, attestations, projets et rapport en consultation. Le responsable peut aussi gérer cette liste depuis son espace.</p></div>`
        : ''
    }`;
}
function etapeStructureRecap(v) {
  const typeLib = (TYPES_STRUCTURE.find((t) => t.cle === v.type) || {}).libelle || '—';
  const groupes =
    v.groupesMode === 'tout'
      ? 'Tout le catalogue'
      : v.groupesMode === 'mixte'
        ? v.groupes.join(', ') || 'Aucun groupe coché'
        : v.groupesMode;
  const paiement =
    v.type === 'bo'
      ? v.moyensPaiement.join(', ') || 'Les 4 moyens'
      : v.type === 'rn'
        ? 'Virement (imposé)'
        : v.type === 'projets'
          ? 'Fixé par l’équipe'
          : 'Aucun paiement';
  const bloc = (
    i,
    titre,
    lignes,
  ) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-cs-aller="${i}">Modifier</button></div>
    ${lignes
      .filter((l) => l)
      .map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`)
      .join('')}</section>`;
  const nomComplet = (p, n) => [p, n].filter(Boolean).join(' ');
  return `<div class="csw-recap">
    ${bloc(0, 'Type', [['Type', typeLib]])}
    ${bloc(1, 'Identité', [['Nom', v.nom], ...(state.modal.id ? (v.nouveauCode ? [['Nouveau code', v.nouveauCode]] : []) : [['Code d’accès', v.code]]), ['SIRET', v.siret], ['Catégorie', v.categorie], ['Région', v.region]])}
    ${bloc(2, 'Contacts', [
      ['Responsable', nomComplet(v.responsablePrenom, v.responsableNom)],
      ['E-mail', v.email],
      ['Téléphone', v.telephone],
      ['Adresse', v.adresse],
      ['Facturation', [nomComplet(v.respFactPrenom, v.respFactNom), v.emailFacturation].filter(Boolean).join(' · ')],
    ])}
    ${bloc(3, 'Commandes & paiement', [['Paiement', paiement], ['Catalogue', groupes], v.type === 'bo' ? ['Public visé', v.typePublic] : null, v.programmes.length ? ['Programmes', v.programmes.map((id) => ((state.distributions || []).find((p) => String(p.id) === id) || {}).nom || id).join(', ')] : null])}
    ${bloc(4, 'Options', [['Dépôt-vente', v.depotVente ? (v.facturationDepotVente === 'chaque-vente' ? 'Oui — une facture à chaque vente' : 'Oui — sans facturation automatique') : 'Non'], ['Convention', v.lienConvention], v.type === 'interne' ? ['Comptes Google', [v.email, v.comptesGoogle].filter(Boolean).join(', ')] : null])}
  </div>`;
}
/** Vérifie l'étape affichée ; renvoie un message d'erreur, ou '' si tout va bien. */
function verifierEtapeStructure(i) {
  const v = state.modal.v;
  const cle = ETAPES_STRUCTURE[i].cle;
  if (cle === 'type' && !v.type) return 'Choisissez le type de la structure.';
  if (cle === 'identite') {
    if (!v.nom.trim()) return 'Le nom est obligatoire.';
    if (!state.modal.id && !String(v.code).trim()) return 'Le code d’accès est obligatoire.';
    const siret = v.siret.replace(/\s+/g, '');
    if (siret && !/^\d{14}$/.test(siret)) return 'Le SIRET doit comporter exactement 14 chiffres.';
    const codeSaisi = state.modal.id ? v.nouveauCode.trim() : String(v.code).trim();
    if (codeSaisi && state.structures.some((x) => x.code === codeSaisi && x.id !== state.modal.id))
      return 'Ce code est déjà utilisé par une autre structure.';
  }
  if (cle === 'contacts') {
    if (!v.responsablePrenom.trim() && !v.responsableNom.trim()) return 'Le responsable habituel est obligatoire.';
    const mailOk = (x) => !x || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
    if (!mailOk(v.email) || !mailOk(v.emailFacturation)) return 'Une adresse e-mail n’est pas valide.';
  }
  if (cle === 'options' && v.lienConvention.trim() && !/^https?:\/\/\S+$/i.test(v.lienConvention.trim()))
    return 'Le lien vers la convention doit commencer par https://';
  return '';
}
function allerEtapeStructure(cible) {
  const m = state.modal;
  // En création, on ne saute pas une étape non vérifiée.
  if (!m.id && cible > m.etape) {
    for (let i = m.etape; i < cible; i++) {
      const err = verifierEtapeStructure(i);
      if (err) {
        m.etape = i;
        render();
        $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
        return;
      }
    }
  }
  m.etape = Math.max(0, Math.min(ETAPES_STRUCTURE.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps');
  if (corps) corps.scrollTop = 0;
}
/* Saisie : chaque champ [data-cs] alimente state.modal.v (pas de re-rendu, sauf pour les
   choix qui changent l'affichage de l'étape : type, mode du code, cases, groupes). */
function lireSaisieStructure(el) {
  const m = state.modal;
  if (!m || m.kind !== 'creer-structure' || !m.v) return false;
  const v = m.v;
  if (el.dataset && el.dataset.cs) {
    v[el.dataset.cs] = el.type === 'checkbox' ? el.checked : el.value;
    return true;
  }
  if (el.name === 'cs-type') {
    v.type = el.value;
    return 'rendre';
  }
  if (el.name === 'cs-code-mode') {
    v.codeMode = el.value;
    v.code = el.value === 'generer' ? genererCodeStructure() : '';
    return 'rendre';
  }
  if (el.classList.contains('cs-paiement-case')) {
    v.moyensPaiement = [...document.querySelectorAll('.cs-paiement-case:checked')].map((x) => x.value);
    return 'rendre';
  }
  if (el.classList.contains('cs-groupes-case')) {
    v.groupes = [...document.querySelectorAll('.cs-groupes-case:checked')].map((x) => x.value);
    return true;
  }
  if (el.classList.contains('cs-programme')) {
    v.programmes = [...document.querySelectorAll('.cs-programme:checked')].map((x) => x.value);
    return true;
  }
  return false;
}
document.addEventListener('input', (e) => {
  const r = lireSaisieStructure(e.target);
  if (!r) return;
  // Indicateur de robustesse mis à jour en direct, sans perdre le focus.
  if (e.target.dataset.cs === 'code' || e.target.dataset.cs === 'nouveauCode') {
    const f = robustesseCode(e.target.value);
    let zone = e.target.parentNode.querySelector('.csw-force, .csw-aide');
    if (f) {
      if (!zone || !zone.classList.contains('csw-force')) {
        const d = document.createElement('div');
        if (zone) zone.replaceWith(d);
        else e.target.after(d);
        zone = d;
      }
      zone.className = `csw-force ${f.niveau}`;
      zone.innerHTML = `<i></i>${echapper(f.txt)}`;
    }
  }
});
document.addEventListener('change', (e) => {
  const r = lireSaisieStructure(e.target);
  if (
    r === 'rendre' ||
    e.target.dataset.cs === 'groupesMode' ||
    e.target.dataset.cs === 'depotVente' ||
    e.target.dataset.cs === 'facturationDepotVente'
  )
    render();
  if (e.target.id === 'st-filtre-region') {
    state.structuresFiltreRegion = e.target.value;
    render();
  }
});
document.addEventListener('click', (e) => {
  if (!state.modal || state.modal.kind !== 'creer-structure') return;
  const aller = e.target.closest('[data-cs-aller]');
  if (aller) {
    allerEtapeStructure(parseInt(aller.dataset.csAller, 10));
    return;
  }
  if (e.target.closest('[data-cs-suivant]')) {
    allerEtapeStructure(state.modal.etape + 1);
    return;
  }
  if (e.target.closest('[data-cs-precedent]')) {
    allerEtapeStructure(state.modal.etape - 1);
    return;
  }
});
document.addEventListener('click', (e) => {
  if (e.target.id === 'cs-enregistrer') enregistrerStructure();
  if (e.target.id === 'cc-enregistrer') enregistrerCommande();
  if (e.target.id === 'cp-enregistrer') enregistrerProduit();
  if (e.target.id === 'cd-enregistrer') enregistrerDevis();
  if (e.target.id === 'cf-enregistrer') enregistrerFacture();
  if (e.target.id === 'mb-enregistrer') enregistrerModeleBon();
  if (e.target.id === 'md-enregistrer') enregistrerModeleDoc();
  if (e.target.id === 'ma-enregistrer') enregistrerModeleAttestation();
  if (e.target.id === 'ma-xlsx-enregistrer') enregistrerModeleAttestationXlsx();
  if (e.target.id === 'ma-pdf-enregistrer') enregistrerModeleAttestationPdf();
  if (e.target.id === 'rp-enregistrer-rappro') enregistrerRapprochement();
  if (e.target.id === 'rd-enregistrer') enregistrerRattachementDevis();
  if (e.target.id === 'ns-enregistrer') enregistrerSav();
  if (e.target.closest('[data-supprimer-modele-bon]')) supprimerModeleBon();
  const supprimerModeleDocBtn = e.target.closest('[data-supprimer-modele-doc]');
  if (supprimerModeleDocBtn) supprimerModeleDoc(supprimerModeleDocBtn.dataset.supprimerModeleDoc);
  if (e.target.closest('[data-supprimer-modele-attestation]')) supprimerModeleAttestation();
  if (e.target.closest('[data-supprimer-modele-attestation-xlsx]')) supprimerModeleAttestationXlsx();
  if (e.target.closest('[data-supprimer-modele-attestation-pdf]')) supprimerModeleAttestationPdf();
});
async function enregistrerStructure() {
  const m = state.modal;
  const id = m.id;
  const v = m.v;
  // Toutes les étapes sont vérifiées avant d'écrire quoi que ce soit (on revient sur la
  // première étape en défaut, avec son message).
  for (let i = 0; i < ETAPES_STRUCTURE.length - 1; i++) {
    const err = verifierEtapeStructure(i);
    if (err) {
      m.etape = i;
      render();
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
      return;
    }
  }
  // "code" n'est modifiable qu'à la création (ou via le champ « nouveau code » en modification,
  // envoyé à part avec sa propre vérification d'unicité côté serveur).
  const champsCommuns = {
    nom: v.nom.trim(),
    email: v.email.trim(),
    telephone: v.telephone.trim(),
    adresse: v.adresse.trim(),
    categorie: v.categorie,
    // Reconcaténé depuis les deux champs Prénom/NOM — la colonne back reste un seul champ texte.
    responsable: [v.responsablePrenom.trim(), v.responsableNom.trim()].filter(Boolean).join(' '),
    responsableFacturation: [v.respFactPrenom.trim(), v.respFactNom.trim()].filter(Boolean).join(' '),
    emailFacturation: v.emailFacturation.trim(),
    groupesCommande: v.groupesMode === 'tout' ? '' : v.groupesMode === 'mixte' ? v.groupes.join(',') : v.groupesMode,
    typePublic: v.type === 'bo' ? v.typePublic.trim() : (v.typePublic || '').trim(),
    moyensPaiement: v.type === 'bo' ? v.moyensPaiement.join(',') : '',
    siret: v.siret.replace(/\s+/g, ''),
    region: v.region,
    ...((state.distributions || []).some((p) => p.statut !== 'archive') ? { programmes: v.programmes.join(',') } : {}),
    depotVente: v.depotVente ? 'TRUE' : 'FALSE',
    lienConvention: v.lienConvention.trim(),
    comptesGoogle: v.comptesGoogle.trim(),
    facturationDepotVente: v.depotVente ? v.facturationDepotVente : 'aucune',
    type: v.type,
  };
  const bouton = $('cs-enregistrer');
  if (bouton) bouton.disabled = true;
  const echec = (msg) => {
    etat('Enregistrement impossible', 'erreur');
    $('rp-retour-modale').innerHTML =
      `<div class="msg msg-erreur">${echapper(msg || 'Enregistrement impossible.')}</div>`;
    const b = $('cs-enregistrer');
    if (b) b.disabled = false;
  };
  try {
    etat(id ? 'Enregistrement…' : 'Création…', 'chargement');
    if (id) {
      const s = state.structures.find((x) => x.id === id) || {};
      // Seuls les champs réellement modifiés sont envoyés (un appel par champ côté API).
      const avant = { ...valeursInitialesStructure(s) };
      const initiaux = {
        nom: s.nom || '',
        email: s.email || '',
        telephone: s.telephone || '',
        adresse: s.adresse || '',
        categorie: s.categorie || '',
        responsable: s.responsable || '',
        responsableFacturation: s.responsableFacturation || '',
        emailFacturation: s.emailFacturation || '',
        groupesCommande: s.groupesCommande || '',
        typePublic: s.typePublic || '',
        moyensPaiement: s.moyensPaiement || '',
        siret: s.siret || '',
        region: s.region || '',
        programmes: s.programmes || '',
        depotVente: s.depotVente ? 'TRUE' : 'FALSE',
        lienConvention: s.lienConvention || '',
        comptesGoogle: texteEquipe(s),
        facturationDepotVente: s.facturationDepotVente === 'chaque-vente' ? 'chaque-vente' : 'aucune',
        type: avant.type,
      };
      const aEnvoyer = Object.keys(champsCommuns).filter((c) => String(champsCommuns[c]) !== String(initiaux[c] ?? ''));
      const nouveauCode = v.nouveauCode.trim();
      if (nouveauCode && nouveauCode !== s.code) {
        if (
          !(await confirmerCvdl(
            `Remplacer le code de « ${s.nom} » ? L'ancien code cessera de fonctionner immédiatement (liens déjà partagés, portail, suivi de commande...).`,
          ))
        ) {
          const b = $('cs-enregistrer');
          if (b) b.disabled = false;
          etat('Annulé', 'succes');
          return;
        }
        const rc = await poster({ action: 'structure-update', id, champ: 'code', valeur: nouveauCode });
        if (!rc.ok) return echec(rc.erreur);
      }
      const reponses = await Promise.all(
        aEnvoyer.map((c) => poster({ action: 'structure-update', id, champ: c, valeur: champsCommuns[c] })),
      );
      const ko = reponses.find((r) => !r.ok);
      if (ko) return echec(ko.erreur);
    } else {
      const r = await poster({ action: 'structure-create', code: String(v.code).trim(), ...champsCommuns });
      if (!r.ok) return echec(r.erreur);
    }
    etat(id ? 'Structure mise à jour' : 'Structure créée', 'succes');
    const rst = await jsonp({ action: 'structures', password: motDePasse });
    if (rst.ok) state.structures = rst.structures.slice().sort((a, b) => b.id - a.id);
    if (champsCommuns.depotVente === 'TRUE') chargerDepotVente();
    state.modal = null;
    render();
  } catch (e) {
    echec();
  }
}
