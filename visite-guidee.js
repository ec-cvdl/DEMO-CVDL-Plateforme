/* ════════════════════════════════════════════════════════════════════════════════════
   visite-guidee.js — petite visite guidée à la première connexion (espace structure).
   · 3 secondes pour découvrir la page (pastille « Visite guidée dans 3 s · Passer ») ;
   · puis tout se floute sauf la zone expliquée, avec une bulle courte (2-3 étapes) ;
   · Échap ou « Passer » arrête tout ; mémorisé par appareil et par structure ;
   · « Revoir la visite » relance à la demande (CvdlVisite.lancer(options, true)).
   Styles : visite-guidee.css. Aucune dépendance.

   CvdlVisite.lancer({
     cle,        // clé de mémorisation (ex. 'cvdl-visite-v1-CODE')
     accueil,    // phrase d'accueil affichée dans la première bulle
     delai,      // ms avant de démarrer (défaut 3000)
     etapes: [{ cibles: ['sélecteur', …], titre, texte, ill }]
   }, immediat)
   ════════════════════════════════════════════════════════════════════════════════════ */
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lire = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const ecrire = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  const reduit = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let enCours = null;

  function lancer(opts, immediat){
    if(enCours) return;
    if(!opts || !opts.etapes || !opts.etapes.length) return;
    if(!immediat && lire(opts.cle) === 'vu') return;
    const etapes = opts.etapes.filter(e => e.cibles.some(s => document.querySelector(s)));
    if(!etapes.length) return;
    enCours = { opts, etapes, index: 0 };
    if(immediat) return demarrer();
    attente(opts.delai == null ? 3000 : opts.delai);
  }

  /* 1) Quelques secondes pour découvrir la page, avec possibilité de passer. */
  function attente(ms){
    const chip = document.createElement('div');
    chip.className = 'vg-attente';
    chip.setAttribute('role', 'status');
    chip.innerHTML = `<span class="vg-attente-ill" aria-hidden="true"><span data-ill="aide" class="ill s"></span></span>
      <span>Petite visite guidée dans <b data-vg-sec>${Math.ceil(ms / 1000)}</b> s</span>
      <button type="button" class="vg-lien" data-vg="plus-tard">Passer</button>
      <i class="vg-attente-barre" style="animation-duration:${ms}ms"></i>`;
    document.body.appendChild(chip);
    if(window.portailIllustrations) window.portailIllustrations(chip);
    const debut = Date.now();
    const tic = setInterval(() => {
      const reste = Math.max(0, Math.ceil((ms - (Date.now() - debut)) / 1000));
      const b = chip.querySelector('[data-vg-sec]'); if(b) b.textContent = reste;
    }, 250);
    const minuteur = setTimeout(() => { nettoyer(); demarrer(); }, ms);
    function nettoyer(){ clearTimeout(minuteur); clearInterval(tic); chip.remove(); }
    chip.querySelector('[data-vg="plus-tard"]').addEventListener('click', () => { nettoyer(); terminer(true); });
    enCours.annulerAttente = nettoyer;
  }

  /* 2) Visite : voile flouté + zones mises en avant + bulle. */
  function demarrer(){
    const voile = document.createElement('div');
    voile.className = 'vg-voile';
    voile.addEventListener('click', () => terminer(true));
    const bulle = document.createElement('div');
    bulle.className = 'vg-bulle';
    bulle.setAttribute('role', 'dialog');
    bulle.setAttribute('aria-modal', 'true');
    bulle.setAttribute('aria-labelledby', 'vg-titre');
    bulle.tabIndex = -1;
    document.body.append(voile, bulle);
    document.documentElement.classList.add('vg-active');
    enCours.voile = voile; enCours.bulle = bulle;
    bulle.addEventListener('click', e => {
      const b = e.target.closest('[data-vg]'); if(!b) return;
      const a = b.dataset.vg;
      if(a === 'suivant') aller(enCours.index + 1);
      else if(a === 'precedent') aller(enCours.index - 1);
      else if(a === 'passer') terminer(true);
    });
    document.addEventListener('keydown', clavier);
    window.addEventListener('resize', positionner);
    window.addEventListener('scroll', positionner, { passive: true });
    requestAnimationFrame(() => voile.classList.add('visible'));
    aller(0);
  }

  function clavier(e){
    if(!enCours || !enCours.bulle) return;
    if(e.key === 'Escape'){ e.preventDefault(); terminer(true); }
    else if(e.key === 'ArrowRight'){ aller(enCours.index + 1); }
    else if(e.key === 'ArrowLeft'){ aller(enCours.index - 1); }
  }

  function cibles(){
    const e = enCours.etapes[enCours.index];
    return e.cibles.map(s => document.querySelector(s)).filter(Boolean);
  }

  function aller(i){
    if(!enCours) return;
    if(i >= enCours.etapes.length) return terminer(false);
    if(i < 0) return;
    document.querySelectorAll('.vg-cible').forEach(el => el.classList.remove('vg-cible'));
    enCours.index = i;
    const e = enCours.etapes[i];
    const els = cibles();
    els.forEach(el => el.classList.add('vg-cible'));
    const n = enCours.etapes.length, dernier = i === n - 1;
    enCours.bulle.innerHTML = `
      ${i === 0 && enCours.opts.accueil ? `<div class="vg-accueil">${esc(enCours.opts.accueil)}</div>` : ''}
      <div class="vg-tete">${e.ill ? `<span data-ill="${esc(e.ill)}" class="ill vg-ill"></span>` : ''}<div><div class="vg-k">Visite · ${i + 1} sur ${n}</div><h2 class="vg-titre" id="vg-titre">${esc(e.titre)}</h2></div></div>
      <p class="vg-texte">${esc(e.texte)}</p>
      <div class="vg-pied">
        <span class="vg-points" aria-hidden="true">${enCours.etapes.map((_, k) => `<i class="${k === i ? 'cours' : k < i ? 'fait' : ''}"></i>`).join('')}</span>
        <button type="button" class="vg-lien" data-vg="passer">Passer</button>
        ${i > 0 ? '<button type="button" class="btn btn-secondary vg-btn" data-vg="precedent">Précédent</button>' : ''}
        <button type="button" class="btn btn-primary vg-btn" data-vg="suivant">${dernier ? 'C’est parti !' : 'Suivant'}</button>
      </div>`;
    if(window.portailIllustrations) window.portailIllustrations(enCours.bulle);
    enCours.bulle.classList.remove('entree'); void enCours.bulle.offsetWidth; enCours.bulle.classList.add('entree');
    // Zone visible au centre de l'écran, puis bulle placée à côté.
    const r = union(els);
    if(r){
      const haut = window.scrollY + r.top - Math.max(16, (window.innerHeight - r.height) / 2 - 90);
      window.scrollTo({ top: Math.max(0, haut), behavior: reduit() ? 'auto' : 'smooth' });
    }
    setTimeout(positionner, reduit() ? 0 : 380);
    positionner();
    const bouton = enCours.bulle.querySelector('[data-vg="suivant"]');
    if(bouton) bouton.focus({ preventScroll: true });
  }

  function union(els){
    if(!els.length) return null;
    const rs = els.map(el => el.getBoundingClientRect());
    const top = Math.min(...rs.map(r => r.top)), left = Math.min(...rs.map(r => r.left));
    const bottom = Math.max(...rs.map(r => r.bottom)), right = Math.max(...rs.map(r => r.right));
    return { top, left, bottom, right, width: right - left, height: bottom - top };
  }

  /* Bulle sous la zone (ou au-dessus s'il manque de place) ; sur téléphone, en bas d'écran. */
  function positionner(){
    if(!enCours || !enCours.bulle) return;
    const b = enCours.bulle;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    if(vw <= 600){ b.classList.add('vg-bas'); b.style.top = ''; b.style.left = ''; return; }
    b.classList.remove('vg-bas');
    const r = union(cibles());
    const bw = b.offsetWidth, bh = b.offsetHeight;
    if(!r){ b.style.top = Math.max(16, (vh - bh) / 2) + 'px'; b.style.left = Math.max(16, (vw - bw) / 2) + 'px'; return; }
    let top = r.bottom + 16;
    if(top + bh > vh - 12 && r.top - bh - 16 > 12) top = r.top - bh - 16;
    top = Math.min(Math.max(12, top), vh - bh - 12);
    const left = Math.min(Math.max(16, r.left + r.width / 2 - bw / 2), vw - bw - 16);
    b.style.top = top + 'px';
    b.style.left = left + 'px';
  }

  function terminer(passe){
    if(!enCours) return;
    if(enCours.annulerAttente) enCours.annulerAttente();
    ecrire(enCours.opts.cle, 'vu');
    document.querySelectorAll('.vg-cible').forEach(el => el.classList.remove('vg-cible'));
    document.removeEventListener('keydown', clavier);
    window.removeEventListener('resize', positionner);
    window.removeEventListener('scroll', positionner);
    document.documentElement.classList.remove('vg-active');
    const { voile, bulle, opts } = enCours;
    if(voile){ voile.classList.remove('visible'); setTimeout(() => voile.remove(), 250); }
    if(bulle) bulle.remove();
    enCours = null;
    if(typeof opts.onFin === 'function') opts.onFin({ passe, etape: passe ? 'interrompue' : 'terminée' });
  }

  window.CvdlVisite = { lancer, terminer: () => terminer(true) };
})();
