/* Admin CVDL — programmes de distribution. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ════════════════════════════════════════════════════════════════════════════════════
   DISTRIBUTION — programmes de distribution (onglet, formulaire, détail), rattachement des
   commandes à la livraison, calendrier global. Back : routes/distributions.js, distributions.js.
   ════════════════════════════════════════════════════════════════════════════════════ */
const TYPES_PERIMETRE = [
  ['rn', 'RNum'],
  ['projets', 'Projets'],
  ['bo', 'BO'],
  ['interne', 'Interne'],
  ['esn', 'ESN'],
  ['standard', 'Standard'],
];
const MODES_RATTACHEMENT = {
  propose: {
    libelle: 'Proposé à la livraison',
    aide: 'À l’étape « Confirmer la livraison », question « Rattacher à ce programme ? » (oui / non).',
  },
  auto: { libelle: 'Automatique', aide: 'Toute commande éligible est rattachée dès sa création (modifiable).' },
  lien: {
    libelle: 'Lien de commande dédié',
    aide: 'Seules les commandes passées via le lien du programme sont rattachées (appels à projets).',
  },
};
function departementDeAdresse(adresse) {
  const cps = String(adresse || '').match(/\b\d{5}\b/g);
  if (!cps) return '';
  const cp = cps[cps.length - 1];
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3);
  if (cp.startsWith('20')) return parseInt(cp, 10) < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
}
const isoJour = (d) => {
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? ''
    : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const frDate = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
};
function phaseProgramme(p) {
  if (p.statut === 'archive') return 'archives';
  const auj = isoJour(new Date());
  if (p.debut && auj < p.debut) return 'avenir';
  if (p.butoir && auj > p.butoir) return 'termines';
  return 'cours';
}
async function rechargerDistributions() {
  const r = await jsonp({ action: 'distributions', password: motDePasse });
  if (r && r.ok) {
    state.distributions = r.programmes || [];
    state.rattachements = r.rattachements || [];
  }
}
function nomProgramme(id) {
  const p = state.distributions.find((x) => x.id === id);
  return p ? p.nom : id;
}
function barreObjectif(o, echelle, sous) {
  const base = Math.max(o.objectif || echelle || 0, o.livre + o.engage, 1);
  return `<div class="di-obj${sous ? ' sous' : ''}"><div class="di-obj-l"><b>${echapper(o.produit)}</b><span>${o.livre} livré${o.livre > 1 ? 's' : ''}${o.engage ? ` · ${o.engage} engagé${o.engage > 1 ? 's' : ''}` : ''}${o.objectif ? ` / ${o.objectif}` : ''}${o.livre > o.objectif && o.objectif ? ' · dépassé' : ''}</span></div>
    <div class="di-barre" role="img" aria-label="${echapper(o.produit)} : ${o.livre} livrés, ${o.engage} engagés sur ${o.objectif}"><i class="liv" style="width:${Math.min(100, (o.livre / base) * 100)}%"></i><i class="eng" style="width:${Math.min(100, (o.engage / base) * 100)}%"></i></div></div>`;
}
/** Barres d'un programme : objectif global (tous produits confondus) puis détail par produit. */
function barresProgramme(av) {
  const lignes = av.objectifs || [];
  if (!av.global) return lignes.map((o) => barreObjectif(o)).join('');
  return (
    barreObjectif({ produit: 'Total', objectif: av.totalObjectif, livre: av.totalLivre, engage: av.totalEngage || 0 }) +
    lignes
      .filter((o) => o.objectif || o.livre || o.engage)
      .map((o) => barreObjectif(o, av.totalObjectif, true))
      .join('')
  );
}
function tagRythme(av) {
  if (!av) return '';
  if (av.reste === 0) return '<span class="di-tag ok">Objectif atteint</span>';
  if (av.joursRestants != null && av.joursRestants < 0)
    return '<span class="di-tag alerte">Terminé · objectif non atteint</span>';
  return av.enRetard
    ? `<span class="di-tag alerte" title="Rythme actuel ~${av.rythmeActuel}/sem.">En retard : ~${av.rythmeNecessaire}/sem. à livrer</span>`
    : '<span class="di-tag ok">Dans le rythme</span>';
}
function resumePerimetre(p) {
  const per = p.perimetre || {};
  const t = [];
  if (per.structures && per.structures.length)
    t.push(
      `${per.structures.length} structure${per.structures.length > 1 ? 's' : ''} désignée${per.structures.length > 1 ? 's' : ''}`,
    );
  else {
    if (per.regions && per.regions.length) t.push(per.regions.join(', '));
    if (per.departements && per.departements.length) t.push('Dép. ' + per.departements.join(', '));
    if (per.types && per.types.length)
      t.push(per.types.map((x) => (TYPES_PERIMETRE.find((y) => y[0] === x) || [x, x])[1]).join(' · '));
  }
  return t.length ? t : ['Toutes les structures'];
}

/* ── Onglet Distribution ── */
function vueDistribution() {
  const liste = state.distributions || [];
  const compte = (k) => liste.filter((p) => phaseProgramme(p) === k).length;
  const regions = [...new Set(liste.flatMap((p) => (p.perimetre && p.perimetre.regions) || []))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
  const visibles = liste.filter(
    (p) =>
      phaseProgramme(p) === state.distFiltre &&
      (!state.distRegion || ((p.perimetre && p.perimetre.regions) || []).includes(state.distRegion)),
  );
  const filtre = (k, l) =>
    `<button type="button" class="di-filtre${state.distFiltre === k ? ' on' : ''}" data-dist-filtre="${k}" aria-pressed="${state.distFiltre === k}">${l} (${compte(k)})</button>`;
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5)">
      <div><h1 style="font-size:32px;margin-bottom:var(--space-2)">Distribution</h1><p style="opacity:0.65;margin:0;font-size:15px">Programmes de distribution : objectifs, livré, engagé et reste à distribuer.</p></div>
      <button type="button" class="btn btn-primary" data-dist-nouveau>${icon('plus', 15)}Nouveau programme</button>
    </div>
    <div class="di-filtres">${filtre('cours', 'En cours')}${filtre('avenir', 'À venir')}${filtre('termines', 'Terminés')}${filtre('archives', 'Archivés')}
      ${regions.length ? `<select class="input" id="dist-region" style="width:auto" aria-label="Filtrer par région"><option value="">Toutes les régions</option>${regions.map((r) => `<option ${state.distRegion === r ? 'selected' : ''}>${echapper(r)}</option>`).join('')}</select>` : ''}</div>
    <div class="di-legende"><span><i class="liv"></i>Livré</span><span><i class="eng"></i>Engagé (validée, pas encore livrée)</span><span><i></i>Reste</span></div>
    ${
      visibles.length
        ? `<div class="di-grille">${visibles
            .map((p) => {
              const av = p.avancement || {};
              const tot = av.totalObjectif || 0,
                liv = av.totalLivre || 0,
                eng = av.totalEngage || 0;
              const pct = tot ? Math.min(100, Math.round((liv / tot) * 100)) : 0;
              const pctEng = tot ? Math.min(100 - pct, Math.round((eng / tot) * 100)) : 0;
              const r = 26,
                c = 2 * Math.PI * r;
              const jours = av.joursRestants != null && av.joursRestants >= 0 ? av.joursRestants : null;
              const perim = resumePerimetre(p);
              const produits = (av.objectifs || []).filter((o) => o.objectif || o.livre || o.engage);
              return `<article class="di-carte di2${av.enRetard && av.reste ? ' retard' : ''}${av.reste === 0 ? ' atteint' : ''}" data-dist-ouvrir="${echapper(p.id)}" role="button" tabindex="0" aria-label="Ouvrir ${echapper(p.nom)}">
        <div class="di2-tete">
          <svg class="di2-anneau" viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
            <circle cx="34" cy="34" r="${r + 5}" fill="color-mix(in srgb, #002743 12%, transparent)"/>
            <circle cx="32" cy="32" r="${r + 5}" fill="#fff" stroke="#002743" stroke-width="1.4"/>
            <circle cx="32" cy="32" r="${r}" fill="none" stroke="#EEF2F5" stroke-width="7"/>
            ${pctEng ? `<circle cx="32" cy="32" r="${r}" fill="none" stroke="#9FE0E1" stroke-width="7" stroke-dasharray="${((pct + pctEng) / 100) * c} ${c}" transform="rotate(-90 32 32)"/>` : ''}
            ${pct ? `<circle cx="32" cy="32" r="${r}" fill="none" stroke="#00ACB0" stroke-width="7" stroke-dasharray="${(pct / 100) * c} ${c}" transform="rotate(-90 32 32)"/>` : ''}
            <text x="32" y="36.5" text-anchor="middle" font-size="12" font-weight="700" fill="#002743" font-family="Space Grotesk, system-ui">${pct}%</text>
          </svg>
          <div class="di2-titre">
            ${p.financeur ? `<div class="di-sur">${echapper(p.financeur)}</div>` : ''}
            <h3>${echapper(p.nom)}</h3>
            <div class="di2-periode">${icon('calendrier', 13)}${frDate(p.debut)} → <b>${frDate(p.butoir)}</b></div>
          </div>
        </div>
        <div class="di2-chiffres">
          <div><b>${liv}</b><span>livré${liv > 1 ? 's' : ''}</span></div>
          <div><b>${eng}</b><span>engagé${eng > 1 ? 's' : ''}</span></div>
          <div><b>${av.reste != null ? av.reste : Math.max(0, tot - liv)}</b><span>à distribuer</span></div>
          <div><b>${tot || '—'}</b><span>objectif</span></div>
        </div>
        ${
          produits.length
            ? `<div class="di2-produits">${produits
                .slice(0, 3)
                .map((o) => {
                  const b = Math.max(o.objectif || 0, o.livre + o.engage, 1);
                  return `<div class="di2-prod"><span>${echapper(o.produit)}</span><span class="di2-piste"><i class="l" style="width:${(o.livre / b) * 100}%"></i><i class="e" style="width:${(o.engage / b) * 100}%"></i></span><small>${o.livre}${o.objectif ? `/${o.objectif}` : ''}</small></div>`;
                })
                .join(
                  '',
                )}${produits.length > 3 ? `<div class="di2-plus">+ ${produits.length - 3} autre${produits.length - 3 > 1 ? 's' : ''} produit${produits.length - 3 > 1 ? 's' : ''}</div>` : ''}</div>`
            : ''
        }
        <div class="di2-pied">
          <span class="di2-puce" title="Périmètre">${icon('pin', 12)}${echapper(perim.join(' · '))}</span>
          <span class="di2-puce">${icon('arrow', 12)}${echapper(MODES_RATTACHEMENT[p.mode].libelle)}</span>
          <span class="di-esp"></span>
          ${jours != null ? `<span class="di-jours${jours < 60 && av.enRetard ? ' urg' : ''}">J-${jours}</span>` : ''}${tagRythme(av)}
        </div>
      </article>`;
            })
            .join('')}</div>`
        : `<div class="pk-etat"><span data-ill="vide" class="ill"></span>${liste.length ? 'Aucun programme dans ce filtre.' : 'Aucun programme pour l’instant : créez le premier avec « Nouveau programme ».'}</div>`
    }`;
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-dist-filtre]');
  if (f) {
    state.distFiltre = f.dataset.distFiltre;
    render();
    return;
  }
  if (e.target.closest('[data-dist-nouveau]')) {
    state.modal = { kind: 'distribution-form', modalParent: modalParentPour('distribution-form') };
    render();
    return;
  }
  const o = e.target.closest('[data-dist-ouvrir]');
  if (o) {
    state.modal = {
      kind: 'distribution-detail',
      ref: o.dataset.distOuvrir,
      modalParent: modalParentPour('distribution-detail'),
    };
    render();
    return;
  }
  const m = e.target.closest('[data-dist-modifier]');
  if (m) {
    state.modal = { kind: 'distribution-form', ref: m.dataset.distModifier, modalParent: state.modal };
    render();
    return;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-dist-ouvrir]')) e.target.click();
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'dist-region') {
    state.distRegion = e.target.value;
    render();
  }
});

/* ── Formulaire (création / modification) ── */
function ligneObjectifForm(o) {
  return `<div class="di-ligne-f" data-dist-obj><select class="input" aria-label="Produit"><option value="">Choisir un produit…</option>${state.produits.map((p) => `<option ${o && o.produit === p.nom ? 'selected' : ''}>${echapper(p.nom)}</option>`).join('')}</select>
    <input class="input" type="number" min="1" value="${o ? o.quantite : ''}" placeholder="Quantité" aria-label="Quantité"><button type="button" class="btn btn-ghost btn-icon" data-dist-retirer aria-label="Retirer">${icon('x', 14)}</button></div>`;
}
/** « Déjà distribués avant le suivi » : produit ('' = sans produit précisé) + quantité. */
function ligneDejaForm(d) {
  return `<div class="di-ligne-f" data-dist-deja><select class="input" aria-label="Produit"><option value="">Sans produit précisé</option>${state.produits.map((p) => `<option ${d && d.produit === p.nom ? 'selected' : ''}>${echapper(p.nom)}</option>`).join('')}</select>
    <input class="input" type="number" min="1" value="${d ? d.quantite : ''}" placeholder="Quantité" aria-label="Quantité déjà distribuée"><button type="button" class="btn btn-ghost btn-icon" data-dist-retirer aria-label="Retirer">${icon('x', 14)}</button></div>`;
}
function ligneJalonForm(j) {
  return `<div class="di-ligne-f jalon" data-dist-jalon><input class="input" type="date" value="${j ? echapper(j.date) : ''}" aria-label="Date"><input class="input" value="${j ? echapper(j.libelle) : ''}" placeholder="ex. Bilan intermédiaire financeur" aria-label="Libellé"><button type="button" class="btn btn-ghost btn-icon" data-dist-retirer aria-label="Retirer">${icon('x', 14)}</button></div>`;
}
function vueDistributionForm() {
  const p = state.modal.ref ? state.distributions.find((x) => x.id === state.modal.ref) : null;
  const per = (p && p.perimetre) || { regions: [], departements: [], types: [], structures: [] };
  const puce = (groupe, val, lib, on) =>
    `<label class="di-puce"><input type="checkbox" data-dist-per="${groupe}" value="${echapper(val)}" ${on ? 'checked' : ''}><span>${echapper(lib)}</span></label>`;
  const corps = `<div style="grid-column:1/-1;display:flex;flex-direction:column;gap:14px;min-width:0">
    <div class="di-champs">
      <label class="field di-pleine"><span>Nom *</span><input class="input" id="df-nom" value="${p ? echapper(p.nom) : ''}"></label>
      <label class="field"><span>Financeur / partenaire</span><input class="input" id="df-financeur" value="${p ? echapper(p.financeur) : ''}"></label>
      <label class="field"><span>Référence interne</span><input class="input" id="df-reference" value="${p ? echapper(p.reference) : ''}" placeholder="ex. convention 2026-14"></label>
      <label class="field"><span>Début *</span><input class="input" type="date" id="df-debut" value="${p ? echapper(p.debut) : isoJour(new Date())}"></label>
      <label class="field"><span>Date butoir *</span><input class="input" type="date" id="df-butoir" value="${p ? echapper(p.butoir) : ''}"></label>
    </div>
    <section class="di-sect"><h3>Périmètre : qui peut en bénéficier</h3><p class="di-aide">Critère vide = pas de restriction. Une liste de structures précise remplace les autres critères.</p>
      <div><b>Régions analytiques</b><div class="di-puces">${REGIONS_ANALYTIQUE.map((r) => puce('regions', r, r, per.regions.includes(r))).join('')}</div></div>
      <label class="field"><span>Départements <em style="font-weight:400">(numéros séparés par des virgules, d’après le code postal de la structure)</em></span><input class="input" id="df-departements" value="${echapper(per.departements.join(', '))}" placeholder="93, 94"></label>
      <div><b>Types de structure</b><div class="di-puces">${TYPES_PERIMETRE.map(([k, l]) => puce('types', k, l, per.types.includes(k))).join('')}</div></div>
      <details ${per.structures.length ? 'open' : ''}><summary><b>Structures précises</b> <span class="di-aide">(${per.structures.length || 'aucune'})</span></summary>
        <input class="input" id="df-recherche-struct" placeholder="Filtrer…" style="margin:8px 0">
        <div class="di-structs">${state.structures
          .slice()
          .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
          .map(
            (s) =>
              `<label data-nom="${echapper(s.nom.toLowerCase())}"><input type="checkbox" data-dist-per="structures" value="${echapper(s.code)}" ${per.structures.includes(s.code) ? 'checked' : ''}>${echapper(s.nom)}</label>`,
          )
          .join('')}</div></details>
    </section>
    <section class="di-sect"><h3>Objectifs *</h3>
      <label class="field"><span>Objectif global <em style="font-weight:400">(tous produits confondus, facultatif)</em></span><input class="input" type="number" min="1" id="df-global" value="${p && p.objectifGlobal ? p.objectifGlobal : ''}" placeholder="ex. 500" style="max-width:200px"></label>
      <p class="di-aide">Par produit : quantité à atteindre pour chaque produit. Avec un objectif global, la quantité par produit devient facultative : une ligne sans quantité limite simplement les produits comptés. Sans aucune ligne, tous les produits comptent.</p>
      <div id="df-objectifs">${(p ? p.objectifs : [null]).map(ligneObjectifForm).join('')}</div>
      <div><button type="button" class="btn btn-secondary" data-dist-ajout-obj>${icon('plus', 14)}Ajouter un produit</button></div></section>
    <section class="di-sect"><h3>Rattachement des commandes</h3><div class="di-radios">${Object.entries(
      MODES_RATTACHEMENT,
    )
      .map(
        ([k, m]) =>
          `<label><input type="radio" name="df-mode" value="${k}" ${(p ? p.mode : 'propose') === k ? 'checked' : ''}><span><b>${m.libelle}</b><small>${m.aide}</small></span></label>`,
      )
      .join('')}</div>
      <p class="di-aide">Une structure peut aussi être liée à ce programme depuis sa fiche : toutes ses commandes y sont alors rattachées d’office.</p></section>
    <section class="di-sect"><h3>Déjà distribués avant le suivi <span class="di-aide">(facultatif)</span></h3>
      <p class="di-aide">Pour un programme déjà en cours avant sa création ici : ces appareils comptent dans le « livré » dès le début du programme.</p>
      <div id="df-deja">${((p && p.deja) || []).map(ligneDejaForm).join('')}</div>
      <div><button type="button" class="btn btn-secondary" data-dist-ajout-deja>${icon('plus', 14)}Ajouter des appareils déjà distribués</button></div></section>
    <section class="di-sect"><h3>Points d’étape <span class="di-aide">(affichés dans le calendrier)</span></h3><div id="df-jalons">${((p && p.jalons) || []).map(ligneJalonForm).join('')}</div>
      <div><button type="button" class="btn btn-secondary" data-dist-ajout-jalon>${icon('plus', 14)}Ajouter un point d’étape</button></div></section>
  </div>`;
  return `<div class="dialog-backdrop"><div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="df-titre" style="width:min(860px,100%)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)"><div class="dialog-title" id="df-titre">${p ? 'Modifier le programme' : 'Nouveau programme de distribution'}</div>
      <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
    <div class="dialog-corps">${corps}</div><div id="rp-retour-modale"></div>
    <div class="dialog-actions" style="justify-content:flex-end"><button type="button" class="btn btn-primary" id="df-enregistrer">${p ? 'Enregistrer' : 'Créer le programme'}</button></div>
  </div></div>`;
}
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-dist-ajout-obj]')) {
    $('df-objectifs').insertAdjacentHTML('beforeend', ligneObjectifForm(null));
    return;
  }
  if (e.target.closest('[data-dist-ajout-jalon]')) {
    $('df-jalons').insertAdjacentHTML('beforeend', ligneJalonForm(null));
    return;
  }
  if (e.target.closest('[data-dist-ajout-deja]')) {
    $('df-deja').insertAdjacentHTML('beforeend', ligneDejaForm(null));
    return;
  }
  const r = e.target.closest('[data-dist-retirer]');
  if (r) {
    r.parentElement.remove();
    return;
  }
  if (e.target.id !== 'df-enregistrer') return;
  const coches = (g) => [...document.querySelectorAll(`[data-dist-per="${g}"]:checked`)].map((x) => x.value);
  const programme = {
    id: state.modal.ref || '',
    nom: $('df-nom').value.trim(),
    financeur: $('df-financeur').value.trim(),
    reference: $('df-reference').value.trim(),
    debut: $('df-debut').value,
    butoir: $('df-butoir').value,
    perimetre: {
      regions: coches('regions'),
      types: coches('types'),
      structures: coches('structures'),
      departements: $('df-departements')
        .value.split(/[,;\s]+/)
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean),
    },
    objectifGlobal: parseInt($('df-global').value, 10) || 0,
    objectifs: [...document.querySelectorAll('[data-dist-obj]')]
      .map((l) => ({
        produit: l.querySelector('select').value,
        quantite: parseInt(l.querySelector('input').value, 10) || 0,
      }))
      .filter((o) => o.produit && (o.quantite > 0 || parseInt($('df-global').value, 10) > 0)),
    mode: (document.querySelector('input[name="df-mode"]:checked') || {}).value || 'propose',
    deja: [...document.querySelectorAll('[data-dist-deja]')]
      .map((l) => ({
        produit: l.querySelector('select').value,
        quantite: parseInt(l.querySelector('input').value, 10) || 0,
      }))
      .filter((d) => d.quantite > 0),
    jalons: [...document.querySelectorAll('[data-dist-jalon]')]
      .map((l) => ({
        date: l.querySelectorAll('input')[0].value,
        libelle: l.querySelectorAll('input')[1].value.trim(),
      }))
      .filter((j) => j.date),
  };
  e.target.disabled = true;
  const res = await posterEtat(
    { action: 'distribution-enregistrer', programme },
    'Enregistrement…',
    'Programme enregistré',
  );
  if (res && res.ok) {
    await rechargerDistributions();
    state.modal = { kind: 'distribution-detail', ref: res.id, modalParent: null };
    render();
  } else {
    afficherErreurModale(res && res.erreur);
    e.target.disabled = false;
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'df-recherche-struct') return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.di-structs label').forEach((l) => {
    l.hidden = !!q && !l.dataset.nom.includes(q);
  });
});

/* ── Détail d'un programme ── */
function vueDistributionDetail() {
  const p = state.distributions.find((x) => x.id === state.modal.ref);
  if (!p) return '';
  const av = p.avancement || { objectifs: [], commandes: [], parDepartement: {}, parStructure: {} };
  const deps = Object.entries(av.parDepartement || {}).sort((a, b) => b[1] - a[1]);
  const maxDep = Math.max(1, ...deps.map((d) => d[1]));
  const structs = Object.entries(av.parStructure || {}).sort((a, b) => b[1] - a[1]);
  const lien = new URL('commande.html?programme=' + encodeURIComponent(p.id), location.href).toString();
  const corps = `<div style="grid-column:1/-1;display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="di-tags">${resumePerimetre(p)
      .map((t) => `<span class="di-tag">${echapper(t)}</span>`)
      .join(
        '',
      )}<span class="di-tag mode">${echapper(MODES_RATTACHEMENT[p.mode].libelle)}</span>${p.reference ? `<span class="di-tag">${echapper(p.reference)}</span>` : ''}${tagRythme(av)}</div>
    ${p.mode === 'lien' ? `<div class="msg msg-info" style="flex-wrap:wrap">Lien de commande dédié : <code style="user-select:all;word-break:break-all">${echapper(lien)}</code> <button type="button" class="btn btn-secondary btn-sm" data-copier-jeton="${echapper(lien)}">Copier</button></div>` : ''}
    <div class="di-detail">
      <section class="di-bloc"><h3>Avancement</h3>${barresProgramme(av) || '<p class="di-aide">Aucun objectif.</p>'}
        ${av.enRetard && av.rythmeNecessaire ? `<p class="di-aide">Rythme nécessaire : ~${av.rythmeNecessaire} / semaine jusqu’au ${frDate(p.butoir)} (rythme actuel ~${av.rythmeActuel}).${av.projection ? ` Au rythme actuel, objectif atteint vers le ${frDate(av.projection)}.` : ''}</p>` : ''}
        <h3 style="margin-top:6px">Commandes rattachées (${av.commandes.length})</h3>
        ${
          av.commandes.length
            ? `<div class="di-table"><table><thead><tr><th>Commande</th><th>Structure</th><th>Comptés</th><th>État</th></tr></thead><tbody>${av.commandes
                .map((c) =>
                  c.avantSuivi
                    ? `<tr class="di-avant"><td><b>Avant le suivi</b></td><td>—</td><td>${Object.entries(c.compte)
                        .map(([pr, q]) => `${q} × ${echapper(pr)}`)
                        .join(' · ')}</td><td><span class="di-tag">Déjà distribués</span></td></tr>`
                    : `<tr data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0"><td><b>${echapper(c.reference)}</b></td><td>${echapper(c.nom || c.code)}</td><td>${Object.entries(
                        c.compte,
                      )
                        .map(([pr, q]) => `${q} × ${echapper(pr)}`)
                        .join(
                          ' · ',
                        )}</td><td>${c.statut === 'Livrée' ? `<span class="di-tag ok">Livrée ${echapper(c.dateLivraison)}</span>` : `<span class="di-tag">${echapper(c.statut)}</span>`}</td></tr>`,
                )
                .join('')}</tbody></table></div>`
            : '<p class="di-aide">Aucune commande rattachée pour l’instant.</p>'
        }
      </section>
      <section class="di-bloc"><h3>Par département</h3>${deps.length ? deps.map(([d, q]) => `<div class="di-hb"><b>${echapper(d)}</b><span class="di-hbt"><i style="width:${(q / maxDep) * 100}%"></i></span><span>${q}</span></div>`).join('') : '<p class="di-aide">Rien de livré.</p>'}
        <h3 style="margin-top:6px">Par structure</h3>${
          structs
            .slice(0, 8)
            .map(
              ([n, q]) =>
                `<div class="di-hb large"><span>${echapper(n)}</span><span class="di-hbt"><i style="width:${(q / Math.max(1, structs[0][1])) * 100}%"></i></span><span>${q}</span></div>`,
            )
            .join('') || '<p class="di-aide">—</p>'
        }${structs.length > 8 ? `<p class="di-aide">+ ${structs.length - 8} autres</p>` : ''}
        ${av.personnes ? `<p class="di-aide">${av.personnes} personne${av.personnes > 1 ? 's' : ''} équipée${av.personnes > 1 ? 's' : ''}.</p>` : ''}
        <h3 style="margin-top:6px">Points d’étape</h3><div class="di-jalons">${[
          ...(p.jalons || []),
          { date: p.butoir, libelle: 'Date butoir', fin: true },
        ]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(
            (j) =>
              `<div class="${j.date < isoJour(new Date()) ? 'passe' : ''}${j.fin ? ' fin' : ''}"><b>${frDate(j.date)}</b> · ${echapper(j.libelle || '')}</div>`,
          )
          .join('')}</div>
      </section>
    </div></div>`;
  return `<div class="dialog-backdrop"><div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="dd-titre" style="width:min(1040px,100%)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)"><div><div class="rp-surtitre">${echapper([p.financeur, `${frDate(p.debut)} → ${frDate(p.butoir)}`].filter(Boolean).join(' · '))}</div><div class="dialog-title" id="dd-titre">${echapper(p.nom)}</div></div>
      <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
    <div class="dialog-corps">${corps}</div><div id="rp-retour-modale"></div>
    <div class="dialog-actions" style="justify-content:space-between">
      <button type="button" class="btn btn-ghost" data-dist-archiver="${echapper(p.id)}" data-archiver="${p.statut === 'archive' ? '0' : '1'}">${p.statut === 'archive' ? 'Désarchiver' : 'Archiver'}</button>
      <span style="display:flex;gap:8px"><button type="button" class="btn btn-secondary" data-dist-export="${echapper(p.id)}">${icon('file', 14)}Exporter CSV</button><button type="button" class="btn btn-primary" data-dist-modifier="${echapper(p.id)}">Modifier</button></span>
    </div></div></div>`;
}
function telechargerCsv(nom, lignes) {
  const csv =
    '﻿' + lignes.map((l) => l.map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
document.addEventListener('click', async (e) => {
  const ex = e.target.closest('[data-dist-export]');
  if (ex) {
    const p = state.distributions.find((x) => x.id === ex.dataset.distExport);
    if (!p) return;
    const lignes = [['Programme', 'Commande', 'Structure', 'Département', 'Produit', 'Quantité', 'État', 'Livrée le']];
    (p.avancement.commandes || []).forEach((c) =>
      Object.entries(c.compte).forEach(([pr, q]) =>
        lignes.push([p.nom, c.reference, c.nom || c.code, c.departement, pr, q, c.statut, c.dateLivraison]),
      ),
    );
    telechargerCsv(`distribution-${p.id}.csv`, lignes);
    return;
  }
  const ar = e.target.closest('[data-dist-archiver]');
  if (ar) {
    const archiver = ar.dataset.archiver === '1';
    if (
      archiver &&
      !(await confirmerCvdl(
        'Archiver ce programme ?\n\nIl ne sera plus proposé aux commandes ; son historique reste consultable (filtre « Archivés »).',
      ))
    )
      return;
    const r = await posterEtat(
      { action: 'distribution-archiver', id: ar.dataset.distArchiver, archiver },
      'Enregistrement…',
      archiver ? 'Programme archivé' : 'Programme réactivé',
    );
    if (r && r.ok) {
      await rechargerDistributions();
      render();
    }
  }
});

/* ── Rattachement d'une commande (carte d'étape « Confirmer la livraison » / commande livrée) ── */
function resumeAffectation(dist) {
  const parProg = {};
  Object.entries(dist.affectation || {}).forEach(([prod, id]) => {
    (parProg[id] = parProg[id] || []).push(prod);
  });
  return Object.entries(parProg)
    .map(
      ([id, prods]) =>
        `${echapper((dist.noms && dist.noms[id]) || nomProgramme(id))} (${prods.map(echapper).join(', ')})`,
    )
    .join(' · ');
}
function tacheProgrammeCommande(c) {
  const d = c.distribution;
  if (!d || (!(d.aDemander || []).length && !Object.keys(d.affectation || {}).length && d.source !== 'non'))
    return null;
  const ref = echapper(c.reference);
  if ((d.aDemander || []).length && !d.repondu) {
    return {
      etat: 'cours',
      titre: 'Programme de distribution ?',
      detail: `Cette commande correspond à ${d.aDemander.length > 1 ? d.aDemander.length + ' programmes en cours' : 'un programme en cours'}. Les produits comptés s’ajoutent à son « livré ».${Object.keys(d.affectation || {}).length ? ` Déjà rattachée : ${resumeAffectation(d)}.` : ''}`,
      contenu: `<div class="di-choix">${d.aDemander
        .map(
          (p) =>
            `<button type="button" class="di-choix-oui" data-dist-rattacher="${ref}" data-programme="${echapper(p.id)}"><b>Oui : ${echapper(p.nom)}</b><small>compte ${Object.entries(
              p.compte,
            )
              .map(([pr, q]) => `${q} × ${echapper(pr)}`)
              .join(' · ')}</small></button>`,
        )
        .join('')}
        <button type="button" class="di-choix-non" data-dist-rattacher="${ref}" data-programme="NON"><b>Non</b><small>aucun programme pour cette commande</small></button></div>`,
    };
  }
  return {
    etat: 'ok',
    titre: 'Programme de distribution',
    detail:
      d.source === 'non' || !Object.keys(d.affectation || {}).length
        ? 'Non rattachée'
        : `${resumeAffectation(d)}${d.source === 'auto' ? ' · auto' : d.source === 'lien' ? ' · via le lien dédié' : ''}`,
    action: `<button type="button" class="et-lien" data-dist-reinit="${ref}">Modifier</button>`,
  };
}
async function enregistrerRattachement(c, valeur) {
  const r = await posterEtat(
    { action: 'commande-programmes', ligne: c.ligne, valeur },
    'Enregistrement…',
    'Rattachement enregistré',
  );
  if (!(r && r.ok)) return;
  const rc = await jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' });
  if (rc && rc.ok) state.commandes = rc.commandes || [];
  delete cacheEtatsCommandes[c.reference];
  rechargerDistributions().then(render);
  render();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dist-rattacher]');
  if (b) {
    const c = state.commandes.find((x) => x.reference === b.dataset.distRattacher);
    if (!c || !c.distribution) return;
    if (b.dataset.programme === 'NON') {
      enregistrerRattachement(
        c,
        Object.keys(c.distribution.affectation || {}).length ? { ...c.distribution.affectation } : 'NON',
      );
      return;
    }
    const p = c.distribution.aDemander.find((x) => x.id === b.dataset.programme);
    if (!p) return;
    const a = { ...(c.distribution.affectation || {}) };
    Object.keys(p.compte).forEach((prod) => {
      a[prod] = p.id;
    });
    enregistrerRattachement(c, a);
    return;
  }
  const ri = e.target.closest('[data-dist-reinit]');
  if (ri) {
    const c = state.commandes.find((x) => x.reference === ri.dataset.distReinit);
    if (c) enregistrerRattachement(c, '');
  }
});
