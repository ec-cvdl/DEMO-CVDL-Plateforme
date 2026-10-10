/* Appareils déjà présents dans une structure avant la plateforme : fenêtre partagée par la fiche
   structure de l'admin (admin/26-impact-structure360.js) et l'espace Logistique (support.js).
   Saisie à la main ou CSV → aperçu (chaque numéro cherché dans toutes les flottes et commandes)
   → ajout des seuls numéros inconnus. Serveur : flotte-importer-existants (regles/importAppareils).
   ImportAppareils.ouvrir({ poster(action, donnees) → Promise, structureId?, nomStructure? }) :
   sans structure, une liste déroulante est proposée (flotte-structures-import). */
window.ImportAppareils = (function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const STATUTS = ['En stock', 'Remis', 'Vendu', 'SAV', 'D3E'];
  const COLONNES = 'numéro de série;produit;marque;modèle;statut;date d’arrivée;prénom;nom';
  const LIBELLES = { ajoute: 'p1', deja: 'p2', ailleurs: 'p3', doublon: 'p2', vide: 'p2' };
  let E = null; // état de la fenêtre ouverte

  const ligneVide = () => ({ numeroSerie: '', produit: '', statut: 'En stock' });

  function ouvrir(options) {
    E = {
      poster: options.poster,
      structureId: options.structureId || '',
      nomStructure: options.nomStructure || '',
      structures: null,
      onglet: 'main',
      lignes: [ligneVide(), ligneVide(), ligneVide()],
      csv: '',
      fichier: '',
      apercu: null,
      fait: false,
      occupe: false,
      erreur: '',
    };
    let voile = document.getElementById('ia-voile');
    if (!voile) {
      voile = document.createElement('div');
      voile.id = 'ia-voile';
      voile.className = 'ia-voile';
      document.body.appendChild(voile);
      voile.addEventListener('click', clic);
      voile.addEventListener('input', saisie);
      voile.addEventListener('change', changement);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && E && voile.classList.contains('visible')) fermer();
      });
    }
    voile.classList.add('visible');
    if (!E.structureId)
      E.poster('flotte-structures-import', {}).then((r) => {
        E.structures = r.ok ? r.structures : [];
        rendre();
      });
    rendre();
    voile.querySelector('.ia')?.focus();
  }
  function fermer() {
    document.getElementById('ia-voile').classList.remove('visible');
    E = null;
  }

  function lignesEnvoyees() {
    return E.onglet === 'main' ? { lignes: E.lignes.filter((l) => l.numeroSerie.trim()) } : { csv: E.csv };
  }
  async function envoyer(confirmer) {
    if (!E.structureId) return ((E.erreur = 'Choisissez la structure.'), rendre());
    const donnees = lignesEnvoyees();
    if (donnees.lignes ? !donnees.lignes.length : !donnees.csv.trim())
      return ((E.erreur = 'Ajoutez au moins un numéro de série.'), rendre());
    E.occupe = true;
    E.erreur = '';
    rendre();
    const r = await E.poster(
      'flotte-importer-existants',
      Object.assign({ structureId: E.structureId, confirmer: !!confirmer }, donnees),
    ).catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
    if (!E) return;
    E.occupe = false;
    if (r.ok) {
      E.apercu = r;
      E.fait = !!confirmer;
      E.nomStructure = E.nomStructure || r.structure;
    } else E.erreur = r.erreur || 'Import impossible.';
    rendre();
  }
  function telecharger(contenu, nom) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' }));
    a.download = nom;
    a.click();
  }
  const cellule = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

  function clic(e) {
    if (!E) return;
    if (e.target.id === 'ia-voile' || e.target.closest('[data-ia-fermer]')) return fermer();
    const o = e.target.closest('[data-ia-onglet]');
    if (o) {
      E.onglet = o.dataset.iaOnglet;
      E.apercu = null;
      E.erreur = '';
      return rendre();
    }
    if (e.target.closest('[data-ia-ligne-plus]')) {
      E.lignes.push(ligneVide());
      rendre();
      const champs = document.querySelectorAll('[data-ia-champ="numeroSerie"]');
      return champs[champs.length - 1]?.focus();
    }
    const moins = e.target.closest('[data-ia-ligne-moins]');
    if (moins) {
      E.lignes.splice(Number(moins.dataset.iaLigneMoins), 1);
      if (!E.lignes.length) E.lignes.push(ligneVide());
      E.apercu = null;
      return rendre();
    }
    if (e.target.closest('[data-ia-verifier]')) return envoyer(false);
    if (e.target.closest('[data-ia-confirmer]')) return envoyer(true);
    if (e.target.closest('[data-ia-modele]'))
      return telecharger(
        COLONNES + '\nPF1M2NVQ;PC portable 14";Lenovo;ThinkPad T480;En stock;15/03/2025;;\n',
        'modele-appareils.csv',
      );
    if (e.target.closest('[data-ia-bilan]')) {
      const lignes = E.apercu.lignes.map((l) =>
        [l.numeroSerie, l.produit, l.marque, l.modele, l.statut, l.detail].map(cellule).join(';'),
      );
      telecharger(
        ['numéro de série;produit;marque;modèle;statut;résultat', ...lignes].join('\n'),
        `bilan-import-${(E.nomStructure || 'structure').replace(/[^\w]+/g, '-')}.csv`,
      );
    }
  }
  function saisie(e) {
    if (!E) return;
    const c = e.target.closest('[data-ia-champ]');
    if (c) {
      E.lignes[Number(c.dataset.iaIndex)][c.dataset.iaChamp] = c.value;
      if (E.apercu) {
        E.apercu = null;
        rendreResultat();
      }
    }
  }
  function changement(e) {
    if (!E) return;
    if (e.target.id === 'ia-structure') {
      E.structureId = e.target.value;
      E.nomStructure = e.target.selectedOptions[0]?.textContent || '';
      E.apercu = null;
      return rendre();
    }
    if (e.target.id === 'ia-fichier' && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 2_000_000) return ((E.erreur = 'Fichier trop lourd (2 Mo au plus).'), rendre());
      const lecteur = new FileReader();
      lecteur.onload = () => {
        E.csv = String(lecteur.result || '');
        E.fichier = f.name;
        E.apercu = null;
        envoyer(false);
      };
      lecteur.readAsText(f, 'utf-8');
    }
  }

  function zoneSaisie() {
    if (E.onglet === 'csv')
      return `<label class="ia-drop"><span data-ill="tableur" class="ill"></span><span><b>${E.fichier ? `${esc(E.fichier)}${E.apercu ? ` · ${E.apercu.lignes.length} appareil${E.apercu.lignes.length > 1 ? 's' : ''} lu${E.apercu.lignes.length > 1 ? 's' : ''}` : ''} — changer de fichier` : 'Choisir un fichier CSV'}</b>Colonnes reconnues : ${COLONNES.split(
        ';',
      )
        .map((c) => `<code>${esc(c)}</code>`)
        .join(
          ' ',
        )} — seul le numéro est obligatoire. <button type="button" class="ia-lien" data-ia-modele>Modèle CSV</button></span><input type="file" id="ia-fichier" accept=".csv,text/csv,text/plain" class="ia-cache"></label>`;
    return `<div class="ia-saisie"><div class="ia-saisie-t"><span>N° de série</span><span>Produit (facultatif)</span><span>Statut</span><span></span></div>${E.lignes
      .map(
        (l, i) => `<div class="ia-saisie-l">
        <input class="input" data-ia-champ="numeroSerie" data-ia-index="${i}" value="${esc(l.numeroSerie)}" aria-label="Numéro de série ${i + 1}" autocomplete="off" spellcheck="false">
        <input class="input" data-ia-champ="produit" data-ia-index="${i}" value="${esc(l.produit)}" aria-label="Produit ${i + 1}" placeholder="PC portable, tablette…">
        <select class="input" data-ia-champ="statut" data-ia-index="${i}" aria-label="Statut ${i + 1}">${STATUTS.map((s) => `<option${s === l.statut ? ' selected' : ''}>${s}</option>`).join('')}</select>
        <button type="button" class="ia-moins" data-ia-ligne-moins="${i}" aria-label="Retirer la ligne ${i + 1}">×</button></div>`,
      )
      .join('')}<button type="button" class="ia-lien" data-ia-ligne-plus>＋ Ajouter une ligne</button></div>`;
  }
  function htmlResultat() {
    if (!E.apercu) return '';
    const b = E.apercu.bilan;
    const ignores = b.doublon + b.vide;
    return `<div class="ia-res">
      <div class="ia-k k1"><b>${b.ajoute}</b><span>${E.fait ? 'ajoutés à la flotte' : 'à ajouter à la flotte'}</span></div>
      <div class="ia-k k2"><b>${b.deja}</b><span>déjà dans la flotte : rien touché</span></div>
      <div class="ia-k k3"><b>${b.ailleurs}</b><span>connus ailleurs : non ajoutés</span></div>
    </div>
    ${ignores ? `<p class="ia-note">${ignores} ligne${ignores > 1 ? 's' : ''} ignorée${ignores > 1 ? 's' : ''} (numéro manquant ou répété).</p>` : ''}
    <div class="ia-table"><table><thead><tr><th>N° de série</th><th>Produit</th><th>Marque / modèle</th><th>Résultat</th></tr></thead><tbody>${E.apercu.lignes
      .map(
        (l) =>
          `<tr><td class="sn">${esc(l.numeroSerie || '—')}</td><td>${esc(l.produit || '—')}</td><td>${esc([l.marque, l.modele].filter(Boolean).join(' ') || '—')}</td><td><span class="ia-pill ${LIBELLES[l.resultat]}">${esc(l.resultat === 'ajoute' && !E.fait ? `À ajouter (${l.statut})` : l.detail)}</span></td></tr>`,
      )
      .join('')}</tbody></table></div>`;
  }
  function rendreResultat() {
    const z = document.getElementById('ia-resultat');
    if (z) z.innerHTML = htmlResultat();
    const p = document.getElementById('ia-pied');
    if (p) p.innerHTML = htmlPied();
  }
  function htmlPied() {
    const n = E.apercu ? E.apercu.bilan.ajoute : 0;
    if (E.fait)
      return `<span class="ia-note">Marque et modèle complétés depuis tec.tech quand l’appareil y est connu. Chaque ajout est noté dans le commentaire de l’appareil.</span><span class="ia-btns"><button type="button" class="btn btn-secondary" data-ia-bilan>Télécharger le bilan</button><button type="button" class="btn btn-primary" data-ia-fermer>Fermer</button></span>`;
    return `<span class="ia-note">Rien n’est enregistré avant « Ajouter ». Un numéro déjà connu n’est jamais modifié.</span><span class="ia-btns"><button type="button" class="btn btn-secondary" data-ia-fermer>Annuler</button>${
      E.apercu
        ? `<button type="button" class="btn btn-primary" data-ia-confirmer ${n && !E.occupe ? '' : 'disabled'}>${n ? `Ajouter ${n} appareil${n > 1 ? 's' : ''}` : 'Rien à ajouter'}</button>`
        : `<button type="button" class="btn btn-primary" data-ia-verifier ${E.occupe ? 'disabled' : ''}>${E.occupe ? 'Vérification…' : 'Vérifier'}</button>`
    }</span>`;
  }
  function rendre() {
    const voile = document.getElementById('ia-voile');
    if (!voile || !E) return;
    const choix = !E.structureId || E.structures;
    voile.innerHTML = `<div class="ia" role="dialog" aria-modal="true" aria-labelledby="ia-titre" tabindex="-1">
      <div class="ia-tete"><span data-ill="flotte" class="ill"></span><div><h3 id="ia-titre">Appareils déjà sur place${E.nomStructure && !E.structures ? ` — ${esc(E.nomStructure)}` : ''}</h3>
      <p>Le matériel arrivé avant la plateforme. Chaque numéro de série est cherché partout (flottes, commandes) : un numéro déjà connu n’est jamais modifié.</p></div>
      <button type="button" class="ia-x" data-ia-fermer aria-label="Fermer">×</button></div>
      ${
        choix
          ? `<label class="ia-structure">Structure <select class="input" id="ia-structure"><option value="">${E.structures ? 'Choisir…' : 'Chargement…'}</option>${(E.structures || []).map((s) => `<option value="${s.id}"${String(s.id) === String(E.structureId) ? ' selected' : ''}>${esc(s.nom)}</option>`).join('')}</select></label>`
          : ''
      }
      ${
        E.fait
          ? ''
          : `<div class="ia-onglets" role="tablist"><button type="button" role="tab" aria-selected="${E.onglet === 'main'}" data-ia-onglet="main">Saisir à la main</button><button type="button" role="tab" aria-selected="${E.onglet === 'csv'}" data-ia-onglet="csv">Importer un CSV</button></div>
      ${zoneSaisie()}`
      }
      ${E.erreur ? `<div class="ia-err" role="alert">${esc(E.erreur)}</div>` : ''}
      <div id="ia-resultat" aria-live="polite">${htmlResultat()}</div>
      <div class="ia-pied" id="ia-pied">${htmlPied()}</div>
    </div>`;
    if (window.portailIllustrations) window.portailIllustrations(voile);
  }

  return { ouvrir };
})();
