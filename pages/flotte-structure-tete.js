try {
  if (sessionStorage.getItem('cvdl-code-structure') || new URLSearchParams(location.search).get('code'))
    document.documentElement.classList.add('deja-identifie');
} catch (e) {}
