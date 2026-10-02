/* Anti-clickjacking : la page ne s'affiche jamais dans un cadre d'un autre site. */
(function () {
  if (window.top === window.self) return;
  var ok = false;
  try {
    ok = window.top.location.origin === window.location.origin;
  } catch (e) {}
  if (!ok) {
    document.documentElement.style.display = 'none';
    try {
      window.top.location = window.location.href;
    } catch (e) {}
  }
})();
