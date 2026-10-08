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
function ouvrirEssai() {
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
  $('erreur-essai').hidden = true;
  let r;
  try {
    r = await fetch(API_PROD, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'acces-demo-ouvrir', code: $('code-essai').value }),
    }).then((x) => x.json());
  } catch (err) {
    r = { ok: false, erreur: 'Connexion impossible, réessayez dans un instant.' };
  }
  bouton.disabled = false;
  if (!r.ok) {
    $('erreur-essai').textContent = r.erreur || 'Code refusé.';
    $('erreur-essai').hidden = false;
    return;
  }
  // La démo reste sur cette vue dans cet onglet (voir pages/demo.js).
  try {
    sessionStorage.setItem('cvdl-demo-vue', r.vue);
  } catch (err) {}
  location.href = 'demo.html';
});
