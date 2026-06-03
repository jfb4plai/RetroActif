/**
 * MODULE 5 — Ma progression
 *
 * Tableau de bord de la progression de l'enseignant selon les
 * 4 dimensions de Carless & Boud (2018).
 *
 * Auto-évaluation + analyse automatique des rétroactions sauvegardées
 * (types, modes, présence de suivi, diversité).
 *
 * Références : Carless & Boud (2018) — réel, hors corpus RISS ;
 *              hal-04621117, Soubre et al. (2023) — RISS ✓ ;
 *              Weidlich et al. (2025) SFLI-S — réel, hors corpus RISS
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DIMENSIONS_LITTERATIE } from '../lib/constants'

// Questions auto-évaluation par dimension
const QUESTIONS = {
  dispositions: [
    { id: 'q1', text: 'Je considère la rétroaction comme un dialogue, pas une transmission verticale.' },
    { id: 'q2', text: "Je prévois du temps en classe pour que les élèves agissent sur mes commentaires." },
    { id: 'q3', text: "Je valorise explicitement les erreurs comme ressource d'apprentissage." },
  ],
  conception: [
    { id: 'q4', text: 'Je co-construis les critères d\'évaluation avec mes élèves.' },
    { id: 'q5', text: "Les élèves connaissent les attentes AVANT de produire leur travail." },
    { id: 'q6', text: "Mes élèves peuvent s'auto-évaluer avec mes grilles." },
  ],
  litteratie: [
    { id: 'q7', text: 'Mes rétroactions indiquent toujours quoi faire (pas seulement ce qui ne va pas).' },
    { id: 'q8', text: 'Je formule un critère de réussite vérifiable dans mes commentaires.' },
    { id: 'q9', text: "Je centre mes commentaires sur la tâche/le processus, pas la personne." },
  ],
  appropriation: [
    { id: 'q10', text: 'Je prévois un temps de révision après chaque rétroaction significative.' },
    { id: 'q11', text: "Je demande aux élèves de me dire ce qu'ils ont compris de mes commentaires." },
    { id: 'q12', text: "Je modifie ma pratique de rétroaction sur base des retours élèves." },
  ],
}

const ECHELLE = [
  { v: 0, l: 'Jamais' },
  { v: 1, l: 'Rarement' },
  { v: 2, l: 'Parfois' },
  { v: 3, l: 'Souvent' },
  { v: 4, l: 'Toujours' },
]

export default function Module5_Progression() {
  const [reponses, setReponses] = useState({})
  const [stats, setStats] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [historique, setHistorique] = useState([])
  const [tab, setTab] = useState('autoevaluation')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: retros }, { data: evals }] = await Promise.all([
      supabase.from('retroactions').select('*').order('created_at', { ascending: false }),
      supabase.from('auto_evaluations').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    // Calcul des stats depuis les rétroactions
    const r = retros ?? []
    if (r.length > 0) {
      const avecSuivi = r.filter(x => x.suivi_prevu).length
      const avecCritere = r.filter(x => x.texte_final?.toLowerCase().includes('critère')).length
      const modes = {}
      r.forEach(x => { modes[x.mode_construction] = (modes[x.mode_construction] ?? 0) + 1 })

      setStats({
        total: r.length,
        avecSuivi,
        avecCritere,
        tauxSuivi: Math.round((avecSuivi / r.length) * 100),
        tauxCritere: Math.round((avecCritere / r.length) * 100),
        modes,
        typesDivers: new Set(r.map(x => x.type_retroaction)).size,
        niveauxDivers: new Set(r.map(x => x.niveau).filter(Boolean)).size,
      })
    }

    setHistorique(evals ?? [])

    // Pré-remplir avec la dernière évaluation
    if (evals && evals[0]) {
      setReponses(evals[0].reponses ?? {})
    }
  }

  function setReponse(id, val) {
    setReponses(p => ({ ...p, [id]: val }))
  }

  function scoreFor(dimension) {
    const qs = QUESTIONS[dimension]
    const total = qs.reduce((acc, q) => acc + (reponses[q.id] ?? 0), 0)
    return { score: total, max: qs.length * 4, pct: Math.round((total / (qs.length * 4)) * 100) }
  }

  async function saveEval() {
    setSaving(true)
    await supabase.from('auto_evaluations').insert({ reponses })
    setSaved(true)
    await loadData()
    setSaving(false)
  }

  const allAnswered = Object.keys(reponses).length === 12

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🎯 Ma progression</h1>
        <p className="text-gray-500 text-sm mt-1">
          Développement de votre littératie à la rétroaction — 4 dimensions (Carless & Boud, 2018)
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { k: 'autoevaluation', l: '📋 Auto-évaluation' },
          { k: 'analyse', l: '📊 Analyse de mes rétroactions' },
          { k: 'historique', l: '📈 Mon historique' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.k ? 'bg-white shadow text-jfb-rose' : 'text-gray-500'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── AUTO-ÉVALUATION ── */}
      {tab === 'autoevaluation' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Instrument d'auto-évaluation</strong> — Adapté du SFLI-S (Weidlich, Rabin & Tsovaltzi, 2025).
            12 items couvrant les 4 dimensions. Passez cet outil en début et fin d'année pour mesurer votre progression.
            <span className="block text-xs text-blue-600 mt-1">Référence : réel, hors corpus RISS</span>
          </div>

          {DIMENSIONS_LITTERATIE.map(dim => {
            const { score, max, pct } = scoreFor(dim.id)
            const qs = QUESTIONS[dim.id]
            return (
              <div key={dim.id} className="card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`badge ${dim.color} mb-1`}>{dim.label}</span>
                    <p className="text-xs text-gray-500">{dim.description}</p>
                  </div>
                  {allAnswered || score > 0 ? (
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">{score}/{max}</div>
                      <div className="text-xs text-gray-400">{pct}%</div>
                    </div>
                  ) : null}
                </div>

                {/* Barre de progression */}
                {(allAnswered || score > 0) && (
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-jfb-rose' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {qs.map(q => (
                    <div key={q.id}>
                      <p className="text-sm text-gray-700 mb-2">{q.text}</p>
                      <div className="flex gap-2">
                        {ECHELLE.map(e => (
                          <label key={e.v}
                            className={`flex-1 text-center py-1.5 rounded-lg cursor-pointer text-xs font-medium border transition-all ${
                              reponses[q.id] === e.v
                                ? 'bg-jfb-noir text-white border-jfb-noir'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-jfb-gris-cl'
                            }`}>
                            <input type="radio" name={q.id} value={e.v}
                              checked={reponses[q.id] === e.v}
                              onChange={() => setReponse(q.id, e.v)}
                              className="sr-only" />
                            {e.l}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {saved ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
              ✓ Auto-évaluation sauvegardée. Repassez-la dans quelques semaines pour mesurer votre progression.
            </div>
          ) : (
            <button className="btn-primary w-full" onClick={saveEval}
              disabled={saving || !allAnswered}>
              {saving ? 'Sauvegarde...' : allAnswered ? '✓ Sauvegarder mon auto-évaluation' : `Répondre aux ${12 - Object.keys(reponses).length} questions restantes`}
            </button>
          )}
        </div>
      )}

      {/* ── ANALYSE DES RÉTROACTIONS ── */}
      {tab === 'analyse' && (
        <div className="space-y-4">
          {!stats ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">Créez et sauvegardez des rétroactions pour voir votre analyse.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Rétroactions créées" value={stats.total} icon="✏️" color="brand" />
                <StatCard label="Avec suivi planifié" value={`${stats.tauxSuivi}%`} icon="✅"
                  color={stats.tauxSuivi >= 70 ? 'green' : stats.tauxSuivi >= 40 ? 'yellow' : 'red'} />
                <StatCard label="Avec critère de réussite" value={`${stats.tauxCritere}%`} icon="🎯"
                  color={stats.tauxCritere >= 70 ? 'green' : stats.tauxCritere >= 40 ? 'yellow' : 'red'} />
                <StatCard label="Types de rétroaction utilisés" value={`${stats.typesDivers}/3`} icon="🔀"
                  color={stats.typesDivers >= 2 ? 'green' : 'yellow'} />
              </div>

              {/* Modes de construction */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Modes de construction utilisés</h3>
                <div className="space-y-2">
                  {Object.entries(stats.modes).map(([mode, n]) => (
                    <div key={mode} className="flex items-center gap-3">
                      <div className="text-sm text-gray-600 w-28">
                        {mode === 'debutant' ? '🌱 Débutant' : mode === 'intermediaire' ? '🌿 Intermédiaire' : mode === 'expert' ? '🌳 Expert' : mode === 'logigramme' ? '🔀 Logigramme' : mode}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div className="bg-jfb-rose h-3 rounded-full"
                          style={{ width: `${Math.round((n / stats.total) * 100)}%` }} />
                      </div>
                      <div className="text-xs text-gray-500 w-8 text-right">{n}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommandations */}
              <div className="card bg-gradient-to-br from-jfb-beige to-purple-50 border-jfb-bordure">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Points d'attention</h3>
                <div className="space-y-2 text-sm">
                  {stats.tauxSuivi < 50 && (
                    <div className="flex gap-2 text-orange-700">
                      <span>⚠️</span>
                      <span>Moins de la moitié de vos rétroactions ont un suivi planifié. Le suivi est indispensable à l'appropriation (Nicol & Macfarlane-Dick, 2006).</span>
                    </div>
                  )}
                  {stats.tauxCritere < 50 && (
                    <div className="flex gap-2 text-orange-700">
                      <span>⚠️</span>
                      <span>Peu de critères de réussite vérifiables. Sans critère, l'élève ne sait pas quand son amélioration est suffisante (Sadler, 1989).</span>
                    </div>
                  )}
                  {stats.typesDivers === 1 && (
                    <div className="flex gap-2 text-blue-700">
                      <span>💡</span>
                      <span>Vous n'utilisez qu'un seul type de rétroaction. Diversifiez vers l'évaluation et le bulletin.</span>
                    </div>
                  )}
                  {stats.tauxSuivi >= 70 && stats.tauxCritere >= 70 && (
                    <div className="flex gap-2 text-green-700">
                      <span>✓</span>
                      <span>Bonne pratique : suivi et critères bien présents. Pensez à la méta-rétroaction — demander aux élèves leur retour sur vos commentaires.</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {tab === 'historique' && (
        <div className="space-y-4">
          {historique.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">Passez l'auto-évaluation pour voir votre historique de progression.</p>
            </div>
          ) : (
            historique.map((eval_, i) => {
              const reponses = eval_.reponses ?? {}
              return (
                <div key={eval_.id} className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">
                      Auto-évaluation du {new Date(eval_.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                    {i === 0 && <span className="badge bg-jfb-beige text-jfb-rose">Dernière</span>}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {DIMENSIONS_LITTERATIE.map(dim => {
                      const qs = QUESTIONS[dim.id]
                      const total = qs.reduce((acc, q) => acc + (reponses[q.id] ?? 0), 0)
                      const pct = Math.round((total / (qs.length * 4)) * 100)
                      return (
                        <div key={dim.id} className="text-center">
                          <div className={`text-lg font-bold ${dim.dot.replace('bg-', 'text-')}`}>{pct}%</div>
                          <div className="text-xs text-gray-500">{dim.label}</div>
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full">
                            <div className={`h-1.5 rounded-full ${dim.dot}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    brand: 'text-jfb-rose',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-500',
  }
  return (
    <div className="card py-4">
      <div className={`text-2xl font-bold ${colors[color] ?? colors.brand}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{icon} {label}</div>
    </div>
  )
}
