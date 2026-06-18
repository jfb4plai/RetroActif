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

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  NIVEAUX, TYPES_ENSEIGNEMENT, TYPES_RETROACTION,
  NIVEAUX_MAITRISE, MATIERES, TYPES_OBSTACLE
} from '../lib/constants'
import { extractFile } from '../lib/extractFile'

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
  const [screen, setScreen] = useState('entry')

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
        .then(data => {
          if (data) {
            setPrefill(data)
            setScreen('main')
          }
        })
        .catch(() => {})
    })
  }, [location.search])

  // Mode selon profil enseignant (modifiable dans la session)
  const [mode, setMode] = useState(profile?.niveau_maitrise ?? 'debutant')

  const handleCorpusPrefill = (extracted) => {
    setPrefill(extracted)
    setScreen('main')
  }

  if (screen === 'entry') {
    return (
      <ScreenEntry
        onManual={() => setScreen('main')}
        onCorpus={() => setScreen('corpus')}
      />
    )
  }
  if (screen === 'corpus') {
    return (
      <ScreenCorpus
        onBack={() => setScreen('entry')}
        onExtracted={handleCorpusPrefill}
      />
    )
  }

  // screen === 'main' — existing flow unchanged
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
                mode === n.value ? 'bg-white shadow text-jfb-rose' : 'text-gray-500 hover:text-gray-700'
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
// BANDEAU HANDOFF — affiché dans les 3 modes si prefill présent
// ════════════════════════════════════════════════════════════
function HandoffBanner({ prefill }) {
  const [open, setOpen] = useState(false)
  if (!prefill) return null
  return (
    <div className="rounded-xl border border-teal-300 bg-teal-50 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-teal-600 text-lg mt-0.5">🔗</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-teal-800">
            Importé depuis CorpusActif
          </p>
          <p className="text-xs text-teal-700 mt-0.5">
            Apprenant <strong>{prefill.eleve_code}</strong>
            {prefill.space_name && <> — espace <strong>{prefill.space_name}</strong></>}
            {prefill.matiere && <> · {prefill.matiere}</>}
            {prefill.niveau && <> · {prefill.niveau}</>}
          </p>
          <p className="text-xs text-teal-600 mt-1 italic">
            L'IA a analysé la conversation socratique de cet apprenant. Les champs ci-dessous sont pré-remplis — vérifiez et ajustez avant de générer.
          </p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 text-xs text-teal-600 hover:text-teal-800 underline mt-0.5"
        >
          {open ? 'Masquer' : 'Voir le résumé'}
        </button>
      </div>
      {open && (
        <div className="border-t border-teal-200 px-4 py-3 space-y-2 bg-white">
          {prefill.points_forts && (
            <div>
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-0.5">Points forts identifiés</p>
              <p className="text-sm text-gray-700 leading-relaxed">{prefill.points_forts}</p>
            </div>
          )}
          {prefill.difficultes && (
            <div>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-0.5">Difficultés repérées</p>
              <p className="text-sm text-gray-700 leading-relaxed">{prefill.difficultes}</p>
            </div>
          )}
          {prefill.infos_complementaires && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Synthèse</p>
              <p className="text-sm text-gray-700 leading-relaxed">{prefill.infos_complementaires}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ÉCRAN ENTRY — choix du mode d'entrée
// ════════════════════════════════════════════════════════════
function ScreenEntry({ onManual, onCorpus }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Constructeur de rétroaction</h1>
      <p className="text-gray-500 mb-8">Comment souhaitez-vous commencer ?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onCorpus}
          className="flex flex-col gap-2 p-6 rounded-xl border-2 border-teal-500 bg-teal-50 text-left hover:bg-teal-100 transition"
        >
          <span className="text-2xl">📄</span>
          <span className="font-semibold text-gray-900">Importer des documents</span>
          <span className="text-sm text-gray-600">
            Déposez la production de l'élève et/ou l'énoncé. L'IA pré-remplit le formulaire à partir de vos documents.
          </span>
        </button>
        <button
          onClick={onManual}
          className="flex flex-col gap-2 p-6 rounded-xl border-2 border-gray-200 bg-white text-left hover:bg-gray-50 transition"
        >
          <span className="text-2xl">✏️</span>
          <span className="font-semibold text-gray-900">Saisir manuellement</span>
          <span className="text-sm text-gray-600">
            Remplissez le formulaire étape par étape, sans document.
          </span>
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ÉCRAN CORPUS — import de documents
// ════════════════════════════════════════════════════════════
function ScreenCorpus({ onBack, onExtracted }) {
  const [eleveText, setEleveText] = useState('')
  const [eleveFiles, setEleveFiles] = useState([])
  const [enoncéText, setEnoncéText] = useState('')
  const [enoncéFiles, setEnoncéFiles] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [fileErrors, setFileErrors] = useState({ eleve: '', enonce: '' })
  const extractCache = useRef(new Map())

  const hasContent = eleveText.trim() || eleveFiles.length > 0 || enoncéText.trim() || enoncéFiles.length > 0

  const extractCached = async (file) => {
    if (extractCache.current.has(file)) return extractCache.current.get(file)
    const result = await extractFile(file)
    extractCache.current.set(file, result)
    return result
  }

  const handleFileAdd = async (files, zone) => {
    const setter = zone === 'eleve' ? setEleveFiles : setEnoncéFiles
    const errSetter = (msg) => setFileErrors(prev => ({ ...prev, [zone]: msg }))
    errSetter('')
    for (const file of files) {
      try {
        await extractCached(file)
        setter(prev => [...prev, file])
      } catch (e) {
        errSetter(e.message)
      }
    }
  }

  const handleExtract = async () => {
    setExtracting(true)
    setError('')
    try {
      const extractTexts = async (files) => {
        const texts = []
        for (const f of files) {
          const { text } = await extractCached(f)
          if (text?.trim()) texts.push(text.trim())
        }
        return texts.join('\n\n')
      }

      const [eleveExtracted, enoncéExtracted] = await Promise.all([
        extractTexts(eleveFiles),
        extractTexts(enoncéFiles),
      ])

      const corpus_eleve = [eleveText.trim(), eleveExtracted].filter(Boolean).join('\n\n')
      const corpus_enonce = [enoncéText.trim(), enoncéExtracted].filter(Boolean).join('\n\n')

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_corpus', context: { corpus_eleve, corpus_enonce } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      let extracted
      try {
        extracted = JSON.parse(data.text)
      } catch {
        throw new Error('Réponse IA invalide — réessayez.')
      }

      onExtracted({
        infos_complementaires: extracted.tache ?? '',
        points_forts: extracted.points_forts ?? '',
        difficultes: extracted.points_faibles ?? '',
        niveau: extracted.niveau_suggere ?? '',
        matiere: extracted.matiere_suggeree ?? '',
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button className="text-sm text-gray-500 hover:text-gray-800 mb-6" onClick={onBack}>← Retour</button>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Importer des documents</h1>

      <div className="space-y-6">
        <CorpusZone
          label="Production de l'élève"
          hint="Copie, exercice rendu, production écrite ou orale"
          text={eleveText}
          onTextChange={setEleveText}
          files={eleveFiles}
          onFilesAdd={(f) => handleFileAdd(f, 'eleve')}
          onFileRemove={(i) => setEleveFiles(prev => prev.filter((_, idx) => idx !== i))}
          fileError={fileErrors.eleve}
        />
        <CorpusZone
          label="Énoncé / activité"
          hint="Ce que vous avez donné aux élèves"
          text={enoncéText}
          onTextChange={setEnoncéText}
          files={enoncéFiles}
          onFilesAdd={(f) => handleFileAdd(f, 'enonce')}
          onFileRemove={(i) => setEnoncéFiles(prev => prev.filter((_, idx) => idx !== i))}
          fileError={fileErrors.enonce}
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex justify-end">
        <button
          className="btn-primary"
          disabled={!hasContent || extracting}
          onClick={handleExtract}
        >
          {extracting ? 'Extraction en cours…' : 'Extraire →'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// COMPOSANT CORPUS ZONE — zone de dépôt fichiers + texte
// ════════════════════════════════════════════════════════════
function CorpusZone({ label, hint, text, onTextChange, files, onFilesAdd, onFileRemove, fileError }) {
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    onFilesAdd(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 transition"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-sm text-gray-500">Glissez vos fichiers ici ou cliquez</p>
        <p className="text-xs text-gray-400 mt-1">.pdf · .docx · .odt · .txt · .jpg · .png</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.odt,.txt,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => onFilesAdd(Array.from(e.target.files))}
        />
      </div>

      {fileError && <p className="text-xs text-red-600">{fileError}</p>}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded px-3 py-1">
              <span className="truncate">{f.name}</span>
              <button className="text-gray-400 hover:text-red-500 ml-2" onClick={() => onFileRemove(i)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        className="input w-full min-h-[80px] resize-y text-sm"
        placeholder="ou collez le texte ici…"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// COMPOSANT PARTAGÉ — Sélecteur de type d'obstacle (Brousseau)
// Optionnel dans les 3 modes. Affine l'action concrète générée.
// ════════════════════════════════════════════════════════════
function ObstacleSelector({ value, onChange }) {
  return (
    <div>
      <label className="label">
        Type d'obstacle identifié
        <span className="text-gray-400 font-normal ml-1">(optionnel — affine l'action concrète générée)</span>
      </label>
      <div className="space-y-1.5 mt-1">
        {TYPES_OBSTACLE.map(o => (
          <label key={o.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              value === o.value
                ? 'border-jfb-rose bg-jfb-beige'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}>
            <input
              type="radio"
              name="type_obstacle"
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${value === o.value ? 'text-jfb-rose' : 'text-gray-700'}`}>
                {o.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{o.description}</p>
              <p className="text-xs text-gray-400 italic mt-0.5">{o.exemples}</p>
            </div>
          </label>
        ))}
        <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
          value === '' ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
        }`}>
          <input
            type="radio"
            name="type_obstacle"
            value=""
            checked={value === ''}
            onChange={() => onChange('')}
            className="accent-gray-400 shrink-0"
          />
          <span className="text-sm text-gray-500">Je ne sais pas / ne s'applique pas</span>
        </label>
      </div>
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
    type_obstacle: '',
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

    const { error: err } = await supabase.from('retro_retroactions').insert({
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
      <HandoffBanner prefill={prefill} />
      {/* Barre de progression */}
      <div className="card py-3 px-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className={`flex items-center gap-2 ${step >= s.n ? 'text-jfb-rose' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.n ? 'bg-jfb-noir text-white' :
                  step === s.n ? 'bg-jfb-beige text-jfb-rose ring-2 ring-jfb-rose' :
                  'bg-gray-100 text-gray-400'
                }`}>{step > s.n ? '✓' : s.n}</div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-2 ${step > s.n ? 'bg-jfb-rose' : 'bg-gray-200'}`} />}
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
                  ctx.suivi_prevu === o.v ? 'border-jfb-rose bg-jfb-beige text-jfb-rose' : 'border-gray-200 text-gray-600'
                }`}>
                  <input type="radio" checked={ctx.suivi_prevu === o.v} onChange={() => update('suivi_prevu', o.v)} />
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

          <ObstacleSelector value={ctx.type_obstacle} onChange={v => update('type_obstacle', v)} />

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
          <div className="card border-l-4 border-jfb-rose space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Suggestion RetroActif</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Généré à partir de vos observations — à affiner selon votre connaissance de l'élève
                </p>
              </div>
              <span className="badge bg-jfb-beige text-jfb-rose text-xs">80% généré</span>
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
                className="text-xs text-jfb-rose hover:underline"
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
          <div className="card border-l-4 border-jfb-rose-dk space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Votre touche personnelle</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ce que vous seul savez : contexte familial, progression récente, encouragement ciblé...
                </p>
              </div>
              <span className="badge bg-jfb-beige text-jfb-rose-dk text-xs">20% personnel</span>
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
    type_obstacle: '',
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
    const { error: err } = await supabase.from('retro_retroactions').insert({
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
      <HandoffBanner prefill={prefill} />
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
        <ObstacleSelector value={ctx.type_obstacle} onChange={v => upCtx('type_obstacle', v)} />
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
    type_obstacle: '',
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
    const { error: err } = await supabase.from('retro_retroactions').insert({
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
      <HandoffBanner prefill={prefill} />
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
            <ObstacleSelector value={ctx.type_obstacle} onChange={v => setCtx(p => ({...p, type_obstacle: v}))} />
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
        <div className="card border-l-4 border-jfb-rose">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Version améliorée</h3>
            <button onClick={() => { setTexte(ameliore); setAmeliore('') }}
              className="text-xs text-jfb-rose hover:underline">
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
