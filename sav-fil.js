/* ════════════════════════════════════════════════════════════════════════════════════
   sav-fil.js — fil d'échanges d'un SAV, côté personne accompagnée et côté structure
   (pages suivi-sav-beneficiaire.html et suivi-sav-structure.html). Styles : sav-fil.css.

   CvdlFilSav.brancher(liste, tickets, acces)
     · liste  : conteneur des cartes (.carte-ticket-suivi[data-reference]) ;
     · tickets: tickets renvoyés par l'API (t.fil = { total, nouveaux, adresseDemandee } ou null) ;
     · acces  : ticket => { reference, code } | { reference, numeroSerie, preuve } | null.
   À rappeler après chaque rendu de la liste : les fils ouverts, les brouillons et le dernier
   contenu chargé sont conservés (rafraîchissement automatique de la page sans rien perdre).
   ════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const urlSure = (u) => (/^https?:\/\//i.test(String(u || '')) ? u : '#');
  const api = () => (typeof API !== 'undefined' && API ? API : window.CVDL_API || '');
  const post = (d) =>
    fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })
      .then((r) => r.json())
      .catch(() => ({ ok: false, erreur: 'Connexion impossible. Réessayez dans un instant.' }));

  const ouverts = new Set(); // références dont le fil est ouvert
  const donnees = new Map(); // référence -> dernière réponse /sav-fil
  const brouillons = new Map(); // référence -> texte en cours
  const formulaireAdresse = new Set(); // références dont le formulaire d'adresse est affiché
  const accesParRef = new Map();

  const SVG = {
    bulle:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
    photo:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    cadenas:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    colis:
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.3l9 4.5"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  };

  function jourDe(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const auj = new Date();
    const hier = new Date(Date.now() - 864e5);
    const meme = (a, b) => a.toDateString() === b.toDateString();
    if (meme(d, auj)) return 'Aujourd’hui';
    if (meme(d, hier)) return 'Hier';
    const t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const heure = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  function vueMessages(r) {
    let jour = '';
    const nomVous = 'Vous';
    const derniereDemande = r.fil.map((m) => m.type).lastIndexOf('demande-adresse');
    return r.fil
      .map((m, i) => {
        let h = '';
        const j = jourDe(m.date);
        if (j && j !== jour) {
          jour = j;
          h += `<span class="sf-jour">${esc(j)}</span>`;
        }
        if (m.type === 'statut') return h + `<span class="sf-evt"><i></i>${esc(m.texte)}</span>`;
        if (m.type === 'adresse')
          return h + `<span class="sf-evt"><i></i>Adresse d’envoi renseignée · ${esc(heure(m.date))}</span>`;
        if (m.type === 'demande-adresse') {
          // Carte d'action seulement pour la dernière demande tant que le bon n'est pas prêt.
          if (i !== derniereDemande || r.bonColissimo)
            return h + `<span class="sf-evt"><i></i>Adresse d’envoi demandée</span>`;
          if (r.adresseRecue)
            return (
              h +
              `<div class="sf-action ok"><span class="sf-ic">${SVG.ok}</span><div><b>Adresse envoyée</b><span>L’équipe prépare votre bon Colissimo.</span></div><button type="button" class="sf-lien" data-sf="adresse">Modifier</button></div>`
            );
          return (
            h +
            `<div class="sf-action"><span class="sf-ic">${SVG.colis}</span><div><b>Adresse d’envoi demandée</b><span>Pour créer votre bon Colissimo gratuit.</span></div><button type="button" class="btn btn-primary" data-sf="adresse">Renseigner</button></div>`
          );
        }
        if (m.type === 'bon') {
          return (
            h +
            `<div class="sf-action ok"><span class="sf-ic">${SVG.ok}</span><div><b>Votre bon Colissimo est prêt</b><span>Envoi gratuit : emballez l’appareil avec son chargeur, puis déposez-le à La Poste ou en point relais.</span></div><a class="btn btn-primary" href="${esc(urlSure(m.pieceJointe))}" target="_blank" rel="noopener">Imprimer le bon</a></div>`
          );
        }
        const moi = m.auteur === r.vous;
        const qui = moi
          ? nomVous
          : m.auteur === 'admin'
            ? 'Équipe SAV CVDL'
            : m.par || (m.auteur === 'structure' ? 'Structure' : 'Personne');
        return (
          h +
          `<div class="sf-bul ${moi ? 'moi' : 'eux'}"><span class="sf-qui">${esc(qui)}</span>${m.texte ? esc(m.texte).replace(/\n/g, '<br>') : ''}${m.pieceJointe ? `<a class="sf-pj" href="${esc(urlSure(m.pieceJointe))}" target="_blank" rel="noopener">${SVG.photo}Photo jointe</a>` : ''}<small>${esc(heure(m.date))}</small></div>`
        );
      })
      .join('');
  }

  function vueAdresse(r) {
    const s = r.adresseStructure || {};
    return `<form class="sf-adr" data-sf-form="adresse">
      <div class="sf-adr-t">Adresse pour le bon Colissimo</div>
      <label>Nom (sur l’étiquette)<input class="input" name="nom" required maxlength="80" value="${esc(s.nom || '')}" autocomplete="name"></label>
      <label>Adresse<input class="input" name="adresse" required maxlength="160" value="${esc(s.adresse || '')}" autocomplete="street-address" placeholder="Numéro et rue"></label>
      <div class="sf-l2"><label>Code postal<input class="input" name="codePostal" required inputmode="numeric" maxlength="5" autocomplete="postal-code"></label><label>Ville<input class="input" name="ville" required maxlength="80" autocomplete="address-level2"></label></div>
      <label>Téléphone <em>(facultatif, pour le transporteur)</em><input class="input" name="telephone" inputmode="tel" maxlength="20" autocomplete="tel"></label>
      ${r.vous === 'personne' ? `<div class="sf-mention">${SVG.cadenas}Utilisée uniquement pour créer l’étiquette, puis effacée.</div>` : ''}
      <div class="sf-err" role="alert"></div>
      <div class="sf-adr-actions"><button type="button" class="btn btn-secondary" data-sf="annuler-adresse">Annuler</button><button type="submit" class="btn btn-primary">Envoyer l’adresse</button></div>
    </form>`;
  }

  function vueFil(ref) {
    const r = donnees.get(ref);
    if (!r) return `<div class="sf"><p class="sf-charge">Chargement des échanges…</p></div>`;
    if (!r.ok) return `<div class="sf"><p class="sf-charge">${esc(r.erreur || 'Échanges indisponibles.')}</p></div>`;
    return `<div class="sf">
      <div class="sf-msgs" role="log" aria-live="polite">${r.fil.length ? vueMessages(r) : ''}${r.fil.every((m) => m.type === 'statut') ? '<p class="sf-vide">Une question, une précision, une photo à ajouter ? Écrivez à l’équipe SAV ici.</p>' : ''}</div>
      ${formulaireAdresse.has(ref) ? vueAdresse(r) : ''}
      <form class="sf-compo" data-sf-form="message">
        <label class="sf-sr" for="sf-t-${esc(ref)}">Votre message</label>
        <textarea class="input" id="sf-t-${esc(ref)}" name="texte" rows="2" maxlength="3000" placeholder="Écrire un message…">${esc(brouillons.get(ref) || '')}</textarea>
        <div class="sf-compo-bas">
          <label class="sf-lien sf-photo">${SVG.photo}<span data-sf-nom-photo>Joindre une photo</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" hidden></label>
          <button type="submit" class="btn btn-primary">Envoyer</button>
        </div>
        <div class="sf-err" role="alert"></div>
        ${r.vous === 'personne' ? `<div class="sf-mention">${SVG.cadenas}Vos coordonnées ne sont jamais affichées à l’équipe. Vous êtes prévenu·e par e-mail quand elle répond.</div>` : `<div class="sf-mention">Vous êtes prévenus par e-mail quand l’équipe répond.</div>`}
      </form>
    </div>`;
  }

  function zone(carte) {
    return carte.querySelector('.sf-zone');
  }
  function peindre(ref) {
    const carte = document.querySelector(`.carte-ticket-suivi[data-reference="${CSS.escape(ref)}"]`);
    const z = carte && zone(carte);
    if (!z) return;
    const corps = z.querySelector('.sf-corps');
    corps.innerHTML = ouverts.has(ref) ? vueFil(ref) : '';
    const msgs = corps.querySelector('.sf-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
  async function charger(ref) {
    const a = accesParRef.get(ref);
    if (!a) return;
    const r = await post(Object.assign({ action: 'sav-fil' }, a));
    donnees.set(ref, r);
    if (r.ok) {
      const carte = document.querySelector(`.carte-ticket-suivi[data-reference="${CSS.escape(ref)}"]`);
      const pastille = carte && carte.querySelector('.sf-nouveau');
      if (pastille) pastille.remove();
    }
    const actif = document.activeElement;
    if (actif && actif.closest && actif.closest(`.carte-ticket-suivi[data-reference="${CSS.escape(ref)}"] .sf`)) return; // ne pas couper une saisie
    peindre(ref);
  }

  function brancher(liste, tickets, acces) {
    if (!liste) return;
    (tickets || []).forEach((t) => {
      const carte = liste.querySelector(`.carte-ticket-suivi[data-reference="${CSS.escape(t.reference)}"]`);
      if (!carte || carte.querySelector('.sf-zone')) return;
      const a = acces(t);
      const z = document.createElement('div');
      z.className = 'sf-zone';
      if (!a || !t.fil) {
        if (t.documentsMasques)
          z.innerHTML = `<p class="sf-indice">${SVG.bulle}Pour échanger avec l’équipe, ajoutez la référence de la demande (SAV-…) ou l’e-mail utilisé.</p>`;
        else return;
        carte.appendChild(z);
        return;
      }
      accesParRef.set(t.reference, a);
      const f = t.fil;
      // Ouvert d'office quand l'équipe attend quelque chose (nouveau message, adresse).
      if (f.nouveaux || f.adresseDemandee) ouverts.add(t.reference);
      const ouvert = ouverts.has(t.reference);
      z.innerHTML = `<button type="button" class="sf-bascule" data-sf-bascule aria-expanded="${ouvert}">${SVG.bulle}<span>Échanges avec l’équipe SAV${f.total ? ` (${f.total})` : ''}</span>${f.nouveaux ? `<b class="sf-nouveau">${f.nouveaux} nouveau${f.nouveaux > 1 ? 'x' : ''}</b>` : ''}${f.adresseDemandee ? '<b class="sf-nouveau">Adresse demandée</b>' : ''}<i aria-hidden="true"></i></button><div class="sf-corps"></div>`;
      carte.appendChild(z);
      if (ouvert) {
        peindre(t.reference);
        charger(t.reference);
      }
    });
  }

  function lireFichier(f) {
    return new Promise((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = ko;
      r.readAsDataURL(f);
    });
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sf-bascule]');
    const carte = e.target.closest('.carte-ticket-suivi');
    if (b && carte) {
      const ref = carte.dataset.reference;
      if (ouverts.has(ref)) ouverts.delete(ref);
      else {
        ouverts.add(ref);
        charger(ref);
      }
      b.setAttribute('aria-expanded', String(ouverts.has(ref)));
      peindre(ref);
      return;
    }
    const act = e.target.closest('[data-sf]');
    if (act && carte) {
      const ref = carte.dataset.reference;
      if (act.dataset.sf === 'adresse') {
        formulaireAdresse.add(ref);
        peindre(ref);
        const f = carte.querySelector('[data-sf-form="adresse"] input');
        if (f) f.focus();
      }
      if (act.dataset.sf === 'annuler-adresse') {
        formulaireAdresse.delete(ref);
        peindre(ref);
      }
    }
  });
  document.addEventListener('input', (e) => {
    const carte = e.target.closest('.carte-ticket-suivi');
    if (carte && e.target.name === 'texte' && e.target.closest('.sf-compo'))
      brouillons.set(carte.dataset.reference, e.target.value);
  });
  document.addEventListener('change', (e) => {
    if (e.target.name === 'photo' && e.target.closest('.sf-compo')) {
      const f = e.target.files[0];
      const n = e.target.closest('.sf-compo').querySelector('[data-sf-nom-photo]');
      if (n) n.textContent = f ? f.name : 'Joindre une photo';
    }
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-sf-form]');
    const carte = form && form.closest('.carte-ticket-suivi');
    if (!carte) return;
    e.preventDefault();
    const ref = carte.dataset.reference;
    const a = accesParRef.get(ref);
    const err = form.querySelector('.sf-err');
    err.textContent = '';
    const bouton = form.querySelector('[type="submit"]');
    bouton.disabled = true;
    let r;
    if (form.dataset.sfForm === 'adresse') {
      const d = Object.fromEntries(new FormData(form));
      r = await post(Object.assign({ action: 'sav-fil-adresse' }, a, d));
      if (r.ok) formulaireAdresse.delete(ref);
    } else {
      const texte = form.elements.texte.value.trim();
      const photo = form.elements.photo.files[0];
      if (!texte && !photo) {
        err.textContent = 'Écrivez un message ou joignez une photo.';
        bouton.disabled = false;
        return;
      }
      if (photo && photo.size > 8 * 1024 * 1024) {
        err.textContent = 'Photo trop lourde (8 Mo maximum).';
        bouton.disabled = false;
        return;
      }
      bouton.textContent = 'Envoi…';
      const fichier = photo
        ? { nom: photo.name, type: photo.type, base64: (await lireFichier(photo)).split(',').pop() }
        : null;
      r = await post(Object.assign({ action: 'sav-fil-envoyer' }, a, { texte, fichier }));
      if (r.ok) brouillons.delete(ref);
    }
    bouton.disabled = false;
    if (!r.ok) {
      err.textContent = r.erreur || 'Envoi impossible.';
      bouton.textContent = form.dataset.sfForm === 'adresse' ? 'Envoyer l’adresse' : 'Envoyer';
      return;
    }
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    await charger(ref);
  });

  // Nouveaux messages pendant qu'un fil est ouvert (hors saisie en cours).
  setInterval(() => {
    if (!document.hidden)
      ouverts.forEach((ref) => {
        if (accesParRef.has(ref)) charger(ref);
      });
  }, 30000);

  /** Vrai si l'utilisateur est en train d'écrire dans un fil (la page ne doit pas se redessiner). */
  const enSaisie = () => {
    const a = document.activeElement;
    return !!(a && a.closest && a.closest('.sf'));
  };

  window.CvdlFilSav = { brancher, enSaisie };
})();
