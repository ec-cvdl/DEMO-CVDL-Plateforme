/* ════════════════════════════════════════════════════════════════════════════════════
   depannage.js — parcours de dépannage (arbre de décision) proposé après le choix du
   symptôme, avant la déclaration d'un SAV (sav.html, sav-beneficiaire.html). Aussi utilisé
   pour l'aperçu dans l'éditeur de l'admin (onglet Dépannage). Styles : depannage.css.

   CvdlDepannage.monter(conteneur, arbre, {
     symptome,            // libellé du symptôme choisi (affiché + illustration)
     apercu,              // true : aperçu admin (rien n'est enregistré)
     onResolu(chemin),    // la personne confirme que le problème est réglé
     onSav(chemin),       // elle passe à la déclaration du SAV
     onRetour(),          // « ← Changer de symptôme » depuis la première étape
   }) → { detruire() }
   ════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const texte = (s) => esc(s).replace(/\n/g, '<br>');
  const urlImage = (u) => (/^data:image\/(png|jpe?g|gif|webp);base64,/.test(u) || /^https:\/\//.test(u) ? u : '');
  const FLECHE =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const RETOUR =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
  const OK =
    '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const AMPOULE =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>';
  const VIDEO =
    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3z"/></svg>';

  function illustrationSymptome(symptome) {
    if (!window.illustrationCvdl) return '<span data-ill="aide" class="ill l"></span>';
    const cle = window.cleSymptomeCvdl ? window.cleSymptomeCvdl(symptome) : 'generique_sav';
    return window.illustrationCvdl('sym-' + (cle || 'generique_sav'), 56);
  }

  function monter(conteneur, arbre, opts) {
    opts = opts || {};
    let chemin = [arbre.depart];
    let fini = false; // écran « merci » après « c'est réglé »

    function etapeCourante() {
      return arbre.etapes[chemin[chemin.length - 1]];
    }

    function rendre() {
      const id = chemin[chemin.length - 1];
      const e = arbre.etapes[id];
      if (!e) {
        conteneur.innerHTML = '<div class="dp-carte"><p>Ce parcours est incomplet.</p></div>';
        return;
      }
      const numero = chemin.length;
      if (fini) {
        conteneur.innerHTML = `
          <div class="dp-carte dp-fin-ok" role="status">
            <span class="dp-rond-ok">${OK}</span>
            <h2 class="dp-titre">Tant mieux, c’est réglé&nbsp;!</h2>
            <p class="dp-texte">Aucune demande SAV n’a été envoyée. Si le problème revient, vous pourrez toujours en déclarer une.</p>
            <div class="dp-actions">
              ${opts.urlFin ? `<a class="btn btn-primary" href="${esc(opts.urlFin)}">Retour à l’accueil</a>` : ''}
              <button type="button" class="btn btn-secondary" data-dp="recommencer">Refaire le parcours</button>
            </div>
          </div>`;
        return;
      }
      const media = e.media
        ? e.media.type === 'video'
          ? `<a class="dp-video" href="${esc(e.media.url)}" target="_blank" rel="noopener noreferrer">${VIDEO}<span>Voir la vidéo${e.media.nom ? ' — ' + esc(e.media.nom) : ''}</span></a>`
          : urlImage(e.media.url)
            ? `<figure class="dp-media"><img src="${esc(e.media.url)}" alt="${esc(e.media.nom || e.titre)}" loading="lazy"></figure>`
            : ''
        : '';
      let bas;
      if (e.fin === 'resolu') {
        bas = `<div class="dp-conclusion dp-conclusion-ok"><span class="dp-rond-ok petit">${OK}</span><b>Le problème devrait être réglé.</b></div>
          <div class="dp-actions">
            <button type="button" class="btn btn-primary" data-dp="resolu">C’est réglé, merci</button>
            <button type="button" class="btn btn-secondary" data-dp="sav">Toujours en panne : déclarer un SAV</button>
          </div>`;
      } else if (e.fin === 'sav' || !e.reponses.length) {
        bas = `<div class="dp-conclusion"><span data-ill="suiviSav" class="ill s"></span><b>${e.fin === 'sav' ? 'Notre équipe prend le relais.' : 'Où en êtes-vous ?'}</b></div>
          <div class="dp-actions">
            ${e.fin === 'sav' ? '' : '<button type="button" class="btn btn-secondary" data-dp="resolu">C’est réglé</button>'}
            <button type="button" class="btn btn-primary" data-dp="sav">Déclarer le SAV ${FLECHE}</button>
          </div>`;
      } else {
        bas = `<div class="dp-reponses" role="group" aria-label="Votre réponse">
          ${e.reponses.map((r, i) => `<button type="button" class="dp-reponse" data-dp-reponse="${i}"><span>${esc(r.libelle)}</span>${FLECHE}</button>`).join('')}
        </div>`;
      }
      conteneur.innerHTML = `
        <div class="dp-carte">
          <div class="dp-tete">
            <span class="dp-tete-ill">${illustrationSymptome(opts.symptome || arbre.titre)}</span>
            <div class="dp-tete-txt">
              <div class="dp-surtitre">Dépannage · ${esc(arbre.titre)}</div>
              <div class="dp-fil">${chemin.map((_, i) => `<i class="${i === numero - 1 ? 'cours' : 'fait'}"></i>`).join('')}<span>Étape ${numero}</span></div>
            </div>
          </div>
          <h2 class="dp-titre">${esc(e.titre)}</h2>
          ${e.texte ? `<p class="dp-texte">${texte(e.texte)}</p>` : ''}
          ${media}
          ${e.astuce ? `<div class="dp-astuce">${AMPOULE}<span>${texte(e.astuce)}</span></div>` : ''}
          ${bas}
          <div class="dp-pied">
            ${
              numero > 1
                ? `<button type="button" class="btn-retour" data-dp="precedent">${RETOUR}Étape précédente</button>`
                : opts.onRetour
                  ? `<button type="button" class="btn-retour" data-dp="retour">${RETOUR}Changer de symptôme</button>`
                  : '<span></span>'
            }
            ${e.fin === 'sav' || (!e.reponses.length && !e.fin) ? '' : '<button type="button" class="dp-passer" data-dp="sav">Passer et déclarer le SAV directement</button>'}
          </div>
        </div>`;
      if (window.portailIllustrations) window.portailIllustrations(conteneur);
      const cible = conteneur.querySelector('.dp-reponse, [data-dp="resolu"], [data-dp="sav"]');
      if (cible && opts.focus !== false) setTimeout(() => cible.focus({ preventScroll: true }), 30);
    }

    function clic(ev) {
      const r = ev.target.closest('[data-dp-reponse]');
      if (r) {
        const rep = etapeCourante().reponses[+r.dataset.dpReponse];
        if (rep && arbre.etapes[rep.cible]) {
          chemin.push(rep.cible);
          rendre();
          conteneur.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
        return;
      }
      const b = ev.target.closest('[data-dp]');
      if (!b) return;
      const a = b.dataset.dp;
      if (a === 'precedent') {
        chemin.pop();
        rendre();
      } else if (a === 'retour') {
        opts.onRetour && opts.onRetour();
      } else if (a === 'recommencer') {
        chemin = [arbre.depart];
        fini = false;
        rendre();
      } else if (a === 'resolu') {
        fini = true;
        rendre();
        opts.onResolu && opts.onResolu(chemin.slice());
      } else if (a === 'sav') {
        opts.onSav && opts.onSav(chemin.slice());
      }
    }
    conteneur.addEventListener('click', clic);
    rendre();
    return {
      detruire() {
        conteneur.removeEventListener('click', clic);
        conteneur.innerHTML = '';
      },
      allerA(id) {
        if (arbre.etapes[id]) {
          chemin = [arbre.depart];
          if (id !== arbre.depart) chemin.push(id);
          fini = false;
          rendre();
        }
      },
    };
  }

  /* ── Branchement dans les pages SAV ─────────────────────────────────────────────────
     CvdlDepannage.pourSymptome(api, symptome) → arbre publié rattaché au symptôme, ou null.
     Les arbres sont chargés une fois (appel public « depannage-arbres »). */
  let chargement = null;
  function charger(api) {
    if (!chargement) {
      chargement = fetch(api + '?' + new URLSearchParams({ action: 'depannage-arbres' }))
        .then((r) => r.json())
        .then((r) => (r && r.ok ? r : { arbres: [], parSymptome: {} }))
        .catch(() => ({ arbres: [], parSymptome: {} }));
    }
    return chargement;
  }
  async function pourSymptome(api, symptome) {
    const d = await charger(api);
    const id = d.parSymptome[String(symptome || '').toLowerCase()];
    return (d.arbres || []).find((a) => a.identifiant === id) || null;
  }
  function enregistrerParcours(api, donnees) {
    return fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'depannage-parcours', ...donnees }),
    })
      .then((r) => r.json())
      .catch(() => ({ ok: false }));
  }

  window.CvdlDepannage = { monter, charger, pourSymptome, enregistrerParcours };
})();
