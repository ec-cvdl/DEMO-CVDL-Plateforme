/* ════════════════════════════════════════════════════════════════════════════════════
   equipe-admin.js — onglet « Équipe » de l'admin : comptes Google Workspace de l'équipe.
   · Rôle « Support SAV » : accès à l'outil support.html uniquement (vérifié par le serveur) ;
   · Rôle « Admin » : tout.
   · Désactiver un compte coupe l'accès immédiatement (le compte est revérifié à chaque requête).
   Routes : src/routes/comptes.js. S'appuie sur les fonctions globales de l'admin (admin/*.js).
   ════════════════════════════════════════════════════════════════════════════════════ */
const eqa = { charge: false, chargement: false, d: null, ajout: { email: '', nom: '', role: 'sav' } };

async function eqaCharger(forcer) {
  if (eqa.chargement || (eqa.charge && !forcer)) return;
  eqa.chargement = true;
  const r = await jsonp({ action: 'comptes-lister', password: motDePasse });
  eqa.chargement = false;
  if (r && r.ok) {
    eqa.d = r;
    eqa.charge = true;
  } else etat((r && r.erreur) || 'Chargement impossible', 'erreur');
  if (state.activeTab === 'equipe') render();
}

function vueEquipe() {
  const entete = `<h1 style="font-size:32px;margin-bottom:var(--space-2)">Équipe</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-5);font-size:15px">Qui peut se connecter avec son compte Google, et à quoi. L’outil Support SAV est à l’adresse <a href="support.html" target="_blank" rel="noopener">support.html</a>.</p>`;
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
        <button class="btn btn-primary" type="submit">${icon('plus', 14)}Ajouter</button>
      </form>
      <p class="rta-aide">Seules les adresses @${echapper(dom)} sont acceptées. La personne se connecte ensuite avec « Se connecter avec Google », sans mot de passe à retenir.</p>
    </section>
    <section class="rta-bloc">
      <h2>Comptes · ${d.comptes.length}</h2>
      ${
        d.comptes.length
          ? `<table class="rta-table eqa-table"><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Dernière connexion</th><th>Accès</th></tr></thead><tbody>
        ${d.comptes
          .map(
            (c) => `<tr class="${c.actif ? '' : 'eqa-off'}">
          <td><b>${echapper(c.nom)}</b></td><td>${echapper(c.email)}</td>
          <td><select class="input eqa-role" data-eqa-role="${echapper(c.email)}">${Object.entries(d.roles)
            .map(([k, l]) => `<option value="${k}"${c.role === k ? ' selected' : ''}>${echapper(l)}</option>`)
            .join('')}</select></td>
          <td>${echapper(date(c.derniereConnexion))}</td>
          <td><button type="button" class="btn btn-secondary" data-eqa-actif="${echapper(c.email)}" data-etat="${c.actif ? '1' : ''}">${c.actif ? 'Désactiver' : 'Réactiver'}</button></td></tr>`,
          )
          .join('')}
      </tbody></table>`
          : '<p class="rta-muet">Aucun compte pour l’instant.</p>'
      }
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
  eqa.ajout = { email: f.email.value.trim(), nom: f.nom.value.trim(), role: f.role.value };
  const r = await eqaEnregistrer(eqa.ajout);
  if (r && r.ok) eqa.ajout = { email: '', nom: '', role: 'sav' };
  render();
});
document.addEventListener('change', (e) => {
  const s = e.target.closest && e.target.closest('[data-eqa-role]');
  if (!s) return;
  const c = eqa.d.comptes.find((x) => x.email === s.dataset.eqaRole);
  if (c) eqaEnregistrer({ email: c.email, nom: c.nom, role: s.value, actif: c.actif });
});
document.addEventListener('click', async (e) => {
  if (state.activeTab !== 'equipe') return;
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
  eqaEnregistrer({ email: c.email, nom: c.nom, role: c.role, actif: !c.actif });
});
