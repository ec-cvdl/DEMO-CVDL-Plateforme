let codeValide = '';
let partenairesCourants = [];

/* ════════════════════════════════════════════════════════════════════════════════════
   Création / modification d'une structure partenaire (Vente solidaire) — assistant en étapes, même
   parcours que « Nouvelle structure » dans l'admin (assistant-portail.js). Le type est
   toujours Vente solidaire : l'étape « Type » de l'admin n'a pas lieu d'être ici.
   ════════════════════════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  'Collège/Université',
  'École',
  'Collectivité',
  'Entreprise privée',
  'Association',
  'Structure sociale',
];
const GROUPES = ['Connexion', 'Équipement', 'Accompagnement'];
const MOYENS = [
  {
    v: 'Paiement en ligne (CB)',
    txt: 'Un lien de paiement est envoyé : la personne règle par carte, avec son smartphone.',
    svg: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  },
  {
    v: 'Chèque',
    txt: 'Chèque remis à la structure, qui le transmet.',
    svg: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M6 16h4M14 16h4"/>',
  },
  {
    v: 'Espèces',
    txt: 'Réglé en espèces auprès de la structure, qui reverse le montant.',
    svg: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  },
  {
    v: 'Comptoir solidaire',
    txt: 'Paiement en direct au comptoir solidaire du partenaire.',
    svg: '<path d="M3 9 5 4h14l2 5"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9v10h14V9"/><path d="M9 19v-4a3 3 0 0 1 6 0v4"/>',
  },
];
const ETAPES = [
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
    p: 'Ce qu’elle peut commander et comment les personnes règlent leur matériel.',
  },
  {
    cle: 'convention',
    titre: 'Convention',
    ill: 'attestations',
    h: 'Une convention signée ?',
    p: 'Facultatif : le lien du document, pour le retrouver facilement.',
  },
  {
    cle: 'recap',
    titre: 'Récapitulatif',
    ill: 'attestations',
    h: 'Tout est bon ?',
    p: 'Relisez avant d’enregistrer — chaque bloc se modifie d’un clic.',
  },
];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1
function genererCode() {
  const tirage = (n) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map((o) => ALPHABET[o % ALPHABET.length])
      .join('');
  return `${tirage(4)}-${tirage(4)}-${tirage(4)}-${tirage(4)}`;
}
/** Même règle que le serveur : 12 caractères minimum, lettres/chiffres/tirets. */
function codeAccepte(c) {
  return c.length >= 12 && /^[A-Za-z0-9_-]+$/.test(c);
}
function robustesse(c) {
  if (!c) return null;
  if (!codeAccepte(c)) return { niveau: 'faible', txt: '12 caractères minimum (lettres, chiffres, tirets).' };
  const familles = [/[a-z]/, /[A-Z]/, /\d/].filter((r) => r.test(c)).length;
  if (c.length >= 14 && familles >= 2) return { niveau: 'fort', txt: 'Code robuste.' };
  return { niveau: 'moyen', txt: 'Correct, mais un code généré (16 caractères aléatoires) est plus sûr.' };
}
function separer(nomComplet) {
  const mots = String(nomComplet || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const nom = mots.length > 1 ? mots.pop() : '';
  return { prenom: mots.join(' '), nom };
}
function capitaliserPrenom(valeur) {
  let r = '',
    debut = true;
  for (const c of valeur) {
    if (c === ' ' || c === '-') {
      r += c;
      debut = true;
    } else if (debut) {
      r += c.toUpperCase();
      debut = false;
    } else r += c.toLowerCase();
  }
  return r;
}
function valeursInitiales(s) {
  const resp = separer(s && s.responsable),
    respF = separer(s && s.responsableFacturation);
  const groupes = String((s && s.groupesCommande) || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    codeMode: 'generer',
    code: s ? '' : genererCode(),
    nouveauCode: '',
    nom: s ? s.nom || '' : '',
    siret: s ? s.siret || '' : '',
    categorie: s ? s.categorie || '' : '',
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
    lienConvention: s ? s.lienConvention || '' : '',
  };
}
function corpsEtape(cle, v, s) {
  const e = echapper;
  if (cle === 'identite') {
    const force = robustesse(s ? v.nouveauCode.trim() : v.codeMode === 'libre' ? v.code.trim() : '');
    const blocCode = s
      ? `<div class="field ap-large"><label>Code d’accès actuel</label>
          <div class="ap-code"><span class="pk-sn">${e(s.code)}</span></div>
          <label for="ap-nouveau-code" style="margin-top:6px">Nouveau code <em>(facultatif — l’ancien cessera de fonctionner)</em></label>
          <div class="ap-code"><input class="input" id="ap-nouveau-code" data-ap="nouveauCode" autocomplete="off" value="${e(v.nouveauCode)}" placeholder="Laisser vide pour garder le code actuel" style="flex:1;min-width:200px">
          <button type="button" class="btn btn-secondary" data-generer-nouveau>Générer</button></div>
          ${force ? `<div class="ap-force ${force.niveau}"><i></i>${e(force.txt)}</div>` : ''}</div>`
      : `<div class="field ap-large"><label>Code d’accès au portail *</label>
          <div class="ap-seg" role="radiogroup" aria-label="Choix du code">
            <label class="${v.codeMode === 'generer' ? 'on' : ''}"><input type="radio" name="ap-code-mode" data-ap="codeMode" data-ap-rendre value="generer" ${v.codeMode === 'generer' ? 'checked' : ''}>Générer un code<em>recommandé</em></label>
            <label class="${v.codeMode === 'libre' ? 'on' : ''}"><input type="radio" name="ap-code-mode" data-ap="codeMode" data-ap-rendre value="libre" ${v.codeMode === 'libre' ? 'checked' : ''}>Choisir mon code</label>
          </div>
          ${
            v.codeMode === 'generer'
              ? `<div class="ap-code"><span class="pk-sn">${e(v.code)}</span><button type="button" class="btn btn-secondary" data-generer-autre>Un autre</button></div>
               <p class="ap-aide">16 caractères aléatoires, sans lettres ambiguës. C’est ce code que la structure saisira sur le portail : il suffit pour commander en son nom.</p>`
              : `<input class="input" id="ap-code" data-ap="code" autocomplete="off" value="${e(v.code)}" placeholder="12 caractères minimum">
               ${force ? `<div class="ap-force ${force.niveau}"><i></i>${e(force.txt)}</div>` : '<p class="ap-aide">Lettres, chiffres et tirets, 12 caractères minimum. Un code généré reste plus sûr.</p>'}`
          }
        </div>`;
    return `<div class="ap-grille">
      <div class="field ap-large"><label for="ap-nom">Nom de la structure *</label><input class="input" id="ap-nom" data-ap="nom" value="${e(v.nom)}" placeholder="Ex : Épicerie solidaire du Loiret" autocomplete="off"></div>
      ${blocCode}
      <div class="field"><label for="ap-siret">SIRET <em>(14 chiffres, facultatif)</em></label><input class="input" id="ap-siret" data-ap="siret" inputmode="numeric" maxlength="17" placeholder="123 456 789 00012" value="${e(v.siret)}"></div>
      <div class="field"><label for="ap-categorie">Catégorie <em>(facultatif)</em></label><select class="input" id="ap-categorie" data-ap="categorie"><option value="">—</option>${CATEGORIES.map((c) => `<option ${v.categorie === c ? 'selected' : ''}>${e(c)}</option>`).join('')}</select></div>
    </div>`;
  }
  if (cle === 'contacts') {
    return `<div class="ap-grille">
      <div class="field ap-large"><label>Responsable habituel *</label><div class="ap-deux">
        <input class="input" data-ap="responsablePrenom" data-casse="prenom" placeholder="Prénom" value="${e(v.responsablePrenom)}" aria-label="Prénom du responsable" autocomplete="off">
        <input class="input" data-ap="responsableNom" data-casse="nom" placeholder="NOM" value="${e(v.responsableNom)}" aria-label="Nom du responsable" autocomplete="off"></div></div>
      <div class="field"><label for="ap-email">E-mail</label><input class="input" id="ap-email" data-ap="email" type="email" value="${e(v.email)}" placeholder="contact@structure.fr"></div>
      <div class="field"><label for="ap-tel">Téléphone</label><input class="input" id="ap-tel" data-ap="telephone" value="${e(v.telephone)}" placeholder="02 38 00 00 00"></div>
      <div class="field ap-large"><label for="ap-adresse">Adresse</label><textarea class="input" id="ap-adresse" data-ap="adresse" rows="2" placeholder="12 rue des Lilas, 45500 Gien">${e(v.adresse)}</textarea></div>
      <div class="field ap-large"><label>Responsable facturation <em>(si différent)</em></label><div class="ap-deux">
        <input class="input" data-ap="respFactPrenom" data-casse="prenom" placeholder="Prénom" value="${e(v.respFactPrenom)}" aria-label="Prénom du responsable facturation" autocomplete="off">
        <input class="input" data-ap="respFactNom" data-casse="nom" placeholder="NOM" value="${e(v.respFactNom)}" aria-label="Nom du responsable facturation" autocomplete="off"></div></div>
      <div class="field ap-large"><label for="ap-email-fact">E-mail de facturation <em>(si différent)</em></label><input class="input" id="ap-email-fact" data-ap="emailFacturation" type="email" value="${e(v.emailFacturation)}"></div>
    </div>`;
  }
  if (cle === 'commande') {
    return `
      <section class="ap-section"><h4>Moyens de paiement proposés <em>— aucune case cochée = les 4</em></h4>
        <div class="ap-choix">${MOYENS.map(
          (m) => `
          <label class="ap-carte${v.moyensPaiement.includes(m.v) ? ' choisi' : ''}"><input type="checkbox" data-ap-liste="moyensPaiement" data-ap-rendre value="${e(m.v)}" ${v.moyensPaiement.includes(m.v) ? 'checked' : ''}>
            <span class="ap-carte-ic"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m.svg}</svg></span>
            <span class="ap-carte-txt"><b>${e(m.v)}</b><small>${e(m.txt)}</small></span><span class="ap-coche" aria-hidden="true">✓</span></label>`,
        ).join('')}</div>
      </section>
      <section class="ap-section"><h4>Catalogue accessible</h4>
        <div class="field"><select class="input" data-ap="groupesMode" data-ap-rendre aria-label="Catalogue accessible">
          <option value="tout" ${v.groupesMode === 'tout' ? 'selected' : ''}>Tout le catalogue</option>
          ${GROUPES.map((g) => `<option value="${e(g)}" ${v.groupesMode === g ? 'selected' : ''}>${e(g)} uniquement</option>`).join('')}
          <option value="mixte" ${v.groupesMode === 'mixte' ? 'selected' : ''}>Mixte (plusieurs groupes)</option></select></div>
        ${v.groupesMode === 'mixte' ? `<div class="ap-choix">${GROUPES.map((g) => `<label class="ap-carte${v.groupes.includes(g) ? ' choisi' : ''}"><input type="checkbox" data-ap-liste="groupes" data-ap-rendre value="${e(g)}" ${v.groupes.includes(g) ? 'checked' : ''}><span class="ap-carte-txt"><b>${e(g)}</b></span><span class="ap-coche" aria-hidden="true">✓</span></label>`).join('')}</div>` : ''}
      </section>
      <section class="ap-section"><h4>Public visé <em>— facultatif</em></h4>
        <div class="field"><input class="input" data-ap="typePublic" value="${e(v.typePublic)}" placeholder="Ex : Étudiants, Familles, Seniors…" aria-label="Public visé"><p class="ap-aide">Repère pour choisir les tarifs personnalisés à proposer.</p></div>
      </section>`;
  }
  if (cle === 'convention') {
    return `<div class="field"><label for="ap-convention">Lien vers la convention <em>(facultatif)</em></label>
      <input class="input" id="ap-convention" data-ap="lienConvention" type="url" value="${e(v.lienConvention)}" placeholder="https://… (Drive, SharePoint…)">
      <p class="ap-aide">Collez le lien du document signé : il sera accessible depuis la fiche de la structure, côté Emmaüs Connect aussi.</p></div>`;
  }
  // Récapitulatif
  const nomComplet = (p, n) => [p, n].filter(Boolean).join(' ');
  const groupes =
    v.groupesMode === 'tout'
      ? 'Tout le catalogue'
      : v.groupesMode === 'mixte'
        ? v.groupes.join(', ') || 'Aucun groupe coché'
        : v.groupesMode;
  const bloc = (
    i,
    titre,
    lignes,
  ) => `<section class="ap-recap-bloc"><div class="ap-recap-tete"><h4>${titre}</h4><button type="button" class="ap-lien" data-ap-aller="${i}">Modifier</button></div>
    ${lignes.map(([k, val]) => `<div class="ap-recap-l"><span>${k}</span><b>${val ? e(val) : '<em>—</em>'}</b></div>`).join('')}</section>`;
  return `<div class="ap-recap">
    ${bloc(0, 'Identité', [['Nom', v.nom], s ? ['Nouveau code', v.nouveauCode.trim() || 'Inchangé'] : ['Code d’accès', v.code], ['SIRET', v.siret], ['Catégorie', v.categorie], ['Type', 'Bon d’orientation (BO)']])}
    ${bloc(1, 'Contacts', [
      ['Responsable', nomComplet(v.responsablePrenom, v.responsableNom)],
      ['E-mail', v.email],
      ['Téléphone', v.telephone],
      ['Adresse', v.adresse],
      ['Facturation', [nomComplet(v.respFactPrenom, v.respFactNom), v.emailFacturation].filter(Boolean).join(' · ')],
    ])}
    ${bloc(2, 'Commandes & paiement', [
      ['Paiement', v.moyensPaiement.join(', ') || 'Les 4 moyens'],
      ['Catalogue', groupes],
      ['Public visé', v.typePublic],
    ])}
    ${bloc(3, 'Convention', [['Lien', v.lienConvention]])}
  </div>`;
}
function verifierEtape(cle, v, s) {
  if (cle === 'identite') {
    if (!v.nom.trim()) return 'Le nom est obligatoire.';
    const code = s ? v.nouveauCode.trim() : v.code.trim();
    if (!s && !code) return 'Le code d’accès est obligatoire.';
    if (code && !codeAccepte(code))
      return 'Code trop faible : 12 caractères minimum (lettres, chiffres, tirets) — utilisez « Générer ».';
    const siret = v.siret.replace(/\s+/g, '');
    if (siret && !/^\d{14}$/.test(siret)) return 'Le SIRET doit comporter exactement 14 chiffres.';
  }
  if (cle === 'contacts') {
    if (!v.responsablePrenom.trim() && !v.responsableNom.trim()) return 'Le responsable habituel est obligatoire.';
    const ok = (x) => !x.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
    if (!ok(v.email) || !ok(v.emailFacturation)) return 'Une adresse e-mail n’est pas valide.';
  }
  if (cle === 'commande' && v.groupesMode === 'mixte' && !v.groupes.length)
    return 'Cochez au moins un groupe de commande (ou choisissez « Tout le catalogue »).';
  if (cle === 'convention' && v.lienConvention.trim() && !/^https?:\/\/\S+$/i.test(v.lienConvention.trim()))
    return 'Le lien vers la convention doit commencer par https://';
  return '';
}
function champsEnvoyes(v) {
  return {
    nom: v.nom.trim(),
    adresse: v.adresse.trim(),
    email: v.email.trim(),
    telephone: v.telephone.trim(),
    emailFacturation: v.emailFacturation.trim(),
    categorie: v.categorie,
    responsable: [v.responsablePrenom.trim(), v.responsableNom.trim()].filter(Boolean).join(' '),
    responsableFacturation: [v.respFactPrenom.trim(), v.respFactNom.trim()].filter(Boolean).join(' '),
    groupesCommande: v.groupesMode === 'tout' ? '' : v.groupesMode === 'mixte' ? v.groupes.join(',') : v.groupesMode,
    typePublic: v.typePublic.trim(),
    moyensPaiement: v.moyensPaiement.join(','),
    siret: v.siret.replace(/\s+/g, ''),
    lienConvention: v.lienConvention.trim(),
  };
}
function ouvrirAssistant(s) {
  AssistantPortail.ouvrir({
    surtitre: s ? 'Modifier la structure partenaire' : 'Nouvelle structure partenaire',
    titre: (v) => (s ? s.nom : v.nom.trim() || 'Nouvelle structure partenaire'),
    etapes: ETAPES,
    v: valeursInitiales(s),
    modification: !!s,
    libelleFin: s ? 'Enregistrer' : 'Créer la structure',
    corps: (cle, v) => corpsEtape(cle, v, s),
    verifier: (cle, v) => verifierEtape(cle, v, s),
    saisie: (el, v, type) => {
      if (type !== 'input') return;
      // Casse : Prénom avec majuscule à chaque mot, NOM tout en majuscules (comme commande.html).
      if (el.dataset.casse) {
        const pos = el.selectionStart;
        el.value = el.dataset.casse === 'nom' ? el.value.toUpperCase() : capitaliserPrenom(el.value);
        el.setSelectionRange(pos, pos);
        v[el.dataset.ap] = el.value;
      }
      if (el.dataset.ap === 'code' || el.dataset.ap === 'nouveauCode') {
        const f = robustesse(el.value.trim());
        let z = el.closest('.field').querySelector('.ap-force, .ap-aide');
        if (f) {
          if (!z || !z.classList.contains('ap-force')) {
            const d = document.createElement('div');
            if (z) z.replaceWith(d);
            else el.closest('.field').appendChild(d);
            z = d;
          }
          z.className = `ap-force ${f.niveau}`;
          z.innerHTML = `<i></i>${echapper(f.txt)}`;
        } else if (z && z.classList.contains('ap-force')) z.remove();
      }
    },
    clic: async (e, v, rendre) => {
      if (e.target.closest('[data-generer-autre]')) {
        v.code = genererCode();
        rendre();
      }
      if (e.target.closest('[data-generer-nouveau]')) {
        if (
          window.confirmerCvdl &&
          !(await confirmerCvdl(
            'Un nouveau code remplacera l’ancien à l’enregistrement : les liens déjà partagés avec cette structure (commande, suivi…) cesseront de fonctionner. Continuer ?',
          ))
        )
          return;
        v.nouveauCode = genererCode();
        rendre();
      }
    },
    terminer: async (v) => {
      const champs = champsEnvoyes(v);
      const r = s
        ? await poster({
            action: 'structure-partenaire-update',
            codeCreateur: codeValide,
            code: s.code,
            champs: { ...champs, code: v.nouveauCode.trim() || s.code },
          })
        : await poster({ action: 'structure-creer-bo', codeCreateur: codeValide, code: v.code.trim(), ...champs });
      if (r && r.ok) await chargerPartenaires(s ? '' : champs.nom);
      return r;
    },
  });
}

async function verifierCode() {
  const code = $('id-code').value.trim();
  if (!code) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Saisissez votre code structure.</div>';
    return;
  }
  $('btn-verifier-code').disabled = true;
  $('btn-verifier-code').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  $('retour-id-code').innerHTML = '';
  try {
    const r = await jsonp({ action: 'check', code });
    if (!r.ok) {
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    } else if (!r.interne) {
      $('retour-id-code').innerHTML =
        '<div class="msg msg-erreur">Cet espace est réservé aux structures Interne.</div>';
    } else {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-liste').hidden = false;
      $('btn-deconnexion-partenaires').hidden = false;
      await chargerPartenaires();
    }
  } catch (e) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Réessayez.</div>';
  }
  $('btn-verifier-code').disabled = false;
  $('btn-verifier-code').textContent = 'Continuer';
}
$('btn-verifier-code').addEventListener('click', verifierCode);
$('id-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});

$('btn-deconnexion-partenaires').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});

async function chargerPartenaires(nomNouveau) {
  $('retour-liste-partenaires').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  try {
    const r = await jsonp({ action: 'structures-partenaires-lister', codeCreateur: codeValide });
    $('retour-liste-partenaires').innerHTML = '';
    if (!r.ok) {
      $('retour-liste-partenaires').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      return;
    }
    if (nomNouveau)
      $('retour-liste-partenaires').innerHTML =
        `<div class="msg msg-succes">« ${echapper(nomNouveau)} » est créée : transmettez-lui son code pour qu’elle puisse commander.</div>`;
    if (!r.structures.length) {
      $('liste-partenaires').innerHTML =
        '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucune structure partenaire créée pour le moment.</div>';
      return;
    }
    partenairesCourants = r.structures;
    $('liste-partenaires').innerHTML = r.structures
      .map(
        (s) => `
      <div class="carte-partenaire">
        <span data-ill="structure" class="s"></span>
        <div class="cp-txt">
          <div class="nom">${echapper(s.nom)}</div>
          <div class="sous">${echapper(s.responsable || s.email || 'Contact non renseigné')}${s.telephone ? ' · ' + echapper(s.telephone) : ''}</div>
        </div>
        <span class="pk-sn" title="Code de la structure">${echapper(s.code)}</span>
        <button type="button" class="btn-modifier-partenaire" data-modifier-code="${echapper(s.code)}">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
          Modifier
        </button>
      </div>`,
      )
      .join('');
    document.querySelectorAll('[data-modifier-code]').forEach((b) => {
      b.addEventListener('click', () => {
        const s = partenairesCourants.find((x) => x.code === b.dataset.modifierCode);
        if (s) ouvrirAssistant(s);
      });
    });
  } catch (e) {
    $('retour-liste-partenaires').innerHTML = '<div class="msg msg-erreur">Chargement impossible.</div>';
  }
}

$('btn-ouvrir-creation').addEventListener('click', () => ouvrirAssistant(null));

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    $('id-code').value = codeMemorise;
    verifierCode().finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = $('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}
