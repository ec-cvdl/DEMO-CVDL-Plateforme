/* Ventes à préparer (ventes-preparer.html) — responsable d'une structure Interne ; un conseiller
   numérique y voit les ventes qu'il tient (préparation et remise seulement).
   Une vente à venir a son code d'accès, envoyé à la main (lien mailto prérempli) à la structure
   qui oriente des personnes ; celle-ci remplit les bons sur orientation.html. Ici : les bons par
   vente, la pré-attestation de chaque personne, puis le jour de la vente l'appareil remis
   (pris dans la flotte « En stock ») et l'attestation définitive.
   Serveur : routes/orientation.js ; attestation définitive : flotte-generer-attestation. */
let codeValide = '';
const D = { role: 'responsable', ventes: [], produits: [], stock: [], lieux: [], equipe: [], aujourdhui: '' };
const nomMembre = (email) => (D.equipe.find((m) => m.email === email) || {}).nom || email;
let filtre = 'avenir';

const pluriel = (n, s, p) => `${n} ${n > 1 ? p || s + 's' : s}`;
const dateLongue = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
const msg = (cible, texte, type) =>
  ($(cible).innerHTML = texte ? `<div class="msg msg-${type || 'erreur'}">${echapper(texte)}</div>` : '');
const alerte = (t) => (window.alerteCvdl ? window.alerteCvdl(t) : window.alert(t));
const confirmer = (t) => (window.confirmerCvdl ? window.confirmerCvdl(t) : Promise.resolve(window.confirm(t)));
const lienOrientation = (v) => `${new URL('orientation.html', location.href).href}#${v.codeAcces}`;
const venteDe = (id) => D.ventes.find((v) => v.id === id);
const bonDe = (id) => {
  for (const v of D.ventes) {
    const b = v.bons.find((x) => x.id === id);
    if (b) return { bon: b, vente: v };
  }
  return {};
};

/** Copie un texte (presse-papiers, sinon ancienne méthode) ; vrai si c'est fait. */
async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch (e) {
    const zone = document.createElement('textarea');
    zone.value = texte;
    zone.style.position = 'fixed';
    zone.style.opacity = '0';
    document.body.appendChild(zone);
    zone.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    zone.remove();
    return ok;
  }
}

/** Télécharge un document renvoyé par le serveur (PDF ou HTML en data:). */
function telecharger(r) {
  const a = document.createElement('a');
  a.href = window.urlSure ? window.urlSure(r.url) : r.url;
  a.download = r.nomFichier || 'Attestation.pdf';
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ── Chargement ── */
async function charger() {
  const r = await lireApi({ action: 'ventes-preparer-lister', code: codeValide, passees: 'oui' }).catch(() => null);
  if (!r || !r.ok) return msg('retour-ventes', (r && r.erreur) || 'Chargement impossible — réessayez.');
  msg('retour-ventes', '');
  Object.assign(D, r);
  afficher();
}

/* ── Liste ── */
const passee = (v) => v.dateVente < D.aujourdhui;
const estConseiller = () => D.role === 'conseiller';
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dateCourte = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const joursAvant = (iso) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${D.aujourdhui}T12:00:00`)) / 864e5);
const enStock = (produit) => D.stock.filter((a) => a.produit === produit).length;
/** Illustration du produit (portail-ui.js), vide tant que le composant n'est pas chargé. */
const illuProduit = (nom, taille) => {
  const p = D.produits.find((x) => x.nom === nom) || {};
  return window.illustrationCvdl && window.cleIllustrationProduit
    ? window.illustrationCvdl(window.cleIllustrationProduit(nom, p.icone), taille)
    : '';
};
const SVG = {
  lieu: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  personne:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
};
const initiales = (b) => `${(b.prenom || '').charAt(0)}${(b.nom || '').charAt(0)}`.toUpperCase() || '?';

function afficher() {
  document.documentElement.classList.toggle('bo-conseiller', estConseiller());
  if (estConseiller()) {
    $('bo-intro').textContent =
      'Les ventes que vous tenez : préparez les ordinateurs, imprimez les pré-attestations, puis enregistrez la remise de l’appareil le jour de la vente.';
  }
  $('bo-capteurs').innerHTML = capteurs();
  const n = { avenir: D.ventes.filter((v) => !passee(v)).length, passees: D.ventes.filter(passee).length };
  $('bo-filtres').innerHTML = [
    ['avenir', `À venir (${n.avenir})`],
    ['passees', `Passées (${n.passees})`],
  ]
    .map(
      ([k, l]) =>
        `<button type="button" class="bo-mini${filtre === k ? ' plein' : ''}" data-filtre="${k}" aria-pressed="${filtre === k}">${l}</button>`,
    )
    .join('');
  const ventes = D.ventes.filter((v) => (filtre === 'avenir' ? !passee(v) : passee(v)));
  if (filtre === 'passees') ventes.reverse();
  const vide =
    filtre === 'passees'
      ? 'Aucune vente passée conservée (les bons sont effacés 3 mois après la vente).'
      : estConseiller()
        ? 'Aucune vente à venir ne vous est confiée pour le moment.'
        : 'Aucune vente à venir. Créez-en une avec « + Nouvelle vente ».';
  $('bo-ventes').innerHTML = ventes.length ? ventes.map(carteVente).join('') : `<p class="bo-vide">${vide}</p>`;
}

/** Capteur « Ordinateurs à préparer » : par catégorie, les bons des ventes à venir encore sans
 *  appareil, comparés au stock de la flotte. */
function capteurs() {
  const besoins = {};
  D.ventes
    .filter((v) => !passee(v))
    .forEach((v) =>
      v.bons
        .filter((b) => !b.flotteId)
        .forEach((b) => {
          const x = (besoins[b.produit] ||= { produit: b.produit, n: 0, ventes: new Set(), prochaine: v.dateVente });
          x.n++;
          x.ventes.add(v.id);
          if (v.dateVente < x.prochaine) x.prochaine = v.dateVente;
        }),
    );
  const liste = Object.values(besoins).sort((a, b) => a.prochaine.localeCompare(b.prochaine) || b.n - a.n);
  const total = liste.reduce((t, x) => t + x.n, 0);
  const manque = liste.reduce((t, x) => t + Math.max(0, x.n - enStock(x.produit)), 0);
  const nbVentes = new Set(liste.flatMap((x) => [...x.ventes])).size;
  const sous = total
    ? `${pluriel(total, 'ordinateur')} pour ${pluriel(nbVentes, 'vente')} à venir${manque ? ` · <b class="bo-ko">${manque} manquant${manque > 1 ? 's' : ''} dans la flotte</b>` : ' · stock suffisant'}.`
    : 'Rien à préparer : aucun bon en attente d’appareil pour les ventes à venir.';
  return `<section class="bo-capteurs" aria-labelledby="bo-capteurs-titre">
    <div class="bo-capteurs-tete"><span data-ill="stock" class="ill"></span><div><h2 id="bo-capteurs-titre">Ordinateurs à préparer</h2><p>${sous}</p></div></div>
    ${
      liste.length
        ? `<div class="bo-capteurs-grille">${liste
            .map((x) => {
              const stock = enStock(x.produit);
              const manquant = Math.max(0, x.n - stock);
              const pct = Math.round((Math.min(stock, x.n) / x.n) * 100);
              const j = joursAvant(x.prochaine);
              return `<article class="bo-capteur${manquant ? ' alerte' : ''}">
          <div class="bo-capteur-tete"><span class="bo-capteur-ill">${illuProduit(x.produit, 34)}</span><b title="${echapper(x.produit)}">${echapper(x.produit)}</b></div>
          <div class="bo-capteur-chiffre"><b>${x.n}</b><span>à préparer · ${stock} en stock</span></div>
          <div class="bo-capteur-barre" role="img" aria-label="${pct} % couverts par le stock"><i style="width:${Math.max(3, pct)}%"></i></div>
          <div class="bo-capteur-puces">
            ${manquant ? `<span class="ko">Manque ${manquant}</span>` : '<span class="ok">Stock suffisant</span>'}
            <span class="${j <= 7 ? 'att' : ''}">${j === 0 ? 'Vente aujourd’hui' : j === 1 ? 'Vente demain' : `1re vente ${echapper(dateCourte(x.prochaine))}`}</span>
            ${x.ventes.size > 1 ? `<span>${x.ventes.size} ventes</span>` : ''}
          </div>
        </article>`;
            })
            .join('')}</div>`
        : ''
    }
  </section>`;
}

function carteVente(v) {
  const parProduit = {};
  // Personnes encore sans appareil, par catégorie (comparées au stock de la flotte).
  v.bons.filter((b) => !b.flotteId).forEach((b) => (parProduit[b.produit] = (parProduit[b.produit] || 0) + 1));
  const remis = v.bons.filter((b) => b.flotteId).length;
  const [, mois, jour] = v.dateVente.split('-');
  const etat =
    v.etat === 'modifiable'
      ? '<span class="bo-puce ok">Ouverte aux bons</span>'
      : v.statut === 'close' && !passee(v)
        ? '<span class="bo-puce alerte">Close</span>'
        : '<span class="bo-puce">Bons clos</span>';
  const places = v.places
    ? `<span class="bo-places" title="${v.bons.length} bon${v.bons.length > 1 ? 's' : ''} sur ${v.places} places"><span class="bo-places-barre"><i style="width:${Math.min(100, Math.round((v.bons.length / v.places) * 100))}%"></i></span>${v.bons.length} / ${v.places} places</span>`
    : `<span class="bo-puce">${pluriel(v.bons.length, 'personne')}</span>`;
  const responsable = !estConseiller();
  return `<article class="bo-vente-carte${passee(v) ? ' passee' : ''}" data-vente="${v.id}">
    <div class="bo-vente-tete">
      <span class="bo-date" aria-hidden="true"><b>${Number(jour)}</b>${MOIS[Number(mois) - 1] || ''}</span>
      <div class="bo-vente-titre">
        <div class="cvdl-surtitre">${echapper(v.orienteur)}</div>
        <h2>${echapper(dateLongue(v.dateVente))}${v.heure ? ` · ${echapper(v.heure)}` : ''}</h2>
        <div class="bo-infos">
          ${v.lieu ? `<span>${SVG.lieu}${echapper(v.lieu)}</span>` : ''}
          ${v.orienteurEmail ? `<span>${SVG.mail}${echapper(v.orienteurEmail)}</span>` : ''}
          ${v.conseiller ? `<span>${SVG.personne}Conseiller : <b>${echapper(nomMembre(v.conseiller))}</b></span>` : `<span class="bo-ko">${SVG.personne}Aucun conseiller : choisissez-le dans « Modifier »</span>`}
        </div>
      </div>
      <div class="bo-code" title="Code d’accès de ${echapper(v.orienteur)}">
        <code>${echapper(v.codeAcces)}</code>
        <button type="button" class="bo-mini" data-copier-code="${v.id}">Copier le code</button><button type="button" class="bo-mini" data-copier="${v.id}">Copier le lien</button>
        ${responsable ? `<a class="bo-mini plein" href="${echapper(lienMail(v))}">Écrire à la structure</a>` : ''}
      </div>
    </div>
    <div class="bo-repartition">
      ${etat}${places}
      ${remis ? `<span class="bo-puce ok">${pluriel(remis, 'appareil remis', 'appareils remis')}</span>` : ''}
      ${Object.entries(parProduit)
        .map(([p, q]) => {
          const n = enStock(p);
          const etatStock = passee(v) ? '' : n < q ? ' ko' : ' ok';
          return `<span class="bo-besoin${etatStock}" title="${n} en stock dans votre flotte"><i aria-hidden="true"></i>${q} × ${echapper(p)}${passee(v) ? '' : ` · ${n} en stock`}</span>`;
        })
        .join('')}
    </div>
    ${v.consigne ? `<div class="bo-consigne">${echapper(v.consigne)}</div>` : ''}
    ${
      v.bons.length
        ? `<div class="bo-bons" role="table" aria-label="Bons de la vente">
      <div class="bo-bon bo-bon-tete" role="row"><span role="columnheader">Personne</span><span role="columnheader">Catégorie</span><span role="columnheader">Orienté par</span><span role="columnheader">Préparation</span></div>
      ${v.bons.map((b) => ligneBon(b, v)).join('')}</div>`
        : '<p class="bo-vide">Pas encore de bon : envoyez le code à la structure.</p>'
    }
    <div class="bo-pied">
      <span>
        ${responsable ? `<button type="button" class="bo-mini" data-ajouter-bon="${v.id}">+ Ajouter une personne</button>` : ''}
        ${v.bons.length ? `<button type="button" class="bo-mini" data-exporter="${v.id}">Exporter (CSV)</button>` : ''}
      </span>
      ${
        responsable
          ? `<span>
        ${passee(v) ? '' : `<button type="button" class="bo-mini" data-statut="${v.id}">${v.statut === 'close' ? 'Rouvrir aux bons' : 'Clore les bons'}</button>`}
        ${passee(v) ? '' : `<button type="button" class="bo-mini" data-modifier-vente="${v.id}">Modifier</button>`}
        <button type="button" class="bo-mini danger" data-supprimer-vente="${v.id}">Supprimer</button>
      </span>`
          : ''
      }
    </div>
  </article>`;
}

/** Appareils en stock proposables pour la catégorie du bon : ceux du même produit d'abord. */
function optionsStock(b) {
  const pris = new Set(D.ventes.flatMap((v) => v.bons.map((x) => x.flotteId)).filter(Boolean));
  const libre = D.stock.filter((a) => !pris.has(a.id));
  const memes = libre.filter((a) => a.produit === b.produit);
  const autres = libre.filter((a) => a.produit !== b.produit);
  const opt = (a) =>
    `<option value="${a.id}">${echapper(a.numeroSerie)}${a.marque || a.modele ? ` — ${echapper([a.marque, a.modele].filter(Boolean).join(' '))}` : ''}</option>`;
  return `<option value="">${memes.length ? `Choisir l’appareil (${memes.length} en stock)…` : 'Aucun de cette catégorie en stock'}</option>
    ${memes.length ? `<optgroup label="${echapper(b.produit)}">${memes.map(opt).join('')}</optgroup>` : ''}
    ${autres.length ? `<optgroup label="Autres appareils en stock">${autres.map(opt).join('')}</optgroup>` : ''}`;
}

function ligneBon(b, v) {
  const jourJ = v.dateVente <= D.aujourdhui;
  const preparation = b.flotteId
    ? `<div class="bo-prep-ligne"><span class="bo-remis">✓ Remis · ${echapper(b.appareil ? b.appareil.numeroSerie : 'appareil')}</span>
       <button type="button" class="bo-mini plein" data-attestation="${b.id}">Attestation</button></div>
       <div class="bo-prep-liens"><button type="button" class="bo-lien" data-annuler-vente="${b.id}">Annuler la remise</button></div>`
    : `<div class="bo-prep-ligne"><select class="input" data-appareil-pour="${b.id}" aria-label="Appareil remis à ${echapper(b.personne)}">${optionsStock(b)}</select>
       <button type="button" class="bo-mini${jourJ ? ' plein' : ''}" data-vendre="${b.id}">Remettre</button></div>
       <div class="bo-prep-liens"><button type="button" class="bo-lien" data-pre-attestation="${b.id}" title="Personne, catégorie et prix ; sans numéro de série">Pré-attestation</button>${estConseiller() ? '' : `<button type="button" class="bo-lien" data-modifier-bon="${b.id}">Modifier le bon</button>`}</div>`;
  const meta = [b.dateNaissance ? `né(e) le ${b.dateNaissance}` : '', b.telephone].filter(Boolean).join(' · ');
  return `<div class="bo-bon${b.flotteId ? ' remis' : ''}" role="row">
    <div class="bo-bon-personne" role="cell"><span class="bo-initiales" aria-hidden="true">${echapper(initiales(b))}</span><div><b>${echapper(b.personne)}</b>${meta ? `<span class="bo-besoins">${echapper(meta)}</span>` : ''}${b.besoins ? `<span class="bo-besoins">${echapper(b.besoins)}</span>` : ''}</div></div>
    <div class="bo-bon-produit" role="cell"><span class="bo-bon-ill">${illuProduit(b.produit, 26)}</span><span>${echapper(b.produit)}</span></div>
    <div role="cell"><span class="bo-mobile-l">Orienté par </span>${echapper(b.referent) || '—'}${b.attesteLe ? `<span class="bo-besoins bo-ok" title="Attestations cochées par la structure le ${new Date(b.attesteLe).toLocaleDateString('fr-FR')}">✓ attestations cochées</span>` : ''}</div>
    <div class="bo-bon-prep" role="cell">${preparation}</div>
  </div>`;
}

function lienMail(v) {
  const sujet = `Vente solidaire du ${dateLongue(v.dateVente)} — vos bons d’orientation`;
  const corps = [
    'Bonjour,',
    '',
    `Nous organisons une vente solidaire d’ordinateurs le ${dateLongue(v.dateVente)}${v.heure ? ` (${v.heure})` : ''}${v.lieu ? `, ${v.lieu}` : ''}.`,
    'Pour y orienter des personnes, remplissez un bon par personne, avec la catégorie d’ordinateur qui lui correspond :',
    lienOrientation(v),
    '',
    `Code d’accès : ${v.codeAcces}`,
    'Les bons sont modifiables jusqu’à la veille de la vente.',
    ...(v.consigne ? ['', v.consigne] : []),
    '',
    'Bien à vous,',
  ].join('\n');
  return `mailto:${encodeURIComponent(v.orienteurEmail || '')}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}

/* ── Fenêtres : vente, bon ── */
function fermerDialogue() {
  const v = document.querySelector('.bo-voile');
  if (v) v.remove();
}
function ouvrirDialogue(html, surOuverture) {
  fermerDialogue();
  const voile = document.createElement('div');
  voile.className = 'bo-voile';
  voile.innerHTML = `<div class="bo-dialogue" role="dialog" aria-modal="true">${html}</div>`;
  voile.addEventListener('click', (e) => {
    if (e.target === voile || e.target.closest('[data-fermer-dialogue]')) fermerDialogue();
  });
  document.body.appendChild(voile);
  if (surOuverture) surOuverture(voile);
  const premier = voile.querySelector('input, select, textarea');
  if (premier) premier.focus();
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fermerDialogue();
});

function dialogueVente(v) {
  ouvrirDialogue(
    `<h2>${v ? 'Modifier la vente' : 'Nouvelle vente à préparer'}</h2>
    <div class="bo-form">
      <div class="field"><label for="dv-date">Date de la vente *</label><input class="input" id="dv-date" type="date" min="${D.aujourdhui}" value="${v ? v.dateVente : ''}"></div>
      <div class="field"><label for="dv-heure">Horaire</label><input class="input" id="dv-heure" maxlength="40" placeholder="14 h – 17 h" value="${v ? echapper(v.heure) : ''}"></div>
      <div class="field bo-large"><label for="dv-lieu">Lieu</label><input class="input" id="dv-lieu" maxlength="200" list="dv-lieux" value="${v ? echapper(v.lieu) : ''}"><datalist id="dv-lieux">${D.lieux.map((l) => `<option value="${echapper(l)}">`).join('')}</datalist></div>
      <div class="field"><label for="dv-orienteur">Structure qui oriente *</label><input class="input" id="dv-orienteur" maxlength="150" placeholder="CCAS de…" value="${v ? echapper(v.orienteur) : ''}"></div>
      <div class="field"><label for="dv-email">Son e-mail</label><input class="input" id="dv-email" type="email" maxlength="200" value="${v ? echapper(v.orienteurEmail) : ''}"></div>
      <div class="field"><label for="dv-conseiller">Conseiller numérique *</label><select class="input" id="dv-conseiller"><option value="">Choisir…</option>${D.equipe
        .map(
          (m) =>
            `<option value="${echapper(m.email)}"${v && v.conseiller === m.email ? ' selected' : ''}>${echapper(m.nom)}${m.role === 'responsable' ? ' (responsable)' : ''}</option>`,
        )
        .join('')}</select></div>
      <div class="field"><label for="dv-places">Nombre de places</label><input class="input" id="dv-places" type="number" min="1" max="500" placeholder="Sans limite" value="${v && v.places ? v.places : ''}"></div>
      <div class="field bo-large"><label for="dv-consigne">Un mot pour la structure</label><textarea class="input" id="dv-consigne" rows="3" maxlength="1000" placeholder="Pièces à apporter, moyens de paiement…">${v ? echapper(v.consigne) : ''}</textarea></div>
    </div>
    <div id="dv-retour" aria-live="polite"></div>
    <div class="bo-actions"><button type="button" class="btn btn-ghost" data-fermer-dialogue>Annuler</button><button type="button" class="btn btn-primary" id="dv-enregistrer">${v ? 'Enregistrer' : 'Créer la vente et son code'}</button></div>`,
    (voile) =>
      voile.querySelector('#dv-enregistrer').addEventListener('click', async function () {
        this.disabled = true;
        const r = await poster({
          action: 'vente-preparer-enregistrer',
          code: codeValide,
          vente: {
            id: v ? v.id : undefined,
            dateVente: $('dv-date').value,
            heure: $('dv-heure').value,
            lieu: $('dv-lieu').value,
            orienteur: $('dv-orienteur').value,
            orienteurEmail: $('dv-email').value,
            conseiller: $('dv-conseiller').value,
            places: $('dv-places').value,
            consigne: $('dv-consigne').value,
          },
        }).catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
        if (!r.ok) {
          this.disabled = false;
          return msg('dv-retour', r.erreur || 'Enregistrement impossible.');
        }
        fermerDialogue();
        filtre = 'avenir';
        await charger();
        if (!v) dialogueCode(venteDe(r.vente.id) || r.vente);
      }),
  );
}

/** Après la création : le code, et le mail prêt à envoyer. */
function dialogueCode(v) {
  ouvrirDialogue(
    `<h2>Vente créée</h2>
    <p>Envoyez ce code à <b>${echapper(v.orienteur)}</b> : avec lui, la structure remplit ses bons d’orientation sur la plateforme, sans compte. Il n’est pas envoyé automatiquement.</p>
    <div class="bo-code" style="margin:6px 0 14px"><code>${echapper(v.codeAcces)}</code><button type="button" class="bo-mini" data-copier-code="${v.id}">Copier le code</button><button type="button" class="bo-mini" data-copier="${v.id}">Copier le lien</button></div>
    <div class="bo-actions"><button type="button" class="btn btn-ghost" data-fermer-dialogue>Fermer</button><a class="btn btn-primary" href="${echapper(lienMail(v))}">Écrire le mail</a></div>`,
  );
}

function dialogueBon(vente, b) {
  ouvrirDialogue(
    `<h2>${b ? `Bon de ${echapper(b.personne)}` : 'Ajouter une personne'}</h2>
    <div class="bo-form">
      <div class="field"><label for="db-prenom">Prénom *</label><input class="input" id="db-prenom" maxlength="80" value="${b ? echapper(b.prenom) : ''}"></div>
      <div class="field"><label for="db-nom">Nom *</label><input class="input" id="db-nom" maxlength="80" value="${b ? echapper(b.nom) : ''}"></div>
      <div class="field"><label for="db-naissance">Date de naissance</label><input class="input" id="db-naissance" type="date" min="1920-01-01" value="${b && b.dateNaissance ? b.dateNaissance.split('/').reverse().join('-') : ''}"></div>
      <div class="field"><label for="db-telephone">Téléphone</label><input class="input" id="db-telephone" type="tel" maxlength="30" value="${b ? echapper(b.telephone) : ''}"></div>
      <div class="field bo-large"><label for="db-produit">Catégorie d’ordinateur *</label><select class="input" id="db-produit"><option value="">Choisir…</option>${D.produits.map((p) => `<option value="${echapper(p.nom)}"${b && b.produit === p.nom ? ' selected' : ''}>${echapper(p.nom)}${p.prix != null ? ` — ${formaterMontant(p.prix)}` : ''}</option>`).join('')}</select></div>
      <div class="field bo-large"><label for="db-besoins">Usages, besoins</label><textarea class="input" id="db-besoins" rows="2" maxlength="1000">${b ? echapper(b.besoins) : ''}</textarea></div>
      <div class="field bo-large"><label for="db-referent">Orienté par</label><input class="input" id="db-referent" maxlength="120" value="${b ? echapper(b.referent) : ''}"></div>
    </div>
    <div id="db-retour" aria-live="polite"></div>
    <div class="bo-actions">${b ? `<button type="button" class="btn btn-ghost" id="db-supprimer" style="margin-right:auto;color:#A3154A">Retirer ce bon</button>` : ''}<button type="button" class="btn btn-ghost" data-fermer-dialogue>Annuler</button><button type="button" class="btn btn-primary" id="db-enregistrer">Enregistrer</button></div>`,
    (voile) => {
      voile.querySelector('#db-enregistrer').addEventListener('click', async function () {
        this.disabled = true;
        const r = await poster({
          action: 'vente-bon-enregistrer',
          code: codeValide,
          bon: {
            id: b ? b.id : undefined,
            venteId: vente.id,
            prenom: $('db-prenom').value,
            nom: $('db-nom').value,
            dateNaissance: $('db-naissance').value,
            telephone: $('db-telephone').value,
            produit: $('db-produit').value,
            besoins: $('db-besoins').value,
            referent: $('db-referent').value,
          },
        }).catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
        if (!r.ok) {
          this.disabled = false;
          return msg('db-retour', r.erreur || 'Enregistrement impossible.');
        }
        fermerDialogue();
        await charger();
      });
      const sup = voile.querySelector('#db-supprimer');
      if (sup)
        sup.addEventListener('click', async () => {
          if (!(await confirmer(`Retirer le bon de ${b.personne} ?`))) return;
          const r = await poster({ action: 'vente-bon-supprimer', code: codeValide, id: b.id }).catch(() => null);
          if (!r || !r.ok) return msg('db-retour', (r && r.erreur) || 'Suppression impossible.');
          fermerDialogue();
          await charger();
        });
    },
  );
}

/* ── Export CSV d'une vente (préparation, liste d'émargement) ── */
function exporter(v) {
  const cellule = (x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`;
  const lignes = [
    [
      'Prénom',
      'Nom',
      'Date de naissance',
      'Téléphone',
      'Catégorie',
      'Usages',
      'Orienté par',
      'Attestations cochées le',
      'Appareil remis',
    ],
    ...v.bons.map((b) => [
      b.prenom,
      b.nom,
      b.dateNaissance,
      b.telephone,
      b.produit,
      b.besoins,
      b.referent,
      b.attesteLe ? new Date(b.attesteLe).toLocaleDateString('fr-FR') : '',
      b.appareil ? b.appareil.numeroSerie : '',
    ]),
  ];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob(['﻿' + lignes.map((l) => l.map(cellule).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }),
  );
  a.download = `vente-${v.dateVente}-${v.orienteur}.csv`.replace(/[^\p{L}\p{N}.-]+/gu, '-');
  a.click();
}

/* ── Actions ── */
document.addEventListener('click', async (e) => {
  const t = (sel) => e.target.closest(sel);
  let el;
  if ((el = t('[data-filtre]'))) {
    filtre = el.dataset.filtre;
    return afficher();
  }
  // Le lien seul (à coller dans la barre d'adresse ou un mail), ou le code seul.
  if ((el = t('[data-copier], [data-copier-code]'))) {
    const v = venteDe(Number(el.dataset.copier || el.dataset.copierCode));
    if (!v) return;
    const texte = el.dataset.copier ? lienOrientation(v) : v.codeAcces;
    if (await copier(texte)) el.textContent = el.dataset.copier ? 'Lien copié ✓' : 'Code copié ✓';
    else alerte(texte);
    return;
  }
  if ((el = t('[data-ajouter-bon]'))) return dialogueBon(venteDe(Number(el.dataset.ajouterBon)), null);
  if ((el = t('[data-modifier-bon]'))) {
    const { bon, vente } = bonDe(Number(el.dataset.modifierBon));
    return bon && dialogueBon(vente, bon);
  }
  if ((el = t('[data-exporter]'))) return exporter(venteDe(Number(el.dataset.exporter)));
  if ((el = t('[data-modifier-vente]'))) return dialogueVente(venteDe(Number(el.dataset.modifierVente)));
  if ((el = t('[data-statut]'))) {
    const v = venteDe(Number(el.dataset.statut));
    el.disabled = true;
    const r = await poster({
      action: 'vente-preparer-statut',
      code: codeValide,
      id: v.id,
      statut: v.statut === 'close' ? 'ouverte' : 'close',
    }).catch(() => null);
    if (!r || !r.ok) alerte((r && r.erreur) || 'Enregistrement impossible.');
    return charger();
  }
  if ((el = t('[data-supprimer-vente]'))) {
    const v = venteDe(Number(el.dataset.supprimerVente));
    const detail = !v.bons.length
      ? ''
      : `${v.bons.length > 1 ? ` Ses ${v.bons.length} bons seront effacés` : ' Son bon sera effacé'} ; les appareils déjà remis restent dans votre flotte.`;
    const prevenir =
      v.conseiller && !passee(v) ? ` ${nomMembre(v.conseiller)} sera prévenu(e) : la vente quitte son calendrier.` : '';
    if (!(await confirmer(`Supprimer la vente du ${dateLongue(v.dateVente)} (${v.orienteur}) ?${detail}${prevenir}`)))
      return;
    const r = await poster({ action: 'vente-preparer-supprimer', code: codeValide, id: v.id }).catch(() => null);
    if (!r || !r.ok) alerte((r && r.erreur) || 'Suppression impossible.');
    else if (prevenir)
      alerte(
        `Vente supprimée. ${nomMembre(v.conseiller)} est prévenu(e) dans ses notifications${r.conseillerPrevenu ? ' et par mail' : ''}.`,
      );
    return charger();
  }
  if ((el = t('[data-pre-attestation]'))) {
    el.disabled = true;
    const r = await poster({
      action: 'vente-bon-pre-attestation',
      code: codeValide,
      id: Number(el.dataset.preAttestation),
    }).catch(() => ({ ok: false, erreur: 'Génération impossible — réessayez.' }));
    el.disabled = false;
    return r.ok ? telecharger(r) : alerte(r.erreur || 'Génération impossible.');
  }
  if ((el = t('[data-vendre]'))) {
    const id = Number(el.dataset.vendre);
    const { bon } = bonDe(id);
    const sel = document.querySelector(`[data-appareil-pour="${id}"]`);
    if (!sel || !sel.value) return alerte('Choisissez d’abord l’appareil remis à la personne.');
    const a = D.stock.find((x) => x.id === Number(sel.value));
    const autre = a && a.produit !== bon.produit ? ` (catégorie différente : ${a.produit})` : '';
    if (
      !(await confirmer(
        `Remettre l’appareil ${a ? a.numeroSerie : ''}${autre} à ${bon.personne} ? Il passe « Remis » dans votre flotte.`,
      ))
    )
      return;
    el.disabled = true;
    const r = await poster({ action: 'vente-bon-vendre', code: codeValide, id, appareilId: Number(sel.value) }).catch(
      () => null,
    );
    if (!r || !r.ok) {
      el.disabled = false;
      return alerte((r && r.erreur) || 'Enregistrement impossible.');
    }
    await charger();
    return;
  }
  if ((el = t('[data-attestation]'))) {
    const { bon } = bonDe(Number(el.dataset.attestation));
    if (!bon || !bon.appareil) return;
    el.disabled = true;
    const r = await poster({
      action: 'flotte-generer-attestation',
      code: codeValide,
      numeroSerie: bon.appareil.numeroSerie,
      nomComplet: bon.personne,
      dateNaissance: bon.dateNaissance,
    }).catch(() => ({ ok: false, erreur: 'Génération impossible — réessayez.' }));
    el.disabled = false;
    return r.ok ? telecharger(r) : alerte(r.erreur || 'Génération impossible.');
  }
  if ((el = t('[data-annuler-vente]'))) {
    const { bon } = bonDe(Number(el.dataset.annulerVente));
    if (!(await confirmer(`Annuler la remise à ${bon.personne} ? L’appareil revient « En stock » dans votre flotte.`)))
      return;
    const r = await poster({ action: 'vente-bon-annuler-vente', code: codeValide, id: bon.id }).catch(() => null);
    if (!r || !r.ok) alerte((r && r.erreur) || 'Annulation impossible.');
    return charger();
  }
});
$('btn-nouvelle-vente').addEventListener('click', () => dialogueVente(null));

/* ── Identification (code structure d'une Interne, ou jeton d'un membre de l'équipe) ── */
async function verifierCode() {
  const code = $('id-code').value.trim();
  if (!code) return msg('retour-id-code', 'Saisissez votre code structure.');
  $('btn-verifier-code').disabled = true;
  $('btn-verifier-code').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  msg('retour-id-code', '');
  try {
    const r = await lireApi({ action: 'check', code });
    if (!r.ok) msg('retour-id-code', r.erreur || 'Code invalide.');
    else if (!r.interne) msg('retour-id-code', 'Les ventes à préparer sont réservées aux structures Interne.');
    else {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-ventes').hidden = false;
      $('btn-deconnexion').hidden = false;
      await charger();
    }
  } catch (e) {
    msg('retour-id-code', 'Connexion impossible. Réessayez.');
  }
  $('btn-verifier-code').disabled = false;
  $('btn-verifier-code').textContent = 'Continuer';
}
$('btn-verifier-code').addEventListener('click', verifierCode);
$('id-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});
$('btn-deconnexion').addEventListener('click', () => {
  oublierCodeStructure();
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
