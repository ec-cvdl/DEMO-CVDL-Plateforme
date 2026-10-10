/* Page d'accueil (accueil.html) : adresse de contact réglée dans l'admin, et « Essayer la
   plateforme » (code d'essai → démo ouverte sur la seule vue de la structure). */
// Toujours l'API de production : les codes d'essai y sont enregistrés, même si ce navigateur
// a déjà ouvert la démo (api.js renverrait alors vers l'API de démo).
const API_PROD = API.replace(/-demo$/, '');
const $ = (id) => document.getElementById(id);

fetch(API_PROD + '?action=contact-public')
  .then((r) => r.json())
  .then((r) => {
    if (!r.ok || !r.email) return;
    document.querySelectorAll('.lien-contact').forEach((a) => (a.href = `mailto:${r.email}`));
    document.querySelectorAll('.adresse-contact').forEach((e) => (e.textContent = r.email));
  })
  .catch(() => {});

const essai = $('essai');
// La démo s'endort quand personne ne l'utilise : on la réveille dès que la fenêtre s'ouvre, pour
// qu'elle soit prête (ou presque) au moment d'y entrer.
let demoReveillee = false;
function reveillerDemo() {
  if (demoReveillee) return;
  demoReveillee = true;
  fetch(API_PROD + '-demo?action=perimetre').catch(() => {});
}
function ouvrirEssai() {
  reveillerDemo();
  $('erreur-essai').hidden = true;
  essai.showModal();
  $('code-essai').focus();
}
document.querySelectorAll('[data-essayer]').forEach((b) => b.addEventListener('click', ouvrirEssai));
$('annuler-essai').addEventListener('click', () => essai.close());
if (location.hash === '#essayer') ouvrirEssai();

$('form-essai').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bouton = $('valider-essai');
  bouton.disabled = true;
  bouton.textContent = 'Vérification du code…';
  $('erreur-essai').hidden = true;
  // Codes d'essai : enregistrés en production ; un code créé depuis l'admin de la démo (pour
  // tester) n'existe que dans la démo, d'où le second essai.
  const ouvrir = (api) =>
    fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'acces-demo-ouvrir', code: $('code-essai').value }),
    })
      .then((x) => x.json())
      .catch(() => null);
  let r = await ouvrir(API_PROD);
  if (!r || !r.ok) r = (await ouvrir(API_PROD + '-demo')) || r;
  if (!r) r = { ok: false, erreur: 'Connexion impossible, réessayez dans un instant.' };
  if (!r.ok) {
    bouton.disabled = false;
    bouton.textContent = 'Ouvrir la démo';
    $('erreur-essai').textContent = r.erreur || 'Code refusé.';
    $('erreur-essai').hidden = false;
    return;
  }
  // La démo reste sur cette vue dans cet onglet (voir pages/demo.js).
  try {
    sessionStorage.setItem('cvdl-demo-vue', r.vue);
    sessionStorage.setItem('cvdl-demo-auto', '1'); // entrée directe dans l'espace (pages/demo.js)
  } catch (err) {}
  location.href = 'demo.html';
});
// Retour arrière depuis la démo : la fenêtre d'essai redevient utilisable.
window.addEventListener('pageshow', () => {
  $('valider-essai').disabled = false;
  $('valider-essai').textContent = 'Ouvrir la démo';
});
