/* ════════════════════════════════════════════════════════════════════════════════════
   equipe-admin.js — onglet « Équipe » de l'admin : comptes Google Workspace de l'équipe.
   · Rôle « Logistique » : accès à l'espace support.html (SAV et commandes) uniquement (vérifié par le serveur) ;
   · Rôle « Admin » : national (tout, dont cet onglet) ou régional (chargé·e de distribution).
   · Territoire attribué avant l'arrivée : « National » ou une ou plusieurs régions ; la personne
     complète son profil à la première connexion (embarquement-equipe.js). Comptabilité : nationale.
   · Désactiver un compte coupe l'accès immédiatement (le compte est revérifié à chaque requête).
   Routes : src/routes/comptes.js. S'appuie sur les fonctions globales de l'admin (admin/*.js).
   ════════════════════════════════════════════════════════════════════════════════════ */
const AJOUT_VIDE = () => ({ email: '', nom: '', role: 'sav', national: false, regions: [] });
const eqa = { charge: false, chargement: false, d: null, ajout: AJOUT_VIDE(), ouvert: '' };

/** Choix du territoire (national ou régions) ; `prefixe` distingue le formulaire d'ajout des lignes. */
function eqaTerritoire(c, prefixe) {
  if (c.role === 'compta') return '<span class="eqa-terr-note">Nationale (comptabilité)</span>';
  return `<div class="eqa-terr" data-eqa-terr="${echapper(prefixe)}">
    <label class="eqa-nat"><input type="checkbox" data-eqa-national ${c.national ? 'checked' : ''} ${c.role === 'admin' && !eqa.d.gereNationaux ? 'disabled title="Seul un super admin nomme un admin national"' : ''}> National</label>
    <div class="eqa-regions"${c.national ? ' hidden' : ''}>${eqa.d.regions
      .filter((r) => r !== 'National')
      .map(
        (r) =>
          `<label class="eqa-region${c.regions.includes(r) ? ' on' : ''}"><input type="checkbox" value="${echapper(r)}" ${c.regions.includes(r) ? 'checked' : ''}>${echapper(r)}</label>`,
      )
      .join('')}</div></div>`;
}
const libelleRole = (c) =>
  c.role === 'admin' ? (c.national ? 'Admin national' : 'Chargé·e de distribution') : eqa.d.roles[c.role] || c.role;
const resumeTerritoire = (c) =>
  c.national || c.role === 'compta' ? 'National' : c.regions.length ? c.regions.join(', ') : 'Aucune région';
/** Ligne non modifiable : super admin (configuration du serveur), ou admin national pour qui
 *  n'est pas super admin (regles/equipe.js côté serveur). */
const verrouille = (c) => c.superAdmin || (c.role === 'admin' && c.national && !eqa.d.gereNationaux);
/** Lit le choix de territoire d'un bloc .eqa-terr. */
function lireTerritoire(bloc) {
  if (!bloc) return { national: true, regions: [] };
  const national = bloc.querySelector('[data-eqa-national]').checked;
  return {
    national,
    regions: national ? [] : [...bloc.querySelectorAll('.eqa-regions input:checked')].map((i) => i.value),
  };
}

async function eqaCharger(forcer) {
  if (eqa.chargement || (eqa.charge && !forcer)) return;
  eqa.chargement = true;
  const r = await lireApi({ action: 'comptes-lister' });
  eqa.chargement = false;
  if (r && r.ok) {
    eqa.d = r;
    eqa.charge = true;
  } else etat((r && r.erreur) || 'Chargement impossible', 'erreur');
  if (state.activeTab === 'equipe') render();
}

function vueEquipe() {
  const entete = `<h1 style="font-size:32px;margin-bottom:var(--space-2)">Équipe</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-5);font-size:15px">Qui peut se connecter avec son compte Google, et à quoi. L’espace Logistique (SAV et commandes) est à l’adresse <a href="support.html" target="_blank" rel="noopener">support.html</a>.</p>`;
  if (!eqa.charge) {
    eqaCharger();
    return entete + '<p class="rta-muet">Chargement…</p>';
  }
  const d = eqa.d;
  const date = (v) => {
    const x = new Date(v);
    return v && !isNaN(x)
      ? x.toLocaleDateString('fr-FR') + ' ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : 'jamais';
  };
  const dom = (d.domaines || [])[0] || 'emmaus-connect.org';
  return `${entete}
    ${d.googleConfigure ? '' : `<div class="eqa-alerte">${icon('alert', 16)}<span><b>Connexion Google pas encore configurée.</b> Crée un identifiant OAuth « Application Web » dans la console Google Cloud (origine autorisée : l’adresse du site), puis ajoute <code>GOOGLE_CLIENT_ID</code> dans env-vars.yaml ou dans l’onglet Config.</span></div>`}
    <section class="rta-bloc">
      <h2>Ajouter une personne</h2>
      <form class="eqa-form" id="eqa-form">
        <label>E-mail<input class="input" name="email" type="email" required placeholder="prenom.nom@${echapper(dom)}" value="${echapper(eqa.ajout.email)}"></label>
        <label>Nom affiché<input class="input" name="nom" required maxlength="60" placeholder="Camille Martin" value="${echapper(eqa.ajout.nom)}"></label>
        <label>Rôle<select class="input" name="role">${Object.entries(d.roles)
          .map(([k, l]) => `<option value="${k}"${eqa.ajout.role === k ? ' selected' : ''}>${echapper(l)}</option>`)
          .join('')}</select></label>
        <div class="eqa-large"><span class="eqa-lab">Territoire <em>(${eqa.ajout.role === 'admin' ? 'National = admin national ; une ou plusieurs régions = chargé·e de distribution' : 'ce qu’elle verra'})</em></span>${eqaTerritoire(eqa.ajout, 'ajout')}</div>
        <button class="btn btn-primary" type="submit">${icon('plus', 14)}Ajouter</button>
      </form>
      <p class="rta-aide">Seules les adresses @${echapper(dom)} sont acceptées. La personne se connecte ensuite avec « Se connecter avec Google », sans mot de passe à retenir ; à sa première connexion, elle complète son profil (prénom, nom, e-mail des notifications). Pour une structure Interne, son responsable s’ajoute dans la fiche de la structure, puis gère lui-même son équipe.</p>
    </section>
    <section class="rta-bloc">
      <h2>Comptes · ${d.comptes.length}</h2>
      ${
        d.comptes.length
          ? `<table class="rta-table eqa-table"><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Territoire</th><th>Dernière connexion</th><th>Accès</th></tr></thead><tbody>
        ${d.comptes
          .map(
            (c) => `<tr class="${c.actif ? '' : 'eqa-off'}">
          <td><b>${echapper(c.nom)}</b>${c.superAdmin ? '<span class="eqa-super">Super admin</span>' : ''}${c.embarqueLe ? '' : '<small class="eqa-attente">Pas encore connecté·e</small>'}</td><td>${echapper(c.email)}</td>
          <td><select class="input eqa-role" data-eqa-role="${echapper(c.email)}" aria-label="Rôle" ${verrouille(c) ? 'disabled' : ''}>${Object.entries(
            d.roles,
          )
            .map(([k, l]) => `<option value="${k}"${c.role === k ? ' selected' : ''}>${echapper(l)}</option>`)
            .join('')}</select><small class="eqa-role-lib">${echapper(libelleRole(c))}</small></td>
          <td class="eqa-td-terr">${
            eqa.ouvert === c.email
              ? `${eqaTerritoire(c, c.email)}<div class="eqa-terr-actions"><button type="button" class="btn btn-primary" data-eqa-terr-ok="${echapper(c.email)}">Enregistrer</button><button type="button" class="btn btn-ghost" data-eqa-terr-annuler>Annuler</button></div>`
              : `<span>${echapper(resumeTerritoire(c))}</span>${c.role === 'compta' || verrouille(c) ? '' : ` <button type="button" class="eqa-lien" data-eqa-terr-ouvrir="${echapper(c.email)}">Modifier</button>`}`
          }</td>
          <td>${echapper(date(c.derniereConnexion))}</td>
          <td>${verrouille(c) ? `<small class="eqa-terr-note">${c.superAdmin ? 'Réglé dans la configuration du serveur' : 'Réservé aux super admins'}</small>` : `<button type="button" class="btn btn-secondary" data-eqa-actif="${echapper(c.email)}" data-etat="${c.actif ? '1' : ''}">${c.actif ? 'Désactiver' : 'Réactiver'}</button>`}</td></tr>`,
          )
          .join('')}
      </tbody></table>`
          : '<p class="rta-muet">Aucun compte pour l’instant.</p>'
      }
    </section>
    <section class="rta-bloc">
      <h2>Historique des changements</h2>
      ${
        (d.historique || []).length
          ? `<ul class="eqa-histo">${d.historique
              .map(
                (h) =>
                  `<li><time>${echapper(h.date)}</time><b>${echapper(h.reference)}</b><span>${echapper(h.evenement)}</span><small>par ${echapper(h.auteur)}</small></li>`,
              )
              .join('')}</ul>`
          : '<p class="rta-muet">Aucun changement enregistré pour l’instant.</p>'
      }
      <p class="rta-aide">Chaque changement est aussi envoyé par e-mail aux super admins (variable <code>SUPER_ADMINS</code> du serveur).</p>
    </section>`;
}

async function eqaEnregistrer(c) {
  const r = await posterEtat(
    Object.assign({ action: 'compte-enregistrer' }, c),
    'Enregistrement…',
    'Compte enregistré',
  );
  if (r && r.ok) await eqaCharger(true);
  return r;
}
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'eqa-form') return;
  e.preventDefault();
  const f = e.target;
  eqa.ajout = {
    email: f.email.value.trim(),
    nom: f.nom.value.trim(),
    role: f.role.value,
    ...lireTerritoire(f.querySelector('.eqa-terr')),
  };
  const r = await eqaEnregistrer(eqa.ajout);
  if (r && r.ok) eqa.ajout = AJOUT_VIDE();
  render();
});
const champsCompte = (c) => ({
  email: c.email,
  nom: c.nom,
  role: c.role,
  actif: c.actif,
  national: c.national,
  regions: c.regions,
});
document.addEventListener('change', (e) => {
  if (state.activeTab !== 'equipe' || !e.target.closest) return;
  // Territoire : la liste des régions se masque pour « National » ; puces cochées en couleur.
  const terr = e.target.closest('.eqa-terr');
  if (terr) {
    if (e.target.matches('[data-eqa-national]')) terr.querySelector('.eqa-regions').hidden = e.target.checked;
    else e.target.closest('.eqa-region').classList.toggle('on', e.target.checked);
    return;
  }
  if (e.target.closest('#eqa-form') && e.target.name === 'role') {
    const f = e.target.form;
    eqa.ajout = {
      ...eqa.ajout,
      email: f.email.value.trim(),
      nom: f.nom.value.trim(),
      role: e.target.value,
      ...lireTerritoire(f.querySelector('.eqa-terr')),
    };
    render();
    return;
  }
  const s = e.target.closest('[data-eqa-role]');
  if (!s) return;
  const c = eqa.d.comptes.find((x) => x.email === s.dataset.eqaRole);
  if (c) eqaEnregistrer({ ...champsCompte(c), role: s.value });
});
document.addEventListener('click', async (e) => {
  if (state.activeTab !== 'equipe') return;
  const ouvrir = e.target.closest('[data-eqa-terr-ouvrir]');
  if (ouvrir || e.target.closest('[data-eqa-terr-annuler]')) {
    eqa.ouvert = ouvrir ? ouvrir.dataset.eqaTerrOuvrir : '';
    render();
    return;
  }
  const ok = e.target.closest('[data-eqa-terr-ok]');
  if (ok) {
    const c = eqa.d.comptes.find((x) => x.email === ok.dataset.eqaTerrOk);
    const r = await eqaEnregistrer({
      ...champsCompte(c),
      ...lireTerritoire(ok.closest('td').querySelector('.eqa-terr')),
    });
    if (r && r.ok) eqa.ouvert = '';
    render();
    return;
  }
  const b = e.target.closest('[data-eqa-actif]');
  if (!b) return;
  const c = eqa.d.comptes.find((x) => x.email === b.dataset.eqaActif);
  if (!c) return;
  if (
    c.actif &&
    !(await confirmerCvdl(
      `Désactiver ${c.nom} ?\nSon accès est coupé immédiatement. Ses réponses et notes restent signées à son nom.`,
      { ok: 'Désactiver', danger: true },
    ))
  )
    return;
  eqaEnregistrer({ ...champsCompte(c), actif: !c.actif });
});
