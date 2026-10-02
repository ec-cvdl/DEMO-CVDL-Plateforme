(function () {
  var dossier = location.pathname.split('/')[1] || '';
  var demo = /demo/i.test(dossier) && !/\.html$/i.test(dossier);
  location.replace(demo ? 'demo.html' : 'portail.html');
})();
