// ONGLET SYSTÈME DE JEU
// Aide de lecture pour les viewers. Ce n'est pas une reproduction du livre de règles.
// Les explications ci-dessous reprennent uniquement ce qui a été expliqué en jeu par le MJ / les joueurs.

window.PAVILLON_SYSTEME = {
  "titre": "Comprendre le système",
  "intro": "Pas besoin de connaître tout Pavillon Noir pour suivre les parties. Voici seulement les règles qui reviennent à l'écran : combien de dés sont lancés, quels résultats comptent et pourquoi certains jets deviennent franchement dangereux.",
  "regleBase": {
    "titre": "Le jet standard",
    "etapes": [
      {
        "titre": "1. La compétence donne le nombre de dés",
        "texte": "Le score dans la compétence indique combien de D10 sont lancés. Une compétence à 3 signifie donc 3D10."
      },
      {
        "titre": "2. La caractéristique donne le seuil",
        "texte": "Le MJ associe ensuite une caractéristique à l'action : Perception, Adresse, Adaptabilité, Charisme, etc. Chaque dé doit faire un résultat inférieur ou égal à cette valeur pour compter comme une réussite."
      },
      {
        "titre": "3. On compte les réussites",
        "texte": "Chaque dé réussi ajoute une réussite. Plus il y en a, meilleur est généralement le résultat obtenu."
      }
    ],
    "exemple": "Exemple vu en jeu : avec 3 en Vigilance et 6 en Perception, le personnage lance 3D10. Chaque résultat de 6 ou moins compte comme une réussite."
  },
  "critiques": [
    {
      "titre": "Le 1",
      "texte": "Un 1 est un succès critique et compte double : il vaut deux réussites."
    },
    {
      "titre": "Le 10",
      "texte": "Sur un D10, un 10 est un échec. Plusieurs mauvais résultats de ce type peuvent conduire à un échec critique selon le jet."
    },
    {
      "titre": "Compétence à 0",
      "texte": "Un personnage peut quand même tenter l'action, mais il lance alors 1D20 au lieu d'un D10. Le seuil de la caractéristique reste le même et tout résultat de 10 ou plus devient un échec critique."
    }
  ],
  "exempleZero": "Exemple expliqué pendant la Session 03 : avec une caractéristique à 6 et 0 dans la compétence, 1 à 6 réussit, 7 à 9 échoue normalement et 10 à 20 provoque un échec critique.",
  "variantes": [
    {
      "titre": "Pourquoi la même compétence peut utiliser une autre caractéristique ?",
      "texte": "La caractéristique dépend de la manière dont le personnage agit. Une même compétence peut donc être associée à l'Adresse, l'Adaptabilité, le Charisme ou une autre caractéristique selon l'approche choisie et la situation."
    },
    {
      "titre": "Pourquoi certains jets utilisent seulement un dé ?",
      "texte": "Certains tests ne suivent pas le jet de compétence classique. Le MJ peut demander directement un dé pour résoudre une réaction, une chance ou une autre situation ponctuelle."
    },
    {
      "titre": "Et l'initiative ?",
      "texte": "Dans les scènes de combat montrées jusqu'ici, l'Adaptabilité sert notamment à déterminer l'ordre d'action."
    }
  ],
  "blessures": {
    "titre": "Blessures et localisation",
    "texte": "Lorsqu'un personnage est touché, un D6 peut servir uniquement à déterminer la zone atteinte parmi six localisations. Ce D6 ne représente pas les dégâts. Les dégâts sont ensuite appliqués séparément à la zone concernée.",
    "exemple": "Lors de l'embuscade de la Session 03, Barron lance un D6 : le résultat désigne le bras gauche, puis la flèche lui inflige 2 points de dégâts à cet endroit."
  },
  "progression": {
    "titre": "Pourquoi ils cochent parfois une compétence ?",
    "texte": "Une très belle réussite peut permettre de cocher la compétence utilisée. À certains moments, le MJ transforme ensuite ces coches en progression / points d'expérience. Une réussite avec une compétence à 0 peut également compter comme une réussite particulièrement notable."
  },
  "memo": [
    "Compétence = nombre de D10",
    "Caractéristique = valeur à ne pas dépasser",
    "1 = succès critique, compte double",
    "10 = échec sur un D10",
    "Compétence à 0 = 1D20, et 10+ = échec critique",
    "D6 de blessure = localisation, pas dégâts"
  ]
};
