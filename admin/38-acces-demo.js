/* ════════════════════════════════════════════════════════════════════════════════════
   38-acces-demo.js — onglet « Accès démo » : codes d'essai envoyés aux structures.
   Une structure saisit son code sur la page d'accueil (« Essayer la plateforme ») et découvre
   la démo sur sa seule vue. Le code n'est affiché qu'une fois, à la création.
   Routes : src/routes/accesDemo.js.
   ════════════════════════════════════════════════════════════════════════════════════ */
const acd = {
  charge: false,
  chargement: false,
  d: null,
  saisie: { structure: '', email: '', vue: 'rn', jours: 30, envoyer: true },
  dernier: null, // { code, structure, envoye } : montré juste après la création
};

async function acdCharger(forcer) {
  if (acd.chargement || (acd.charge && !forcer)) return;
  acd.chargement = true;
  const r = await poster({ action: 'acces-demo-lister' }).catch(() => null);
  acd.chargement = false;
  if (r && r.ok) {
    acd.d = r;
    acd.charge = true;
  } else etat((r && r.erreur) || 'Chargement impossible', 'erreur');
  if (state.activeTab === 'acces-demo') render();
}

function vueAccesDemo() {
  const entete = `<h1 style="font-size:32px;margin-bottom:var(--space-2)">Accès démo</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-5);font-size:15px">Invitez une structure à essayer CVDL : elle reçoit un code par e-mail, le saisit sur la page d’accueil (« Essayer la plateforme ») et découvre la démo sur sa seule vue, avec des données fictives.</p>${
      /-demo$/.test(API)
        ? '<div class="msg msg-info" style="margin-bottom:var(--space-5)">Vous êtes sur la plateforme de démonstration : les codes créés ici servent à tester. Ils fonctionnent sur la page d’accueil (« Essayer la plateforme ») jusqu’à la prochaine remise à zéro de la démo, et aucun e-mail n’est envoyé. Les codes à transmettre aux structures se créent dans l’administration réelle.</div>'
        : ''
    }`;
  if (!acd.charge) {
    acdCharger();
    return entete + '<p class="rta-muet">Chargement…</p>';
  }
  const d = acd.d;
  const s = acd.saisie;
  const date = (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—');
  const ETATS = { actif: 'Actif', expire: 'Expiré', desactive: 'Désactivé' };
  const dernier = acd.dernier
    ? `<div class="acd-code">
        <div><b>Code pour ${echapper(acd.dernier.structure)}</b><span>${acd.dernier.envoye ? 'Envoyé par e-mail.' : 'Pas envoyé par e-mail : transmettez-le vous-même.'} Il ne sera plus affiché ensuite.</span></div>
        <code>${echapper(acd.dernier.code)}</code>
        <button type="button" class="btn btn-secondary" data-acd-copier>${icon('copie', 14)}Copier</button>
      </div>`
    : '';
  return `${entete}
    <section class="rta-bloc">
      <h2>Inviter une structure</h2>
      <form class="eqa-form" id="acd-form">
        <label>Structure<input class="input" name="structure" required maxlength="120" placeholder="Association Le Tremplin" value="${echapper(s.structure)}"></label>
        <label>E-mail du contact<input class="input" name="email" type="email" required maxlength="200" placeholder="contact@structure.fr" value="${echapper(s.email)}"></label>
        <label>Vue<select class="input" name="vue">${Object.entries(d.vues)
          .map(([k, l]) => `<option value="${k}"${s.vue === k ? ' selected' : ''}>${echapper(l)}</option>`)
          .join('')}</select></label>
        <label>Valable (jours)<input class="input" name="jours" type="number" min="1" max="90" value="${echapper(String(s.jours))}"></label>
        <label class="acd-case"><input type="checkbox" name="envoyer" ${s.envoyer ? 'checked' : ''}> Envoyer le code par e-mail</label>
        <button class="btn btn-primary" type="submit">${icon('key', 14)}Créer le code</button>
      </form>
      ${dernier}
    </section>
    <section class="rta-bloc">
      <h2>Codes · ${d.acces.length}</h2>
      ${
        d.acces.length
          ? `<table class="rta-table"><thead><tr><th>Structure</th><th>Vue</th><th>Créé le</th><th>Expire le</th><th>Ouvertures</th><th>État</th><th></th></tr></thead><tbody>
        ${d.acces
          .map(
            (a) => `<tr class="${a.etat === 'actif' ? '' : 'eqa-off'}">
          <td><b>${echapper(a.structure)}</b><br><small class="rta-muet">${echapper(a.email)}</small></td>
          <td>${echapper(a.libelleVue || a.vue)}</td>
          <td>${date(a.date)}</td><td>${date(a.expireLe)}</td>
          <td>${a.utilisations}${a.derniereUtilisation ? `<br><small class="rta-muet">dernière : ${date(a.derniereUtilisation)}</small>` : ''}</td>
          <td>${ETATS[a.etat] || ''}</td>
          <td>${a.etat === 'expire' ? '' : `<button type="button" class="btn btn-secondary" data-acd-id="${a.id}" data-acd-off="${a.desactive ? '' : '1'}">${a.desactive ? 'Réactiver' : 'Désactiver'}</button>`}</td></tr>`,
          )
          .join('')}
      </tbody></table>`
          : '<p class="rta-muet">Aucun code pour l’instant.</p>'
      }
    </section>`;
}

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'acd-form') return;
  e.preventDefault();
  const f = e.target;
  acd.saisie = {
    structure: f.structure.value.trim(),
    email: f.email.value.trim(),
    vue: f.vue.value,
    jours: parseInt(f.jours.value, 10) || 30,
    envoyer: f.envoyer.checked,
  };
  const r = await posterEtat(Object.assign({ action: 'acces-demo-creer' }, acd.saisie), 'Création…', 'Code créé');
  if (!r || !r.ok) return;
  if (acd.saisie.envoyer && !r.envoye) etat('Code créé, mais l’e-mail n’a pas pu partir : copiez-le.', 'erreur');
  acd.dernier = { code: r.code, structure: acd.saisie.structure, envoye: r.envoye };
  acd.saisie = { structure: '', email: '', vue: acd.saisie.vue, jours: 30, envoyer: true };
  await acdCharger(true);
});
document.addEventListener('click', async (e) => {
  if (state.activeTab !== 'acces-demo') return;
  if (e.target.closest('[data-acd-copier]') && acd.dernier) return copierTexte(acd.dernier.code, 'Code copié');
  const b = e.target.closest('[data-acd-id]');
  if (!b) return;
  const off = b.dataset.acdOff === '1';
  if (
    off &&
    !(await confirmerCvdl('Désactiver ce code ?\nIl ne permettra plus d’ouvrir la démo.', {
      ok: 'Désactiver',
      danger: true,
    }))
  )
    return;
  const r = await posterEtat(
    { action: 'acces-demo-desactiver', id: b.dataset.acdId, desactive: off },
    'Enregistrement…',
    off ? 'Code désactivé' : 'Code réactivé',
  );
  if (r && r.ok) acdCharger(true);
});
