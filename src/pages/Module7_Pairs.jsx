/**
 * MODULE 7 — Feedback entre pairs
 *
 * Fonctions :
 *   - Créer un assignment (définir critères, assigner donneur/receveur, décrire le travail)
 *   - Générer un lien partageable pour l'élève donneur
 *   - Consulter les retours soumis
 *
 * Références RISS :
 * - Clayton Bernard (2024) — tel-04726605 : autorégulation par évaluation entre pairs
 * - Da Costa (2025) — dumas-05365503 : évaluation entre pairs en mathématiques
 * - Chesné & Piedfer-Quêney (2023) — hal-04649626 : compétences d'autoévaluation (Cnesco)
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const LABELS = ['À améliorer', 'En progrès', 'Satisfaisant', 'Très bien']
const MAX_CRITERES = 4

export default function Module7_Pairs() {
  const [tab, setTab] = useState('liste')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAssignments() }, [])

  async function loadAssignments() {
    setLoading(true)
    const { data } = await supabase
      .from('peer_feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
    setAssignments(data ?? [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤝 Feedback entre pairs</h1>
          <p className="text-gray-500 text-sm mt-1">
            L'élève évalue le travail d'un pair selon des critères que tu définis.
          </p>
        </div>
        <button onClick={() => setTab('creer')} className="btn-primary text-sm">
          + Nouvel assignment
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { k: 'liste', l: '📋 Suivi' },
          { k: 'creer', l: '✏️ Créer' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.k ? 'bg-white shadow text-jfb-rose' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'liste' && (
        <ListeAssignments
          assignments={assignments}
          loading={loading}
          onRefresh={loadAssignments}
          onNew={() => setTab('creer')}
        />
      )}
      {tab === 'creer' && (
        <FormulaireAssignment
          onCreated={() => { loadAssignments(); setTab('liste') }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Liste des assignments
// ──────────────────────────────────────────────────────────
function ListeAssignments({ assignments, loading, onRefresh, onNew }) {
  const [selected, setSelected] = useState(null)

  if (loading) return (
    <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse" />)}</div>
  )

  if (assignments.length === 0) return (
    <div className="card text-center py-12 space-y-2">
      <p className="text-gray-400 text-sm">Aucun assignment créé.</p>
      <button onClick={onNew} className="text-jfb-rose text-sm hover:underline">
        Créer le premier →
      </button>
    </div>
  )

  return (
    <div className="space-y-2">
      {assignments.map(a => (
        <AssignmentCard
          key={a.id}
          a={a}
          selected={selected?.id === a.id}
          onClick={() => setSelected(s => s?.id === a.id ? null : a)}
          onRefresh={onRefresh}
        />
      ))}
      {selected && <AssignmentDetail a={selected} onClose={() => setSelected(null)} onRefresh={onRefresh} />}
    </div>
  )
}

function AssignmentCard({ a, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card py-3 px-4 cursor-pointer hover:shadow-md transition-all ${selected ? 'ring-2 ring-jfb-rose' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{a.soumis ? '✅' : '⏳'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800">
              {a.eleve_donneur} → {a.eleve_receveur}
            </span>
            <span className={`badge ${a.soumis ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {a.soumis ? 'Retour soumis' : 'En attente'}
            </span>
            <span className="badge bg-gray-100 text-gray-600">
              {(a.criteres ?? []).length} critère{(a.criteres ?? []).length > 1 ? 's' : ''}
            </span>
          </div>
          {a.description_travail && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.description_travail}</p>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {new Date(a.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  )
}

function AssignmentDetail({ a, onClose, onRefresh }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/peer/${a.token}`

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function deleteAssignment() {
    if (!confirm('Supprimer cet assignment ?')) return
    await supabase.from('peer_feedbacks').delete().eq('id', a.id)
    onClose()
    onRefresh()
  }

  return (
    <div className="card border border-jfb-bordure bg-jfb-beige space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-jfb-noir">Détail — {a.eleve_donneur} → {a.eleve_receveur}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
      </div>

      {/* Lien de partage */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-600">Lien à partager avec <strong>{a.eleve_donneur}</strong> :</p>
        <div className="flex gap-2">
          <input readOnly value={shareUrl} className="input text-xs flex-1 bg-white font-mono" />
          <button
            onClick={copyLink}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              copied ? 'bg-green-50 border-green-300 text-green-700' : 'btn-secondary'
            }`}
          >
            {copied ? '✓' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Description */}
      {a.description_travail && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Travail à évaluer :</p>
          <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200 leading-relaxed whitespace-pre-wrap">
            {a.description_travail}
          </p>
        </div>
      )}

      {/* Critères + retour soumis */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2">Critères :</p>
        <div className="space-y-2">
          {(a.criteres ?? []).map((c, i) => (
            <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-sm font-medium text-gray-800">{i + 1}. {c}</p>
              {a.soumis && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-jfb-rose font-medium">
                    Note : {a.feedback_notes?.[i] ?? '—'}/4
                    {a.feedback_notes?.[i] ? ` — ${LABELS[(a.feedback_notes[i] ?? 1) - 1]}` : ''}
                  </p>
                  {a.feedback_commentaires?.[i] && (
                    <p className="text-xs text-gray-600 italic">{a.feedback_commentaires[i]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {!a.soumis && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          ⏳ En attente du retour de l'élève <strong>{a.eleve_donneur}</strong>.
        </p>
      )}

      <button onClick={deleteAssignment} className="text-xs text-red-400 hover:underline">
        Supprimer cet assignment
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Formulaire de création
// ──────────────────────────────────────────────────────────
function FormulaireAssignment({ onCreated }) {
  const [donneur, setDonneur] = useState('')
  const [receveur, setReceveur] = useState('')
  const [description, setDescription] = useState('')
  const [criteres, setCriteres] = useState(['', ''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateCritere(i, val) {
    setCriteres(c => { const n = [...c]; n[i] = val; return n })
  }

  function addCritere() {
    if (criteres.length < MAX_CRITERES) setCriteres(c => [...c, ''])
  }

  function removeCritere(i) {
    if (criteres.length > 1) setCriteres(c => c.filter((_, idx) => idx !== i))
  }

  async function save() {
    const criteresFiltres = criteres.map(c => c.trim()).filter(Boolean)
    if (!donneur.trim()) { setError('Indique le code de l\'élève donneur.'); return }
    if (!receveur.trim()) { setError('Indique le code de l\'élève receveur.'); return }
    if (donneur.trim() === receveur.trim()) { setError('Le donneur et le receveur doivent être différents.'); return }
    if (criteresFiltres.length === 0) { setError('Définis au moins un critère.'); return }
    setError('')
    setSaving(true)

    const { error } = await supabase.from('peer_feedbacks').insert({
      eleve_donneur: donneur.trim(),
      eleve_receveur: receveur.trim(),
      description_travail: description.trim() || null,
      criteres: criteresFiltres,
    })

    if (error) { setError('Erreur lors de la création.'); setSaving(false); return }
    onCreated()
  }

  return (
    <div className="card space-y-5 max-w-2xl">
      <h2 className="font-semibold text-gray-900">Nouvel assignment de feedback entre pairs</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Code élève donneur</label>
          <input className="input text-sm" placeholder="EL-03" value={donneur} onChange={e => setDonneur(e.target.value)} />
          <p className="text-xs text-gray-400">Cet élève donnera le retour.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Code élève receveur</label>
          <input className="input text-sm" placeholder="EL-07" value={receveur} onChange={e => setReceveur(e.target.value)} />
          <p className="text-xs text-gray-400">Ce travail sera évalué.</p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Description du travail à évaluer</label>
        <textarea
          className="input text-sm min-h-[80px] resize-y"
          placeholder="Ex : Rédaction sur le thème des énergies renouvelables — 2e brouillon..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <p className="text-xs text-gray-400">Visible par l'élève donneur sur sa page de feedback.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Critères d'évaluation ({criteres.length}/{MAX_CRITERES})</label>
          {criteres.length < MAX_CRITERES && (
            <button onClick={addCritere} className="text-xs text-jfb-rose hover:underline">+ Ajouter</button>
          )}
        </div>
        {criteres.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input text-sm flex-1"
              placeholder={`Critère ${i + 1} (ex: Clarté de l'argumentation)`}
              value={c}
              onChange={e => updateCritere(i, e.target.value)}
            />
            {criteres.length > 1 && (
              <button onClick={() => removeCritere(i)} className="text-gray-400 hover:text-red-500 px-1 text-lg leading-none">&times;</button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3">
        <button className="btn-primary text-sm" onClick={save} disabled={saving}>
          {saving ? 'Création...' : 'Créer l\'assignment →'}
        </button>
      </div>

      {/* Ancrage scientifique */}
      <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-400">
        <p className="font-medium text-gray-500">Ancrage scientifique (RISS ✓)</p>
        <p>Clayton Bernard (2024) — <span className="font-mono">tel-04726605</span> : l'évaluation entre pairs favorise l'autorégulation et la co-régulation en cours de langue.</p>
        <p>Da Costa (2025) — <span className="font-mono">dumas-05365503</span> : le feedback entre pairs comme levier d'apprentissage en mathématiques.</p>
        <p>Chesné & Piedfer-Quêney (2023) — <span className="font-mono">hal-04649626</span> : des élèves du primaire et du secondaire peuvent développer des compétences d'autoévaluation et d'évaluation entre pairs.</p>
      </div>
    </div>
  )
}
