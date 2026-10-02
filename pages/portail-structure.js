const $ = (id) => document.getElementById(id);

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
function echapper(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function jsonp(params) {
  return fetch(API + '?' + new URLSearchParams(params)).then((r) => r.json());
}

async function verifierCodePortail(code) {
  if (!code) {
    $('retour-code-portail').innerHTML = '<div class="msg msg-erreur">Merci de saisir un code.</div>';
    return;
  }
  $('btn-verifier-code-portail').disabled = true;
  $('btn-verifier-code-portail').textContent = 'Vérification…';
  $('retour-code-portail').innerHTML = '';
  try {
    const r = await jsonp({ action: 'check', code: code });
    if (r.ok) {
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      const heure = new Date().getHours();
      const salutation = heure >= 5 && heure < 18 ? 'Bonjour' : 'Bonsoir';
      $('titre-structure-identifiee').innerHTML = r.nom
        ? `${echapper(salutation)}, <em>${echapper(r.nom)}</em>`
        : 'Espace structure';
      document.querySelectorAll('[data-gate="interne"]').forEach((el) => {
        el.hidden = !r.interne;
      });
      const conseiller = r.role === 'conseiller';
      document.documentElement.classList.toggle('role-conseiller', conseiller);
      $('etape-code').hidden = true;
      // Le voile reste affiché tant que les données du tableau de bord n'ont pas fini de
      // charger — avant, la grille de cartes s'affichait immédiatement (vide), le temps que
      // les stats/message contextuel arrivent en tâche de fond derrière.
      $('voile-verification-precoce').style.display = 'flex';
      if (!conseiller) await chargerTableauBordPortail(code);
      $('voile-verification-precoce').style.display = 'none';
      $('etape-portail').hidden = false;
      $('btn-deconnexion-portail').hidden = false;
      demarrerTutoPortailSiDemande();
      if (!tutoPortailDejaLance) lancerVisiteGuidee(code, r.nom, false);
    } else if (code.startsWith('j3.')) {
      // Accès conseiller expiré ou retiré : on repart de la page code (et de Google s'il le peut).
      try {
        sessionStorage.removeItem('cvdl-code-structure');
      } catch (e) {}
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
    const r = await jsonp({ action: 'tableau-bord-structure', code });
    if (!r.ok) return;

    if (r.messageContexte) {
      $('texte-message-contexte').textContent = r.messageContexte.texte;
      $('message-contexte-portail').href = r.messageContexte.lien;
      $('message-contexte-portail').classList.toggle('urgent', r.messageContexte.type === 'urgent');
      $('message-contexte-portail').hidden = false;
    }

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

$('btn-verifier-code-portail').addEventListener('click', () => verifierCodePortail($('code-portail').value.trim()));
$('code-portail').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCodePortail($('code-portail').value.trim());
});

$('btn-deconnexion-portail').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
    sessionStorage.setItem('cvdl-portail-google-off', '1');
  } catch (e) {}
  // Plus de connexion automatique Google après une déconnexion volontaire (un clic la rétablit).
  try {
    if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
  } catch (e) {}
  location.reload();
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
  const r = await jsonp({ action: 'equipe-structure', code: codeEquipe() }).catch(() => ({ ok: false }));
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
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'equipe-structure-enregistrer', code: codeEquipe(), comptes: nouvelle }),
  })
    .then((x) => x.json())
    .catch(() => ({ ok: false }));
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
$('carte-equipe').addEventListener('click', () => {
  const p = $('panneau-equipe');
  p.hidden = !p.hidden;
  if (!p.hidden) {
    chargerEquipe();
    p.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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

/** Connexion Google silencieuse, structures Internes seulement (pas de bouton) : hd limite
 *  Google aux comptes du domaine autorisé — sans session de ce domaine, rien ne s'affiche. Si le
 *  compte est l'e-mail de contact (ou un « Compte Google autorisé ») d'une structure Interne,
 *  l'espace s'ouvre sans code (One Tap, auto_select). Sinon : saisie du code, comme avant. */
async function preparerGooglePortail(automatique) {
  if (!automatique) return;
  const post = (corps) =>
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(corps),
    }).then((r) => r.json());
  const c = await post({ action: 'auth-config' }).catch(() => ({}));
  if (!c.clientId) return;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = () => {
    google.accounts.id.initialize({
      client_id: c.clientId,
      hd: c.domaine,
      auto_select: true,
      ux_mode: 'popup',
      cancel_on_tap_outside: false,
      callback: async (rep) => {
        $('retour-code-portail').innerHTML = '<div class="msg">Connexion…</div>';
        const r = await post({ action: 'auth-google-structure', credential: rep.credential }).catch(() => ({
          ok: false,
          erreur: 'Connexion impossible — réessaie.',
        }));
        if (r.ok && r.acces) {
          $('retour-code-portail').innerHTML = '';
          if (!r.acces.startsWith('j3.')) $('code-portail').value = r.acces;
          return verifierCodePortail(r.acces);
        }
        if (r.ok && r.choix && r.choix.length) {
          $('retour-code-portail').innerHTML =
            `<div class="msg"><p style="margin:0 0 8px">Plusieurs espaces sont liés à ${echapper(r.email)} :</p>${r.choix.map((x) => `<button type="button" class="btn btn-secondary btn-block" style="margin-top:6px" data-pg-code="${echapper(x.acces)}">${echapper(x.nom)}<small style="opacity:.6"> · ${x.role === 'responsable' ? 'responsable' : 'conseiller'}</small></button>`).join('')}</div>`;
          return;
        }
        // Compte non rattaché à une structure : rien à signaler, la saisie du code reste là.
        $('retour-code-portail').innerHTML = '';
      },
    });
    google.accounts.id.prompt();
  };
  document.head.appendChild(s);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pg-code]');
  if (!b) return;
  if (!b.dataset.pgCode.startsWith('j3.')) $('code-portail').value = b.dataset.pgCode;
  verifierCodePortail(b.dataset.pgCode);
});

// Déjà identifiée sur cet appareil : on saute directement à la grille, sans redemander le code.
try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  preparerGooglePortail(!codeMemorise && !sessionStorage.getItem('cvdl-portail-google-off'));
  if (codeMemorise) {
    if (!codeMemorise.startsWith('j3.')) $('code-portail').value = codeMemorise;
    verifierCodePortail(codeMemorise).finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = document.getElementById('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}
