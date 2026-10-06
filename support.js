/* ════════════════════════════════════════════════════════════════════════════════════
   support.js — outil « Support SAV » (support.html) : boîte de tickets pour l'équipe SAV.
   · Connexion « Se connecter avec Google » (compte Workspace ajouté dans l'admin, onglet
     « Équipe »), ou accès de secours par mot de passe admin. Le serveur n'ouvre au rôle
     « sav » que les actions SAV (securite.js).
   · Files : à traiter, en attente de réponse, mes tickets, ouverts, par étape, colis, clos.
   · Ticket : échanges (réponse prévenue par e-mail, notes internes), statut, assignation,
     colis (adresse, bon PDF, suivi), contact masqué (affichage tracé), autres passages.
   Données personnelles : l'API renvoie les tickets déjà pseudonymisés ; rien n'est gardé en
   stockage local hormis le jeton de session (sessionStorage, 12 h).
   ════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const urlSure = (u) => (/^https?:\/\//i.test(String(u || '')) ? u : '#');
  const lireSession = (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  const ecrireSession = (k, v) => {
    try {
      v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v);
    } catch (e) {}
  };

  const S = {
    jeton: lireSession('cvdl-support-jeton') || '',
    compte: JSON.parse(lireSession('cvdl-support-compte') || 'null'),
    tickets: [],
    statuts: [],
    membres: [],
    file: 'a-traiter',
    recherche: '',
    ouvert: null,
    fils: {},
    brouillons: {},
    mode: {},
    apres: {},
    reveles: {},
    charge: false,
  };

  /* ── API ── */
  async function api(action, donnees, silencieux) {
    let r;
    try {
      const rep = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action, password: S.jeton }, donnees || {})),
      });
      r = await rep.json();
    } catch (e) {
      r = { ok: false, erreur: 'Connexion au serveur impossible.' };
    }
    if (r && r.sessionExpiree) {
      deconnecter('Session expirée : reconnectez-vous.');
    } else if (r && !r.ok && !silencieux) etat(r.erreur || 'Action impossible', 'erreur');
    return r || { ok: false };
  }
  let minuteurEtat;
  function etat(t, type) {
    const e = $('sp-etat');
    e.textContent = t;
    e.className = 'sp-etat on ' + (type || '');
    clearTimeout(minuteurEtat);
    minuteurEtat = setTimeout(
      () => {
        e.className = 'sp-etat';
      },
      type === 'erreur' ? 5000 : 2500,
    );
  }

  /* ── Connexion ── */
  function vue(v) {
    document.body.dataset.vue = v;
  }
  function deconnecter(message) {
    S.jeton = '';
    S.compte = null;
    S.reveles = {};
    S.fils = {};
    ecrireSession('cvdl-support-jeton', null);
    ecrireSession('cvdl-support-compte', null);
    vue('connexion');
    preparerGoogle();
    if (message) $('sp-login-msg').textContent = message;
  }
  function connecte(jeton, compte) {
    S.jeton = jeton;
    S.compte = compte;
    ecrireSession('cvdl-support-jeton', jeton);
    ecrireSession('cvdl-support-compte', JSON.stringify(compte));
    $('sp-login-msg').textContent = '';
    demarrer();
  }
  let googlePret = false;
  async function preparerGoogle() {
    if (googlePret) return;
    const c = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'auth-config' }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (c.domaine)
      document.querySelectorAll('[data-sp-domaine]').forEach((b) => {
        b.textContent = '@' + c.domaine;
      });
    if (!c.clientId) {
      $('sp-google').innerHTML =
        '<p class="sp-note">La connexion Google n’est pas encore configurée (GOOGLE_CLIENT_ID). Utilisez l’accès de secours.</p>';
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      googlePret = true;
      google.accounts.id.initialize({
        client_id: c.clientId,
        hd: c.domaine,
        ux_mode: 'popup',
        callback: async (rep) => {
          $('sp-login-msg').textContent = '';
          const r = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'auth-google', credential: rep.credential }),
          })
            .then((x) => x.json())
            .catch(() => ({ ok: false, erreur: 'Connexion au serveur impossible.' }));
          if (r.ok) connecte(r.jeton, r.compte);
          else $('sp-login-msg').textContent = r.erreur || 'Connexion refusée.';
        },
      });
      google.accounts.id.renderButton($('sp-google'), {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        locale: 'fr',
        width: 300,
      });
    };
    s.onerror = () => {
      $('sp-google').innerHTML = '<p class="sp-note">Connexion Google indisponible pour le moment.</p>';
    };
    document.head.appendChild(s);
  }
  $('sp-form-mdp').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mdp = $('sp-mdp').value;
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', password: mdp }),
    })
      .then((x) => x.json())
      .catch(() => ({ ok: false }));
    if (r.ok && r.jeton) {
      $('sp-mdp').value = '';
      connecte(r.jeton, { nom: 'Admin (secours)', email: '', role: 'admin' });
    } else $('sp-login-msg').textContent = r.erreur || 'Mot de passe incorrect.';
  });

  /* ── Données ── */
  const statut = (nom) => S.statuts.find((s) => s.statut === nom) || null;
  const COULEURS = {
    't-ambre': '#D97706',
    't-orange': '#EA580C',
    't-bleu': '#2563EB',
    't-violet': '#7C3AED',
    't-turquoise': '#00A3A8',
    't-vert': '#1F9D55',
    't-rouge': '#E5484D',
    't-gris': '#8FA3B3',
  };
  const couleurStatut = (nom) => {
    const s = statut(nom);
    return COULEURS[s && s.couleur] || '#8FA3B3';
  };
  const pastilleStatut = (nom) =>
    `<span class="sp-st" style="--c:${couleurStatut(nom)}"><i></i>${esc(nom || '—')}</span>`;
  const initiales = (n) =>
    String(n || '?')
      .split(/\s+/)
      .map((x) => x[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  const estClos = (t) => {
    const s = statut(t.statut);
    return !!(s && s.terminal);
  };
  const dateFr = (d) => {
    const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  };
  const derniereActivite = (t) => {
    const d = [dateFr(t.date)];
    (t.historique || []).forEach((h) => d.push(dateFr(h.date)));
    if (t.fil && t.fil.dernier) d.push(new Date(t.fil.dernier.date));
    return Math.max(...d.filter((x) => x && !isNaN(x)).map((x) => +x), 0);
  };
  const joursDepuis = (ms) => (ms ? Math.floor((Date.now() - ms) / 864e5) : 0);
  function ilYa(ms) {
    if (!ms) return '';
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 60) return min <= 1 ? 'à l’instant' : `il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const j = Math.round(h / 24);
    return j === 1 ? 'hier' : `il y a ${j} j`;
  }
  const attendNous = (t) => !!(t.fil && t.fil.dernier && t.fil.dernier.auteur !== 'admin');
  const nonLus = (t) => (t.fil && t.fil.nonLusAdmin) || 0;
  const bonAFaire = (t) => !!(t.fil && t.fil.adresseRecue && !t.bonColissimo);
  const nouveau = (t) => {
    const s = S.statuts[0];
    return !!(s && t.statut === s.statut);
  };

  const FILES = [
    {
      k: 'a-traiter',
      l: 'À traiter',
      c: '#E62460',
      f: (t) => !estClos(t) && (nonLus(t) > 0 || nouveau(t) || bonAFaire(t)),
    },
    {
      k: 'attente',
      l: 'En attente de réponse',
      c: '#FECC38',
      f: (t) => !estClos(t) && t.fil && t.fil.dernier && t.fil.dernier.auteur === 'admin',
    },
    {
      k: 'mes',
      l: 'Mes tickets',
      c: '#00ACB0',
      f: (t) => !estClos(t) && S.compte && S.compte.email && t.assigne === S.compte.email,
    },
    { k: 'ouverts', l: 'Tous les ouverts', c: '', f: (t) => !estClos(t) },
  ];
  const FILES_COLIS = [
    { k: 'bon', l: 'Adresse reçue · bon à faire', f: (t) => !estClos(t) && bonAFaire(t) },
    { k: 'route', l: 'Colis en route', f: (t) => !estClos(t) && !!String(t.colissimo || '').trim() },
  ];
  function filtre() {
    const tout = [
      ...FILES,
      ...FILES_COLIS,
      { k: 'clos', f: (t) => estClos(t) && joursDepuis(derniereActivite(t)) <= 30 },
    ];
    const f = tout.find((x) => x.k === S.file);
    let l = f
      ? S.tickets.filter(f.f)
      : S.tickets.filter((t) => !estClos(t) && t.statut === S.file.replace(/^etape:/, ''));
    const q = S.recherche.trim().toLowerCase();
    if (q)
      l = S.tickets.filter((t) =>
        `${t.reference} ${t.numeroSerie} ${t.structureNom} ${t.nom} ${t.symptome} ${t.marque} ${t.modele}`
          .toLowerCase()
          .includes(q),
      );
    // Le plus ancien d'abord pour ce qui attend l'équipe ; le plus récent ailleurs.
    const ancien = ['a-traiter', 'bon'].includes(S.file) && !q;
    return l.sort((a, b) =>
      ancien ? derniereActivite(a) - derniereActivite(b) : derniereActivite(b) - derniereActivite(a),
    );
  }

  async function charger() {
    const [r, rs, rm] = await Promise.all([
      api('sav-list', { limite: 0 }),
      S.statuts.length ? Promise.resolve({ ok: true, statuts: S.statuts }) : api('sav-statuts-list'),
      S.membres.length ? Promise.resolve({ ok: true, membres: S.membres }) : api('comptes-equipe', {}, true),
    ]);
    if (rs.ok) S.statuts = rs.statuts;
    if (rm.ok) S.membres = rm.membres;
    if (r.ok) {
      S.tickets = r.tickets;
      S.charge = true;
    }
    peindre();
  }

  /* ── Rendu ── */
  function peindre() {
    if (document.body.dataset.vue !== 'boite') return;
    const c = S.compte || {};
    $('sp-moi').innerHTML =
      `<span class="sp-av">${esc(initiales(c.nom))}</span><span class="sp-moi-t"><b>${esc(c.nom || '')}</b><small>${c.role === 'admin' ? 'Admin' : 'Support SAV'} · Se déconnecter</small></span>`;
    peindreNav();
    peindreListe();
    peindreDetail();
  }
  function lienNav(k, l, n, couleur) {
    return `<button type="button" class="sp-nav-l${S.file === k && !S.recherche ? ' on' : ''}" data-file="${esc(k)}">${couleur !== undefined ? `<span class="sp-pt" style="${couleur ? 'background:' + couleur : ''}"></span>` : ''}<span>${esc(l)}</span><b>${n}</b></button>`;
  }
  function peindreNav() {
    const etapes = S.statuts.filter((s) => !s.terminal);
    const clos = S.tickets.filter((t) => estClos(t) && joursDepuis(derniereActivite(t)) <= 30).length;
    $('sp-nav').innerHTML =
      FILES.map((f) => lienNav(f.k, f.l, S.tickets.filter(f.f).length, f.c)).join('') +
      `<span class="sp-grp">Par étape</span>` +
      etapes
        .map((s) =>
          lienNav('etape:' + s.statut, s.statut, S.tickets.filter((t) => !estClos(t) && t.statut === s.statut).length),
        )
        .join('') +
      `<span class="sp-grp">Colis</span>` +
      FILES_COLIS.map((f) => lienNav(f.k, f.l, S.tickets.filter(f.f).length)).join('') +
      `<span class="sp-grp">Archives</span>` +
      lienNav('clos', 'Clos (30 j)', clos);
  }
  function tags(t) {
    const r = [pastilleStatut(t.statut)];
    if (bonAFaire(t)) r.push('<span class="sp-tg j">Adresse reçue · bon à faire</span>');
    else if (t.fil && t.fil.adresseDemandee && !t.fil.adresseRecue)
      r.push('<span class="sp-tg g">Adresse demandée</span>');
    if (/Dépannage en ligne tenté/.test(t.commentaire || ''))
      r.push('<span class="sp-tg t">Dépannage en ligne tenté</span>');
    const m = t.assigne && S.membres.find((x) => x.email === t.assigne);
    if (m) r.push(`<span class="sp-av xs" title="Assigné : ${esc(m.nom)}">${esc(initiales(m.nom))}</span>`);
    return r.join('');
  }
  function qui(t) {
    return t.contactPersonnel
      ? t.code
        ? `Personne · ${t.structureNom || t.nom}`
        : 'Particulier'
      : t.structureNom || t.nom || '';
  }
  function peindreListe() {
    const l = filtre();
    const titre = S.recherche
      ? `Recherche · ${l.length}`
      : `${esc(([...FILES, ...FILES_COLIS].find((f) => f.k === S.file) || { l: S.file === 'clos' ? 'Clos (30 j)' : S.file.replace(/^etape:/, '') }).l)} · ${l.length}`;
    $('sp-liste').innerHTML =
      `<div class="sp-lt">${titre}</div>` +
      (l.length
        ? l
            .map((t) => {
              const act = derniereActivite(t);
              const retard = attendNous(t) && !estClos(t) && joursDepuis(act) >= 3;
              const apercu =
                t.fil && t.fil.dernier
                  ? `${t.fil.dernier.auteur === 'admin' ? 'Équipe : ' : ''}« ${t.fil.dernier.texte} »`
                  : (t.commentaire || '').split('\n')[0];
              return `<button type="button" class="sp-tk${S.ouvert === t.reference ? ' on' : ''}${nonLus(t) ? ' nonlu' : ''}" data-ticket="${esc(t.reference)}">
        <span class="sp-tk-h"><span class="sp-tk-t">${nonLus(t) ? '<span class="sp-nl" aria-label="Non lu"></span>' : ''}${esc(t.symptome || 'Symptôme non précisé')}</span><span class="sp-d${retard ? ' sla' : ''}">${retard ? joursDepuis(act) + ' j sans réponse' : esc(ilYa(act))}</span></span>
        <span class="sp-tk-m">${esc(t.reference)} · ${esc(qui(t))}</span>
        ${apercu ? `<span class="sp-l3">${esc(apercu)}</span>` : ''}
        <span class="sp-tags">${tags(t)}</span></button>`;
            })
            .join('')
        : `<p class="sp-vide">${S.charge ? 'Rien ici pour le moment.' : 'Chargement…'}</p>`);
  }

  function ticketOuvert() {
    return S.tickets.find((t) => t.reference === S.ouvert) || null;
  }
  function revele(t) {
    const r = S.reveles[t.ligne];
    if (r && Date.now() > r.expire) {
      delete S.reveles[t.ligne];
      return null;
    }
    return r ? r.d : null;
  }

  function bulles(t, f) {
    return f.fil
      .map((m) => {
        const h = new Date(m.date);
        const quand = isNaN(h)
          ? ''
          : h.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
            ' · ' +
            h.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if (m.type === 'statut') return `<span class="sf-evt"><i></i>${esc(m.texte)} · ${esc(quand)}</span>`;
        if (m.type === 'note')
          return `<div class="sp-note-int"><span class="sf-qui">Note interne · ${esc(m.par || 'Équipe')}</span>${esc(m.texte).replace(/\n/g, '<br>')}<small>${esc(quand)}</small></div>`;
        if (m.type !== 'message')
          return `<span class="sf-evt"><i></i>${esc(m.texte)}${m.type === 'bon' && m.pieceJointe ? ` · <a href="${esc(urlSure(m.pieceJointe))}" target="_blank" rel="noopener">PDF</a>` : ''} · ${esc(quand)}</span>`;
        const equipe = m.auteur === 'admin';
        const auteur = equipe
          ? m.par || 'Équipe'
          : m.auteur === 'structure'
            ? m.par || t.structureNom || 'Structure'
            : 'Personne';
        return `<div class="sf-bul ${equipe ? 'moi' : 'eux'}"><span class="sf-qui">${esc(auteur)}</span>${esc(m.texte || '').replace(/\n/g, '<br>')}${m.pieceJointe ? `<a class="sf-pj" href="${esc(urlSure(m.pieceJointe))}" target="_blank" rel="noopener">Photo jointe</a>` : ''}<small>${esc(quand)}</small></div>`;
      })
      .join('');
  }

  function peindreDetail() {
    const d = $('sp-detail');
    const t = ticketOuvert();
    document.body.classList.toggle('sp-ticket-ouvert', !!t);
    if (!t) {
      d.innerHTML = `<div class="sp-accueil"><span data-ill="suiviSav" class="ill"></span><p>Choisissez un ticket dans la liste.</p></div>`;
      illustrer(d);
      return;
    }
    const f = S.fils[t.ligne];
    if (!f) chargerFil(t);
    const mode = S.mode[t.ligne] || 'repondre';
    const rv = revele(t);
    const email = t.email || (rv && rv.contact && rv.contact.email) || '';
    const tel = t.telephone || (rv && rv.contact && rv.contact.telephone) || '';
    const adr = (rv && rv.contact && rv.contact.adresse) || (f && f.ok && f.adresse) || null;
    const autres = S.tickets.filter(
      (x) => x.reference !== t.reference && t.numeroSerie && x.numeroSerie === t.numeroSerie,
    );
    const etapes = S.statuts;
    const idx = etapes.findIndex((s) => s.statut === t.statut);
    const ill = window.cleSymptomeCvdl ? 'sym-' + window.cleSymptomeCvdl(t.symptome) : 'panne';
    d.innerHTML = `<div class="sp-conv">
      <div class="sp-conv-t">
        <button type="button" class="sp-retour" data-sp="fermer" aria-label="Retour à la liste">←</button>
        <span class="sp-ill">${window.illustrationCvdl ? window.illustrationCvdl(ill) || '' : ''}</span>
        <div class="sp-conv-titre"><div class="sp-s"><b>${esc(t.reference)}</b> · ouvert le ${esc(t.date)}</div><h2>${esc(t.symptome || 'Symptôme non précisé')}</h2><div class="sp-s">${esc(qui(t))}${t.nomBeneficiaire ? ' · ' + esc(t.nomBeneficiaire) : ''}${t.responsableSav && !t.contactPersonnel ? ' · ' + esc(t.responsableSav) : ''}</div></div>
        <div class="sp-props">
          <label class="sp-prop" style="--c:${couleurStatut(t.statut)}"><span class="sp-sr">Statut</span><i></i><select data-sp-statut="${t.ligne}">${S.statuts.map((s) => `<option${s.statut === t.statut ? ' selected' : ''}>${esc(s.statut)}</option>`).join('')}</select></label>
          <label class="sp-prop"><span class="sp-sr">Assigné à</span><span class="sp-av xs">${esc(initiales((S.membres.find((m) => m.email === t.assigne) || {}).nom || '–'))}</span><select data-sp-assigner="${t.ligne}"><option value="">Non assigné</option>${S.membres.map((m) => `<option value="${esc(m.email)}"${t.assigne === m.email ? ' selected' : ''}>${esc(m.nom)}</option>`).join('')}</select></label>
        </div>
      </div>
      <div class="sf-msgs sp-fil">${f ? (f.ok ? bulles(t, f) || '<p class="sp-vide">Aucun échange pour l’instant.</p>' : `<p class="sp-vide">${esc(f.erreur || 'Échanges indisponibles')}</p>`) : '<p class="sp-vide">Chargement…</p>'}${t.commentaire ? `<div class="sp-origine"><span class="sf-qui">Demande initiale</span>${esc(t.commentaire).replace(/\n/g, '<br>')}</div>` : ''}</div>
      <form class="sp-compo${mode === 'note' ? ' note' : ''}" data-sp-compo="${t.ligne}">
        <div class="sp-onglets" role="tablist"><button type="button" role="tab" aria-selected="${mode === 'repondre'}" data-sp-mode="repondre">Répondre</button><button type="button" role="tab" aria-selected="${mode === 'note'}" data-sp-mode="note">Note interne</button></div>
        <textarea class="input" name="texte" rows="3" maxlength="3000" placeholder="${mode === 'note' ? 'Note visible seulement par l’équipe…' : t.contactPersonnel ? 'Répondre à la personne… (prévenue par e-mail, son adresse n’est jamais affichée)' : 'Répondre à la structure… (prévenue par e-mail)'}">${esc(S.brouillons[t.ligne + mode] || '')}</textarea>
        <div class="sp-cb">
          ${
            mode === 'repondre'
              ? `<label class="sp-sel"><span>Après envoi</span><select name="apres"><option value="">Garder le statut</option>${S.statuts
                  .filter((s) => s.statut !== t.statut)
                  .map((s) => `<option>${esc(s.statut)}</option>`)
                  .join('')}</select></label>`
              : '<span class="sp-mention">Jamais visible par la personne ni la structure.</span>'
          }
          <button type="submit" class="btn btn-primary">${mode === 'note' ? 'Ajouter la note' : 'Envoyer'}</button>
        </div>
        ${f && f.ok && !f.peutPrevenir && mode === 'repondre' ? '<p class="sp-err">Pas d’e-mail sur ce ticket : la réponse sera visible sur la page de suivi, sans notification.</p>' : ''}
      </form>
    </div>
    <aside class="sp-cote">
      <div class="sp-bloc"><span class="sp-h">Appareil</span>
        ${t.marque || t.modele ? `<div class="sp-r"><span>Modèle</span><b>${esc([t.marque, t.modele].filter(Boolean).join(' '))}</b></div>` : ''}
        ${t.numeroSerie ? `<div class="sp-r"><span>N° de série</span><b>${esc(t.numeroSerie)}</b></div>` : ''}
        ${t.dateAchat ? `<div class="sp-r"><span>Achat / don</span><b>${esc(t.dateAchat)}</b></div>` : ''}
        ${t.referenceCommande ? `<div class="sp-r"><span>Commande</span><b>${esc(t.referenceCommande)}</b></div>` : ''}
        ${t.numeroSerie ? `<a class="sp-mini" href="passeport.html?sn=${encodeURIComponent(t.numeroSerie)}" target="_blank" rel="noopener">Voir le passeport →</a>` : ''}</div>
      <div class="sp-bloc"><span class="sp-h">Avancement</span><div class="sp-etp">${etapes
        .filter((s) => !s.terminal || s.statut === t.statut)
        .map(
          (s, i) =>
            `<div class="${s.statut === t.statut ? 'cur' : idx > -1 && etapes.indexOf(s) < idx ? 'ok' : 'fut'}"><i></i>${esc(s.statut)}</div>`,
        )
        .join('')}</div></div>
      <div class="sp-bloc"><span class="sp-h">Colis</span>
        ${
          t.bonColissimo
            ? `<a class="sp-chip ok" href="${esc(urlSure(t.bonColissimo))}" target="_blank" rel="noopener">✓ Bon Colissimo (PDF)</a>`
            : f && f.ok && f.adresseRecue
              ? `<span class="sp-chip ok">✓ Adresse reçue${t.contactPersonnel && !adr ? ' · masquée' : ''}</span>`
              : f && f.ok && f.adresseDemandee
                ? '<span class="sp-chip att">Adresse demandée, en attente</span>'
                : `<button type="button" class="sp-chip" data-sp="adresse">Demander l’adresse d’envoi</button>`
        }
        ${adr && !t.bonColissimo ? `<div class="sp-adr"><b>${esc(adr.nom || '')}</b><br>${esc(adr.adresse || '')}<br>${esc((adr.codePostal || '') + ' ' + (adr.ville || ''))}${adr.telephone ? '<br>' + esc(adr.telephone) : ''}</div>` : ''}
        ${f && f.ok && f.adresseRecue && !adr && t.contactPersonnel && !t.bonColissimo ? `<button type="button" class="sp-mini" data-sp="reveler" data-motif="Créer le bon Colissimo">Afficher l’adresse (tracé)</button>` : ''}
        <label class="sp-chip">${t.bonColissimo ? 'Remplacer le bon (PDF)' : 'Déposer le bon (PDF)'}<input type="file" accept="application/pdf,.pdf" data-sp-bon="${t.ligne}" hidden></label>
        <label class="sp-champ">Suivi Colissimo<input class="input" data-sp-suivi="${t.ligne}" value="${esc(t.colissimo || '')}" placeholder="https://www.laposte.fr/outils/suivre-vos-envois?code=…"></label></div>
      <div class="sp-bloc"><span class="sp-h">Contact</span>
        ${t.contactPersonnel ? '' : `<div class="sp-r"><span>Structure</span><b>${esc(t.structureNom || t.nom)}</b></div>${t.responsableSav ? `<div class="sp-r"><span>Responsable</span><b>${esc(t.responsableSav)}</b></div>` : ''}`}
        ${email ? `<div><a href="mailto:${esc(email)}">${esc(email)}</a></div>` : t.emailIndice ? `<div class="sp-masq">${esc(t.emailIndice)}</div>` : ''}
        ${tel ? `<div>${esc(tel)}</div>` : t.telephoneIndice ? `<div class="sp-masq">${esc(t.telephoneIndice)}</div>` : ''}
        ${t.identiteMasquee && !rv ? `<button type="button" class="sp-mini" data-sp="reveler">${t.contactPersonnel ? 'Afficher les coordonnées (tracé)' : 'Afficher l’identité (tracé)'}</button>` : ''}
        ${rv ? `<button type="button" class="sp-mini" data-sp="masquer">Masquer</button>` : ''}</div>
      ${autres.length ? `<div class="sp-bloc"><span class="sp-h">Autres passages</span>${autres.map((x) => `<button type="button" class="sp-r sp-lien" data-ticket="${esc(x.reference)}"><span>${esc(x.reference)}</span><b>${esc(x.symptome || '')} · ${esc(x.statut)}</b></button>`).join('')}</div>` : ''}
    </aside>`;
    const fil = d.querySelector('.sp-fil');
    if (fil) fil.scrollTop = fil.scrollHeight;
  }
  function illustrer(el) {
    if (window.portailIllustrations) window.portailIllustrations(el);
  }

  async function chargerFil(t) {
    if (S.fils['_' + t.ligne]) return;
    S.fils['_' + t.ligne] = true;
    const r = await api('sav-fil-admin', { ligne: t.ligne }, true);
    delete S.fils['_' + t.ligne];
    S.fils[t.ligne] = r;
    if (r.ok && t.fil) t.fil.nonLusAdmin = 0;
    if (!enSaisie()) {
      peindreListe();
      peindreNav();
      if (S.ouvert === t.reference) peindreDetail();
    }
  }
  const enSaisie = () => {
    const a = document.activeElement;
    return !!(a && a.closest && a.closest('.sp-compo, .sp-champ, .sp-revel'));
  };

  /* ── Révélation tracée ── */
  function demanderMotif(defaut) {
    const MOTIFS = [
      'Contacter la personne',
      'Créer le bon Colissimo',
      'Vérification / litige',
      'Demande de la personne (droits RGPD)',
      'Autre',
    ];
    return new Promise((ok) => {
      const v = document.createElement('div');
      v.className = 'sp-voile';
      v.innerHTML = `<form class="sp-revel" role="dialog" aria-modal="true" aria-labelledby="sp-rv-t"><span class="sp-k">Données personnelles</span><h2 id="sp-rv-t">Afficher les coordonnées ?</h2>
        <p>Seulement si c’est nécessaire. La consultation est enregistrée à votre nom, et les données se masquent après 5 minutes.</p>
        <fieldset><legend>Motif</legend>${MOTIFS.map((m) => `<label><input type="radio" name="m" value="${esc(m)}"${m === (defaut || MOTIFS[0]) ? ' checked' : ''}>${esc(m)}</label>`).join('')}</fieldset>
        <input class="input" name="autre" placeholder="Précisez le motif" hidden maxlength="180">
        <div class="sp-revel-a"><button type="button" class="btn btn-secondary" data-x>Annuler</button><button class="btn btn-primary">Afficher</button></div></form>`;
      const f = v.querySelector('form');
      const fin = (x) => {
        v.remove();
        ok(x);
      };
      f.addEventListener('change', () => {
        f.elements.autre.hidden = f.elements.m.value !== 'Autre';
      });
      v.addEventListener('click', (e) => {
        if (e.target === v || e.target.closest('[data-x]')) fin(null);
      });
      v.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fin(null);
      });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const m = f.elements.m.value === 'Autre' ? f.elements.autre.value.trim() : f.elements.m.value;
        if (m.length >= 3) fin(m);
        else f.elements.autre.focus();
      });
      document.body.appendChild(v);
      f.querySelector('input:checked').focus();
    });
  }
  async function reveler(t, motifDefaut) {
    const motif = await demanderMotif(motifDefaut);
    if (!motif) return;
    const r = await api('identite-reveler', { objet: 'sav', ligne: t.ligne, motif });
    if (!r.ok) return;
    S.reveles[t.ligne] = { d: r, expire: Date.now() + 5 * 60000 };
    setTimeout(() => peindreDetail(), 5 * 60000 + 100);
    etat('Coordonnées affichées — consultation enregistrée', 'succes');
    peindreDetail();
  }

  /* ── Événements ── */
  document.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-file]');
    if (f) {
      S.file = f.dataset.file;
      S.recherche = '';
      $('sp-recherche').value = '';
      peindre();
      return;
    }
    const tk = e.target.closest('[data-ticket]');
    if (tk) {
      S.ouvert = tk.dataset.ticket;
      const t = ticketOuvert();
      if (t) delete S.fils[t.ligne];
      peindre();
      return;
    }
    if (e.target.closest('#sp-moi')) {
      if (confirm('Se déconnecter ?')) deconnecter();
      return;
    }
    const m = e.target.closest('[data-sp-mode]');
    if (m) {
      const t = ticketOuvert();
      S.mode[t.ligne] = m.dataset.spMode;
      peindreDetail();
      const ta = document.querySelector('.sp-compo textarea');
      if (ta) ta.focus();
      return;
    }
    const a = e.target.closest('[data-sp]');
    const t = ticketOuvert();
    if (!a || !t) return;
    if (a.dataset.sp === 'fermer') {
      S.ouvert = null;
      peindre();
    }
    if (a.dataset.sp === 'reveler') reveler(t, a.dataset.motif);
    if (a.dataset.sp === 'masquer') {
      delete S.reveles[t.ligne];
      peindreDetail();
    }
    if (a.dataset.sp === 'adresse') {
      if (
        !confirm('Demander l’adresse d’envoi ? Elle sera prévenue par e-mail et la renseignera sur sa page de suivi.')
      )
        return;
      const r = await api('sav-fil-demander-adresse', { ligne: t.ligne });
      if (r.ok) {
        etat('Adresse demandée', 'succes');
        delete S.fils[t.ligne];
        peindreDetail();
      }
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'sp-recherche') {
      S.recherche = e.target.value;
      peindreNav();
      peindreListe();
      return;
    }
    const c = e.target.closest('[data-sp-compo]');
    if (c && e.target.name === 'texte') {
      const l = c.dataset.spCompo;
      S.brouillons[l + (S.mode[l] || 'repondre')] = e.target.value;
    }
  });
  document.addEventListener('change', async (e) => {
    const t = ticketOuvert();
    if (!t) return;
    if (e.target.matches('[data-sp-statut]')) {
      const r = await api('sav-update', { ligne: t.ligne, champ: 'statut', valeur: e.target.value });
      if (r.ok) {
        etat('Statut mis à jour', 'succes');
        t.statut = e.target.value;
        delete S.fils[t.ligne];
        charger();
      }
    }
    if (e.target.matches('[data-sp-assigner]')) {
      const r = await api('sav-assigner', { ligne: t.ligne, email: e.target.value });
      if (r.ok) {
        t.assigne = e.target.value;
        etat('Ticket assigné', 'succes');
        peindre();
      }
    }
    if (e.target.matches('[data-sp-suivi]')) {
      const v = e.target.value.trim();
      if (v && !/^https:\/\//.test(v)) {
        etat('Le lien de suivi doit commencer par https://', 'erreur');
        return;
      }
      const r = await api('sav-update', { ligne: t.ligne, champ: 'colissimo', valeur: v });
      if (r.ok) {
        t.colissimo = v;
        etat('Suivi enregistré', 'succes');
        peindreNav();
      }
    }
    if (e.target.matches('[data-sp-bon]')) {
      const fi = e.target.files[0];
      if (!fi) return;
      if (fi.size > 10 * 1024 * 1024) {
        etat('PDF trop lourd (10 Mo maximum)', 'erreur');
        return;
      }
      const base64 = await new Promise((ok, ko) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result).split(',')[1] || '');
        r.onerror = ko;
        r.readAsDataURL(fi);
      });
      etat('Dépôt du bon…');
      const r = await api('sav-bon-colissimo', {
        ligne: t.ligne,
        fichier: { nom: fi.name, type: fi.type || 'application/pdf', base64 },
      });
      if (r.ok) {
        t.bonColissimo = r.url || '';
        etat('Bon déposé : la personne est prévenue', 'succes');
        delete S.fils[t.ligne];
        charger();
      }
    }
  });
  document.addEventListener('submit', async (e) => {
    const c = e.target.closest('[data-sp-compo]');
    if (!c) return;
    e.preventDefault();
    const t = ticketOuvert();
    if (!t) return;
    const mode = S.mode[t.ligne] || 'repondre';
    const texte = c.elements.texte.value.trim();
    if (!texte) {
      c.elements.texte.focus();
      return;
    }
    const b = c.querySelector('[type=submit]');
    b.disabled = true;
    const r = await api(mode === 'note' ? 'sav-fil-note' : 'sav-fil-repondre', { ligne: t.ligne, texte });
    b.disabled = false;
    if (!r.ok) return;
    delete S.brouillons[t.ligne + mode];
    const apres = mode === 'repondre' && c.elements.apres && c.elements.apres.value;
    if (apres) {
      const rs = await api('sav-update', { ligne: t.ligne, champ: 'statut', valeur: apres });
      if (rs.ok) t.statut = apres;
    }
    etat(mode === 'note' ? 'Note ajoutée' : 'Réponse envoyée', 'succes');
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    delete S.fils[t.ligne];
    charger();
  });

  /* ── Démarrage ── */
  let minuteur;
  async function demarrer() {
    vue('boite');
    peindre();
    await charger();
    const r = await api('auth-moi', {}, true);
    if (r.ok && r.compte) {
      S.compte = Object.assign({}, S.compte, r.compte);
      ecrireSession('cvdl-support-compte', JSON.stringify(S.compte));
      peindre();
    }
    clearInterval(minuteur);
    minuteur = setInterval(() => {
      if (!document.hidden && !enSaisie() && document.body.dataset.vue === 'boite') {
        const t = ticketOuvert();
        if (t) delete S.fils[t.ligne];
        charger();
      }
    }, 45000);
  }
  if (S.jeton) demarrer();
  else deconnecter();
})();
