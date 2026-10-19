/* Bons d'orientation (orientation.html) : une structure qui oriente des personnes vers une vente
   solidaire d'une structure Interne entre avec le code d'accès reçu par mail (pas de compte).
   Mise en page de la commande : catalogue en cartes produit (usages, prix), une ligne par
   personne (pastille d'initiales, ordinateur choisi), attestations, récapitulatif de la vente.
   On saisit autant de lignes que l'on veut, puis « Enregistrer » les envoie une par une.
   Serveur : routes/orientation.js (orientation-ouvrir, orientation-bon-enregistrer,
   orientation-bon-supprimer). Le code est gardé pour l'onglet (sessionStorage) ; il peut arriver
   dans l'adresse après « # » (lien du mail), jamais envoyé tel quel au serveur web. */
const CLE_ACCES = 'cvdl-acces-orientation';
const CLE_REFERENT = 'cvdl-orientation-referent';
const COULEURS = [
  'color-mix(in srgb, #00ACB0 45%, #fff)',
  'color-mix(in srgb, #E62460 35%, #fff)',
  'color-mix(in srgb, #FECC38 55%, #fff)',
];
/* acces, vente, produits, bons (enregistrés), saisies : lignes en cours
   ({ cle, id (bon modifié) ou 0, prenom, nom, dateNaissance (aaaa-mm-jj), telephone, produit,
   besoins, erreur }). */
const O = { acces: '', vente: null, produits: [], bons: [], saisies: [] };
let prochaineCle = 1;

const lire = (cle, stockage) => {
  try {
    return stockage.getItem(cle) || '';
  } catch (e) {
    return '';
  }
};
const ecrire = (cle, valeur, stockage) => {
  try {
    if (valeur) stockage.setItem(cle, valeur);
    else stockage.removeItem(cle);
  } catch (e) {
    /* navigation privée : rien de gardé */
  }
};
const msg = (cible, texte, type) =>
  ($(cible).innerHTML = texte ? `<div class="msg msg-${type || 'erreur'}">${echapper(texte)}</div>` : '');
const prixTexte = (p) => (p == null || p === '' ? '' : formaterMontant(p));
const dateLongue = (iso, opts) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts || { weekday: 'long', day: 'numeric', month: 'long' });
const veille = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};
const modifiable = () => O.vente && O.vente.etat === 'modifiable';
const produit = (nom) => O.produits.find((p) => p.nom === nom);
const court = (nom) => String(nom || '').replace(/ reconditionné| léger/, '');
const visuel = (nom, taille) => {
  const p = produit(nom) || { nom };
  return window.illustrationCvdl && window.cleIllustrationProduit
    ? window.illustrationCvdl(window.cleIllustrationProduit(p.nom, p.icone), taille)
    : '';
};
const initiales = (prenom, nom) =>
  ((String(prenom || '').trim()[0] || '') + (String(nom || '').trim()[0] || '')).toUpperCase();
const pastille = (i, prenom, nom) => {
  const ini = initiales(prenom, nom);
  return `<span class="pc-av${ini ? '' : ' vide'}" style="--c:${COULEURS[i % COULEURS.length]}" aria-hidden="true">${echapper(ini || '+')}</span>`;
};
const isoDepuisFr = (fr) => {
  const m = String(fr || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

/* ── Accès ── */
async function ouvrir(code, silencieux) {
  const bouton = $('btn-acces');
  bouton.disabled = true;
  bouton.innerHTML = '<span class="spinner-inline"></span>Vérification…';
  msg('retour-acces', '');
  let r;
  try {
    r = await lireApi({ action: 'orientation-ouvrir', acces: code });
  } catch (e) {
    r = { ok: false, erreur: 'Connexion impossible — réessayez.' };
  }
  bouton.disabled = false;
  bouton.textContent = 'Continuer';
  if (!r.ok) {
    ecrire(CLE_ACCES, '', sessionStorage);
    if (!silencieux) msg('retour-acces', r.erreur || 'Code refusé.');
    $('etape-code').hidden = false;
    $('etape-bons').hidden = true;
    return false;
  }
  O.acces = code;
  O.vente = r.vente;
  O.produits = r.produits || [];
  O.bons = r.bons || [];
  // Première visite : une ligne prête à remplir.
  O.saisies = modifiable() && !O.bons.length ? [nouvelleSaisie()] : [];
  ecrire(CLE_ACCES, code, sessionStorage);
  $('etape-code').hidden = true;
  $('etape-bons').hidden = false;
  $('ob-referent').value = lire(CLE_REFERENT, localStorage);
  afficherCatalogue();
  afficher();
  return true;
}
async function recharger() {
  const r = await lireApi({ action: 'orientation-ouvrir', acces: O.acces }).catch(() => null);
  if (r && r.ok) {
    O.vente = r.vente;
    O.bons = r.bons || [];
  }
  afficher();
}

/* ── Catalogue ── */
function afficherCatalogue() {
  $('ob-catalogue').innerHTML = O.produits.length
    ? O.produits
        .map(
          (p) => `<div class="carte-produit">
        <div class="icone-carre">${visuel(p.nom, 58)}</div>
        <div class="nom-produit">${echapper(p.nom)}</div>
        <div class="spec-produit">${echapper([p.disque, p.ram, p.systeme].filter(Boolean).join(' · '))}</div>
        ${p.usages ? `<p class="ob-usages">${echapper(p.usages)}</p>` : ''}
        ${p.prix != null ? `<div class="prix-produit">${prixTexte(p.prix)}</div>` : ''}
      </div>`,
        )
        .join('')
    : '<p class="cm-recap-vide">Aucun ordinateur proposé pour le moment.</p>';
}
$('ob-replier').addEventListener('click', function () {
  const replie = $('ob-catalogue').closest('.ob-catalogue').classList.toggle('replie');
  this.textContent = replie ? 'Afficher' : 'Masquer';
  this.setAttribute('aria-expanded', String(!replie));
});

/* ── Aide au choix : l'arbre de décision de la page Commander, dans une fenêtre ── */
const AIDE_CHOIX = 'https://ec-cvdl.github.io/decision-tree/';
$('ob-aide').addEventListener('click', () => {
  if (!$('iframe-integre').src) $('iframe-integre').src = AIDE_CHOIX;
  $('voile-integre').classList.add('visible');
});
$('voile-integre').addEventListener('click', (e) => {
  if (e.target.id === 'integre-fermer' || e.target.id === 'voile-integre')
    $('voile-integre').classList.remove('visible');
});

/* ── Récapitulatif de la vente ── */
function afficherRecap() {
  const v = O.vente;
  $('ob-surtitre').textContent = `Bons d’orientation · ${v.orienteur}`;
  $('ob-structure').textContent = v.nomStructure;
  const d = new Date(`${v.dateVente}T12:00:00`);
  $('ob-vente').innerHTML =
    `<span class="ob-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString('fr-FR', { month: 'short' })}</small></span>
    <span><b>${echapper(dateLongue(v.dateVente, { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase()))}${v.heure ? ` · ${echapper(v.heure)}` : ''}</b>${v.lieu ? `<small>${echapper(v.lieu)}</small>` : ''}</span>`;
  const parProduit = {};
  O.bons.forEach((b) => (parProduit[b.produit] = (parProduit[b.produit] || 0) + 1));
  $('ob-repartition').innerHTML = Object.keys(parProduit).length
    ? Object.entries(parProduit)
        .map(([nom, q]) => {
          const p = produit(nom);
          return `<div class="cm-recap-ligne"><span>${q} × ${echapper(court(nom))}</span>${p && p.prix != null ? `<b>${prixTexte(p.prix * q)}</b>` : ''}</div>`;
        })
        .join('')
    : '<div class="cm-recap-vide">Aucune personne orientée pour le moment.</div>';
  const n = O.bons.length;
  $('ob-places').innerHTML = v.places
    ? `<div class="ob-places"><span>Places</span><b>${n} / ${v.places}</b><i style="--p:${Math.min(100, Math.round((n / v.places) * 100))}%"></i></div>`
    : `<div class="ob-places"><span>Personnes orientées</span><b>${n}</b></div>`;
  $('ob-delai').innerHTML = modifiable()
    ? `<span>Modifiable jusqu’au</span><b>${echapper(veille(v.dateVente))}</b>`
    : '<span>Bons clos</span><b>Consultation</b>';
  $('ob-consigne').innerHTML = v.consigne
    ? `<div class="ob-consigne"><b>Le mot de la structure :</b><span>${echapper(v.consigne)}</span></div>`
    : '';
}

/* ── Lignes ── */
function nouvelleSaisie(bon) {
  return {
    cle: prochaineCle++,
    id: bon ? bon.id : 0,
    prenom: bon ? bon.prenom : '',
    nom: bon ? bon.nom : '',
    dateNaissance: bon ? isoDepuisFr(bon.dateNaissance) : '',
    telephone: bon ? bon.telephone : '',
    produit: bon ? bon.produit : '',
    besoins: bon ? bon.besoins : '',
    erreur: '',
  };
}
function ligneBon(b, i) {
  const enSaisie = O.saisies.find((s) => s.id === b.id);
  if (enSaisie) return ligneSaisie(enSaisie, i);
  const detail = [b.dateNaissance && `né(e) le ${b.dateNaissance}`, b.telephone].filter(Boolean).join(' · ');
  return `<div class="bloc-personne ob-ligne">
    ${pastille(i, b.prenom, b.nom)}
    <div class="ob-qui"><b>${echapper(b.prenom)} ${echapper(b.nom)}</b>${detail ? `<small>${echapper(detail)}</small>` : ''}${b.besoins ? `<small>${echapper(b.besoins)}</small>` : ''}
      <span class="ob-appareil">${visuel(b.produit, 26)}<span>${echapper(court(b.produit))}</span></span></div>
    <div class="ob-actions">${
      b.vendu
        ? '<span class="ob-remis">Ordinateur remis</span>'
        : modifiable()
          ? `<button type="button" class="btn btn-ghost" data-modifier="${b.id}">Modifier</button><button type="button" class="btn btn-ghost" data-supprimer="${b.id}" style="color:#A3154A">Retirer</button>`
          : ''
    }</div>
  </div>`;
}
function ligneSaisie(s, i) {
  const options = O.produits
    .map(
      (p) =>
        `<option value="${echapper(p.nom)}"${p.nom === s.produit ? ' selected' : ''}>${echapper(court(p.nom))}${p.prix != null ? ` — ${prixTexte(p.prix)}` : ''}</option>`,
    )
    .join('');
  const champ = (nom, lib, attrs) =>
    `<div class="field"><label for="ob-${nom}-${s.cle}">${lib}</label><input class="input" id="ob-${nom}-${s.cle}" data-cle="${s.cle}" data-champ="${nom}" value="${echapper(s[nom])}" ${attrs || ''}></div>`;
  return `<div class="bloc-personne ob-ligne edition${s.erreur ? ' en-erreur' : ''}" data-ligne="${s.cle}">
    ${pastille(i, s.prenom, s.nom)}
    <div class="ob-champs">
      <div class="ob-ligne-pied"><span class="ob-titre-ligne">${s.id ? 'Modifier le bon' : 'Nouvelle personne'}</span>
        <button type="button" class="ob-lien" data-annuler="${s.cle}">${s.id ? 'Annuler' : 'Retirer la ligne'}</button></div>
      <div class="grille-personne-bo">
        ${champ('prenom', 'Prénom', 'autocomplete="off" maxlength="80" placeholder="Prénom"')}
        ${champ('nom', 'NOM', 'autocomplete="off" maxlength="80" placeholder="NOM" style="text-transform:uppercase"')}
        ${champ('dateNaissance', 'Date de naissance', 'type="date" min="1920-01-01"')}
      </div>
      <div class="ob-champs-2">
        <div class="field ob-choix-champ"><label for="ob-produit-${s.cle}">Ordinateur</label>
          <div class="ob-choix"><span class="ob-choix-vis">${s.produit ? visuel(s.produit, 34) : ''}</span><select class="input" id="ob-produit-${s.cle}" data-cle="${s.cle}" data-champ="produit"><option value="">Choisir…</option>${options}</select></div></div>
        ${champ('telephone', 'Téléphone', 'type="tel" autocomplete="off" maxlength="30" placeholder="Facultatif"')}
        ${champ('besoins', 'Ses usages', 'maxlength="1000" placeholder="Démarches, visio, formation…"')}
      </div>
      ${s.erreur ? `<div class="ob-erreur" role="alert">${echapper(s.erreur)}</div>` : ''}
    </div>
  </div>`;
}
function afficher() {
  afficherRecap();
  const nouvelles = O.saisies.filter((s) => !s.id);
  const total = O.bons.length + nouvelles.length;
  $('ob-compteur').textContent = `${total} personne${total > 1 ? 's' : ''}`;
  $('ob-lignes').innerHTML =
    O.bons.map((b, i) => ligneBon(b, i)).join('') + nouvelles.map((s, k) => ligneSaisie(s, O.bons.length + k)).join('');
  if (!O.bons.length && !nouvelles.length)
    $('ob-lignes').innerHTML = '<p class="cm-recap-vide">Aucune personne orientée.</p>';
  const ouvert = modifiable();
  const pleine = O.vente.places && total >= O.vente.places;
  $('ob-ajouter').hidden = !ouvert || pleine;
  $('ob-envoi').hidden = !ouvert || !O.saisies.length;
  $('ob-pied').hidden = !ouvert || !O.saisies.length;
  const n = O.saisies.length;
  $('ob-enregistrer').textContent = n > 1 ? `Enregistrer les ${n} bons` : 'Enregistrer le bon';
}

/* Saisie : l'état suit les champs, sans tout redessiner (le curseur reste en place). */
$('ob-lignes').addEventListener('input', (e) => {
  const el = e.target.closest('[data-cle]');
  if (!el) return;
  const s = O.saisies.find((x) => x.cle === Number(el.dataset.cle));
  if (!s) return;
  s[el.dataset.champ] = el.value;
  const ligne = el.closest('[data-ligne]');
  if (el.dataset.champ === 'prenom' || el.dataset.champ === 'nom') {
    const av = ligne.querySelector('.pc-av');
    const ini = initiales(s.prenom, s.nom);
    av.textContent = ini || '+';
    av.classList.toggle('vide', !ini);
  }
  if (el.dataset.champ === 'produit')
    ligne.querySelector('.ob-choix-vis').innerHTML = s.produit ? visuel(s.produit, 34) : '';
});
$('ob-ajouter').addEventListener('click', () => {
  O.saisies.push(nouvelleSaisie());
  afficher();
  const champs = $('ob-lignes').querySelectorAll('[data-champ="prenom"]');
  if (champs.length) champs[champs.length - 1].focus();
});
$('ob-lignes').addEventListener('click', async (e) => {
  const ann = e.target.closest('[data-annuler]');
  if (ann) {
    O.saisies = O.saisies.filter((s) => s.cle !== Number(ann.dataset.annuler));
    return afficher();
  }
  const mod = e.target.closest('[data-modifier]');
  if (mod) {
    const b = O.bons.find((x) => x.id === Number(mod.dataset.modifier));
    if (!b) return;
    let saisie = O.saisies.find((x) => x.id === b.id);
    if (!saisie) O.saisies.push((saisie = nouvelleSaisie(b)));
    afficher();
    const champ = $(`ob-prenom-${saisie.cle}`);
    if (champ) champ.focus();
    return;
  }
  const sup = e.target.closest('[data-supprimer]');
  if (!sup) return;
  const b = O.bons.find((x) => x.id === Number(sup.dataset.supprimer));
  if (!b) return;
  const ok = window.confirmerCvdl
    ? await window.confirmerCvdl(`Retirer le bon de ${b.prenom} ${b.nom} ?`)
    : window.confirm(`Retirer le bon de ${b.prenom} ${b.nom} ?`);
  if (!ok) return;
  sup.disabled = true;
  const r = await poster({ action: 'orientation-bon-supprimer', acces: O.acces, id: b.id }).catch(() => null);
  if (!r || !r.ok) {
    sup.disabled = false;
    return msg('ob-retour', (r && r.erreur) || 'Suppression impossible — réessayez.');
  }
  msg('ob-retour', '');
  await recharger();
});

/* ── Enregistrement : chaque ligne est vérifiée, puis envoyée ; celles qui échouent restent ── */
function erreurLocale(s) {
  if (!s.prenom.trim() || !s.nom.trim()) return 'Prénom et nom sont obligatoires.';
  if (!s.produit) return 'Choisissez l’ordinateur.';
  return '';
}
async function enregistrer() {
  msg('ob-retour', '');
  O.saisies.forEach((s) => (s.erreur = erreurLocale(s)));
  const attestations = [...document.querySelectorAll('.ob-case')].every((c) => c.checked);
  if (O.saisies.some((s) => s.erreur)) {
    afficher();
    return msg('ob-retour', 'Complétez les lignes signalées en rouge.');
  }
  if (!attestations) return msg('ob-retour', 'Cochez les trois attestations avant d’enregistrer.');
  const referent = $('ob-referent').value.trim();
  ecrire(CLE_REFERENT, referent, localStorage);
  const bouton = $('ob-enregistrer');
  bouton.disabled = true;
  bouton.innerHTML = '<span class="spinner-inline"></span>Enregistrement…';
  let faits = 0;
  for (const s of [...O.saisies]) {
    const existant = s.id && O.bons.find((b) => b.id === s.id);
    let r;
    try {
      r = await poster({
        action: 'orientation-bon-enregistrer',
        acces: O.acces,
        attestations: true,
        bon: {
          id: s.id || undefined,
          prenom: s.prenom,
          nom: s.nom,
          dateNaissance: s.dateNaissance,
          telephone: s.telephone,
          produit: s.produit,
          besoins: s.besoins,
          referent: referent || (existant && existant.referent) || '',
        },
      });
    } catch (e) {
      r = { ok: false, erreur: 'Connexion impossible — réessayez.' };
    }
    if (r.ok) {
      faits++;
      O.saisies = O.saisies.filter((x) => x.cle !== s.cle);
    } else s.erreur = r.erreur || 'Enregistrement impossible.';
  }
  bouton.disabled = false;
  await recharger();
  if (faits)
    msg(
      'ob-retour',
      `${faits} bon${faits > 1 ? 's' : ''} enregistré${faits > 1 ? 's' : ''}.${O.saisies.length ? ' Les lignes en rouge restent à corriger.' : ''}`,
      O.saisies.length ? 'erreur' : 'succes',
    );
  else msg('ob-retour', 'Aucun bon enregistré : corrigez les lignes en rouge.');
  if (!O.saisies.length) document.querySelectorAll('.ob-case').forEach((c) => (c.checked = false));
}
$('ob-enregistrer').addEventListener('click', enregistrer);

/* ── Accès, quitter, imprimer ── */
$('btn-acces').addEventListener('click', () => ouvrir(extraireCode($('acces-code').value)));
$('acces-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') ouvrir(extraireCode($('acces-code').value));
});
$('btn-imprimer').addEventListener('click', () => window.print());
$('btn-quitter').addEventListener('click', () => {
  ecrire(CLE_ACCES, '', sessionStorage);
  location.replace('orientation.html');
});

/** Code d'accès trouvé dans un texte collé (adresse complète, « Code d’accès : ABCD-EFGH »,
 *  code sans tiret…), ou le texte tel quel. */
function extraireCode(texte) {
  let t = String(texte || '');
  try {
    t = decodeURIComponent(t);
  } catch (e) {
    /* texte déjà décodé */
  }
  // Le dernier code du texte (un lien collé deux fois, « Code d’accès : … » à la fin) ; avec
  // tiret de préférence, sinon avec une espace.
  const dernier = (motif) => (t.match(motif) || []).pop();
  const code =
    dernier(/[A-Za-z2-9]{4}-[A-Za-z2-9]{4}/g) || dernier(/(?<![\p{L}\d])[A-Za-z2-9]{4} [A-Za-z2-9]{4}(?![\p{L}\d])/gu);
  if (code) return code.replace(' ', '-').toUpperCase();
  const seul = t.replace(/\s+/g, '').match(/^[A-Za-z2-9]{8}$/);
  return seul ? seul[0].toUpperCase() : t.trim();
}

// Code dans l'adresse (lien du mail : orientation.html#ABCD-EFGH), sinon celui de l'onglet. Un
// nouveau lien collé dans la même page ne la recharge pas : on suit aussi le changement d'adresse.
function depuisAdresse() {
  if (!location.hash.slice(1)) return '';
  const code = extraireCode(location.hash.slice(1));
  history.replaceState(null, '', location.pathname);
  return code;
}
window.addEventListener('hashchange', () => {
  const code = depuisAdresse();
  if (!code) return;
  $('acces-code').value = code;
  ouvrir(code);
});
(function demarrer() {
  const depuisLien = depuisAdresse();
  const code = depuisLien || lire(CLE_ACCES, sessionStorage);
  if (code) {
    $('acces-code').value = code;
    ouvrir(code, !depuisLien);
  }
})();
