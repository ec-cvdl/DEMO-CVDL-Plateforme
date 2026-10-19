/* Saisie Salesforce : les ventes de la flotte (structure Interne) regroupées par créneau (un
   jour dans un lieu de vente). Pour chaque créneau : « Saisir dans Salesforce » (favori
   CVDL › Salesforce, formulaires pré-remplis) ou, en secours, les valeurs à copier vente par
   vente. CVDL n'écrit rien dans Salesforce ; la vente est seulement marquée « saisie » dans la
   flotte. */

let codeValide = '';
let nomStructure = '';
let reglages = { equipe: [], lieux: [] };
let creneaux = [];
// Créneau dont les ventes sont affichées (clé) et vente dont les valeurs à copier sont ouvertes.
let deplie = '';
let copieId = null;
const CLE_MEMBRE = 'cvdl-salesforce-membre';
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const aSaisir = (a) => !a.saisieSalesforce;
const resteA = (c) => c.appareils.filter(aSaisir).length;
const sansLieu = (c) => !c.lieu && (reglages.lieux || []).length > 0;
const nomLieu = (c) => (c.lieu ? c.lieu.nom : sansLieu(c) ? 'Lieu à préciser' : 'Vente');
const creneauDe = (a) => creneaux.find((c) => c.appareils.includes(a)) || null;
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

/* ── Lignes à copier ── */
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

/* ── Affichage : une carte par créneau ── */
function afficher() {
  const ouverts = creneaux.filter(resteA);
  const faits = creneaux.filter((c) => !resteA(c));
  const total = ouverts.reduce((n, c) => n + resteA(c), 0);
  $('sf-resume').textContent = total
    ? `${pluriel(total, 'vente', 'ventes')} à saisir, sur ${pluriel(ouverts.length, 'créneau', 'créneaux')}`
    : creneaux.length
      ? 'Toutes les ventes sont saisies.'
      : '';
  const tuile = (ill, libelle, n, alerte) =>
    `<div class="flotte-tuile${alerte ? ' flotte-tuile-alerte' : ''}"><span data-ill="${ill}" class="ill"></span><div><div class="l">${libelle}</div><div class="n">${n}</div></div></div>`;
  const aPreciser = ouverts.filter(sansLieu).length;
  $('sf-tuiles').innerHTML = [
    tuile('tableur', 'Ventes à saisir', total),
    tuile('calendrier', 'Créneaux à saisir', ouverts.length),
    aPreciser
      ? tuile('aide', 'Lieux à préciser', aPreciser, true)
      : tuile('attestations', 'Créneaux déjà saisis', faits.length),
  ].join('');
  $('sf-creneaux').innerHTML = ouverts.length
    ? ouverts.map(carteCreneau).join('')
    : '<p class="sf-vide">Aucune vente à saisir. Les appareils remis avec une date de vente et une personne apparaissent ici.</p>';
  $('sf-faits').hidden = !faits.length;
  $('sf-faits-titre').textContent = `Créneaux déjà saisis (${faits.length})`;
  $('sf-creneaux-faits').innerHTML = faits.map(carteCreneau).join('');
  const zone = document.querySelector('.sf-envoi-texte');
  if (zone) zone.select();
}

function carteCreneau(c) {
  const reste = resteA(c);
  const ouvert = deplie === c.cle;
  const [jour, mois] = c.date.split('/');
  const action = !reste
    ? '<span class="sf-tag ok">Tout saisi</span>'
    : sansLieu(c)
      ? '<span class="sf-tag attention">Lieu à préciser</span>'
      : `<button type="button" class="btn btn-primary sf-cr-saisir" data-envoyer="${echapper(c.cle)}">Saisir dans Salesforce</button>`;
  const detail = reste
    ? `${pluriel(reste, 'vente', 'ventes')} à saisir${reste < c.appareils.length ? ` sur ${c.appareils.length}` : ''}`
    : pluriel(c.appareils.length, 'vente saisie', 'ventes saisies');
  return `<section class="sf-cr${ouvert ? ' ouvert' : ''}${sansLieu(c) ? ' sans-lieu' : ''}" aria-label="Créneau du ${echapper(c.date)}, ${echapper(nomLieu(c))}">
    <div class="sf-cr-tete">
      <span class="sf-cr-date" aria-hidden="true"><b>${echapper(jour)}</b>${MOIS[parseInt(mois, 10) - 1] || ''}</span>
      <div class="sf-cr-titre"><h3>${echapper(nomLieu(c))}</h3><p>${echapper(c.date)} · ${detail}</p></div>
      <div class="sf-cr-actions">${action}
        <button type="button" class="sf-cr-plus" data-deplier="${echapper(c.cle)}" aria-expanded="${ouvert}">${ouvert ? 'Masquer les ventes' : 'Voir les ventes'}</button></div>
    </div>
    ${envoi && envoi.cle === c.cle ? encartEnvoi(c) : ''}
    ${ouvert ? corpsCreneau(c) : ''}
  </section>`;
}

function corpsCreneau(c) {
  const r = reglages;
  const lieu = c.lieu;
  const operation =
    lieu && lieu.operationUrl
      ? `<a class="sf-lien" href="${echapper(urlSure(lieu.operationUrl))}" target="_blank" rel="noopener">Ouvrir l’Opération dans Salesforce ↗</a>`
      : '';
  return `<div class="sf-cr-corps">
    ${sansLieu(c) ? '<p class="sf-note">Ces ventes n’ont pas de lieu : choisissez-le sur chaque vente, elle rejoindra le créneau de ce lieu.</p>' : ''}
    <ul class="sf-ventes">${c.appareils.map((a) => ligneVente(a, c)).join('')}</ul>
    ${
      sansLieu(c)
        ? ''
        : `<details class="sf-manuel"><summary>Valeurs du créneau à copier (saisie à la main)</summary>
      ${operation}
      ${ligneCopie('Opération', lieu ? lieu.operation : '', 'l’opération', lieu ? 'à rechercher' : 'ajoutez un lieu de vente dans les réglages')}
      ${ligneCopie('Date', c.date, 'la date du créneau')}
      ${ligneCopie('Heure', r.heure, 'l’heure')}
      ${ligneChoix('Statut de la session', 'Planifiée', 'déjà proposé par défaut')}
      ${ligneCopie('Durée (heures)', r.duree == null ? '' : String(r.duree).replace('.', ','), 'la durée')}
      ${ligneCopie('Bénévoles (max)', r.benevoles == null ? '' : String(r.benevoles), 'le nombre de bénévoles')}
    </details>`
    }
  </div>`;
}

function ligneVente(a, c) {
  const fait = !aSaisir(a);
  const ouverte = copieId === a.id;
  return `<li class="sf-vente${fait ? ' fait' : ''}">
    <div class="sf-vente-ligne">
      <span class="sf-av${fait ? ' fait' : ''}" aria-hidden="true">${fait ? '✓' : echapper(initiales(a))}</span>
      <span class="sf-vente-id"><b>${echapper(nomCompletDe(a))}</b><small>${echapper(a.produit || a.modele || '')}${a.prix != null ? ` · ${echapper(montant(a.prix))} €` : ''}</small></span>
      ${selectLieu(a)}
      <span class="sf-tag${fait ? ' ok' : ''}">${fait ? 'Saisie' : 'À saisir'}</span>
    </div>
    <div class="sf-vente-actions">
      <button type="button" class="sf-lien-btn" data-copie="${a.id}" aria-expanded="${ouverte}">${ouverte ? 'Masquer les valeurs' : 'Valeurs à copier'}</button>
      <button type="button" class="sf-lien-btn" data-attestation="${a.id}">${a.attestationGeneree ? 'Attestation PDF' : 'Générer l’attestation'}</button>
      <button type="button" class="sf-lien-btn" data-marquer="${a.id}" data-valeur="${fait ? 'Non' : 'Oui'}">${fait ? 'Remettre à saisir' : 'Marquer saisie'}</button>
    </div>
    ${ouverte ? panneauCopie(a, c) : ''}
    <div class="sf-retour-carte" id="retour-carte-${a.id}" aria-live="polite"></div>
  </li>`;
}

/** Valeurs d'une vente dans l'ordre des formulaires Salesforce (saisie à la main). */
function panneauCopie(a, c) {
  const m = membre();
  const nom = nomCompletDe(a);
  const linux = a.linux === true ? 'Oui' : a.linux === false ? 'Non' : '';
  // « Vente suivie par » noté dans la fiche personne de la flotte, sinon la personne qui saisit.
  const suivi = a.suiviPar || m;
  const equipe = reglages.equipe || [];
  const contact = `
    ${ligneCopie('Prénom', a.prenom, 'le prénom')}
    ${ligneCopie('Nom', a.nom, 'le nom')}
    ${ligneCopie('Antenne', reglages.antenne, 'l’antenne', 'à rechercher')}
    ${ligneCopie('Fiche créée par', m, 'le nom de la personne qui crée la fiche', m ? 'à rechercher' : 'choisissez qui saisit, ci-dessus')}
    ${ligneCopie('Date de naissance', a.dateNaissance, 'la date de naissance')}
    ${ligneCopie('Prescripteur·trice', a.prescripteur, 'le prescripteur', 'à rechercher')}`;
  return `<div class="sf-copie">
    <label class="sf-membre">Vous saisissez en tant que
      <select class="input" data-membre>${
        equipe.length
          ? `<option value="">Choisir…</option>${equipe.map((n) => `<option value="${echapper(n)}" ${n === m ? 'selected' : ''}>${echapper(n)}</option>`).join('')}`
          : '<option value="">Ajoutez l’équipe dans les réglages</option>'
      }</select></label>
    <h4 class="sf-sous">Contact « Personne accompagnée »</h4>
    ${
      a.contactExistant
        ? `<details class="sf-contact-connu"><summary>Contact déjà dans Salesforce : rechercher <b>${echapper(nom)}</b></summary>${contact}</details>`
        : contact
    }
    <h4 class="sf-sous">Participant</h4>
    ${ligneInfo('Créneau', `le créneau du ${c.date.slice(0, 5)}`)}
    ${ligneChoix('Statut participant·e', 'Présent·e')}
    ${ligneCopie('Personne accompagnée', nom, 'le nom complet', 'à rechercher')}
    <h4 class="sf-sous">Vente (type ${echapper(a.typeVente || 'Ordinateur / Smartphone / Tablette')})</h4>
    ${ligneCopie('Date de vente', a.dateVente, 'la date de vente')}
    ${ligneChoix('Stock', a.stockId ? 'celui du produit' : '')}
    ${ligneCopie('Vente suivie par', suivi, 'le nom de la personne qui a suivi la vente', suivi ? 'à rechercher' : 'choisissez qui saisit, ci-dessus')}
    ${ligneCopie('Montant de la vente', montant(a.prix), 'le montant')}
    ${ligneCopie('Identifiant EC', a.identifiantEc, 'l’identifiant EC', a.attestationGeneree ? '' : 'attestation à générer')}
    ${ligneChoix('Marque', a.marque)}
    ${ligneCopie('Modèle', a.modele, 'le modèle')}
    ${ligneCopie('N° série / IMEI', a.numeroSerie, 'le numéro de série')}
    ${ligneChoix('Paiement complet', a.paiementComplet === false ? 'Non' : 'Oui')}
    ${ligneChoix('Linux', linux, linux ? (a.linuxNote ? '' : 'd’après le produit') : 'produit introuvable au catalogue : à vérifier')}
  </div>`;
}

/** Menu « Lieu de vente » d'une vente, quand la structure en a plusieurs. */
function selectLieu(a) {
  const lieux = reglages.lieux || [];
  if (lieux.length < 2) return '';
  return `<label class="sf-lieu-vente"><span class="sr-only">Lieu de vente de ${echapper(nomCompletDe(a))}</span>
    <select class="input" data-lieu-vente="${a.id}">
      <option value="" ${a.lieuId ? '' : 'selected'}>Lieu à préciser</option>
      ${lieux.map((l) => `<option value="${echapper(l.id)}" ${l.id === a.lieuId ? 'selected' : ''}>${echapper(l.nom)}</option>`).join('')}
    </select></label>`;
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

/** Coche (ou décoche) « saisie dans Salesforce » pour une vente, et prévient la flotte.
 *  Renvoie '' si c'est enregistré, sinon le message d'erreur. */
async function noterSaisie(a, saisie) {
  try {
    const r = await poster({
      action: 'flotte-modifier',
      code: codeValide,
      id: a.id,
      champ: 'saisieSalesforce',
      valeur: saisie ? 'Oui' : 'Non',
    });
    if (!r.ok) return r.erreur || 'Enregistrement impossible.';
  } catch (e) {
    return 'Enregistrement impossible — réessayez.';
  }
  a.saisieSalesforce = saisie;
  publierFlotte({ type: 'saisieSalesforce', id: a.id, valeur: saisie });
  return '';
}

async function marquer(bouton) {
  const id = parseInt(bouton.dataset.marquer, 10);
  const a = trouver(id);
  if (!a) return;
  bouton.disabled = true;
  const erreur = await noterSaisie(a, bouton.dataset.valeur === 'Oui');
  if (erreur) {
    $(`retour-carte-${id}`).innerHTML = `<div class="msg msg-erreur">${echapper(erreur)}</div>`;
    bouton.disabled = false;
    return;
  }
  const c = creneauDe(a);
  if (a.saisieSalesforce && c) {
    // Valeurs à copier ouvertes : on passe à la vente suivante encore à saisir.
    if (copieId === id) {
      const liste = c.appareils;
      const suivante = liste.slice(liste.indexOf(a) + 1).find(aSaisir) || liste.find(aSaisir);
      copieId = suivante ? suivante.id : null;
    }
    if (window.CvdlRetours && !resteA(c))
      CvdlRetours.action('saisie-salesforce', 'Recopier les ventes dans Salesforce, c’était simple ?');
  }
  // Le créneau reste ouvert, même s'il vient de passer dans « déjà saisis ».
  if (c) deplie = c.cle;
  afficher();
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

/* ── Présentation (premier passage) et premiers réglages ── */
const ETAPES_PRESENTATION = [
  {
    ill: 'calendrier',
    sur: 'Saisie Salesforce',
    titre: 'Vos ventes dans Salesforce, sans rien retaper',
    badge: 'Saisie Salesforce',
    texte:
      'CVDL prépare les ventes de votre flotte pour Salesforce. Avec le favori « CVDL › Salesforce », les formulaires s’ouvrent déjà remplis : vous vérifiez, vous enregistrez.',
  },
  {
    ill: 'calendrier',
    sur: 'Le principe',
    titre: 'Tout se fait par créneau',
    texte:
      'Un créneau, c’est une journée de vente dans un lieu. CVDL regroupe vos ventes d’après la date de vente et le lieu noté dans la fiche de la personne.',
    points: [
      'Le créneau se crée une seule fois dans Salesforce',
      'Puis les personnes, une par une : Contact, Participant, Vente',
    ],
  },
  {
    ill: 'cle',
    sur: 'Une seule fois',
    titre: 'Installez le favori',
    texte:
      'Glissez le bouton « CVDL › Salesforce » dans la barre des favoris de votre navigateur (Ctrl+Maj+B pour l’afficher). Il se trouve dans l’encart « Installer le favori », en haut de cette page.',
    points: [
      'Astuce : clic droit sur « Ouvrir Salesforce » › « Ouvrir dans un onglet scindé », pour avoir CVDL et Salesforce côte à côte',
    ],
  },
  {
    ill: 'commandes',
    sur: 'À chaque créneau',
    titre: 'Saisir un créneau',
    texte:
      'Sur la carte du créneau, cliquez sur « Saisir dans Salesforce ». Dans Salesforce, cliquez sur le favori, collez (Ctrl+V) puis Entrée : un panneau ouvre chaque formulaire déjà rempli.',
    parcours: ['Saisir dans Salesforce', 'Favori, Ctrl+V', 'Enregistrer', 'Formulaire suivant'],
    points: ['Déposez l’attestation sur chaque vente', 'Vous pouvez passer une personne ou arrêter à tout moment'],
  },
  {
    ill: 'attestations',
    sur: 'Pour finir',
    titre: 'Marquez les ventes saisies',
    texte:
      'De retour ici, cochez les ventes enregistrées dans Salesforce et cliquez sur « Marquer comme saisies ». Elles passent en « Saisies », ici et dans la gestion de flotte.',
  },
];
const clePresentation = () => `cvdl-presentation-salesforce-v1-${codeValide}`;

function presenter(forcer) {
  if (!window.CvdlEmbarquement || !CvdlEmbarquement.presenter) return;
  let vue = '';
  try {
    vue = localStorage.getItem(clePresentation()) || '';
  } catch (e) {}
  if (vue && !forcer) return;
  CvdlEmbarquement.presenter(ETAPES_PRESENTATION, {
    pil: `${nomStructure}${nomStructure ? ' · ' : ''}Saisie Salesforce`,
    derniere: 'Commencer ',
    memoriser: () => {
      try {
        localStorage.setItem(clePresentation(), 'vu');
      } catch (e) {}
    },
    avis: { parcours: 'presentation-salesforce', question: 'Cette présentation était-elle claire ?' },
  });
}
$('sf-revoir-presentation').addEventListener('click', () => presenter(true));

const CLE_FAVORI_INSTALLE = 'cvdl-favori-installe';
// Version du favori : à incrémenter quand salesforce-favori.js change. Un favori glissé avant
// garde l'ancien code (il est copié dans le lien) : « Installer le favori » revient à faire.
const VERSION_FAVORI = '7';

/** Premiers réglages (responsable) : ce qui manque pour que le favori remplisse tout. Masqué
 *  quand tout l'indispensable est fait. */
function afficherPremiersPas() {
  const lieux = reglages.lieux || [];
  const ventes = creneaux.flatMap((c) => c.appareils.filter(aSaisir).map((a) => ({ a, c })));
  const sansLieu = lieux.length ? ventes.filter(({ c }) => !c.lieu).length : 0;
  const sansStock = [...new Set(ventes.filter(({ a }) => a.typeVente && !a.stockId).map(({ a }) => a.produit))];
  let installe = '';
  try {
    installe = localStorage.getItem(CLE_FAVORI_INSTALLE) || '';
  } catch (e) {}
  const favori = installe === VERSION_FAVORI;
  const items = [
    {
      ok: favori,
      texte: installe
        ? 'Remplacer le favori « CVDL › Salesforce » par sa nouvelle version'
        : 'Installer le favori « CVDL › Salesforce »',
      action: '<button type="button" class="sf-lien-btn" data-pp="favori">C’est fait</button>',
    },
    { ok: !!reglages.antenneUrl, texte: 'Adresse de la fiche de votre antenne', action: 'reglages' },
    {
      ok: lieux.length > 0 && lieux.every((l) => l.operationUrl),
      texte: 'Vos lieux de vente, chacun avec l’adresse de son Opération',
      action: 'reglages',
    },
    {
      ok: lieux.length > 0 && lieux.every((l) => l.prescripteurUrl),
      texte: 'Le prescripteur·trice de chaque lieu',
      facultatif: true,
      action: 'reglages',
    },
    {
      ok: (reglages.equipe || []).length > 0,
      texte: 'Les noms de l’équipe, comme dans Salesforce',
      action: 'reglages',
    },
    {
      ok: !sansLieu,
      texte: 'Un lieu pour chaque vente à saisir',
      detail: sansLieu ? `${pluriel(sansLieu, 'vente', 'ventes')} « lieu à préciser »` : '',
      action: '<button type="button" class="sf-lien-btn" data-pp="lieu">Préciser</button>',
    },
    {
      ok: !sansStock.length,
      texte: 'Le stock Salesforce des produits vendus',
      detail: sansStock.length ? `À compléter dans le catalogue de l’admin : ${sansStock.join(', ')}` : '',
    },
  ];
  const indispensables = items.filter((i) => !i.facultatif);
  const faits = indispensables.filter((i) => i.ok).length;
  if (faits === indispensables.length) {
    $('sf-premiers-pas').innerHTML = '';
    return;
  }
  const bouton = (i) =>
    i.ok
      ? ''
      : i.action === 'reglages'
        ? '<button type="button" class="sf-lien-btn" data-pp="reglages">Ouvrir les réglages</button>'
        : i.action || '';
  $('sf-premiers-pas').innerHTML = `<section class="sf-bloc sf-premiers" aria-labelledby="sf-premiers-titre">
    <h2 id="sf-premiers-titre">Avant votre première saisie <span class="sf-h2-note">${faits}/${indispensables.length} prêts</span></h2>
    <ul class="sf-premiers-liste">${items
      .map(
        (i) => `<li class="${i.ok ? 'ok' : ''}"><span class="sf-pp-etat" aria-hidden="true">${i.ok ? '✓' : ''}</span>
        <span><span class="sr-only">${i.ok ? 'Fait : ' : 'À faire : '}</span>${echapper(i.texte)}${i.facultatif ? ' <small>facultatif</small>' : ''}${i.detail ? `<small class="sf-pp-detail">${echapper(i.detail)}</small>` : ''}</span>${bouton(i)}</li>`,
      )
      .join('')}</ul>
  </section>`;
}
$('sf-premiers-pas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pp]');
  if (!b) return;
  if (b.dataset.pp === 'favori') {
    try {
      localStorage.setItem(CLE_FAVORI_INSTALLE, VERSION_FAVORI);
    } catch (e) {}
    afficherPremiersPas();
    return;
  }
  if (b.dataset.pp === 'lieu') {
    // Premier créneau « lieu à préciser » qui a encore des ventes à saisir.
    const c = creneaux.find((x) => sansLieu(x) && resteA(x));
    if (!c) return;
    deplie = c.cle;
    copieId = null;
    afficher();
    document.querySelector('.sf-cr.ouvert')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return;
  }
  $('sf-reglages').open = true;
  $('sf-reglages').scrollIntoView({ block: 'start', behavior: 'smooth' });
});

/* ── Favori « CVDL › Salesforce » ── */
// Créneau envoyé au favori : { cle, ids } (ventes à cocher « saisies » une fois terminé).
let envoi = null;

/** Lien du favori : le code de salesforce-favori.js en adresse javascript:, à glisser dans la
 *  barre des favoris (il ne s'exécute pas ici). */
async function preparerFavori() {
  const lien = $('sf-favori-lien');
  lien.addEventListener('click', (e) => {
    e.preventDefault();
    alerteCvdl('Glissez ce bouton dans la barre des favoris : il s’utilise dans Salesforce.');
  });
  try {
    const r = await fetch(`salesforce-favori.js?v=${VERSION_FAVORI}`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    lien.href = 'javascript:' + encodeURIComponent(await r.text());
  } catch (e) {
    lien.replaceWith(document.createTextNode('(favori indisponible pour le moment, rechargez la page)'));
  }
}

/** Données du créneau pour le favori : « CVDL1: » + JSON en base64 (UTF-8). */
function texteFavori(paquet) {
  const octets = new TextEncoder().encode(JSON.stringify(paquet));
  let binaire = '';
  octets.forEach((o) => (binaire += String.fromCharCode(o)));
  return `CVDL1:${btoa(binaire)}`;
}

async function envoyerCreneau(cle) {
  const c = creneaux.find((x) => x.cle === cle);
  if (!c || !c.favori) return;
  const ventes = c.favori.ventes.filter((v) => {
    const a = trouver(v.id);
    return a && aSaisir(a);
  });
  if (!ventes.length) return;
  // `retour` : cette page, que le favori rouvre (petite fenêtre) pour confirmer la saisie.
  const texte = texteFavori({ ...c.favori, ventes, retour: new URL('saisie-salesforce.html', location.href).href });
  let copie = true;
  try {
    await navigator.clipboard.writeText(texte);
  } catch (e) {
    copie = false;
  }
  envoi = { cle: c.cle, ids: ventes.map((v) => v.id), texte: copie ? '' : texte };
  afficher();
  const carte = document.querySelector('.sf-envoi');
  if (carte) carte.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/** Encart « saisie en cours dans Salesforce » dans la carte du créneau : marche à suivre, puis
 *  cases des ventes à marquer saisies. Texte à copier affiché si la copie automatique a échoué. */
function encartEnvoi() {
  const ventes = envoi.ids.map(trouver).filter(Boolean);
  return `<div class="sf-envoi" aria-label="Saisie en cours dans Salesforce">
    ${
      envoi.texte
        ? `<p>Copiez ce texte (Ctrl+C) :</p><textarea class="input sf-envoi-texte" readonly rows="3" aria-label="Saisie à coller dans le favori">${echapper(envoi.texte)}</textarea>`
        : `<p class="sf-ok">✓ Créneau copié (${pluriel(ventes.length, 'personne', 'personnes')}).</p>`
    }
    <ol class="sf-favori-etapes">
      <li>Dans Salesforce, cliquez sur le favori <b>CVDL › Salesforce</b>.</li>
      <li>Collez (Ctrl+V) puis Entrée.</li>
      <li>Enregistrez chaque formulaire dans Salesforce : le suivant s’ouvre tout seul.</li>
      <li>À la fin, <b>« Confirmer dans CVDL »</b> dans l’encart du favori : cette page se met à jour toute seule.</li>
    </ol>
    <p class="sf-attente"><span class="spinner-inline"></span>En attente de la confirmation du favori…</p>
    <details class="sf-manuel">
      <summary>Le favori n’a pas pu confirmer ? Marquer à la main</summary>
      <p class="sf-note">Cochez seulement les ventes enregistrées dans Salesforce.</p>
      <div class="sf-envoi-ventes">${ventes
        .map(
          (a) =>
            `<label class="pp-case"><input type="checkbox" data-envoi-vente="${a.id}" ${aSaisir(a) ? '' : 'disabled checked'}><span>${echapper(nomCompletDe(a))}${aSaisir(a) ? '' : ' — déjà marquée'}</span></label>`,
        )
        .join('')}</div>
      <div class="sf-actions"><button type="button" class="btn btn-secondary" data-envoi="marquer">Marquer comme saisies</button></div>
    </details>
    <button type="button" class="sf-lien-btn" data-envoi="annuler">Annuler cette saisie</button>
    <div id="retour-envoi" aria-live="polite"></div>
  </div>`;
}

async function marquerEnvoi(bouton) {
  const ids = [...document.querySelectorAll('[data-envoi-vente]:checked')].map((c) =>
    parseInt(c.dataset.envoiVente, 10),
  );
  bouton.disabled = true;
  const erreurs = [];
  for (const id of ids) {
    const a = trouver(id);
    const erreur = a ? await noterSaisie(a, true) : '';
    if (erreur) erreurs.push(`${nomCompletDe(a)} : ${erreur}`);
  }
  if (erreurs.length) {
    afficher();
    $('retour-envoi').innerHTML = `<div class="msg msg-erreur">${erreurs.map(echapper).join('<br>')}</div>`;
    return;
  }
  envoi = null;
  afficher();
  if (window.CvdlRetours) CvdlRetours.action('saisie-salesforce', 'La saisie avec le favori, c’était simple ?');
}

/** Change le lieu d'une vente : elle rejoint le créneau de ce lieu, qu'on affiche. */
async function changerLieu(select) {
  const id = parseInt(select.dataset.lieuVente, 10);
  select.disabled = true;
  try {
    const r = await poster({ action: 'flotte-modifier', code: codeValide, id, champ: 'sfLieu', valeur: select.value });
    if (!r.ok) {
      $(`retour-carte-${id}`).innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible.')}</div>`;
      select.disabled = false;
      return;
    }
  } catch (e) {
    $(`retour-carte-${id}`).innerHTML = '<div class="msg msg-erreur">Enregistrement impossible — réessayez.</div>';
    select.disabled = false;
    return;
  }
  const c = creneauDe(trouver(id));
  const jour = c ? c.cle.split('|')[0] : '';
  await charger({ deplie: `${jour}|${select.value}`, copie: copieId === id ? id : null });
}

$('sf-liste').addEventListener('change', (e) => {
  const s = e.target.closest('[data-lieu-vente]');
  if (s) return changerLieu(s);
  if (e.target.closest('[data-membre]')) {
    try {
      localStorage.setItem(CLE_MEMBRE, e.target.value);
    } catch (err) {}
    afficher();
  }
});
$('sf-liste').addEventListener('click', (e) => {
  const cp = e.target.closest('[data-copier]');
  if (cp) return copier(cp);
  const env = e.target.closest('[data-envoyer]');
  if (env) return envoyerCreneau(env.dataset.envoyer);
  const ev = e.target.closest('[data-envoi]');
  if (ev) {
    if (ev.dataset.envoi === 'marquer') return marquerEnvoi(ev);
    envoi = null;
    return afficher();
  }
  const m = e.target.closest('[data-marquer]');
  if (m) return marquer(m);
  const at = e.target.closest('[data-attestation]');
  if (at) return attestation(at);
  const d = e.target.closest('[data-deplier]');
  if (d) {
    deplie = deplie === d.dataset.deplier ? '' : d.dataset.deplier;
    copieId = null;
    afficher();
    document.querySelector(`[data-deplier="${CSS.escape(d.dataset.deplier)}"]`)?.focus();
    return;
  }
  const o = e.target.closest('[data-copie]');
  if (o) {
    const id = parseInt(o.dataset.copie, 10);
    copieId = copieId === id ? null : id;
    afficher();
    document.querySelector(`[data-copie="${id}"]`)?.focus();
  }
});

/* ── Réglages ── */
function ligneLieu(l, n) {
  return `<div class="sf-lieu" data-lieu="${echapper(l.id || '')}" role="group" aria-label="Lieu ${n}">
    <label>Nom du lieu<input type="text" class="input" data-lieu-champ="nom" maxlength="200" value="${echapper(l.nom || '')}" placeholder="Antenne de Bourges"></label>
    <label>Opération dans Salesforce<input type="text" class="input" data-lieu-champ="operation" maxlength="200" value="${echapper(l.operation || '')}"></label>
    <label class="large">Adresse de l’Opération<input type="url" class="input" data-lieu-champ="operationUrl" value="${echapper(l.operationUrl || '')}" placeholder="https://emmaus-connect.lightning.force.com/lightning/r/…"></label>
    <label class="large">Adresse de la fiche du prescripteur·trice (facultatif)<input type="url" class="input" data-lieu-champ="prescripteurUrl" value="${echapper(l.prescripteurUrl || '')}" placeholder="https://emmaus-connect.lightning.force.com/lightning/r/Contact/…"></label>
    <button type="button" class="sf-lieu-retirer" data-retirer-lieu aria-label="Retirer le lieu ${n}">Retirer</button>
  </div>`;
}
function lieuxSaisis() {
  return [...document.querySelectorAll('#sf-lieux .sf-lieu')].map((ligne) => {
    const l = { id: ligne.dataset.lieu };
    ligne.querySelectorAll('[data-lieu-champ]').forEach((c) => (l[c.dataset.lieuChamp] = c.value));
    return l;
  });
}
function afficherLieux(lieux) {
  const liste = lieux.length ? lieux : [{}];
  $('sf-lieux').innerHTML = liste.map((l, i) => ligneLieu(l, i + 1)).join('');
}
function remplirReglages() {
  document.querySelectorAll('[data-reglage]').forEach((champ) => {
    const v = reglages[champ.dataset.reglage];
    champ.value = Array.isArray(v) ? v.join('\n') : v == null ? '' : String(v);
  });
  afficherLieux(reglages.lieux || []);
}
$('btn-ajouter-lieu').addEventListener('click', () => {
  const lieux = lieuxSaisis();
  afficherLieux([...lieux, {}]);
  const champs = document.querySelectorAll('#sf-lieux [data-lieu-champ="nom"]');
  champs[champs.length - 1].focus();
});
$('sf-lieux').addEventListener('click', (e) => {
  const b = e.target.closest('[data-retirer-lieu]');
  if (!b) return;
  b.closest('.sf-lieu').remove();
  if (!document.querySelector('#sf-lieux .sf-lieu')) afficherLieux([]);
});
$('btn-enregistrer-reglages').addEventListener('click', async function () {
  const valeurs = {};
  document.querySelectorAll('[data-reglage]').forEach((champ) => (valeurs[champ.dataset.reglage] = champ.value));
  valeurs.lieux = lieuxSaisis();
  this.disabled = true;
  try {
    const r = await poster({ action: 'salesforce-reglages', code: codeValide, reglages: valeurs });
    if (r.ok) {
      reglages = r.reglages;
      // Les créneaux dépendent des lieux : on recharge les ventes.
      await charger();
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
/** Charge les ventes. `garder` : créneau à garder ouvert et vente dont les valeurs à copier
 *  restent affichées, s'ils existent encore. */
async function charger(garder = {}) {
  $('sf-creneaux').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  try {
    const r = await poster({ action: 'salesforce-saisie', code: codeValide });
    if (!r.ok) {
      $('sf-creneaux').innerHTML = `<p class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</p>`;
      return;
    }
    reglages = r.reglages || { equipe: [], lieux: [] };
    creneaux = r.creneaux || [];
    const existe = (cle) => creneaux.some((c) => c.cle === cle);
    deplie = existe(garder.deplie) ? garder.deplie : existe(deplie) ? deplie : '';
    copieId = garder.copie || null;
    if (envoi && !existe(envoi.cle)) envoi = null;
    // Saisie confirmée par le favori : plus rien à attendre pour ce créneau.
    const faites = envoi ? envoi.ids.filter((id) => trouver(id) && !aSaisir(trouver(id))).length : 0;
    if (faites) {
      const restent = envoi.ids.length - faites;
      envoi = null;
      $('sf-confirme').innerHTML =
        `<div class="msg msg-succes">${pluriel(faites, 'vente confirmée', 'ventes confirmées')} depuis Salesforce${restent ? ` · ${pluriel(restent, 'reste', 'restent')} à saisir` : ''}.</div>`;
    }
    remplirReglages();
    afficher();
    afficherPremiersPas();
    if (!(reglages.lieux || []).length && !(reglages.equipe || []).length) $('sf-reglages').open = true;
  } catch (e) {
    $('sf-creneaux').innerHTML = '<p class="msg msg-erreur">Chargement impossible — réessayez.</p>';
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
    const r = await lireApi({ action: 'check', code });
    if (!r.ok)
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    else if (!r.interne)
      $('retour-id-code').innerHTML =
        '<div class="msg msg-erreur">La saisie Salesforce est réservée aux structures Interne.</div>';
    else {
      codeValide = code;
      nomStructure = r.nom || '';
      $('sf-structure').textContent = nomStructure;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-saisie').hidden = false;
      $('btn-deconnexion').hidden = false;
      await charger();
      presenter(false);
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
  oublierCodeStructure();
  location.reload();
});
/* ── Confirmation par le favori ──
   Fin de saisie dans Salesforce : le favori ouvre cette page dans une petite fenêtre, avec le
   jeton de la saisie et les ventes enregistrées après « # » (jamais envoyés au serveur web). Elle
   les marque saisies (/salesforce-confirmer, sans code), prévient l'onglet CVDL ouvert, puis se
   ferme. */
const canal = 'BroadcastChannel' in window ? new BroadcastChannel('cvdl-saisie-salesforce') : null;
function lireConfirmation() {
  const m = location.hash.match(/^#confirmer=(.+)$/);
  if (!m) return null;
  history.replaceState(null, '', location.pathname);
  try {
    const octets = Uint8Array.from(atob(decodeURIComponent(m[1])), (c) => c.charCodeAt(0));
    const r = JSON.parse(new TextDecoder().decode(octets));
    return r && r.jeton && Array.isArray(r.ids) ? r : null;
  } catch (e) {
    return null;
  }
}
async function confirmerDepuisFavori(c) {
  document.documentElement.classList.remove('deja-identifie');
  $('etape-code').hidden = true;
  $('etape-confirmer').hidden = false;
  const r = await appelApi({ action: 'salesforce-confirmer', jeton: c.jeton, ids: c.ids }, { methode: 'POST' }).catch(
    () => ({ ok: false, erreur: 'Connexion impossible — marquez les ventes depuis CVDL.' }),
  );
  if (!r.ok) {
    $('sf-confirmer-titre').textContent = 'Confirmation impossible';
    $('sf-confirmer-texte').textContent = r.erreur || 'Marquez les ventes depuis CVDL.';
    $('etape-confirmer').classList.add('erreur');
    return;
  }
  $('sf-confirmer-titre').textContent = `${pluriel(r.marquees, 'vente marquée saisie', 'ventes marquées saisies')} ✓`;
  $('sf-confirmer-texte').textContent = 'CVDL est à jour. Cette fenêtre se ferme…';
  if (canal) canal.postMessage({ type: 'confirme' });
  setTimeout(() => {
    window.close();
    $('sf-confirmer-texte').textContent = 'CVDL est à jour. Vous pouvez fermer cette fenêtre.';
  }, 1800);
}
// Onglet CVDL ouvert pendant la saisie : rechargé dès que le favori a confirmé, ou au retour.
const rafraichir = () => {
  if (codeValide && envoi) charger({ deplie });
};
if (canal) canal.addEventListener('message', (e) => e.data && e.data.type === 'confirme' && rafraichir());
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && rafraichir());

const confirmation = lireConfirmation();
if (confirmation) confirmerDepuisFavori(confirmation);
else {
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
  preparerFavori();
}
