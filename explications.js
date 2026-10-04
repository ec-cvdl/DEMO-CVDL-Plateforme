/* ════════════════════════════════════════════════════════════════════════════════════
   explications.js — mode « Explications » de la démo publique.
   Chargé uniquement en mode démo, par portail-ui.js (bandeau en bas à gauche) :
   · interrupteur « Explications oui / non » toujours accessible dans le bandeau (mémorisé) ;
   · quand c'est activé :
       – une carte « Sur cette page » à l'arrivée sur chaque écran (une fois par écran) ;
       – des pastilles « ? » sur les éléments importants : un clic = une explication courte ;
       – des tutoriels pas à pas (bouton « Tutoriels » du bandeau) : la zone concernée est
         mise en lumière, une bulle explique, « Suivant » avance — y compris d'une page à
         l'autre ou d'un onglet de l'admin à l'autre.
   Textes volontairement simples : pas de jargon, une idée par bulle.
   Aucune dépendance ; styles dans explications.css.
   ════════════════════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.CvdlExplications) return;
  const CLE = 'cvdl-explications';
  const CLE_TUTO = 'cvdl-tuto-en-cours';
  const CLE_VUS = 'cvdl-explications-vus';
  const lire = (s, k) => { try{ return s.getItem(k); }catch(e){ return null; } };
  const ecrire = (s, k, v) => { try{ v == null ? s.removeItem(k) : s.setItem(k, v); }catch(e){} };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const page = () => (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const onglet = () => (location.hash.slice(1).split('?')[0] || 'dashboard');
  const actif = () => lire(localStorage, CLE) !== '0'; // activé par défaut dans la démo
  const visible = el => { if(!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  function trouver(sel){
    for(const s of [].concat(sel || [])){
      const el = [...document.querySelectorAll(s)].find(visible);
      if(el) return el;
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════════════
     CONTENUS
     ════════════════════════════════════════════════════════════════════════════════ */
  const NAV = [
    ['dashboard', 'Tableau de bord', 'La page d’accueil de l’équipe : ce qui demande une action aujourd’hui, le fil des priorités et le calendrier des livraisons.'],
    ['commandes', 'Commandes', 'Toutes les commandes des structures, rangées par étape : à valider, à préparer, à expédier, en livraison, livrées.'],
    ['sav', 'SAV', 'Les appareils en panne : chaque dossier suit l’appareil de sa réception jusqu’à son retour.'],
    ['depannage', 'Dépannage', 'Des questions simples proposées aux personnes avant de déclarer une panne. Souvent, le problème se règle sans SAV.'],
    ['factures', 'Devis / Factures', 'Les devis et factures de chaque commande, et la vérification des paiements reçus (le « rapprochement »).'],
    ['finance', 'Finances', 'Les chiffres de la facturation : ce qui est facturé, encaissé, en retard — par mois et par territoire.'],
    ['stock', 'Stock', 'Le catalogue du matériel proposé aux structures (ordinateurs, smartphones, recharges…) et les quantités disponibles.'],
    ['passeport', 'Passeport matériel', 'Tapez un numéro de série : vous retrouvez toute l’histoire de l’appareil (livraison, personne équipée, pannes).'],
    ['structures', 'Structures', 'L’annuaire des structures partenaires : leurs coordonnées, leur type et leur code d’accès.'],
    ['distribution', 'Distribution', 'Les programmes financés (par une Région, une fondation…) : objectifs, appareils déjà distribués, reste à faire.'],
    ['calendrier', 'Calendrier', 'Les livraisons prévues et les échéances, jour par jour.'],
    ['bilan', 'Statistiques', 'Les chiffres de l’activité : commandes par mois, produits les plus distribués, structures les plus actives.'],
    ['retours', 'Retours', 'Ce que les utilisateurs pensent de l’outil : avis, notes, et les endroits où ils bloquent.'],
    ['equipe', 'Équipe', 'Qui peut se connecter à l’administration, et avec quel rôle (admin, comptabilité, support SAV).'],
    ['reglages', 'Réglages', 'Les paramètres de la plateforme : modèles de documents, e-mails, règles de commande…'],
  ];

  // Écrans : intro (carte d'arrivée), aides (pastilles « ? »), tutos proposés.
  const ECRANS = {
    'admin:dashboard': { titre: 'Tableau de bord', texte: 'C’est la page d’accueil de l’équipe. En haut, ce qui attend une action. Au centre, le fil des priorités : cliquez sur une ligne pour l’ouvrir. À droite, les livraisons du mois.',
      aides: [
        ['[data-kpi-listing="a-decider"]', 'À décider', 'Les commandes que les structures viennent de passer et qui attendent votre feu vert.'],
        ['[data-nav="sav"].rp-kpi, .rp-kpi[data-nav="sav"]', 'SAV ouverts', 'Les appareils en réparation en ce moment. Cliquez pour aller aux dossiers.'],
      ], tutos: ['menu', 'commande'] },
    'admin:commandes': { titre: 'Commandes', texte: 'Chaque ligne est une commande. Elles sont rangées par étape. Cliquez sur une commande pour ouvrir sa fiche et la faire avancer.',
      aides: [
        ['[data-filtrer-statut-commande="ACTION"]', 'Par action', 'N’affiche que les commandes sur lesquelles vous devez agir maintenant.'],
        ['[data-filtrer-statut-commande="URGENT"]', 'Urgentes', 'Les commandes marquées « le plus vite possible » par la structure.'],
        ['#rp-recherche-commandes', 'Rechercher', 'Tapez un nom de structure ou un numéro de commande (CVDL-…).'],
        ['[data-ouvrir-creation="commande"]', 'Nouvelle commande', 'Pour saisir une commande à la place d’une structure (reçue par téléphone ou par mail, par exemple).'],
      ], tutos: ['commande'] },
    'admin:sav': { titre: 'SAV', texte: 'Un dossier par appareil en panne. L’anneau de couleur montre où en est la réparation. Cliquez sur un dossier pour le suivre.',
      aides: [
        ['[data-filtrer-statut-sav=""]', 'Filtrer par étape', 'Affichez seulement les dossiers à une étape donnée (reçus, en réparation…).'],
        ['[data-ouvrir-creation="sav"]', 'Nouveau SAV', 'Pour enregistrer une panne signalée par téléphone ou à l’accueil.'],
        ['[data-ouvrir-reglages-statuts]', 'Étapes du SAV', 'Vous pouvez renommer, ajouter ou réordonner les étapes d’un dossier.'],
      ], tutos: ['sav'] },
    'admin:depannage': { titre: 'Dépannage', texte: 'Avant de déclarer une panne, la personne répond à quelques questions simples (« l’écran s’allume-t-il ? »…). Ici, on écrit ces questions et on voit combien de problèmes ont été réglés sans SAV.',
      aides: [['[data-dpa="nouveau"]', 'Nouvel arbre', 'Créez un nouveau parcours de questions pour un type de panne.']], tutos: [] },
    'admin:factures': { titre: 'Devis et factures', texte: 'Un dossier par commande facturée : son devis, sa facture et le suivi du paiement.',
      aides: [
        ['[data-ouvrir-creation="facture"]', 'Nouvelle facture', 'Créer une facture, liée ou non à une commande.'],
        ['[data-ouvrir-rapprochement]', 'Rapprochement', 'Vérifier sur le relevé bancaire que l’argent est bien arrivé, puis marquer la facture comme payée.'],
        ['[data-factures-mensuelles]', 'Factures mensuelles', 'Les recharges téléphoniques sont facturées une fois par mois, toutes ensemble.'],
      ], tutos: ['factures'] },
    'admin:finance': { titre: 'Finances', texte: 'Les grands chiffres : ce qui a été facturé, ce qui est payé, ce qui est en retard. On peut filtrer par territoire et relancer les retards.',
      aides: [
        ['[data-fin-filtre="region"]', 'Territoire', 'Choisissez une région pour ne voir que ses chiffres.'],
        ['[data-fin-relancer-tout]', 'Relancer', 'Envoie un rappel par e-mail pour chaque facture en retard. Tout est noté dans l’historique.'],
        ['[data-fin-export="factures"]', 'Export', 'Télécharge les factures dans un fichier qui s’ouvre avec Excel.'],
      ], tutos: ['finances'] },
    'admin:stock': { titre: 'Stock', texte: 'Le catalogue : chaque carte est un produit proposé aux structures, avec son prix et la quantité disponible.',
      aides: [
        ['[data-ouvrir-creation="produit"]', 'Ajouter un produit', 'Créer un nouveau produit dans le catalogue (un modèle d’ordinateur, une recharge…).'],
        ['[data-mode-stock-bas]', 'Mode stock bas', 'Quand le stock baisse, limitez les quantités par commande pour servir tout le monde.'],
        ['[data-organiser-materiel]', 'Organiser', 'Choisissez l’ordre d’affichage des produits pour les structures.'],
      ], tutos: ['produit'] },
    'admin:passeport': { titre: 'Passeport matériel', texte: 'Tapez le numéro de série d’un appareil (il est écrit sous l’appareil ou dans les réglages du téléphone) pour retrouver tout son parcours.',
      aides: [['#pm-numero-serie', 'Numéro de série', 'Essayez avec un numéro pris dans l’onglet SAV ou dans une commande livrée.']], tutos: [] },
    'admin:structures': { titre: 'Structures', texte: 'L’annuaire des structures qui commandent du matériel. Chacune a un type, qui fixe ses règles, et un code pour se connecter.',
      aides: [
        ['[data-ouvrir-creation="structure"]', 'Nouvelle structure', 'Ajouter une structure partenaire. Elle reçoit un code d’accès à son espace.'],
        ['[data-reveal-code]', 'Code d’accès', 'Affiche le code que la structure utilise pour commander et suivre ses demandes.'],
        ['#st-filtre-region', 'Filtrer', 'N’afficher que les structures d’un territoire.'],
      ], tutos: ['structure'] },
    'admin:distribution': { titre: 'Programmes de distribution', texte: 'Un programme, c’est un engagement auprès d’un financeur : « 160 ordinateurs pour la Région d’ici juin ». Ici, on suit l’avancement.',
      aides: [['[data-dist-nouveau]', 'Nouveau programme', 'Créer un programme : financeur, dates, objectifs par produit.']], tutos: [] },
    'admin:calendrier': { titre: 'Calendrier', texte: 'Les livraisons et les échéances, jour par jour. Cliquez sur un jour pour voir le détail.', aides: [], tutos: [] },
    'admin:bilan': { titre: 'Statistiques', texte: 'L’activité en chiffres et en graphiques. Les filtres en haut changent toute la page.',
      aides: [['#bilan-annee', 'Année', 'Choisissez l’année à afficher.']], tutos: [] },
    'admin:retours': { titre: 'Retours', texte: 'Les avis laissés par les structures et les personnes, et les erreurs rencontrées dans l’outil.', aides: [], tutos: [] },
    'admin:equipe': { titre: 'Équipe', texte: 'Les personnes de l’équipe qui peuvent se connecter avec leur compte Google, et leur rôle.',
      aides: [['#eqa-form', 'Ajouter une personne', 'Saisissez son adresse et choisissez son rôle : Admin, Comptabilité ou Support SAV.']], tutos: [] },
    'admin:reglages': { titre: 'Réglages', texte: 'Les paramètres de la plateforme. En démo, vous pouvez tout regarder et tout modifier sans risque.', aides: [], tutos: [] },

    'portail-structure.html': { titre: 'Espace structure', texte: 'Votre espace : commander du matériel, suivre vos commandes, signaler une panne et suivre vos appareils.',
      aides: [
        ['a.ps-choix-carte[href="commande.html"]', 'Commander', 'Choisir du matériel et l’envoyer en quelques étapes.'],
        ['a.ps-choix-carte[href="suivi.html"]', 'Suivre mes commandes', 'Où en est chaque commande, ses documents et ses numéros de série.'],
        ['a.ps-choix-carte[href="sav.html"]', 'Signaler une panne', 'Un appareil ne marche plus ? Quelques questions, puis la demande de réparation.'],
        ['a.ps-flotte', 'Ma flotte', 'Tous les appareils reçus : qui les utilise, lesquels sont encore en stock.'],
        ['a.pv-carte[href="structures-partenaires.html"]', 'Partenaires', 'Les associations avec lesquelles vous travaillez : vous leur créez un accès et validez leurs commandes.'],
      ], tutos: ['portail', 'commander', 'flotte', 'partenaires'] },
    'commande.html': { titre: 'Commander', texte: 'Quatre étapes : choisir le matériel, les quantités, le paiement, puis envoyer. Le récapitulatif se met à jour tout seul.',
      aides: [
        ['#grille-produits .carte-produit', 'Choisir', 'Cliquez sur une carte pour la cocher. Vous pouvez en cocher plusieurs.'],
        ['#cm-recap', 'Récapitulatif', 'Ce que vous avez choisi et le total estimé.'],
        ['#btn-suivant', 'Continuer', 'Passe à l’étape suivante. Rien n’est envoyé avant la dernière étape.'],
      ], tutos: ['commander'] },
    'suivi.html': { titre: 'Suivre mes commandes', texte: 'Chaque commande avec son étape : reçue, validée, préparée, en livraison, livrée. Ouvrez-en une pour voir le détail et les documents.', aides: [], tutos: [] },
    'flotte-structure.html': { titre: 'Ma flotte', texte: 'Tous les appareils livrés à votre structure. Indiquez à qui chacun a été remis : cela sert pour les attestations et le suivi des pannes.',
      aides: [
        ['#recherche-flotte', 'Rechercher', 'Un numéro de série, un nom de personne ou un modèle.'],
        ['[data-filtre-statut-flotte="En stock"]', 'En stock', 'Les appareils pas encore remis. Au-delà de 2 mois, un rappel s’affiche.'],
        ['[data-vue-flotte="compta"]', 'Comptabilité', 'Le suivi des paiements des appareils remis.'],
        ['.cvdl-sn', 'Passeport', 'Cliquez sur un numéro de série pour voir l’histoire complète de l’appareil.'],
      ], tutos: ['flotte'] },
    'sav.html': { titre: 'Signaler une panne', texte: 'Choisissez ce qui ne va pas. Quelques questions simples vous seront peut-être proposées : souvent, le problème se règle tout de suite.', aides: [], tutos: [] },
    'suivi-sav-structure.html': { titre: 'Mes demandes SAV', texte: 'Vos appareils en réparation et leur avancement. Vous pouvez échanger des messages avec l’équipe dans chaque demande.', aides: [], tutos: [] },
    'attestations.html': { titre: 'Attestations', texte: 'Éditez l’attestation de remise d’un appareil à une personne, prête à imprimer.', aides: [], tutos: [] },
    'projets-distribution.html': { titre: 'Projets de distribution', texte: 'Vos projets financés : objectif, date limite et appareils déjà remis. Chaque remise rattachée à un projet le fait avancer.', aides: [], tutos: ['partenaires'] },
    'structures-partenaires.html': { titre: 'Mes partenaires', texte: 'Les associations avec lesquelles vous travaillez. Créez-leur un accès : elles commandent, vous validez.', aides: [], tutos: ['partenaires'] },
    'commandes-partenaires.html': { titre: 'Commandes des partenaires', texte: 'Les commandes de vos partenaires. Vous les validez et vous leur attribuez des appareils de votre stock.',
      aides: [['[data-filtre-cp="attente"]', 'À traiter', 'Les commandes qui attendent votre validation.']], tutos: ['partenaires'] },
    'tarifs-partenaires.html': { titre: 'Tarifs partenaires', texte: 'Des prix adaptés pour vos partenaires, sur la base du catalogue.', aides: [], tutos: [] },
    'rapport-impact.html': { titre: 'Notre impact', texte: 'Un résumé imprimable : appareils distribués, personnes équipées, déchets évités.', aides: [], tutos: [] },
    'categories-materiel.html': { titre: 'Catalogue', texte: 'Toutes les fiches du matériel, pour comparer avant de commander.', aides: [], tutos: [] },
    'support.html': { titre: 'Support SAV', texte: 'L’outil de l’équipe réparation. À gauche, les files de tickets. Au centre, le ticket choisi : statut, messages, envoi du colis.',
      aides: [
        ['[data-file="a-traiter"]', 'À traiter', 'Les tickets qui attendent une action de votre part.'],
        ['.sp-tk', 'Un ticket', 'Cliquez pour l’ouvrir au centre.'],
        ['#sp-recherche', 'Rechercher', 'Une référence SAV-…, un numéro de série ou un nom de structure.'],
      ], tutos: ['support'] },
    'portail-beneficiaire.html': { titre: 'Personne accompagnée', texte: 'Pour les personnes qui ont reçu un appareil : déclarer une panne ou suivre sa réparation, sans code. Le numéro de série et la référence de suivi sont indiqués sur la page d’accueil de la démo.', aides: [], tutos: [] },
    'sav-beneficiaire.html': { titre: 'Déclarer une panne', texte: 'Le numéro de série suffit pour retrouver l’appareil. Ensuite, quelques questions guident la personne.', aides: [], tutos: [] },
    'suivi-sav-beneficiaire.html': { titre: 'Suivre sa réparation', texte: 'Avec le numéro de série et la référence (ou l’e-mail), la personne voit où en est sa réparation et peut écrire à l’équipe.', aides: [], tutos: [] },
  };

  // Tutoriels pas à pas.  Étape : { page?, onglet?, clic?, fermer?, cible?, titre, texte }
  const TUTOS = {
    menu: { titre: 'Découvrir le menu', espace: 'admin', etapes: [
      { onglet: 'dashboard', titre: 'Le menu de gauche', texte: 'Chaque icône ouvre une partie de l’administration. Passons-les en revue.', cible: '#rp-nav' },
      ...NAV.map(([k, t, x]) => ({ cible: `#rp-nav [data-nav="${k}"]`, titre: t, texte: x, siPresent: true })),
      { cible: '#rp-cloche-bouton', titre: 'Notifications', texte: 'La cloche rassemble les nouveautés. Le chiffre indique combien sont à voir.' },
    ] },
    commande: { titre: 'Traiter une commande', espace: 'admin', etapes: [
      { onglet: 'commandes', titre: 'Les commandes', texte: 'Elles sont rangées par étape. Commençons par celles « à valider ».', cible: '[data-groupe-commandes="valider"], [data-groupe-commandes]' },
      { cible: '[data-filtrer-statut-commande="ACTION"]', titre: 'Le filtre « Par action »', texte: 'Il ne montre que ce qui demande une action. C’est le bon réflexe le matin.' },
      { cible: '[data-commande-ouvrir]', titre: 'Ouvrir une commande', texte: 'Cliquez sur une commande pour ouvrir sa fiche. On le fait pour vous.' },
      { clic: '[data-commande-ouvrir]', cible: '.fc2', titre: 'La fiche commande', texte: 'Tout est ici : la structure, le matériel, les documents et l’historique.' },
      { cible: '.fc2 [data-onglet-commande]', titre: 'Les onglets', texte: '« À faire maintenant » dit quoi faire. « Commande » détaille le matériel. « Historique » garde la trace de chaque action.' },
      { cible: '.fc2 .et-principal', titre: 'Le bouton principal', texte: 'Il fait avancer la commande d’une étape : valider, préparer (en notant les numéros de série), expédier, puis livrée.' },
      { fermer: true, cible: '[data-ouvrir-creation="commande"]', titre: 'Saisir une commande', texte: 'Une structure vous appelle ? Ce bouton permet de saisir la commande à sa place.' },
    ] },
    structure: { titre: 'Créer une structure', espace: 'admin', etapes: [
      { onglet: 'structures', cible: '[data-ouvrir-creation="structure"]', titre: 'Nouvelle structure', texte: 'Tout commence par ce bouton. On l’ouvre pour vous.' },
      { clic: '[data-ouvrir-creation="structure"]', cible: '.dialog.csw', titre: 'Le type de structure', texte: 'C’est le choix le plus important : il décide si la structure paie, reçoit des devis et des factures, et comment son matériel est suivi.' },
      { cible: '.dialog.csw label', titre: 'Un type, des règles', texte: 'Vente solidaire : elle achète à prix réduit. Bon d’orientation : elle commande pour des personnes nommées. Interne : une équipe Emmaüs Connect. ESN : un atelier de reconditionnement. Projets : un projet financé.' },
      { cible: '[data-cs-suivant]', titre: 'Les étapes suivantes', texte: 'Ensuite : le nom, le contact, l’adresse et le territoire. À la fin, la structure reçoit un code pour se connecter.' },
      { fermer: true, cible: '[data-reveal-code]', titre: 'Le code d’accès', texte: 'Dans la liste, l’œil affiche le code d’une structure. C’est lui qu’elle utilise pour commander.' },
    ] },
    produit: { titre: 'Ajouter un produit au stock', espace: 'admin', etapes: [
      { onglet: 'stock', cible: '[data-ouvrir-creation="produit"]', titre: 'Ajouter un produit', texte: 'Un nouveau modèle d’ordinateur, une recharge… tout passe par ce bouton.' },
      { clic: '[data-ouvrir-creation="produit"]', cible: '#cp-nom', titre: 'Le nom', texte: 'Un nom clair, comme les structures le liront : « PC portable 14 pouces — Windows 11 ».' },
      { cible: '.dialog.cpw label', titre: 'L’illustration et le groupe', texte: 'Choisissez un dessin (ordinateur, téléphone…) et un groupe : Équipement, Connexion ou Accompagnement.' },
      { cible: '[data-cpw-suivant]', titre: 'Prix et stock', texte: 'Les étapes suivantes demandent le prix (normal et solidaire), la quantité en stock et les caractéristiques.' },
      { fermer: true, cible: '.dv-titre-catalogue, #rp-main h2', titre: 'Le catalogue', texte: 'Chaque produit a sa carte ici. On peut modifier son stock, son prix ou le masquer à tout moment.' },
      { cible: '[data-mode-stock-bas]', titre: 'Mode stock bas', texte: 'Si le stock devient rare, ce mode limite les quantités par commande pour que chacun soit servi.' },
    ] },
    sav: { titre: 'Suivre une réparation (SAV)', espace: 'admin', etapes: [
      { onglet: 'sav', cible: '.rp-sav-grille, [data-sav-ouvrir]', titre: 'Les dossiers SAV', texte: 'Une carte par appareil en panne. L’anneau montre l’avancement de la réparation.' },
      { cible: '[data-filtrer-statut-sav]', titre: 'Les étapes', texte: 'Reçu, en diagnostic, en attente de pièce, en réparation, réparé. Filtrez pour ne voir qu’une étape.' },
      { clic: '[data-sav-ouvrir]', cible: '.rpd', titre: 'Le dossier', texte: 'L’appareil, la structure, la commande d’origine et le passeport de l’appareil.' },
      { cible: '.rpd [data-changer-statut-sav]', titre: 'Faire avancer', texte: 'Un clic pour passer à l’étape suivante. La structure ou la personne le voit tout de suite dans son suivi.' },
      { cible: '.rpd .rpd-historique', titre: 'L’historique', texte: 'Chaque étape est datée : on sait toujours depuis combien de temps l’appareil attend.' },
      { fermer: true, cible: '[data-ouvrir-creation="sav"]', titre: 'Nouveau SAV', texte: 'Pour une panne signalée par téléphone ou à l’accueil.' },
    ] },
    factures: { titre: 'Devis, factures et paiements', espace: 'admin', etapes: [
      { onglet: 'factures', cible: '[data-ouvrir-creation="devis"]', titre: 'Le devis', texte: 'Avant la commande, la structure peut demander un devis. Il se crée ici ou depuis la fiche commande.' },
      { cible: '[data-ouvrir-creation="facture"]', titre: 'La facture', texte: 'Une fois la commande livrée, on facture. Le document est prêt à envoyer par e-mail.' },
      { cible: '[data-ouvrir-rapprochement]', titre: 'Le rapprochement', texte: 'Quand le virement arrive, on le pointe ici : la facture passe « payée ».' },
      { cible: '[data-factures-mensuelles]', titre: 'Factures du mois', texte: 'Les recharges téléphoniques sont regroupées dans une seule facture chaque mois.' },
    ] },
    finances: { titre: 'Lire les finances', espace: 'admin', etapes: [
      { onglet: 'finance', cible: '.fin-kpis', titre: 'Les chiffres clés', texte: 'Facturé, encaissé, ce qui reste à payer et ce qui est en retard.' },
      { cible: '.fin-mois', titre: 'Mois par mois', texte: 'En turquoise ce qui est payé, en jaune ce qui est en attente. Les pointillés : l’année précédente.' },
      { cible: '.fin-tranches', titre: 'Les retards', texte: 'Les factures non payées, classées par retard : moins d’un mois, deux mois, trois mois, plus.' },
      { cible: '[data-fin-relancer], [data-fin-relancer-tout]', titre: 'Relancer', texte: 'Un clic envoie un rappel poli par e-mail. La relance est notée dans l’historique.' },
      { cible: '[data-fin-filtre="region"]', titre: 'Par territoire', texte: 'Choisissez une région : toute la page se met à jour.' },
    ] },
    portail: { titre: 'Découvrir mon espace', espace: 'structure', etapes: [
      { page: 'portail-structure.html', cible: 'a.ps-choix-carte[href="commande.html"]', titre: 'Commander', texte: 'Pour demander du matériel : ordinateurs, smartphones, tablettes, recharges.' },
      { cible: 'a.ps-choix-carte[href="suivi.html"]', titre: 'Suivre mes commandes', texte: 'Où en est chaque commande, avec ses documents et ses numéros de série.' },
      { cible: 'a.ps-choix-carte[href="sav.html"]', titre: 'Signaler une panne', texte: 'Un appareil ne marche plus ? C’est ici.' },
      { cible: '.ps-stat', titre: 'Vos chiffres', texte: 'Personnes équipées, appareils, commandes et SAV en cours.' },
      { cible: 'a.ps-flotte', titre: 'Ma flotte', texte: 'La liste de tous vos appareils, et à qui ils ont été remis.' },
    ] },
    commander: { titre: 'Passer une commande', espace: 'structure', etapes: [
      { page: 'commande.html', cible: '#grille-produits', titre: 'Choisir le matériel', texte: 'Cliquez sur les cartes des produits voulus : une coche apparaît.' },
      { cible: '#cm-recap', titre: 'Le récapitulatif', texte: 'Il se remplit au fur et à mesure, avec le total estimé.' },
      { cible: '#btn-suivant', titre: 'Continuer', texte: 'Ensuite : les quantités, le paiement, puis l’envoi. Rien n’est envoyé avant le dernier bouton.' },
    ] },
    flotte: { titre: 'Gérer ma flotte', espace: 'structure', etapes: [
      { page: 'flotte-structure.html', cible: '[data-vue-flotte]', titre: 'Trois façons de voir', texte: 'En liste, en fiches, ou côté comptabilité (paiements des appareils remis).' },
      { cible: '#recherche-flotte', titre: 'Rechercher', texte: 'Un numéro de série, un nom, un modèle.' },
      { cible: '[data-filtre-statut-flotte]', titre: 'Le statut', texte: 'En stock, remis à une personne, en SAV, ou recyclé (D3E).' },
      { cible: '.cvdl-sn', titre: 'Le passeport', texte: 'Cliquez sur un numéro de série pour voir toute l’histoire de l’appareil.' },
    ] },
    partenaires: { titre: 'Travailler avec ses partenaires (Interne)', espace: 'structure', etapes: [
      { page: 'structures-partenaires.html', cible: 'main h1', titre: 'Vos partenaires', texte: 'Les associations de votre territoire. Vous leur créez un accès en quelques clics.' },
      { page: 'commandes-partenaires.html', cible: '[data-filtre-cp="attente"]', titre: 'Leurs commandes', texte: 'Elles commandent pour des personnes qu’elles accompagnent. Vous validez ici.' },
      { cible: 'main h1', titre: 'Attribuer le matériel', texte: 'Une fois validée, vous attribuez des appareils de votre propre stock à la commande.' },
      { page: 'projets-distribution.html', cible: 'main h1', titre: 'Vos projets', texte: 'Chaque appareil remis peut être rattaché à un projet financé, pour suivre l’objectif.' },
    ] },
    support: { titre: 'Traiter un ticket SAV', espace: 'support', etapes: [
      { page: 'support.html', cible: '#sp-nav', titre: 'Les files', texte: 'Les tickets sont rangés par file : à traiter, en attente de réponse, les miens, par étape…' },
      { cible: '.sp-tk', titre: 'Ouvrir un ticket', texte: 'Cliquez sur un ticket pour l’ouvrir. On le fait pour vous.' },
      { clic: '.sp-tk', cible: '[data-sp-statut]', titre: 'Le statut', texte: 'Faites avancer la réparation ici. La personne ou la structure est prévenue.' },
      { cible: '[data-sp-assigner]', titre: 'Qui s’en occupe', texte: 'Assignez le ticket à un membre de l’équipe.' },
      { cible: '[data-sp-mode="repondre"]', titre: 'Répondre', texte: 'Écrivez à la personne. « Note interne » reste invisible pour elle.' },
    ] },
  };

  function espaceCourant(){
    const p = page();
    if(p === 'admin.html') return 'admin';
    if(p === 'support.html') return 'support';
    if(/beneficiaire/.test(p)) return 'personne';
    return 'structure';
  }
  function cleEcran(){ return page() === 'admin.html' ? `admin:${onglet()}` : page(); }
  function ecranCourant(){ return ECRANS[cleEcran()] || null; }
  function tutosDisponibles(){
    const e = espaceCourant();
    let ids = Object.keys(TUTOS).filter(id => TUTOS[id].espace === e);
    if(e === 'admin' && !document.querySelector('#rp-nav [data-nav="commandes"]')) ids = ids.filter(id => ['finances', 'factures'].includes(id)); // rôle Comptabilité
    return ids;
  }

  /* ════════════════════════════════════════════════════════════════════════════════
     PASTILLES « ? »
     ════════════════════════════════════════════════════════════════════════════════ */
  let calque = null, bulleAide = null, rafPlanifie = false;
  function assurerCalque(){
    if(calque) return calque;
    calque = document.createElement('div');
    calque.className = 'xp-calque';
    calque.setAttribute('aria-hidden', 'false');
    document.body.appendChild(calque);
    return calque;
  }
  /** Vrai si l'élément est réellement visible à l'écran, pas caché sous une fenêtre (modale,
   *  fiche, voile…) : on teste ce qui se trouve au premier plan en quelques points. */
  function degage(el){
    const r = el.getBoundingClientRect();
    const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 6, r.top + 6], [r.right - 6, r.top + 6]];
    return points.some(([x, y]) => {
      if(x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
      const h = document.elementFromPoint(x, y);
      return !!h && (h === el || el.contains(h) || h.contains(el));
    });
  }
  function majPastilles(){
    rafPlanifie = false;
    if(carte) carte.hidden = document.documentElement.classList.contains('cvdl-demo-modale');
    if(!actif() || tuto){ if(calque) calque.innerHTML = ''; return; }
    const e = ecranCourant();
    const c = assurerCalque();
    const voulues = [];
    c.style.visibility = 'hidden'; // nos pastilles ne doivent pas fausser le test du premier plan
    (e && e.aides || []).forEach(([sel, titre, texte], i) => {
      const el = trouver(sel);
      if(!el || el.closest('.xp-carte, #cvdl-bandeau-demo')) return;
      const r = el.getBoundingClientRect();
      if(r.bottom < 0 || r.top > innerHeight) return;
      if(!degage(el)) return; // sous une modale ou une fenêtre : pas de pastille
      voulues.push({ i, titre, texte, x: Math.min(innerWidth - 26, r.right - 8), y: Math.max(4, r.top - 10) });
    });
    const existantes = new Map([...c.children].map(b => [b.dataset.i, b]));
    voulues.forEach(v => {
      let b = existantes.get(String(v.i));
      if(!b){
        b = document.createElement('button');
        b.type = 'button'; b.className = 'xp-pastille'; b.dataset.i = v.i; b.textContent = '?';
        b.setAttribute('aria-label', `Explication : ${v.titre}`);
        c.appendChild(b);
      }
      existantes.delete(String(v.i));
      b.dataset.titre = v.titre; b.dataset.texte = v.texte;
      b.style.transform = `translate(${Math.round(v.x)}px, ${Math.round(v.y)}px)`;
    });
    existantes.forEach(b => b.remove());
    c.style.visibility = '';
  }
  const planifier = () => { if(!rafPlanifie){ rafPlanifie = true; requestAnimationFrame(majPastilles); } };

  function montrerAide(b){
    fermerAide();
    bulleAide = document.createElement('div');
    bulleAide.className = 'xp-aide';
    bulleAide.setAttribute('role', 'dialog');
    bulleAide.innerHTML = `<b>${esc(b.dataset.titre)}</b><p>${esc(b.dataset.texte)}</p><button type="button" class="xp-aide-ok">Compris</button>`;
    document.body.appendChild(bulleAide);
    const r = b.getBoundingClientRect(), w = bulleAide.offsetWidth, h = bulleAide.offsetHeight;
    let x = Math.min(innerWidth - w - 12, Math.max(12, r.left - w / 2 + 11));
    let y = r.bottom + 8; if(y + h > innerHeight - 12) y = Math.max(12, r.top - h - 8);
    bulleAide.style.left = x + 'px'; bulleAide.style.top = y + 'px';
    bulleAide.querySelector('button').focus();
  }
  function fermerAide(){ if(bulleAide){ bulleAide.remove(); bulleAide = null; } }

  /* ════════════════════════════════════════════════════════════════════════════════
     CARTE « SUR CETTE PAGE »
     ════════════════════════════════════════════════════════════════════════════════ */
  let carte = null;
  function vus(){ try{ return JSON.parse(lire(sessionStorage, CLE_VUS) || '[]'); }catch(e){ return []; } }
  function fermerCarte(){ if(carte){ carte.remove(); carte = null; } }
  function montrerCarte(force){
    fermerCarte();
    const e = ecranCourant();
    if(!e || tuto || (!actif() && !force)) return;
    // La visite guidée de première connexion (visite-guidee.js) passe d'abord.
    if(document.querySelector('.vg-attente, .vg-voile')){ setTimeout(() => montrerCarte(force), 2500); return; }
    const cle = cleEcran();
    if(!force && vus().includes(cle)) return;
    ecrire(sessionStorage, CLE_VUS, JSON.stringify(vus().concat(cle).slice(-60)));
    const tutos = (e.tutos || []).filter(id => tutosDisponibles().includes(id));
    carte = document.createElement('section');
    carte.className = 'xp-carte';
    carte.setAttribute('role', 'dialog');
    carte.setAttribute('aria-label', 'Sur cette page');
    carte.innerHTML = `<div class="xp-carte-sur">Sur cette page</div><h2>${esc(e.titre)}</h2><p>${esc(e.texte)}</p>
      ${(e.aides || []).length ? '<p class="xp-astuce">Les pastilles <span class="xp-pastille-mini">?</span> expliquent chaque bouton.</p>' : ''}
      <div class="xp-carte-actions">
        ${tutos.map(id => `<button type="button" class="btn btn-primary" data-xp-tuto="${id}">▶ ${esc(TUTOS[id].titre)}</button>`).join('')}
        <button type="button" class="btn btn-secondary" data-xp-fermer-carte>Compris</button>
      </div>`;
    document.body.appendChild(carte);
  }

  /* ════════════════════════════════════════════════════════════════════════════════
     TUTORIELS PAS À PAS
     ════════════════════════════════════════════════════════════════════════════════ */
  let tuto = null; // { id, i, voile, bulle, cible }
  function sauverTuto(){ ecrire(sessionStorage, CLE_TUTO, tuto ? JSON.stringify({ id: tuto.id, i: tuto.i }) : null); }
  function attendre(sel, ms){
    return new Promise(res => {
      const debut = Date.now();
      (function boucle(){
        const el = sel ? trouver(sel) : null;
        if(el || !sel || Date.now() - debut > ms) return res(el);
        setTimeout(boucle, 120);
      })();
    });
  }
  function fermerModales(){
    document.querySelectorAll('[data-modal-fermer]').forEach(b => { if(visible(b)) b.click(); });
  }

  function lancerTuto(id, i){
    if(!TUTOS[id]) return;
    fermerCarte(); fermerAide(); fermerPanneau();
    if(calque) calque.innerHTML = '';
    tuto = { id, i: i || 0 };
    sauverTuto();
    allerEtape(tuto.i, 1);
  }
  async function allerEtape(i, sens){
    if(!tuto) return;
    const etapes = TUTOS[tuto.id].etapes;
    if(i < 0) i = 0;
    if(i >= etapes.length) return finirTuto();
    tuto.i = i; sauverTuto();
    const e = etapes[i];
    // Changement de page : on reprend au chargement suivant.
    if(e.page && e.page !== page()){ location.href = e.page; return; }
    if(e.onglet && page() === 'admin.html' && onglet() !== e.onglet){
      fermerModales();
      location.hash = '#' + e.onglet;
      await attendre('#rp-main h1', 3000);
      await new Promise(r => setTimeout(r, 350));
    }
    if(e.fermer) { fermerModales(); await new Promise(r => setTimeout(r, 300)); }
    if(e.clic && sens > 0){
      const b = await attendre(e.clic, 3000);
      if(b){ b.click(); await new Promise(r => setTimeout(r, 600)); }
    }
    const cible = e.cible ? await attendre(e.cible, 3500) : null;
    if(!tuto) return;
    if(e.siPresent && !cible) return allerEtape(i + (sens || 1), sens || 1); // élément absent pour ce rôle : on saute
    afficherEtape(e, cible, i, etapes.length);
  }
  function afficherEtape(e, cible, i, n){
    if(!tuto.voile){
      tuto.voile = document.createElement('div'); tuto.voile.className = 'xp-projecteur';
      tuto.bulle = document.createElement('div'); tuto.bulle.className = 'xp-bulle'; tuto.bulle.setAttribute('role', 'dialog'); tuto.bulle.setAttribute('aria-live', 'polite');
      document.body.append(tuto.voile, tuto.bulle);
      addEventListener('resize', placer); addEventListener('scroll', placer, true);
    }
    tuto.cible = cible;
    tuto.bulle.innerHTML = `<div class="xp-bulle-tete"><span class="xp-bulle-n">${i + 1} / ${n}</span><span class="xp-bulle-tuto">${esc(TUTOS[tuto.id].titre)}</span>
        <button type="button" class="xp-x" data-xp-quitter aria-label="Fermer le tutoriel">✕</button></div>
      <h3>${esc(e.titre)}</h3><p>${esc(e.texte)}</p>
      <div class="xp-bulle-actions">${i > 0 ? '<button type="button" class="btn btn-secondary" data-xp-prec>Précédent</button>' : ''}
        <button type="button" class="btn btn-primary" data-xp-suiv>${i + 1 < n ? 'Suivant' : 'Terminer'}</button></div>`;
    if(cible){
      const r = cible.getBoundingClientRect();
      if(r.top < 70 || r.bottom > innerHeight - 40) cible.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    placer();
    tuto.bulle.querySelector('[data-xp-suiv]').focus({ preventScroll: true });
  }
  function placer(){
    if(!tuto || !tuto.bulle) return;
    const b = tuto.bulle, v = tuto.voile, c = tuto.cible && document.contains(tuto.cible) ? tuto.cible : null;
    const w = b.offsetWidth, h = b.offsetHeight, m = 12;
    if(!c){
      v.classList.add('sans-cible'); v.style.cssText = '';
      b.style.left = Math.max(m, (innerWidth - w) / 2) + 'px'; b.style.top = Math.max(m, (innerHeight - h) / 2) + 'px';
      return;
    }
    v.classList.remove('sans-cible');
    const r = c.getBoundingClientRect(), p = 6;
    const haut = Math.min(r.height + p * 2, innerHeight * 0.8);
    v.style.left = (r.left - p) + 'px'; v.style.top = (r.top - p) + 'px'; v.style.width = (r.width + p * 2) + 'px'; v.style.height = haut + 'px';
    let x, y;
    if(r.bottom + h + 16 < innerHeight){ y = r.top - p + haut + 12; x = r.left; }
    else if(r.top - h - 16 > 0){ y = r.top - p - h - 12; x = r.left; }
    else if(r.right + w + 20 < innerWidth){ x = r.right + 16; y = r.top; }
    else { x = r.left - w - 16; y = r.top; }
    b.style.left = Math.min(innerWidth - w - m, Math.max(m, x)) + 'px';
    b.style.top = Math.min(innerHeight - h - m, Math.max(m, y)) + 'px';
  }
  function finirTuto(){
    if(!tuto) return;
    if(tuto.voile){ tuto.voile.remove(); tuto.bulle.remove(); }
    removeEventListener('resize', placer); removeEventListener('scroll', placer, true);
    tuto = null; sauverTuto();
    planifier();
  }

  /* ════════════════════════════════════════════════════════════════════════════════
     PANNEAU « TUTORIELS » ET INTERRUPTEUR (appelés par le bandeau de portail-ui.js)
     ════════════════════════════════════════════════════════════════════════════════ */
  let panneau = null;
  function fermerPanneau(){ if(panneau){ panneau.remove(); panneau = null; } }
  function ouvrirPanneau(){
    if(panneau) return fermerPanneau();
    fermerAide();
    const ids = tutosDisponibles();
    const e = ecranCourant();
    panneau = document.createElement('section');
    panneau.className = 'xp-panneau';
    panneau.setAttribute('role', 'dialog'); panneau.setAttribute('aria-label', 'Tutoriels');
    panneau.innerHTML = `<div class="xp-panneau-tete"><b>Tutoriels</b><button type="button" class="xp-x" data-xp-fermer-panneau aria-label="Fermer">✕</button></div>
      ${ids.length ? `<p>Pas à pas, en quelques clics. Vous pouvez arrêter à tout moment.</p><div class="xp-liste">${ids.map(id => `<button type="button" data-xp-tuto="${id}"><span>▶</span>${esc(TUTOS[id].titre)}<small>${TUTOS[id].etapes.length} étapes</small></button>`).join('')}</div>`
        : '<p>Pas de tutoriel pour cet espace : les explications de la page suffisent.</p>'}
      ${e ? '<button type="button" class="xp-lien" data-xp-revoir>Revoir l’explication de cette page</button>' : ''}`;
    document.body.appendChild(panneau);
  }
  function definirActif(oui){
    ecrire(localStorage, CLE, oui ? '1' : '0');
    if(!oui){ fermerCarte(); fermerAide(); fermerPanneau(); finirTuto(); }
    else montrerCarte(true);
    planifier();
    document.dispatchEvent(new CustomEvent('cvdl-explications', { detail: { actif: oui } }));
  }

  /* ── Événements ── */
  document.addEventListener('click', e => {
    const t = e.target;
    const p = t.closest('.xp-pastille'); if(p){ e.preventDefault(); e.stopPropagation(); return montrerAide(p); }
    if(t.closest('.xp-aide-ok') || (bulleAide && !t.closest('.xp-aide'))) fermerAide();
    const lt = t.closest('[data-xp-tuto]'); if(lt) return lancerTuto(lt.dataset.xpTuto, 0);
    if(t.closest('[data-xp-fermer-carte]')) return fermerCarte();
    if(t.closest('[data-xp-fermer-panneau]')) return fermerPanneau();
    if(t.closest('[data-xp-revoir]')){ fermerPanneau(); return montrerCarte(true); }
    if(t.closest('[data-xp-suiv]')) return allerEtape(tuto.i + 1, 1);
    if(t.closest('[data-xp-prec]')) return allerEtape(tuto.i - 1, -1);
    if(t.closest('[data-xp-quitter]')) return finirTuto();
    if(panneau && !t.closest('.xp-panneau, #cvdl-bandeau-demo')) fermerPanneau();
  }, true);
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    if(tuto){ finirTuto(); e.stopPropagation(); }
    else if(bulleAide) fermerAide();
    else if(panneau) fermerPanneau();
  }, true);
  // Après un clic (ouverture / fermeture d'une fenêtre animée), on revérifie une fois l'animation finie.
  document.addEventListener('click', () => { setTimeout(planifier, 350); setTimeout(planifier, 900); });
  addEventListener('scroll', planifier, true);
  addEventListener('resize', planifier);
  addEventListener('hashchange', () => { setTimeout(() => { if(!tuto) montrerCarte(false); planifier(); }, 700); });
  new MutationObserver(planifier).observe(document.documentElement, { childList: true, subtree: true });

  function demarrer(){
    let reprise = null;
    try{ reprise = JSON.parse(lire(sessionStorage, CLE_TUTO) || 'null'); }catch(e){ reprise = null; }
    if(reprise && TUTOS[reprise.id]){
      // Laisse la page se charger (données, connexion) avant de reprendre.
      setTimeout(() => { tuto = { id: reprise.id, i: reprise.i }; allerEtape(reprise.i, 1); }, 1500);
      return;
    }
    setTimeout(() => { if(actif()) montrerCarte(false); planifier(); }, 1600);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();

  window.CvdlExplications = { actif, definirActif, ouvrirPanneau, lancerTuto, TUTOS, ECRANS };
})();
