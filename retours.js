/* ════════════════════════════════════════════════════════════════════════════════════
   retours.js — retours utilisateurs des pages publiques (onglet « Retours » de l'admin).
   · Une note = une ligne « ces » ; le mot facultatif = une ligne « avis » (même note), pour ne
     jamais compter deux fois la même note.
   · Avis rapide après une commande / un SAV envoyé : « Était-ce simple ? » (3 visages) et un
     mot facultatif — une seule question, jamais au milieu d'une tâche, une fois par dossier ;
   · « Donner mon avis » à tout moment (CvdlRetours.ouvrirAvis) ;
   · erreurs rencontrées, sans rien demander : messages d'erreur affichés (.msg-erreur) et
     erreurs techniques de la page (5 au plus par page, sans doublon).
   Données minimales et anonymes (aucun nom, e-mail ni date de naissance ; masquage côté
   serveur), conservées 13 mois. Styles : retours.css. Aucune dépendance.
   ════════════════════════════════════════════════════════════════════════════════════ */
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lire = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const ecrire = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  const api = () => (typeof API !== 'undefined' && API) ? API : (window.CVDL_API || '');
  const codeStructure = () => { try{ return sessionStorage.getItem('cvdl-code-structure') || ''; }catch(e){ return ''; } };
  const page = () => location.pathname.split('/').pop() || 'index.html';
  const parcoursPage = () => page().replace(/\.html$/, '');

  function envoyer(donnees, balise){
    const url = api(); if(!url) return Promise.resolve({ ok: false });
    const corps = JSON.stringify(Object.assign({ action: 'retour-enregistrer', page: page(), code: codeStructure(),
      details: { largeur: window.innerWidth, mobile: window.innerWidth < 700 ? 'oui' : 'non' } }, donnees));
    if(balise && navigator.sendBeacon){ try{ navigator.sendBeacon(url, new Blob([corps], { type: 'text/plain;charset=utf-8' })); return Promise.resolve({ ok: true }); }catch(e){} }
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: corps, keepalive: true })
      .then(r => r.json()).catch(() => ({ ok: false }));
  }

  /* ── Visages (dessin CVDL : trait bleu nuit + aplat décalé) ── */
  const FOND = { 1: 'color-mix(in srgb, #E5484D 38%, #fff)', 2: 'color-mix(in srgb, #FECC38 55%, #fff)', 3: 'color-mix(in srgb, #1F9D55 35%, #fff)' };
  const BOUCHE = { 1: 'M17 32c2.2-3 11.8-3 14 0', 2: 'M17 30.5h14', 3: 'M16.5 28c2.4 4 12.6 4 15 0' };
  const visage = n => `<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" style="overflow:visible"><circle cx="26" cy="26" r="16" fill="${FOND[n]}"/><g fill="none" stroke="#002743" stroke-width="1.9" stroke-linecap="round"><circle cx="24" cy="24" r="16"/><path d="${BOUCHE[n]}"/></g><circle cx="18.5" cy="20" r="1.9" fill="#002743"/><circle cx="29.5" cy="20" r="1.9" fill="#002743"/></svg>`;
  const LIBELLES = { 1: 'Difficile', 2: 'Moyen', 3: 'Facile' };

  function formulaire(opts){
    const id = 'rt-' + Math.random().toString(36).slice(2, 7);
    return `
      <div class="rt-question" id="${id}-q">${esc(opts.question).replace(/ ([?!:;])/g, '\u00a0$1')}</div>
      <div class="rt-visages" role="radiogroup" aria-labelledby="${id}-q">
        ${[1, 2, 3].map(n => `<button type="button" class="rt-visage" role="radio" aria-checked="false" data-rt-note="${n}">${visage(n)}<span>${LIBELLES[n]}</span></button>`).join('')}
      </div>
      <div class="rt-suite" hidden>
        <label class="rt-label" for="${id}-c">${esc(opts.relance || 'Un mot pour nous aider à améliorer ? (facultatif)')}</label>
        <textarea class="input rt-texte" id="${id}-c" rows="2" maxlength="1000" placeholder="Ce qui vous a plu, gêné ou manqué…"></textarea>
        <div class="rt-actions"><span class="rt-mention">Anonyme, sert uniquement à améliorer l’outil.</span><button type="button" class="btn btn-primary rt-envoyer" data-rt="envoyer">Envoyer</button></div>
      </div>
      <div class="rt-merci" hidden role="status"><b>Merci !</b> Votre retour nous aide à améliorer l’outil.</div>`;
  }

  function cabler(boite, opts, fin){
    let note = '';
    boite.addEventListener('click', e => {
      const v = e.target.closest('[data-rt-note]');
      if(v){
        note = v.dataset.rtNote;
        boite.querySelectorAll('[data-rt-note]').forEach(b => { const on = b === v; b.classList.toggle('choisi', on); b.setAttribute('aria-checked', String(on)); });
        // La note part tout de suite (même si la personne s'arrête là) ; le mot la complète ensuite.
        if(!boite.dataset.rtEnvoye){ boite.dataset.rtEnvoye = '1'; envoyer({ type: 'ces', parcours: opts.parcours, reference: opts.reference, note }); ecrire(opts.cle, 'oui'); }
        const suite = boite.querySelector('.rt-suite'); suite.hidden = false;
        if(note === '1'){ boite.querySelector('.rt-label').textContent = 'Qu’est-ce qui a été difficile ? (facultatif)'; }
        return;
      }
      if(e.target.closest('[data-rt="envoyer"]')){
        const txt = boite.querySelector('.rt-texte').value.trim();
        if(txt) envoyer({ type: 'avis', parcours: opts.parcours, reference: opts.reference, note, commentaire: txt });
        boite.querySelector('.rt-suite').hidden = true;
        boite.querySelector('.rt-visages').hidden = true;
        boite.querySelector('.rt-question').hidden = true;
        boite.querySelector('.rt-merci').hidden = false;
        if(fin) setTimeout(fin, 1600);
      }
    });
  }

  /** Avis rapide dans un conteneur (écran de confirmation). Une fois par dossier. */
  function demanderAvis(conteneur, opts){
    if(!conteneur) return;
    const cle = `cvdl-retour-${opts.parcours}-${opts.reference || 'x'}`;
    if(lire(cle)) return;
    const boite = document.createElement('div');
    boite.className = 'rt-carte';
    boite.innerHTML = formulaire({ question: opts.question || 'Était-ce simple ?' });
    conteneur.appendChild(boite);
    cabler(boite, Object.assign({ cle }, opts));
  }

  /** « Donner mon avis » : petite fenêtre, à tout moment. */
  function ouvrirAvis(opts){
    opts = opts || {};
    const fond = document.createElement('div');
    fond.className = 'rt-fond';
    fond.innerHTML = `<div class="rt-fenetre" role="dialog" aria-modal="true" aria-labelledby="rt-titre-avis">
      <button type="button" class="rt-fermer" data-rt="fermer" aria-label="Fermer"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="rt-surtitre">Votre avis</div><h2 class="rt-titre" id="rt-titre-avis">Comment se passe votre utilisation ?</h2>
      ${formulaire({ question: opts.question || 'Globalement, l’espace est-il simple à utiliser ?', relance: 'Dites-nous en plus (facultatif) : une idée, un souci, une remarque…' })}
    </div>`;
    document.body.appendChild(fond);
    const fermer = () => { fond.remove(); document.removeEventListener('keydown', echap); };
    const echap = e => { if(e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', echap);
    fond.addEventListener('click', e => { if(e.target === fond || e.target.closest('[data-rt="fermer"]')) fermer(); });
    cabler(fond.querySelector('.rt-fenetre'), { parcours: opts.parcours || parcoursPage(), cle: 'cvdl-retour-avis-' + Date.now() }, fermer);
    const premier = fond.querySelector('[data-rt-note]'); if(premier) premier.focus();
  }

  /* ── Erreurs rencontrées (sans rien demander) ── */
  const vues = new Set();
  function noterErreur(type, message, extra){
    const m = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if(!m || vues.has(type + m) || vues.size >= 5) return;
    vues.add(type + m);
    envoyer(Object.assign({ type, parcours: parcoursPage(), commentaire: m }, extra || {}), true);
  }
  window.addEventListener('error', e => {
    if(!e || !e.message || /Script error|ResizeObserver/i.test(e.message)) return;
    noterErreur('erreur-js', e.message, { details: { source: String(e.filename || '').split('/').pop(), ligne: e.lineno || '' } });
  });
  window.addEventListener('unhandledrejection', e => {
    const r = e && e.reason; const m = r && (r.message || String(r));
    if(m && !/Failed to fetch|NetworkError|Load failed/i.test(m)) noterErreur('erreur-js', m);
    else if(m) noterErreur('erreur-page', 'Connexion au serveur impossible');
  });
  function surveiller(){
    const vu = new WeakSet();
    const scanner = racine => {
      (racine.querySelectorAll ? racine.querySelectorAll('.msg-erreur') : []).forEach(el => {
        if(vu.has(el) || el.closest('[hidden]')) return;
        vu.add(el);
        noterErreur('erreur-page', el.textContent);
      });
    };
    new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if(n.nodeType === 1){ if(n.classList && n.classList.contains('msg-erreur')) scanner(n.parentNode || n); else scanner(n); } }))).observe(document.body, { childList: true, subtree: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', surveiller); else surveiller();

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-donner-avis]');
    if(a){ e.preventDefault(); ouvrirAvis({ parcours: a.dataset.donnerAvis || parcoursPage() }); }
  });

  window.CvdlRetours = { demanderAvis, ouvrirAvis, noterErreur };
})();
