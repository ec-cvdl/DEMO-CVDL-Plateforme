/* Saisie Salesforce : les ventes de la flotte (structure Interne) présentées dans l'ordre des
   formulaires Salesforce, chaque valeur avec un bouton « Copier ». Rien n'est écrit dans
   Salesforce ; la vente est seulement marquée « saisie » dans la flotte. */

let codeValide = '';
let nomStructure = '';
let reglages = { equipe: [] };
let creneaux = [];
let creneauCle = '';
let filtre = 'a-saisir';
let actifId = null;
// Ventes marquées pendant la visite : restent affichées (repliées) jusqu'au prochain filtre.
const marqueesIci = new Set();
const CLE_MEMBRE = 'cvdl-salesforce-membre';

const creneauCourant = () => creneaux.find((c) => c.cle === creneauCle) || null;
const aSaisir = (a) => !a.saisieSalesforce;
const nomCompletDe = (a) => [a.prenom, a.nom].filter(Boolean).join(' ');
const initiales = (a) =>
  [a.prenom, a.nom]
    .filter(Boolean)
    .map((x) => x.trim()[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
/** Montant tel qu'il se saisit dans Salesforce : sans symbole, virgule décimale. */
const montant = (p) => (p == null ? '' : Number.isInteger(p) ? String(p) : p.toFixed(2).replace('.', ','));
const pluriel = (n, s, p) => `${n} ${n > 1 ? p : s}`;

function membre() {
  const liste = reglages.equipe || [];
  let m = '';
  try {
    m = localStorage.getItem(CLE_MEMBRE) || '';
  } catch (e) {}
  return liste.includes(m) ? m : '';
}

/* ── Lignes ── */
/** Valeur à coller (champ texte, date ou recherche) avec son bouton « Copier ». */
function ligneCopie(libelle, valeur, nomBouton, note) {
  const v = valeur == null ? '' : String(valeur);
  if (!v)
    return `<div class="sf-lg"><span class="sf-l">${echapper(libelle)}</span><span class="sf-v vide">—${note ? ` <small>${echapper(note)}</small>` : ''}</span></div>`;
  return `<div class="sf-lg"><span class="sf-l">${echapper(libelle)}</span><span class="sf-v">${echapper(v)}${note ? `<small>${echapper(note)}</small>` : ''}</span><button type="button" class="sf-cp" data-copier="${echapper(v)}" aria-label="Copier ${echapper(nomBouton)}">⧉ Copier</button></div>`;
}
/** Liste ou Oui/Non dans Salesforce : on choisit, on ne colle pas. */
function ligneChoix(libelle, valeur, note) {
  return `<div class="sf-lg"><span class="sf-l">${echapper(libelle)}</span><span class="sf-v choix">${valeur ? `à choisir : <b>${echapper(valeur)}</b>` : 'à choisir'}${note ? `<small>${echapper(note)}</small>` : ''}</span></div>`;
}
/** Information sans copie. */
function ligneInfo(libelle, valeur) {
  return `<div class="sf-lg"><span class="sf-l">${echapper(libelle)}</span><span class="sf-v">${echapper(valeur)}</span></div>`;
}

/* ── Affichage ── */
function afficher() {
  const c = creneauCourant();
  const tous = c ? c.appareils : [];
  const faits = tous.filter((a) => !aSaisir(a)).length;
  $('sf-titre').textContent = c ? `${c.date} · ${nomStructure}` : nomStructure;
  $('sf-prog').innerHTML = c ? `<b>${faits}</b>/${tous.length} saisie${tous.length > 1 ? 's' : ''}` : '';
  document.querySelectorAll('[data-filtre]').forEach((b) => {
    const n = b.dataset.filtre === 'a-saisir' ? tous.length - faits : faits;
    b.textContent = `${b.dataset.filtre === 'a-saisir' ? 'À saisir' : 'Saisies'} (${n})`;
    b.classList.toggle('on', filtre === b.dataset.filtre);
    b.setAttribute('aria-pressed', String(filtre === b.dataset.filtre));
  });
  $('sf-creneau').innerHTML = creneaux.length
    ? creneaux
        .map((x) => {
          const reste = x.appareils.filter(aSaisir).length;
          return `<option value="${echapper(x.cle)}" ${x.cle === creneauCle ? 'selected' : ''}>Créneau du ${echapper(x.date)} — ${reste ? `${reste} à saisir` : 'tout saisi'}</option>`;
        })
        .join('')
    : '<option value="">Aucun créneau</option>';
  const m = membre();
  $('sf-membre').innerHTML = (reglages.equipe || []).length
    ? '<option value="">Choisir…</option>' +
      reglages.equipe
        .map((n) => `<option value="${echapper(n)}" ${n === m ? 'selected' : ''}>${echapper(n)}</option>`)
        .join('')
    : '<option value="">Ajoutez l’équipe dans les réglages ci-dessous</option>';

  if (!c) {
    $('sf-contenu').innerHTML =
      '<p class="sf-vide">Aucune vente à saisir : les appareils remis avec une date de vente et une personne apparaissent ici.</p>';
    return;
  }
  const liste = tous.filter((a) => marqueesIci.has(a.id) || (filtre === 'a-saisir' ? aSaisir(a) : !aSaisir(a)));
  if (actifId && !liste.some((a) => a.id === actifId)) actifId = null;
  if (!actifId && filtre === 'a-saisir') actifId = (liste.find(aSaisir) || {}).id || null;
  $('sf-contenu').innerHTML =
    blocCreneau(c) +
    (liste.length
      ? liste.map((a) => (a.id === actifId ? carteDepliee(a, c, m) : carteRepliee(a))).join('')
      : `<p class="sf-vide">${filtre === 'a-saisir' ? 'Toutes les ventes de ce créneau sont saisies.' : 'Aucune vente saisie pour ce créneau.'}</p>`);
}

function blocCreneau(c) {
  const r = reglages;
  const ouvrir = r.operationUrl
    ? `<a class="sf-lien" href="${echapper(urlSure(r.operationUrl))}" target="_blank" rel="noopener">Ouvrir l’opération ↗</a>`
    : '';
  return `<section class="sf-bloc" aria-label="Créneau">
    <h2>Créneau <span class="sf-h2-note">une fois par session de vente</span>${ouvrir}</h2>
    ${ligneCopie('Opération', r.operation, 'l’opération', 'à rechercher')}
    ${ligneCopie('Date', c.date, 'la date du créneau')}
    ${ligneCopie('Heure', r.heure, 'l’heure')}
    ${ligneChoix('Statut de la session', 'Planifiée', 'déjà proposé par défaut')}
    ${ligneCopie('Durée (heures)', r.duree == null ? '' : String(r.duree).replace('.', ','), 'la durée')}
    ${ligneCopie('Bénévoles (max)', r.benevoles == null ? '' : String(r.benevoles), 'le nombre de bénévoles')}
  </section>`;
}

function carteRepliee(a) {
  const fait = !aSaisir(a);
  return `<div class="sf-bloc sf-carte">
    <button type="button" class="sf-pers" data-ouvrir="${a.id}" aria-expanded="false" aria-label="Ouvrir la vente de ${echapper(nomCompletDe(a))}">
      ${fait ? '<span class="sf-av fait" aria-hidden="true">✓</span>' : `<span class="sf-av" aria-hidden="true">${echapper(initiales(a))}</span>`}
      <span class="sf-nom">${echapper(nomCompletDe(a))}</span>
      <span class="sf-produit">${echapper(a.produit || a.modele || '')}${a.prix != null ? ` · ${echapper(montant(a.prix))} €` : ''}</span>
      <span class="sf-tag${fait ? ' ok' : ''}">${fait ? 'Saisie' : 'À saisir'}</span>
    </button>
  </div>`;
}

function carteDepliee(a, c, m) {
  const fait = !aSaisir(a);
  const nom = nomCompletDe(a);
  const linux = a.linux === true ? 'Oui' : a.linux === false ? 'Non' : '';
  // « Vente suivie par » noté dans la fiche personne de la flotte, sinon la personne qui saisit.
  const suivi = a.suiviPar || m;
  const contact = `
    ${ligneCopie('Prénom', a.prenom, 'le prénom')}
    ${ligneCopie('Nom', a.nom, 'le nom')}
    ${ligneCopie('Antenne', reglages.antenne, 'l’antenne', 'à rechercher')}
    ${ligneCopie('Fiche créée par', m, 'le nom de la personne qui crée la fiche', m ? 'à rechercher' : 'choisissez qui saisit, en haut')}
    ${ligneCopie('Date de naissance', a.dateNaissance, 'la date de naissance')}
    ${ligneCopie('Prescripteur·trice', a.prescripteur, 'le prescripteur', 'à rechercher')}`;
  return `<section class="sf-bloc sf-carte active" aria-label="Vente de ${echapper(nom)}">
    <button type="button" class="sf-pers" data-ouvrir="${a.id}" aria-expanded="true" aria-label="Replier la vente de ${echapper(nom)}">
      <span class="sf-av" aria-hidden="true">${echapper(initiales(a))}</span>
      <span class="sf-nom">${echapper(nom)}</span>
      <span class="sf-tag${fait ? ' ok' : ''}">${fait ? 'Saisie' : 'À saisir'}</span>
    </button>
    <h3 class="sf-sous">Contact « Personne accompagnée »</h3>
    ${
      a.contactExistant
        ? `<details class="sf-contact-connu"><summary>Contact déjà dans Salesforce : rechercher <b>${echapper(nom)}</b></summary>${contact}</details>`
        : `<p class="sf-note">Si la personne n’existe pas encore dans Salesforce.</p>${contact}`
    }
    <h3 class="sf-sous">Participant</h3>
    ${ligneInfo('Créneau', `le créneau du ${c.date.slice(0, 5)}`)}
    ${ligneCopie('Personne accompagnée', nom, 'le nom complet', 'à rechercher')}
    <h3 class="sf-sous">Vente — Matériel (Ordinateur / Téléphone / Tablette)</h3>
    ${ligneCopie('Date de vente', a.dateVente, 'la date de vente')}
    ${ligneChoix('Stock', reglages.stock)}
    ${ligneCopie('Vente suivie par', suivi, 'le nom de la personne qui a suivi la vente', suivi ? 'à rechercher' : 'choisissez qui saisit, en haut')}
    ${ligneCopie('Montant de la vente', montant(a.prix), 'le montant')}
    ${ligneCopie('Identifiant EC', a.identifiantEc, 'l’identifiant EC', a.attestationGeneree ? '' : 'attestation à générer')}
    ${ligneChoix('Marque', a.marque)}
    ${ligneCopie('Modèle', a.modele, 'le modèle')}
    ${ligneCopie('N° série / IMEI', a.numeroSerie, 'le numéro de série')}
    ${ligneChoix('Paiement complet', a.paiementComplet === false ? 'Non' : 'Oui')}
    <h3 class="sf-sous">Page suivante</h3>
    ${ligneChoix('Linux', linux, linux ? (a.linuxNote ? '' : 'd’après le produit') : 'produit introuvable au catalogue : à vérifier')}
    <div class="sf-actions">
      <button type="button" class="btn btn-secondary" data-attestation="${a.id}">⤓ ${a.attestationGeneree ? 'Attestation PDF' : 'Générer l’attestation PDF'}</button>
      ${
        fait
          ? `<button type="button" class="btn btn-secondary" data-marquer="${a.id}" data-valeur="Non">Marquer à saisir</button>`
          : `<button type="button" class="btn btn-primary" data-marquer="${a.id}" data-valeur="Oui">✓ Saisie, personne suivante</button>`
      }
    </div>
    <div class="sf-retour-carte" id="retour-carte-${a.id}" aria-live="polite"></div>
  </section>`;
}

/* ── Actions ── */
/** Prévient l'onglet de la gestion de flotte resté ouvert (même navigateur), sans recharger. */
function publierFlotte(message) {
  try {
    const canal = new BroadcastChannel('cvdl-flotte');
    canal.postMessage(message);
    canal.close();
  } catch (e) {
    /* navigateur sans BroadcastChannel : la flotte se met à jour à son prochain chargement */
  }
}
function trouver(id) {
  for (const c of creneaux) {
    const a = c.appareils.find((x) => x.id === id);
    if (a) return a;
  }
  return null;
}
async function copier(bouton) {
  try {
    await navigator.clipboard.writeText(bouton.dataset.copier);
  } catch (e) {
    alerteCvdl('Copie impossible : sélectionnez la valeur et copiez-la à la main.');
    return;
  }
  bouton.classList.add('ok');
  bouton.textContent = '✓ Copié';
  setTimeout(() => {
    bouton.classList.remove('ok');
    bouton.textContent = '⧉ Copier';
  }, 1500);
}

async function marquer(bouton) {
  const id = parseInt(bouton.dataset.marquer, 10);
  const a = trouver(id);
  if (!a) return;
  bouton.disabled = true;
  try {
    const r = await poster({
      action: 'flotte-modifier',
      code: codeValide,
      id,
      champ: 'saisieSalesforce',
      valeur: bouton.dataset.valeur,
    });
    if (!r.ok) {
      $(`retour-carte-${id}`).innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible.')}</div>`;
      bouton.disabled = false;
      return;
    }
  } catch (e) {
    $(`retour-carte-${id}`).innerHTML = '<div class="msg msg-erreur">Enregistrement impossible — réessayez.</div>';
    bouton.disabled = false;
    return;
  }
  a.saisieSalesforce = bouton.dataset.valeur === 'Oui';
  publierFlotte({ type: 'saisieSalesforce', id, valeur: a.saisieSalesforce });
  marqueesIci.add(id);
  if (a.saisieSalesforce) {
    // Replie et ouvre la vente suivante encore à saisir.
    const liste = creneauCourant().appareils;
    const suivante = liste.slice(liste.indexOf(a) + 1).find(aSaisir) || liste.find(aSaisir);
    actifId = suivante ? suivante.id : null;
    if (window.CvdlRetours && !liste.some(aSaisir))
      CvdlRetours.action('saisie-salesforce', 'Recopier les ventes dans Salesforce, c’était simple ?');
  }
  afficher();
  const carte = document.querySelector('.sf-carte.active');
  if (carte) carte.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

async function attestation(bouton) {
  const id = parseInt(bouton.dataset.attestation, 10);
  const a = trouver(id);
  if (!a) return;
  const retour = $(`retour-carte-${id}`);
  bouton.disabled = true;
  retour.innerHTML = '<div class="msg msg-info">Génération de l’attestation…</div>';
  try {
    const r = await poster({
      action: 'flotte-generer-attestation',
      code: codeValide,
      numeroSerie: a.numeroSerie,
      nomComplet: nomCompletDe(a),
      dateNaissance: a.dateNaissance,
    });
    if (!r.ok) {
      retour.innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Génération impossible.')}</div>`;
      bouton.disabled = false;
      return;
    }
    if (window.CvdlRetours) CvdlRetours.action('attestation');
    a.identifiantEc = r.numeroAttestation || a.identifiantEc;
    a.attestationGeneree = true;
    afficher();
    const nomFichier = r.nomFichier || `${a.identifiantEc}.pdf`;
    $(`retour-carte-${id}`).innerHTML =
      `<div class="msg msg-succes">Attestation prête — <a href="${echapper(urlSure(r.url))}" target="_blank" rel="noopener" download="${echapper(nomFichier)}">télécharger ${echapper(nomFichier)}</a>, puis déposez-la sur la vente dans Salesforce.</div>`;
    // Document généré en mémoire : téléchargé tout de suite.
    if (/^data:/.test(r.url)) $(`retour-carte-${id}`).querySelector('a').click();
  } catch (e) {
    retour.innerHTML = '<div class="msg msg-erreur">Génération impossible — réessayez.</div>';
    bouton.disabled = false;
  }
}

$('sf-contenu').addEventListener('click', (e) => {
  const cp = e.target.closest('[data-copier]');
  if (cp) return copier(cp);
  const m = e.target.closest('[data-marquer]');
  if (m) return marquer(m);
  const at = e.target.closest('[data-attestation]');
  if (at) return attestation(at);
  const o = e.target.closest('[data-ouvrir]');
  if (o) {
    const id = parseInt(o.dataset.ouvrir, 10);
    actifId = actifId === id ? null : id;
    afficher();
    document.querySelector(`[data-ouvrir="${id}"]`)?.focus();
  }
});
document.querySelectorAll('[data-filtre]').forEach((b) =>
  b.addEventListener('click', () => {
    filtre = b.dataset.filtre;
    marqueesIci.clear();
    actifId = null;
    afficher();
  }),
);
$('sf-creneau').addEventListener('change', () => {
  creneauCle = $('sf-creneau').value;
  marqueesIci.clear();
  actifId = null;
  afficher();
});
$('sf-membre').addEventListener('change', () => {
  try {
    localStorage.setItem(CLE_MEMBRE, $('sf-membre').value);
  } catch (e) {}
  afficher();
});

/* ── Réglages ── */
function remplirReglages() {
  document.querySelectorAll('[data-reglage]').forEach((champ) => {
    const v = reglages[champ.dataset.reglage];
    champ.value = Array.isArray(v) ? v.join('\n') : v == null ? '' : String(v);
  });
}
$('btn-enregistrer-reglages').addEventListener('click', async function () {
  const valeurs = {};
  document.querySelectorAll('[data-reglage]').forEach((champ) => (valeurs[champ.dataset.reglage] = champ.value));
  this.disabled = true;
  try {
    const r = await poster({ action: 'salesforce-reglages', code: codeValide, reglages: valeurs });
    if (r.ok) {
      reglages = r.reglages;
      remplirReglages();
      afficher();
      $('retour-reglages').innerHTML = '<div class="msg msg-succes">Réglages enregistrés.</div>';
    } else
      $('retour-reglages').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible.')}</div>`;
  } catch (e) {
    $('retour-reglages').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible — réessayez.</div>';
  }
  this.disabled = false;
});

/* ── Chargement ── */
async function charger() {
  $('sf-contenu').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  try {
    const r = await poster({ action: 'salesforce-saisie', code: codeValide });
    if (!r.ok) {
      $('sf-contenu').innerHTML = `<p class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</p>`;
      return;
    }
    reglages = r.reglages || { equipe: [] };
    creneaux = r.creneaux || [];
    creneauCle = (creneaux.find((c) => c.appareils.some(aSaisir)) || creneaux[0] || {}).cle || '';
    remplirReglages();
    afficher();
    if (!reglages.operation && !(reglages.equipe || []).length) $('sf-reglages').open = true;
  } catch (e) {
    $('sf-contenu').innerHTML = '<p class="msg msg-erreur">Chargement impossible — réessayez.</p>';
  }
}

/* ── Identification (même session que la flotte : code structure de l'onglet) ── */
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
    if (!r.ok)
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    else if (!r.interne)
      $('retour-id-code').innerHTML =
        '<div class="msg msg-erreur">La saisie Salesforce est réservée aux structures Interne.</div>';
    else {
      codeValide = code;
      nomStructure = r.nom || '';
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-saisie').hidden = false;
      $('btn-deconnexion').hidden = false;
      await charger();
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
$('btn-deconnexion').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});
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
