/* Admin CVDL — étapes de la fiche commande. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ════════════════════════════════════════════════════════════════════════════════════
   Carte « étape en cours » de la fiche commande (maquette « Déroulé d'une commande »).
   Une étape = une courte liste de tâches numérotées : faites (✓, repliées, résumé + Modifier),
   en cours (ouverte), à venir (grisées). UN seul bouton principal en bas (« Passer à … »),
   grisé tant que le serveur dit qu'il manque quelque chose, avec la ligne « Il manque… ».
   Les saisies s'enregistrent d'elles-mêmes (numéros complets, lien Colissimo, dates).
   Les gestionnaires existants sont réutilisés (mêmes data-attributs / ids).
   ════════════════════════════════════════════════════════════════════════════════════ */
/** États des tâches au rendu précédent (par commande) : sert à n'animer QUE ce qui vient de
 *  changer — une tâche qui apparaît se déplie, une tâche qui vient d'être faite fait « pop ». */
const etatsTachesPrecedents = {};
function tacheEtape(n, t) {
  // t = { etat:'ok'|'cours'|'avenir'|'info', titre, detail, action, contenu, facultatif, anim }
  const num = t.etat === 'ok' ? icon('check', 13) : t.etat === 'info' ? '!' : n;
  return `<li class="et-tache ${t.etat}${t.facultatif ? ' fac' : ''}${t.anim ? ' ' + t.anim : ''}">
    <div class="et-tache-l"><span class="et-num" aria-hidden="true">${num}</span>
      <div class="et-tache-t"><b>${t.titre}${t.facultatif ? ' <span class="et-fac">facultatif</span>' : ''}</b>${t.detail ? `<small>${t.detail}</small>` : ''}</div>
      ${t.action ? `<div class="et-tache-a">${t.action}</div>` : ''}</div>
    ${t.contenu && t.etat !== 'ok' && t.etat !== 'avenir' ? `<div class="et-tache-c">${t.contenu}</div>` : ''}
  </li>`;
}
/* ── Étapes communes avec l'espace Logistique (etapes-commande.js) ── */
const illuEtape = (taille) => (nom) =>
  illustrationProduitAdmin(nom, (state.produits.find((p) => p.nom === nom) || {}).icone, taille);
const ficheProduit = (nom) => state.produits.find((p) => p.nom === nom);
function editeurQuantitesCommande(c) {
  return EtapesCommande.quantites(c, {
    illu: illuEtape(28),
    stock: (nom) => (ficheProduit(nom) ? parseInt(ficheProduit(nom).stock, 10) || 0 : null),
  });
}
function editeurSeriesCommande(c) {
  return EtapesCommande.numeros(c, {
    unites: unitesSeriePersonnes(c),
    sansNumero: (c.lignes || []).filter((l) => (ficheProduit(l.produit) || {}).sansNumeroSerie),
    dematerialisee: c.dematerialisee,
    illu: illuEtape(26),
  });
}
/** Enregistrement des étapes communes par les routes de l'admin. */
async function majCommande(ref, champ, valeur, succes) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return { ok: false, erreur: 'Commande introuvable' };
  const r = await poster({ action: 'update', id: c.id, champ, valeur });
  if (r.ok) {
    c[champ] = valeur;
    if (succes) etat(succes, 'succes');
  }
  return r;
}
EtapesCommande.brancher({
  async numeros(ref, valeurs) {
    const c = state.commandes.find((x) => x.reference === ref);
    if (!c) return { ok: false, erreur: 'Commande introuvable' };
    const numeros = valeurs.map((x) => String(x).trim()).filter(Boolean);
    const r = await majCommande(ref, 'numerosSerie', numeros);
    if (!r.ok) return r;
    const complet = valeurs.length > 0 && valeurs.every((x) => String(x).trim());
    if (!complet) return r;
    // Structure qui nomme les personnes équipées (bo) : chaque personne reçoit le numéro de son
    // appareil (suivi, attestations, flotte).
    const structure = state.structures.find((x) => x.code === c.code);
    const unites = unitesSeriePersonnes(c);
    if (structure && structure.bo) {
      const personnes = unites
        .map((u, i) =>
          u.nom
            ? {
                nomComplet: u.nom,
                dateNaissance: u.dateNaissance,
                produit: u.produit,
                numeroSerie: String(valeurs[i]).trim(),
              }
            : null,
        )
        .filter(Boolean);
      const rp = await majCommande(ref, 'personnes', personnes);
      if (!rp.ok) return rp;
    }
    (state.confirmSubEtapes[c.id] ||= {}).series = true;
    etat(c.dematerialisee ? 'Codes enregistrés' : 'Numéros enregistrés', 'succes');
    render();
    return r;
  },
  async mode(ref, valeur) {
    state.etRouvrirMode = null;
    const r = await majCommande(ref, 'modeLivraison', valeur, 'Mode de livraison enregistré');
    if (r.ok) render();
    return r;
  },
  async colissimo(ref, valeur) {
    const r = await majCommande(ref, 'colissimo', valeur, 'Suivi enregistré');
    const c = state.commandes.find((x) => x.reference === ref);
    if (r.ok && c) {
      if (valeur) (state.confirmSubEtapes[c.id] ||= {}).colissimo = true;
      render();
    }
    return r;
  },
  async date(ref, valeur) {
    state.etRouvrirDate = null;
    const r = await majCommande(ref, 'dateLivraisonCible', valeur, 'Date estimée enregistrée');
    if (r.ok) render();
    return r;
  },
  classer: (numeros) => poster({ action: 'tectech-classer-series', numeros }),
  fiche: ficheProduit,
  repeindre: () => render(),
});
function carteEtapeCommande(c, statuts, manquants, serveur) {
  const idx = statuts.indexOf(c.statutCommande);
  const exempte = structureExclueDevisFacture(c);
  const ref = echapper(c.reference);
  const quantiteAttendue =
    typeof c.quantiteAvecNumeroSerie === 'number'
      ? c.quantiteAvecNumeroSerie
      : (c.lignes || []).reduce((t, l) => t + (parseInt(l.quantite, 10) || 0), 0);
  const nbSeries = (c.numerosSerie || []).length;
  const seriesOk = quantiteAttendue === 0 || nbSeries === quantiteAttendue;
  const conf = state.confirmSubEtapes[c.id] || {};
  const motSeries = c.dematerialisee ? 'Codes' : 'Numéros de série';
  const resumeSeries = () => (c.dematerialisee ? pilulesCodes(c.numerosSerie) : pilulesNumerosSerie(c.numerosSerie));
  const t = [];
  let titre = '',
    bouton = '',
    note = '';

  if (c.statutCommande === 'Reçue') {
    titre = 'Faire valider la commande';
    if (c.transfereAdmin)
      t.push({
        etat: 'info',
        titre: 'Transférée par la structure Interne',
        detail: 'Le partenaire n’avait pas le matériel en stock.',
      });
    if (!exempte && c.devisDemande)
      t.push(
        c.referenceDevis
          ? { etat: 'ok', titre: 'Devis envoyé', detail: `Devis ${echapper(c.referenceDevis)}` }
          : {
              etat: 'cours',
              titre: 'Envoyer le devis demandé',
              detail: 'La structure attend un prix avant de confirmer.',
              action: `<button type="button" class="btn btn-secondary btn-sm" data-generer-devis="${ref}">${icon('file', 14)}Générer le devis</button>`,
              contenu: liensRaccourcis('commande', false) || undefined,
            },
      );
    // Logistique séparée : elle est prévenue et valide dans son espace ; l'équipe peut aussi
    // valider ici, avec les mêmes quantités + / − (etapes-commande.js).
    if (!(state.reglages || {}).logistiqueDansAdmin)
      t.push({
        etat: 'info',
        titre: 'La logistique est prévenue',
        detail: 'Elle vérifie les quantités dans son espace ; vous pouvez aussi le faire ici.',
        action: `<a class="et-lien" href="support.html#commande=${encodeURIComponent(c.reference)}" target="_blank" rel="noopener">Ouvrir dans l’espace Logistique ↗</a>`,
      });
    t.push({
      etat: t.some((x) => x.etat === 'cours') ? 'avenir' : 'cours',
      titre: 'Vérifier les quantités',
      detail: 'Ajustez si le stock ne suit pas : le stock reprend ce qui n’est plus envoyé.',
      contenu: editeurQuantitesCommande(c),
    });
    bouton = `<button type="button" class="btn btn-primary et-principal" data-valider-logistique="${ref}">Valider la commande</button>`;
  } else if (c.statutCommande === 'Validée') {
    titre = 'Préparer la commande';
    const noteLog = extraireNoteLogistique(c.commentaire);
    if (noteLog && noteLog.changements.length)
      t.push({
        etat: 'info',
        titre: 'Quantités ajustées à la validation',
        detail:
          noteLog.changements
            .map((ch) => `${echapper(ch.produit)} : <s>${echapper(ch.ancienne)}</s> → <b>${echapper(ch.nouvelle)}</b>`)
            .join(' · ') + (noteLog.message ? ` — « ${echapper(noteLog.message)} »` : ''),
      });
    if (quantiteAttendue > 0) {
      const ouvert = !seriesOk || conf.series === false;
      t.push(
        ouvert
          ? {
              etat: 'cours',
              titre: motSeries,
              contenu: editeurSeriesCommande(c),
            }
          : {
              etat: 'ok',
              titre: motSeries,
              detail: resumeSeries(),
              action: `<button type="button" class="et-lien" data-modifier-series="${ref}">Modifier</button>`,
            },
      );
    }
    if (!exempte) {
      if (c.factureMensuelle)
        t.push({
          etat: 'ok',
          titre: 'Facturée en fin de mois',
          detail: 'Incluse dans la facture mensuelle de la structure.',
        });
      else if (c.referenceDevis || c.referenceFacture || c.pasDeFacture)
        t.push({
          etat: 'ok',
          titre: 'Devis ou facture',
          detail: echapper(
            c.referenceFacture
              ? `Facture ${c.referenceFacture}`
              : c.referenceDevis
                ? `Devis ${c.referenceDevis}`
                : 'Sans facture',
          ),
        });
      else
        t.push({
          etat: t.some((x) => x.etat === 'cours') ? 'avenir' : 'cours',
          titre: 'Devis ou facture',
          detail: 'Obligatoire avant la préparation.',
          action: `<button type="button" class="btn btn-secondary btn-sm" data-generer-devis="${ref}">${icon('file', 14)}Générer un devis</button>`,
          contenu: liensRaccourcis('commande', false) || undefined,
        });
    }
    bouton = `<button type="button" class="btn btn-primary et-principal" data-ec-suite data-changer-statut="Préparée" data-ref="${ref}">Passer à « Préparée »</button>`;
  } else if (c.statutCommande === 'Préparée' && c.dematerialisee) {
    titre = 'Remettre les codes';
    if (quantiteAttendue > 0) t.push({ etat: 'ok', titre: motSeries, detail: resumeSeries() });
    t.push({
      etat: 'cours',
      titre: 'Date de remise',
      detail: 'Pas de livraison physique : la commande passe directement à « Livrée ».',
      contenu: `<input type="date" class="input et-date" id="pn-date-livraison-directe" value="${dateVersISO(c.dateLivraison) || new Date().toISOString().slice(0, 10)}" aria-label="Date de remise">`,
    });
    const tpd = tacheProgrammeCommande(c);
    if (tpd) t.push(tpd);
    bouton = `<button type="button" class="btn btn-primary et-principal" data-marquer-livree="${ref}">Marquer livrée</button>`;
  } else if (c.statutCommande === 'Préparée') {
    titre = 'Organiser la livraison';
    if (quantiteAttendue > 0)
      t.push({
        etat: 'ok',
        titre: motSeries,
        detail: resumeSeries(),
        action: `<button type="button" class="et-lien" data-toggle-etape-passee="Validée">Modifier</button>`,
      });
    const mode = c.modeLivraison;
    t.push({
      etat: mode ? 'ok' : 'cours',
      titre: 'Mode de livraison',
      detail: mode ? echapper(mode === 'Livraison EC' ? 'Livraison Emmaüs Connect' : mode) : '',
      action: mode ? `<button type="button" class="et-lien" data-et-rouvrir="mode">Modifier</button>` : '',
      contenu: EtapesCommande.modes(c),
    });
    if (state.etRouvrirMode === c.reference && mode) t[t.length - 1].etat = 'cours';
    if (mode === 'Colissimo')
      t.push({
        etat: (c.colissimo || '').trim() ? 'ok' : 'cours',
        titre: 'Suivi Colissimo',
        detail: (c.colissimo || '').trim()
          ? pilulesColis(c.colissimo)
          : 'Un lien par colis — enregistré dès que vous quittez le champ.',
        action: (c.colissimo || '').trim()
          ? `<button type="button" class="et-lien" data-modifier-colissimo="${ref}">Modifier</button>`
          : '',
        contenu: EtapesCommande.colissimo(c),
      });
    if (conf.colissimo === false && (c.colissimo || '').trim()) t[t.length - 1].etat = 'cours';
    if (!mode) t.push({ etat: 'avenir', titre: 'Suivi du colis ou date de livraison' });
    if (mode)
      t.push({
        etat: c.dateLivraisonCible ? 'ok' : 'cours',
        facultatif: true,
        titre: mode === 'Retrait' ? 'Retrait disponible à partir du' : 'Date estimée de livraison',
        detail: c.dateLivraisonCible ? echapper(c.dateLivraisonCible) : 'Affichée dans le suivi de la structure.',
        action: c.dateLivraisonCible
          ? `<button type="button" class="et-lien" data-et-rouvrir="date">Modifier</button>`
          : '',
        contenu: EtapesCommande.dateCible(c),
      });
    if (state.etRouvrirDate === c.reference && c.dateLivraisonCible) t[t.length - 1].etat = 'cours';
    bouton = `<button type="button" class="btn btn-primary et-principal" data-valider-preparation="${ref}">Passer à « En livraison »</button>`;
  } else if (c.statutCommande === 'En cours de livraison') {
    titre = 'Confirmer la livraison';
    if (c.modeLivraison)
      t.push({
        etat: 'ok',
        titre: echapper(c.modeLivraison === 'Livraison EC' ? 'Livraison Emmaüs Connect' : c.modeLivraison),
        detail:
          c.modeLivraison === 'Colissimo' && c.colissimo
            ? pilulesColis(c.colissimo)
            : c.dateLivraisonCible
              ? `Prévue le ${echapper(c.dateLivraisonCible)}`
              : '',
      });
    t.push({
      etat: 'cours',
      titre: 'Date de livraison',
      detail: 'La structure est prévenue quand la commande passe « Livrée ».',
      contenu: `<input type="date" class="input et-date" id="pn-date-livraison-directe" value="${dateVersISO(c.dateLivraison) || new Date().toISOString().slice(0, 10)}" aria-label="Date de livraison">`,
    });
    const tp = tacheProgrammeCommande(c);
    if (tp) t.push(tp);
    bouton = `<button type="button" class="btn btn-primary et-principal" data-marquer-livree="${ref}">Marquer livrée</button>`;
  }

  // Ligne « Il manque… » : les prérequis serveur (même règle que celle qui bloque l'écriture).
  const pret = serveur && serveur.etat && serveur.etat.statut === c.statutCommande ? !!serveur.etat.peutAvancer : null;
  if (bouton && pret === false)
    bouton = bouton.replace(
      'class="btn btn-primary et-principal"',
      'class="btn btn-primary et-principal" aria-disabled="true" data-et-bloque="1"',
    );
  const ligneManque = note
    ? `<span class="fc2-manque et-manque">${echapper(note)}</span>`
    : manquants.length
      ? `<span class="fc2-manque et-manque">Il manque : ${manquants.map((m) => echapper(m.libelle.charAt(0).toLowerCase() + m.libelle.slice(1))).join(' · ')}.</span>`
      : pret
        ? '<span class="et-manque pret">Tout est prêt.</span>'
        : '<span class="et-manque"></span>';
  // Apparition progressive : les tâches à venir n'existent pas encore à l'écran — seule une
  // ligne « Ensuite : … » les annonce. Elles apparaissent (la carte s'agrandit) quand la
  // précédente est faite.
  const cle = (x) => String(x.titre).replace(/<[^>]+>/g, '');
  const avant = etatsTachesPrecedents[c.reference] || null;
  const visibles = t.filter((x) => x.etat !== 'avenir');
  const aVenir = t.filter((x) => x.etat === 'avenir');
  // La fiche se redessine souvent (réponse serveur, saisie…) : une animation déjà lancée est
  // reprise là où elle en est (délai négatif) au lieu d'être coupée ou rejouée.
  const maintenant = Date.now();
  const lancees = (avant && avant.statut === c.statutCommande && avant.lancees) || {};
  if (avant && avant.statut === c.statutCommande)
    visibles.forEach((x) => {
      const e = avant.taches[cle(x)];
      if (!e || e === 'avenir') lancees[cle(x)] = { anim: 'apparait', t: maintenant, duree: 1300 };
      else if (e !== 'ok' && x.etat === 'ok') lancees[cle(x)] = { anim: 'pop', t: maintenant, duree: 700 };
    });
  visibles.forEach((x) => {
    const l = lancees[cle(x)];
    if (l && maintenant - l.t < l.duree) x.anim = `${l.anim}" style="--et-decal:-${maintenant - l.t}ms`;
    else if (l) delete lancees[cle(x)];
  });
  etatsTachesPrecedents[c.reference] = {
    statut: c.statutCommande,
    lancees,
    taches: Object.fromEntries(t.map((x) => [cle(x), x.etat])),
  };
  let n = 0;
  return `<div class="fc2-panneau et-carte">
    <div class="fc2-k">Étape ${idx + 1} sur ${statuts.length}</div>
    <h2>${titre}</h2>
    <ol class="et-taches">${visibles.map((x) => tacheEtape(x.etat === 'info' ? '' : ++n, x)).join('')}</ol>
    ${aVenir.length ? `<div class="et-ensuite">Ensuite : ${aVenir.map((x) => cle(x).toLowerCase() + (x.facultatif ? ' (facultatif)' : '')).join(' · ')}</div>` : ''}
    ${bouton || note ? `<div class="et-pied">${ligneManque}${bouton}</div>` : ''}
  </div>`;
}
/** Commande livrée : ce qui reste à suivre (facture, paiement, rapprochement) + appareils. */
function carteCommandeLivree(c, personnes, nbArticles) {
  const exempte = structureExclueDevisFacture(c);
  const ref = echapper(c.reference);
  const t = [];
  if (!exempte) {
    if (c.referenceFacture)
      t.push({
        etat: 'ok',
        titre: 'Facture',
        detail: `${echapper(c.referenceFacture)}${c.factureMensuelle ? ' (mensuelle)' : ''}`,
        action: `<button type="button" class="et-lien" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}">Ouvrir</button>`,
      });
    else if (c.factureMensuelle)
      t.push({ etat: 'ok', titre: 'Facture', detail: 'Incluse dans la facture mensuelle de la structure.' });
    else if (!c.pasDeFacture)
      t.push({
        etat: 'cours',
        titre: 'Générer la facture',
        contenu: `<div class="rpd-form-ligne"><input class="input" id="pn-numero-facture" placeholder="Numéro de facture (FAC-…)" aria-label="Numéro de facture"><button type="button" class="btn btn-secondary" data-generer-facture-livree="${ref}">Générer</button></div><div id="pn-erreur-facture"></div>${liensRaccourcis('commande', false)}`,
      });
    if (c.moyenPaiement)
      t.push({
        etat: c.statutPaiement === 'Payé' ? 'ok' : 'cours',
        titre: 'Paiement',
        detail: echapper(
          `${c.moyenPaiement}${c.moyenPaiement === 'Chèque' && c.numeroCheque ? ` n° ${c.numeroCheque}` : ''} · ${c.statutPaiement || 'Non payé'}`,
        ),
      });
    if (c.referenceFacture)
      t.push({
        etat: c.statutComptable === 'Clôturé' ? 'ok' : 'cours',
        titre: 'Rapprochement comptable',
        detail: echapper(c.statutComptable || 'Non rapproché'),
        action:
          c.statutComptable === 'Clôturé'
            ? ''
            : `<button type="button" class="et-lien" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}">Rapprocher</button>`,
      });
  }
  const tpl = tacheProgrammeCommande(c);
  if (tpl) t.push(tpl);
  let n = 0;
  return `<div class="fc2-panneau fc2-fin et-carte">
    <div class="fc2-k">Commande terminée</div>
    <h2>Livrée${c.dateLivraison ? ` le ${echapper(c.dateLivraison)}` : ''}</h2>
    <p class="et-resume">${nbArticles} article${nbArticles > 1 ? 's' : ''} remis${personnes.length ? ` · ${personnes.length} personne${personnes.length > 1 ? 's' : ''} équipée${personnes.length > 1 ? 's' : ''}` : ''}.</p>
    ${t.length ? `<div class="fc2-k" style="margin-top:6px">Après la livraison</div><ol class="et-taches">${t.map((x) => tacheEtape(++n, x)).join('')}</ol>` : ''}
    ${blocAppareilsCommande(c)}
  </div>`;
}
/** Contenu affiché quand on replie/déplie une étape déjà passée — consultation, et pour les
 *  étapes qui portent des données modifiables (série, mode de livraison, colissimo), une
 *  modification reste possible sans repasser par le statut lui-même (le back l'autorise déjà :
 *  ces champs sont éditables via /update indépendamment du statutCommande). */
function panneauEtapePasseeCommande(c, statut) {
  if (statut === 'Validée') {
    return `
      <div class="field">
        <label>${c.dematerialisee ? 'Codes' : 'Numéros de série'}</label>
        <textarea class="input" rows="3" id="pn-series-passee">${echapper((c.numerosSerie || []).join('\n'))}</textarea>
        <button type="button" class="btn btn-secondary btn-block" data-corriger-series="${echapper(c.reference)}">Enregistrer</button>
      </div>`;
  }
  if (statut === 'Préparée') {
    if (c.dematerialisee) {
      return `<p style="font-size:13px;opacity:0.6;margin:0">Produit(s) dématérialisé(s) — pas de mode de livraison pour cette commande.</p>`;
    }
    return `
      <div class="field">
        <label>Mode de livraison</label>
        ${EtapesCommande.modes(c)}
        ${c.bonLivraison ? `<button type="button" data-ouvrir-doc-genere="${echapper(c.bonLivraison)}" style="all:unset;box-sizing:border-box;cursor:pointer;font-size:12.5px;color:var(--color-accent-700);text-decoration:underline">Bon de livraison ↗</button>` : ''}
      </div>`;
  }
  if (statut === 'En cours de livraison') {
    return `
      <div class="field">
        <label>Lien(s) de suivi Colissimo</label>
        <textarea class="input" rows="2" id="pn-colissimo-passee" placeholder="Un lien par colis">${echapper(c.colissimo || '')}</textarea>
        <button type="button" class="btn btn-secondary btn-block" data-corriger-colissimo="${echapper(c.reference)}">Enregistrer</button>
      </div>`;
  }
  if (statut === 'Livrée') {
    return `<div style="font-size:13px;color:var(--color-accent-2-700)">${icon('check', 14)} Commande livrée le ${echapper(c.dateLivraison || '—')}. Cette étape n'est plus modifiable.</div>`;
  }
  return `<p style="font-size:13px;opacity:0.6;margin:0">Rien à modifier pour cette étape.</p>`;
}
function dateVersISO(v) {
  if (!v) return '';
  const m = String(v).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
async function corrigerSeriesCommande(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const valeur = $('pn-series-passee')
    .value.split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  const r = await posterEtat(
    { action: 'update', id: c.id, champ: 'numerosSerie', valeur },
    'Enregistrement…',
    'Numéros mis à jour',
  );
  if (r.ok) {
    c.numerosSerie = valeur;
    render();
  }
}
async function corrigerColissimoCommande(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const valeur = $('pn-colissimo-passee').value;
  const liens = valeur
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const invalide = liens.find((l) => !/^https?:\/\/.+/i.test(l));
  if (invalide) {
    afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`);
    return;
  }
  const r = await posterEtat(
    { action: 'update', id: c.id, champ: 'colissimo', valeur },
    'Enregistrement…',
    'Lien(s) mis à jour',
  );
  if (r.ok) {
    c.colissimo = valeur;
    render();
  }
}
/** Note laissée par la logistique dans le commentaire quand elle ajuste les quantités
 *  demandées — même format que côté back (##LOGISTIQUE_QUANTITES##...##FIN##). */
function extraireNoteLogistique(commentaire) {
  const texte = String(commentaire || '');
  if (!texte.startsWith('##LOGISTIQUE_QUANTITES##')) return null;
  const finIndex = texte.indexOf('##FIN##\n');
  if (finIndex === -1) return null;
  const bloc = texte.slice('##LOGISTIQUE_QUANTITES##\n'.length, finIndex);
  const [quantitesTexte, messageTexte] = bloc.split('##LOGISTIQUE_MESSAGE##\n');
  return {
    changements: (quantitesTexte || '')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [produit, valeurs] = l.split(' : ');
        const [ancienne, nouvelle] = (valeurs || '').split(' → ');
        return { produit, ancienne, nouvelle };
      }),
    message: (messageTexte || '').trim(),
  };
}

/** Reçue → Validée depuis la fiche, avec les quantités vérifiées (+ / −) et le message. */
async function validerCommandeLogistique(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  // Quantités vérifiées dans la fiche (sinon celles commandées).
  const brouillon = EtapesCommande.lire(ref);
  const quantites = brouillon.quantites || (c.lignes || []).map((l) => parseInt(l.quantite, 10) || 0);
  const message = brouillon.message || '';
  try {
    const r = await posterEtat(
      { action: 'logistique-valider', id: c.id, quantites, message },
      'Validation…',
      'Commande validée',
    );
    if (r.ok) {
      EtapesCommande.oublier(ref);
      c.statutCommande = 'Validée';
      render();
      // Quantités ajustées : lignes et stock relus depuis le serveur.
      if (quantites.some((q, i) => q !== (parseInt(c.lignes[i].quantite, 10) || 0))) chargerTout();
    }
  } catch (e) {}
}
async function genererDocumentCommande(ref, type) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const action = type === 'devis' ? 'commande-devis-direct' : 'commande-facturer-direct';
  const donnees = { action, id: c.id };
  if (type === 'facture') {
    const numero = await demanderCvdl('Numéro de facture :');
    if (!numero) return;
    donnees.numeroFacture = numero;
  }
  const r =
    type === 'devis'
      ? await posterDevis(donnees, 'Devis généré')
      : await posterEtat(donnees, 'Génération…', 'Facture générée');
  if (r.ok) {
    const [rc, rd, rf] = await Promise.all([
      lireApi({ action: 'list', limite: -1, filtre: 'tout' }),
      lireApi({ action: 'devis', limite: 0 }),
      lireApi({ action: 'factures', limite: 0 }),
    ]);
    if (rc.ok) state.commandes = rc.commandes;
    if (rd.ok) state.devis = rd.devis;
    if (rf.ok) state.factures = rf.factures;
    render();
  }
}
async function validerPreparationCommande(ref, btn) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  if (btn) btn.disabled = true;
  try {
    // bon de livraison désactivé : passage direct au statut suivant
    const rStatut = await poster({
      action: 'update',
      id: c.id,
      champ: 'statutCommande',
      valeur: 'En cours de livraison',
    });
    if (rStatut.ok) {
      c.statutCommande = 'En cours de livraison';
      etat('Commande en livraison', 'succes');
      render();
    } else {
      etat(rStatut.erreur || 'Enregistrement impossible', 'erreur');
      afficherErreurModale(rStatut.erreur);
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    etat('Une erreur est survenue', 'erreur');
    afficherErreurModale('Une erreur est survenue.');
    if (btn) btn.disabled = false;
  }
}
function afficherErreurModale(msg, cible) {
  const z = $(cible || 'rp-retour-modale');
  if (!z) return;
  z.innerHTML = `<div class="msg msg-erreur">${echapper(msg || 'Action impossible.')}</div>`;
  // Le message d'erreur peut apparaître en bas d'un long panneau (modale commande notamment) —
  // sans ça, il passe facilement inaperçu, surtout depuis un bouton tout en haut de la modale.
  z.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function genererFactureDepuisLivree(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const numero = $('pn-numero-facture') ? $('pn-numero-facture').value.trim() : '';
  if (!numero) {
    afficherErreurModale('Le numéro de facture est obligatoire.', 'pn-erreur-facture');
    return;
  }
  const r = await posterEtat(
    { action: 'commande-facturer-direct', id: c.id, numeroFacture: numero },
    'Génération…',
    'Facture générée',
  );
  if (r.ok) {
    const [rc, rf] = await Promise.all([
      lireApi({ action: 'list', limite: -1, filtre: 'tout' }),
      lireApi({ action: 'factures', limite: 0 }),
    ]);
    if (rc.ok) state.commandes = rc.commandes;
    if (rf.ok) state.factures = rf.factures;
    render();
  } else afficherErreurModale(r.erreur);
}
async function enregistrerLienPaiement(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const valeur = $('pn-lien-paiement').value;
  const liens = valeur
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const invalide = liens.find((l) => !/^https?:\/\/.+/i.test(l));
  if (invalide) {
    afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`, 'pn-erreur-lien-paiement');
    return;
  }
  const r = await posterEtat(
    { action: 'update', id: c.id, champ: 'lienPaiement', valeur },
    'Enregistrement…',
    'Lien(s) de paiement enregistré(s)',
  );
  if (r.ok) {
    c.lienPaiement = valeur;
    render();
  }
}
/**
 * Variante par personne du champ ci-dessus (paiement séparé, 2 personnes ou plus) : un champ
 * par nom. Les lignes vides gardent leur position pour rester à l'index de la bonne personne
 * (voir nomsPersonnesCommande).
 */
async function enregistrerLiensPaiementPersonnes(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const champs = [...document.querySelectorAll('[data-lien-paiement-personne]')].sort(
    (a, b) => parseInt(a.dataset.lienPaiementPersonne, 10) - parseInt(b.dataset.lienPaiementPersonne, 10),
  );
  const valeurs = champs.map((inp) => inp.value.trim());
  const invalide = valeurs.filter(Boolean).find((l) => !/^https?:\/\/.+/i.test(l));
  if (invalide) {
    afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`, 'pn-erreur-lien-paiement');
    return;
  }
  const valeur = valeurs.join('\n');
  const r = await posterEtat(
    { action: 'update', id: c.id, champ: 'lienPaiement', valeur },
    'Enregistrement…',
    'Lien(s) de paiement enregistré(s)',
  );
  if (r.ok) {
    c.lienPaiement = valeur;
    render();
  } else afficherErreurModale(r.erreur || 'Enregistrement impossible', 'pn-erreur-lien-paiement');
}
async function enregistrerDateLivraisonCommande(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  const iso = $('pn-date-livraison').value;
  if (!iso) return;
  const [y, mo, d] = iso.split('-');
  const valeur = `${d}/${mo}/${y}`;
  const r = await posterEtat(
    { action: 'update', id: c.id, champ: 'dateLivraison', valeur },
    'Enregistrement…',
    'Date enregistrée',
  );
  if (r.ok) {
    c.dateLivraison = valeur;
    render();
  }
}
async function annulerCommande(ref) {
  const c = state.commandes.find((x) => x.reference === ref);
  if (!c) return;
  if (!(await confirmerCvdl(`Annuler la commande ${c.reference} ?`))) return;
  const r = await posterEtat(
    { action: 'update', id: c.id, champ: 'statutCommande', valeur: 'Annulée' },
    'Annulation…',
    'Commande annulée',
  );
  if (r.ok) {
    c.statutCommande = 'Annulée';
    render();
  }
}

/* ============================================================
   Réglages des statuts SAV — même principe que l'ancienne
   modale (couleur, drapeaux colissimo/diagnostic/départ délai/
   terminal/fin de cycle), toggles réels, réordonnable.
   ============================================================ */
