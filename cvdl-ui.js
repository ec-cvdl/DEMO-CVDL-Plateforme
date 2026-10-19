/* cvdl-ui.js — système visuel commun de l'espace public (maquette « Système unifié ») :
   en-tête commun, bloc titre (illustration + sur-titre + titre), formes des statuts
   (losange : en attente d'une décision, carré : en cours, rond : terminé).
   Ne touche à aucune logique : déplace seulement des éléments existants (mêmes références,
   mêmes écouteurs) et pose des attributs lus par cvdl-ui.css. */
(function () {
  // Accès « conseiller numérique » (connexion Google, jeton j3 à la place du code structure) :
  // les éléments marqués data-role="responsable" sont masqués (le serveur refuse de toute façon).
  try {
    if ((sessionStorage.getItem('cvdl-code-structure') || '').startsWith('j3.')) {
      document.documentElement.classList.add('role-conseiller');
      const st = document.createElement('style');
      st.textContent = 'html.role-conseiller [data-role="responsable"]{display:none!important}';
      document.head.appendChild(st);
    }
  } catch (e) {}
  try {
    if (window.self !== window.top || new URLSearchParams(location.search).has('integre'))
      document.documentElement.classList.add('cvdl-integre');
  } catch (e) {
    document.documentElement.classList.add('cvdl-integre');
  }
  const page = (location.pathname.split('/').pop() || 'portail.html').replace(/\.html$/, '') || 'portail';
  const SURTITRES = {
    portail: 'Bienvenue',
    'portail-structure': 'Espace structure',
    'portail-beneficiaire': 'Espace personnel',
    commande: 'Commander',
    suivi: 'Suivi',
    sav: 'SAV',
    'sav-beneficiaire': 'SAV',
    'suivi-sav-structure': 'Suivi SAV',
    'suivi-sav-beneficiaire': 'Suivi SAV',
    'flotte-structure': 'Matériel',
    passeport: 'Passeport',
    'categories-materiel': 'Catalogue',
    'linux-info': 'Découvrir',
    attestations: 'Documents',
    'enquete-satisfaction': 'Votre avis',
    'structures-partenaires': 'Espace partenaire',
    'commandes-partenaires': 'Espace partenaire',
    'tarifs-partenaires': 'Espace partenaire',
    orientation: 'Vente solidaire',
    'ventes-preparer': 'Ventes solidaires',
    'saisie-salesforce': 'Saisie des ventes',
  };
  const FORMES = {
    Reçue: 'losange',
    Validée: 'carre',
    Préparée: 'carre',
    'En cours de livraison': 'carre',
    'En livraison': 'carre',
    Livrée: 'rond',
    Annulée: 'rond',
    'En attente': 'losange',
    Envoyé: 'losange',
    Envoyée: 'losange',
    Payé: 'rond',
    Payée: 'rond',
    'Non payé': 'losange',
    'Non payée': 'losange',
    Remboursé: 'rond',
    Accepté: 'rond',
  };
  function formeDe(texte) {
    const t = String(texte || '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' · ')[0]
      .trim();
    if (!t || t.length > 40) return null;
    if (FORMES[t]) return FORMES[t];
    const n = t.toLowerCase();
    if (/(clos|clôtur|termin|résolu|rendu|livrée|rembours|irréparable|annulé|payée?$)/.test(n)) return 'rond';
    if (/(reçue?$|nouveau|nouvelle|en attente|à valider|à générer|à traiter|demande|envoyée?$)/.test(n))
      return 'losange';
    if (/(en cours|diagnostic|réparation|préparée|validée|expédi|pris en charge|atelier)/.test(n)) return 'carre';
    return null;
  }
  function formes(racine) {
    (racine || document)
      .querySelectorAll('.tag, .pk-pill:not(.pk-ok):not(.pk-att):not(.pk-ko), .v1-st, .pv-statut, .rp-statut')
      .forEach((el) => {
        // Forme posée explicitement par la page : on n'y touche pas.
        if (el.hasAttribute('data-forme') && !el.hasAttribute('data-forme-auto')) return;
        const f = formeDe(el.textContent);
        if (f) {
          el.dataset.forme = f;
          el.dataset.formeAuto = '';
        } else {
          delete el.dataset.forme;
          delete el.dataset.formeAuto;
        }
      });
  }
  function entete() {
    const body = document.body;
    if (document.querySelector('.cvdl-entete')) return;
    const h = document.createElement('header');
    h.className = 'cvdl-entete';
    const marque = document.createElement('a');
    marque.className = 'cvdl-marque';
    marque.href = /beneficiaire/.test(page)
      ? 'portail-beneficiaire.html'
      : page === 'portail'
        ? 'portail.html'
        : page === 'accueil'
          ? 'accueil.html'
          : page === 'orientation'
            ? 'orientation.html' // structure qui oriente : pas d'espace structure
            : 'portail-structure.html';
    marque.setAttribute('aria-label', 'Retour à l’accueil');
    const logo = document.querySelector('.logo-portail');
    if (logo) marque.appendChild(logo);
    else marque.innerHTML = '<b>CVDL</b>';
    const actions = document.createElement('div');
    actions.className = 'cvdl-entete-actions';
    document.querySelectorAll('.btn-deconnexion-fixe').forEach((b) => actions.appendChild(b));
    h.append(marque, actions);
    // Bouton « ← Portail / Retour » de la page : toujours au même endroit, dans l'en-tête, à
    // droite du logo (il était placé différemment selon la largeur de chaque page). Seul le
    // retour « de page » est déplacé — jamais les retours d'étape internes (data-retour…).
    const retour = [...document.querySelectorAll('.btn-retour-portail, .btn-retour[onclick]')].find(
      (b) =>
        !b.closest('.voile-modale-qr, .modale-qr, .cvdl-entete') &&
        b.parentElement &&
        (b.parentElement.matches('main, .conteneur, body, #contenu-principal') ||
          b.parentElement.matches('.barre-etapes, .pk-barre-etapes')),
    );
    if (retour) {
      retour.style.margin = '';
      retour.classList.add('cvdl-retour-entete');
      const txt = [...retour.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (txt) {
        const sp = document.createElement('span');
        sp.className = 'cvdl-retour-txt';
        sp.textContent = txt.textContent.trim();
        txt.replaceWith(sp);
      }
      marque.after(retour);
    }
    const evitement = body.querySelector(':scope > .lien-evitement');
    if (evitement) evitement.after(h);
    else body.prepend(h);
  }
  function titres(racine) {
    (racine || document).querySelectorAll('.pk-titre-ill').forEach((ill) => {
      if (ill.closest('.cvdl-titre') || ill.dataset.cvdlOk) return;
      ill.dataset.cvdlOk = '1';
      const h = ill.nextElementSibling;
      if (!h || !/^H[12]$/.test(h.tagName)) return;
      // Écrans de code / cartes / modales : on garde la composition centrée de la maquette « Connexion ».
      if (ill.closest('#etape-code, [id^="etape-code"], #etape-identification') && ill.dataset.ill === 'cle') {
        // Écrans d'identification : la clé DEVANT le titre, sur la même ligne.
        const ligne = document.createElement('div');
        ligne.className = 'cvdl-titre-code';
        ill.before(ligne);
        ligne.append(ill, h);
        return;
      }
      if (ill.closest('.card, .modale-qr, #etape-code, [id^="etape-code"]')) {
        ill.classList.add('cvdl-ill-centre');
        return;
      }
      const p = h.nextElementSibling && h.nextElementSibling.tagName === 'P' ? h.nextElementSibling : null;
      const bloc = document.createElement('div');
      bloc.className = 'cvdl-titre';
      const txt = document.createElement('div');
      txt.className = 'cvdl-titre-txt';
      ill.before(bloc);
      bloc.append(ill, txt);
      if (SURTITRES[page]) {
        const s = document.createElement('div');
        s.className = 'cvdl-surtitre';
        s.textContent = SURTITRES[page];
        txt.append(s);
      }
      txt.append(h);
      if (p) txt.append(p);
    });
  }
  function gestes() {
    document.querySelectorAll('.pv-geste').forEach((g) => {
      if (g.querySelector('.cvdl-geste-ill')) return;
      const i = document.createElement('span');
      i.className = 'ill xl cvdl-geste-ill';
      i.dataset.ill = g.classList.contains('pv-panne') ? 'panne' : 'commander';
      g.prepend(i);
    });
  }
  /* Éclats de formes de l'animation de confirmation (commande, SAV) */
  function eclats(racine) {
    (racine || document).querySelectorAll('.confirmation-icone').forEach((ic) => {
      if (ic.querySelector('.cvdl-eclats')) return;
      const e = document.createElement('span');
      e.className = 'cvdl-eclats';
      e.setAttribute('aria-hidden', 'true');
      e.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
      ic.appendChild(e);
    });
  }

  /* ── Accessibilité (audit RGAA) ─────────────────────────────────────────────────────── */
  const FOCUSABLES =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  /** Lien « Aller au contenu » en tout début de page (RGAA 12.7). */
  function lienEvitement() {
    const principal = document.querySelector('main') || document.querySelector('.conteneur');
    if (!principal) return;
    if (!principal.id) principal.id = 'contenu';
    if (!principal.hasAttribute('tabindex')) principal.setAttribute('tabindex', '-1');
    let lien = document.querySelector('.lien-evitement');
    if (!lien) {
      lien = document.createElement('a');
      lien.className = 'lien-evitement';
      lien.textContent = 'Aller au contenu';
      document.body.prepend(lien);
    }
    lien.setAttribute('href', '#' + principal.id);
  }
  /** Zones de retour (succès, erreur) annoncées aux lecteurs d'écran (RGAA 7.5). */
  function annonces(racine) {
    (racine || document)
      .querySelectorAll('[id^="retour"], [id^="message-"], [id^="erreur"], .msg-erreur, .msg-succes')
      .forEach((el) => {
        if (el.hasAttribute('aria-live') || el.closest('[aria-live]')) return;
        el.setAttribute('aria-live', el.classList.contains('msg-erreur') ? 'assertive' : 'polite');
      });
  }
  /** Modales (.voile-modale-qr) : boîte de dialogue, Échap, focus placé, gardé et restitué
   *  (RGAA 7.1, 12.8, 12.9). */
  const retourFocus = new WeakMap();
  function preparerModale(voile) {
    const m = voile.querySelector('.modale-qr');
    if (!m || m.dataset.a11y) return;
    m.dataset.a11y = '1';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    const titre = m.querySelector('h1, h2, h3');
    if (titre) {
      if (!titre.id) titre.id = 'titre-' + (voile.id || Math.random().toString(36).slice(2));
      m.setAttribute('aria-labelledby', titre.id);
    }
    if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1');
    new MutationObserver(() => {
      const ouverte = voile.classList.contains('visible') && !voile.hidden;
      if (ouverte && !retourFocus.has(voile)) {
        retourFocus.set(voile, document.activeElement);
        setTimeout(() => {
          const f =
            m.querySelector('input:not([type="hidden"]):not([disabled]), select, textarea') ||
            m.querySelector(FOCUSABLES) ||
            m;
          f.focus();
        }, 30);
      } else if (!ouverte && retourFocus.has(voile)) {
        const origine = retourFocus.get(voile);
        retourFocus.delete(voile);
        if (origine && origine.isConnected && origine.focus) origine.focus();
      }
    }).observe(voile, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }
  function modaleOuverte() {
    return [...document.querySelectorAll('.voile-modale-qr.visible')].filter((v) => !v.hidden).pop() || null;
  }
  document.addEventListener('keydown', (e) => {
    const voile = modaleOuverte();
    if (!voile || document.querySelector('.cvdl-conf-voile')) return;
    const m = voile.querySelector('.modale-qr') || voile;
    if (e.key === 'Escape') {
      const fermer = m.querySelector(
        '.modale-fermer-rond-qr, [data-fermer-modale], [id$="-fermer"], [id^="fermer"], .btn-icon[aria-label*="ermer"], button[aria-label="Fermer"]',
      );
      if (fermer) {
        e.preventDefault();
        fermer.click();
      } else voile.classList.remove('visible');
      return;
    }
    if (e.key === 'Tab') {
      const f = [...m.querySelectorAll(FOCUSABLES)].filter((x) => x.offsetParent !== null);
      if (!f.length) {
        e.preventDefault();
        m.focus();
        return;
      }
      const premier = f[0],
        dernier = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === premier || document.activeElement === m)) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      } else if (!m.contains(document.activeElement)) {
        e.preventDefault();
        premier.focus();
      }
    }
  });
  function accessibilite(racine) {
    annonces(racine);
    (racine || document).querySelectorAll('.voile-modale-qr').forEach(preparerModale);
  }

  function tout(racine) {
    titres(racine);
    formes(racine);
    eclats(racine);
    accessibilite(racine);
  }
  function demarrer() {
    if (!document.body || !document.body.dataset.famille) return;
    document.documentElement.classList.add('cvdl');
    entete();
    gestes();
    lienEvitement();
    tout(document);
    if (window.portailIllustrations) window.portailIllustrations(document);
    let file = new Set(),
      prevu = false;
    new MutationObserver((mut) => {
      for (const m of mut) {
        const cible = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (cible) file.add(cible.parentElement || cible);
      }
      if (prevu) return;
      prevu = true;
      requestAnimationFrame(() => {
        prevu = false;
        const lot = file;
        file = new Set();
        lot.forEach((el) => {
          if (el.isConnected) tout(el);
        });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.cvdlFormeStatut = formeDe;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();

/* ── Modales de saisie : avertissement avant de perdre ce qui a été saisi ──
   Dès qu'un champ d'une modale (.voile-modale-qr, panneau du Projet, « Donner mon avis »,
   <dialog>) a été rempli, la fermer (croix, Annuler, clic à côté, Échap) demande confirmation.
   Un clic à côté d'une modale .voile-modale-qr ou d'un <dialog> la ferme. Champ exclu :
   type="search" ou [data-sans-garde]. */
(function () {
  const RACINES = '.voile-modale-qr, .pj-voile, .rt-fond, dialog';
  const FERMETURES =
    '.modale-fermer-rond-qr, [data-fermer], [data-fermer-modale], [data-rt="fermer"], [id$="-fermer"], [id^="fermer"], button[aria-label="Fermer"]';
  const saisies = new WeakSet();
  let rejeu = false;
  let appuiSur = null;

  const ouverte = (r) =>
    r.isConnected &&
    !r.hidden &&
    (r.tagName === 'DIALOG' ? r.open : !r.classList.contains('voile-modale-qr') || r.classList.contains('visible'));
  const auPremierPlan = () => {
    const actif = document.activeElement && document.activeElement.closest && document.activeElement.closest(RACINES);
    if (actif && ouverte(actif)) return actif;
    return [...document.querySelectorAll(RACINES)].filter(ouverte).pop() || null;
  };
  const estFermeture = (bouton) =>
    bouton.matches(FERMETURES) ||
    (bouton.tagName === 'BUTTON' && /^(annuler|fermer)$/i.test((bouton.textContent || '').trim()));
  const confirmer = () =>
    window.confirmerCvdl
      ? window.confirmerCvdl('Fermer sans enregistrer ?\nCe que vous avez saisi sera perdu.', { ok: 'Fermer' })
      : Promise.resolve(window.confirm('Fermer sans enregistrer ? Ce que vous avez saisi sera perdu.'));
  /** Rejoue la fermeture demandée, sans repasser par la garde. */
  function rejouer(action) {
    rejeu = true;
    try {
      action();
    } finally {
      rejeu = false;
    }
  }
  /** Clic à côté : fermeture par le bouton de la modale (même effet que « Annuler »). */
  function fermerParLeFond(r) {
    if (r.tagName === 'DIALOG') return r.close();
    if (!r.classList.contains('voile-modale-qr')) return r.click();
    const m = r.querySelector('.modale-qr') || r;
    const b = [...m.querySelectorAll('button')].find(estFermeture);
    if (b) b.click();
    else r.classList.remove('visible');
  }
  function garder(r, e, fermeture) {
    if (!saisies.has(r)) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    confirmer().then((ok) => {
      if (!ok || !ouverte(r)) return;
      saisies.delete(r);
      rejouer(fermeture);
    });
    return true;
  }

  function noter(e) {
    const t = e.target;
    if (!e.isTrusted || !t.matches || !t.matches('input, textarea, select')) return;
    if (t.type === 'search' || t.closest('[data-sans-garde]')) return;
    const r = t.closest(RACINES);
    if (r) saisies.add(r);
  }
  document.addEventListener('input', noter, true);
  document.addEventListener('change', noter, true);
  // Une modale refermée (enregistrée, annulée) repart de zéro à sa prochaine ouverture.
  new MutationObserver((muts) =>
    muts.forEach((m) => {
      if (saisies.has(m.target) && !ouverte(m.target)) saisies.delete(m.target);
    }),
  ).observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'open'],
  });

  // Un glisser commencé dans la modale (sélection de texte) et relâché à côté n'est pas un clic à côté.
  window.addEventListener('pointerdown', (e) => (appuiSur = e.target), true);
  window.addEventListener(
    'click',
    (e) => {
      if (rejeu || !e.target.closest || document.querySelector('.cvdl-conf-voile')) return;
      const r = e.target.closest(RACINES);
      if (!r || !ouverte(r)) return;
      const fond =
        r.tagName === 'DIALOG'
          ? e.target === r &&
            appuiSur === r &&
            (() => {
              const b = r.getBoundingClientRect();
              return e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom;
            })()
          : e.target === r && appuiSur === r;
      if (fond) {
        if (garder(r, e, () => fermerParLeFond(r))) return;
        if (r.tagName === 'DIALOG' || r.classList.contains('voile-modale-qr')) {
          // Fermée ici une seule fois (la page ne la referme pas une seconde fois).
          e.stopImmediatePropagation();
          rejouer(() => fermerParLeFond(r));
        }
        return;
      }
      const bouton = e.target.closest('button, a, [role="button"]');
      if (bouton && r.contains(bouton) && estFermeture(bouton)) garder(r, e, () => bouton.click());
    },
    true,
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (rejeu || e.key !== 'Escape' || document.querySelector('.cvdl-conf-voile')) return;
      const r = auPremierPlan();
      if (!r) return;
      const cible = e.target;
      garder(r, e, () =>
        r.tagName === 'DIALOG'
          ? r.close()
          : cible.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })),
      );
    },
    true,
  );
})();
