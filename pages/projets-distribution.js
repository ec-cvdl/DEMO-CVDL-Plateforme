function frDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || '—';
}
function isoJour(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
const pluriel = (n, s, p) => `${n} ${n > 1 ? p || s + 's' : s}`;

let codeValide = '';
let donnees = { projets: [], produits: [], icones: {}, remisSansProjet: 0 };
let filtre = 'cours';

function phase(p) {
  if (p.statut === 'archive') return 'archives';
  const auj = isoJour(new Date());
  if (p.debut && p.debut > auj) return 'avenir';
  if (p.butoir && p.butoir < auj) return 'termines';
  return 'cours';
}
function tagRythme(av) {
  if (!av) return '';
  if (av.reste === 0) return '<span class="pd-tag ok">Objectif atteint</span>';
  if (av.joursRestants != null && av.joursRestants < 0)
    return '<span class="pd-tag alerte">Terminé · objectif non atteint</span>';
  if (av.enRetard)
    return `<span class="pd-tag alerte" title="Rythme actuel ~${av.rythmeActuel}/sem.">En retard : ~${av.rythmeNecessaire}/sem. à distribuer</span>`;
  return '<span class="pd-tag ok">Dans le rythme</span>';
}
function anneau(pct) {
  const r = 26,
    c = 2 * Math.PI * r;
  return `<svg class="pd-anneau" viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
    <circle cx="34" cy="34" r="${r + 5}" fill="color-mix(in srgb, #002743 14%, transparent)"/>
    <circle cx="32" cy="32" r="${r + 5}" fill="#fff" stroke="#002743" stroke-width="1.4"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="#EEF2F5" stroke-width="7"/>
    ${pct ? `<circle cx="32" cy="32" r="${r}" fill="none" stroke="#00ACB0" stroke-width="7" stroke-dasharray="${(pct / 100) * c} ${c}" transform="rotate(-90 32 32)"/>` : ''}
    <text x="32" y="36.5" text-anchor="middle" font-size="12" font-weight="700" fill="#002743" font-family="Space Grotesk, system-ui">${pct}%</text></svg>`;
}

/* ── Liste ── */
function afficher() {
  const liste = donnees.projets || [];
  const compte = (k) => liste.filter((p) => phase(p) === k).length;
  $('pd-filtres').innerHTML = [
    ['cours', 'En cours'],
    ['avenir', 'À venir'],
    ['termines', 'Terminés'],
    ['archives', 'Archivés'],
  ]
    .map(
      ([k, l]) =>
        `<button type="button" class="pd-filtre${filtre === k ? ' on' : ''}" data-filtre="${k}" aria-pressed="${filtre === k}">${l} (${compte(k)})</button>`,
    )
    .join('');
  const n = donnees.remisSansProjet || 0;
  $('pd-info').innerHTML =
    n && liste.some((p) => p.statut !== 'archive')
      ? `<div class="pd-info"><span><b>${pluriel(n, 'appareil remis', 'appareils remis')}</b> ne ${n > 1 ? 'sont' : 'est'} rattaché${n > 1 ? 's' : ''} à aucun projet. Choisissez le projet dans « Ma flotte », sur chaque appareil remis.</span><a class="btn btn-secondary" href="flotte-structure.html">Ouvrir ma flotte</a></div>`
      : '';
  const visibles = liste.filter((p) => phase(p) === filtre);
  $('pd-liste').innerHTML = visibles.length
    ? `<div class="pd-grille">${visibles
        .map((p) => {
          const av = p.avancement || {};
          const tot = av.totalObjectif || 0,
            liv = av.totalLivre || 0;
          const pct = tot ? Math.min(100, Math.round((liv / tot) * 100)) : 0;
          const jours = av.joursRestants != null && av.joursRestants >= 0 ? av.joursRestants : null;
          const produits = (av.objectifs || []).filter((o) => o.objectif || o.livre);
          return `<button type="button" class="pd-carte${av.enRetard && av.reste ? ' retard' : ''}${av.reste === 0 ? ' atteint' : ''}" data-ouvrir="${echapper(p.id)}" aria-label="Ouvrir ${echapper(p.nom)}">
      <div class="pd-carte-tete">${anneau(pct)}
        <div>${p.financeur ? `<div class="pd-sur">${echapper(p.financeur)}</div>` : ''}<h3>${echapper(p.nom)}</h3>
        <div class="pd-periode">${p.debut ? frDate(p.debut) : '…'} → <b>${p.butoir ? frDate(p.butoir) : 'sans date butoir'}</b></div></div></div>
      <div class="pd-chiffres">
        <div><b>${liv}</b><span>distribué${liv > 1 ? 's' : ''}</span></div>
        <div><b>${av.reste != null ? av.reste : Math.max(0, tot - liv)}</b><span>reste</span></div>
        <div><b>${tot || '—'}</b><span>objectif</span></div>
      </div>
      ${
        produits.length
          ? `<div style="display:flex;flex-direction:column;gap:6px">${produits
              .slice(0, 3)
              .map((o) => {
                const b = Math.max(o.objectif || 0, o.livre, 1);
                return `<div class="pd-prod"><span>${echapper(o.produit)}</span><span class="pd-piste"><i style="width:${Math.min(100, (o.livre / b) * 100)}%"></i></span><small>${o.livre}${o.objectif ? `/${o.objectif}` : ''}</small></div>`;
              })
              .join('')}</div>`
          : ''
      }
      <div class="pd-pied">${tagRythme(av)}${jours != null ? `<span class="pd-tag jours">J-${jours}</span>` : ''}</div>
    </button>`;
        })
        .join('')}</div>`
    : `<div class="pk-etat pk-vide"><span data-ill="vide"></span>${liste.length ? 'Aucun projet dans ce filtre.' : 'Aucun projet pour l’instant : créez le premier avec « Nouveau projet ».'}</div>`;
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filtre]');
  if (f) {
    filtre = f.dataset.filtre;
    afficher();
    return;
  }
  const o = e.target.closest('[data-ouvrir]');
  if (o) {
    ouvrirDetail(Number(o.dataset.ouvrir));
    return;
  }
});

async function charger() {
  $('retour-projets').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  try {
    const r = await jsonp({ action: 'projets-structure', code: codeValide });
    if (!r.ok) {
      $('retour-projets').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</div>`;
      return;
    }
    donnees = r;
    $('retour-projets').innerHTML = '';
    afficher();
  } catch (e) {
    $('retour-projets').innerHTML = '<div class="msg msg-erreur">Chargement impossible — réessayez.</div>';
  }
}

/* ── Détail d'un projet ── */
function barre(o, echelle, sous) {
  const base = Math.max(o.objectif || echelle || 0, o.livre, 1);
  return `<div class="pd-obj${sous ? ' sous' : ''}"><div class="pd-obj-l"><b>${echapper(o.produit)}</b><span>${o.livre} distribué${o.livre > 1 ? 's' : ''}${o.objectif ? ` / ${o.objectif}` : ''}${o.objectif && o.livre > o.objectif ? ' · dépassé' : ''}</span></div>
    <div class="pd-piste" role="img" aria-label="${echapper(o.produit)} : ${o.livre} sur ${o.objectif || '—'}"><i style="width:${Math.min(100, (o.livre / base) * 100)}%"></i></div></div>`;
}
function barres(av) {
  const l = av.objectifs || [];
  if (!av.global) return l.map((o) => barre(o)).join('');
  return (
    barre({ produit: 'Total', objectif: av.totalObjectif, livre: av.totalLivre }) +
    l
      .filter((o) => o.objectif || o.livre)
      .map((o) => barre(o, av.totalObjectif, true))
      .join('')
  );
}
function fermerDetail() {
  const v = document.querySelector('.pd-voile');
  if (v) v.remove();
  document.removeEventListener('keydown', escDetail);
}
function escDetail(e) {
  if (e.key === 'Escape' && !document.querySelector('.ap-voile')) fermerDetail();
}
function ouvrirDetail(id) {
  const p = donnees.projets.find((x) => x.id === id);
  if (!p) return;
  fermerDetail();
  const av = p.avancement || { objectifs: [], appareils: [] };
  const auj = isoJour(new Date());
  const jalons = [
    ...(p.jalons || []),
    ...(p.butoir ? [{ date: p.butoir, libelle: 'Date butoir', fin: true }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const v = document.createElement('div');
  v.className = 'pd-voile';
  v.innerHTML = `<div class="pd-detail" role="dialog" aria-modal="true" aria-labelledby="pd-titre">
    <div class="pd-detail-tete"><div><div class="pd-sur">${echapper([p.financeur, `${p.debut ? frDate(p.debut) : '…'} → ${p.butoir ? frDate(p.butoir) : '…'}`].filter(Boolean).join(' · '))}</div><h2 id="pd-titre">${echapper(p.nom)}</h2></div>
      <button type="button" class="ap-fermer" data-fermer-detail aria-label="Fermer">×</button></div>
    <div class="pd-pied">${p.reference ? `<span class="pd-tag">Réf. ${echapper(p.reference)}</span>` : ''}${p.statut === 'archive' ? '<span class="pd-tag">Archivé</span>' : ''}${tagRythme(av)}</div>
    ${p.description ? `<p class="pd-aide">${echapper(p.description)}</p>` : ''}
    <div class="pd-colonnes">
      <section class="pd-bloc"><h3>Avancement</h3>${barres(av) || '<p class="pd-aide">Aucun objectif.</p>'}
        ${av.enRetard && av.rythmeNecessaire ? `<p class="pd-aide">Rythme nécessaire : ~${av.rythmeNecessaire} appareil(s) par semaine jusqu’au ${frDate(p.butoir)} (rythme actuel ~${av.rythmeActuel}).${av.projection ? ` À ce rythme, objectif atteint vers le ${frDate(av.projection)}.` : ''}</p>` : ''}
        ${av.dejaDistribues ? `<p class="pd-aide">Dont <b>${pluriel(av.dejaDistribues, 'appareil distribué', 'appareils distribués')}</b> avant le suivi dans la plateforme.</p>` : ''}
        <h3 style="margin-top:6px">Appareils rattachés (${(av.appareils || []).length})</h3>
        ${
          (av.appareils || []).length
            ? `<div class="pd-table-zone"><table class="pd-table"><thead><tr><th>N° de série</th><th>Produit</th><th>Remis le</th></tr></thead><tbody>${av.appareils.map((a) => `<tr><td><span class="pk-sn">${echapper(a.numeroSerie)}</span></td><td>${echapper(a.produit)}</td><td>${echapper(frDate(a.dateRemise) || '—')}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="pd-aide">Aucun appareil pour l’instant. Dans « Ma flotte », choisissez ce projet sur un appareil au statut « Remis ».</p>'
        }
      </section>
      <section class="pd-bloc"><h3>Points d’étape</h3>
        ${jalons.length ? `<div class="pd-jalons">${jalons.map((j) => `<div class="${j.date < auj ? 'passe' : ''}${j.fin ? ' fin' : ''}"><b>${frDate(j.date)}</b> · ${echapper(j.libelle || 'Point d’étape')}${j.quantite ? ` <span style="opacity:.7">— objectif ${j.quantite}</span>` : ''}</div>`).join('')}</div>` : '<p class="pd-aide">Aucun point d’étape.</p>'}
        <h3 style="margin-top:6px">En chiffres</h3>
        <p class="pd-aide">${pluriel(av.totalLivre || 0, 'appareil distribué', 'appareils distribués')}, ${pluriel(av.totalLivre || 0, 'personne équipée', 'personnes équipées')}${av.joursRestants != null && av.joursRestants >= 0 ? ` · ${pluriel(av.joursRestants, 'jour restant', 'jours restants')}` : ''}.</p>
      </section>
    </div>
    <div class="pd-actions">
      <button type="button" class="btn btn-ghost" data-role="responsable" data-archiver="${echapper(p.id)}" data-etat="${p.statut === 'archive' ? '0' : '1'}">${p.statut === 'archive' ? 'Désarchiver' : 'Archiver'}</button>
      <span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-secondary" data-exporter="${echapper(p.id)}">Exporter (CSV)</button><button type="button" class="btn btn-primary" data-role="responsable" data-modifier="${echapper(p.id)}">Modifier</button></span>
    </div></div>`;
  document.body.appendChild(v);
  if (window.portailIllustrations) window.portailIllustrations(v);
  document.addEventListener('keydown', escDetail);
  v.addEventListener('click', async (e) => {
    if (e.target === v || e.target.closest('[data-fermer-detail]')) {
      fermerDetail();
      return;
    }
    if (e.target.closest('[data-modifier]')) {
      ouvrirAssistant(p);
      return;
    }
    if (e.target.closest('[data-exporter]')) {
      exporterCsv(p);
      return;
    }
    const a = e.target.closest('[data-archiver]');
    if (a) {
      const archiver = a.dataset.etat === '1';
      if (
        archiver &&
        window.confirmerCvdl &&
        !(await confirmerCvdl(
          'Archiver ce projet ?\n\nOn ne pourra plus y rattacher d’appareil ; son historique reste consultable (filtre « Archivés »).',
        ))
      )
        return;
      a.disabled = true;
      const r = await poster({ action: 'projet-structure-archiver', code: codeValide, id: p.id, archive: archiver });
      if (r && r.ok) {
        fermerDetail();
        await charger();
      } else {
        a.disabled = false;
        alert((r && r.erreur) || 'Enregistrement impossible.');
      }
    }
  });
}
function exporterCsv(p) {
  const lignes = [['Projet', 'Financeur', 'Référence', 'N° de série', 'Produit', 'Remis le']];
  ((p.avancement || {}).appareils || []).forEach((a) =>
    lignes.push([p.nom, p.financeur, p.reference, a.numeroSerie, a.produit, frDate(a.dateRemise)]),
  );
  const csv =
    '﻿' + lignes.map((l) => l.map((x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`).join(';')).join('\n');
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  lien.download = `projet-${p.id}.csv`;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 2000);
}

/* ── Création / modification : assistant en étapes (assistant-portail.js) ── */
const ETAPES = [
  {
    cle: 'projet',
    titre: 'Projet',
    ill: 'distribution',
    h: 'Quel projet ?',
    p: 'Son nom et, si besoin, le financeur et la référence de la convention.',
  },
  {
    cle: 'periode',
    titre: 'Période',
    ill: 'calendrier',
    h: 'Sur quelle période ?',
    p: 'La date butoir sert à calculer le rythme à tenir.',
  },
  {
    cle: 'objectifs',
    titre: 'Objectifs',
    ill: 'stats',
    h: 'Combien d’appareils à distribuer ?',
    p: 'Un objectif global, et/ou une quantité par produit. Seuls les produits listés pourront être rattachés au projet (sans liste : tous).',
  },
  {
    cle: 'jalons',
    titre: 'Points d’étape',
    ill: 'calendrier',
    h: 'Des points d’étape ?',
    p: 'Facultatif : bilans intermédiaires, rendus au financeur…',
  },
  {
    cle: 'recap',
    titre: 'Récapitulatif',
    ill: 'attestations',
    h: 'Tout est bon ?',
    p: 'Relisez avant d’enregistrer — chaque bloc se modifie d’un clic.',
  },
];
function valeurs(p) {
  return {
    id: p ? p.id : '',
    nom: p ? p.nom : '',
    financeur: p ? p.financeur : '',
    reference: p ? p.reference : '',
    description: p ? p.description : '',
    debut: p ? p.debut : isoJour(new Date()),
    butoir: p ? p.butoir : '',
    objectifGlobal: p && p.objectifGlobal ? String(p.objectifGlobal) : '',
    objectifs: p
      ? p.objectifs.map((o) => ({ produit: o.produit, quantite: o.quantite ? String(o.quantite) : '' }))
      : [{ produit: '', quantite: '' }],
    jalons: p
      ? p.jalons.map((j) => ({
          date: j.date,
          libelle: j.libelle || '',
          quantite: j.quantite ? String(j.quantite) : '',
        }))
      : [],
    deja: p && p.deja ? p.deja.map((d) => ({ produit: d.produit || '', quantite: String(d.quantite) })) : [],
  };
}
function corps(cle, v) {
  const e = echapper;
  if (cle === 'projet')
    return `<div class="ap-grille">
    <div class="field ap-large"><label for="pj-nom">Nom du projet *</label><input class="input" id="pj-nom" data-ap="nom" value="${e(v.nom)}" maxlength="120" placeholder="Ex : Rentrée numérique des étudiants" autocomplete="off"></div>
    <div class="field"><label for="pj-fin">Financeur / partenaire <em>(facultatif)</em></label><input class="input" id="pj-fin" data-ap="financeur" value="${e(v.financeur)}" maxlength="120" placeholder="Ex : Région, fondation…"></div>
    <div class="field"><label for="pj-ref">Référence <em>(facultatif)</em></label><input class="input" id="pj-ref" data-ap="reference" value="${e(v.reference)}" maxlength="80" placeholder="Ex : convention 2026-14"></div>
    <div class="field ap-large"><label for="pj-desc">Description <em>(facultatif)</em></label><textarea class="input" id="pj-desc" data-ap="description" rows="3" maxlength="500" placeholder="Public visé, lieu, ce qui est attendu…">${e(v.description)}</textarea></div>
  </div>`;
  if (cle === 'periode')
    return `<div class="ap-grille">
    <div class="field"><label for="pj-debut">Début</label><input class="input" type="date" id="pj-debut" data-ap="debut" value="${e(v.debut)}"></div>
    <div class="field"><label for="pj-butoir">Date butoir</label><input class="input" type="date" id="pj-butoir" data-ap="butoir" value="${e(v.butoir)}"></div>
    <p class="ap-aide ap-large">Sans date butoir, le projet reste « en cours » et aucun rythme n’est calculé.</p>
  </div>`;
  if (cle === 'objectifs') {
    const options = (sel) =>
      `<option value="">Choisir un produit…</option>${donnees.produits.map((n) => `<option ${sel === n ? 'selected' : ''}>${e(n)}</option>`).join('')}${sel && !donnees.produits.includes(sel) ? `<option selected>${e(sel)}</option>` : ''}`;
    return `
    <section class="ap-section"><h4>Objectif global <em>— tous produits confondus, facultatif</em></h4>
      <div class="field" style="max-width:220px"><input class="input" type="number" min="1" data-ap="objectifGlobal" value="${e(v.objectifGlobal)}" placeholder="Ex : 40" aria-label="Objectif global" inputmode="numeric"></div></section>
    <section class="ap-section"><h4>Par produit</h4>
      <div class="ap-lignes">${v.objectifs
        .map(
          (
            o,
            i,
          ) => `<div class="ap-ligne"><select class="input" data-obj="produit" data-i="${i}" aria-label="Produit">${options(o.produit)}</select>
        <input class="input" type="number" min="1" data-obj="quantite" data-i="${i}" value="${e(o.quantite)}" placeholder="Quantité" aria-label="Quantité" inputmode="numeric">
        <button type="button" class="ap-suppr" data-obj-suppr="${i}" aria-label="Retirer ce produit">×</button></div>`,
        )
        .join('')}</div>
      <button type="button" class="btn btn-secondary ap-ajout" data-obj-ajout>+ Ajouter un produit</button>
      <p class="ap-aide">Avec un objectif global, la quantité par produit est facultative : une ligne sans quantité limite simplement les produits comptés.</p></section>
    <section class="ap-section"><h4>Déjà distribués avant le suivi <em>— facultatif</em></h4>
      <p class="ap-aide">Projet déjà commencé ? Indiquez les appareils remis avant de le suivre ici : ils comptent dans l’avancement dès la date de début.</p>
      <div class="ap-lignes">${v.deja
        .map(
          (
            d,
            i,
          ) => `<div class="ap-ligne"><select class="input" data-deja="produit" data-i="${i}" aria-label="Produit"><option value="">Sans produit précisé</option>${donnees.produits.map((n) => `<option ${d.produit === n ? 'selected' : ''}>${e(n)}</option>`).join('')}</select>
        <input class="input" type="number" min="1" data-deja="quantite" data-i="${i}" value="${e(d.quantite)}" placeholder="Nombre" aria-label="Nombre déjà distribué" inputmode="numeric">
        <button type="button" class="ap-suppr" data-deja-suppr="${i}" aria-label="Retirer">×</button></div>`,
        )
        .join('')}</div>
      <button type="button" class="btn btn-secondary ap-ajout" data-deja-ajout>+ Ajouter des appareils déjà distribués</button></section>`;
  }
  if (cle === 'jalons')
    return `<div class="ap-lignes">${
      v.jalons
        .map(
          (
            j,
            i,
          ) => `<div class="ap-ligne jalon"><input class="input" type="date" data-jal="date" data-i="${i}" value="${e(j.date)}" aria-label="Date">
      <input class="input" data-jal="libelle" data-i="${i}" value="${e(j.libelle)}" maxlength="80" placeholder="Ex : Bilan intermédiaire" aria-label="Libellé">
      <input class="input" type="number" min="1" data-jal="quantite" data-i="${i}" value="${e(j.quantite)}" placeholder="Objectif" aria-label="Objectif à cette date" inputmode="numeric">
      <button type="button" class="ap-suppr" data-jal-suppr="${i}" aria-label="Retirer ce point d’étape">×</button></div>`,
        )
        .join('') || '<p class="ap-aide">Aucun point d’étape pour l’instant.</p>'
    }</div>
    <button type="button" class="btn btn-secondary ap-ajout" data-jal-ajout>+ Ajouter un point d’étape</button>`;
  const obj = v.objectifs.filter((o) => o.produit);
  const bloc = (
    i,
    titre,
    lignes,
  ) => `<section class="ap-recap-bloc"><div class="ap-recap-tete"><h4>${titre}</h4><button type="button" class="ap-lien" data-ap-aller="${i}">Modifier</button></div>
    ${lignes.map(([k, val]) => `<div class="ap-recap-l"><span>${k}</span><b>${val ? e(val) : '<em>—</em>'}</b></div>`).join('')}</section>`;
  return `<div class="ap-recap">
    ${bloc(0, 'Projet', [
      ['Nom', v.nom],
      ['Financeur', v.financeur],
      ['Référence', v.reference],
    ])}
    ${bloc(1, 'Période', [
      ['Début', frDate(v.debut)],
      ['Date butoir', v.butoir ? frDate(v.butoir) : 'Aucune'],
    ])}
    ${bloc(2, 'Objectifs', [
      ['Global', v.objectifGlobal],
      ...(obj.length ? obj.map((o) => [o.produit, o.quantite || 'compté']) : [['Produits', 'Tous']]),
      ...v.deja
        .filter((d) => parseInt(d.quantite, 10) > 0)
        .map((d) => ['Déjà distribués', `${d.quantite} × ${d.produit || 'sans produit précisé'}`]),
    ])}
    ${bloc(3, 'Points d’étape', v.jalons.filter((j) => j.date).length ? v.jalons.filter((j) => j.date).map((j) => [frDate(j.date), [j.libelle, j.quantite ? `objectif ${j.quantite}` : ''].filter(Boolean).join(' · ') || 'Point d’étape']) : [['—', 'Aucun']])}
  </div>`;
}
function projetEnvoye(v) {
  const global = parseInt(v.objectifGlobal, 10) || 0;
  return {
    id: v.id,
    nom: v.nom.trim(),
    financeur: v.financeur.trim(),
    reference: v.reference.trim(),
    description: v.description.trim(),
    debut: v.debut,
    butoir: v.butoir,
    objectifGlobal: global,
    objectifs: v.objectifs
      .filter((o) => o.produit)
      .map((o) => ({ produit: o.produit, quantite: parseInt(o.quantite, 10) || 0 }))
      .filter((o) => o.quantite > 0 || global > 0),
    jalons: v.jalons
      .filter((j) => j.date)
      .map((j) => ({ date: j.date, libelle: j.libelle.trim(), quantite: parseInt(j.quantite, 10) || 0 })),
    deja: v.deja
      .map((d) => ({ produit: d.produit, quantite: parseInt(d.quantite, 10) || 0 }))
      .filter((d) => d.quantite > 0),
  };
}
function verifier(cle, v) {
  if (cle === 'projet' && !v.nom.trim()) return 'Donnez un nom au projet.';
  if (cle === 'periode' && v.debut && v.butoir && v.butoir < v.debut)
    return 'La date butoir est avant la date de début.';
  if (cle === 'objectifs') {
    const p = projetEnvoye(v);
    if (!p.objectifGlobal && !p.objectifs.some((o) => o.quantite > 0))
      return 'Fixez un objectif : un total d’appareils, ou une quantité pour au moins un produit.';
    const noms = v.objectifs.filter((o) => o.produit).map((o) => o.produit);
    if (new Set(noms).size !== noms.length) return 'Un produit apparaît deux fois.';
  }
  return '';
}
function ouvrirAssistant(p) {
  AssistantPortail.ouvrir({
    surtitre: p ? 'Modifier le projet' : 'Nouveau projet de distribution',
    titre: (v) => v.nom.trim() || 'Nouveau projet',
    etapes: ETAPES,
    v: valeurs(p),
    modification: !!p,
    libelleFin: p ? 'Enregistrer' : 'Créer le projet',
    corps,
    verifier,
    saisie: (el, v) => {
      if (el.dataset.obj) v.objectifs[+el.dataset.i][el.dataset.obj] = el.value;
      if (el.dataset.jal) v.jalons[+el.dataset.i][el.dataset.jal] = el.value;
      if (el.dataset.deja) v.deja[+el.dataset.i][el.dataset.deja] = el.value;
    },
    clic: (e, v, rendre) => {
      if (e.target.closest('[data-obj-ajout]')) {
        v.objectifs.push({ produit: '', quantite: '' });
        rendre();
        return;
      }
      if (e.target.closest('[data-jal-ajout]')) {
        v.jalons.push({ date: '', libelle: '', quantite: '' });
        rendre();
        return;
      }
      if (e.target.closest('[data-deja-ajout]')) {
        v.deja.push({ produit: '', quantite: '' });
        rendre();
        return;
      }
      const sd = e.target.closest('[data-deja-suppr]');
      if (sd) {
        v.deja.splice(+sd.dataset.dejaSuppr, 1);
        rendre();
        return;
      }
      const so = e.target.closest('[data-obj-suppr]');
      if (so) {
        v.objectifs.splice(+so.dataset.objSuppr, 1);
        rendre();
        return;
      }
      const sj = e.target.closest('[data-jal-suppr]');
      if (sj) {
        v.jalons.splice(+sj.dataset.jalSuppr, 1);
        rendre();
      }
    },
    terminer: async (v) => {
      const r = await poster({ action: 'projet-structure-enregistrer', code: codeValide, projet: projetEnvoye(v) });
      if (r && r.ok) {
        fermerDetail();
        await charger();
        if (!p) filtre = phase({ debut: v.debut, butoir: v.butoir });
        afficher();
        if (r.id) ouvrirDetail(r.id);
      }
      return r;
    },
  });
}
$('btn-nouveau-projet').addEventListener('click', () => ouvrirAssistant(null));

/* ── Identification (code structure, Interne uniquement) ── */
async function verifierCode() {
  const code = $('id-code').value.trim();
  if (!code) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Saisissez votre code structure.</div>';
    return;
  }
  $('btn-verifier-code').disabled = true;
  $('btn-verifier-code').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  $('retour-id-code').innerHTML = '';
  try {
    const r = await jsonp({ action: 'check', code });
    if (!r.ok)
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    else if (!r.interne)
      $('retour-id-code').innerHTML =
        '<div class="msg msg-erreur">Les projets de distribution sont réservés aux structures Interne.</div>';
    else {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-projets').hidden = false;
      $('btn-deconnexion').hidden = false;
      await charger();
    }
  } catch (e) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Réessayez.</div>';
  }
  $('btn-verifier-code').disabled = false;
  $('btn-verifier-code').textContent = 'Continuer';
}
$('btn-verifier-code').addEventListener('click', verifierCode);
$('id-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});
$('btn-deconnexion').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});
try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    $('id-code').value = codeMemorise;
    verifierCode().finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = $('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}
