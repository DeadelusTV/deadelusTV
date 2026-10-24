// ONGLET ÉQUIPAGE
// Une fiche par personnage joueur.

window.PAVILLON_PERSONNAGES = [
  {
    "id": "solenn-brissac",
    "fiche": "assets/fiche_solenn.png",
    "nom": "Solenn Brissac",
    "surnom": "Lame-de-rhum",
    "role": "Chirurgienne de l’équipage pirate",
    "origine": "Brest",
    "age": "Non précisé",
    "resume": "Chirurgienne diplômée formée à Brest, aussi à l’aise face au sang et aux blessures qu’avec une bouteille de rhum, toujours accompagnée de son perroquet Ratafia.",
    "histoire": [
      "« Y a des capitaines qu'on remplace. Des charpentiers, ça se trouve à tous les ports. Mais moi ? Une bonne chirurgienne qui tient l’coup face au sang, à la vermine, aux boulets dans l’abdomen et à trois pintes de rhum par jour ? T’en trouveras pas deux comme moi dans tout l’Archipel. »",
      "« Moi c’est Solenn Brissac, surnommée la Lame-de-rhum, chirurgienne diplômée — si si, avec des vrais papiers ! — formée à Brest, chassée pour “conduite indécente et usage immodéré des spiritueux médicinaux”. Depuis, j’passe ma vie en mer. J’ouvre des ventres, je recouds des bras, j’ampute dans le rire, et je soigne mieux que n’importe quel toubib de marine. Tant que j’ai mon scalpel, mon perroquet, et un fond de rhum dans la bouteille… le monde peut bien saigner. »",
      "Elle fixe son interlocuteur, l’œil un peu injecté et le sourire à demi-fendu. Sur son épaule, son perroquet ponctue la scène d’un sinistre « An-ti-sep-tique ! An-ti-sep-tique ! »."
    ],
    "traits": [
      "Très compétente en soins",
      "Goût prononcé pour le rhum",
      "Joueuse",
      "Méthodes peu conventionnelles"
    ],
    "competences": [
      "Premiers soins",
      "Chirurgie",
      "Jeu"
    ],
    "relations": [
      {
        "cible": "Dorak Maugemeur",
        "texte": "Le soigne après sa sortie des cachots puis sympathise avec lui."
      },
      {
        "cible": "Chad et Accra",
        "texte": "Relation d'abord mouvementée autour d'une bière, puis nettement plus amicale."
      }
    ],
    "evolution": [
      {
        "session": "Session 01",
        "texte": "Soigne Dorak Maugemeur, subit une blessure légère pendant la bagarre et prend ensuite son poste à l'infirmerie du Saint-Michel."
      },
      {
        "session": "Session 02",
        "texte": "Subit le mal de mer mais reste extrêmement efficace pendant la grande tempête, soigne de nombreux blessés et participe ensuite à l’examen du corps de Blackangele."
      },
      {
        "session": "Session 03",
        "texte": "Soigne les survivants du naufrage, identifie un puissant narcotique local pour soulager les blessés les plus graves et finit elle-même par s’en administrer après les soins."
      },
      {
        "session": "Session 04",
        "texte": "Réveillée en urgence pendant l’embuscade, soigne Baron et Aldry puis participe au combat sur la plage. Elle prend ensuite en charge Tenqneoo après la rupture avec l’équipage ; il survit, mais conserve une grave séquelle pulmonaire."
      },
      {
        "session": "Session 05",
        "texte": "Soigne les blessés pendant les derniers jours sur l’île puis devient particulièrement précieuse à bord de La Bonne Fortune, qui manque de véritable chirurgien. À Saint-Pierre, elle rejoint avec les autres l’équipage pirate fusionné."
      }
    ]
  },
  {
    "id": "baron-bayard",
    "fiche": "assets/fiche_baron.png",
    "nom": "Baron Bayard",
    "nomComplet": "Jean-Nicolas Marie de Paladru dit Baron Bayard",
    "role": "Quartier-maître de l’équipage pirate",
    "origine": "Isère",
    "age": "24 ans",
    "resume": "Noble savoyard de 24 ans, élégant et charismatique, qui quitte une jeunesse agitée et les responsabilités de son rang pour chercher l’aventure et la liberté dans la marine marchande.",
    "histoire": [
      "Jean-Nicolas Marie de Paladru dit Baron Bayard, noble savoyard de 24 ans, incarne l’élégance et la prestance de la haute noblesse française du début du XVIIIe siècle. Il mesure environ 1,85 m, avec une silhouette élancée et gracieuse, sans être excessivement musclé. Son visage est harmonieux, aux traits fins et réguliers, avec une expression confiante et charismatique.",
      "Ses cheveux bruns, légèrement ondulés, encadrent un front dégagé. Il ne porte pas de perruque, ce qui le distingue des modes de cour les plus strictes. Ses yeux bleus perçants renforcent cette impression d’assurance et d’ambition. Il porte une tenue richement ornée de velours bleu roi, brodée de fleurs de lys dorées, ainsi qu’une rapière à la poignée finement ouvragée, davantage bijou de statut que simple arme.",
      "Originaire de l’Isère, il a passé une jeunesse troublée par de nombreux écarts de conduite qui lui ont valu maintes remontrances de ses précepteurs et de ses parents. Trouvant toujours le bon mot pour se sortir des ennuis, il n’avait pourtant qu’un seul rêve : échapper aux responsabilités d’une vie de noblion.",
      "Il part ainsi pour la côte atlantique afin de faire ses classes dans la marine marchande, avec l’espoir de rejoindre le Nouveau Monde et d’y trouver la liberté. Devant les ports, la mer et les navires, il mêle l’assurance de son rang à une indépendance qui cadre beaucoup moins avec la vie qu’on avait prévue pour lui."
    ],
    "traits": [
      "Noble",
      "Orgueilleux",
      "À l'aise socialement",
      "Attiré par l'aventure"
    ],
    "competences": [
      "Persuasion",
      "Intimidation",
      "Connaissances nautiques"
    ],
    "relations": [
      {
        "cible": "Aldry Baratte",
        "texte": "Les deux hommes se connaissent déjà un peu avant le début de la campagne."
      },
      {
        "cible": "Dorak Maugemeur",
        "texte": "Participe à sa libération et impose son autorité lors de la confrontation avec Novabrux."
      }
    ],
    "evolution": [
      {
        "session": "Session 01",
        "texte": "Convainc la garde de les laisser voir Dorak, puis impressionne toute une taverne par une intimidation spectaculaire. À bord, il relaie les ordres aux marins."
      },
      {
        "session": "Session 02",
        "texte": "Tente de modérer les sanctions du capitaine, surveille la montée des tensions à bord, participe à l’enquête sur Blackangele et choisit de ne pas dénoncer Darlingsamaa."
      },
      {
        "session": "Session 03",
        "texte": "Participe activement à l’évacuation du Saint-Michel, gagne la confiance d’une partie des survivants jusqu’à devenir leur chef officieux, puis est blessé au bras gauche lors de l’embuscade dans la forêt."
      },
      {
        "session": "Session 04",
        "texte": "Organise le repli après l’embuscade, défend publiquement une alliance avec les pirates et voit la majorité des marins se ranger derrière lui plutôt que Tenqneoo. Sans devenir chef officiel, il devient leur principale figure d’autorité et signe la chasse-partie avec les pirates."
      },
      {
        "session": "Session 05",
        "texte": "Participe à l’organisation de la défense, négocie avec Tickal86 le sauvetage puis une escale à Saint-Pierre, et choisit finalement de fusionner avec l’équipage de Roi_axolotl1er. Swananoux lui cède alors la fonction de quartier-maître."
      }
    ]
  },
  {
    "id": "anduin-marleau",
    "fiche": "assets/fiche_anduin.png",
    "nom": "Anduin Marlow",
    "role": "Marin · Aspirant canonnier",
    "origine": "Nantes",
    "age": "17 ans",
    "resume": "Jeune Nantais de 17 ans issu d’une famille pauvre, qui a eu la chance d’apprendre à lire et rêve de se faire recruter comme canonnier sans révéler son véritable âge.",
    "histoire": [
      "« Je m’appelle Anduin Marlow. Je suis de Nantes. Je suis un jeune homme avec une carrure plutôt normale. Je suis issu d’une famille assez pauvre, mais j’ai eu la chance d’étudier et surtout d’apprendre à lire. »",
      "« Ma mère me racontait souvent des histoires de navires de guerre et de piraterie, et j’ai toujours aimé ce genre d’histoires. »",
      "« Mon but est de me faire recruter sur un navire en tant que canonnier, mais le problème, c’est que j’ai 17 ans… et ça, les gens autour de moi ne le savent pas ! »"
    ],
    "traits": [
      "Instruit",
      "Passionné d'histoire navale",
      "Ambitieux",
      "Cache son âge"
    ],
    "competences": [
      "Lecture",
      "Pratique nautique",
      "Aptitudes au tir"
    ],
    "secrets": [
      "Il n'a que 17 ans et ne l'a pas révélé aux autres personnages."
    ],
    "relations": [],
    "evolution": [
      {
        "session": "Session 01",
        "texte": "Participe à la première mission du groupe puis aux manœuvres de départ du Saint-Michel. Il partage la même bordée qu'Aldry et Bayard."
      },
      {
        "session": "Session 02",
        "texte": "Commence à tenir discrètement un journal de la traversée, aide à sécuriser un canon pendant la tempête puis atteint la mâture d’une frégate anglaise avec un boulet chaîné."
      },
      {
        "session": "Session 03",
        "texte": "Participe à l’organisation du camp puis gagne les hauteurs pour observer l’île. Il repère une colonne de fumée au nord-ouest, révélant que les naufragés ne sont probablement pas seuls."
      },
      {
        "session": "Session 04",
        "texte": "Participe à l’affrontement contre les habitants autochtones sur la plage et est blessé au bras gauche. Lors de la négociation finale, il se place à distance avec son mousquet afin de couvrir Baron et Aldry."
      },
      {
        "session": "Session 05",
        "texte": "Survit aux derniers jours d’attaques sur l’île puis rejoint l’équipage pirate fusionné à Saint-Pierre. Il demande à poursuivre sa formation auprès du canonnier Fireman_fr, qui accepte de le prendre sous son aile."
      }
    ]
  },
  {
    "id": "aldry-barat",
    "fiche": "assets/fiche_aldry.png",
    "nom": "Aldry Baratte",
    "role": "Second de l’équipage pirate",
    "origine": "Non précisée",
    "age": "21 ans",
    "resume": "Marin déjà expérimenté, spécialisé dans les manœuvres des voiles et assez opportuniste pour faire d'une bagarre une excellente diversion.",
    "histoire": [
      "Aldry a déjà servi sur un navire avant le début de la campagne et s'est spécialisé comme gabier, chargé des manœuvres liées aux voiles.",
      "Il connaît déjà un peu Bayard au commencement de l'histoire.",
      "Il ne sait pas lire, détail qui devient douloureusement évident lorsqu'il tente d'examiner le carnet de navigation de Dorak."
    ],
    "traits": [
      "Expérience de la mer",
      "Réactif",
      "Débrouillard",
      "Ne sait pas lire"
    ],
    "competences": [
      "Pratique nautique",
      "Larcin",
      "Adaptabilité"
    ],
    "relations": [
      {
        "cible": "Baron Bayard",
        "texte": "Connaissance antérieure à la campagne."
      },
      {
        "cible": "Dorak Maugemeur",
        "texte": "Montre un réel intérêt pour son carnet et pour ses connaissances de pilote."
      }
    ],
    "evolution": [
      {
        "session": "Session 01",
        "texte": "Profite de la bagarre générale pour récupérer le carnet sur Novabrux, puis se distingue favorablement lors des premières manœuvres du Saint-Michel."
      },
      {
        "session": "Session 02",
        "texte": "Commence à apprendre à lire avec Dorak, se distingue pendant la tempête et sauve plusieurs marins lors de l’attaque de la frégate anglaise."
      },
      {
        "session": "Session 03",
        "texte": "Participe à la survie après le naufrage puis se distingue pendant les recherches nocturnes. Il suit les traces des marins disparus, repère un reflet métallique dans la forêt et échappe de justesse à une flèche au début de l’embuscade."
      },
      {
        "session": "Session 04",
        "texte": "Reçoit une flèche à la jambe pendant le repli, puis part en éclaireur lors de l’exploration de la côte et découvre les marins assiégés. Blessé de nouveau pendant le combat, il accompagne ensuite Baron comme second émissaire lors de la négociation avec les pirates."
      },
      {
        "session": "Session 05",
        "texte": "Après la survie sur l’île et le passage à bord de La Bonne Fortune, il choisit de rejoindre l’équipage de Roi_axolotl1er. Ses compétences nautiques convainquent le capitaine de le nommer second, le précédent titulaire étant mort sur l’île."
      }
    ]
  }
];
