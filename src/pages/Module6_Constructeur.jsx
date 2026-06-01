/**
 * MODULE 6 — Constructeur de rétroaction
 *
 * Trois modes selon le niveau de maîtrise :
 *   debutant     → conversation guidée, 80% généré / 20% personnalisé
 *   intermediaire → template semi-rempli avec suggestions
 *   expert        → checklist rapide + génération directe
 *
 * Références : Carless & Boud (2018), Nicol & Macfarlane-Dick (2006),
 *              hal-04621117, dumas-05324645
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  NIVEAUX, TYPES_ENSEIGNEMENT, TYPES_RETROACTION,
  NIVEAUX_MAITRISE, MATIERES
} from '../lib/constants'

// ── Appel API generate ─────────────────────────────────────
async function callGenerate(action, context) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, context }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
  return data.text
}

// ── Composant principal ────────────────────────────────────
export default function Module6_Constructeur() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [prefill, setPrefill] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const handoffId = params.get('handoff')
    if (!handoffId) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`/api/handoff-read?id=${handoffId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setPrefill(data) })
        .catch(() => {})
    })
  }, [location.search])

  // Mode selon profil enseignant (modifiable dans la session)
  const [mode, setMode] = useState(profile?.niveau_maitrise ?? 'debutant')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✨ Constructeur de rétroaction</h1>
          <p className="text-gray-500 text-sm mt-1">Rédiger, affiner et sauvegarder une rétroaction activable</p>
        </div>
        {/* Sélecteur de mode */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {NIVEAUX_MAITRISE.map(n => (
            <button key={n.value} onClick={() => setMode(n.value)}
              title={n.description}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === n.value ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'debutant'      && <ModeDebutant profile={profile} navigate={navigate} prefill={prefill} />}
      {mode === 'intermediaire' && <ModeIntermediaire profile={profile} navigate={navigate} prefill={prefill} />}
      {mode === 'expert'        && <ModeExpert profile={profile} navigate={navigate} prefill={prefill} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MODE DÉBUTANT — conversation guidée + 80/20
// ════════════════════════════════════════════════════════════
function ModeDebutant({ profile, navigate, prefill }) {
  const [step, setStep] = useState(prefill ? 3 : 1)
  const [ctx, setCtx] = useState({
    niveau: prefill?.niveau || profile?.niveau_enseignement || '',
    type_enseignement: profile?.type_enseignement ?? '',
    matiere: prefill?.matiere || profile?.matiere || '',
    type_retroaction: 'production',
    eleve_code: prefill?.eleve_code || '',
    production_type: '',
    points_forts: prefill?.points_forts || '',
    difficultes: prefill?.difficultes || '',
    infos_complementaires: prefill?.infos_complementaires || '',
    suivi_prevu: false,
    modalite_suivi: '',
  })
  const [generated, setGenerated] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [final, setFinal] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(k, v) { setCtx(p => ({ ...p, [k]: v })) }
  const [matiereSelectD, setMatiereSelectD] = useState(prefill?.matiere || profile?.matiere || '')

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const text = await callGenerate('retroaction', ctx)
      setGenerated(text)
      setFinal(text) // base de départ pour la zone finale
      setStep(4)
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  async function save() {
    setSaving(true)
    const texte_final = personalNote
      ? `${final}\n\n${personalNote}`
      : final

    const { error: err } = await supabase.from('retroactions').insert({
      ...ctx,
      texte_genere: generated,
      texte_final,
      note_personnelle: personalNote,
      mode_construction: 'debutant',
    })

    if (!err) {
      navigate('/suivi')
    } else {
      setError('Erreur lors de la sauvegarde.')
    }
    setSaving(false)
  }

  const STEPS = [
    { n: 1, label: 'Contexte' },
    { n: 2, label: 'Production' },
    { n: 3, label: "Ce que j'observe" },
    { n: 4, label: 'Finaliser' },
  ]

  return (
    <div className="space-y-4">
      {prefill && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800 mb-2">
          Données importées depuis CorpusActif — apprenant <strong>{prefill.eleve_code}</strong>
          {prefill.space_name && <>, espace <strong>{prefill.space_name}</strong></>}.
          Vérifiez et ajustez avant de générer.
        </div>
      )}
      {/* Barre de progression */}
      <div className="card py-3 px-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className={`flex items-center gap-2 ${step >= s.n ? 'text-brand-700' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.n ? 'bg-brand-600 text-white' :
                  step === s.n ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-400' :
                  'bg-gray-100 text-gray-400'
                }`}>{step > s.n ? '✓' : s.n}</div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-2 ${step > s.n ? 'bg-brand-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* ÉTAPE 1 — Contexte */}
      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Dans quel contexte travaillez-vous ?</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Niveau</label>
              <select className="input" value={ctx.niveau} onChange={e => update('niveau', e.target.value)}>
                <option value="">Choisir...</option>
                {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type d'enseignement</label>
              <select className="input" value={ctx.type_enseignement} onChange={e => update('type_enseignement', e.target.value)}>
                <option value="">Choisir...</option>
                {TYPES_ENSEIGNEMENT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Matière</label>
              <select className="input" value={matiereSelectD}
                onChange={e => {
                  setMatiereSelectD(e.target.value)
                  update('matiere', e.target.value !== 'Autre' ? e.target.value : '')
                }}>
                <option value="">Choisir...</option>
                {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {matiereSelectD === 'Autre' && (
                <input className="input mt-2" placeholder="Précisez la matière"
                  onChange={e => update('matiere', e.target.value)} />
              )}
            </div>
            <div>
              <label className="label">Type de rétroaction</label>
              <select className="input" value={ctx.type_retroaction} onChange={e => update('type_retroaction', e.target.value)}>
                {TYPES_RETROACTION.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Code élève (anonyme, optionnel)</label>
            <input className="input" placeholder="ex. EL-14-A ou initiales" value={ctx.eleve_code}
              onChange={e => update('eleve_code', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Aucun nom — sert uniquement à retrouver la rétroaction dans votre historique.</p>
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" disabled={!ctx.niveau || !ctx.type_enseignement || !ctx.matiere}
              onClick={() => setStep(2)}>
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 — Type de production */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Sur quelle production portait cette rétroaction ?</h2>

          <div>
            <label className="label">Nature de la production / de l'évaluation</label>
            <input className="input" placeholder="ex. texte argumentatif, calcul mental, découpe bouchère, exposé oral..."
              value={ctx.production_type} onChange={e => update('production_type', e.target.value)} />
          </div>

          <div>
            <label className="label">Suivi prévu après rétroaction ?</label>
            <div className="flex gap-3 mt-1">
              {[
                { v: false, l: 'Non prévu' },
                { v: true, l: 'Oui — révision planifiée' },
              ].map(o => (
                <label key={String(o.v)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                  ctx.suivi_prevu === o.v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'
                }`}>
                  <input type="radio" checked={ctx.suivi_prevu === o.v} onChange={() => update('suivi_prevu', o.v)}
                    className="accent-brand-600" />
                  <span className="text-sm">{o.l}</span>
                </label>
              ))}
            </div>
            {ctx.suivi_prevu && (
              <input className="input mt-2" placeholder="Modalité : en classe, devoir, révision guidée..."
                value={ctx.modalite_suivi} onChange={e => update('modalite_suivi', e.target.value)} />
            )}
          </div>

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}>← Retour</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — Observations */}
      {step === 3 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Ce que vous observez chez cet élève</h2>
          <p className="text-sm text-gray-500">
            Pas besoin de formuler parfaitement — notez ce que vous voyez.
            RetroActif construit la rétroaction à partir de vos observations.
          </p>

          <div>
            <label className="label">
              ✦ Points forts observés
              <span className="text-gray-400 font-normal ml-1">(centrez sur la tâche, pas la personne)</span>
            </label>
            <textarea className="input min-h-[90px] resize-y" rows={3}
              placeholder="ex. La structure du texte est claire. Les calculs intermédiaires sont montrés. Le geste de découpe est propre sur les 2 premiers morceaux."
              value={ctx.points_forts} onChange={e => update('points_forts', e.target.value)} />
          </div>

          <div>
            <label className="label">
              ◆ Difficultés ou axes d'amélioration
              <span className="text-gray-400 font-normal ml-1">(soyez précis)</span>
            </label>
            <textarea className="input min-h-[90px] resize-y" rows={3}
              placeholder="ex. Les arguments manquent d'exemples concrets. La table de 7 n'est pas maîtrisée. La pression sur le couteau n'est pas constante."
              value={ctx.difficultes} onChange={e => update('difficultes', e.target.value)} />
          </div>

          <div>
            <label className="label">Informations supplémentaires (optionnel)</label>
            <textarea className="input resize-y" rows={2}
              placeholder="ex. A tenté la méthode vue en cours. Progression visible par rapport à la semaine passée."
              value={ctx.infos_complementaires} onChange={e => update('infos_complementaires', e.target.value)} />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(2)}>← Retour</button>
            <button className="btn-accent" onClick={generate}
              disabled={generating || !ctx.points_forts || !ctx.difficultes}>
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Génération...
                </span>
              ) : '✨ Générer la rétroaction'}
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 4 — Finaliser (80/20) */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Zone 80% générée */}
          <div className="card border-l-4 border-brand-400 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Suggestion RetroActif</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Généré à partir de vos observations — à affiner selon votre connaissance de l'élève
                </p>
              </div>
              <span className="badge bg-brand-100 text-brand-700 text-xs">80% généré</span>
            </div>
            <textarea
              className="input min-h-[140px] resize-y text-sm"
              value={final}
              onChange={e => setFinal(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setGenerating(true)
                  setError('')
                  try {
                    const text = await callGenerate('retroaction', ctx)
                    setGenerated(text)
                    setFinal(text)
                  } catch (e) { setError(e.message) }
                  setGenerating(false)
                }}
                className="text-xs text-brand-600 hover:underline"
                disabled={generating}
              >
                {generating ? 'Régénération...' : '↻ Régénérer'}
              </button>
              <button
                onClick={async () => {
                  setGenerating(true)
                  try {
                    const text = await callGenerate('ameliorer', {
                      ...ctx, texte_original: final,
                      raison: 'Rendre plus direct et actionnable'
                    })
                    setFinal(text)
                  } catch(e) { setError(e.message) }
                  setGenerating(false)
                }}
                className="text-xs text-purple-600 hover:underline"
                disabled={generating}
              >
                ✦ Affiner
              </button>
            </div>
          </div>

          {/* Zone 20% personnalisé */}
          <div className="card border-l-4 border-accent-400 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Votre touche personnelle</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ce que vous seul savez : contexte familial, progression récente, encouragement ciblé...
                </p>
              </div>
              <span className="badge bg-accent-100 text-accent-600 text-xs">20% personnel</span>
            </div>
            <textarea
              className="input min-h-[80px] resize-y text-sm"
              placeholder="ex. Je sais que tu as travaillé dur cette semaine malgré les difficultés. La progression est visible."
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
            />
          </div>

          {/* Aperçu final */}
          {(final || personalNote) && (
            <div className="card bg-gray-50 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Aperçu de la rétroaction finale</h3>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border-l-2 border-gray-300 pl-3">
                {final}{personalNote && `\n\n${personalNote}`}
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(3)}>← Modifier les observations</button>
            <button className="btn-primary" onClick={save} disabled={saving || !final}>
              {saving ? 'Sauvegarde...' : '✓ Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MODE INTERMÉDIAIRE — template semi-rempli
// ════════════════════════════════════════════════════════════
function ModeIntermediaire({ profile, navigate, prefill }) {
  const [ctx, setCtx] = useState({
    niveau: prefill?.niveau || profile?.niveau_enseignement || '',
    type_enseignement: profile?.type_enseignement ?? '',
    matiere: prefill?.matiere || profile?.matiere || '',
    type_retroaction: 'production',
    eleve_code: prefill?.eleve_code || '',
    production_type: '',
    points_forts: prefill?.points_forts || '',
    difficultes: prefill?.difficultes || '',
    suivi_prevu: false,
  })
  const [segments, setSegments] = useState({
    point_fort: '',
    axe_amelioration: '',
    action_concrete: '',
    critere_reussite: '',
  })
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filled, setFilled] = useState(false)

  function upCtx(k, v) { setCtx(p => ({ ...p, [k]: v })) }
  function upSeg(k, v) { setSegments(p => ({ ...p, [k]: v })) }
  const [matiereSelectI, setMatiereSelectI] = useState(prefill?.matiere || profile?.matiere || '')

  async function fillTemplate() {
    if (!ctx.points_forts && !ctx.difficultes) return
    setGenerating(true)
    setError('')
    try {
      // Génère chaque segment séparément pour plus de contrôle
      const text = await callGenerate('retroaction', ctx)
      // Coupe le texte généré en segments (heuristique simple)
      const lines = text.split('\n').filter(l => l.trim())
      setSegments({
        point_fort: lines[0] ?? '',
        axe_amelioration: lines[1] ?? '',
        action_concrete: lines[2] ?? '',
        critere_reussite: lines[3] ?? '',
      })
      setFilled(true)
    } catch(e) { setError(e.message) }
    setGenerating(false)
  }

  const texte_final = [
    segments.point_fort,
    segments.axe_amelioration,
    segments.action_concrete,
    segments.critere_reussite,
  ].filter(Boolean).join(' ')

  async function save() {
    setSaving(true)
    const { error: err } = await supabase.from('retroactions').insert({
      ...ctx,
      texte_final,
      mode_construction: 'intermediaire',
    })
    if (!err) navigate('/suivi')
    else setError('Erreur lors de la sauvegarde.')
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {prefill && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800 mb-2">
          Données importées depuis CorpusActif — apprenant <strong>{prefill.eleve_code}</strong>
          {prefill.space_name && <>, espace <strong>{prefill.space_name}</strong></>}.
          Vérifiez et ajustez avant de générer.
        </div>
      )}
      {/* Contexte rapide */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800">Contexte</h2>
        <div className="grid grid-cols-3 gap-3">
          <select className="input text-sm" value={ctx.niveau} onChange={e => upCtx('niveau', e.target.value)}>
            <option value="">Niveau...</option>
            {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
          <select className="input text-sm" value={matiereSelectI}
            onChange={e => {
              setMatiereSelectI(e.target.value)
              upCtx('matiere', e.target.value !== 'Autre' ? e.target.value : '')
            }}>
            <option value="">Matière...</option>
            {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {matiereSelectI === 'Autre' && (
            <input className="input text-sm" placeholder="Précisez..."
              onChange={e => upCtx('matiere', e.target.value)} />
          )}
          <select className="input text-sm" value={ctx.type_retroaction} onChange={e => upCtx('type_retroaction', e.target.value)}>
            {TYPES_RETROACTION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className="input text-sm" placeholder="Code élève (optionnel)"
            value={ctx.eleve_code} onChange={e => upCtx('eleve_code', e.target.value)} />
          <input className="input text-sm" placeholder="Nature de la production"
            value={ctx.production_type} onChange={e => upCtx('production_type', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <textarea className="input text-sm resize-none" rows={2} placeholder="Points forts observés..."
            value={ctx.points_forts} onChange={e => upCtx('points_forts', e.target.value)} />
          <textarea className="input text-sm resize-none" rows={2} placeholder="Difficultés observées..."
            value={ctx.difficultes} onChange={e => upCtx('difficultes', e.target.value)} />
        </div>
        <button className="btn-accent text-sm" onClick={fillTemplate} disabled={generating}>
          {generating ? 'Génération...' : '✨ Pré-remplir le template'}
        </button>
      </div>

      {/* Template 4 segments */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Votre rétroaction par segments</h2>
        {[
          { key: 'point_fort', label: '✦ Point fort (centré tâche/processus)', ph: 'La stratégie utilisée pour... est efficace.' },
          { key: 'axe_amelioration', label: '◆ Axe d\'amélioration précis', ph: 'Dans le paragraphe 2, l\'argument manque d\'exemple...' },
          { key: 'action_concrete', label: '→ Action concrète à réaliser', ph: 'Reprends la partie X et ajoute...' },
          { key: 'critere_reussite', label: '✓ Critère de réussite vérifiable', ph: 'Critère : chaque argument contient au moins...' },
        ].map(s => (
          <div key={s.key}>
            <label className="label text-xs">{s.label}</label>
            <textarea className="input text-sm resize-none" rows={2}
              placeholder={s.ph}
              value={segments[s.key]}
              onChange={e => upSeg(s.key, e.target.value)} />
          </div>
        ))}
      </div>

      {/* Aperçu */}
      {texte_final && (
        <div className="card bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Aperçu</h3>
          <p className="text-sm text-gray-800 leading-relaxed">{texte_final}</p>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving || !texte_final}>
          {saving ? 'Sauvegarde...' : '✓ Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MODE EXPERT — checklist + génération directe
// ════════════════════════════════════════════════════════════
const CHECKLIST = [
  { id: 'tache', label: 'Centré sur la tâche ou le processus (pas la personne)' },
  { id: 'point_fort', label: 'Point fort identifié' },
  { id: 'quoi', label: "L'élève sait QUOI améliorer exactement" },
  { id: 'comment', label: "L'élève sait COMMENT le faire" },
  { id: 'critere', label: 'Critère de réussite vérifiable présent' },
  { id: 'suivi', label: 'Suivi planifié (révision, dialogue...)' },
]

function ModeExpert({ profile, navigate, prefill }) {
  const [ctx, setCtx] = useState({
    niveau: prefill?.niveau || profile?.niveau_enseignement || '',
    type_enseignement: profile?.type_enseignement ?? '',
    matiere: prefill?.matiere || profile?.matiere || '',
    type_retroaction: 'production',
    eleve_code: prefill?.eleve_code || '',
    suivi_prevu: false,
  })
  const [texte, setTexte] = useState('')
  const [checks, setChecks] = useState({})
  const [ameliore, setAmeliore] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [matiereSelectE, setMatiereSelectE] = useState(prefill?.matiere || profile?.matiere || '')
  const score = CHECKLIST.filter(c => checks[c.id]).length
  const allGreen = score === CHECKLIST.length

  function toggleCheck(id) {
    setChecks(p => ({ ...p, [id]: !p[id] }))
  }

  async function improve() {
    if (!texte) return
    setGenerating(true)
    setError('')
    const manquants = CHECKLIST.filter(c => !checks[c.id]).map(c => c.label).join(', ')
    try {
      const text = await callGenerate('ameliorer', {
        ...ctx,
        texte_original: texte,
        raison: manquants ? `Manquants : ${manquants}` : 'Affiner et rendre plus direct',
      })
      setAmeliore(text)
    } catch(e) { setError(e.message) }
    setGenerating(false)
  }

  async function save() {
    setSaving(true)
    const { error: err } = await supabase.from('retroactions').insert({
      ...ctx,
      texte_final: ameliore || texte,
      texte_original: texte,
      mode_construction: 'expert',
      checklist: checks,
    })
    if (!err) navigate('/suivi')
    else setError('Erreur lors de la sauvegarde.')
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {prefill && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800 mb-2">
          Données importées depuis CorpusActif — apprenant <strong>{prefill.eleve_code}</strong>
          {prefill.space_name && <>, espace <strong>{prefill.space_name}</strong></>}.
          Vérifiez et ajustez avant de générer.
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {/* Colonne gauche — saisie */}
        <div className="space-y-3">
          <div className="card space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select className="input text-sm" value={ctx.niveau} onChange={e => setCtx(p => ({...p, niveau: e.target.value}))}>
                <option value="">Niveau...</option>
                {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
              <select className="input text-sm" value={matiereSelectE}
                onChange={e => {
                  setMatiereSelectE(e.target.value)
                  setCtx(p => ({...p, matiere: e.target.value !== 'Autre' ? e.target.value : ''}))
                }}>
                <option value="">Matière...</option>
                {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {matiereSelectE === 'Autre' && (
                <input className="input text-sm" placeholder="Précisez..."
                  onChange={e => setCtx(p => ({...p, matiere: e.target.value}))} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="input text-sm" value={ctx.type_retroaction} onChange={e => setCtx(p => ({...p, type_retroaction: e.target.value}))}>
                {TYPES_RETROACTION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input className="input text-sm" placeholder="Code élève"
                value={ctx.eleve_code} onChange={e => setCtx(p => ({...p, eleve_code: e.target.value}))} />
            </div>
          </div>

          <div className="card">
            <label className="label">Votre rétroaction</label>
            <textarea className="input min-h-[180px] resize-y text-sm"
              placeholder="Rédigez directement votre rétroaction..."
              value={texte} onChange={e => setTexte(e.target.value)} />
          </div>
        </div>

        {/* Colonne droite — checklist */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Checklist d'actionnabilité</h3>
            <span className={`badge ${allGreen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {score}/{CHECKLIST.length}
            </span>
          </div>

          <div className="space-y-2">
            {CHECKLIST.map(c => (
              <label key={c.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${
                  checks[c.id] ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                <input type="checkbox" checked={!!checks[c.id]} onChange={() => toggleCheck(c.id)}
                  className="mt-0.5 accent-green-600" />
                <span className={`text-xs ${checks[c.id] ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                  {c.label}
                </span>
              </label>
            ))}
          </div>

          {!allGreen && texte && (
            <button className="btn-secondary text-sm w-full" onClick={improve} disabled={generating}>
              {generating ? 'Amélioration...' : '✦ Améliorer les points manquants'}
            </button>
          )}
        </div>
      </div>

      {/* Résultat amélioré */}
      {ameliore && (
        <div className="card border-l-4 border-brand-400">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Version améliorée</h3>
            <button onClick={() => { setTexte(ameliore); setAmeliore('') }}
              className="text-xs text-brand-600 hover:underline">
              Utiliser cette version
            </button>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{ameliore}</p>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving || !texte}>
          {saving ? 'Sauvegarde...' : '✓ Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
