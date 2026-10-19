/* Répartition prévisionnelle d'un programme de distribution — composant partagé par la fiche
   programme de l'admin (admin/27-distribution.js) et la page autonome
   (pages/distribution-autonome.js). Une réglette par structure pressentie ; le résultat (prévu
   face à l'objectif, reste à répartir, détail par catégorie, déjà livré) suit en direct.
   Outil de décision : rien n'est réservé ni montré aux structures.

   RepartitionCvdl.monter(conteneur, {
     lignes,          // [{ structureId (structure CVDL) ou null, nom, quantite, parProduit }]
     objectifGlobal,  // nombre d'appareils du programme (0 : somme des objectifs par catégorie)
     objectifs,       // [{ produit, quantite }] catégories imposées à la création (facultatif)
     structures,      // [{ id, nom }] structures CVDL proposées (vide : noms libres seulement)
     realise,         // (ligne) => { livre, engage } ou null : déjà commandé pour la structure
     enregistrer,     // async (lignes) => { ok, erreur?, repartition? }
   }) */
(function () {
  const esc = (s) => (window.echapper ? window.echapper(s) : String(s == null ? '' : s));
  // Teintes assez foncées : avec une couleur claire, Chrome assombrit le rail des réglettes.
  const COULEURS = ['#002743', '#00868a', '#e62460', '#b45309', '#1f7a45', '#6338f5', '#a16207', '#5a6d7d'];
  const entier = (v) => Math.max(0, parseInt(v, 10) || 0);
  const pluriel = (n, s, p) => `${n} ${n > 1 ? p || s + 's' : s}`;

  function monter(el, o) {
    const etat = {
      lignes: (o.lignes || []).map((l) => ({ ...l, parProduit: { ...(l.parProduit || {}) } })),
      ouverts: new Set(), // lignes dont le détail par catégorie est déplié
    };
    const produits = (o.objectifs || []).filter((x) => x.produit).map((x) => x.produit);
    const objectif = () =>
      (o.objectifGlobal || 0) > 0 ? o.objectifGlobal : (o.objectifs || []).reduce((t, x) => t + (x.quantite || 0), 0);
    const total = () => etat.lignes.reduce((t, l) => t + l.quantite, 0);
    const nomDe = (l) => {
      if (!l.structureId) return l.nom;
      const s = (o.structures || []).find((x) => x.id === l.structureId);
      return s ? s.nom : l.nom || 'Structure CVDL';
    };
    const maxReglette = (q) => Math.max(objectif() || 0, 20, q);

    /* ── Enregistrement (après une pause dans les réglages) ── */
    let minuteur = null;
    const indiquer = (texte, classe) => {
      const e = el.querySelector('.rp-rep-etat');
      if (e) {
        e.textContent = texte;
        e.className = 'rp-rep-etat' + (classe ? ' ' + classe : '');
      }
    };
    function programmer() {
      indiquer('Modifications non enregistrées…');
      clearTimeout(minuteur);
      minuteur = setTimeout(async () => {
        indiquer('Enregistrement…');
        const r = await Promise.resolve(o.enregistrer(etat.lignes)).catch(() => ({ ok: false }));
        if (r && r.ok) indiquer('Enregistré ✓', 'ok');
        else indiquer((r && r.erreur) || 'Enregistrement impossible — réessayez.', 'ko');
      }, 700);
    }

    /* ── Résultat (recalculé à chaque mouvement de réglette) ── */
    function resultat() {
      const obj = objectif();
      const tot = total();
      const ecart = obj - tot;
      const etatTotal = !obj
        ? '<span class="rp-rep-puce">Pas d’objectif : répartition libre</span>'
        : ecart > 0
          ? `<span class="rp-rep-puce att">${pluriel(ecart, 'appareil')} à répartir</span>`
          : ecart < 0
            ? `<span class="rp-rep-puce ko">Dépassé de ${-ecart}</span>`
            : '<span class="rp-rep-puce ok">Tout est réparti</span>';
      const base = Math.max(obj, tot, 1);
      const segments = etat.lignes
        .map((l, i) =>
          l.quantite
            ? `<i style="width:${(l.quantite / base) * 100}%;background:${COULEURS[i % COULEURS.length]}" title="${esc(nomDe(l))} : ${l.quantite}"></i>`
            : '',
        )
        .join('');
      const parCategorie = produits.length
        ? `<div class="rp-rep-cats">${(o.objectifs || [])
            .filter((x) => x.produit)
            .map((x) => {
              const prevu = etat.lignes.reduce((t, l) => t + (l.parProduit[x.produit] || 0), 0);
              return `<span class="${x.quantite && prevu > x.quantite ? 'ko' : ''}">${esc(x.produit)} : <b>${prevu}</b>${x.quantite ? ` / ${x.quantite}` : ''} précisés</span>`;
            })
            .join('')}</div>`
        : '';
      return `<div class="rp-rep-chiffre"><b>${tot}</b><span>${obj ? `/ ${obj} appareils prévus` : `appareil${tot > 1 ? 's' : ''} prévu${tot > 1 ? 's' : ''}`}</span>${etatTotal}</div>
        <div class="rp-rep-barre${obj && tot > obj ? ' depasse' : ''}" role="img" aria-label="${tot} prévus sur ${obj || tot}">${segments}</div>${parCategorie}`;
    }

    function lignePartielle(l, i) {
      const r = o.realise ? o.realise(l) : null;
      const obj = objectif();
      const part = obj ? Math.round((l.quantite / obj) * 100) : total() ? Math.round((l.quantite / total()) * 100) : 0;
      const deja =
        r && (r.livre || r.engage)
          ? `${r.livre ? `${r.livre} livré${r.livre > 1 ? 's' : ''}` : ''}${r.livre && r.engage ? ' · ' : ''}${r.engage ? `${r.engage} en cours` : ''}${r.livre + r.engage > l.quantite ? ' · <b class="ko">au-delà du prévu</b>' : ''}`
          : '';
      return { part, deja, i };
    }

    function htmlLigne(l, i) {
      const { part, deja } = lignePartielle(l, i);
      const detail = Object.keys(l.parProduit).length > 0;
      const max = maxReglette(l.quantite);
      const choixRattacher =
        !l.structureId && (o.structures || []).length
          ? `<select class="rp-rep-rattacher" data-rattacher="${i}" aria-label="Rattacher ${esc(l.nom)} à une structure CVDL"><option value="">Rattacher à une structure CVDL…</option>${o.structures
              .filter((s) => !etat.lignes.some((x) => x.structureId === s.id))
              .map((s) => `<option value="${s.id}">${esc(s.nom)}</option>`)
              .join('')}</select>`
          : '';
      return `<div class="rp-rep-ligne" data-ligne="${i}">
        <span class="rp-rep-pastille" style="background:${COULEURS[i % COULEURS.length]}" aria-hidden="true"></span>
        <div class="rp-rep-nom"><b>${esc(nomDe(l))}</b>
          ${(o.structures || []).length ? `<small>${l.structureId ? 'Structure CVDL' : 'Pas encore dans CVDL'}${deja ? ` · ${deja}` : ''}</small>` : ''}${choixRattacher}</div>
        <input type="range" class="rp-rep-reglette" style="accent-color:${COULEURS[i % COULEURS.length]}" min="0" max="${max}" value="${l.quantite}" data-reglette="${i}" aria-label="Appareils prévus pour ${esc(nomDe(l))}"${detail ? ' disabled title="Somme du détail par catégorie"' : ''}>
        <input type="number" class="input rp-rep-n" min="0" value="${l.quantite}" data-nombre="${i}" aria-label="Nombre d’appareils pour ${esc(nomDe(l))}"${detail ? ' disabled' : ''}>
        <span class="rp-rep-part" data-part="${i}">${part} %</span>
        <span class="rp-rep-actions">${produits.length ? `<button type="button" class="rp-rep-lien" data-detail="${i}" aria-expanded="${etat.ouverts.has(i)}">${detail ? 'Par catégorie ▾' : 'Préciser par catégorie'}</button>` : ''}<button type="button" class="rp-rep-retirer" data-retirer="${i}" aria-label="Retirer ${esc(nomDe(l))}">✕</button></span>
        ${
          etat.ouverts.has(i)
            ? `<div class="rp-rep-detail">${produits
                .map(
                  (p) =>
                    `<label><span>${esc(p)}</span><input type="range" min="0" max="${maxReglette(l.parProduit[p] || 0)}" value="${l.parProduit[p] || 0}" data-produit="${esc(p)}" data-ligne-produit="${i}"><input type="number" class="input rp-rep-n" min="0" value="${l.parProduit[p] || 0}" data-produit="${esc(p)}" data-nombre-produit="${i}"></label>`,
                )
                .join('')}<p>Le nombre de la structure devient la somme des catégories.</p></div>`
            : ''
        }
      </div>`;
    }

    function rendre() {
      const noms = (o.structures || []).map((s) => `<option value="${esc(s.nom)}">`).join('');
      el.innerHTML = `<div class="rp-rep">
        <div class="rp-rep-tete"><div><h3>Répartition prévue</h3><p>Structures pressenties et nombre d’appareils prévu pour chacune. Outil de décision : rien n’est réservé ni montré aux structures.</p></div><span class="rp-rep-etat" aria-live="polite"></span></div>
        <div class="rp-rep-resultat" aria-live="polite">${resultat()}</div>
        <div class="rp-rep-lignes">${etat.lignes.length ? etat.lignes.map(htmlLigne).join('') : '<p class="rp-rep-vide">Ajoutez les structures pressenties ci-dessous.</p>'}</div>
        <div class="rp-rep-ajout">
          <input class="input" list="rp-rep-noms" maxlength="150" placeholder="${(o.structures || []).length ? 'Structure CVDL, ou nom d’une structure à venir…' : 'Nom de la structure…'}" data-ajout aria-label="Structure à ajouter">
          <datalist id="rp-rep-noms">${noms}</datalist>
          <button type="button" class="btn btn-secondary" data-ajouter>+ Ajouter</button>
          ${etat.lignes.length > 1 && objectif() ? '<button type="button" class="rp-rep-lien" data-equitable>Répartir l’objectif équitablement</button>' : ''}
        </div>
      </div>`;
    }

    /** Mise à jour sans tout redessiner (la réglette en cours garde le focus). */
    function rafraichir(i) {
      el.querySelector('.rp-rep-resultat').innerHTML = resultat();
      etat.lignes.forEach((l, k) => {
        const p = el.querySelector(`[data-part="${k}"]`);
        if (p) p.textContent = `${lignePartielle(l, k).part} %`;
      });
      if (i == null) return;
      const l = etat.lignes[i];
      const r = el.querySelector(`[data-reglette="${i}"]`);
      const n = el.querySelector(`[data-nombre="${i}"]`);
      if (r && document.activeElement !== r) {
        r.max = maxReglette(l.quantite);
        r.value = l.quantite;
      }
      if (n && document.activeElement !== n) n.value = l.quantite;
    }

    function ajouter() {
      const champ = el.querySelector('[data-ajout]');
      const nom = champ.value.trim();
      if (!nom) return champ.focus();
      const s = (o.structures || []).find((x) => x.nom.toLowerCase() === nom.toLowerCase());
      if (s && etat.lignes.some((l) => l.structureId === s.id)) {
        champ.value = '';
        return;
      }
      etat.lignes.push({ structureId: s ? s.id : null, nom: s ? '' : nom, quantite: 0, parProduit: {} });
      rendre();
      programmer();
      el.querySelector('[data-ajout]').focus();
    }

    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.reglette != null || t.dataset.nombre != null) {
        const i = Number(t.dataset.reglette ?? t.dataset.nombre);
        etat.lignes[i].quantite = entier(t.value);
        rafraichir(i);
        return programmer();
      }
      if (t.dataset.ligneProduit != null || t.dataset.nombreProduit != null) {
        const i = Number(t.dataset.ligneProduit ?? t.dataset.nombreProduit);
        const l = etat.lignes[i];
        const q = entier(t.value);
        if (q) l.parProduit[t.dataset.produit] = q;
        else delete l.parProduit[t.dataset.produit];
        const detail = Object.values(l.parProduit).reduce((s, x) => s + x, 0);
        if (Object.keys(l.parProduit).length) l.quantite = detail;
        const jumeau = el.querySelector(
          `[data-${t.dataset.ligneProduit != null ? 'nombre-produit' : 'ligne-produit'}="${i}"][data-produit="${CSS.escape(t.dataset.produit)}"]`,
        );
        if (jumeau) jumeau.value = q;
        rafraichir(i);
        const r = el.querySelector(`[data-reglette="${i}"]`);
        const n = el.querySelector(`[data-nombre="${i}"]`);
        if (r) {
          r.max = maxReglette(l.quantite);
          r.value = l.quantite;
          r.disabled = n.disabled = Object.keys(l.parProduit).length > 0;
        }
        if (n) n.value = l.quantite;
        return programmer();
      }
    });
    el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.rattacher != null && t.value) {
        const l = etat.lignes[Number(t.dataset.rattacher)];
        l.structureId = Number(t.value);
        l.nom = '';
        rendre();
        programmer();
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('[data-ajout]')) {
        e.preventDefault();
        ajouter();
      }
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      if (b.dataset.ajouter != null) return ajouter();
      if (b.dataset.retirer != null) {
        const i = Number(b.dataset.retirer);
        etat.lignes.splice(i, 1);
        etat.ouverts = new Set([...etat.ouverts].filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)));
        rendre();
        return programmer();
      }
      if (b.dataset.detail != null) {
        const i = Number(b.dataset.detail);
        if (etat.ouverts.has(i)) etat.ouverts.delete(i);
        else etat.ouverts.add(i);
        return rendre();
      }
      if (b.dataset.equitable != null) {
        const n = etat.lignes.length;
        const obj = objectif();
        if (etat.lignes.some((l) => Object.keys(l.parProduit).length)) etat.lignes.forEach((l) => (l.parProduit = {}));
        etat.lignes.forEach((l, k) => (l.quantite = Math.floor(obj / n) + (k < obj % n ? 1 : 0)));
        etat.ouverts.clear();
        rendre();
        return programmer();
      }
    });

    rendre();
    return {
      lignes: () => etat.lignes,
      /** Nouvelles structures CVDL ou nouveau réalisé (après rechargement), sans perdre la saisie. */
      actualiser(nouvelles) {
        Object.assign(o, nouvelles);
        rendre();
      },
    };
  }

  window.RepartitionCvdl = { monter };
})();
