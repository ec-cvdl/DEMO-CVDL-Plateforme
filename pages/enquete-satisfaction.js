const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const params = new URLSearchParams(location.search);
const reference = params.get('ref') || '';
const jetonEnquete = params.get('t') || '';
const dateLivraison = params.get('date') || '';
$('reference-affichee').textContent = reference
  ? `${reference}${dateLivraison ? ` · livrée le ${dateLivraison}` : ''}`
  : '';

const notes = {};
$$('.notation').forEach((groupe) => {
  const cle = groupe.dataset.note;
  groupe.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      notes[cle] = b.dataset.valeur;
      groupe.querySelectorAll('button').forEach((x) => x.classList.toggle('actif', x === b));
    });
  });
});

$('btn-envoyer-enquete').addEventListener('click', async () => {
  if (!reference) {
    $('retour-enquete').innerHTML =
      '<div class="msg msg-erreur">Lien invalide — référence de commande manquante.</div>';
    return;
  }
  $('btn-envoyer-enquete').disabled = true;
  $('btn-envoyer-enquete').textContent = 'Envoi…';
  try {
    const r = await poster({
      action: 'enquete-repondre',
      reference: reference,
      jeton: jetonEnquete,
      noteGlobale: notes.noteGlobale || '',
      noteDelai: notes.noteDelai || '',
      noteMateriel: notes.noteMateriel || '',
      commentaire: $('commentaire').value.trim(),
    });
    if (r.ok) {
      $('etape-formulaire').hidden = true;
      $('etape-merci').hidden = false;
    } else {
      $('retour-enquete').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Envoi impossible.')}</div>`;
      $('btn-envoyer-enquete').disabled = false;
      $('btn-envoyer-enquete').textContent = 'Envoyer mon avis';
    }
  } catch (e) {
    $('retour-enquete').innerHTML = '<div class="msg msg-erreur">Envoi impossible — réessaie.</div>';
    $('btn-envoyer-enquete').disabled = false;
    $('btn-envoyer-enquete').textContent = 'Envoyer mon avis';
  }
});
