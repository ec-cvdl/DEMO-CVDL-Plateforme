/* Onglet « Démarche » de projet.html (admin seulement) : chronologie des rendez-vous, décisions
   et étapes du projet, dans le style de « Comprendre CVDL » (encadré « Retenu »), et mini
   éditeur de texte riche avec images (réduites ici, enregistrées dans le récit). Le serveur
   nettoie le récit (regles/demarche.js) ; routes : demarche, demarche-enregistrer,
   demarche-supprimer. DemarcheProjet.rendre(zone, appel) — `appel(action, données)` de projet.js. */
window.DemarcheProjet = (function () {
  const TYPES = {
    etape: { libelle: 'Étape', lettre: 'É', retenu: 'Pourquoi', aide: 'Pourquoi cette étape, ce qu’elle change.' },
    'rendez-vous': {
      libelle: 'Rendez-vous',
      lettre: 'R',
      retenu: 'Retenu',
      aide: 'Ce qui a été décidé ou promis, les suites.',
    },
    decision: {
      libelle: 'Décision',
      lettre: 'D',
      retenu: 'Retenu',
      aide: 'Ce qui a été retenu, et ce qui a été écarté.',
    },
  };
  const FILTRES = [
    ['tout', 'Tout'],
    ['rendez-vous', 'Rendez-vous'],
    ['decision', 'Décisions'],
    ['etape', 'Étapes'],
  ];
  const BARRE = [
    ['bold', '<b>G</b>', 'Gras'],
    ['italic', '<i>I</i>', 'Italique'],
    ['underline', '<u>S</u>', 'Souligné'],
    ['strikeThrough', '<span style="text-decoration:line-through">B</span>', 'Barré'],
    null,
    ['h2', 'T1', 'Titre'],
    ['h3', 'T2', 'Sous-titre'],
    ['insertUnorderedList', '•', 'Liste à puces'],
    ['insertOrderedList', '1.', 'Liste numérotée'],
    ['blockquote', '❝', 'Citation'],
    null,
    ['lien', '🔗', 'Lien'],
    ['image', '🖼', 'Image'],
  ];
  const IMAGE_MAX_PX = 1600;
  const IMAGE_MAX_CAR = 2_700_000;
  const D = { zone: null, appel: null, entrees: [], filtre: 'tout', recherche: '', ed: null, charge: false };

  const aujourdhui = () => new Date().toLocaleDateString('fr-FR');
  const dateFr = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  const dateLongue = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const texteDe = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || '';
  };

  async function rendre(zone, appel) {
    D.appel = appel;
    if (D.zone !== zone || !zone.dataset.pret) {
      D.zone = zone;
      zone.dataset.pret = '1';
      zone.innerHTML = `<div class="dm">
        <div class="dm-gauche">
          <div class="dm-entete"><span class="dm-k">Réservé à l’admin · jamais public</span>
            <h2>Ma démarche, de A à Z</h2>
            <p>Rendez-vous, décisions et étapes du projet, avec ce qui a été retenu et pourquoi.</p></div>
          <div class="dm-outils"><div class="dm-f" role="group" aria-label="Filtrer" id="dm-filtres"></div>
            <label class="dm-chercher"><span class="sr-only">Rechercher</span><input class="input" type="search" id="dm-recherche" placeholder="Rechercher…"></label>
            <button type="button" class="btn btn-secondary btn-sm" id="dm-imprimer">Imprimer / PDF</button></div>
          <div class="dm-tl" id="dm-liste" aria-live="polite"><p class="dm-vide">Chargement…</p></div>
        </div>
        <aside class="dm-ed" id="dm-ed" aria-labelledby="dm-ed-titre"></aside>
      </div>`;
      ouvrirEditeur(null);
      await charger();
    } else rendreListe();
  }

  async function charger() {
    const r = await D.appel('demarche');
    if (!r.ok) {
      document.getElementById('dm-liste').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Démarche indisponible.')}</div>`;
      return;
    }
    D.entrees = r.entrees;
    D.charge = true;
    rendreListe();
  }

  function carte(e) {
    const t = TYPES[e.type];
    return `<article class="dm-ev" data-dm-id="${e.id}">
      <span class="dm-pt ${e.type}" aria-hidden="true">${t.lettre}</span>
      <div class="dm-ev-c">
        <div class="dm-q">${echapper(dateLongue(e.date))} <span class="dm-t">${t.libelle}</span>
          <span class="dm-act"><button type="button" data-dm-modifier="${e.id}">Modifier</button></span></div>
        <h3>${echapper(e.titre)}</h3>
        ${e.recit ? `<div class="dm-recit">${e.recit}</div>` : ''}
      </div>
      ${e.retenu ? `<div class="dm-retenu"><b>${t.retenu}</b>${echapper(e.retenu).replace(/\n/g, '<br>')}</div>` : ''}
    </article>`;
  }

  function rendreListe() {
    const compte = (t) => (t === 'tout' ? D.entrees.length : D.entrees.filter((e) => e.type === t).length);
    document.getElementById('dm-filtres').innerHTML = FILTRES.map(
      ([k, l]) =>
        `<button type="button" aria-pressed="${D.filtre === k}" data-dm-filtre="${k}">${l} <i>${compte(k)}</i></button>`,
    ).join('');
    if (!D.charge) return;
    const q = D.recherche.toLowerCase();
    const liste = D.entrees.filter(
      (e) =>
        (D.filtre === 'tout' || e.type === D.filtre) &&
        (!q || `${e.titre} ${texteDe(e.recit)} ${e.retenu}`.toLowerCase().includes(q)),
    );
    document.getElementById('dm-liste').innerHTML = liste.length
      ? liste.map(carte).join('')
      : `<p class="dm-vide">${D.entrees.length ? 'Aucune entrée ne correspond.' : 'Première entrée ? Racontez le point de départ du projet, à droite.'}</p>`;
  }

  /* ── Éditeur ── */
  function ouvrirEditeur(entree) {
    const e = entree || { type: 'rendez-vous', date: '', titre: '', recit: '', retenu: '' };
    D.ed = { id: entree ? entree.id : 0, type: e.type };
    const zone = document.getElementById('dm-ed');
    zone.innerHTML = `<h3 id="dm-ed-titre">${entree ? 'Modifier l’entrée' : 'Nouvelle entrée'}</h3>
      <div class="dm-l">Type</div>
      <div class="dm-seg" role="radiogroup" aria-label="Type d’entrée">${Object.entries(TYPES)
        .map(
          ([k, t]) =>
            `<button type="button" role="radio" aria-checked="${k === e.type}" data-dm-type="${k}">${t.libelle}</button>`,
        )
        .join('')}</div>
      <label class="dm-l" for="dm-date">Date</label>
      <input class="input" id="dm-date" value="${echapper(entree ? dateFr(e.date) : aujourdhui())}" placeholder="jj/mm/aaaa">
      <label class="dm-l" for="dm-titre-champ">Titre</label>
      <input class="input" id="dm-titre-champ" maxlength="200" value="${echapper(e.titre)}" placeholder="Ex. : rendez-vous avec le Département">
      <div class="dm-l" id="dm-recit-l">Récit</div>
      <div class="dm-barre" role="toolbar" aria-label="Mise en forme" aria-controls="dm-recit">${BARRE.map((b) =>
        b
          ? `<button type="button" data-dm-cmd="${b[0]}" title="${b[2]}" aria-label="${b[2]}">${b[1]}</button>`
          : '<i aria-hidden="true"></i>',
      ).join(
        '',
      )}<input type="file" id="dm-fichier" accept="image/png,image/jpeg,image/webp,image/gif" hidden multiple></div>
      <div class="dm-recit-ed" id="dm-recit" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="dm-recit-l" data-vide="Présents, ce qui s’est dit, liens, photos (collez ou glissez une image)…">${e.recit}</div>
      <label class="dm-l" for="dm-retenu" id="dm-retenu-l">${TYPES[e.type].retenu} <small>${TYPES[e.type].aide}</small></label>
      <textarea class="input" id="dm-retenu" rows="3">${echapper(e.retenu)}</textarea>
      <div id="dm-ed-msg" role="alert"></div>
      <div class="dm-boutons">
        ${entree ? '<button type="button" class="btn btn-ghost dm-suppr" id="dm-supprimer">Supprimer</button>' : ''}
        <button type="button" class="btn btn-secondary" id="dm-annuler">${entree ? 'Annuler' : 'Vider'}</button>
        <button type="button" class="btn btn-primary" id="dm-enregistrer">Enregistrer</button>
      </div>`;
  }

  function commande(cmd) {
    const ed = document.getElementById('dm-recit');
    ed.focus();
    if (['h2', 'h3', 'blockquote'].includes(cmd)) {
      const actuel = document.queryCommandValue('formatBlock').toLowerCase();
      document.execCommand('formatBlock', false, actuel === cmd ? 'p' : cmd);
    } else if (cmd === 'lien') {
      const url = window.prompt('Adresse du lien (https://…)', 'https://');
      if (url && /^(https?:\/\/|mailto:)/i.test(url.trim())) document.execCommand('createLink', false, url.trim());
    } else if (cmd === 'image') document.getElementById('dm-fichier').click();
    else document.execCommand(cmd, false);
  }

  /** Image réduite à 1600 px de côté au plus, en JPEG (PNG si elle a de la transparence). */
  function reduire(fichier) {
    return new Promise((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onerror = ko;
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = ko;
        img.onload = () => {
          const r = Math.min(1, IMAGE_MAX_PX / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * r);
          c.height = Math.round(img.height * r);
          const ctx = c.getContext('2d');
          const png = fichier.type === 'image/png' || fichier.type === 'image/gif';
          if (!png) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
          }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          let url = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
          for (let q = 0.75; url.length > IMAGE_MAX_CAR && q > 0.3; q -= 0.15) url = c.toDataURL('image/jpeg', q);
          if (url.length > IMAGE_MAX_CAR) return ko(new Error('trop lourde'));
          ok(url);
        };
        img.src = lecteur.result;
      };
      lecteur.readAsDataURL(fichier);
    });
  }
  async function insererImages(fichiers) {
    const ed = document.getElementById('dm-recit');
    for (const f of [...fichiers].filter((x) => /^image\//.test(x.type))) {
      try {
        const url = await reduire(f);
        ed.focus();
        document.execCommand('insertHTML', false, `<img src="${url}" alt="${echapper(f.name || 'image')}"><p><br></p>`);
      } catch (e) {
        message(`Image « ${f.name || ''} » trop lourde ou illisible.`);
      }
    }
  }

  function message(t, ok) {
    const m = document.getElementById('dm-ed-msg');
    if (m) m.innerHTML = t ? `<div class="msg ${ok ? 'msg-succes' : 'msg-erreur'}">${echapper(t)}</div>` : '';
  }

  async function enregistrer() {
    const bouton = document.getElementById('dm-enregistrer');
    bouton.disabled = true;
    const r = await D.appel('demarche-enregistrer', {
      id: D.ed.id || undefined,
      type: D.ed.type,
      date: document.getElementById('dm-date').value,
      titre: document.getElementById('dm-titre-champ').value,
      recit: document.getElementById('dm-recit').innerHTML,
      retenu: document.getElementById('dm-retenu').value,
    });
    bouton.disabled = false;
    if (!r.ok) return message(r.erreur || 'Enregistrement impossible.');
    await charger();
    ouvrirEditeur(null);
    message('Entrée enregistrée.', true);
    document.querySelector(`[data-dm-id="${r.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  async function supprimer() {
    const ok = window.confirmerCvdl
      ? await window.confirmerCvdl('Supprimer cette entrée de la démarche ?')
      : window.confirm('Supprimer cette entrée de la démarche ?');
    if (!ok) return;
    const r = await D.appel('demarche-supprimer', { id: D.ed.id });
    if (!r.ok) return message(r.erreur || 'Suppression impossible.');
    await charger();
    ouvrirEditeur(null);
  }

  /* ── Événements (délégués : la zone est redessinée) ── */
  document.addEventListener('click', (e) => {
    if (!D.zone || !D.zone.contains(e.target)) return;
    const f = e.target.closest('[data-dm-filtre]');
    if (f) {
      D.filtre = f.dataset.dmFiltre;
      return rendreListe();
    }
    const m = e.target.closest('[data-dm-modifier]');
    if (m) {
      ouvrirEditeur(D.entrees.find((x) => x.id === Number(m.dataset.dmModifier)));
      document.getElementById('dm-ed').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return document.getElementById('dm-titre-champ').focus();
    }
    const t = e.target.closest('[data-dm-type]');
    if (t) {
      D.ed.type = t.dataset.dmType;
      D.zone.querySelectorAll('[data-dm-type]').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
      const info = TYPES[D.ed.type];
      document.getElementById('dm-retenu-l').innerHTML = `${info.retenu} <small>${info.aide}</small>`;
      return;
    }
    const c = e.target.closest('[data-dm-cmd]');
    if (c) return commande(c.dataset.dmCmd);
    if (e.target.closest('#dm-enregistrer')) return enregistrer();
    if (e.target.closest('#dm-supprimer')) return supprimer();
    if (e.target.closest('#dm-annuler')) return ouvrirEditeur(null);
    if (e.target.closest('#dm-imprimer')) {
      document.body.classList.add('dm-impression');
      window.print();
      document.body.classList.remove('dm-impression');
    }
  });
  // Les boutons de la barre ne prennent pas le focus : la sélection du texte reste en place.
  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-dm-cmd]')) e.preventDefault();
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'dm-recherche') {
      D.recherche = e.target.value;
      rendreListe();
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'dm-fichier') {
      insererImages(e.target.files);
      e.target.value = '';
    }
  });
  document.addEventListener('paste', (e) => {
    if (e.target.closest?.('#dm-recit') && e.clipboardData) {
      const images = [...e.clipboardData.files].filter((f) => /^image\//.test(f.type));
      if (images.length) {
        e.preventDefault();
        insererImages(images);
      }
    }
  });
  document.addEventListener('dragover', (e) => {
    if (e.target.closest?.('#dm-recit')) e.preventDefault();
  });
  document.addEventListener('drop', (e) => {
    if (!e.target.closest?.('#dm-recit') || !e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    insererImages(e.dataTransfer.files);
  });

  return { rendre };
})();
