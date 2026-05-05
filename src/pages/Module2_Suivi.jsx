/**
 * MODULE 2 — Suivi & Historique + Génération de bulletins
 *
 * Fonctions :
 *   - Historique des rétroactions sauvegardées (avec recherche/filtre)
 *   - Détail d'une rétroaction + marquer le suivi réalisé
 *   - Génération de commentaire de bulletin depuis l'historique
 *     → détecte la période, agrège les rétroactions, génère via Claude Haiku
 *     → alerte si doublon avec le bulletin précédent
 *
 * Références : Nicol & Macfarlane-Dick (2006) — hal-04621117
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { TYPES_RETROACTION, NIVEAUX, PERIODES } from '../lib/constants'

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

// ──────────────────────────────────────────────────────────
export default function Module2_Suivi() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const action = searchParams.get('action') // 'bulletin'
  const selectedId = searchParams.get('id')

  const [tab, setTab] = useState(action === 'bulletin' ? 'bulletin' : 'historique')
  const [retroactions, setRetroactions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('retroactions')
      .select('*')
      .order('created_at', { ascending: false })
    setRetroactions(data ?? [])

    if (selectedId) {
      const item = (data ?? []).find(r => r.id === selectedId)
      if (item) setSelected(item)
    }
    setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  const filtered = retroactions.filter(r => {
    const matchSearch = !search ||
      r.texte_final?.toLowerCase().includes(search.toLowerCase()) ||
      r.eleve_code?.toLowerCase().includes(search.toLowerCase()) ||
      r.matiere?.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || r.type_retroaction === filterType
    return matchSearch && matchType
  })

  const typeIcon = v => TYPES_RETROACTION.find(t => t.value === v)?.icon ?? '•'
  const typeLabel = v => TYPES_RETROACTION.find(t => t.value === v)?.label ?? v

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Suivi & Bulletins</h1>
          <p className="text-gray-500 text-sm mt-1">Historique des rétroactions — Génération de commentaires de bulletin</p>
        </div>
        <button onClick={() => navigate('/constructeur')} className="btn-primary text-sm">
          + Nouvelle rétroaction
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { k: 'historique', l: '📋 Historique' },
          { k: 'bulletin', l: '📄 Générer un bulletin' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.k ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── ONGLET HISTORIQUE ── */}
      {tab === 'historique' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex gap-3">
            <input className="input text-sm flex-1" placeholder="Rechercher (élève, matière, texte...)"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input text-sm w-52" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Tous les types</option>
              {TYPES_RETROACTION.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400 text-sm">Aucune rétroaction trouvée.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => (
                <RetroCard key={r.id} r={r} selected={selected?.id === r.id}
                  onClick={() => setSelected(r)} onUpdate={load} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET BULLETIN ── */}
      {tab === 'bulletin' && (
        <BulletinGenerator retroactions={retroactions} profile={profile} />
      )}

      {/* Panneau détail (drawer latéral simulé) */}
      {selected && tab === 'historique' && (
        <RetroDetail r={selected} onClose={() => setSelected(null)} onUpdate={load} />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Carte rétroaction dans la liste
// ──────────────────────────────────────────────────────────
function RetroCard({ r, selected, onClick, onUpdate }) {
  const typeIcon = v => TYPES_RETROACTION.find(t => t.value === v)?.icon ?? '•'
  const typeLabel = v => TYPES_RETROACTION.find(t => t.value === v)?.label ?? v

  async function toggleSuivi(e) {
    e.stopPropagation()
    await supabase.from('retroactions').update({ suivi_realise: !r.suivi_realise }).eq('id', r.id)
    onUpdate()
  }

  return (
    <div onClick={onClick}
      className={`card py-3 px-4 cursor-pointer transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-brand-400 shadow-md' : ''
      }`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{typeIcon(r.type_retroaction)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{typeLabel(r.type_retroaction)}</span>
            {r.eleve_code && <span className="badge bg-gray-100 text-gray-600">{r.eleve_code}</span>}
            {r.matiere && <span className="badge bg-blue-50 text-blue-700">{r.matiere}</span>}
            {r.suivi_prevu && (
              <span className={`badge ${r.suivi_realise ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {r.suivi_realise ? '✓ Suivi réalisé' : '⏳ Suivi prévu'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-800 mt-1 line-clamp-2 leading-relaxed">{r.texte_final}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(r.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {r.suivi_prevu && (
          <button onClick={toggleSuivi}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              r.suivi_realise
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-green-50 hover:text-green-700'
            }`}>
            {r.suivi_realise ? '✓' : '⏳'}
          </button>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Panneau détail d'une rétroaction
// ──────────────────────────────────────────────────────────
function RetroDetail({ r, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [texte, setTexte] = useState(r.texte_final)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('retroactions').update({ texte_final: texte }).eq('id', r.id)
    await onUpdate()
    setEditing(false)
    setSaving(false)
  }

  async function deleteRetro() {
    if (!confirm('Supprimer cette rétroaction ?')) return
    await supabase.from('retroactions').delete().eq('id', r.id)
    onClose()
    onUpdate()
  }

  return (
    <div className="card border border-brand-200 bg-brand-50 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-brand-900">Détail de la rétroaction</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div><span className="text-gray-500">Type :</span> <span className="font-medium">{r.type_retroaction}</span></div>
        <div><span className="text-gray-500">Matière :</span> <span className="font-medium">{r.matiere ?? '—'}</span></div>
        <div><span className="text-gray-500">Élève :</span> <span className="font-medium">{r.eleve_code ?? '—'}</span></div>
        <div><span className="text-gray-500">Niveau :</span> <span className="font-medium">{r.niveau ?? '—'}</span></div>
        <div><span className="text-gray-500">Suivi :</span> <span className="font-medium">{r.suivi_prevu ? (r.suivi_realise ? '✓ réalisé' : '⏳ prévu') : 'non prévu'}</span></div>
        <div><span className="text-gray-500">Mode :</span> <span className="font-medium">{r.mode_construction ?? '—'}</span></div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea className="input min-h-[120px] resize-y text-sm" value={texte}
            onChange={e => setTexte(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary text-sm" onClick={save} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200">
            {r.texte_final}
          </p>
          {r.note_personnelle && (
            <p className="text-xs text-gray-500 italic border-l-2 border-accent-300 pl-3">
              Note personnelle : {r.note_personnelle}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => setEditing(true)}>Modifier</button>
            <button className="text-xs text-red-500 hover:underline px-2" onClick={deleteRetro}>Supprimer</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Générateur de bulletin
// ──────────────────────────────────────────────────────────
function BulletinGenerator({ retroactions, profile }) {
  const [eleveCode, setEleveCode] = useState('')
  const [periode, setPeriode] = useState('')
  const [notePersonnelle, setNotePersonnelle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [bulletinTexte, setBulletinTexte] = useState('')
  const [bulletinPrecedent, setBulletinPrecedent] = useState('')
  const [doublonAlerte, setDoublonAlerte] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Rétroactions de l'élève sur la période sélectionnée
  const retrosEleve = retroactions.filter(r =>
    (!eleveCode || r.eleve_code === eleveCode) &&
    (!periode || r.periode === periode || true) // simplification : toutes les retros de cet élève
  )

  // Codes élèves disponibles
  const eleveCodes = [...new Set(retroactions.map(r => r.eleve_code).filter(Boolean))]

  async function loadBulletinPrecedent() {
    if (!eleveCode) return
    const { data } = await supabase
      .from('bulletins')
      .select('texte_final')
      .eq('eleve_code', eleveCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setBulletinPrecedent(data?.texte_final ?? '')
  }

  async function generate() {
    if (!eleveCode) { setError('Sélectionnez un code élève.'); return }
    if (retrosEleve.length === 0) { setError('Aucune rétroaction trouvée pour cet élève.'); return }

    setGenerating(true)
    setError('')
    setDoublonAlerte(false)

    await loadBulletinPrecedent()

    try {
      const text = await callGenerate('bulletin', {
        niveau: profile?.niveau_enseignement ?? '',
        type_enseignement: profile?.type_enseignement ?? '',
        matiere: profile?.matiere ?? '',
        periode,
        eleve_code: eleveCode,
        retroactions_periode: retrosEleve.map(r => ({
          date: new Date(r.created_at).toLocaleDateString('fr-BE'),
          texte: r.texte_final,
          type: r.type_retroaction,
        })),
        bulletin_precedent: bulletinPrecedent,
        note_personnelle: notePersonnelle,
      })

      setBulletinTexte(text)

      // Détection de doublon heuristique (similarité > 60%)
      if (bulletinPrecedent) {
        const wordsPrev = new Set(bulletinPrecedent.toLowerCase().split(/\s+/))
        const wordsNew = text.toLowerCase().split(/\s+/)
        const overlap = wordsNew.filter(w => wordsPrev.has(w)).length / wordsNew.length
        if (overlap > 0.6) setDoublonAlerte(true)
      }
    } catch(e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  async function saveBulletin() {
    setSaving(true)
    const { error: err } = await supabase.from('bulletins').insert({
      eleve_code: eleveCode,
      periode,
      texte_final: bulletinTexte,
      texte_genere: bulletinTexte,
      matiere: profile?.matiere ?? '',
      niveau: profile?.niveau_enseignement ?? '',
      nb_retroactions_source: retrosEleve.length,
      bulletin_precedent: bulletinPrecedent,
    })
    if (!err) {
      setSaved(true)
      setBulletinTexte('')
      setEleveCode('')
    } else {
      setError('Erreur lors de la sauvegarde.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Générer un commentaire de bulletin</h2>
        <p className="text-sm text-gray-500">
          RetroActif synthétise les rétroactions de la période pour construire un commentaire cohérent,
          évolutif et centré sur la trajectoire de l'élève.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Code élève</label>
            {eleveCodes.length > 0 ? (
              <select className="input" value={eleveCode} onChange={e => setEleveCode(e.target.value)}>
                <option value="">Choisir...</option>
                {eleveCodes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input className="input" placeholder="ex. EL-14-A"
                value={eleveCode} onChange={e => setEleveCode(e.target.value)} />
            )}
          </div>
          <div>
            <label className="label">Période</label>
            <select className="input" value={periode} onChange={e => setPeriode(e.target.value)}>
              <option value="">Toute la période</option>
              {PERIODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {eleveCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <span className="font-medium text-blue-800">{retrosEleve.length} rétroaction(s)</span>
            <span className="text-blue-600"> trouvée(s) pour cet élève — </span>
            {retrosEleve.length > 0 ? (
              <span className="text-blue-700">
                de {new Date(retrosEleve[retrosEleve.length-1]?.created_at).toLocaleDateString('fr-BE')} à {new Date(retrosEleve[0]?.created_at).toLocaleDateString('fr-BE')}
              </span>
            ) : <span className="text-red-600">Aucune rétroaction disponible.</span>}
          </div>
        )}

        <div>
          <label className="label">Note personnelle (optionnelle)</label>
          <textarea className="input resize-none" rows={2}
            placeholder="Ce que vous souhaitez ajouter qui ne figure pas dans les rétroactions (événement particulier, progression notable...)"
            value={notePersonnelle} onChange={e => setNotePersonnelle(e.target.value)} />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button className="btn-accent" onClick={generate}
          disabled={generating || !eleveCode || retrosEleve.length === 0}>
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Génération du bulletin...
            </span>
          ) : `📄 Générer le bulletin (${retrosEleve.length} rétroaction(s))`}
        </button>
      </div>

      {/* Alerte doublon */}
      {doublonAlerte && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-sm">
          <div className="font-semibold text-yellow-800 mb-1">⚠️ Similarité avec le bulletin précédent</div>
          <p className="text-yellow-700">Le bulletin généré ressemble beaucoup au précédent. Pensez à personnaliser pour montrer l'évolution de l'élève.</p>
        </div>
      )}

      {/* Résultat + bulletin précédent */}
      {bulletinTexte && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card border-l-4 border-brand-400 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Nouveau bulletin</h3>
              <button onClick={() => {
                setGenerating(true)
                generate().finally(() => setGenerating(false))
              }} className="text-xs text-brand-600 hover:underline" disabled={generating}>
                ↻ Régénérer
              </button>
            </div>
            <textarea
              className="input min-h-[160px] resize-y text-sm"
              value={bulletinTexte}
              onChange={e => setBulletinTexte(e.target.value)}
            />
            {saved ? (
              <p className="text-green-600 text-sm font-medium">✓ Bulletin sauvegardé.</p>
            ) : (
              <button className="btn-primary text-sm" onClick={saveBulletin} disabled={saving}>
                {saving ? 'Sauvegarde...' : '✓ Sauvegarder ce bulletin'}
              </button>
            )}
          </div>

          {bulletinPrecedent && (
            <div className="card bg-gray-50 border-l-4 border-gray-300 space-y-2">
              <h3 className="font-semibold text-gray-600 text-sm">Bulletin précédent (référence)</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{bulletinPrecedent}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
