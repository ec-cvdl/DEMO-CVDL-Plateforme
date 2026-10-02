/* ════════════════════════════════════════════════════════════════════════════════════
   sav-fil-admin.js — « Échanges » dans la fiche SAV de l'admin.
   · Répondre (la plateforme prévient la personne / la structure par e-mail, sans le contenu) ;
   · « Demander l'adresse d'envoi » → formulaire côté personne / structure ;
   · adresse reçue : structure affichée ; personne via « Afficher les coordonnées » (tracé) ;
   · bon Colissimo : dépôt du PDF (sans API Colissimo) → « Bon prêt » dans le fil, adresse effacée.
   Pas de réponses types : on garde un échange humain.
   S'appuie sur les fonctions globales de l'admin (admin/*.js) et identite-admin.js.
   ════════════════════════════════════════════════════════════════════════════════════ */
const sfa = { fils: {}, brouillons: {}, chargement: {} };

async function sfaCharger(ligne) {
  if (sfa.chargement[ligne]) return;
  sfa.chargement[ligne] = true;
  const r = await poster({ action: 'sav-fil-admin', ligne });
  sfa.chargement[ligne] = false;
  sfa.fils[ligne] = r;
  const s = (state.sav || []).find((x) => x.ligne === ligne);
  if (s && s.fil && r.ok) s.fil.nonLusAdmin = 0;
  if (state.modal && state.modal.kind === 'sav' && !sfaEnSaisie()) render();
}
function filSavAdminInvalider(ligne) {
  delete sfa.fils[ligne];
}
const sfaEnSaisie = () => {
  const a = document.activeElement;
  return !!(a && a.closest && a.closest('.sfa'));
};
const sfaPar = () => {
  try {
    return localStorage.getItem('cvdl-idr-par') || '';
  } catch (e) {
    return '';
  }
};

function sfaHeure(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return (
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' · ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
}

/** Bloc « Échanges » de la fiche SAV (appelé par admin/17-dossier-sav.js). */
function blocFilSavAdmin(s) {
  const r = sfa.fils[s.ligne];
  if (!r) {
    sfaCharger(s.ligne);
    return `<div class="sfa"><div class="sfa-tete"><h3>Échanges</h3></div><p class="sfa-muet">Chargement…</p></div>`;
  }
  if (!r.ok)
    return `<div class="sfa"><div class="sfa-tete"><h3>Échanges</h3></div><p class="sfa-muet">${echapper(r.erreur || 'Échanges indisponibles (migration 006 appliquée ?)')}</p></div>`;
  const perso = r.avec === 'personne';
  const nomAutre = perso ? (s.nom && !s.code ? s.nom : 'Personne') : s.responsableSav || s.structureNom || 'Structure';
  const rv = perso ? identiteRevelee('sav', s.ligne) : null;
  const adr = perso ? rv && rv.contact && rv.contact.adresse : r.adresse;
  const messages = r.fil
    .map((m) => {
      if (m.type === 'statut')
        return `<span class="sf-evt"><i></i>${echapper(m.texte)} · ${echapper(sfaHeure(m.date))}</span>`;
      if (m.type === 'note')
        return `<div class="sfa-note"><span class="sf-qui">Note interne · ${echapper(m.par || 'Équipe')}</span>${echapper(m.texte || '').replace(/\n/g, '<br>')}<small>${echapper(sfaHeure(m.date))}</small></div>`;
      if (m.type !== 'message')
        return `<span class="sf-evt"><i></i>${echapper(m.texte)}${m.type === 'bon' && m.pieceJointe ? ` · <a href="${echapper(urlSure(m.pieceJointe))}" target="_blank" rel="noopener">PDF</a>` : ''} · ${echapper(sfaHeure(m.date))}</span>`;
      const equipe = m.auteur === 'admin';
      const qui = equipe
        ? `Équipe${m.par ? ' · ' + m.par : ''}`
        : m.auteur === 'structure'
          ? m.par || s.structureNom || 'Structure'
          : nomAutre;
      return `<div class="sf-bul ${equipe ? 'moi' : 'eux'}"><span class="sf-qui">${echapper(qui)}</span>${echapper(m.texte || '').replace(/\n/g, '<br>')}${m.pieceJointe ? `<a class="sf-pj" href="${echapper(urlSure(m.pieceJointe))}" target="_blank" rel="noopener">${icon('file', 13)}Photo jointe</a>` : ''}<small>${echapper(sfaHeure(m.date))}</small></div>`;
    })
    .join('');
  const aucunMessage = r.fil.every((m) => m.type === 'statut');
  const etapeColis = s.bonColissimo
    ? `<span class="sfa-chip ok">${icon('check', 12)}Bon Colissimo envoyé</span>`
    : r.adresseRecue
      ? `<span class="sfa-chip ok">${icon('check', 12)}Adresse reçue${perso && !adr ? ' · masquée' : ''}</span>
         <label class="sfa-chip">${icon('plus', 12)}Déposer le bon (PDF)<input type="file" accept="application/pdf,.pdf" data-sav-bon-colissimo="${s.ligne}" hidden></label>`
      : r.adresseDemandee
        ? `<span class="sfa-chip attente">${icon('clock', 12)}Adresse demandée, en attente</span>`
        : `<button type="button" class="sfa-chip" data-sfa-adresse="${s.ligne}">${icon('truck', 12)}Demander l’adresse d’envoi</button>`;
  return `<div class="sfa">
    <div class="sfa-tete"><h3>Échanges avec ${perso ? 'la personne' : 'la structure'}</h3>${r.peutPrevenir ? '' : '<span class="sfa-alerte">Pas d’e-mail : la personne ne sera pas prévenue</span>'}</div>
    <div class="sfa-actions">${etapeColis}</div>
    ${
      r.adresseRecue && !s.bonColissimo
        ? adr
          ? `<div class="sfa-adr">${icon('truck', 14)}<span><b>${echapper(adr.nom || '')}</b><br>${echapper(adr.adresse || '')}${adr.codePostal ? '<br>' + echapper(adr.codePostal + ' ' + (adr.ville || '')) : ''}${adr.telephone ? '<br>' + echapper(adr.telephone) : ''}</span></div>`
          : perso
            ? `<div class="sfa-adr masque">${icon('truck', 14)}<span>Adresse masquée : utile seulement pour créer l’étiquette sur le site Colissimo.</span>${boutonIdentite('sav', s.ligne, 'Afficher l’adresse')}</div>`
            : ''
        : ''
    }
    <div class="sf-msgs sfa-msgs">${messages}${aucunMessage ? '<p class="sfa-muet">Aucun message pour l’instant.</p>' : ''}</div>
    <form class="sfa-compo" data-sfa-form="${s.ligne}">
      <textarea class="input" name="texte" rows="3" maxlength="3000" placeholder="Répondre à ${perso ? 'la personne' : 'la structure'}…">${echapper(sfa.brouillons[s.ligne] || '')}</textarea>
      <div class="sfa-bas"><span class="sfa-mention">${perso ? 'Prévenue par e-mail, son adresse n’est jamais affichée ici.' : 'Prévenue par e-mail.'}</span><button type="submit" class="btn btn-primary">Envoyer</button></div>
      <div class="sfa-err" role="alert"></div>
    </form>
  </div>`;
}

/** Pastille « non lu » sur les cartes SAV. */
function pastilleFilSav(s) {
  const n = s && s.fil && s.fil.nonLusAdmin;
  return n
    ? `<span class="sfa-pastille" title="${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}">${icon('mail', 11)}${n}</span>`
    : '';
}

document.addEventListener('input', (e) => {
  const f = e.target.closest && e.target.closest('[data-sfa-form]');
  if (f && e.target.name === 'texte') sfa.brouillons[f.dataset.sfaForm] = e.target.value;
});
document.addEventListener('submit', async (e) => {
  const f = e.target.closest && e.target.closest('[data-sfa-form]');
  if (!f) return;
  e.preventDefault();
  const ligne = +f.dataset.sfaForm;
  const texte = f.elements.texte.value.trim();
  const err = f.querySelector('.sfa-err');
  if (!texte) {
    err.textContent = 'Le message est vide.';
    return;
  }
  let par = sfaPar();
  if (!par && typeof demanderCvdl === 'function') {
    par = String(
      (await demanderCvdl('Votre prénom (affiché seulement dans l’admin) :', { requis: true })) || '',
    ).trim();
    if (par)
      try {
        localStorage.setItem('cvdl-idr-par', par);
      } catch (x) {}
  }
  const b = f.querySelector('[type="submit"]');
  b.disabled = true;
  const r = await poster({ action: 'sav-fil-repondre', ligne, texte, par });
  b.disabled = false;
  if (!r.ok) {
    err.textContent = r.erreur || 'Envoi impossible.';
    return;
  }
  delete sfa.brouillons[ligne];
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  etat('Réponse envoyée', 'succes');
  await sfaCharger(ligne);
});
document.addEventListener('click', async (e) => {
  const a = e.target.closest && e.target.closest('[data-sfa-adresse]');
  if (!a) return;
  const ligne = +a.dataset.sfaAdresse;
  if (
    !(await confirmerCvdl(
      'Demander l’adresse d’envoi ?\nLa personne ou la structure la renseigne sur sa page de suivi, et elle est prévenue par e-mail.',
      { ok: 'Demander' },
    ))
  )
    return;
  const r = await posterEtat(
    { action: 'sav-fil-demander-adresse', ligne, par: sfaPar() },
    'Envoi…',
    'Adresse demandée',
  );
  if (r && r.ok) sfaCharger(ligne);
});
// Nouveaux messages quand la fiche est ouverte (hors saisie).
setInterval(() => {
  if (document.hidden || !state.modal || state.modal.kind !== 'sav' || sfaEnSaisie()) return;
  const s = (state.sav || []).find((x) => x.reference === state.modal.ref);
  if (s) sfaCharger(s.ligne);
}, 30000);
