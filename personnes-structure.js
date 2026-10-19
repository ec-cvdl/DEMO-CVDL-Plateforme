/* Personnes d'une structure (comptes à connexion par e-mail) : liste, ajout, rôle, retrait,
   déconnexion des appareils. Composant partagé par le portail structure et l'admin (fiche
   structure). Préfixe pst-.
   PersonnesStructure.monter(zone, { appel, cible }) : `appel(corps)` → Promise de la réponse
   de l'API ; `cible` = { code } (portail) ou { structureId } (admin). */
window.PersonnesStructure = (() => {
  const dateFr = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  function monter(zone, { appel, cible }) {
    let d = null;
    const msg = (t, erreur) =>
      (zone.querySelector('.pst-retour').innerHTML = t
        ? `<div class="msg ${erreur ? 'msg-erreur' : 'msg-succes'}">${echapper(t)}</div>`
        : '');
    const options = (actuel) =>
      Object.entries(d.roles)
        .map(([v, l]) => `<option value="${v}"${v === actuel ? ' selected' : ''}>${echapper(l)}</option>`)
        .join('');
    function ligne(c) {
      const moi = c.email === d.moi;
      const initiales =
        (c.nom || c.email)
          .split(/[\s.@_-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((x) => x[0].toUpperCase())
          .join('') || '?';
      return `<li class="pst-ligne" data-pst-id="${c.id}">
        <span class="pst-avatar pst-${c.role}" aria-hidden="true">${echapper(initiales)}</span>
        <span class="pst-qui"><b><span class="pst-nom">${echapper(c.nom || c.email)}</span>${moi ? '<span class="pst-moi">vous</span>' : ''}</b>
          <small>${c.nom ? `${echapper(c.email)} · ` : ''}${c.derniereConnexionLe ? `connecté le ${dateFr(c.derniereConnexionLe)}` : 'jamais connecté'}</small></span>
        ${
          d.gerer
            ? `<select class="input pst-role" data-pst-role aria-label="Rôle de ${echapper(c.nom || c.email)}">${options(c.role)}</select>
          <span class="pst-actions"><button type="button" class="btn btn-ghost btn-sm" data-pst-deconnecter title="Ses appareils devront redemander un code">Déconnecter</button><button type="button" class="btn btn-ghost btn-sm" data-pst-retirer>Retirer</button></span>`
            : `<span class="pst-badge pst-${c.role}">${echapper(d.roles[c.role] || c.role)}</span>`
        }
      </li>`;
    }
    function rendre() {
      zone.innerHTML = `<div class="pst">
        <p class="pst-aide">Chaque personne se connecte avec <b>son adresse e-mail</b> : elle reçoit un code à 6 chiffres, puis reste connectée 90 jours sur son appareil. Ses commandes portent son nom. <b>Responsable</b> : gère cette liste ; <b>membre</b> : tout le reste (commander, suivre, flotte, SAV…).</p>
        <ul class="pst-liste">${d.comptes.map(ligne).join('') || '<li class="pst-vide">Personne pour l’instant.</li>'}</ul>
        ${
          d.gerer
            ? `<form class="pst-ajout" novalidate>
          <input class="input" name="nom" placeholder="Prénom Nom" autocomplete="off" aria-label="Nom">
          <input class="input" name="email" type="email" placeholder="adresse@structure.fr" autocomplete="off" aria-label="E-mail" required>
          <select class="input" name="role" aria-label="Rôle">${options('membre')}</select>
          <button type="submit" class="btn btn-primary">Ajouter</button>
        </form>`
            : ''
        }
        <div class="pst-retour" aria-live="polite"></div></div>`;
    }
    async function charger() {
      const r = await appel({ action: 'structure-comptes', ...cible }).catch(() => ({ ok: false }));
      if (!r.ok) {
        zone.innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</div>`;
        return;
      }
      d = r;
      rendre();
    }
    async function agir(corps, succes) {
      const r = await appel({ ...corps, ...cible }).catch(() => ({ ok: false }));
      if (!r.ok) return msg(r.erreur || 'Action impossible.', true);
      await charger();
      if (succes) msg(succes);
    }
    zone.addEventListener('submit', (e) => {
      if (!e.target.closest('.pst-ajout')) return;
      e.preventDefault();
      const f = e.target;
      agir(
        { action: 'structure-compte-enregistrer', nom: f.nom.value, email: f.email.value, role: f.role.value },
        `${f.email.value.trim()} peut se connecter avec son e-mail.`,
      );
    });
    zone.addEventListener('change', (e) => {
      const s = e.target.closest('[data-pst-role]');
      if (!s) return;
      const c = d.comptes.find((x) => x.id === Number(s.closest('[data-pst-id]').dataset.pstId));
      agir(
        { action: 'structure-compte-enregistrer', id: c.id, nom: c.nom, email: c.email, role: s.value },
        'Rôle modifié.',
      );
    });
    zone.addEventListener('click', (e) => {
      const l = e.target.closest('[data-pst-id]');
      if (!l) return;
      const c = d.comptes.find((x) => x.id === Number(l.dataset.pstId));
      if (e.target.closest('[data-pst-retirer]') && confirm(`Retirer l’accès de ${c.nom || c.email} ?`))
        agir({ action: 'structure-compte-retirer', id: c.id }, 'Accès retiré.');
      if (
        e.target.closest('[data-pst-deconnecter]') &&
        confirm(`Déconnecter ${c.nom || c.email} de tous ses appareils ?`)
      )
        agir({ action: 'structure-compte-deconnecter', id: c.id }, 'Ses appareils devront redemander un code.');
    });
    zone.innerHTML = '<p class="pst-aide">Chargement…</p>';
    charger();
  }
  return { monter };
})();
