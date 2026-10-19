/* ════════════════════════════════════════════════════════════════════════════════════
   affichage.js — réglages d'accessibilité (panneau « Affichage ») : taille du texte, contraste
   renforcé, texte espacé, police très lisible, liens soulignés, animations. Chargé dans le
   <head> de toutes les pages (site public, espace Logistique, admin, démo) : les réglages,
   gardés dans ce navigateur, s'appliquent avant l'affichage et suivent d'une page à l'autre.
   Styles : affichage.css (+ contraste détaillé des pages publiques dans cvdl-ui.css).
   ════════════════════════════════════════════════════════════════════════════════════ */
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
    if (document.body) suivreFondsSombres();
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
  /* ── Contraste renforcé : le texte passe en bleu nuit… sauf sur un fond sombre (bandeau,
     pastille, bouton, date…), où il passe en blanc. Repéré à l'affichage, pour tous les
     éléments présents ou ajoutés ensuite (classe cvdl-sur-sombre, voir affichage.css). ── */
  // Couleur CSS quelconque (rgb, oklch, color()…) → { r, g, b, a } : convertie par le navigateur
  // en la peignant sur un pixel ; mémorisée par valeur.
  const memoCouleurs = new Map();
  let pixel = null;
  function composantes(c) {
    if (!c || c === 'transparent') return null;
    if (memoCouleurs.has(c)) return memoCouleurs.get(c);
    if (!pixel) pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = '#000';
    pixel.fillStyle = c;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
    const resultat = { r, g, b, a: a / 255 };
    memoCouleurs.set(c, resultat);
    return resultat;
  }
  const luminance = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  /** Le fond visible derrière un élément est-il sombre (le bleu nuit sur ce fond serait illisible) ? */
  function surFondSombre(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const c = composantes(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.6) return luminance(c) < 0.18;
    }
    return false;
  }
  function marquerFondsSombres() {
    if (!document.documentElement.classList.contains('cvdl-contraste')) return;
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      el.classList.toggle('cvdl-sur-sombre', surFondSombre(el));
    }
  }
  let observateur = null;
  let attente = 0;
  function suivreFondsSombres() {
    const actif = document.documentElement.classList.contains('cvdl-contraste');
    if (!actif) {
      if (observateur) observateur.disconnect();
      observateur = null;
      document.querySelectorAll('.cvdl-sur-sombre').forEach((e) => e.classList.remove('cvdl-sur-sombre'));
      return;
    }
    marquerFondsSombres();
    if (observateur) return;
    // classList.toggle(…, état) ne modifie rien quand l'état est déjà le bon : après un passage,
    // le suivant ne change plus rien et la surveillance se calme.
    observateur = new MutationObserver(() => {
      clearTimeout(attente);
      attente = setTimeout(marquerFondsSombres, 120);
    });
    observateur.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-selected', 'aria-pressed', 'hidden'],
    });
  }
  appliquerPrefs(lirePrefs());
  if (!document.body) document.addEventListener('DOMContentLoaded', suivreFondsSombres);

  /* ── Panneau « Affichage » : dans l'en-tête des pages publiques, à côté du compte dans
     l'espace Logistique, en bas du menu de l'admin ── */
  function panneauAffichage() {
    if (document.getElementById('cvdl-affichage-btn')) return;
    const actions = document.querySelector('.cvdl-entete-actions, .ac-entete-actions');
    const logistique = !actions && document.getElementById('sp-moi');
    const admin = !actions && !logistique && document.getElementById('rp-toggle-largeur');
    if (!actions && !logistique && !admin) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'cvdl-affichage-btn';
    btn.className = admin ? 'rp-toggle-theme cvdl-affichage-admin' : 'cvdl-affichage-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'cvdl-affichage');
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor"/></svg><span${admin ? ' class="rp-label"' : ''}>Affichage</span>`;
    if (actions) actions.prepend(btn);
    else if (logistique) logistique.before(btn);
    else admin.before(btn);
    const pan = document.createElement('div');
    pan.id = 'cvdl-affichage';
    pan.className = 'cvdl-affichage' + (actions ? '' : admin ? ' flottant bas-gauche' : ' flottant');
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
    (actions || document.body).appendChild(pan);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', panneauAffichage);
  else panneauAffichage();
})();
