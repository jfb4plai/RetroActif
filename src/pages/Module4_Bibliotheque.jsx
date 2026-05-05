/**
 * MODULE 4 — Bibliothèque d'exemples
 *
 * Exemples pré-remplis par niveau (fondamental, secondaire inf/2e/3e, CEFA)
 * et type d'enseignement (général, technique, qualifiant, professionnel).
 *
 * Enrichie progressivement par les propres rétroactions de l'enseignant
 * (style et contexte personnalisés).
 *
 * Références : Black et al. (2004), Kluger & DeNisi (1996), Sadler (1989)
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TYPES_RETROACTION } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'

// ── Exemples pré-chargés ──────────────────────────────────
const EXEMPLES_PRECHARGES = [
  // FONDAMENTAL
  {
    id: 'pre-1', niveau: 'fondamental', type_enseignement: 'general', matiere: 'Français',
    type_retroaction: 'production', contexte: 'Texte narratif, 8 ans',
    mauvais: 'Tu dois faire des efforts.',
    bon: 'Ton histoire a un début et une fin clairs — bravo. Dans ta phrase 3, ajoute ce que ressent le personnage : "Le loup avait peur car...". Critère : chaque personnage a au moins une émotion mentionnée.',
    pourquoi: 'Centré tâche + point fort + action précise + critère vérifiable',
    source: 'Black et al. (2004) — réel, hors corpus RISS',
  },
  {
    id: 'pre-2', niveau: 'fondamental', type_enseignement: 'general', matiere: 'Mathématiques',
    type_retroaction: 'evaluation', contexte: 'Table de multiplication, 9 ans',
    mauvais: 'Bon travail ! Continue comme ça.',
    bon: 'Ta stratégie de dessiner des groupes fonctionne. Pour la table de 7 : compte par 7 à voix haute en utilisant tes doigts. Fais les 5 exercices marqués en rouge. Critère : 5/5 sans dessin.',
    pourquoi: 'Point fort sur le processus + méthode explicitée + critère précis',
    source: 'Kluger & DeNisi (1996) — réel, hors corpus RISS',
  },
  // SECONDAIRE INFÉRIEUR
  {
    id: 'pre-3', niveau: 'secondaire_inf', type_enseignement: 'general', matiere: 'Français',
    type_retroaction: 'evaluation', contexte: 'Texte argumentatif, 13 ans',
    mauvais: 'Ton argumentation manque de précision.',
    bon: 'Ton argument principal (par. 2) est solide. Dans le par. 3, ton exemple est trop vague : remplace-le par un fait précis (chiffre, événement daté, source nommée). Critère : chaque argument contient au moins un exemple vérifiable.',
    pourquoi: 'Localisation précise + transformation diagnostic → action + critère',
    source: 'Sadler (1989) — réel, hors corpus RISS ; hal-04621117 (RISS ✓)',
  },
  {
    id: 'pre-4', niveau: 'secondaire_inf', type_enseignement: 'general', matiere: 'Mathématiques',
    type_retroaction: 'production', contexte: 'Équations du 1er degré, 12 ans',
    mauvais: 'Résultats incorrects. Revoir la méthode.',
    bon: 'Tes premières étapes sont correctes (isolation de x). À l\'étape 3, tu as additionné des deux côtés au lieu de soustraire. Reprends l\'exercice 4 : vérifie chaque étape avec la règle "même opération des deux côtés". Critère : la vérification (remplacer x) donne une égalité vraie.',
    pourquoi: 'Localise l\'erreur précise + rappelle la règle + critère d\'auto-vérification',
    source: 'Nicol & Macfarlane-Dick (2006) — réel, hors corpus RISS',
  },
  {
    id: 'pre-5', niveau: 'secondaire_inf', type_enseignement: 'general', matiere: 'Sciences',
    type_retroaction: 'bulletin', contexte: '1er trimestre, 13 ans',
    mauvais: 'Résultats en progrès. Doit continuer à travailler.',
    bon: 'Solide compréhension des concepts (observation directe et hypothèses bien formulées). La communication écrite des résultats reste à développer : structurer les réponses en 3 parties (observation / explication / conclusion). Un accompagnement ciblé est prévu au 2e trimestre.',
    pourquoi: 'Trajectoire visible + force concrète + axe précis + action enseignant annoncée',
    source: 'hal-04621117, Soubre et al. (2023) — RISS ✓',
  },
  // SECONDAIRE 2e DEGRÉ — GÉNÉRAL
  {
    id: 'pre-6', niveau: 'secondaire_2', type_enseignement: 'general', matiere: 'Histoire',
    type_retroaction: 'evaluation', contexte: 'Analyse de document, 15 ans',
    mauvais: 'Analyse superficielle. Tu peux faire mieux.',
    bon: 'L\'identification du contexte historique est exacte. L\'analyse de l\'intention de l\'auteur est absente : qui a produit ce document, pour qui, dans quel but ? Reprends la grille d\'analyse distribuée en cours (rubrique "source") et complète la partie manquante. Critère : 3 éléments sur la source identifiés.',
    pourquoi: 'Critique épistémologique + outil concret fourni + critère mesurable',
    source: 'Nicol (2021) — réel, hors corpus RISS',
  },
  {
    id: 'pre-7', niveau: 'secondaire_2', type_enseignement: 'general', matiere: 'Anglais',
    type_retroaction: 'production', contexte: 'Production écrite, 14 ans',
    mauvais: 'Good job ! Watch your grammar.',
    bon: 'Your use of connectors (however, therefore) is accurate and improves the flow of your text. In paragraph 2, three verb tenses are incorrect (simple past instead of present perfect). Revise using the grammar table (p. 45) and correct those three sentences. Criterion: all three sentences use the present perfect correctly.',
    pourquoi: 'Localisation précise + ressource fournie + critère',
    source: 'Sadler (1989) — réel, hors corpus RISS',
  },
  // SECONDAIRE 2e DEGRÉ — TECHNIQUE/QUALIFIANT
  {
    id: 'pre-8', niveau: 'secondaire_2', type_enseignement: 'qualifiant', matiere: 'Électricité',
    type_retroaction: 'evaluation', contexte: 'Schéma électrique, 15 ans',
    mauvais: 'Le schéma est incomplet.',
    bon: 'Le circuit principal est bien tracé (phases et neutre corrects). La mise à la terre est absente sur les prises 2 et 3 — c\'est une erreur de sécurité critique. Reprends la fiche technique p. 12 et complète les deux prises avant la remise définitive. Critère : mise à la terre visible sur chaque prise.',
    pourquoi: 'Valorise ce qui est correct + nomme l\'erreur précise + enjeu de sécurité + critère',
    source: 'Nicol & Macfarlane-Dick (2006) — réel, hors corpus RISS',
  },
  {
    id: 'pre-9', niveau: 'secondaire_2', type_enseignement: 'qualifiant', matiere: 'Boucherie',
    type_retroaction: 'production', contexte: 'Découpe, 15 ans',
    mauvais: 'La découpe n\'est pas propre.',
    bon: 'Ta position de lame est bonne (angle correct). La pression n\'est pas constante : tu alternes entre pousser et tirer — ce qui donne des surfaces irrégulières. Refais les tranches 4 et 5 en appliquant une pression continue, sans mouvement de scie. Critère : 3 tranches consécutives d\'épaisseur uniforme (mesure au pied à coulisse).',
    pourquoi: 'Observation précise du geste + correction technique + critère mesurable',
    source: 'dumas-05324645, Altinsoy (2025) — RISS ✓',
  },
  // SECONDAIRE 3e DEGRÉ
  {
    id: 'pre-10', niveau: 'secondaire_3', type_enseignement: 'general', matiere: 'Français',
    type_retroaction: 'evaluation', contexte: 'Dissertation, 17 ans',
    mauvais: 'Bonne dissertation mais manque de nuances.',
    bon: 'L\'articulation thèse-antithèse est maîtrisée. La synthèse (partie III) ne dépasse pas la juxtaposition des deux parties : où est votre position argumentée personnelle ? Reformulez la synthèse en répondant à : "En quoi ces deux perspectives me permettent-elles de dire que...". Critère : la synthèse contient votre propre prise de position avec un argument qui n\'était pas dans les deux premières parties.',
    pourquoi: 'Niveau 3e degré : exige une prise de position + critère de dépassement des parties',
    source: 'Nicol (2021) — réel, hors corpus RISS',
  },
  {
    id: 'pre-11', niveau: 'secondaire_3', type_enseignement: 'technique', matiere: 'Sciences économiques',
    type_retroaction: 'bulletin', contexte: '2e trimestre, 17 ans',
    mauvais: 'Élève sérieux, bons résultats. Continuez ainsi.',
    bon: 'Maîtrise solide de l\'analyse macro-économique (résultats réguliers). La lecture critique de sources économiques contradictoires reste à consolider — compétence indispensable pour la suite du parcours. Un travail spécifique sur ce point est prévu au 3e trimestre (analyse de rapports contradictoires en groupes). Progrès tangible par rapport au 1er trimestre sur la construction d\'arguments chiffrés.',
    pourquoi: 'Progression entre trimestres + axe précis + action enseignant annoncée',
    source: 'hal-04621117, Soubre et al. (2023) — RISS ✓',
  },
  // CEFA
  {
    id: 'pre-12', niveau: 'cefa', type_enseignement: 'cefa', matiere: 'Soins à la personne',
    type_retroaction: 'evaluation', contexte: 'Stage, 18 ans',
    mauvais: 'Bon comportement en stage.',
    bon: 'Initiative observée lors de l\'accueil d\'un résident en détresse (compétence C3 — communication adaptée). La rédaction des transmissions écrites reste à améliorer : vocabulaire médical encore hésitant. Avant le prochain stage, travail ciblé sur les abréviations et le vocabulaire SBAR. Critère : fiche de transmissions complète et lisible à la fin de chaque poste.',
    pourquoi: 'Contexte CEFA/stage + compétence nommée précisément + plan de formation',
    source: 'Zimmerman (2002) — réel, hors corpus RISS ; dumas-05324645 (RISS ✓)',
  },
]

export default function Module4_Bibliotheque() {
  const { profile } = useAuth()
  const [filterNiveau, setFilterNiveau] = useState(profile?.niveau_enseignement ?? '')
  const [filterType, setFilterType] = useState('')
  const [filterMatiere, setFilterMatiere] = useState('')
  const [source, setSource] = useState('tous') // 'tous' | 'precharges' | 'mes_retros'
  const [mesRetros, setMesRetros] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (source === 'mes_retros' || source === 'tous') loadMesRetros()
  }, [source])

  async function loadMesRetros() {
    setLoading(true)
    const { data } = await supabase
      .from('retroactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setMesRetros(data ?? [])
    setLoading(false)
  }

  const NIVEAUX_LABELS = {
    fondamental: 'Fondamental',
    secondaire_inf: 'Sec. inférieur',
    secondaire_2: 'Sec. 2e degré',
    secondaire_3: 'Sec. 3e degré',
    cefa: 'CEFA',
  }

  // Filtre des exemples pré-chargés
  const exemplesFiltres = EXEMPLES_PRECHARGES.filter(e => {
    return (
      (!filterNiveau || e.niveau === filterNiveau) &&
      (!filterType || e.type_retroaction === filterType) &&
      (!filterMatiere || e.matiere.toLowerCase().includes(filterMatiere.toLowerCase()))
    )
  })

  // Filtre mes rétroactions
  const mesRetrosFiltrees = mesRetros.filter(r => {
    return (
      (!filterNiveau || r.niveau === filterNiveau) &&
      (!filterType || r.type_retroaction === filterType) &&
      (!filterMatiere || r.matiere?.toLowerCase().includes(filterMatiere.toLowerCase()))
    )
  })

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const typeIcon = v => TYPES_RETROACTION.find(t => t.value === v)?.icon ?? '•'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📚 Bibliothèque d'exemples</h1>
        <p className="text-gray-500 text-sm mt-1">Rétroactions activables par niveau, matière et type d'enseignement</p>
      </div>

      {/* Filtres */}
      <div className="card space-y-3">
        <div className="flex gap-2 flex-wrap">
          {/* Source */}
          {[
            { k: 'tous', l: 'Tout voir' },
            { k: 'precharges', l: 'Exemples RetroActif' },
            { k: 'mes_retros', l: 'Mes rétroactions' },
          ].map(s => (
            <button key={s.k} onClick={() => setSource(s.k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                source === s.k ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s.l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select className="input text-sm" value={filterNiveau} onChange={e => setFilterNiveau(e.target.value)}>
            <option value="">Tous les niveaux</option>
            {Object.entries(NIVEAUX_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {TYPES_RETROACTION.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
          <input className="input text-sm" placeholder="Matière..." value={filterMatiere}
            onChange={e => setFilterMatiere(e.target.value)} />
        </div>
      </div>

      {/* Exemples pré-chargés */}
      {(source === 'tous' || source === 'precharges') && (
        <div className="space-y-3">
          {source !== 'mes_retros' && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Exemples RetroActif ({exemplesFiltres.length})
            </h2>
          )}
          {exemplesFiltres.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucun exemple pour ces filtres.</p>
          ) : (
            exemplesFiltres.map(e => (
              <ExempleCard key={e.id} exemple={e} selected={selected?.id === e.id}
                onSelect={() => setSelected(selected?.id === e.id ? null : e)}
                onCopy={() => copyToClipboard(e.bon, e.id)}
                copied={copied === e.id}
                niveauLabel={NIVEAUX_LABELS[e.niveau]}
                typeIcon={typeIcon(e.type_retroaction)} />
            ))
          )}
        </div>
      )}

      {/* Mes rétroactions */}
      {(source === 'tous' || source === 'mes_retros') && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Mes rétroactions ({mesRetrosFiltrees.length})
          </h2>
          {loading ? (
            <div className="card animate-pulse h-20" />
          ) : mesRetrosFiltrees.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              {mesRetros.length === 0
                ? 'Aucune rétroaction sauvegardée. Commencez par en créer une.'
                : 'Aucune rétroaction pour ces filtres.'}
            </p>
          ) : (
            mesRetrosFiltrees.map(r => (
              <div key={r.id} className="card py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 flex-wrap mb-1">
                      <span className="badge bg-purple-100 text-purple-700">Ma rétroaction</span>
                      {r.matiere && <span className="badge bg-blue-50 text-blue-700">{r.matiere}</span>}
                      {r.niveau && <span className="badge bg-gray-100 text-gray-600">{NIVEAUX_LABELS[r.niveau]}</span>}
                      <span className="badge bg-gray-100 text-gray-600">{typeIcon(r.type_retroaction)}</span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-3 leading-relaxed">{r.texte_final}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleDateString('fr-BE')}
                    </p>
                  </div>
                  <button onClick={() => copyToClipboard(r.texte_final, r.id)}
                    className="text-xs text-brand-600 hover:text-brand-800 whitespace-nowrap">
                    {copied === r.id ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ExempleCard({ exemple: e, selected, onSelect, onCopy, copied, niveauLabel, typeIcon }) {
  return (
    <div className={`card transition-all ${selected ? 'ring-2 ring-brand-400' : ''}`}>
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={onSelect}>
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 flex-wrap mb-2">
            <span className="badge bg-brand-100 text-brand-700">{niveauLabel}</span>
            {e.type_enseignement !== 'general' && (
              <span className="badge bg-purple-100 text-purple-700">{e.type_enseignement}</span>
            )}
            <span className="badge bg-blue-50 text-blue-700">{e.matiere}</span>
            <span className="badge bg-gray-100 text-gray-600">{typeIcon}</span>
            {e.contexte && <span className="text-xs text-gray-400 italic">{e.contexte}</span>}
          </div>

          {/* Toujours visible : la bonne rétroaction */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500 text-sm mt-0.5">✓</span>
              <p className="text-sm text-gray-800 leading-relaxed">{e.bon}</p>
            </div>
          </div>

          {/* Dépliable : la mauvaise + explication */}
          {selected && (
            <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-sm mt-0.5">✗</span>
                <p className="text-sm text-gray-500 italic line-through leading-relaxed">{e.mauvais}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
                <span className="font-medium">Pourquoi la différence : </span>{e.pourquoi}
              </div>
              <p className="text-xs text-gray-400">Source : {e.source}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          <button onClick={e2 => { e2.stopPropagation(); onCopy() }}
            className="text-xs text-brand-600 hover:text-brand-800 whitespace-nowrap">
            {copied ? '✓ Copié' : 'Copier'}
          </button>
          <span className="text-gray-300 text-xs">{selected ? '▲' : '▼'}</span>
        </div>
      </div>
    </div>
  )
}
