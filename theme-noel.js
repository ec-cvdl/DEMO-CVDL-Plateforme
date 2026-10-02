/* ════════════════════════════════════════════════════════════════════════════════════
   theme-noel.js — thème de Noël de l'admin (bouton « Thème de Noël » de la barre latérale).
   Se combine avec le mode clair ou sombre : rouge et vert sapin à la place du magenta et du
   turquoise (theme-noel.css), guirlande lumineuse en haut, bonnet sur le logo, neige légère.
   Choix mémorisé dans localStorage « cvdl-noel » (classe .rp-noel posée dès le <head>).
   Animations coupées si l'utilisateur demande moins d'animations (réglage du système).
   ════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  const racine = document.documentElement;
  const moinsAnimations = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let decor = null;

  function creerDecor() {
    if (decor) return;
    decor = document.createElement('div');
    decor.className = 'noel-decor';
    decor.setAttribute('aria-hidden', 'true');
    // Guirlande : fil ondulé + ampoules qui scintillent chacune à son rythme.
    const couleurs = ['r', 'o', 'v', 'b'];
    const n = Math.max(16, Math.round(window.innerWidth / 58));
    let ampoules = '';
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * 100;
      const y = i % 2 ? 15 : 9;
      ampoules += `<span class="noel-ampoule ${couleurs[i % 4]}" style="left:${x}%;top:${y}px;animation-delay:${((i * 0.37) % 2.2).toFixed(2)}s"></span>`;
    }
    const fil = `<svg class="noel-fil" viewBox="0 0 ${n * 2} 12" preserveAspectRatio="none">${Array.from({ length: n }, (_, i) => `<path d="M${i * 2} ${i % 2 ? 2 : 8} Q${i * 2 + 1} ${i % 2 ? 11 : -1} ${i * 2 + 2} ${i % 2 ? 8 : 2}"/>`).join('')}</svg>`;
    // Neige : quelques flocons seulement, derrière les fenêtres (jamais au-dessus d'un formulaire).
    let neige = '';
    if (!moinsAnimations()) {
      for (let i = 0; i < 34; i++) {
        const taille = 3 + Math.random() * 5;
        neige += `<i class="noel-flocon" style="left:${(Math.random() * 100).toFixed(1)}%;width:${taille.toFixed(1)}px;height:${taille.toFixed(1)}px;opacity:${(0.35 + Math.random() * 0.5).toFixed(2)};animation-duration:${(9 + Math.random() * 12).toFixed(1)}s,${(3 + Math.random() * 3).toFixed(1)}s;animation-delay:${(-Math.random() * 20).toFixed(1)}s,${(-Math.random() * 3).toFixed(1)}s"></i>`;
      }
    }
    decor.innerHTML = `<div class="noel-guirlande">${fil}${ampoules}</div><div class="noel-neige">${neige}</div>`;
    document.body.appendChild(decor);
    caler();
  }
  function retirerDecor() {
    if (decor) {
      decor.remove();
      decor = null;
    }
  }
  // La guirlande court au-dessus du contenu, pas sur la barre latérale (logo, bonnet).
  function caler() {
    if (!decor) return;
    const aside = document.querySelector('.rp-aside');
    const g = aside ? Math.max(0, Math.round(aside.getBoundingClientRect().right)) : 0;
    decor.style.setProperty('--noel-gauche', g + 'px');
  }
  window.addEventListener('resize', caler);
  document.addEventListener('mouseover', (e) => {
    if (decor && e.target.closest && e.target.closest('.rp-aside')) setTimeout(caler, 250);
  });

  function majBouton() {
    const actif = racine.classList.contains('rp-noel');
    const b = document.getElementById('rp-toggle-noel');
    if (b) {
      b.setAttribute('aria-pressed', String(actif));
      b.title = actif ? 'Retirer le thème de Noël' : 'Activer le thème de Noël';
    }
    const l = document.getElementById('rp-toggle-noel-label');
    if (l) l.textContent = actif ? 'Noël · activé' : 'Thème de Noël';
  }
  function appliquer() {
    if (racine.classList.contains('rp-noel')) creerDecor();
    else retirerDecor();
    majBouton();
  }
  function basculer() {
    const actif = racine.classList.toggle('rp-noel');
    try {
      localStorage.setItem('cvdl-noel', actif ? '1' : '');
    } catch (e) {}
    appliquer();
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#rp-toggle-noel')) basculer();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', appliquer);
  else appliquer();
  window.basculerThemeNoel = basculer;
})();
