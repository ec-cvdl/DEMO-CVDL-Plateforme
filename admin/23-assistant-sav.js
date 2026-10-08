/* Admin CVDL — assistant nouveau SAV. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ════════════════════════════════════════════════════════════════════════════════════
   Nouveau SAV (saisi par l'équipe) — même assistant en étapes que la nouvelle commande, et
   mêmes étapes que le formulaire SAV du portail : Demandeur → Problème (cartes symptôme) →
   Appareil → Précisions → Récapitulatif.
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_SAV = [
  {
    cle: 'demandeur',
    titre: 'Demandeur',
    ill: 'structures',
    h: 'Qui fait la demande ?',
    p: 'La structure concernée (ou une personne sans structure), et comment la joindre.',
  },
  {
    cle: 'probleme',
    titre: 'Problème',
    ill: 'panne',
    h: 'Quel est le problème ?',
    p: 'Les mêmes cartes que le formulaire SAV du portail.',
  },
  {
    cle: 'appareil',
    titre: 'Appareil',
    ill: 'passeport',
    h: 'Quel appareil ?',
    p: 'Le numéro de série relie le dossier à sa commande d’origine et à son passeport.',
  },
  {
    cle: 'precisions',
    titre: 'Précisions',
    ill: 'aide',
    h: 'Des précisions ?',
    p: 'Commentaire, photo ou vidéo : tout ce qui aide au diagnostic. Facultatif.',
  },
  {
    cle: 'recap',
    titre: 'Récapitulatif',
    ill: 'attestations',
    h: 'Tout est bon ?',
    p: 'Relisez avant de créer — chaque bloc se modifie d’un clic.',
  },
];
function valeursInitialesSav() {
  return {
    code: '',
    sansStructure: false,
    recherche: '',
    nom: '',
    nomBeneficiaire: '',
    responsableSav: '',
    email: '',
    telephone: '',
    symptome: '',
    symptomeAutre: '',
    numeroSerie: '',
    marque: '',
    modele: '',
    dateAchat: '',
    referenceFacture: '',
    commentaire: '',
    lienVideo: '',
    photo: null,
  };
}
function chargerSymptomesSav() {
  if (state.symptomesSav || state.symptomesSavEnCours) return;
  state.symptomesSavEnCours = true;
  jsonp({ action: 'sav-symptomes' })
    .then((r) => {
      state.symptomesSav = r.ok ? r.symptomes : [];
    })
    .catch(() => {
      state.symptomesSav = [];
    })
    .finally(() => {
      state.symptomesSavEnCours = false;
      if (state.modal && state.modal.kind === 'creer-sav') render();
    });
}
function numerosSerieStructureSav(code) {
  if (!code) return [];
  const liste = [];
  (state.commandes || [])
    .filter((c) => c.code === code && c.statutCommande === 'Livrée')
    .forEach((c) =>
      String(c.numerosSerie || '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((sn) => liste.push({ sn, ref: c.reference, date: c.dateLivraison || c.date })),
    );
  return liste;
}
function vueCreerSav() {
  const m = state.modal;
  if (!m.v) m.v = valeursInitialesSav();
  if (m.etape == null) m.etape = 0;
  if (m.vues == null) m.vues = 0;
  chargerSymptomesSav();
  const v = m.v,
    s = state.structures.find((x) => x.code === v.code);
  const et = ETAPES_SAV[m.etape];
  const derniere = m.etape === ETAPES_SAV.length - 1;
  const frise = ETAPES_SAV.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-ns-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = {
    demandeur: etapeNsDemandeur,
    probleme: etapeNsProbleme,
    appareil: etapeNsAppareil,
    precisions: etapeNsPrecisions,
    recap: etapeNsRecap,
  }[et.cle](v, s);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw ncw" role="dialog" aria-modal="true" aria-labelledby="nsw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">Nouveau SAV · étape ${m.etape + 1} sur ${ETAPES_SAV.length}</div>
            <h2 class="csw-titre" id="nsw-titre">${s ? echapper(s.nom) : v.nom ? echapper(v.nom) : 'Nouveau SAV'}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <ol class="csw-frise fc2-frise">${frise}</ol>
        <div class="csw-corps">
          <div class="csw-intro"><span data-ill="${et.ill}" class="ill xl"></span><div><h3>${echapper(et.h)}</h3><p>${echapper(et.p)}</p></div></div>
          ${corps}
        </div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions csw-pied">
          <span style="flex:1"></span>
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-ns-precedent>← Précédent</button>' : ''}
          ${!derniere ? '<button type="button" class="btn btn-primary" data-ns-suivant>Suivant →</button>' : '<button type="button" class="btn btn-primary" id="ns-enregistrer">Créer le SAV</button>'}
        </div>
      </div>
    </div>`;
}
function etapeNsDemandeur(v, s) {
  const liste = state.structures.slice().sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
  const q = String(v.recherche || '')
    .trim()
    .toLowerCase();
  const texte = (x) => (x.nom + ' ' + x.code + ' ' + typeStructure(x) + ' ' + (x.region || '')).toLowerCase();
  return `
    <section class="csw-section">
      <h4>Structure</h4>
      <label class="csw-option${v.sansStructure ? ' choisi' : ''}" style="padding:12px 14px"><span class="rp-switch"><input type="checkbox" data-ns="sansStructure" ${v.sansStructure ? 'checked' : ''}><span class="rp-switch-piste"></span></span><span class="csw-option-txt"><b>Sans structure</b><small>Une personne qui s’adresse directement à Emmaüs Connect.</small></span></label>
      ${
        v.sansStructure
          ? ''
          : `
      <input class="input" id="ns-recherche" type="search" placeholder="Rechercher une structure (nom, code, type, région)…" autocomplete="off" value="${echapper(v.recherche || '')}">
      <div class="ncw-structures ncw-structures-court" role="radiogroup" aria-label="Structure">
        ${liste
          .map(
            (x) => `
        <label class="csw-moyen ncw-structure${v.code === x.code ? ' choisi' : ''}" data-texte="${echapper(texte(x))}" ${q && !texte(x).includes(q) ? 'hidden' : ''}>
          <input type="radio" name="ns-structure" value="${echapper(x.code)}" ${v.code === x.code ? 'checked' : ''}>
          <span class="csw-type-ic" aria-hidden="true">${icon('building', 18)}</span>
          <span><b>${echapper(x.nom)}</b><small>${echapper(typeStructure(x))}${x.region ? ' · ' + echapper(x.region) : ''}</small></span>
          <span class="coche-choix-admin" aria-hidden="true">✓</span>
        </label>`,
          )
          .join('')}
      </div>`
      }
    </section>
    <section class="csw-section">
      <h4>Contact</h4>
      <div class="csw-grille">
        <div class="field"><label for="ns-nom">${v.sansStructure ? 'Nom de la personne *' : 'Nom affiché (structure) *'}</label><input class="input" id="ns-nom" data-ns="nom" value="${echapper(v.nom)}" placeholder="${v.sansStructure ? 'Prénom NOM' : echapper((s && s.nom) || '')}"></div>
        ${v.sansStructure ? '' : `<div class="field"><label for="ns-beneficiaire">Personne accompagnée <em>(facultatif)</em></label><input class="input" id="ns-beneficiaire" data-ns="nomBeneficiaire" value="${echapper(v.nomBeneficiaire)}" placeholder="Prénom NOM"></div>`}
        ${v.sansStructure ? '' : `<div class="field"><label for="ns-responsable">Responsable du SAV <em>(facultatif)</em></label><input class="input" id="ns-responsable" data-ns="responsableSav" value="${echapper(v.responsableSav)}" placeholder="${echapper((s && s.responsable) || 'Prénom NOM')}"></div>`}
        <div class="field"><label for="ns-email">E-mail *</label><input class="input" id="ns-email" type="email" data-ns="email" value="${echapper(v.email)}"></div>
        <div class="field"><label for="ns-telephone">Téléphone <em>(facultatif)</em></label><input class="input" id="ns-telephone" data-ns="telephone" value="${echapper(v.telephone)}"></div>
      </div>
    </section>`;
}
function etapeNsProbleme(v) {
  if (!state.symptomesSav)
    return '<p class="csw-aide"><span class="spinner-inline"></span>Chargement des symptômes…</p>';
  const cartes = state.symptomesSav
    .map((sy) => {
      const f = familleCouleurSymptomeAdmin(sy);
      const cle = window.cleSymptomeCvdl ? window.cleSymptomeCvdl(sy) : 'generique_sav';
      return `
    <label class="nsw-sym${v.symptome === sy ? ' choisi' : ''}" style="--c-bg:${f.bg};--c-fg:${f.fg}">
      <input type="radio" name="ns-symptome" value="${echapper(sy)}" ${v.symptome === sy ? 'checked' : ''}>
      <span class="rpd-sym-ill">${window.illustrationCvdl ? window.illustrationCvdl('sym-' + cle, 52) : icon('alert', 26)}</span>
      <span>${echapper(sy)}</span>
      <span class="coche-choix-admin" aria-hidden="true">✓</span>
    </label>`;
    })
    .join('');
  return `
    <div class="nsw-syms" role="radiogroup" aria-label="Symptôme">${cartes}
      <label class="nsw-sym${v.symptome === '__autre' ? ' choisi' : ''}" style="--c-bg:var(--th-bg-eef2f5ff, #EEF2F5);--c-fg:var(--th-tx-002743ff, #002743)">
        <input type="radio" name="ns-symptome" value="__autre" ${v.symptome === '__autre' ? 'checked' : ''}>
        <span class="rpd-sym-ill">${window.illustrationCvdl ? window.illustrationCvdl('sym-generique_sav', 52) : icon('wrench', 26)}</span>
        <span>Autre problème</span>
        <span class="coche-choix-admin" aria-hidden="true">✓</span>
      </label>
    </div>
    ${v.symptome === '__autre' ? `<div class="field" style="margin:0"><label for="ns-symptome-autre">Décrire le problème *</label><input class="input" id="ns-symptome-autre" data-ns="symptomeAutre" value="${echapper(v.symptomeAutre)}"></div>` : ''}`;
}
function etapeNsAppareil(v, s) {
  const suggestions = numerosSerieStructureSav(v.code);
  const cmd = v.numeroSerie
    ? (state.commandes || []).find((c) =>
        String(c.numerosSerie || '')
          .split('\n')
          .map((x) => x.trim().toLowerCase())
          .includes(v.numeroSerie.trim().toLowerCase()),
      )
    : null;
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label for="ns-numero-serie">Numéro de série <em>(recommandé)</em></label>
        <input class="input" id="ns-numero-serie" data-ns="numeroSerie" value="${echapper(v.numeroSerie)}" autocomplete="off" spellcheck="false" ${suggestions.length ? 'list="ns-sn-liste"' : ''} placeholder="${suggestions.length ? 'Saisir ou choisir parmi les appareils livrés à la structure' : 'Ex : PF3XK2A1'}">
        ${suggestions.length ? `<datalist id="ns-sn-liste">${suggestions.map((x) => `<option value="${echapper(x.sn)}">${echapper(x.ref)}</option>`).join('')}</datalist>` : ''}
        <div class="nsw-cmd">${cmd ? `${icon('package', 13)}Commande d’origine : <b>${echapper(cmd.reference)}</b>${cmd.statutCommande !== 'Livrée' ? ` <span class="ko">— pas encore livrée : le SAV sera refusé</span>` : ''}` : v.numeroSerie ? 'Aucune commande trouvée pour ce numéro — le dossier sera créé sans lien.' : ''}</div>
      </div>
      <div class="field"><label for="ns-marque">Marque <em>(sinon reprise de tec.tech)</em></label><input class="input" id="ns-marque" data-ns="marque" value="${echapper(v.marque)}"></div>
      <div class="field"><label for="ns-modele">Modèle</label><input class="input" id="ns-modele" data-ns="modele" value="${echapper(v.modele)}"></div>
      <div class="field"><label for="ns-date-achat">Date d’achat <em>(pour la garantie)</em></label><input class="input" type="date" id="ns-date-achat" data-ns="dateAchat" value="${echapper(v.dateAchat)}"></div>
      <div class="field"><label for="ns-facture">Référence facture <em>(facultatif)</em></label><input class="input" id="ns-facture" data-ns="referenceFacture" value="${echapper(v.referenceFacture)}"></div>
    </div>`;
}
function etapeNsPrecisions(v) {
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label for="ns-commentaire">Commentaire</label><textarea class="input" id="ns-commentaire" data-ns="commentaire" rows="3" placeholder="Depuis quand, dans quelles circonstances…">${echapper(v.commentaire)}</textarea></div>
      <div class="field"><label for="ns-video">Lien vers une vidéo</label><input class="input" id="ns-video" data-ns="lienVideo" value="${echapper(v.lienVideo)}" placeholder="https://…"></div>
      <div class="field"><label for="ns-photo">Photo</label>
        ${
          v.photo
            ? `<div class="nsw-photo">${icon('eye', 14)}<span>${echapper(v.photo.nom)}</span><button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-ns-photo-retirer aria-label="Retirer la photo">${icon('x', 14)}</button></div>`
            : '<input class="input" type="file" id="ns-photo" accept="image/*">'
        }</div>
    </div>`;
}
function symptomeNs(v) {
  return v.symptome === '__autre' ? v.symptomeAutre.trim() : v.symptome;
}
function etapeNsRecap(v, s) {
  const bloc = (
    i,
    titre,
    lignes,
  ) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-ns-aller="${i}">Modifier</button></div>
    ${lignes
      .filter((l) => l)
      .map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`)
      .join('')}</section>`;
  return `<div class="csw-recap">
    ${bloc(0, 'Demandeur', [['Structure', v.sansStructure ? 'Sans structure' : s && s.nom], ['Nom', v.nom], v.sansStructure ? null : ['Personne', v.nomBeneficiaire], ['E-mail', v.email], ['Téléphone', v.telephone]])}
    <section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>Problème</h4><button type="button" class="et-lien" data-ns-aller="1">Modifier</button></div>${carteSymptomeSav(symptomeNs(v))}</section>
    ${bloc(2, 'Appareil', [
      ['N° de série', v.numeroSerie],
      ['Modèle', [v.marque, v.modele].filter(Boolean).join(' ')],
      ['Date d’achat', v.dateAchat ? isoVersFrNc(v.dateAchat) : ''],
      ['Facture', v.referenceFacture],
    ])}
    ${bloc(3, 'Précisions', [
      ['Commentaire', v.commentaire],
      ['Vidéo', v.lienVideo],
      ['Photo', v.photo ? v.photo.nom : ''],
    ])}
  </div>`;
}
function verifierEtapeSav(i) {
  const v = state.modal.v;
  const cle = ETAPES_SAV[i].cle;
  if (cle === 'demandeur') {
    if (!v.sansStructure && !v.code) return 'Choisissez la structure (ou « Sans structure »).';
    if (!v.nom.trim()) return 'Le nom est obligatoire.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return 'Une adresse e-mail valide est obligatoire.';
  }
  if (cle === 'probleme' && !symptomeNs(v))
    return v.symptome === '__autre' ? 'Décrivez le problème.' : 'Choisissez un symptôme.';
  if (cle === 'precisions' && v.lienVideo.trim() && !/^https?:\/\/\S+$/i.test(v.lienVideo.trim()))
    return 'Le lien vidéo doit commencer par https://';
  return '';
}
function allerEtapeSav(cible) {
  const m = state.modal;
  if (cible > m.etape) {
    for (let i = m.etape; i < cible; i++) {
      const err = verifierEtapeSav(i);
      if (err) {
        m.etape = i;
        render();
        $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
        return;
      }
    }
  }
  m.etape = Math.max(0, Math.min(ETAPES_SAV.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps');
  if (corps) corps.scrollTop = 0;
}
document.addEventListener('click', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-sav' || !m.v) return;
  const aller = e.target.closest('[data-ns-aller]');
  if (aller) {
    allerEtapeSav(parseInt(aller.dataset.nsAller, 10));
    return;
  }
  if (e.target.closest('[data-ns-suivant]')) {
    allerEtapeSav(m.etape + 1);
    return;
  }
  if (e.target.closest('[data-ns-precedent]')) {
    allerEtapeSav(m.etape - 1);
    return;
  }
  if (e.target.closest('[data-ns-photo-retirer]')) {
    m.v.photo = null;
    render();
    return;
  }
});
document.addEventListener('input', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-sav' || !m.v) return;
  const el = e.target;
  if (el.id === 'ns-recherche') {
    m.v.recherche = el.value;
    const q = el.value.trim().toLowerCase();
    document.querySelectorAll('.ncw-structure').forEach((l) => {
      l.hidden = !!q && !l.dataset.texte.includes(q);
    });
    return;
  }
  if (el.dataset.ns && el.type !== 'checkbox' && el.type !== 'file') m.v[el.dataset.ns] = el.value;
});
document.addEventListener('change', (e) => {
  const m = state.modal;
  if (!m || m.kind !== 'creer-sav' || !m.v) return;
  const el = e.target,
    v = m.v;
  if (el.name === 'ns-structure') {
    const st = state.structures.find((x) => x.code === el.value);
    const ancienne = state.structures.find((x) => x.code === v.code);
    v.code = el.value;
    // Préremplissage depuis la fiche structure (sans écraser une saisie différente).
    if (st) {
      if (!v.nom || (ancienne && v.nom === ancienne.nom)) v.nom = st.nom || '';
      if (!v.email || (ancienne && v.email === ancienne.email)) v.email = st.email || '';
      if (!v.telephone || (ancienne && v.telephone === ancienne.telephone)) v.telephone = st.telephone || '';
    }
    render();
    return;
  }
  if (el.name === 'ns-symptome') {
    v.symptome = el.value;
    render();
    return;
  }
  if (el.id === 'ns-photo' && el.files && el.files[0]) {
    const f = el.files[0];
    if (f.size > 10 * 1024 * 1024) {
      $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">La photo dépasse 10 Mo.</div>';
      el.value = '';
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      v.photo = { nom: f.name, type: f.type, base64: String(lecteur.result).split(',')[1] || '' };
      render();
    };
    lecteur.readAsDataURL(f);
    return;
  }
  if (el.dataset.ns === 'sansStructure') {
    v.sansStructure = el.checked;
    if (el.checked) {
      v.code = '';
      v.nomBeneficiaire = '';
      v.responsableSav = '';
    }
    render();
    return;
  }
  if (el.dataset.ns === 'numeroSerie') {
    v.numeroSerie = el.value.trim();
    render();
  }
});
async function enregistrerSav() {
  const m = state.modal,
    v = m.v;
  for (let i = 0; i < ETAPES_SAV.length - 1; i++) {
    const err = verifierEtapeSav(i);
    if (err) {
      m.etape = i;
      render();
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`;
      return;
    }
  }
  $('ns-enregistrer').disabled = true;
  const echec = (msg) => {
    etat(msg || 'Création impossible', 'erreur');
    $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(msg || 'Création impossible.')}</div>`;
    const b = $('ns-enregistrer');
    if (b) b.disabled = false;
  };
  try {
    etat('Création…', 'chargement');
    const r = await poster({
      action: 'sav-create',
      nom: v.nom.trim(),
      email: v.email.trim(),
      symptome: symptomeNs(v),
      code: v.sansStructure ? '' : v.code,
      telephone: v.telephone.trim(),
      numeroSerie: v.numeroSerie.trim(),
      commentaire: v.commentaire.trim(),
      nomBeneficiaire: v.nomBeneficiaire.trim(),
      responsableSav: v.responsableSav.trim(),
      dateAchat: v.dateAchat ? isoVersFrNc(v.dateAchat) : '',
      referenceFacture: v.referenceFacture.trim(),
      lienVideo: v.lienVideo.trim(),
      fichiers: v.photo ? [v.photo] : [],
    });
    if (!r.ok) return echec(r.erreur);
    // Marque/modèle ne sont pas acceptés à la création (sav-create) — renseignés juste après
    // via sav-update, sur le ticket qui vient d'être créé.
    const marque = v.marque.trim(),
      modele = v.modele.trim();
    if (marque) await poster({ action: 'sav-update', id: r.id, champ: 'marque', valeur: marque });
    if (modele) await poster({ action: 'sav-update', id: r.id, champ: 'modele', valeur: modele });
    etat('Ticket créé', 'succes');
    const rs = await jsonp({ action: 'sav-list', password: motDePasse, limite: 0 });
    if (rs.ok) state.sav = rs.tickets;
    state.modal = { kind: 'sav', ref: r.reference };
    state.accordeonTerminalOuvert = false;
    render();
  } catch (e) {
    echec();
  }
}

/** Regroupement par catégorie déduit de l'icône du produit — même logique que la page publique
 *  categories-materiel.html, dupliquée ici volontairement (pas de module JS partagé entre
 *  l'admin et les pages publiques dans ce projet). */
const MATERIEL_CATEGORIES = [
  { id: 'ordinateurs', titre: 'Ordinateurs', icones: ['portable', 'fixe'] },
  { id: 'smartphones', titre: 'Smartphones', icones: ['telephone', 'telephone_touches'] },
  { id: 'tablettes', titre: 'Tablettes', icones: ['tablette'] },
  { id: 'ateliers', titre: 'Ateliers & accompagnement', icones: ['atelier', 'feuille'] },
  { id: 'autres', titre: 'Autres', icones: null },
];
function ouvrirOrganisationMateriel() {
  const dejaClasses = new Set();
  const groupes = {};
  MATERIEL_CATEGORIES.forEach((cat) => {
    const items = cat.icones
      ? state.produits.filter((p) => cat.icones.includes(p.icone))
      : state.produits.filter((p) => !dejaClasses.has(p.nom));
    items.forEach((p) => dejaClasses.add(p.nom));
    groupes[cat.id] = items
      .slice()
      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
      .map((p) => p.id);
  });
  state.materielGroupes = groupes;
  state.modal = { kind: 'organiser-materiel' };
  render();
}
function vueOrganiserMateriel() {
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(680px,94vw);max-height:88vh;overflow-y:auto">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Organiser la page "Catégories de matériel"</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:12.5px;opacity:0.6;margin:0 0 var(--space-4)">Glisser-déposer pour changer l'ordre au sein d'une catégorie. L'œil masque un produit de cette page uniquement — il reste commandable normalement.</p>
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
          ${MATERIEL_CATEGORIES.map((cat) => {
            const refs = state.materielGroupes[cat.id] || [];
            if (!refs.length) return '';
            return `
            <div>
              <div class="card-kicker" style="margin-bottom:8px">${echapper(cat.titre)} (${refs.length})</div>
              <div style="display:flex;flex-direction:column;gap:6px">
                ${refs
                  .map((id, i) => {
                    const p = state.produits.find((x) => x.id === id);
                    if (!p) return '';
                    return `
                  <div class="card elev-sm" draggable="true" style="flex-direction:row;align-items:center;gap:10px;padding:10px 12px;cursor:grab;${p.masqueCategorieMateriel ? 'opacity:0.5' : ''}" data-materiel-carte="${id}" data-materiel-cat="${cat.id}" data-materiel-index="${i}">
                    <span style="opacity:0.4;display:flex;flex:none">${icon('grip', 16)}</span>
                    <span style="flex:1;font-size:13.5px;font-weight:600">${echapper(p.nom)}</span>
                    <button type="button" class="btn btn-ghost btn-icon" style="width:30px;height:30px;flex:none" data-materiel-masquer="${id}" title="${p.masqueCategorieMateriel ? 'Masqué de la page catégories — cliquer pour afficher' : 'Visible sur la page catégories — cliquer pour masquer'}">${icon(p.masqueCategorieMateriel ? 'eyeoff' : 'eye', 16)}</button>
                  </div>`;
                  })
                  .join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
        <button type="button" class="btn btn-primary btn-block" style="margin-top:var(--space-5)" id="materiel-enregistrer">Enregistrer l'ordre</button>
      </div>
    </div>`;
}
async function enregistrerOrganisationMateriel() {
  const btn = $('materiel-enregistrer');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  try {
    const appels = [];
    Object.values(state.materielGroupes).forEach((liste) => {
      liste.forEach((id, index) => {
        const p = state.produits.find((x) => x.id === id);
        if (!p) return;
        appels.push(
          poster({ action: 'produit-update', id, champ: 'ordre', valeur: index }).then((r) => {
            p.ordre = index;
            return r;
          }),
        );
        appels.push(
          poster({
            action: 'produit-update',
            id,
            champ: 'masqueCategorieMateriel',
            valeur: !!p.masqueCategorieMateriel,
          }),
        );
      });
    });
    const reponses = await Promise.all(appels);
    if (reponses.find((r) => !r.ok)) {
      etat("Certains changements n'ont pas pu être enregistrés", 'erreur');
      btn.disabled = false;
      btn.textContent = "Enregistrer l'ordre";
      return;
    }
    etat('Ordre et couleurs enregistrés', 'succes');
    state.modal = null;
    render();
  } catch (e) {
    etat('Enregistrement impossible', 'erreur');
    btn.disabled = false;
    btn.textContent = "Enregistrer l'ordre";
  }
}
