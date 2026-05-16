/**
 * PeerPage — Feedback entre pairs (page publique élève donneur)
 *
 * Accessible sans connexion via /peer/:token
 * L'élève évalue le travail d'un pair selon les critères définis par l'enseignant :
 *   - Note 1–4 par critère
 *   - Commentaire libre par critère
 *
 * Références RISS :
 * - Clayton Bernard (2024) — tel-04726605 : autorégulation par évaluation entre pairs en LVE
 * - Da Costa (2025) — dumas-05365503 : évaluation entre pairs comme levier d'apprentissage en maths
 * - Chesné & Piedfer-Quêney (2023) — hal-04649626 : compétences d'autoévaluation primaire/secondaire
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LABELS = ['À améliorer', 'En progrès', 'Satisfaisant', 'Très bien']
const LS_KEY = 'ra_peer_done'

export default function PeerPage() {
  const { token } = useParams()

  const [assignment, setAssignment] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | not-found | form | done | already-done
  const [notes, setNotes] = useState({})         // { 0: 3, 1: 2 }
  const [commentaires, setCommentaires] = useState({}) // { 0: "...", 1: "..." }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [token])

  async function load() {
    try {
      const done = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
      if (done.includes(token)) { setPhase('already-done'); return }
    } catch {}

    const { data, error } = await supabase
      .from('peer_feedbacks')
      .select('id, eleve_donneur, eleve_receveur, description_travail, criteres, soumis, token')
      .eq('token', token)
      .single()

    if (error || !data) { setPhase('not-found'); return }
    if (data.soumis) { setPhase('already-done'); return }

    setAssignment(data)
    // Initialise les notes à 0 (non sélectionné)
    const initNotes = {}
    const initComm = {}
    ;(data.criteres ?? []).forEach((_, i) => { initNotes[i] = 0; initComm[i] = '' })
    setNotes(initNotes)
    setCommentaires(initComm)
    setPhase('form')
  }

  async function submit() {
    const criteres = assignment.criteres ?? []
    const missingNote = criteres.some((_, i) => !notes[i])
    if (missingNote) { setError('Attribue une note à chaque critère avant de soumettre.'); return }
    setError('')
    setSubmitting(true)

    const { error } = await supabase
      .from('peer_feedbacks')
      .update({
        feedback_notes: notes,
        feedback_commentaires: commentaires,
        soumis: true,
      })
      .eq('token', token)
      .eq('soumis', false)

    if (error) {
      setError('Erreur lors de l\'envoi. Réessaie dans un moment.')
      setSubmitting(false)
      return
    }

    try {
      const done = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
      done.push(token)
      localStorage.setItem(LS_KEY, JSON.stringify(done))
    } catch {}

    setPhase('done')
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* En-tête PLAI */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/plai-logo.jpg" alt="PLAI" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">RetroActif — Feedback entre pairs</p>
            <p className="text-xs text-gray-500">Pôle Liégeois d'Accompagnement vers une École Inclusive</p>
          </div>
        </div>

        {phase === 'loading' && (
          <div className="card text-center py-16">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Chargement...</p>
          </div>
        )}

        {phase === 'not-found' && (
          <div className="card text-center py-16 space-y-3">
            <p className="text-4xl">🔒</p>
            <h1 className="font-bold text-gray-800">Lien invalide ou expiré</h1>
            <p className="text-sm text-gray-500">Ce lien n'est plus actif. Demande à ton enseignant un nouveau lien.</p>
          </div>
        )}

        {(phase === 'already-done' || (phase === 'not-found' && assignment?.soumis)) && (
          <div className="card text-center py-16 space-y-3">
            <p className="text-4xl">✅</p>
            <h1 className="font-bold text-gray-800">Retour déjà soumis</h1>
            <p className="text-sm text-gray-500">Tu as déjà soumis ton retour. Ton enseignant peut le consulter dans RetroActif.</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="card text-center py-16 space-y-3">
            <p className="text-4xl">✅</p>
            <h1 className="font-bold text-gray-800">Retour envoyé</h1>
            <p className="text-sm text-gray-500">Ton enseignant peut maintenant consulter ton évaluation dans RetroActif.</p>
          </div>
        )}

        {phase === 'form' && assignment && (
          <div className="space-y-5">

            {/* Contexte */}
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <h1 className="font-bold text-gray-900">Retour sur le travail d'un pair</h1>
              </div>
              <p className="text-xs text-gray-500">
                Tu as été invité(e) à donner un retour sur le travail de l'élève{' '}
                <span className="font-semibold text-gray-700">{assignment.eleve_receveur}</span>.
                Lis attentivement, puis évalue chaque critère honnêtement.
              </p>
              {assignment.description_travail && (
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-brand-700 mb-1 uppercase tracking-wide">Travail à évaluer</p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{assignment.description_travail}</p>
                </div>
              )}
            </div>

            {/* Critères */}
            <div className="card space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className="font-bold text-gray-900">Évalue chaque critère</h2>
              </div>

              {(assignment.criteres ?? []).map((critere, i) => (
                <div key={i} className="space-y-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-gray-800">{i + 1}. {critere}</p>

                  {/* Échelle 1–4 */}
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(val => (
                      <button
                        key={val}
                        onClick={() => setNotes(n => ({ ...n, [i]: val }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                          notes[i] === val
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                        }`}
                      >
                        {val} — {LABELS[val - 1]}
                      </button>
                    ))}
                  </div>

                  {/* Commentaire */}
                  <textarea
                    className="input text-xs min-h-[60px] resize-y"
                    placeholder="Commentaire (facultatif)..."
                    value={commentaires[i] ?? ''}
                    onChange={e => setCommentaires(c => ({ ...c, [i]: e.target.value }))}
                  />
                </div>
              ))}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                className="btn-primary w-full"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? 'Envoi...' : 'Envoyer mon évaluation →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
