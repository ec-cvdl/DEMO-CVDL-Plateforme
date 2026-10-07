const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function posterAvecProgression(data, onProgression) {
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
/* ─── Analytique comportementale : identifiant distinct pour bien séparer les tickets ouverts
   par une structure de ceux ouverts par un bénéficiaire (voir sav-beneficiaire.html). ─── */
const analytique = { etapes: [], etapeActuelle: null, debutEtape: Date.now(), erreursEtapeActuelle: 0 };
function noterChangementEtape(nomEtape) {
  if (analytique.etapeActuelle) {
    analytique.etapes.push({
      etape: analytique.etapeActuelle,
      tempsMs: Date.now() - analytique.debutEtape,
      erreurs: analytique.erreursEtapeActuelle,
    });
  }
  analytique.etapeActuelle = nomEtape;
  analytique.debutEtape = Date.now();
  analytique.erreursEtapeActuelle = 0;
}
function envoyerAnalytique(termine) {
  if (analytique.etapeActuelle) {
    analytique.etapes.push({
      etape: analytique.etapeActuelle,
      tempsMs: Date.now() - analytique.debutEtape,
      erreurs: analytique.erreursEtapeActuelle,
    });
    analytique.etapeActuelle = null;
  }
  const donnees = {
    action: 'analytique-enregistrer',
    formulaire: 'sav-structure',
    code: etat.code || '',
    termine: !!termine,
    etapeAbandon: termine ? '' : analytique.etapes.length ? analytique.etapes[analytique.etapes.length - 1].etape : '',
    etapes: analytique.etapes,
  };
  try {
    if (termine) poster(donnees).catch(function () {});
    else navigator.sendBeacon(API, new Blob([JSON.stringify(donnees)], { type: 'text/plain;charset=utf-8' }));
  } catch (e) {}
}
window.addEventListener('beforeunload', function () {
  if (!etat.code) return;
  if (document.querySelector('.confirmation') && !document.querySelector('.confirmation').hidden) return;
  if (etat.depannageResolu) return; // réglé grâce au dépannage : pas un abandon
  envoyerAnalytique(false);
});

function afficherMsg(cible, texte, type) {
  $(cible).innerHTML = texte ? '<div class="msg msg-' + type + '">' + texte + '</div>' : '';
  if (texte && type === 'erreur') analytique.erreursEtapeActuelle++;
}
/** Champ "responsable" scindé en Prénom/NOM (comme commande.html) —
 *  ces deux fonctions font le pont avec le champ unique attendu par le backend. */
// Le prénom, lui, ne passe en majuscule que sur la première lettre de chaque mot (pas tout le
// champ comme le nom) — même règle que commande.html, pour distinguer les deux côté back rien
// qu'en lisant la casse. Gère les prénoms composés, avec tiret ou espace.
function capitaliserPrenom(valeur) {
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
}
function remplirResponsableSav(valeur) {
  const mots = String(valeur || '')
    .trim()
    .split(/\s+/);
  $('responsable-sav-nom').value = mots.length > 1 ? mots.pop().toUpperCase() : '';
  $('responsable-sav-prenom').value = capitaliserPrenom(mots.join(' '));
}
function lireResponsableSav() {
  const prenom = $('responsable-sav-prenom').value.trim();
  const nom = $('responsable-sav-nom').value.trim();
  return [prenom, nom].filter(Boolean).join(' ');
}
$('responsable-sav-nom').addEventListener('input', function (e) {
  if (e.isComposing) return;
  const position = this.selectionStart;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(position, position);
});
$('responsable-sav-nom').addEventListener('compositionend', function () {
  const position = this.selectionStart;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(position, position);
});
$('responsable-sav-prenom').addEventListener('input', function (e) {
  if (e.isComposing) return;
  const position = this.selectionStart;
  this.value = capitaliserPrenom(this.value);
  this.setSelectionRange(position, position);
});
$('responsable-sav-prenom').addEventListener('compositionend', function () {
  const position = this.selectionStart;
  this.value = capitaliserPrenom(this.value);
  this.setSelectionRange(position, position);
});

/* Icônes de symptôme — même principe de reconnaissance par mot-clé que côté admin */
const ICONES_SYMPTOME = {
  ecran:
    '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M9 8l6 6M15 8l-6 6" opacity=".8"/>',
  batterie:
    '<rect x="2" y="7" width="17" height="10" rx="2"/><line x1="22" y1="10.5" x2="22" y2="13.5"/><path d="M11 9.5 8 13h2.3l-.8 3 3.5-4h-2.3z" fill="currentColor" stroke="none" opacity=".85"/>',
  clavier:
    '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M20 10h.01M7 14h10" opacity=".7"/>',
  souris: '<rect x="7.5" y="2.5" width="9" height="15" rx="4.5"/><line x1="12" y1="2.5" x2="12" y2="9"/>',
  son: '<polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"/><line x1="17.5" y1="9" x2="23" y2="15" opacity=".8"/><line x1="23" y1="9" x2="17.5" y2="15" opacity=".8"/>',
  internet:
    '<line x1="1.5" y1="1.5" x2="22.5" y2="22.5" opacity=".85"/><path d="M16.7 11a11 11 0 0 1 2.3 1.5" opacity=".4"/><path d="M5 12.5a11 11 0 0 1 5.2-2.4" opacity=".4"/><path d="M10.7 5a16 16 0 0 1 11.9 4" opacity=".25"/><path d="M1.4 9a16 16 0 0 1 4.7-2.9" opacity=".25"/><path d="M8.5 16.1a6 6 0 0 1 7 0" opacity=".6"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  virus:
    '<rect x="8" y="6" width="8" height="14" rx="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="8" y1="10" x2="4" y2="10"/><line x1="8" y1="14" x2="4" y2="14"/><line x1="16" y1="10" x2="20" y2="10"/><line x1="16" y1="14" x2="20" y2="14"/><line x1="9.5" y1="6.5" x2="7.5" y2="4.5"/><line x1="14.5" y1="6.5" x2="16.5" y2="4.5"/><line x1="9.5" y1="17.5" x2="7.5" y2="19.5"/><line x1="14.5" y1="17.5" x2="16.5" y2="19.5"/>',
  mise_a_jour:
    '<path d="M21 3v6h-6" opacity=".9"/><path d="M3 12a9 9 0 0 1 15-6.7L21 9"/><path d="M3 21v-6h6" opacity=".9"/><path d="M21 12a9 9 0 0 1-15 6.7L3 15"/>',
  lenteur:
    '<path d="M4 18a8 8 0 1 1 16 0"/><line x1="12" y1="18" x2="8.3" y2="14.3"/><circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="2" y2="18" opacity=".5"/><line x1="20" y1="18" x2="22" y2="18" opacity=".5"/>',
  generique_sav:
    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
};
function iconeSymptome(texte) {
  const t = String(texte || '').toLowerCase();
  if (/[ée]cran/.test(t)) return ICONES_SYMPTOME.ecran;
  if (/(charge|batterie|alimentation)/.test(t)) return ICONES_SYMPTOME.batterie;
  if (/clavier/.test(t)) return ICONES_SYMPTOME.clavier;
  if (/souris/.test(t)) return ICONES_SYMPTOME.souris;
  if (/\bsons?\b|audio|hauts?[-\s]?parleurs?|micro/.test(t)) return ICONES_SYMPTOME.son;
  if (/virus|malware|infect[ée]/.test(t)) return ICONES_SYMPTOME.virus;
  if (/mise.{0,3}[àa].{0,3}jour|update/.test(t)) return ICONES_SYMPTOME.mise_a_jour;
  if (/internet|wifi|wi-fi|r[ée]seau|connexion/.test(t)) return ICONES_SYMPTOME.internet;
  if (/lent|lenteur|rame|bloque|fige|plante/.test(t)) return ICONES_SYMPTOME.lenteur;
  return ICONES_SYMPTOME.generique_sav;
}
/** Symptôme → illustration (style du portail). La clé est retrouvée à partir de l'icône
 *  choisie par iconeSymptome() ; « ne s'allume plus » a sa propre illustration. */
function svgIconeSymptome(texte) {
  if (window.illustrationCvdl) {
    let cle = window.cleSymptomeCvdl
      ? window.cleSymptomeCvdl(texte)
      : /allum|d[ée]marr|power|mort/.test(String(texte || '').toLowerCase())
        ? 'alimentation'
        : Object.keys(ICONES_SYMPTOME).find((k) => ICONES_SYMPTOME[k] === iconeSymptome(texte)) || 'generique_sav';
    return '<span class="icone-symptome ill-symptome">' + window.illustrationCvdl('sym-' + cle, 52) + '</span>';
  }
  return svgIconeSymptomeTrait(texte);
}
function svgIconeSymptomeTrait(texte) {
  return (
    '<svg class="icone-symptome" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    iconeSymptome(texte) +
    '</svg>'
  );
}

/* Machine à étapes */
let etapes = ['identification', 'symptome', 'materiel', 'details', 'envoi'];
let indexEtape = 0;

const etat = {
  code: '',
  nomStructure: '',
  numeroSerie: '',
  symptome: '',
  commentaire: '',
  lienVideo: '',
  email: '',
  dateAchat: '',
  nomBeneficiaire: '',
};

function majProgression() {
  const i = etapes.indexOf(etapes[indexEtape]);
  $('compte-etapes').textContent = `${i + 1}/${etapes.length}`;
  const NOMS_ETAPES_SAV = {
    depannage: 'Dépannage',
    identification: 'Structure',
    symptome: 'Problème',
    materiel: 'Appareil',
    details: 'Précisions',
    envoi: 'Envoi',
    nom: 'Personne',
    personne: 'Personne',
    contact: 'Contact',
  };
  $('progression').innerHTML = etapes
    .map(function (cle, idx) {
      const cls = idx < i ? 'fait' : idx === i ? 'cours' : 'avenir';
      return (
        (idx ? '<span class="cm-lien"></span>' : '') +
        '<div class="cm-etape ' +
        cls +
        '"' +
        (cls === 'cours' ? ' aria-current="step"' : '') +
        '><span class="cm-pt">' +
        (cls === 'fait' ? '✓' : idx + 1) +
        '</span><b>' +
        (NOMS_ETAPES_SAV[cle] || '') +
        '</b></div>'
      );
    })
    .join('');
}

function afficherEtape(nom) {
  $$('.etape').forEach(function (s) {
    s.hidden = s.dataset.etape !== nom;
  });
  majProgression();

  const boutonRetour = document.querySelector('.etape[data-etape="' + nom + '"] [data-retour]');
  if (boutonRetour) boutonRetour.hidden = indexEtape === 0;

  const plaque = $('plaque-persistante');
  if (etat.nomStructure && nom !== 'identification') {
    plaque.innerHTML =
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M20 6 9 17l-5-5"/></svg> ' +
      echapper(etat.nomStructure);
    plaque.hidden = false;
  } else {
    plaque.hidden = true;
  }

  const champPrincipal = document.querySelector('.etape[data-etape="' + nom + '"] .input');
  if (champPrincipal)
    setTimeout(function () {
      champPrincipal.focus();
    }, 50);

  if (nom === 'materiel') rendreTableauMaterielSav();
}

function allerA(nomEtape) {
  const idx = etapes.indexOf(nomEtape);
  if (idx === -1) return;
  indexEtape = idx;
  noterChangementEtape(nomEtape);
  afficherEtape(nomEtape);
}
function suivant() {
  if (indexEtape < etapes.length - 1) allerA(etapes[indexEtape + 1]);
  if (etapes[indexEtape] === 'envoi') majRecapSav();
}
function precedent() {
  if (indexEtape > 0) allerA(etapes[indexEtape - 1]);
}
$$('[data-retour]').forEach(function (b) {
  b.addEventListener('click', precedent);
});

/* Étape 1 : identification (code structure uniquement) */
let symptomesPrecharges = null;
function prechargerSymptomesEnArrierePlan() {
  jsonp({ action: 'sav-symptomes' })
    .then((r) => {
      if (r.ok) symptomesPrecharges = r.symptomes;
    })
    .catch(() => {});
}

let appareilsFlottePrecharges = [];
function prechargerFlotteEnArrierePlan(code) {
  jsonp({ action: 'flotte-lister', code })
    .then((r) => {
      if (r.ok) {
        appareilsFlottePrecharges = r.appareils;
        rendreTableauMaterielSav();
      }
    })
    .catch(() => {});
}

async function verifierCodeSav() {
  const code = $('id-code').value.trim();
  if (!code) {
    afficherMsg('retour-id-code', 'Saisissez votre code structure.', 'erreur');
    return false;
  }
  $('btn-verifier-code').disabled = true;
  $('btn-verifier-code').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  afficherMsg('retour-id-code', '', 'info');
  prechargerSymptomesEnArrierePlan();
  let succes = false;
  try {
    const r = await jsonp({ action: 'check', code: code });
    if (r.ok) {
      etat.code = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      etat.nomStructure = r.nom;
      etat.email = r.email || '';
      if (r.responsableHabituel) remplirResponsableSav(r.responsableHabituel);
      prechargerFlotteEnArrierePlan(code);
      suivant();
      succes = true;
    } else {
      afficherMsg('retour-id-code', r.erreur || 'Code invalide.', 'erreur');
    }
  } catch (e) {
    afficherMsg('retour-id-code', 'Connexion impossible. Réessayez.', 'erreur');
  }
  $('btn-verifier-code').disabled = false;
  $('btn-verifier-code').textContent = 'Continuer';
  document.documentElement.classList.remove('deja-identifie');
  const voilePrecoce = $('voile-verification-precoce');
  if (voilePrecoce) voilePrecoce.style.display = 'none';
  return succes;
}
$('btn-verifier-code').addEventListener('click', verifierCodeSav);

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    // On suppose l'identification déjà faite (portail-structure.html l'a déjà vérifiée) : pas
    // comptée, pas de bouton "Retour" interne — seulement "Retour portail" en haut de page.
    etapes = etapes.filter((e) => e !== 'identification');
    indexEtape = -1;
    $('id-code').value = codeMemorise;
    verifierCodeSav().then((succes) => {
      if (!succes) {
        // Code invalide/expiré malgré la mémorisation : on revient à une vraie étape
        // d'identification, comptée normalement.
        etapes = ['identification', 'symptome', 'materiel', 'details', 'envoi'];
        indexEtape = 0;
        afficherEtape('identification');
      }
    });
  }
} catch (e) {}

/* Étape 2 : symptôme + numéro de série */
async function chargerSymptomes() {
  if (symptomesPrecharges) {
    afficherSymptomes(symptomesPrecharges);
    return;
  }
  try {
    const r = await jsonp({ action: 'sav-symptomes' });
    if (r.ok) afficherSymptomes(r.symptomes);
  } catch (e) {
    afficherMsg('retour-symptome', 'Impossible de charger les symptômes.', 'erreur');
  }
}
/* Famille de couleur par symptôme — même reconnaissance par mot-clé que iconeSymptome(),
   pour que les cartes soient visuellement représentatives (rouge = matériel HS, jaune =
   alimentation/réseau, bleu = logiciel, turquoise = périphérique). */
function familleCouleurSymptome(texte) {
  const t = String(texte || '').toLowerCase();
  if (/[ée]cran/.test(t) || /virus|malware|infect[ée]/.test(t))
    return { bg: 'var(--color-symptome-danger-100)', fg: 'var(--color-symptome-danger-700)' };
  if (/(charge|batterie|alimentation)/.test(t) || /internet|wifi|wi-fi|r[ée]seau|connexion/.test(t))
    return { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-800)' };
  if (/mise.{0,3}[àa].{0,3}jour|update/.test(t) || /lent|lenteur|rame|bloque|fige|plante/.test(t))
    return { bg: 'var(--color-symptome-info-100)', fg: 'var(--color-symptome-info-700)' };
  if (/clavier/.test(t) || /souris/.test(t) || /\bsons?\b|audio|hauts?[-\s]?parleurs?|micro/.test(t))
    return { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)' };
  return null;
}
function afficherSymptomes(symptomes) {
  $('grille-symptomes').innerHTML = symptomes
    .map(function (s) {
      const famille = familleCouleurSymptome(s);
      const style = famille ? ' style="--c-bg:' + famille.bg + ';--c-fg:' + famille.fg + '"' : '';
      return (
        '<label class="carte-symptome"' +
        style +
        '>' +
        '<input type="radio" name="symptome" value="' +
        echapper(s) +
        '">' +
        svgIconeSymptome(s) +
        '<span>' +
        echapper(s) +
        '</span>' +
        '</label>'
      );
    })
    .join('');
  $$('#grille-symptomes input[type=radio]').forEach(function (input) {
    input.addEventListener('change', function () {
      etat.symptome = input.value;
      $('btn-symptome-continuer').disabled = false;
    });
  });
}
/* Dépannage : si un arbre publié est rattaché au symptôme choisi, une étape « Dépannage » est
   insérée juste après (depannage.js). Réglé → rien n'est envoyé ; sinon on continue la demande. */
let parcoursDepannage = null,
  vueDepannage = null;
$('btn-symptome-continuer').addEventListener('click', async function () {
  const bouton = this;
  bouton.disabled = true;
  let arbre = null;
  try {
    arbre = window.CvdlDepannage ? await CvdlDepannage.pourSymptome(API, etat.symptome) : null;
  } catch (e) {
    arbre = null;
  }
  bouton.disabled = false;
  const i = etapes.indexOf('depannage');
  if (i !== -1) etapes.splice(i, 1);
  parcoursDepannage = null;
  if (!arbre) {
    suivant();
    return;
  }
  etapes.splice(etapes.indexOf('symptome') + 1, 0, 'depannage');
  if (vueDepannage) vueDepannage.detruire();
  const infos = { arbre: arbre.identifiant, symptome: etat.symptome, origine: 'structure', code: etat.code || '' };
  vueDepannage = CvdlDepannage.monter($('zone-depannage'), arbre, {
    symptome: etat.symptome,
    urlFin: 'portail-structure.html',
    onRetour: precedent,
    onResolu: function (chemin) {
      etat.depannageResolu = true;
      $$('.dp-intro').forEach(function (el) {
        el.hidden = true;
      });
      CvdlDepannage.enregistrerParcours(API, Object.assign({ issue: 'resolu', chemin: chemin }, infos));
    },
    onSav: async function (chemin) {
      etat.depannageResolu = false;
      const r = await CvdlDepannage.enregistrerParcours(API, Object.assign({ issue: 'sav', chemin: chemin }, infos));
      parcoursDepannage = r && r.ok ? r.parcours : null;
      suivant();
    },
  });
  $$('.dp-intro').forEach(function (el) {
    el.hidden = false;
  });
  suivant();
});
function rendreTableauMaterielSav() {
  const corps = $('corps-tableau-materiel-sav');
  const zone = $('zone-tableau-materiel-sav');
  const terme = $('recherche-materiel-sav').value.trim().toLowerCase();
  if (!appareilsFlottePrecharges.length) {
    zone.hidden = true;
    return;
  }
  const lignes = appareilsFlottePrecharges
    .filter(
      (a) =>
        !terme ||
        (a.numeroSerie || '').toLowerCase().includes(terme) ||
        (a.marque || '').toLowerCase().includes(terme) ||
        (a.modele || '').toLowerCase().includes(terme) ||
        (a.personne || '').toLowerCase().includes(terme),
    )
    .slice(0, 200);
  corps.innerHTML =
    lignes
      .map(
        (a) => `
    <tr data-serie="${echapper(a.numeroSerie)}" data-personne="${echapper(a.personne || '')}">
      <td class="mono">${echapper(a.numeroSerie)}</td>
      <td>${echapper([a.marque, a.modele].filter(Boolean).join(' ') || 'Matériel')}</td>
      <td>${echapper(a.personne || '—')}</td>
    </tr>`,
      )
      .join('') || `<tr><td colspan="3" style="opacity:0.5;text-align:center">Aucun résultat</td></tr>`;
  zone.hidden = false;
}
// Affiche le tableau dès l'arrivée sur cette étape — pas besoin de taper d'abord pour voir son matériel
$('recherche-materiel-sav').addEventListener('input', rendreTableauMaterielSav);
$('corps-tableau-materiel-sav').addEventListener('click', (e) => {
  const ligne = e.target.closest('[data-serie]');
  if (!ligne) return;
  $('numero-serie-symptome').value = ligne.dataset.serie;
  document
    .querySelectorAll('#corps-tableau-materiel-sav tr')
    .forEach((tr) => tr.classList.toggle('choisi', tr === ligne));
  if (ligne.dataset.personne) etat.nomBeneficiaire = ligne.dataset.personne;
});

let essaisNumeroSerieInfructueux = 0;
const MSG_NUMERO_SERIE_INVALIDE =
  "Le numéro de série est obligatoire. Vous le trouverez sur le bon de livraison lié à la commande, dans votre suivi de commandes ou flotte matériel si paramétré ou sur l'attestation de paiement fourni à votre bénéficaire.";

/* Étape "matériel" : vérifie le numéro de série puis avance vers l'étape "détails" */
$('btn-materiel-suivant').addEventListener('click', async function () {
  const numeroSerieChamp = $('numero-serie-symptome').value.trim();
  const retour = $('retour-numero-serie-symptome');
  retour.innerHTML = '';

  if (!numeroSerieChamp) {
    retour.innerHTML = `<div class="msg msg-erreur">${MSG_NUMERO_SERIE_INVALIDE}</div>`;
    return;
  }

  const bouton = this;
  bouton.disabled = true;
  const texteOriginal = bouton.textContent;
  bouton.innerHTML = '<span class="spinner-inline"></span>Vérification…';
  try {
    const r = await jsonp({ action: 'sav-verifier-numero-serie', numeroSerie: numeroSerieChamp });
    if (r.ok && r.trouve) {
      essaisNumeroSerieInfructueux = 0;
      etat.numeroSerie = numeroSerieChamp;
      etat.dateAchat = r.dateAchat || '';
      suivant();
    } else {
      essaisNumeroSerieInfructueux++;
      retour.innerHTML = `<div class="msg msg-erreur">${MSG_NUMERO_SERIE_INVALIDE}${essaisNumeroSerieInfructueux >= 2 && r.emailContactSav ? ` Si le problème persiste, contacte directement <a href="mailto:${echapper(r.emailContactSav)}">${echapper(r.emailContactSav)}</a>.` : ''}</div>`;
    }
  } catch (e) {
    retour.innerHTML = '<div class="msg msg-erreur">Vérification impossible pour le moment — réessaie.</div>';
  }
  bouton.disabled = false;
  bouton.textContent = texteOriginal;
});

/* Étape "détails" : responsable + description, puis avance vers le récap */
$('btn-symptome-suivant').addEventListener('click', function () {
  const responsable = lireResponsableSav();
  afficherMsg('retour-symptome', '', 'info');
  if (!responsable) {
    afficherMsg('retour-symptome', "Merci d'indiquer le nom de la personne en charge de cette demande.", 'erreur');
    return;
  }
  etat.responsableSav = responsable;
  etat.commentaire = $('commentaire-sav').value.trim();
  etat.lienVideo = $('lien-video-sav').value.trim();
  suivant();
});

function lireFichier(f) {
  return new Promise(function (ok, ko) {
    const lecteur = new FileReader();
    lecteur.onload = function () {
      ok({ nom: f.name, type: f.type || 'application/octet-stream', base64: lecteur.result.split(',')[1] });
    };
    lecteur.onerror = function () {
      ko(new Error('Lecture du fichier impossible'));
    };
    lecteur.readAsDataURL(f);
  });
}

/* Étape 5 : récap + envoi */
// Même calcul que côté admin (statutGarantiePourDate()/badgeGarantie() dans admin/) —
// dupliqué ici, pas de module JS partagé entre l'admin et les pages publiques dans ce projet.
function statutGarantiePublic(dateAchatFormatee) {
  const [j, m, a] = String(dateAchatFormatee || '')
    .split('/')
    .map(function (n) {
      return parseInt(n, 10);
    });
  if (!j || !m || !a) return { statut: null };
  const dateMiGarantie = new Date(a + 1, m - 1, j);
  const dateFinGarantie = new Date(a + 2, m - 1, j);
  const maintenant = new Date();
  return { statut: maintenant >= dateFinGarantie ? 'expiree' : maintenant >= dateMiGarantie ? 'bientot' : 'en_cours' };
}
function badgeGarantiePublicSav(dateAchatFormatee) {
  const statut = statutGarantiePublic(dateAchatFormatee).statut;
  const cfg = {
    en_cours: { bg: '#1F9D55', texte: 'Garantie en cours' },
    bientot: { bg: '#7A5A00', texte: 'Garantie bientôt expirée' },
    expiree: { bg: '#E5484D', texte: 'Hors garantie' },
  }[statut];
  if (!cfg) return '';
  return (
    '<span style="display:inline-flex;align-items:center;gap:6px;background:' +
    cfg.bg +
    ';color:#fff;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;flex:none;white-space:nowrap">' +
    cfg.texte +
    '</span>'
  );
}
function majRecapSav() {
  const badgeGarantieHtml = etat.dateAchat ? badgeGarantiePublicSav(etat.dateAchat) : '';
  $('recap-sav').innerHTML =
    '<div><strong>' +
    echapper(etat.nomStructure) +
    '</strong></div>' +
    '<div style="margin-top:6px">' +
    echapper(etat.email) +
    '</div>' +
    (etat.numeroSerie
      ? '<div style="margin-top:6px;display:flex;align-items:center;justify-content:space-between;gap:10px"><span>N° série : ' +
        echapper(etat.numeroSerie) +
        '</span>' +
        badgeGarantieHtml +
        '</div>'
      : '') +
    (etat.dateAchat ? '<div style="margin-top:6px">Acheté/reçu le ' + echapper(etat.dateAchat) + '</div>' : '') +
    '<div style="margin-top:6px">Symptôme : ' +
    echapper(etat.symptome) +
    '</div>';
}
$('attestation-finale-sav').addEventListener('change', function () {
  $('btn-envoyer-sav').disabled = !$('attestation-finale-sav').checked;
});

$('btn-envoyer-sav').addEventListener('click', async function () {
  $('btn-envoyer-sav').disabled = true;
  afficherMsg('retour-envoi-sav', '', 'info');

  const voile = $('voile-envoi');
  const texteVoile = $('texte-voile');
  voile.hidden = false;

  try {
    let fichiers = [];
    const fichierPhoto = $('photo-sav').files[0];
    if (fichierPhoto) {
      texteVoile.textContent = 'Lecture de la photo…';
      fichiers = [await lireFichier(fichierPhoto)];
    }

    texteVoile.textContent = 'Envoi de la demande…';
    const barreProgression = $('barre-progression-envoi');
    const remplissage = $('barre-progression-envoi-remplissage');
    barreProgression.hidden = false;
    remplissage.style.width = '0%';

    const donnees = {
      action: 'sav-create',
      code: etat.code,
      nom: etat.nomStructure,
      email: etat.email,
      dateAchat: etat.dateAchat,
      numeroSerie: etat.numeroSerie,
      symptome: etat.symptome,
      commentaire: etat.commentaire,
      parcoursDepannage: parcoursDepannage,
      responsableSav: etat.responsableSav,
      lienVideo: etat.lienVideo,
      nomBeneficiaire: etat.nomBeneficiaire,
      fichiers: fichiers,
    };

    const r = await posterAvecProgression(donnees, function (pourcentage) {
      remplissage.style.width = pourcentage + '%';
      texteVoile.textContent = 'Envoi de la demande… ' + pourcentage + '%';
    });
    barreProgression.hidden = true;
    if (r.ok) {
      envoyerAnalytique(true);
      texteVoile.textContent = "C'est envoyé…";
      $('reference-sav').textContent = r.reference;
      (function () {
        let tutoVu = false;
        try {
          tutoVu = localStorage.getItem('cvdl-tuto-sav-vu') === 'oui';
        } catch (e) {}
        const ref = encodeURIComponent(r.reference || '');
        $('lien-suivre-sav').href = tutoVu
          ? `suivi-sav-structure.html?ref=${ref}`
          : `portail-structure.html?tuto=sav&ref=${ref}`;
      })();
      $$('.etape').forEach(function (s) {
        s.hidden = true;
      });
      $('progression').innerHTML = '';
      document.querySelector('.confirmation').hidden = false;
      // Avis rapide (retours.js) : une seule question, une fois la demande envoyée.
      if (window.CvdlRetours)
        CvdlRetours.demanderAvis(document.querySelector('.confirmation .card'), {
          parcours: 'sav',
          reference: r.reference,
          question: 'Déclarer cette panne, c’était simple ?',
        });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      voile.hidden = true;
      return;
    }
    voile.hidden = true;
    afficherMsg('retour-envoi-sav', r.erreur || 'Envoi impossible.', 'erreur');
  } catch (e) {
    voile.hidden = true;
    afficherMsg('retour-envoi-sav', 'Envoi impossible. Vérifiez votre connexion puis réessayez.', 'erreur');
  }
  $('btn-envoyer-sav').disabled = false;
});

/* Démarrage */
chargerSymptomes();
if (window.CvdlDepannage) CvdlDepannage.charger(API); // arbres préchargés : aucune attente après le symptôme
allerA('identification');

// Arrivée depuis un passeport (sav.html?sn=…) : le numéro de série est pré-rempli.
(function () {
  const sn = new URLSearchParams(location.search).get('sn');
  const champ = document.getElementById('numero-serie-symptome');
  if (sn && champ) {
    champ.value = sn;
    etat.numeroSerie = sn;
  }
})();
