/* ════════════════════════════════════════════════════════════════════════════════════
   assistant-portail.js — assistant en étapes de l'espace structure (même parcours que les
   assistants de l'admin : frise cliquable, une question par étape, récapitulatif modifiable).
   Sert à « Nouvelle structure partenaire » et « Nouveau projet de distribution ».

   AssistantPortail.ouvrir({
     surtitre, titre(v), etapes: [{ cle, titre, ill, h, p }],
     v,                       valeurs de départ (objet modifié en place)
     corps(cle, v),           HTML de l'étape
     verifier(cle, v),        '' ou message d'erreur (bloque le passage à l'étape suivante)
     terminer(v),             async → { ok, erreur }
     libelleFin, modification (toutes les étapes accessibles d'emblée), apresRendu(racine, v)
   })
   Champs : [data-ap="cle"] (texte, select, case → booléen, radio → valeur cochée) ;
   [data-ap-liste="cle"] cases multiples → tableau ; [data-ap-rendre] redessine l'étape au
   changement ; [data-ap-aller="i"] va à l'étape i (récapitulatif).
   Styles : assistant-portail.css. Aucune dépendance (confirmerCvdl facultatif).
   ════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  let cfg = null,
    etape = 0,
    vues = 0,
    racine = null,
    precedentFocus = null;
  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  };

  function rendre() {
    const et = cfg.etapes[etape],
      derniere = etape === cfg.etapes.length - 1;
    const frise = cfg.etapes
      .map((e, i) => {
        const etat = i < etape ? 'fait' : i === etape ? 'cours' : 'avenir';
        const cliquable = i !== etape && i <= vues;
        const dedans = `<i>${i < etape ? '✓' : i + 1}</i><span>${esc(e.titre)}</span>`;
        return `<li class="${etat}">${cliquable ? `<button type="button" data-ap-aller="${i}">${dedans}</button>` : `<div${etat === 'cours' ? ' aria-current="step"' : ''}>${dedans}</div>`}</li>`;
      })
      .join('');
    racine.innerHTML = `
      <div class="ap-modale" role="dialog" aria-modal="true" aria-labelledby="ap-titre">
        <header class="ap-tete">
          <div><div class="ap-sur">${esc(cfg.surtitre)} · étape ${etape + 1} sur ${cfg.etapes.length}</div>
          <h2 id="ap-titre">${esc(cfg.titre(cfg.v))}</h2></div>
          <button type="button" class="ap-fermer" data-ap-fermer aria-label="Fermer">×</button>
        </header>
        <ol class="ap-frise">${frise}</ol>
        <div class="ap-corps">
          <div class="ap-intro"><span data-ill="${esc(et.ill || 'structure')}" class="ill xl"></span><div><h3>${esc(et.h)}</h3>${et.p ? `<p>${esc(et.p)}</p>` : ''}</div></div>
          ${cfg.corps(et.cle, cfg.v)}
        </div>
        <div class="ap-retour" aria-live="polite"></div>
        <footer class="ap-pied">
          <button type="button" class="btn btn-ghost" data-ap-fermer>Annuler</button>
          <span style="flex:1"></span>
          ${etape > 0 ? '<button type="button" class="btn btn-secondary" data-ap-precedent>← Précédent</button>' : ''}
          ${!derniere ? `<button type="button" class="btn ${cfg.modification ? 'btn-secondary' : 'btn-primary'}" data-ap-suivant>Suivant →</button>` : ''}
          ${derniere || cfg.modification ? `<button type="button" class="btn btn-primary" data-ap-fin>${esc(cfg.libelleFin || 'Enregistrer')}</button>` : ''}
        </footer>
      </div>`;
    if (window.portailIllustrations) window.portailIllustrations(racine);
    if (cfg.apresRendu) cfg.apresRendu(racine, cfg.v);
  }
  function erreur(msg) {
    const z = racine.querySelector('.ap-retour');
    if (z) z.innerHTML = msg ? `<div class="msg msg-erreur">${esc(msg)}</div>` : '';
  }
  function aller(cible) {
    if (cible > etape) {
      for (let i = etape; i < cible; i++) {
        const err = cfg.verifier ? cfg.verifier(cfg.etapes[i].cle, cfg.v) : '';
        if (err) {
          etape = i;
          rendre();
          erreur(err);
          return false;
        }
      }
    }
    etape = Math.max(0, Math.min(cfg.etapes.length - 1, cible));
    vues = Math.max(vues, etape);
    rendre();
    const corps = racine.querySelector('.ap-corps');
    if (corps) corps.scrollTop = 0;
    const premier = racine.querySelector(
      '.ap-corps input:not([type=radio]):not([type=checkbox]):not([readonly]), .ap-corps select, .ap-corps textarea',
    );
    if (premier && etape < cfg.etapes.length - 1) premier.focus({ preventScroll: true });
    return true;
  }
  async function terminer() {
    for (let i = 0; i < cfg.etapes.length - 1; i++) {
      const err = cfg.verifier ? cfg.verifier(cfg.etapes[i].cle, cfg.v) : '';
      if (err) {
        etape = i;
        rendre();
        erreur(err);
        return;
      }
    }
    const b = racine.querySelector('[data-ap-fin]');
    if (b) {
      b.disabled = true;
      b.textContent = 'Enregistrement…';
    }
    let r;
    try {
      r = await cfg.terminer(cfg.v);
    } catch (e) {
      r = { ok: false, erreur: 'Connexion impossible — réessayez.' };
    }
    if (r && r.ok) {
      fermer(true);
      return;
    }
    if (b) {
      b.disabled = false;
      b.textContent = cfg.libelleFin || 'Enregistrer';
    }
    erreur((r && r.erreur) || 'Enregistrement impossible.');
  }
  function lire(el) {
    if (el.dataset.ap) {
      const k = el.dataset.ap;
      if (el.type === 'checkbox') cfg.v[k] = el.checked;
      else if (el.type === 'radio') {
        if (el.checked) cfg.v[k] = el.value;
      } else cfg.v[k] = el.value;
      return true;
    }
    if (el.dataset.apListe) {
      const k = el.dataset.apListe;
      cfg.v[k] = [...racine.querySelectorAll(`[data-ap-liste="${k}"]:checked`)].map((x) => x.value);
      return true;
    }
    return false;
  }
  function fermer(fini) {
    if (!racine) return;
    racine.remove();
    racine = null;
    document.documentElement.classList.remove('ap-ouvert');
    document.removeEventListener('keydown', clavier, true);
    const c = cfg;
    cfg = null;
    if (precedentFocus && precedentFocus.focus) precedentFocus.focus();
    if (c && c.apresFermeture) c.apresFermeture(!!fini);
  }
  async function demanderFermeture() {
    if (
      window.confirmerCvdl &&
      !cfg.modification &&
      !(await window.confirmerCvdl('Fermer sans enregistrer ? Ce qui a été saisi sera perdu.'))
    )
      return;
    fermer(false);
  }
  function clavier(e) {
    if (!racine) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      demanderFermeture();
      return;
    }
    if (
      e.key === 'Enter' &&
      e.target.tagName !== 'TEXTAREA' &&
      e.target.tagName !== 'BUTTON' &&
      racine.contains(e.target)
    ) {
      e.preventDefault();
      if (etape < cfg.etapes.length - 1) aller(etape + 1);
      else terminer();
    }
  }

  window.AssistantPortail = {
    ouvrir(options) {
      if (racine) fermer(false);
      cfg = options;
      etape = 0;
      vues = options.modification ? options.etapes.length - 1 : 0;
      precedentFocus = document.activeElement;
      racine = document.createElement('div');
      racine.className = 'ap-voile';
      document.body.appendChild(racine);
      document.documentElement.classList.add('ap-ouvert');
      racine.addEventListener('click', (e) => {
        if (e.target === racine) {
          demanderFermeture();
          return;
        }
        const a = e.target.closest('[data-ap-aller]');
        if (a) {
          aller(parseInt(a.dataset.apAller, 10));
          return;
        }
        if (e.target.closest('[data-ap-suivant]')) {
          aller(etape + 1);
          return;
        }
        if (e.target.closest('[data-ap-precedent]')) {
          aller(etape - 1);
          return;
        }
        if (e.target.closest('[data-ap-fin]')) {
          terminer();
          return;
        }
        if (e.target.closest('[data-ap-fermer]')) {
          demanderFermeture();
          return;
        }
        if (cfg.clic) cfg.clic(e, cfg.v, rendre);
      });
      racine.addEventListener('input', (e) => {
        lire(e.target);
        if (cfg.saisie) cfg.saisie(e.target, cfg.v, 'input');
      });
      racine.addEventListener('change', (e) => {
        lire(e.target);
        if (cfg.saisie) cfg.saisie(e.target, cfg.v, 'change');
        if (e.target.closest('[data-ap-rendre]')) rendre();
      });
      document.addEventListener('keydown', clavier, true);
      rendre();
      const premier = racine.querySelector('.ap-corps input:not([type=radio]):not([type=checkbox]), .ap-corps select');
      if (premier) premier.focus({ preventScroll: true });
    },
    rendre() {
      if (racine) rendre();
    },
    fermer,
    echapper: esc,
  };
})();
