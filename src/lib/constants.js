// Niveaux d'enseignement FWB
export const NIVEAUX = [
  { value: 'fondamental', label: 'Fondamental (5-12 ans)' },
  { value: 'secondaire_inf', label: 'Secondaire inférieur (12-14 ans)' },
  { value: 'secondaire_2', label: '2e degré secondaire (14-16 ans)' },
  { value: 'secondaire_3', label: '3e degré secondaire (16-18 ans)' },
  { value: 'cefa', label: 'CEFA' },
]

// Types d'enseignement FWB
export const TYPES_ENSEIGNEMENT = [
  { value: 'general', label: 'Général' },
  { value: 'technique', label: 'Technique de transition' },
  { value: 'technique_qual', label: 'Technique de qualification' },
  { value: 'qualifiant', label: 'Qualifiant / Professionnel' },
  { value: 'cefa', label: 'CEFA' },
]

// Types de rétroaction
export const TYPES_RETROACTION = [
  { value: 'production', label: 'Commentaire sur une production', icon: '✏️' },
  { value: 'evaluation', label: "Commentaire d'évaluation", icon: '📋' },
  { value: 'bulletin', label: 'Commentaire de bulletin', icon: '📄' },
]

// Les 4 dimensions Carless & Boud (2018)
export const DIMENSIONS_LITTERATIE = [
  {
    id: 'dispositions',
    label: 'Dispositions',
    description: 'Croyances et attitudes face à la rétroaction',
    color: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
  },
  {
    id: 'conception',
    label: 'Conception',
    description: 'Comprendre les critères et les attentes',
    color: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-500',
  },
  {
    id: 'litteratie',
    label: 'Littératie au sens strict',
    description: 'Décoder, trier, prioriser, traduire en actions',
    color: 'bg-brand-100 text-brand-800',
    dot: 'bg-brand-500',
  },
  {
    id: 'appropriation',
    label: 'Appropriation',
    description: 'Agir sur la rétroaction et réviser',
    color: 'bg-orange-100 text-orange-800',
    dot: 'bg-orange-500',
  },
]

// Matières (liste non exhaustive, extensible)
export const MATIERES = [
  'Français', 'Mathématiques', 'Sciences', 'Histoire', 'Géographie',
  'Anglais', 'Néerlandais', 'Allemand', 'Éducation physique',
  'Arts plastiques', 'Musique', 'Sciences économiques', 'Philosophie',
  'Boucherie', 'Pâtisserie', 'Cuisine', 'Coiffure', 'Esthétique',
  'Soins à la personne', 'Électricité', 'Mécanique', 'Construction',
  'Informatique', 'Comptabilité', 'Autre',
]

// Niveau de maîtrise de la rétroaction (pour MODULE 6)
export const NIVEAUX_MAITRISE = [
  {
    value: 'debutant',
    label: 'Je débute',
    description: "L'app construit 80%, je personnalise 20%",
    icon: '🌱',
  },
  {
    value: 'intermediaire',
    label: 'Je progresse',
    description: "Suggestions + template à compléter",
    icon: '🌿',
  },
  {
    value: 'expert',
    label: 'Je maîtrise',
    description: 'Guide rapide — checklist uniquement',
    icon: '🌳',
  },
]

// Taxonomie des obstacles (Brousseau) — tous niveaux, toutes matières
export const TYPES_OBSTACLE = [
  {
    value: 'épistémologique',
    label: 'Épistémologique',
    description: "Un savoir antérieur — vrai dans un autre contexte — bloque l'apprentissage nouveau. L'élève généralise à tort.",
    exemples: 'Maths : « la multiplication rend plus grand ». Français : « le sujet fait l'action ». Sciences : « le froid entre dans la maison ».',
  },
  {
    value: 'didactique',
    label: 'Didactique',
    description: "L'élève croit faire ce qu'on demande, mais a mal lu le contrat didactique. Il applique une règle — pas la bonne.",
    exemples: 'Résumer en recopiant. Calculer chiffre par chiffre sans retenue. Dessiner ce qu'il imagine, pas ce qu'il observe.',
  },
  {
    value: 'ontogénique',
    label: 'Ontogénique',
    description: "L'outil mental requis n'est pas encore disponible à ce stade de développement. L'obstacle est lié à l'âge et au stade cognitif.",
    exemples: 'Raisonnement proportionnel avant 12 ans. Pensée hypothético-déductive. Distanciation de l\'auteur en lecture littéraire.',
  },
  {
    value: 'linguistique',
    label: 'Linguistique (CLIL)',
    description: "L'élève maîtrise le concept dans sa langue principale, mais la langue d'enseignement crée une interférence. Le concept n'est pas en cause.",
    exemples: 'Réussit en FR, échoue en NL ou EN. Confusion terminologique inter-langues.',
  },
]

// Périodes pour le suivi
export const PERIODES = [
  { value: 'trim1', label: '1er trimestre' },
  { value: 'trim2', label: '2e trimestre' },
  { value: 'trim3', label: '3e trimestre' },
  { value: 'sem1', label: '1er semestre' },
  { value: 'sem2', label: '2e semestre' },
]
