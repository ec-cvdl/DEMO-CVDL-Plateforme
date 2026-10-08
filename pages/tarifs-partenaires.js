let codeValide = '';
let partenairesCourants = [];

async function verifierCode() {
  const code = $('id-code').value.trim();
  if (!code) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Saisissez votre code structure.</div>';
    return;
  }
  $('btn-verifier-code').disabled = true;
  $('btn-verifier-code').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  $('retour-id-code').innerHTML = '';
  try {
    const r = await jsonp({ action: 'check', code });
    if (!r.ok) {
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    } else if (!r.interne) {
      $('retour-id-code').innerHTML =
        '<div class="msg msg-erreur">Cet espace est réservé aux structures Interne.</div>';
    } else {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-tarifs').hidden = false;
      $('btn-deconnexion-tarifs').hidden = false;
      await chargerPartenairesPourNoms();
      await chargerTarifsPartenaires();
    }
  } catch (e) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Réessayez.</div>';
  }
  $('btn-verifier-code').disabled = false;
  $('btn-verifier-code').textContent = 'Continuer';
}
$('btn-verifier-code').addEventListener('click', verifierCode);
$('id-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});

$('btn-deconnexion-tarifs').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});

/** Chargée uniquement pour afficher le nom des structures partenaires rattachées à chaque
 *  tarif (voir chargerTarifsPartenaires) — la gestion des structures elles-mêmes reste sur
 *  structures-partenaires.html. */
async function chargerPartenairesPourNoms() {
  try {
    const r = await jsonp({ action: 'structures-partenaires-lister', codeCreateur: codeValide });
    if (r.ok) partenairesCourants = r.structures;
  } catch (e) {}
}

/* ── Tarifs personnalisés ─────────────────────────────────────────────── */
let tarifsCourants = [];

async function chargerTarifsPartenaires() {
  $('liste-tarifs-partenaires').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  try {
    const r = await jsonp({ action: 'produits-partenaires-lister', codeCreateur: codeValide });
    if (!r.ok) {
      $('liste-tarifs-partenaires').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      return;
    }
    tarifsCourants = r.produits;
    if (!r.produits.length) {
      $('liste-tarifs-partenaires').innerHTML =
        '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucun tarif personnalisé créé pour le moment.</div>';
      return;
    }
    $('liste-tarifs-partenaires').innerHTML = r.produits
      .map((p) => {
        const codes = p.structuresDediees || [];
        const noms = codes.map((c) => (partenairesCourants.find((s) => s.code === c) || {}).nom || c);
        return `
      <div class="carte-partenaire carte-tarif" style="align-items:flex-start;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;width:100%;gap:8px;align-items:flex-start">
          <span data-ill="tarifs" class="s"></span>
          <div style="flex:1;min-width:0">
            <div class="nom">${echapper(p.nom)}</div>
            <div class="sous">${noms.map((n) => echapper(n)).join(', ')}</div>
          </div>
          <button type="button" class="btn-modifier-partenaire btn-supprimer-tarif" data-supprimer-tarif="${p.id}" style="flex:none">Supprimer</button>
        </div>
        <label class="case-toggle tarif-remplace tarif-remplace-carte">
          <span class="rp-interrupteur"><input type="checkbox" data-remplace-tarif="${p.id}" ${p.remplaceBase ? 'checked' : ''}><span class="rp-interrupteur-piste"></span></span>
          <span><b>${p.produitBase ? `Remplace « ${echapper(p.produitBase)} » dans le formulaire` : 'Remplacer le produit de base dans le formulaire'}</b>
            <small>${p.remplaceBase ? 'Le produit d’origine n’apparaît plus pour ces structures : seul ce tarif est proposé, à sa place.' : 'Désactivé : ce tarif s’affiche à côté du produit d’origine.'}</small></span>
        </label>
        <div style="display:flex;gap:8px;align-items:center;width:100%;flex-wrap:wrap">
          <label class="sr-only" for="tarif-nom-${p.id}">Nom du tarif</label>
          <input type="text" class="input" id="tarif-nom-${p.id}" data-nom-tarif="${p.id}" data-nom-initial="${echapper(p.nom)}" value="${echapper(p.nom)}" style="flex:1;min-width:180px" autocomplete="off">
          <label class="sr-only" for="tarif-prix-${p.id}">Prix</label>
          <input type="number" class="input" id="tarif-prix-${p.id}" data-prix-tarif="${p.id}" data-prix-initial="${p.prixStandard}" value="${p.prixStandard}" step="0.01" min="0" style="max-width:120px">
          <span style="font-size:12.5px">€</span>
          <button type="button" class="btn btn-secondary" data-enregistrer-prix-tarif="${p.id}" style="margin-left:auto">Enregistrer</button>
        </div>
      </div>`;
      })
      .join('');
    document.querySelectorAll('[data-supprimer-tarif]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!(await confirmerCvdl('Supprimer ce tarif personnalisé ?'))) return;
        const r = await poster({
          action: 'produit-partenaire-supprimer',
          codeCreateur: codeValide,
          id: b.dataset.supprimerTarif,
        });
        if (r.ok) await chargerTarifsPartenaires();
        else alerteCvdl(r.erreur || 'Suppression impossible.');
      }),
    );
    document.querySelectorAll('[data-remplace-tarif]').forEach((c) =>
      c.addEventListener('change', async () => {
        const p = tarifsCourants.find((x) => String(x.id) === c.dataset.remplaceTarif) || {};
        let produitBase = p.produitBase || '';
        // tarif créé sans produit de base : on le retrouve par son nom si possible
        if (c.checked && !produitBase) {
          produitBase =
            (await demanderCvdl(
              'Quel produit du catalogue ce tarif remplace-t-il ? (nom exact, ex. « Ordinateur portable catégorie A »)',
            )) || '';
          if (!produitBase.trim()) {
            c.checked = false;
            return;
          }
        }
        c.disabled = true;
        const r = await poster({
          action: 'produit-partenaire-update',
          codeCreateur: codeValide,
          id: c.dataset.remplaceTarif,
          champ: 'remplaceBase',
          valeur: c.checked,
          produitBase: produitBase.trim(),
        });
        if (!r.ok) {
          c.checked = !c.checked;
          alerteCvdl(r.erreur || 'Mise à jour impossible.');
          c.disabled = false;
          return;
        }
        await chargerTarifsPartenaires();
      }),
    );
    document.querySelectorAll('[data-enregistrer-prix-tarif]').forEach((b) =>
      b.addEventListener('click', async () => {
        const id = b.dataset.enregistrerPrixTarif;
        const input = document.querySelector(`[data-prix-tarif="${id}"]`);
        const champNom = document.querySelector(`[data-nom-tarif="${id}"]`);
        const nom = champNom.value.trim();
        if (!nom) {
          alerteCvdl('Le nom du tarif est obligatoire.');
          return;
        }
        b.disabled = true;
        // Nom d'abord (peut être refusé s'il existe déjà), puis le prix, seulement s'ils ont changé.
        if (nom !== champNom.dataset.nomInitial) {
          const rn = await poster({
            action: 'produit-partenaire-update',
            codeCreateur: codeValide,
            id,
            champ: 'nom',
            valeur: nom,
          });
          if (!rn.ok) {
            alerteCvdl(rn.erreur || 'Renommage impossible.');
            b.disabled = false;
            return;
          }
        }
        if (input.value !== input.dataset.prixInitial) {
          const r = await poster({
            action: 'produit-partenaire-update',
            codeCreateur: codeValide,
            id,
            champ: 'prix',
            valeur: input.value,
          });
          if (!r.ok) {
            alerteCvdl(r.erreur || 'Mise à jour impossible.');
            b.disabled = false;
            return;
          }
        }
        b.disabled = false;
        await chargerTarifsPartenaires();
      }),
    );
  } catch (e) {
    $('liste-tarifs-partenaires').innerHTML = '<div class="msg msg-erreur">Chargement impossible.</div>';
  }
}

$('btn-ouvrir-nouveau-tarif').addEventListener('click', async () => {
  $('nt-nom').value = '';
  $('nt-prix').value = '';
  $('nt-remplace').checked = false;
  $('retour-nouveau-tarif').innerHTML = '';
  $('nt-partenaires').innerHTML =
    partenairesCourants
      .map(
        (s) => `
    <label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" class="nt-partenaire-case" value="${echapper(s.code)}">${echapper(s.nom)}${s.typePublic ? ` <span style="opacity:0.55">(${echapper(s.typePublic)})</span>` : ''}</label>`,
      )
      .join('') ||
    '<p style="opacity:0.6;font-size:13px">Créez d\'abord une <a href="structures-partenaires.html">structure partenaire</a>.</p>';
  $('nt-base').innerHTML = '<option value="">Chargement…</option>';
  $('modale-nouveau-tarif').classList.add('visible');
  try {
    const r = await jsonp({ action: 'produits-public' });
    if (r.ok) {
      $('nt-base').innerHTML =
        '<option value="">— Choisir —</option>' +
        r.produits
          .filter((p) => p.visible)
          .map((p) => `<option value="${echapper(p.nom)}">${echapper(p.nom)} (${p.prixStandard}€)</option>`)
          .join('');
    }
  } catch (e) {
    $('nt-base').innerHTML = '<option value="">Chargement impossible</option>';
  }
});
$('nt-fermer').addEventListener('click', () => $('modale-nouveau-tarif').classList.remove('visible'));
function majAideRemplace() {
  const base = $('nt-base').value;
  $('nt-remplace-aide').textContent = base
    ? `Ces structures ne verront plus « ${base} » : ce tarif prendra sa place dans le formulaire de commande, au même rang.`
    : 'Ces structures ne verront plus que ce tarif, à la place du produit d’origine — au lieu des deux côte à côte.';
}
$('nt-base').addEventListener('change', majAideRemplace);
$('nt-remplace').addEventListener('change', majAideRemplace);
$('btn-valider-nouveau-tarif').addEventListener('click', async () => {
  const nomBase = $('nt-base').value;
  const nom = $('nt-nom').value.trim();
  const prix = $('nt-prix').value;
  const structuresDediees = Array.from(document.querySelectorAll('.nt-partenaire-case:checked'))
    .map((c) => c.value)
    .join(',');
  if (!nomBase) {
    $('retour-nouveau-tarif').innerHTML = '<div class="msg msg-erreur">Choisissez un produit de base.</div>';
    return;
  }
  if (!nom) {
    $('retour-nouveau-tarif').innerHTML =
      '<div class="msg msg-erreur">Le nom du nouveau produit est obligatoire.</div>';
    return;
  }
  if (prix === '' || parseFloat(prix) < 0) {
    $('retour-nouveau-tarif').innerHTML = '<div class="msg msg-erreur">Prix invalide.</div>';
    return;
  }
  if (!structuresDediees) {
    $('retour-nouveau-tarif').innerHTML =
      '<div class="msg msg-erreur">Sélectionnez au moins une structure partenaire.</div>';
    return;
  }
  $('btn-valider-nouveau-tarif').disabled = true;
  $('retour-nouveau-tarif').innerHTML = '';
  try {
    const r = await poster({
      action: 'produit-partenaire-creer',
      codeCreateur: codeValide,
      nomBase,
      nom,
      prix,
      structuresDediees,
      remplaceBase: $('nt-remplace').checked,
    });
    if (r.ok) {
      $('modale-nouveau-tarif').classList.remove('visible');
      await chargerTarifsPartenaires();
    } else {
      $('retour-nouveau-tarif').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Création impossible.')}</div>`;
    }
  } catch (e) {
    $('retour-nouveau-tarif').innerHTML = '<div class="msg msg-erreur">Création impossible — réessaie.</div>';
  }
  $('btn-valider-nouveau-tarif').disabled = false;
});

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    $('id-code').value = codeMemorise;
    verifierCode().finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = $('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}
