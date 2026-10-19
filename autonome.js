/* Modules autonomes (retroplanning.html, distribution-autonome.html) : utilisables sans serveur ni
   compte, avant le lancement de la plateforme. Les données restent dans ce navigateur ;
   « Exporter » en fait un fichier JSON à garder, « Importer » le recharge (autre poste, sauvegarde). */
window.AutonomeCvdl = {
  lire(cle, defaut) {
    try {
      const v = JSON.parse(localStorage.getItem(cle));
      return v && typeof v === 'object' ? v : defaut;
    } catch (e) {
      return defaut;
    }
  },
  ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (e) {
      return false;
    }
  },
  /** Télécharge `{ module, exporte, donnees }` en JSON. */
  exporter(module, donnees) {
    const texte = JSON.stringify({ module, exporte: new Date().toISOString(), donnees }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
    a.download = `cvdl-${module}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  /** Ouvre un fichier exporté par `exporter` pour ce module ; renvoie ses données (rejet sinon). */
  importer(module) {
    return new Promise((ok, ko) => {
      const champ = document.createElement('input');
      champ.type = 'file';
      champ.accept = 'application/json,.json';
      champ.onchange = async () => {
        try {
          const f = JSON.parse(await champ.files[0].text());
          if (!f || f.module !== module || !f.donnees) throw new Error();
          ok(f.donnees);
        } catch (e) {
          ko(new Error('Ce fichier n’est pas une sauvegarde de ce module.'));
        }
      };
      champ.click();
    });
  },
};
