/* ════════════════════════════════════════════════════════════════════════════════════
   identite-admin.js — identités des personnes accompagnées dans l'admin.
   Le serveur n'envoie que des pseudonymes (P-XXXXX). « Afficher l'identité » demande un motif,
   est tracé côté serveur (journal), et l'identité se masque de nouveau après 5 minutes ou à
   la fermeture de l'admin (jamais mise en cache ni en stockage local).
   S'appuie sur les fonctions globales de l'admin (admin/*.js) (poster, jsonp, etat, echapper, icon, render, motDePasse).
   ════════════════════════════════════════════════════════════════════════════════════ */
const IDR_DUREE_MS = 5 * 60 * 1000;
const IDR_MOTIFS = [
  'Attestation',
  'Saisie Salesforce',
  'Contacter la personne',
  'Vérification / litige',
  'Demande de la personne (droits RGPD)',
  'Autre',
];
const idr = { reveles: {} };

/** Identité révélée (et encore valide) d'un dossier, ou null. */
function identiteRevelee(objet, ligne) {
  const r = idr.reveles[objet + ':' + ligne];
  if (!r) return null;
  if (Date.now() > r.expire) {
    delete idr.reveles[objet + ':' + ligne];
    return null;
  }
  return r.donnees;
}
/** Nom à afficher pour un pseudonyme : « Nom · P-XXXXX » si révélé, sinon le pseudonyme. */
function nomPersonneAdmin(objet, ligne, pseudo) {
  const r = identiteRevelee(objet, ligne);
  const p = r && (r.personnes || []).find((x) => x.pseudonyme === pseudo);
  return p ? `${p.nom}${p.dateNaissance ? ' (' + p.dateNaissance + ')' : ''} · ${pseudo}` : pseudo;
}
function boutonIdentite(objet, ligne, libelle) {
  const r = identiteRevelee(objet, ligne);
  return r
    ? `<button type="button" class="idr-btn on" data-idr-masquer="${objet}|${ligne}" title="Masquer maintenant">${icon('x', 12)}Masquer l’identité</button>`
    : `<button type="button" class="idr-btn" data-idr-reveler="${objet}|${ligne}">${icon('personne', 12)}${libelle || 'Afficher l’identité'}</button>`;
}
const idrPar = () => {
  try {
    return localStorage.getItem('cvdl-idr-par') || '';
  } catch (e) {
    return '';
  }
};

function idrDemander(objet, ligne, motifDefaut) {
  return new Promise((resolve) => {
    const v = document.createElement('div');
    v.className = 'idr-voile';
    v.innerHTML = `<form class="idr-fen" role="dialog" aria-modal="true" aria-labelledby="idr-t">
      <div class="idr-k">Données personnelles</div>
      <h2 id="idr-t">Afficher l’identité ?</h2>
      <p>Uniquement si c’est nécessaire. La consultation est enregistrée (date, motif, nom) et l’identité se masque de nouveau après 5 minutes.</p>
      <fieldset class="idr-motifs"><legend>Motif</legend>
        ${IDR_MOTIFS.map((m, i) => `<label><input type="radio" name="idr-motif" value="${echapper(m)}" ${(motifDefaut ? m === motifDefaut : i === 0) ? 'checked' : ''}>${echapper(m)}</label>`).join('')}
      </fieldset>
      <input class="input" name="idr-autre" placeholder="Précisez le motif" hidden maxlength="180">
      <label class="idr-par">Votre nom<input class="input" name="idr-par" value="${echapper(idrPar())}" maxlength="60" required></label>
      <div class="idr-err" role="alert"></div>
      <div class="idr-actions"><button type="button" class="btn btn-secondary" data-idr="annuler">Annuler</button><button type="submit" class="btn btn-primary">Afficher</button></div>
    </form>`;
    const f = v.querySelector('form');
    const autre = f.elements['idr-autre'];
    const fermer = (val) => {
      document.removeEventListener('keydown', echap, true);
      v.remove();
      resolve(val);
    };
    const echap = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fermer(null);
      }
    };
    f.addEventListener('change', () => {
      autre.hidden = f.elements['idr-motif'].value !== 'Autre';
    });
    v.addEventListener('click', (e) => {
      if (e.target === v || e.target.closest('[data-idr="annuler"]')) fermer(null);
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const choix = f.elements['idr-motif'].value;
      const motif = choix === 'Autre' ? autre.value.trim() : choix;
      const par = f.elements['idr-par'].value.trim();
      const err = f.querySelector('.idr-err');
      if (motif.length < 3) {
        err.textContent = 'Précisez le motif.';
        autre.focus();
        return;
      }
      if (!par) {
        err.textContent = 'Indiquez votre nom.';
        return;
      }
      try {
        localStorage.setItem('cvdl-idr-par', par);
      } catch (x) {}
      const bouton = f.querySelector('[type="submit"]');
      bouton.disabled = true;
      const r = await poster({ action: 'identite-reveler', objet, ligne, motif, par });
      bouton.disabled = false;
      if (!r || !r.ok) {
        err.textContent = (r && r.erreur) || 'Affichage impossible.';
        return;
      }
      fermer(r);
    });
    document.addEventListener('keydown', echap, true);
    document.body.appendChild(v);
    (f.querySelector('input:checked') || f.querySelector('input')).focus();
  });
}

async function revelerIdentite(objet, ligne, motifDefaut) {
  const r = await idrDemander(objet, ligne, motifDefaut);
  if (!r) return null;
  idr.reveles[objet + ':' + ligne] = { donnees: r, expire: Date.now() + IDR_DUREE_MS };
  setTimeout(() => {
    identiteRevelee(objet, ligne);
    render();
  }, IDR_DUREE_MS + 50);
  etat('Identité affichée — consultation enregistrée', 'succes');
  render();
  return r;
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-idr-reveler]');
  if (b) {
    e.preventDefault();
    const [o, l] = b.dataset.idrReveler.split('|');
    revelerIdentite(o, +l);
    return;
  }
  const m = e.target.closest('[data-idr-masquer]');
  if (m) {
    e.preventDefault();
    delete idr.reveles[m.dataset.idrMasquer.replace('|', ':')];
    render();
    return;
  }
  // « Écrire » sur un SAV déclaré par la personne : on révèle d'abord (motif « Contacter »).
  const w = e.target.closest('[data-idr-ecrire]');
  if (w) {
    e.preventDefault();
    const [o, l, ref] = w.dataset.idrEcrire.split('|');
    const r = identiteRevelee(o, +l) || (await revelerIdentite(o, +l, 'Contacter la personne'));
    const mail = r && r.contact && r.contact.email;
    if (mail) location.href = `mailto:${mail}?subject=${encodeURIComponent('Votre demande SAV ' + ref)}`;
  }
});
