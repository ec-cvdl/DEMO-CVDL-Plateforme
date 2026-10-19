/* Rétroplanning autonome (retroplanning.html) : remplace l'API par ce navigateur pour
   pages/projet.js. Mêmes actions et mêmes règles que le serveur (back : src/regles/projet.js),
   sans journal ni démarche. Sauvegarde : autonome.js. */
(function () {
  const CLE = 'cvdl-autonome-retroplanning';
  const MODULE = 'retroplanning';
  const vide = () => ({ couloirs: [], taches: [], suivant: 1 });
  let d = { ...vide(), ...window.AutonomeCvdl.lire(CLE, {}) };
  d.suivant = Math.max(d.suivant || 1, ...[...d.couloirs, ...d.taches].map((x) => x.id + 1));

  const COULEURS = ['navy', 'rouge', 'tur', 'mag', 'orange', 'vert', 'jaune'];
  const STATUTS = ['a-faire', 'en-cours', 'termine', 'bloque'];
  const txt = (v, max) =>
    String(v == null ? '' : v)
      .trim()
      .slice(0, max);
  const dateValide = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(new Date(x + 'T00:00:00Z'));
  const ids = (v) =>
    [...new Set((Array.isArray(v) ? v : []).map((x) => parseInt(x, 10)).filter((x) => x > 0))].slice(0, 30);
  const non = (erreur) => ({ ok: false, erreur });

  function creeUnCycle(depart, avant) {
    const vus = new Set();
    const pile = [...avant];
    while (pile.length) {
      const id = pile.pop();
      if (id === depart) return true;
      if (vus.has(id)) continue;
      vus.add(id);
      const t = d.taches.find((x) => x.id === id);
      if (t) pile.push(...t.avant);
    }
    return false;
  }

  const actions = {
    projet: () => ({
      ok: true,
      couloirs: [...d.couloirs].sort((a, b) => a.ordre - b.ordre || a.id - b.id),
      taches: d.taches,
      journal: [],
    }),
    'projet-droits': () => ({ ok: true }),
    'projet-couloir': (x) => {
      const id = parseInt(x.id, 10) || 0;
      const c = d.couloirs.find((k) => k.id === id);
      if (id && !c) return non('Couloir introuvable.');
      if (x.supprimer) {
        if (d.taches.some((t) => t.couloir === id))
          return non('Ce couloir contient encore des tâches : déplacez-les ou supprimez-les.');
        d.couloirs = d.couloirs.filter((k) => k.id !== id);
        return { ok: true };
      }
      const nom = txt(x.nom, 60);
      if (!nom) return non('Nom du couloir obligatoire.');
      const couleur = COULEURS.includes(x.couleur) ? x.couleur : 'navy';
      if (c) Object.assign(c, { nom, couleur });
      else
        d.couloirs.push({ id: d.suivant++, nom, couleur, ordre: Math.max(0, ...d.couloirs.map((k) => k.ordre)) + 1 });
      return { ok: true };
    },
    'projet-couloirs-ordre': (x) => {
      (Array.isArray(x.ids) ? x.ids : []).forEach((id, i) => {
        const c = d.couloirs.find((k) => k.id === parseInt(id, 10));
        if (c) c.ordre = i + 1;
      });
      return { ok: true };
    },
    'projet-tache': (x) => {
      const id = parseInt(x.id, 10) || 0;
      const t = d.taches.find((k) => k.id === id);
      if (id && !t) return non('Tâche introuvable.');
      if (x.supprimer) {
        d.taches = d.taches.filter((k) => k.id !== id);
        d.taches.forEach((k) => (k.avant = k.avant.filter((a) => a !== id)));
        return { ok: true };
      }
      const type = x.type === 'jalon' ? 'jalon' : 'tache';
      const titre = txt(x.titre, 120);
      if (!titre) return non('Titre obligatoire.');
      const couloir = parseInt(x.couloir, 10);
      if (!d.couloirs.some((c) => c.id === couloir)) return non('Couloir inconnu.');
      const debut = txt(x.debut, 10);
      const fin = type === 'jalon' ? debut : txt(x.fin, 10);
      if (!dateValide(debut) || !dateValide(fin)) return non('Dates invalides (AAAA-MM-JJ).');
      if (fin < debut) return non('La fin est avant le début.');
      const statut = STATUTS.includes(x.statut) ? x.statut : 'a-faire';
      const avant = ids(x.avant).filter((a) => a !== id && d.taches.some((k) => k.id === a));
      if (id && creeUnCycle(id, avant)) return non('Ces liens créeraient une boucle entre tâches.');
      const principal = type === 'jalon' && !!x.principal;
      if (principal) d.taches.forEach((k) => (k.principal = false));
      const tache = {
        couloir,
        type,
        titre,
        debut,
        fin,
        statut,
        avancement: statut === 'termine' ? 100 : Math.min(100, Math.max(0, parseInt(x.avancement, 10) || 0)),
        avant,
        principal,
        note: txt(x.note, 2000),
      };
      if (t) Object.assign(t, tache);
      else d.taches.push({ id: d.suivant++, ...tache });
      return { ok: true };
    },
    'projet-taches-dates': (x) => {
      const liste = Array.isArray(x.taches) ? x.taches.slice(0, 200) : [];
      const maj = [];
      for (const n of liste) {
        const t = d.taches.find((k) => k.id === parseInt(n.id, 10));
        if (!t) return non('Tâche introuvable.');
        const debut = String(n.debut || '');
        const fin = t.type === 'jalon' ? debut : String(n.fin || '');
        if (!dateValide(debut) || !dateValide(fin) || fin < debut) return non(`Dates invalides pour « ${t.titre} ».`);
        maj.push([t, debut, fin]);
      }
      maj.forEach(([t, debut, fin]) => Object.assign(t, { debut, fin }));
      return { ok: true };
    },
  };

  window.ProjetLocal = {
    async appel(action, donnees) {
      const f = actions[action];
      if (!f) return non('Indisponible dans la version autonome.');
      const avant = JSON.stringify(d);
      const r = f(donnees || {});
      if (r.ok && action !== 'projet' && action !== 'projet-droits' && !window.AutonomeCvdl.ecrire(CLE, d)) {
        d = JSON.parse(avant);
        return non('Enregistrement impossible dans ce navigateur (stockage plein ou bloqué).');
      }
      return JSON.parse(JSON.stringify(r));
    },
  };

  document.addEventListener('click', async (e) => {
    if (e.target.closest('#auto-exporter')) window.AutonomeCvdl.exporter(MODULE, d);
    if (e.target.closest('#auto-importer')) {
      try {
        const n = await window.AutonomeCvdl.importer(MODULE);
        if (!Array.isArray(n.couloirs) || !Array.isArray(n.taches)) throw new Error('Fichier incomplet.');
        if (d.taches.length && !confirm('Remplacer le planning de ce navigateur par celui du fichier ?')) return;
        window.AutonomeCvdl.ecrire(CLE, { ...vide(), ...n });
        location.reload();
      } catch (err) {
        alert(err.message);
      }
    }
  });
})();
