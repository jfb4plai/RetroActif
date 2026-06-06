/**
 * Vercel Serverless Function — Génération de rétroaction via Claude Haiku
 * Route : POST /api/generate
 *
 * Le system prompt est conçu pour produire du texte non-LLM :
 * - langue directe, registre enseignant FWB
 * - pas de formules IA ("Voici", "Bien sûr", "Il est important de noter")
 * - pas de listes à puces par défaut
 * - pas de preamble, directement dans la matière
 */

// Rate limiter simple — par IP, par instance serverless
const rateLimitMap = new Map()
const RATE_LIMIT = 10
const RATE_WINDOW = 60 * 1000

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Trop de requêtes — réessayez dans 1 minute.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API manquante (ANTHROPIC_API_KEY)' })
  }

  const { action, context } = req.body
  if (!action || !context) {
    return res.status(400).json({ error: 'action et context sont requis' })
  }

  const systemPrompt = buildSystemPrompt(action, context)
  const userMessage = buildUserMessage(action, context)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: action === 'bulletin' ? 1200 : action === 'ameliorer' ? 600 : action === 'extract_corpus' ? 400 : 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      if (response.status === 429) {
        return res.status(429).json({ error: 'Quota atteint — réessayez dans 1 minute.' })
      }
      return res.status(500).json({ error: err.error?.message ?? 'Erreur API Anthropic' })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ──────────────────────────────────────────────────────────
// Construction du system prompt selon l'action
// ──────────────────────────────────────────────────────────

function buildSystemPrompt(action, context) {
  const niveauLabel = {
    fondamental: 'fondamental (5-12 ans)',
    secondaire_inf: 'secondaire inférieur (12-14 ans)',
    secondaire_2: '2e degré secondaire (14-16 ans)',
    secondaire_3: '3e degré secondaire (16-18 ans)',
    cefa: 'CEFA',
  }[context.niveau] ?? context.niveau

  const typeLabel = {
    general: 'enseignement général',
    technique: 'enseignement technique de transition',
    technique_qual: 'enseignement technique de qualification',
    qualifiant: 'enseignement qualifiant / professionnel',
    cefa: 'CEFA',
  }[context.type_enseignement] ?? context.type_enseignement

  // Règles anti-claudisation communes à toutes les actions
  const antiClaudisation = `
RÈGLES D'ÉCRITURE ABSOLUES :
- Tu écris directement la rétroaction, sans introduction ni explication autour.
- Jamais de : "Voici", "Bien sûr", "Certainement", "Il est important de noter", "En conclusion", "N'hésitez pas".
- Jamais de bullet points sauf si le contexte l'exige explicitement.
- Jamais de preamble qui reformule la demande.
- Jamais de formule de fermeture ("J'espère que...", "Bonne continuation").
- Registre : collègue pédagogue expérimenté, pas consultant IA.
- Langue directe, précise, centrée sur la tâche de l'élève.
- Une phrase = une information. Pas de phrases à rallonge.
- Ton adapté au niveau : ${niveauLabel}, ${typeLabel}.
- La rétroaction est centrée sur la tâche ou le processus, jamais sur la personne.
- L'élève qui lit cette rétroaction doit savoir exactement QUOI faire et COMMENT.`

  if (action === 'retroaction') {
    // Guidance Brousseau : oriente l'action concrète selon le type d'obstacle identifié
    const obstacleGuidance = context.type_obstacle ? (() => {
      const guides = {
        'épistémologique': "L'erreur vient d'un savoir antérieur correct dans un autre contexte qui bloque ici. L'ACTION CONCRÈTE doit d'abord déconstruire cette représentation (montrer pourquoi elle ne fonctionne plus), puis reconstruire sur des bases explicites. Ne pas ignorer l'ancien savoir — le nommer, puis montrer sa limite.",
        'didactique': "L'élève croit faire ce qu'on lui demande mais a mal lu le contrat didactique. L'ACTION CONCRÈTE doit reformuler explicitement ce qu'on attendait, rendre visible le malentendu sans culpabiliser, et donner un exemple de ce que la tâche attend réellement.",
        'ontogénique': "L'outil mental requis n'est pas encore disponible à ce stade. L'ACTION CONCRÈTE doit adapter le niveau de la tâche, proposer un étayage (manipulable, représentation intermédiaire, exemple concret) ou différencier la modalité — sans forcer l'abstraction prématurée.",
        'linguistique': "La langue d'enseignement crée une interférence : l'élève maîtrise le concept dans sa L1 mais bloque dans la langue cible. L'ACTION CONCRÈTE doit dissocier la compétence conceptuelle de la compétence linguistique — valider le concept, travailler la terminologie séparément.",
      }
      return `\nType d'obstacle identifié (Brousseau) : ${context.type_obstacle}\n${guides[context.type_obstacle] ?? ''}\n`
    })() : ''

    return `Tu es un conseiller pédagogique FWB spécialisé en évaluation formative. Tu rédiges des rétroactions activables pour des enseignants.

Contexte d'enseignement :
- Niveau : ${niveauLabel}
- Type : ${typeLabel}
- Matière : ${context.matiere ?? 'non précisée'}
- Type de rétroaction : ${context.type_retroaction ?? 'non précisé'}
${obstacleGuidance}
Une rétroaction activable contient toujours :
1. Un point fort observé (centré sur la tâche / le processus)
2. Un axe d'amélioration précis (pas "améliore", mais QUOI améliorer exactement)
3. Une action concrète (l'élève sait ce qu'il fait, quand, et le critère de réussite)

${antiClaudisation}`
  }

  if (action === 'bulletin') {
    return `Tu es un conseiller pédagogique FWB. Tu génères des commentaires de bulletin cohérents et évolutifs à partir de l'historique des rétroactions d'un élève sur la période.

Contexte :
- Niveau : ${niveauLabel}
- Type : ${typeLabel}
- Matière : ${context.matiere ?? 'non précisée'}
- Période : ${context.periode ?? 'non précisée'}

Le commentaire de bulletin doit :
- Montrer la trajectoire de l'élève sur la période (pas un instantané)
- Nommer les progrès observés de façon concrète
- Identifier l'axe de travail prioritaire pour la suite
- Annoncer l'action pédagogique prévue (pas seulement ce que l'élève doit faire)
- Être lisible par les parents ET l'élève
- Être différent du bulletin précédent (montrer l'évolution, pas un copier-coller)

${antiClaudisation}`
  }

  if (action === 'ameliorer') {
    return `Tu es un conseiller pédagogique FWB. Tu reformules une rétroaction pour la rendre plus activable, sans en changer le fond.

Contexte : ${niveauLabel}, ${typeLabel}, ${context.matiere ?? ''}.

Reformule pour que :
- L'élève sache exactement QUOI faire
- L'action soit centrée tâche/processus, pas personne
- Un critère de réussite soit visible
- Ce soit plus court et plus direct

${antiClaudisation}`
  }

  if (action === 'extract_corpus') {
    return `Tu es un conseiller pédagogique FWB. Tu analyses des documents scolaires (productions élèves, énoncés) pour en extraire les informations pédagogiques clés.
Règles absolues :
- Si un champ ne peut pas être extrait avec certitude, retourne une chaîne vide "" pour ce champ — jamais d'invention.
- Retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans balises markdown.
- Langue : français, registre professionnel enseignant.`
  }

  return `Tu es un conseiller pédagogique FWB. ${antiClaudisation}`
}

// ──────────────────────────────────────────────────────────
// Construction du message utilisateur selon l'action
// ──────────────────────────────────────────────────────────

function buildUserMessage(action, context) {
  if (action === 'retroaction') {
    return `Rédige une rétroaction activable avec ces informations :

Type : ${context.type_retroaction === 'production' ? 'Commentaire sur production' : context.type_retroaction === 'evaluation' ? "Commentaire d'évaluation" : 'Commentaire de bulletin'}
${context.eleve_code ? `Élève (code) : ${context.eleve_code}` : ''}
${context.production_type ? `Nature de la production : ${context.production_type}` : ''}

Points forts observés par l'enseignant :
${context.points_forts ?? 'Non précisés'}

Difficultés ou axes d'amélioration observés :
${context.difficultes ?? 'Non précisées'}

${context.type_obstacle ? `Type d'obstacle identifié (Brousseau) : ${context.type_obstacle}\nOriente l'action concrète selon la guidance fournie dans le system prompt.` : ''}
${context.infos_complementaires ? `Informations complémentaires :\n${context.infos_complementaires}` : ''}

Génère la rétroaction directement, sans en-tête.`
  }

  if (action === 'bulletin') {
    const historique = (context.retroactions_periode ?? [])
      .map((r, i) => `— Rétroaction ${i + 1} (${r.date}) : ${r.texte}`)
      .join('\n')

    return `Génère un commentaire de bulletin pour cet élève sur la période ${context.periode ?? ''}.

Historique des rétroactions de la période :
${historique || 'Aucune rétroaction enregistrée sur la période.'}

${context.bulletin_precedent ? `Commentaire du bulletin précédent (à ne pas répéter) :\n${context.bulletin_precedent}` : ''}

${context.note_personnelle ? `Note personnelle de l'enseignant à intégrer :\n${context.note_personnelle}` : ''}

Génère le commentaire directement.`
  }

  if (action === 'ameliorer') {
    return `Reformule cette rétroaction pour la rendre plus activable :

"${context.texte_original}"

${context.raison ? `Ce qui pose problème : ${context.raison}` : ''}

Donne directement la version améliorée, sans explication autour.`
  }

  if (action === 'extract_corpus') {
    const parts = []
    if (context.corpus_eleve?.trim()) {
      parts.push(`<production_eleve>\n${context.corpus_eleve.trim()}\n</production_eleve>`)
    }
    if (context.corpus_enonce?.trim()) {
      parts.push(`<enonce_enseignant>\n${context.corpus_enonce.trim()}\n</enonce_enseignant>`)
    }
    return `Analyse ces documents et retourne un objet JSON avec exactement ces 5 champs :
{
  "tache": "description courte de la tâche demandée à l'élève (1-2 phrases)",
  "points_forts": "ce qui est réussi dans la production (1-3 points, phrases courtes)",
  "points_faibles": "ce qui pose problème ou doit être amélioré (1-3 points, phrases courtes)",
  "niveau_suggere": "une valeur parmi : cycle2, cycle3, cycle4, lycee, post_bac — ou chaîne vide",
  "matiere_suggeree": "nom de la matière ou chaîne vide"
}

${parts.join('\n\n')}`
  }

  return context.prompt ?? ''
}
