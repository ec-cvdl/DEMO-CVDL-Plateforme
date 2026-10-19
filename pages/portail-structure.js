/** Trajectoire aléatoire pour chaque forme décorative de la bannière — direction, distance et
 *  vitesse tirées au sort au chargement de la page plutôt qu'un jeu figé de préréglages
 *  horizontal/vertical/diagonal. Formes assez grandes (f1/f6) pour rester crédibles même en
 *  sortant loin du cadre : amplitude proportionnelle à leur taille. */
document.querySelectorAll('.bandeau-accueil .forme').forEach((forme) => {
  const amplitude = 80 + Math.random() * 220;
  const angle = Math.random() * Math.PI * 2;
  const x0 = Math.round(Math.cos(angle) * amplitude),
    y0 = Math.round(Math.sin(angle) * amplitude);
  forme.style.setProperty('--x0', `${x0}px`);
  forme.style.setProperty('--y0', `${y0}px`);
  forme.style.setProperty('--x1', `${-x0}px`);
  forme.style.setProperty('--y1', `${-y0}px`);
  forme.style.animationDuration = `${(16 + Math.random() * 16).toFixed(1)}s`;
  forme.style.animationDelay = `${(-Math.random() * 15).toFixed(1)}s`;
});

/** Code saisi et accepté : « Rester connecté » coché → jeton j4 mémorisé sur l'appareil (le code
 *  lui-même n'y est jamais gardé) ; décoché → toute connexion mémorisée est oubliée. */
async function memoriserConnexion(code) {
  if (!$('rester-connecte').checked) {
    try {
      localStorage.removeItem(CLE_SESSION_STRUCTURE);
    } catch (e) {}
    return;
  }
  const r = await poster({ action: 'structure-session', code }).catch(() => null);
  if (r && r.ok) {
    garderSessionStructure(r.jeton, r.jours);
    // L'onglet passe lui aussi au jeton : le code ne reste dans aucune mémoire du navigateur.
    try {
      sessionStorage.setItem('cvdl-code-structure', r.jeton);
    } catch (e) {}
  }
}
/** Bouton Déconnexion : rappelle jusqu'à quand cet appareil reste connecté. */
function majInfoSession() {
  const d = sessionStructureMemorisee();
  $('btn-deconnexion-portail').title = d
    ? `Connecté sur cet appareil jusqu’au ${new Date(d.jusqua).toLocaleDateString('fr-FR')}`
    : '';
}

let derniereVerification = null; // réponse de « check », pour « Revoir la présentation »
async function verifierCodePortail(code) {
  if (!code) {
    $('retour-code-portail').innerHTML = '<div class="msg msg-erreur">Merci de saisir un code.</div>';
    return;
  }
  $('btn-verifier-code-portail').disabled = true;
  $('btn-verifier-code-portail').textContent = 'Vérification…';
  $('retour-code-portail').innerHTML = '';
  try {
    const r = await lireApi({ action: 'check', code: code });
    if (r.ok && r.jeton) {
      // Connexion par e-mail : session prolongée par le serveur.
      garderSessionStructure(r.jeton, r.jours);
      code = r.jeton;
    }
    if (r.ok) {
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      if (!estJetonAcces(code)) await memoriserConnexion(code);
      majInfoSession();
      const heure = new Date().getHours();
      const salutation = heure >= 5 && heure < 18 ? 'Bonjour' : 'Bonsoir';
      const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      $('ps-date').textContent = jour[0].toUpperCase() + jour.slice(1);
      $('ps-qui').hidden = !r.compte;
      if (r.compte) $('ps-qui').textContent = `Connecté : ${r.compte.nom || r.compte.email}`;
      $('titre-structure-identifiee').innerHTML = r.nom
        ? `${echapper(salutation)}, <em>${echapper(r.nom)}</em>`
        : 'Espace structure';
      const partenaires = !!(r.perimetre && r.perimetre.partenaires);
      // Contexte pour les retours et les tutoriels (type de structure, rôle).
      try {
        sessionStorage.setItem(
          'cvdl-contexte-structure',
          JSON.stringify({ type: (r.politique && r.politique.type) || '', role: r.role || 'responsable', partenaires }),
        );
      } catch (e) {}
      document.querySelectorAll('[data-gate="interne"]').forEach((el) => {
        el.hidden = !r.interne;
      });
      document.querySelectorAll('[data-gate="externe"]').forEach((el) => {
        el.hidden = !!r.interne;
      });
      document.querySelectorAll('[data-gate="partenaires"]').forEach((el) => {
        el.hidden = !(r.interne && partenaires);
      });
      const conseiller = r.role === 'conseiller';
      document.documentElement.classList.toggle('role-conseiller', conseiller);
      $('etape-code').hidden = true;
      derniereVerification = { r, code };
      // Première connexion : présentation plein écran (embarquement.js) pendant que le tableau de
      // bord charge derrière ; sinon le voile reste affiché le temps du chargement.
      const embarquement = window.CvdlEmbarquement ? CvdlEmbarquement.preparer(r, code, { api: API }) : null;
      let finChargement = () => {};
      if (embarquement) embarquement.afficher(new Promise((res) => (finChargement = res)));
      else $('voile-verification-precoce').style.display = 'flex';
      if (!conseiller) await chargerTableauBordPortail(code);
      // Pense-bête : toute l'équipe (responsable et conseillers).
      if (await PenseBete.charger(code)) PenseBete.majCarte();
      $('voile-verification-precoce').style.display = 'none';
      const entree = preparerEntreePortail();
      $('etape-portail').hidden = false;
      $('btn-deconnexion-portail').hidden = false;
      finChargement();
      if (embarquement) await embarquement.termine;
      entree();
      demarrerTutoPortailSiDemande();
      if (!tutoPortailDejaLance) lancerVisiteGuidee(code, r.nom, false);
    } else if (estJetonAcces(code)) {
      // Accès conseiller ou connexion mémorisée expirés (ou code changé) : on repart de la page
      // code (et de Google s'il le peut).
      oublierCodeStructure();
      $('code-portail').value = '';
      $('retour-code-portail').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Session expirée — reconnectez-vous.')}</div>`;
      preparerGooglePortail(true);
    } else {
      $('retour-code-portail').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    }
  } catch (e) {
    $('retour-code-portail').innerHTML = '<div class="msg msg-erreur">Connexion impossible — réessaie.</div>';
  }
  $('btn-verifier-code-portail').disabled = false;
  $('btn-verifier-code-portail').textContent = "Accéder à l'espace structure";
}

/** Charge stats/message contextuel/activité récente en tâche de fond, sans bloquer l'affichage
 *  de la grille de cartes — chaque bloc reste caché tant que sa donnée est vide plutôt que
 *  d'afficher un "0" ou un encart vide. */
async function chargerTableauBordPortail(code) {
  try {
    const r = await lireApi({ action: 'tableau-bord-structure', code });
    if (!r.ok) return;

    if (r.messageContexte) {
      $('texte-message-contexte').textContent = r.messageContexte.texte;
      $('message-contexte-portail').href = r.messageContexte.lien;
      $('message-contexte-portail').classList.toggle('urgent', r.messageContexte.type === 'urgent');
      $('message-contexte-portail').hidden = false;
    }
    // La bande « À traiter » ouvre la fenêtre des notifications (notifications-portail.js).
    window.NotificationsPortail?.brancherBande(
      $('message-contexte-portail'),
      $('texte-message-contexte'),
      r.messageContexte,
    );
    window.NotificationsPortail?.recharger();

    const s = r.stats;
    const statsAffichees = [
      s.beneficiairesEquipes > 0
        ? {
            label: 'Personnes accompagnées équipées',
            valeur: s.beneficiairesEquipes,
            ill: 'personne',
            lien: 'flotte-structure.html',
          }
        : null,
      s.appareilsFlotte > 0
        ? {
            label: 'Appareils dans votre flotte',
            valeur: s.appareilsFlotte,
            ill: 'flotte',
            lien: 'flotte-structure.html',
          }
        : null,
      s.commandesEnCours > 0
        ? { label: 'Commandes en cours', valeur: s.commandesEnCours, ill: 'commandes', lien: 'suivi.html' }
        : null,
      s.savOuverts > 0
        ? { label: 'SAV ouverts', valeur: s.savOuverts, ill: 'suiviSav', lien: 'suivi-sav-structure.html' }
        : null,
    ].filter(Boolean);
    if (statsAffichees.length) {
      $('grille-stats-portail').innerHTML = statsAffichees
        .map(
          (x) =>
            `<div class="ps-stat"><span data-ill="${x.ill}" class="ill"></span><span class="ps-stat-label">${echapper(x.label)}</span><span class="ps-stat-valeur">${x.valeur}</span></div>`,
        )
        .join('');
      $('grille-stats-portail').hidden = false;
    }

    // « Mes commandes » : les 5 plus récentes, les livrées teintées en vert ; un clic ouvre la
    // commande seule dans la page de suivi (?ref=), le bouton du bas les affiche toutes.
    if (r.commandesRecentes && r.commandesRecentes.length) {
      $('pv-lignes-commandes').innerHTML = r.commandesRecentes
        .map((c) => {
          const livree = c.statut === 'Livrée';
          return `
        <a class="ps-ligne${livree ? ' livree' : ''}" href="suivi.html?ref=${encodeURIComponent(c.reference)}">
          <span class="ps-ligne-txt"><b>${echapper(c.reference)}</b><small>${echapper(c.produits || '')}</small></span>
          <span class="tag">${echapper(c.statut)}</span>
          <span class="ps-ligne-date">${livree && c.dateLivraison ? 'le ' + echapper(c.dateLivraison) : `étape ${Math.min(c.etape, c.total)} / ${c.total}`}</span>
        </a>`;
        })
        .join('');
      if (r.nbCommandesTotal)
        $('pv-toutes-commandes').firstChild.textContent = `Voir toutes mes commandes (${r.nbCommandesTotal}) `;
      $('pv-liste-commandes').hidden = false;
    }
    if (s.commandesEnCours > 0) {
      document.querySelectorAll('[data-badge="commandes"]').forEach((el) => {
        el.textContent = s.commandesEnCours;
        el.hidden = false;
      });
    }
    if (s.savOuverts > 0) {
      document.querySelectorAll('[data-badge="sav"]').forEach((el) => {
        el.textContent = s.savOuverts;
        el.hidden = false;
      });
    }
    if (s.structuresPartenaires) {
      document.querySelectorAll('[data-badge="structures-partenaires"]').forEach((el) => {
        el.textContent = s.structuresPartenaires;
        el.hidden = false;
      });
    }
    if (s.commandesPartenairesEnAttente > 0) {
      document.querySelectorAll('[data-badge="commandes-partenaires"]').forEach((el) => {
        el.textContent = s.commandesPartenairesEnAttente;
        el.hidden = false;
      });
    }

    $('lien-contact-aide').href = r.emailContact ? `mailto:${r.emailContact}` : 'mailto:contact@emmaus-connect.org';
  } catch (e) {
    /* le reste du portail (grille de cartes) fonctionne déjà sans ce tableau de bord */
  }
}

// Tuto interactif au retour de la toute première commande (ou demande SAV) d'une structure :
// ?tuto=commande ou ?tuto=sav dans l'URL déclenche un spotlight sur la carte correspondante.
// Ne s'affiche qu'une fois par appareil (mémorisé indépendamment du code, voir portail.html).
let tutoPortailDejaLance = false;
function demarrerTutoPortailSiDemande() {
  if (tutoPortailDejaLance) return;
  const params = new URLSearchParams(location.search);
  const cible = params.get('tuto');
  if (cible !== 'commande' && cible !== 'sav') return;

  const cleMemoire = `cvdl-tuto-${cible}-vu`;
  try {
    if (localStorage.getItem(cleMemoire) === 'oui') return;
  } catch (e) {}

  const carte = document.querySelector('[data-tuto="' + cible + '"]');
  if (!carte) return;
  tutoPortailDejaLance = true;

  const voile = document.createElement('div');
  voile.className = 'voile-tuto-portail';
  document.body.appendChild(voile);
  carte.classList.add('carte-tuto-spotlight');

  const refCible = params.get('ref') || '';
  const pageSuivi = cible === 'sav' ? 'suivi-sav-structure.html' : 'suivi.html';
  if (refCible) carte.setAttribute('href', `${pageSuivi}?ref=${encodeURIComponent(refCible)}`);
  const bulle = document.createElement('div');
  bulle.className = 'bulle-tuto-portail';
  bulle.setAttribute('role', 'dialog');
  bulle.setAttribute('aria-label', 'Astuce');
  bulle.innerHTML = `
    <div class="bt-k">Astuce · à retenir</div>
    <p class="bt-t">${cible === 'sav' ? 'Vos demandes SAV se suivent ici' : 'Vos commandes se suivent ici'}</p>
    <p class="bt-p">${
      cible === 'sav'
        ? "À tout moment, retrouvez l'avancement de votre demande depuis cette carte."
        : "À tout moment, retrouvez depuis cette carte l'avancement, le suivi du colis et les numéros de série."
    }</p>
    <div class="bt-actions"><button type="button" class="btn btn-ghost" data-bt="fermer">Compris</button>${refCible ? `<a class="btn btn-primary" href="${pageSuivi}?ref=${encodeURIComponent(refCible)}" data-bt="suivre">${cible === 'sav' ? 'Voir ma demande' : 'Voir ma commande'} →</a>` : ''}</div>
  `;
  document.body.appendChild(bulle);

  function positionnerBulle() {
    const r = carte.getBoundingClientRect();
    const largeurBulle = bulle.offsetWidth || 270;
    bulle.style.top = window.scrollY + r.bottom + 12 + 'px';
    bulle.style.left =
      Math.min(
        Math.max(12, window.scrollX + r.left),
        window.scrollX + document.documentElement.clientWidth - largeurBulle - 12,
      ) + 'px';
  }
  positionnerBulle();
  window.addEventListener('resize', positionnerBulle);

  function fermerTuto() {
    voile.remove();
    bulle.remove();
    carte.classList.remove('carte-tuto-spotlight');
    try {
      localStorage.setItem(cleMemoire, 'oui');
    } catch (e) {}
    history.replaceState(null, '', location.pathname);
  }
  voile.addEventListener('click', fermerTuto);
  bulle.querySelector('[data-bt="fermer"]').addEventListener('click', fermerTuto);
  const suivre = bulle.querySelector('[data-bt="suivre"]');
  if (suivre)
    suivre.addEventListener('click', () => {
      try {
        localStorage.setItem(cleMemoire, 'oui');
      } catch (e) {}
    });
  carte.addEventListener('click', fermerTuto); // laisse le clic suivre le lien normalement, referme juste le tuto
}

/* Visite guidée de la première connexion (visite-guidee.js) : 3 secondes pour découvrir la
   page, puis 3 étapes courtes — commander et suivre, SAV, flotte. Une fois par appareil et par
   structure ; « Revoir la visite guidée » (bloc d'aide) la relance. */
function lancerVisiteGuidee(code, nom, immediat) {
  if (!window.CvdlVisite) return;
  CvdlVisite.lancer(
    {
      cle: 'cvdl-visite-v1-' + code,
      accueil: nom ? `Bienvenue, ${nom} ! Petit tour de votre espace.` : 'Bienvenue ! Petit tour de votre espace.',
      etapes: [
        {
          cibles: ['.ps-choix-carte[href="commande.html"]', '.ps-choix-carte[href="suivi.html"]'],
          ill: 'commander',
          titre: 'Commander, puis suivre',
          texte:
            'Choisissez votre matériel en quelques étapes. Chaque commande se suit ensuite ici : validation, préparation, livraison, numéros de série et documents.',
        },
        {
          cibles: ['.ps-choix-carte[href="sav.html"]', '.ps-choix-carte[href="suivi-sav-structure.html"]'],
          ill: 'panne',
          titre: 'Un appareil en panne ?',
          texte:
            'Signalez-le ici : on vous propose d’abord quelques vérifications rapides, puis la demande part à notre équipe. Son avancement se suit dans « Mes demandes SAV ».',
        },
        {
          cibles: ['.ps-flotte', '.ps-impact-court'],
          ill: 'flotte',
          titre: 'Votre flotte et votre impact',
          texte:
            'Tout le matériel livré : à qui il est remis, son état, sa garantie. À côté, votre impact écologique et social (appareils réemployés, CO₂ évité, personnes équipées), en rapport prêt à imprimer pour vos bilans.',
        },
        {
          cibles: ['.pv-carte[href="categories-materiel.html"]'],
          ill: 'categories',
          titre: 'Le catalogue',
          texte: 'Comparez ordinateurs, tablettes et smartphones pour choisir l’appareil adapté à chaque personne.',
        },
        {
          cibles: ['.bloc-aide-large'],
          ill: 'aide',
          titre: 'Une question, un avis ?',
          texte:
            'Écrivez-nous à tout moment, et dites-nous ce qui marche ou non : vos retours font évoluer l’outil. La visite se relance d’ici.',
        },
      ],
    },
    immediat,
  );
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('#lien-revoir-visite')) return;
  e.preventDefault();
  let code = '';
  try {
    code = sessionStorage.getItem('cvdl-code-structure') || '';
  } catch (err) {}
  lancerVisiteGuidee(code, '', true);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#lien-revoir-presentation') || !derniereVerification || !window.CvdlEmbarquement) return;
  e.preventDefault();
  const emb = CvdlEmbarquement.preparer(derniereVerification.r, derniereVerification.code, { forcer: true });
  if (emb) emb.afficher();
});

$('btn-verifier-code-portail').addEventListener('click', () => verifierCodePortail($('code-portail').value.trim()));
$('code-portail').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCodePortail($('code-portail').value.trim());
});

$('btn-deconnexion-portail').addEventListener('click', () => {
  try {
    oublierCodeStructure();
    sessionStorage.setItem('cvdl-portail-google-off', '1');
  } catch (e) {}
  // Plus de connexion automatique Google après une déconnexion volontaire (un clic la rétablit).
  try {
    if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
  } catch (e) {}
  location.reload();
});

/* ── Connexion par e-mail : code à 6 chiffres, puis jeton j6 gardé 90 jours sur l'appareil ── */
const etapeConnexion = (nom) =>
  ['email', 'code', 'google', 'choix'].forEach((e) => ($(`cx-etape-${e}`).hidden = e !== nom));
const retourConnexion = (t, type = 'erreur') =>
  ($('retour-code-portail').innerHTML = t ? `<div class="msg msg-${type}">${echapper(t)}</div>` : '');
async function envoyerCodeConnexion() {
  const email = $('cx-email').value.trim();
  if (!email) return retourConnexion('Saisissez votre adresse e-mail.');
  // L'équipe Emmaüs Connect (structures Internes) se connecte avec Google, jamais par code.
  if (adresseEquipe(email, await configGoogle)) return connexionGoogle(email);
  $('cx-envoyer').disabled = true;
  const r = await postPortail({ action: 'connexion-code', email }).catch(() => ({ ok: false }));
  $('cx-envoyer').disabled = false;
  if (r.google) return connexionGoogle(email);
  if (!r.ok) return retourConnexion(r.erreur || 'Envoi impossible — réessayez.');
  $('cx-adresse').textContent = email;
  etapeConnexion('code');
  retourConnexion(r.codeDemo ? `Démo : votre code est ${r.codeDemo}` : '', 'info');
  $('cx-code').value = '';
  $('cx-code').focus();
}
function ouvrirAvecJeton(jeton, jours) {
  garderSessionStructure(jeton, jours);
  try {
    sessionStorage.setItem('cvdl-code-structure', jeton);
  } catch (e) {}
  retourConnexion('');
  verifierCodePortail(jeton);
}
async function validerCodeConnexion() {
  $('cx-valider').disabled = true;
  const r = await postPortail({
    action: 'connexion-verifier',
    email: $('cx-email').value,
    code: $('cx-code').value,
  }).catch(() => ({ ok: false }));
  $('cx-valider').disabled = false;
  if (!r.ok) return retourConnexion(r.erreur || 'Connexion impossible — réessayez.');
  if (r.structures.length === 1) return ouvrirAvecJeton(r.structures[0].jeton, r.jours);
  $('cx-structures').innerHTML = r.structures
    .map(
      (x, i) =>
        `<button type="button" class="btn btn-secondary btn-block" data-cx-structure="${i}">${echapper(x.nom)}</button>`,
    )
    .join('');
  $('cx-structures').onclick = (e) => {
    const b = e.target.closest('[data-cx-structure]');
    if (b) ouvrirAvecJeton(r.structures[Number(b.dataset.cxStructure)].jeton, r.jours);
  };
  retourConnexion('');
  etapeConnexion('choix');
}
$('cx-envoyer').addEventListener('click', envoyerCodeConnexion);
$('cx-renvoyer').addEventListener('click', envoyerCodeConnexion);
$('cx-email').addEventListener('keydown', (e) => e.key === 'Enter' && envoyerCodeConnexion());
$('cx-valider').addEventListener('click', validerCodeConnexion);
$('cx-code').addEventListener('input', () => {
  if ($('cx-code').value.replace(/\D/g, '').length === 6) validerCodeConnexion();
});
document.querySelectorAll('[data-cx-changer]').forEach((b) =>
  b.addEventListener('click', () => {
    retourConnexion('');
    etapeConnexion('email');
    $('cx-email').focus();
  }),
);

/* ── Fenêtres (personnes, accès de l'équipe, aide à la décision) : <dialog> par-dessus la page,
   fermées par « Fermer », Échap ou un clic à côté. ── */
function ouvrirPanneau(id) {
  const d = $(id);
  if (!d.open) d.showModal();
}
document.querySelectorAll('.pv-panneau').forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-fermer-panneau]')) d.close();
  }),
);

/* ── Personnes de la structure (comptes à connexion par e-mail) ── */
let personnesMontees = false;
$('carte-personnes').addEventListener('click', () => {
  if (!personnesMontees)
    PersonnesStructure.monter($('pst-zone'), { appel: postPortail, cible: { code: codeEquipe() } });
  personnesMontees = true;
  ouvrirPanneau('panneau-personnes');
});

/* ── Accès de l'équipe (responsable, structure Interne) ── */
let equipe = [];
const codeEquipe = () => {
  try {
    return sessionStorage.getItem('cvdl-code-structure') || '';
  } catch (e) {
    return '';
  }
};
function afficherEquipe(contact) {
  const ligne = (
    email,
    role,
    fixe,
  ) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--color-border, rgba(0,0,0,.1));border-radius:10px">
    <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${echapper(email)}</span>
    ${fixe ? '<small style="opacity:.6">Responsable · contact de la fiche</small>' : `<select class="input" data-eq-role="${echapper(email)}" style="width:auto;padding:4px 8px"><option value="conseiller"${role === 'conseiller' ? ' selected' : ''}>Conseiller numérique</option><option value="responsable"${role === 'responsable' ? ' selected' : ''}>Responsable de territoire</option></select><button type="button" class="btn btn-ghost" data-eq-retirer="${echapper(email)}">Retirer</button>`}</div>`;
  $('eq-liste').innerHTML =
    (contact ? ligne(contact, 'responsable', true) : '') + equipe.map((x) => ligne(x.email, x.role, false)).join('') ||
    '<p style="opacity:.6;margin:0">Personne pour l’instant.</p>';
}
async function chargerEquipe() {
  $('eq-retour').innerHTML = '';
  const r = await lireApi({ action: 'equipe-structure', code: codeEquipe() }).catch(() => ({ ok: false }));
  if (!r.ok) {
    $('eq-retour').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</div>`;
    return;
  }
  equipe = r.comptes || [];
  $('eq-domaine').textContent = (r.domaines || []).map((d) => '@' + d).join(' ou ');
  $('panneau-equipe').dataset.contact = r.contact || '';
  afficherEquipe(r.contact);
}
async function enregistrerEquipe(nouvelle) {
  const r = await appelApi(
    { action: 'equipe-structure-enregistrer', code: codeEquipe(), comptes: nouvelle },
    { methode: 'POST' },
  ).catch(() => ({ ok: false }));
  if (!r.ok) {
    $('eq-retour').innerHTML =
      `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible.')}</div>`;
    return false;
  }
  equipe = nouvelle;
  $('eq-retour').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
  afficherEquipe($('panneau-equipe').dataset.contact);
  return true;
}
$('carte-transfert-stock').addEventListener('click', () => TransfertStock.ouvrir());
$('carte-equipe').addEventListener('click', () => {
  chargerEquipe();
  ouvrirPanneau('panneau-equipe');
});
$('carte-aide-decision').addEventListener('click', () => ouvrirPanneau('panneau-aide-decision'));

/* ── Dépannage : les arbres de décision (depannage.js) par symptôme, dans une fenêtre ; « ce
   n'est pas réglé » mène à la déclaration de panne avec le symptôme et le parcours repris. ── */
let vueDepannagePortail = null;
async function listeDepannage() {
  if (vueDepannagePortail) vueDepannagePortail.detruire();
  vueDepannagePortail = null;
  const zone = $('dp-portail');
  zone.innerHTML = '<p class="pk-etat"><span class="spinner-inline"></span>Chargement…</p>';
  const [d, s] = await Promise.all([
    CvdlDepannage.charger(API),
    lireApi({ action: 'sav-symptomes' }).catch(() => ({ ok: false })),
  ]);
  const symptomes = ((s && s.symptomes) || []).filter((x) => d.parSymptome[x.toLowerCase()]);
  const ill = (x) =>
    window.illustrationCvdl
      ? window.illustrationCvdl('sym-' + ((window.cleSymptomeCvdl && window.cleSymptomeCvdl(x)) || 'generique_sav'), 40)
      : '';
  zone.innerHTML = `<p style="margin:0 0 var(--space-4);opacity:.75">Quel est le problème ? Quelques vérifications suffisent souvent ; sinon, vous déclarez la panne sans tout ressaisir.</p>
    ${
      symptomes.length
        ? `<div class="dpp-grille">${symptomes
            .map(
              (x) =>
                `<button type="button" class="dpp-symptome" data-dpp-symptome="${echapper(x)}">${ill(x)}<span>${echapper(x)}</span></button>`,
            )
            .join('')}</div>`
        : '<p class="pk-etat">Aucun guide de dépannage pour le moment.</p>'
    }
    <p class="dpp-autre">Autre problème ? <a href="sav.html">Déclarer une panne</a></p>`;
}
async function ouvrirDepannagePortail(symptome) {
  const arbre = await CvdlDepannage.pourSymptome(API, symptome);
  if (!arbre) return;
  const infos = { arbre: arbre.identifiant, symptome, origine: 'structure', code: codeEquipe() };
  vueDepannagePortail = CvdlDepannage.monter($('dp-portail'), arbre, {
    symptome,
    urlFin: 'portail-structure.html',
    onRetour: listeDepannage,
    onResolu: (chemin) => CvdlDepannage.enregistrerParcours(API, { issue: 'resolu', chemin, ...infos }),
    onSav: async (chemin) => {
      const r = await CvdlDepannage.enregistrerParcours(API, { issue: 'sav', chemin, ...infos });
      try {
        sessionStorage.setItem(
          'cvdl-sav-depuis-depannage',
          JSON.stringify({ symptome, parcours: r && r.ok ? r.parcours : null }),
        );
      } catch (e) {}
      location.href = 'sav.html';
    },
  });
  $('dp-portail').scrollIntoView({ block: 'start' });
}
$('carte-depannage').addEventListener('click', () => {
  ouvrirPanneau('panneau-depannage');
  listeDepannage();
});
$('dp-portail').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dpp-symptome]');
  if (b) ouvrirDepannagePortail(b.dataset.dppSymptome);
});
$('eq-ajouter').addEventListener('click', async () => {
  const email = $('eq-email').value.trim().toLowerCase();
  if (!email) return;
  if (await enregistrerEquipe([...equipe.filter((x) => x.email !== email), { email, role: $('eq-role').value }])) {
    $('eq-email').value = '';
    $('eq-role').value = 'conseiller';
  }
});
$('eq-email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('eq-ajouter').click();
});
$('panneau-equipe').addEventListener('click', (e) => {
  const b = e.target.closest('[data-eq-retirer]');
  if (!b) return;
  enregistrerEquipe(equipe.filter((x) => x.email !== b.dataset.eqRetirer));
});
$('panneau-equipe').addEventListener('change', (e) => {
  const s = e.target.closest('[data-eq-role]');
  if (!s) return;
  enregistrerEquipe(equipe.map((x) => (x.email === s.dataset.eqRole ? { ...x, role: s.value } : x)));
});

/**
 * Connexion Google de l'équipe Emmaüs Connect (structures Internes : responsables et
 * conseillers numériques), sans code. Proposée seulement quand l'adresse saisie est du domaine
 * de l'équipe : les partenaires ne voient jamais Google. La fenêtre automatique (One Tap) ne
 * s'ouvre que sur un appareil où quelqu'un s'est déjà connecté ainsi. `hd` limite Google aux
 * comptes du domaine autorisé.
 */
const CLE_GOOGLE_PORTAIL = 'cvdl-portail-google';
let googlePret = null;
const postPortail = (corps) => appelApi(corps, { methode: 'POST' });

async function reponseGoogle(rep) {
  $('retour-code-portail').innerHTML = '<div class="msg">Connexion…</div>';
  const r = await postPortail({ action: 'auth-google-structure', credential: rep.credential }).catch(() => ({
    ok: false,
    erreur: 'Connexion impossible — réessaie.',
  }));
  if (r.ok) {
    try {
      localStorage.setItem(CLE_GOOGLE_PORTAIL, '1');
    } catch (e) {}
  }
  if (r.ok && r.acces) {
    $('retour-code-portail').innerHTML = '';
    if (!estJetonAcces(r.acces)) $('code-portail').value = r.acces;
    return verifierCodePortail(r.acces);
  }
  if (r.ok && r.choix && r.choix.length) {
    $('retour-code-portail').innerHTML =
      `<div class="msg"><p style="margin:0 0 8px">Plusieurs espaces sont liés à ${echapper(r.email)} :</p>${r.choix.map((x) => `<button type="button" class="btn btn-secondary btn-block" style="margin-top:6px" data-pg-code="${echapper(x.acces)}">${echapper(x.nom)}<small style="opacity:.6"> · ${x.role === 'responsable' ? 'responsable' : 'conseiller'}</small></button>`).join('')}</div>`;
    return;
  }
  $('retour-code-portail').innerHTML = r.aucune
    ? '<div class="msg">Ce compte Google n’a accès à aucun espace : saisissez votre code structure.</div>'
    : `<div class="msg msg-erreur">${echapper(r.erreur || 'Connexion impossible.')}</div>`;
}

const configGoogle = postPortail({ action: 'auth-config' }).catch(() => ({}));
const adresseEquipe = (email, config) =>
  (config.domaines || []).some((d) =>
    email
      .trim()
      .toLowerCase()
      .endsWith('@' + d),
  );

/** Charge Google une fois et l'initialise (`email` : adresse proposée) ; renvoie false si la
 *  connexion Google n'est pas configurée ou ne charge pas. */
function chargerGoogle(config, email) {
  if (!config.clientId) return Promise.resolve(false);
  if (!googlePret)
    googlePret = new Promise((resoudre) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resoudre(true);
      s.onerror = () => resoudre(false);
      document.head.appendChild(s);
    });
  return googlePret.then((ok) => {
    if (ok)
      google.accounts.id.initialize({
        client_id: config.clientId,
        hd: config.domaine,
        login_hint: email || undefined,
        auto_select: true,
        ux_mode: 'popup',
        cancel_on_tap_outside: false,
        callback: reponseGoogle,
      });
    return ok;
  });
}

/** Adresse de l'équipe saisie : bouton Google (et fenêtre Google) à la place du code. */
async function connexionGoogle(email) {
  retourConnexion('');
  if (!(await chargerGoogle(await configGoogle, email)))
    return retourConnexion('La connexion Google n’est pas disponible ici : utilisez votre code structure.');
  $('cx-adresse-google').textContent = email;
  etapeConnexion('google');
  $('pg-google-bouton').replaceChildren();
  google.accounts.id.renderButton($('pg-google-bouton'), {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    locale: 'fr',
  });
  google.accounts.id.prompt();
}

/** Appareil où l'équipe s'est déjà connectée avec Google : fenêtre One Tap d'office. */
async function preparerGooglePortail(automatique) {
  let dejaConnecte = false;
  try {
    dejaConnecte = localStorage.getItem(CLE_GOOGLE_PORTAIL) === '1';
  } catch (e) {}
  if (automatique && dejaConnecte && (await chargerGoogle(await configGoogle))) google.accounts.id.prompt();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pg-code]');
  if (!b) return;
  if (!estJetonAcces(b.dataset.pgCode)) $('code-portail').value = b.dataset.pgCode;
  verifierCodePortail(b.dataset.pgCode);
});

// Déjà identifiée sur cet appareil : on saute directement à la grille, sans redemander le code.
try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  preparerGooglePortail(!codeMemorise && !sessionStorage.getItem('cvdl-portail-google-off'));
  if (codeMemorise) {
    if (!estJetonAcces(codeMemorise)) $('code-portail').value = codeMemorise;
    verifierCodePortail(codeMemorise).finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = document.getElementById('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}

PenseBete.brancherPortail();

// « Retour » vers le choix structure / personne : seulement si l'espace bénéficiaires est ouvert
// (fermé, portail.html renvoie ici).
lireApi({ action: 'perimetre' })
  .then((p) => {
    if (p.ok && p.beneficiaires) $('retour-portail').hidden = false;
  })
  .catch(() => {});

/** Première arrivée de la session : cartes masquées pendant l'accueil, puis la 1re apparaît
 *  d'un coup et les autres suivent en domino. Renvoie la fonction qui lance l'animation. */
function preparerEntreePortail() {
  let premiere = false;
  try {
    premiere = !sessionStorage.getItem('cvdl-portail-vu');
    sessionStorage.setItem('cvdl-portail-vu', '1');
  } catch {
    /* stockage indisponible : pas d'animation d'entrée */
  }
  const zone = $('etape-portail');
  if (!premiere) return () => {};
  zone.classList.add('ps-attente');
  return () => {
    zone.classList.replace('ps-attente', 'ps-entree');
    setTimeout(() => zone.classList.remove('ps-entree'), 2000);
  };
}
