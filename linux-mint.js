/* Linux Mint sur les ordinateurs proposés — composant partagé (commande.html).
   LinuxMintCvdl.bandeau(produits) : léger bandeau si des produits du catalogue tournent sous
   Linux (champ « systeme » du produit) ; un clic ouvre une modale : ce que ça change, les
   avantages, ce qui fonctionne pareil et les usages déconseillés. */
(function () {
  const esc = (s) => (window.echapper ? window.echapper(s) : String(s == null ? '' : s));
  const estLinux = (p) => /linux/i.test(String((p && p.systeme) || ''));
  /** « Les ordinateurs B et C » d'après la lettre de gamme « (B) » du nom, sinon les noms. */
  function designation(produits) {
    const lettres = [...new Set(produits.map((p) => (String(p.nom).match(/\(([A-Z])\)/) || [])[1]))];
    if (lettres.every(Boolean)) {
      const t =
        lettres.length > 1 ? `${lettres.slice(0, -1).join(', ')} et ${lettres[lettres.length - 1]}` : lettres[0];
      return { texte: lettres.length > 1 ? `Les ordinateurs ${t}` : `L’ordinateur ${t}`, pluriel: lettres.length > 1 };
    }
    return { texte: produits.map((p) => p.nom).join(', '), pluriel: produits.length > 1 };
  }

  let windows = []; // ordinateurs sous Windows du catalogue, proposés dans la fiche
  function bandeau(produits) {
    const linux = (produits || []).filter(estLinux);
    if (!linux.length) return '';
    windows = (produits || []).filter((p) => /windows/i.test(String(p.systeme || '')) && /portable/i.test(p.nom));
    const d = designation(linux);
    return `<button type="button" class="lm-bandeau" data-linux-mint>
      <span data-ill="linux" class="lm-bandeau-ill"></span>
      <span class="lm-bandeau-txt"><b>${esc(d.texte)} ${d.pluriel ? 'sont' : 'est'} sous Linux Mint</b>
        <span>On y fait les mêmes choses qu’avec Windows.</span></span>
      <span class="lm-plus">Découvrir</span></button>`;
  }

  const ic = (cle) => (window.illustrationCvdl ? window.illustrationCvdl(cle, 34) : '');
  const ATOUTS = [
    ['tarif', 'Moins cher', 'Pas de licence à payer'],
    ['sym-lenteur', 'Plus rapide', 'Fluide, même sur un PC de quelques années'],
    ['sym-virus', 'Plus sûr', 'Très peu visé par les virus'],
    ['prod-feuille', 'Plus durable', 'Logiciel libre, il fait durer les ordinateurs'],
  ];
  const PAREIL = [
    ['sym-internet', 'Internet et e-mails'],
    ['sym-application', 'Démarches en ligne'],
    ['sym-camera', 'Visio'],
    ['prod-clavier', 'Word, Excel en ligne'],
    ['sym-impression', 'Imprimer'],
    ['sym-port', 'Clé USB, photos'],
  ];
  const EVITER = [
    ['Logiciel métier', 'installé sous Windows (compta, caisse…)'],
    ['Office installé', 'utilisez Microsoft 365 en ligne ou LibreOffice'],
    ['Certains jeux', 'et matériels anciens sans pilote Linux'],
  ];
  function contenu() {
    const lettresWin = windows.map((p) => (String(p.nom).match(/\(([A-Z])\)/) || [])[1]).filter(Boolean);
    const conseil = lettresWin.length
      ? `Besoin de Windows ? Choisissez l’ordinateur ${lettresWin.join(' ou ')}.`
      : 'Besoin de Windows ? Choisissez un ordinateur sous Windows.';
    return `
    <button type="button" class="modale-fermer-rond-qr lm-fermer" data-lm-fermer aria-label="Fermer">✕</button>
    <div class="lm-tete"><span data-ill="linux" class="ill xl"></span>
      <div><span class="cvdl-surtitre">Linux Mint</span><h2 id="lm-titre">Un ordinateur comme les autres</h2>
      <p>Le bureau ressemble à Windows : menu en bas à gauche, barre des tâches, fenêtres. On s’y fait en quelques minutes.</p></div></div>
    <div class="lm-atouts">${ATOUTS.map(
      ([cle, t, d]) =>
        `<div class="lm-atout">${cle === 'tarif' ? '<span data-ill="tarifs" class="ill"></span>' : ic(cle)}<b>${t}</b><span>${d}</span></div>`,
    ).join('')}</div>
    <h3>Ça marche pareil</h3>
    <div class="lm-pareil">${PAREIL.map(([cle, t]) => `<span>${ic(cle)}${t}</span>`).join('')}</div>
    <h3>À éviter</h3>
    <ul class="lm-eviter">${EVITER.map(([t, d]) => `<li><b>${t}</b> ${d}</li>`).join('')}</ul>
    <p class="lm-conseil">${esc(conseil)}</p>
    <div class="lm-actions"><a class="btn btn-secondary" href="linux-info.html" target="_blank" rel="noopener">Essayer Linux en ligne</a>
      <button type="button" class="btn btn-primary" data-lm-fermer>J’ai compris</button></div>`;
  }

  let voile = null;
  function ouvrir() {
    if (!voile) {
      voile = document.createElement('div');
      voile.className = 'voile-modale-qr';
      voile.addEventListener('click', (e) => {
        if (e.target === voile || e.target.closest('[data-lm-fermer]')) fermer();
      });
      document.body.appendChild(voile);
    }
    voile.innerHTML = `<div class="modale-qr lm-modale" role="dialog" aria-modal="true" aria-labelledby="lm-titre" tabindex="-1">${contenu()}</div>`;
    if (window.portailIllustrations) window.portailIllustrations(voile);
    ouvrir.origine = document.activeElement;
    voile.classList.add('visible');
    voile.querySelector('.lm-modale').focus();
  }
  function fermer() {
    voile.classList.remove('visible');
    if (ouvrir.origine && ouvrir.origine.focus) ouvrir.origine.focus();
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-linux-mint]')) ouvrir();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && voile && voile.classList.contains('visible')) fermer();
  });

  window.LinuxMintCvdl = { bandeau, estLinux };
})();
