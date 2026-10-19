/* Page d'accueil (accueil.html) : formulaire « Nous contacter » (envoyé par e-mail à l'adresse
   de contact réglée dans l'admin), et « Essayer la démo » (choix Relais Numérique / Vente
   solidaire, ou code d'essai reçu par e-mail → démo ouverte sur la seule vue de cette
   structure). L'avertissement avant de fermer une fenêtre remplie est dans cvdl-ui.js. */
// Toujours l'API de production : les codes d'essai y sont enregistrés, même si ce navigateur
// a déjà ouvert la démo (api.js renverrait alors vers l'API de démo).
const API_PROD = API.replace(/-demo$/, '');

const contact = $('contact');
const formContact = $('form-contact');
appelApi({ action: 'contact-public' }, { base: API_PROD })
  .then((r) => {
    if (!r.ok) return;
    if (r.email) document.querySelectorAll('.adresse-contact').forEach((e) => (e.textContent = r.email));
    const remplir = (select, liste) => (liste || []).forEach((v) => select.add(new Option(v, v)));
    remplir($('ct-type-structure'), r.typesStructure);
    remplir($('ct-public'), r.publics);
  })
  .catch(() => {});

function ouvrirContact() {
  $('erreur-contact').hidden = true;
  contact.showModal();
}
document.querySelectorAll('[data-contact]').forEach((b) => b.addEventListener('click', ouvrirContact));
contact
  .querySelectorAll('#annuler-contact, .ac-contact-croix')
  .forEach((b) => b.addEventListener('click', () => contact.close()));
// Fenêtre fermée sans envoi : le brouillon est abandonné (l'utilisateur l'a confirmé).
contact.addEventListener('close', () => {
  formContact.reset();
  $('erreur-contact').hidden = true;
});
function erreurContact(texte, champ) {
  $('erreur-contact').textContent = texte;
  $('erreur-contact').hidden = false;
  if (champ) champ.focus();
}
formContact.addEventListener('submit', async (e) => {
  e.preventDefault();
  const invalide = [...formContact.elements].find((c) => c.willValidate && !c.checkValidity());
  if (invalide) return erreurContact('Merci de remplir tous les champs marqués d’un astérisque.', invalide);
  const bouton = $('envoyer-contact');
  bouton.disabled = true;
  bouton.textContent = 'Envoi…';
  $('erreur-contact').hidden = true;
  const donnees = Object.fromEntries(new FormData(formContact));
  const r = await appelApi({ action: 'contact-envoyer', ...donnees }, { methode: 'POST', base: API_PROD }).catch(
    () => ({ ok: false, erreur: 'Connexion impossible, réessayez dans un instant.' }),
  );
  bouton.disabled = false;
  bouton.textContent = 'Envoyer';
  if (!r.ok) return erreurContact(r.erreur || 'Envoi impossible, réessayez dans un instant.');
  contact.close();
  if (window.alerteCvdl)
    window.alerteCvdl('Message envoyé\nMerci ! L’équipe Emmaüs Connect vous répondra par e-mail.', {
      k: 'C’est envoyé',
    });
});

const essai = $('essai');
// La démo s'endort quand personne ne l'utilise : on la réveille dès que la fenêtre s'ouvre, pour
// qu'elle soit prête (ou presque) au moment d'y entrer.
let demoReveillee = false;
function reveillerDemo() {
  if (demoReveillee) return;
  demoReveillee = true;
  appelApi({ action: 'perimetre' }, { base: API_PROD + '-demo' }).catch(() => {});
}
function ouvrirEssai() {
  reveillerDemo();
  $('erreur-essai').hidden = true;
  essai.showModal();
}
document.querySelectorAll('[data-essayer]').forEach((b) => b.addEventListener('click', ouvrirEssai));
$('annuler-essai').addEventListener('click', () => essai.close());
if (location.hash === '#essayer') ouvrirEssai();
$('bloc-code-essai').addEventListener('toggle', (e) => {
  if (e.target.open) $('code-essai').focus();
});

/** Ouvre la démo sur une seule vue dans cet onglet (voir pages/demo.js), entrée directe. */
function entrerDansLaDemo(vue) {
  try {
    sessionStorage.setItem('cvdl-demo-vue', vue);
    sessionStorage.setItem('cvdl-demo-auto', '1');
  } catch (err) {}
  // Démo sous /demo/ (voir api.js) ; déjà dans la démo, on y reste.
  location.href = /-demo$/.test(API) ? 'demo.html' : 'demo/demo.html';
}
document.querySelectorAll('[data-demo-vue]').forEach((b) =>
  b.addEventListener('click', () => {
    b.setAttribute('aria-busy', 'true');
    entrerDansLaDemo(b.dataset.demoVue);
  }),
);

$('form-essai').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bouton = $('valider-essai');
  bouton.disabled = true;
  bouton.textContent = 'Vérification…';
  $('erreur-essai').hidden = true;
  // Codes d'essai : enregistrés en production ; un code créé depuis l'admin de la démo (pour
  // tester) n'existe que dans la démo, d'où le second essai.
  const ouvrir = (api) =>
    appelApi({ action: 'acces-demo-ouvrir', code: $('code-essai').value }, { methode: 'POST', base: api }).catch(
      () => null,
    );
  let r = await ouvrir(API_PROD);
  if (!r || !r.ok) r = (await ouvrir(API_PROD + '-demo')) || r;
  if (!r) r = { ok: false, erreur: 'Connexion impossible, réessayez dans un instant.' };
  if (!r.ok) {
    bouton.disabled = false;
    bouton.textContent = 'Ouvrir';
    $('erreur-essai').textContent = r.erreur || 'Code refusé.';
    $('erreur-essai').hidden = false;
    return;
  }
  entrerDansLaDemo(r.vue);
});
// Retour arrière depuis la démo : la fenêtre d'essai redevient utilisable.
window.addEventListener('pageshow', () => {
  $('valider-essai').disabled = false;
  $('valider-essai').textContent = 'Ouvrir';
  document.querySelectorAll('[data-demo-vue]').forEach((b) => b.removeAttribute('aria-busy'));
});

// Étapes, outils et questions apparaissent en douceur au défilement (rien si animations réduites).
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver(
    (vus) =>
      vus.forEach((v) => {
        if (!v.isIntersecting) return;
        v.target.classList.add('ac-vu');
        io.unobserve(v.target);
        setTimeout(() => (v.target.style.transitionDelay = ''), 1000);
      }),
    { threshold: 0.15 },
  );
  document.querySelectorAll('.ac-etapes li, .ac-outil, .ac-modalites > div, .ac-faq details').forEach((el) => {
    el.style.transitionDelay = `${([...el.parentNode.children].indexOf(el) % 6) * 80}ms`;
    el.classList.add('ac-revele');
    io.observe(el);
  });
}
