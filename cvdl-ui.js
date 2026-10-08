/* cvdl-ui.js — système visuel commun de l'espace public (maquette « Système unifié ») :
   en-tête commun, bloc titre (illustration + sur-titre + titre), formes des statuts
   (losange : en attente d'une décision, carré : en cours, rond : terminé).
   Ne touche à aucune logique : déplace seulement des éléments existants (mêmes références,
   mêmes écouteurs) et pose des attributs lus par cvdl-ui.css. */
(function () {
  /* ── Préférences d'affichage (panneau « Affichage ») : appliquées dès le chargement ── */
  const CLE_AFFICHAGE = 'cvdl-affichage';
  const PREF_DEFAUT = {
    contraste: false,
    taille: 'normale',
    espacement: false,
    police: false,
    animations: true,
    liens: false,
  };
  function lirePrefs() {
    try {
      return Object.assign({}, PREF_DEFAUT, JSON.parse(localStorage.getItem(CLE_AFFICHAGE) || '{}'));
    } catch (e) {
      return Object.assign({}, PREF_DEFAUT);
    }
  }
  function appliquerPrefs(p) {
    const h = document.documentElement;
    h.classList.toggle('cvdl-contraste', !!p.contraste);
    h.classList.toggle('cvdl-espacement', !!p.espacement);
    h.classList.toggle('cvdl-police', !!p.police);
    h.classList.toggle('cvdl-sans-anim', !p.animations);
    h.classList.toggle('cvdl-liens', !!p.liens);
    h.dataset.cvdlTaille = p.taille || 'normale';
    // Police très lisible : chargée seulement si elle est choisie
    if (p.police && !document.getElementById('cvdl-police-lisible')) {
      const l = document.createElement('link');
      l.id = 'cvdl-police-lisible';
      l.rel = 'stylesheet';
      l.href =
        'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';
      document.head.appendChild(l);
    }
  }
  appliquerPrefs(lirePrefs());
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
      : page === 'projet'
        ? 'projet.html'
        : page === 'portail'
          ? 'portail.html'
          : page === 'accueil'
            ? 'accueil.html'
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

  /* ── Panneau « Affichage » (bouton dans l'en-tête) ── */
  function panneauAffichage() {
    const actions = document.querySelector('.cvdl-entete-actions');
    if (!actions || document.getElementById('cvdl-affichage-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'cvdl-affichage-btn';
    btn.className = 'cvdl-affichage-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'cvdl-affichage');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor"/></svg><span>Affichage</span>';
    actions.prepend(btn);
    const pan = document.createElement('div');
    pan.id = 'cvdl-affichage';
    pan.className = 'cvdl-affichage';
    pan.hidden = true;
    pan.setAttribute('role', 'dialog');
    pan.setAttribute('aria-modal', 'false');
    pan.setAttribute('aria-labelledby', 'cvdl-affichage-titre');
    const inter = (id, titre, aide) =>
      `<label class="cvdl-aff-opt"><span><b>${titre}</b><small>${aide}</small></span><span class="cvdl-aff-inter"><input type="checkbox" data-pref="${id}"><i aria-hidden="true"></i></span></label>`;
    pan.innerHTML = `
      <div class="cvdl-aff-tete"><h2 id="cvdl-affichage-titre">Affichage</h2><button type="button" class="cvdl-aff-fermer" aria-label="Fermer le panneau Affichage">✕</button></div>
      <fieldset class="cvdl-aff-taille"><legend>Taille du texte</legend>
        ${[
          ['normale', 'Normale'],
          ['grande', 'Grande'],
          ['tres-grande', 'Très grande'],
        ]
          .map(([v, l]) => `<label><input type="radio" name="cvdl-taille" value="${v}"><span>${l}</span></label>`)
          .join('')}
      </fieldset>
      ${inter('contraste', 'Contraste renforcé', 'Bleu nuit sur blanc, sans teintes ni gris clairs.')}
      ${inter('espacement', 'Texte espacé', 'Plus d’espace entre les lignes, les mots et les lettres.')}
      ${inter('police', 'Police très lisible', 'Atkinson Hyperlegible, conçue pour les personnes malvoyantes.')}
      ${inter('liens', 'Liens soulignés', 'Tous les liens sont soulignés.')}
      ${inter('animations', 'Animations', 'Décochez pour supprimer les mouvements.')}
      <button type="button" class="cvdl-aff-reset">Rétablir l’affichage par défaut</button>`;
    actions.appendChild(pan);
    const synchro = () => {
      const p = lirePrefs();
      pan.querySelectorAll('[data-pref]').forEach((i) => {
        i.checked = !!p[i.dataset.pref];
      });
      pan.querySelectorAll('input[name="cvdl-taille"]').forEach((i) => {
        i.checked = i.value === (p.taille || 'normale');
      });
    };
    const enregistrer = (p) => {
      try {
        localStorage.setItem(CLE_AFFICHAGE, JSON.stringify(p));
      } catch (e) {}
      appliquerPrefs(p);
    };
    pan.addEventListener('change', (e) => {
      const p = lirePrefs();
      if (e.target.dataset.pref) p[e.target.dataset.pref] = e.target.checked;
      if (e.target.name === 'cvdl-taille') p.taille = e.target.value;
      enregistrer(p);
    });
    const ouvrir = () => {
      synchro();
      pan.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      (pan.querySelector('input:checked') || pan.querySelector('input')).focus();
    };
    const fermer = (rendreFocus = true) => {
      pan.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (rendreFocus) btn.focus();
    };
    btn.addEventListener('click', () => (pan.hidden ? ouvrir() : fermer()));
    pan.querySelector('.cvdl-aff-fermer').addEventListener('click', () => fermer());
    pan.querySelector('.cvdl-aff-reset').addEventListener('click', () => {
      enregistrer(Object.assign({}, PREF_DEFAUT));
      synchro();
    });
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && !pan.hidden) {
          e.stopPropagation();
          fermer();
        }
      },
      true,
    );
    document.addEventListener('click', (e) => {
      if (!pan.hidden && !pan.contains(e.target) && !btn.contains(e.target)) fermer(false);
    });
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
    panneauAffichage();
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
