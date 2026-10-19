/* Embarquement d'un compte de l'équipe à sa première connexion (admin.html, support.html) :
   1. ce que le rôle permet ; (admins) catalogue de la région et stock tec.tech ; 2. prénom, nom, e-mail des notifications, région(s) attribuée(s)
   (affichées : seul un admin national les change, onglet Équipe).
   EmbarquementEquipe.ouvrir(compte, appel) → Promise du compte mis à jour.
   `appel(action, donnees)` : appel API authentifié de la page. */
(function () {
  const esc = (s) => (window.echapper ? window.echapper(s) : String(s == null ? '' : s));
  const FONCTIONS = {
    national: [
      ['Équipe', 'Ajoutez les personnes et attribuez leur rôle et leurs régions avant leur arrivée.'],
      ['Commandes et SAV', 'Toutes les régions : validation, préparation, livraison, tickets.'],
      ['Distribution', 'Programmes CVDL et projets des structures Internes, répartition prévue.'],
      ['Réglages', 'Catalogue, périmètre, alertes et modèles de documents.'],
    ],
    admin: [
      ['Vos structures', 'Uniquement celles de vos régions : fiches, codes, équipes des Internes.'],
      ['Commandes', 'Vous êtes prévenu·e des nouvelles commandes de vos régions.'],
      ['Distribution', 'Vos programmes et les projets des Internes, avec la répartition prévue.'],
      ['SAV', 'Les tickets des structures de vos régions.'],
    ],
    sav: [
      ['Commandes', 'Valider, préparer, saisir les numéros de série, expédier, livrer.'],
      ['SAV', 'Tickets, fil d’échange, bons Colissimo.'],
      ['Vos régions', 'Seules les structures de vos régions apparaissent.'],
    ],
    compta: [
      ['Finances', 'Facturé, encaissé, impayés et relances, toutes régions.'],
      ['Devis et factures', 'Émission, envoi, factures mensuelles.'],
    ],
  };
  /* Catalogue et stock : étape montrée aux admins (national et chargé·e de distribution). */
  const CATALOGUE = {
    national: {
      titre: 'Un catalogue, des réglages par région',
      cartes: [
        [
          'Fiches communes',
          'Vous créez les produits communs : nom, caractéristiques, système (Linux), stock Salesforce.',
        ],
        ['Chaque région règle', 'Produits proposés, prix, quantité max. et stock : onglet Stock → choisir la région.'],
        [
          'Stock depuis tec.tech',
          'Chaque région renseigne ses stocks tec.tech ; « Synchroniser » recalcule les quantités.',
        ],
      ],
      aFaire: 'À faire : vérifier dans chaque région le stock repris au lancement, et les identifiants tec.tech.',
    },
    admin: {
      titre: 'Le catalogue et le stock de votre région',
      cartes: [
        [
          'Vos produits',
          'Proposez ou retirez les produits communs, ajustez les prix ; créez des produits pour vos structures.',
        ],
        [
          'Votre stock vient de tec.tech',
          'Dans tec.tech, relevez l’identifiant de chaque stock de votre région (ex. S-0454).',
        ],
        [
          'Synchronisez',
          'Onglet Stock : collez ces identifiants, puis « Synchroniser tec.tech » met les quantités à jour.',
        ],
      ],
      aFaire: 'Première chose à faire : renseigner vos stocks tec.tech, sinon vos structures verront 0 en stock.',
    },
  };
  const ROLES = { admin: 'Chargé·e de distribution', sav: 'Logistique', compta: 'Comptabilité' };

  function ouvrir(compte, appel) {
    return new Promise((fini) => {
      const national = compte.national && compte.role === 'admin';
      const role = national ? 'Admin national' : ROLES[compte.role] || compte.role;
      const fonctions = FONCTIONS[national ? 'national' : compte.role] || [];
      const catalogue = compte.role === 'admin' ? CATALOGUE[national ? 'national' : 'admin'] : null;
      const total = catalogue ? 3 : 2;
      const voile = document.createElement('div');
      voile.className = 'eq-emb';
      voile.setAttribute('role', 'dialog');
      voile.setAttribute('aria-modal', 'true');
      voile.setAttribute('aria-labelledby', 'eq-emb-titre');
      document.body.appendChild(voile);
      const [prenom0, ...reste] = String(compte.nom || '').split(' ');
      const valeurs = {
        prenom: compte.prenom || (reste.length ? prenom0 : ''),
        nom: reste.join(' '),
        emailNotif: compte.emailNotif || compte.email,
      };
      const territoire = compte.national
        ? '<span class="eq-emb-puce">Toutes les régions</span>'
        : (compte.regions || []).map((r) => `<span class="eq-emb-puce">${esc(r)}</span>`).join('');

      function etape1() {
        voile.innerHTML = `<div class="eq-emb-carte">
          <span class="eq-emb-sur">Bienvenue sur CVDL · étape 1 sur ${total}</span>
          <h2 id="eq-emb-titre">Votre rôle : ${esc(role)}</h2>
          <div class="eq-emb-terr">${territoire}</div>
          <div class="eq-emb-grille">${fonctions
            .map(([t, d], i) => `<div class="eq-emb-f"><i>${i + 1}</i><b>${esc(t)}</b><span>${esc(d)}</span></div>`)
            .join('')}</div>
          <div class="eq-emb-actions"><button type="button" class="eq-emb-btn" data-suite>Continuer</button></div>
        </div>`;
        voile.querySelector('[data-suite]').focus();
      }
      function etapeCatalogue() {
        voile.innerHTML = `<div class="eq-emb-carte">
          <span class="eq-emb-sur">Catalogue et stock · étape 2 sur 3</span>
          <h2 id="eq-emb-titre">${esc(catalogue.titre)}</h2>
          <div class="eq-emb-flux" aria-label="Du stock tec.tech aux commandes">
            <span><b>tec.tech</b><small>stocks de la région</small></span><i aria-hidden="true">→</i>
            <span><b>CVDL</b><small>stock de la région</small></span><i aria-hidden="true">→</i>
            <span><b>Structures</b><small>commandent</small></span>
          </div>
          <div class="eq-emb-grille eq-emb-trois">${catalogue.cartes
            .map(([t, d], i) => `<div class="eq-emb-f"><i>${i + 1}</i><b>${esc(t)}</b><span>${esc(d)}</span></div>`)
            .join('')}</div>
          <p class="eq-emb-afaire">${esc(catalogue.aFaire)}</p>
          <div class="eq-emb-actions"><button type="button" class="eq-emb-btn sec" data-retour="1">Retour</button><button type="button" class="eq-emb-btn" data-profil>Continuer</button></div>
        </div>`;
        voile.querySelector('[data-profil]').focus();
      }
      function etape2(erreur) {
        voile.innerHTML = `<form class="eq-emb-carte" novalidate>
          <span class="eq-emb-sur">Votre profil · étape ${total} sur ${total}</span>
          <h2 id="eq-emb-titre">Qui êtes-vous ?</h2>
          <div class="eq-emb-champs">
            <label><span>Prénom</span><input name="prenom" autocomplete="given-name" maxlength="40" value="${esc(valeurs.prenom)}" required></label>
            <label><span>Nom</span><input name="nom" autocomplete="family-name" maxlength="60" value="${esc(valeurs.nom)}" required></label>
            <label class="eq-emb-large"><span>E-mail des notifications</span><input name="emailNotif" type="email" maxlength="120" value="${esc(valeurs.emailNotif)}" required>
              <small>Nouvelles commandes de vos régions, alertes. Par défaut, votre adresse de connexion.</small></label>
            <div class="eq-emb-large"><span class="eq-emb-lab">Région(s) attribuée(s)</span><div class="eq-emb-terr">${territoire}</div>
              <small>Attribuées par un admin national. Une erreur ? Demandez-lui de la corriger dans l’onglet Équipe.</small></div>
          </div>
          <p class="eq-emb-erreur" role="alert">${esc(erreur || '')}</p>
          <div class="eq-emb-actions"><button type="button" class="eq-emb-btn sec" data-retour="${catalogue ? 2 : 1}">Retour</button><button type="submit" class="eq-emb-btn">Commencer</button></div>
        </form>`;
        voile.querySelector('input[name="prenom"]').focus();
      }
      voile.addEventListener('click', (e) => {
        if (e.target.closest('[data-suite]')) (catalogue ? etapeCatalogue : etape2)();
        if (e.target.closest('[data-profil]')) etape2();
        const retour = e.target.closest('[data-retour]');
        if (retour) (retour.dataset.retour === '2' ? etapeCatalogue : etape1)();
      });
      voile.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        ['prenom', 'nom', 'emailNotif'].forEach((k) => (valeurs[k] = f.elements[k].value.trim()));
        const bouton = f.querySelector('[type="submit"]');
        bouton.disabled = true;
        const r = await Promise.resolve(appel('compte-embarquer', valeurs)).catch(() => null);
        if (!r || !r.ok) return etape2((r && r.erreur) || 'Enregistrement impossible — réessayez.');
        voile.remove();
        fini(Object.assign({}, compte, r.compte));
      });
      etape1();
    });
  }
  window.EmbarquementEquipe = { ouvrir };
})();
