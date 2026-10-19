/* Onglet « À faire » de projet.html (admin seulement) : liste des choses à faire du projet, par
   thème (sécurité, fonctionnalité, bug, suggestion, technique, mise en production) et priorité.
   Routes : a-faire, a-faire-enregistrer, a-faire-supprimer, a-faire-ignorer (src/routes/aFaire.js).
   Propositions automatiques (encadré « Proposées ») : suites des mises à jour (« Suites : » du
   CHANGELOG), failles ouvertes de l'audit (servies par /a-faire) et KO / remarques de la recette
   (lus sur le serveur de démo) ; « Ajouter » ouvre la fiche préremplie, « Ignorer » l'écarte.
   AFaireProjet.rendre(zone, appel) ; le panneau d'édition est celui de projet.js
   (ouvrirPanneau, seg, valeurSeg, toast). */
window.AFaireProjet = (function () {
  const A = {
    zone: null,
    appel: null,
    taches: [],
    themes: {},
    priorites: {},
    statuts: {},
    theme: '',
    vue: 'ouvertes',
    propositions: [],
    recette: [],
    toutesProps: false,
  };
  const COULEUR_THEME = {
    securite: '#e5484d',
    fonctionnalite: '#00acb0',
    bug: '#e62460',
    suggestion: '#6338f5',
    technique: '#002743',
    production: '#d97706',
  };
  const ouverte = (t) => t.statut === 'a-faire' || t.statut === 'en-cours';
  const date = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '');

  async function charger() {
    const r = await A.appel('a-faire');
    if (!r.ok) {
      A.zone.innerHTML = `<p class="af-vide">${echapper(r.erreur || 'Liste indisponible.')}</p>`;
      return false;
    }
    Object.assign(A, {
      taches: r.taches,
      themes: r.themes,
      priorites: r.priorites,
      statuts: r.statuts,
      propositions: r.propositions || [],
    });
    const deja = new Set(r.traitees || []);
    A.recette = (await propositionsRecette()).filter((p) => !deja.has(p.source));
    return true;
  }

  /** KO / bloqués (dernier résultat d'un cas) et remarques de la recette (base de production,
   *  /recette-etat). Silencieux si indisponible. */
  async function propositionsRecette() {
    const r = await A.appel('recette-etat').catch(() => null);
    if (!r || !r.ok) return [];
    const jour = (iso) => new Date(iso).toLocaleDateString('fr-FR');
    const props = [];
    for (const c of r.cas || []) {
      const res = (r.resultats || {})[c.id];
      if (!res || !['ko', 'bloque'].includes(res.statut)) continue;
      props.push({
        source: `recette:${c.id}:${res.le}`,
        origine: `Recette — ${res.statut === 'ko' ? 'KO' : 'bloqué'} par ${res.testeur || '?'} le ${jour(res.le)}`,
        titre: `Recette : ${c.titre}`.slice(0, 200),
        detail: res.commentaire || '',
        theme: 'bug',
        priorite: 2,
      });
    }
    for (const m of r.remarques || []) {
      props.push({
        source: `recette:rem:${m.id}`,
        origine: `Recette — remarque de ${m.testeur || '?'} le ${jour(m.le)}${m.page ? ` (${m.page})` : ''}`,
        titre: m.texte.length > 200 ? `${m.texte.slice(0, 197)}…` : m.texte,
        detail: m.texte.length > 200 ? m.texte : '',
        theme: m.type === 'bug' ? 'bug' : 'suggestion',
        priorite: m.type === 'bug' ? 2 : 3,
      });
    }
    return props;
  }

  function proposees() {
    const liste = [...A.recette, ...A.propositions]
      .filter((p) => !A.theme || p.theme === A.theme)
      .sort((a, b) => a.priorite - b.priorite);
    if (!liste.length || A.vue !== 'ouvertes') return '';
    const vues = A.toutesProps ? liste : liste.slice(0, 6);
    return `<section class="af-props"><h3>Proposées <span>${liste.length}</span></h3>
      <p>Suites des mises à jour, failles ouvertes de l’audit et retours de la recette : ajoutez ce qui compte, ignorez le reste.</p>
      <ul>${vues
        .map(
          (p) =>
            `<li style="--af-c:${COULEUR_THEME[p.theme]}"><span class="af-theme">${echapper(A.themes[p.theme])} · ${echapper(A.priorites[p.priorite])}</span><span class="af-props-t"><b>${echapper(p.titre)}</b><small>${echapper(p.origine)}</small></span><button type="button" class="btn btn-primary btn-sm" data-af-prop="${echapper(p.source)}">Ajouter</button><button type="button" class="btn btn-ghost btn-sm" data-af-ignorer="${echapper(p.source)}">Ignorer</button></li>`,
        )
        .join('')}</ul>${
        liste.length > vues.length
          ? `<button type="button" class="af-plus" data-af-toutes>Voir les ${liste.length - vues.length} autres</button>`
          : ''
      }</section>`;
  }

  function carte(t) {
    const c = COULEUR_THEME[t.theme];
    return `<article class="af-carte af-${t.statut}" style="--af-c:${c}">
      <button type="button" class="af-corps" data-af-ouvrir="${t.id}">
        <span class="af-haut"><span class="af-theme">${echapper(A.themes[t.theme])}</span>${
          t.statut === 'en-cours' ? '<span class="af-encours">En cours</span>' : ''
        }</span>
        <b class="af-titre">${echapper(t.titre)}</b>
        ${t.detail ? `<span class="af-detail">${echapper(t.detail)}</span>` : ''}
        <small class="af-meta">${echapper(t.creePar || '')}${t.creePar ? ' · ' : ''}${
          t.statut === 'fait' ? `fait le ${date(t.faitLe)}` : `ajouté le ${date(t.creeLe)}`
        }</small>
      </button>
      ${
        ouverte(t)
          ? `<span class="af-actions">${
              t.statut === 'a-faire'
                ? `<button type="button" data-af-statut="${t.id}" data-val="en-cours">Commencer</button>`
                : ''
            }<button type="button" class="af-ok" data-af-statut="${t.id}" data-val="fait" aria-label="Marquer « ${echapper(t.titre)} » comme fait">✓ Fait</button></span>`
          : `<span class="af-actions"><button type="button" data-af-statut="${t.id}" data-val="a-faire">Rouvrir</button></span>`
      }
    </article>`;
  }

  function rendreListe() {
    const duTheme = A.taches.filter((t) => !A.theme || t.theme === A.theme);
    const ouvertes = A.taches.filter(ouverte);
    const compte = (th) => ouvertes.filter((t) => t.theme === th).length;
    const filtres = [['', 'Tous', ouvertes.length], ...Object.entries(A.themes).map(([k, l]) => [k, l, compte(k)])]
      .map(
        ([k, l, n]) =>
          `<button type="button" class="af-filtre${A.theme === k ? ' actif' : ''}" data-af-theme="${k}" style="--af-c:${COULEUR_THEME[k] || '#002743'}"><i aria-hidden="true"></i>${echapper(l)} <span>${n}</span></button>`,
      )
      .join('');
    let corps;
    if (A.vue === 'ouvertes') {
      const groupes = Object.entries(A.priorites)
        .map(([p, libelle]) => {
          const liste = duTheme.filter((t) => ouverte(t) && t.priorite === +p);
          return liste.length
            ? `<section class="af-groupe af-p${p}"><h3>${echapper(libelle)} <span>${liste.length}</span></h3><div class="af-grille">${liste.map(carte).join('')}</div></section>`
            : '';
        })
        .join('');
      corps = groupes || '<p class="af-vide">Rien à faire ici. 🎉</p>';
    } else {
      const fermees = duTheme.filter((t) => !ouverte(t));
      corps = fermees.length
        ? `<div class="af-grille">${fermees.map(carte).join('')}</div>`
        : '<p class="af-vide">Aucune tâche terminée pour l’instant.</p>';
    }
    A.zone.innerHTML = `
      <div class="af-outils">
        <div class="af-filtres" role="group" aria-label="Thème">${filtres}</div>
        <div class="af-droite">
          <div class="pj-seg" role="group" aria-label="Affichage">${[
            ['ouvertes', 'À faire'],
            ['fermees', 'Terminées'],
          ]
            .map(
              ([v, l]) =>
                `<button type="button" data-af-vue="${v}" class="${A.vue === v ? 'actif' : ''}">${l}</button>`,
            )
            .join('')}</div>
          <button type="button" class="btn btn-primary" data-af-ajouter>＋ Ajouter</button>
        </div>
      </div>
      ${proposees()}
      ${corps}`;
  }

  function ouvrirEdition(t, prop) {
    const v = t ||
      (prop && { ...prop, statut: 'a-faire' }) || {
        titre: '',
        detail: '',
        theme: A.theme || 'fonctionnalite',
        priorite: 3,
        statut: 'a-faire',
      };
    ouvrirPanneau(
      `<span class="cvdl-surtitre" style="color:var(--tur)">À faire</span>
      <h2 id="pj-panneau-titre">${t ? 'Modifier' : 'Nouvelle tâche'}</h2>
      ${!t && prop ? `<p class="pj-sous">${echapper(prop.origine)}</p>` : ''}
      <div class="pj-ch"><label for="af-f-titre">Titre</label><input class="input" id="af-f-titre" maxlength="200" value="${echapper(v.titre)}"></div>
      <div class="pj-ch"><span class="lab">Thème</span>${seg('theme', A.themes, v.theme)}</div>
      <div class="pj-ch"><span class="lab">Priorité</span>${seg('priorite', A.priorites, String(v.priorite))}</div>
      <div class="pj-ch"><span class="lab">Statut</span>${seg('statut', A.statuts, v.statut)}</div>
      <div class="pj-ch"><label for="af-f-detail">Détail</label><textarea class="input" id="af-f-detail" rows="5" maxlength="3000">${echapper(v.detail)}</textarea></div>
      <p class="pj-erreur" id="af-f-erreur" role="alert"></p>
      <div class="pj-actions"><button type="button" class="btn btn-primary" id="af-f-enregistrer">Enregistrer</button><button type="button" class="btn btn-secondary" data-fermer>Annuler</button><span class="espace"></span>${
        t ? '<button type="button" class="btn btn-danger" id="af-f-supprimer">Supprimer</button>' : ''
      }</div>`,
      (p) => {
        p.addEventListener('click', (e) => {
          const b = e.target.closest('[data-seg] button');
          if (b) b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('actif', x === b));
        });
        $('af-f-enregistrer').addEventListener('click', () =>
          enregistrer(
            {
              id: t ? t.id : '',
              source: !t && prop ? prop.source : '',
              titre: $('af-f-titre').value,
              detail: $('af-f-detail').value,
              theme: valeurSeg(p, 'theme'),
              priorite: valeurSeg(p, 'priorite'),
              statut: valeurSeg(p, 'statut'),
            },
            t ? 'Tâche enregistrée' : 'Tâche ajoutée',
          ),
        );
        if (t)
          $('af-f-supprimer').addEventListener('click', async () => {
            if (!confirm(`Supprimer « ${t.titre} » ?`)) return;
            const r = await A.appel('a-faire-supprimer', { id: t.id });
            if (!r.ok) return toast(r.erreur || 'Suppression impossible.', { erreur: true });
            fermerPanneau();
            toast('Tâche supprimée');
            if (await charger()) rendreListe();
          });
      },
    );
  }

  async function enregistrer(donnees, succes) {
    const r = await A.appel('a-faire-enregistrer', donnees);
    if (!r.ok) {
      const e = $('af-f-erreur');
      if (e && !$('pj-panneau').hidden) e.textContent = r.erreur || 'Enregistrement impossible.';
      else toast(r.erreur || 'Enregistrement impossible.', { erreur: true });
      return;
    }
    if (!$('pj-panneau').hidden) fermerPanneau();
    toast(succes);
    if (await charger()) rendreListe();
  }

  document.addEventListener('click', (e) => {
    if (!A.zone || A.zone.hidden) return;
    const th = e.target.closest('[data-af-theme]');
    if (th) {
      A.theme = th.dataset.afTheme;
      return rendreListe();
    }
    const prop = e.target.closest('[data-af-prop]');
    if (prop)
      return ouvrirEdition(
        null,
        [...A.propositions, ...A.recette].find((p) => p.source === prop.dataset.afProp),
      );
    const ign = e.target.closest('[data-af-ignorer]');
    if (ign)
      return A.appel('a-faire-ignorer', { cle: ign.dataset.afIgnorer }).then(async (r) => {
        if (!r.ok) return toast(r.erreur || 'Impossible.', { erreur: true });
        if (await charger()) rendreListe();
      });
    if (e.target.closest('[data-af-toutes]')) {
      A.toutesProps = true;
      return rendreListe();
    }
    const vue = e.target.closest('[data-af-vue]');
    if (vue) {
      A.vue = vue.dataset.afVue;
      return rendreListe();
    }
    if (e.target.closest('[data-af-ajouter]')) return ouvrirEdition(null);
    const st = e.target.closest('[data-af-statut]');
    if (st) {
      const t = A.taches.find((x) => x.id === +st.dataset.afStatut);
      const libelle = { fait: 'Marquée comme faite', 'en-cours': 'En cours', 'a-faire': 'Rouverte' }[st.dataset.val];
      return enregistrer({ ...t, statut: st.dataset.val }, libelle);
    }
    const o = e.target.closest('[data-af-ouvrir]');
    if (o) ouvrirEdition(A.taches.find((x) => x.id === +o.dataset.afOuvrir));
  });

  async function rendre(zone, appel) {
    Object.assign(A, { zone, appel });
    if (!A.taches.length) {
      zone.innerHTML = '<p class="af-vide">Chargement…</p>';
      if (!(await charger())) return;
    }
    rendreListe();
  }
  return { rendre };
})();
