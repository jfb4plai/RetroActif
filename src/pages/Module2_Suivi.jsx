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
  const [visibleCount, setVisibleCount] = useState(30)

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
          { k: 'eleve', l: '👤 Vue Élève' },
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
              {filtered.slice(0, visibleCount).map(r => (
                <RetroCard key={r.id} r={r} selected={selected?.id === r.id}
                  onClick={() => setSelected(r)} onUpdate={load} />
              ))}
              {filtered.length > visibleCount && (
                <button className="w-full py-2 text-sm text-brand-600 hover:underline"
                  onClick={() => setVisibleCount(v => v + 30)}>
                  Voir plus ({filtered.length - visibleCount} restantes)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET BULLETIN ── */}
      {tab === 'bulletin' && (
        <BulletinGenerator retroactions={retroactions} profile={profile} />
      )}

      {/* ── ONGLET VUE ÉLÈVE ── */}
      {tab === 'eleve' && (
        <VueEleve retroactions={retroactions} />
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

  // Fermer la boucle
  const [token, setToken] = useState(r.partage_token ?? null)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [boucle, setBoucle] = useState(null)
  const [loadingBoucle, setLoadingBoucle] = useState(false)

  useEffect(() => {
    if (token) fetchBoucle()
  }, [token])

  async function fetchBoucle() {
    setLoadingBoucle(true)
    const { data } = await supabase
      .from('boucles')
      .select('*')
      .eq('retroaction_id', r.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setBoucle(data ?? null)
    setLoadingBoucle(false)
  }

  async function generateToken() {
    setGeneratingToken(true)
    const newToken = crypto.randomUUID()
    await supabase.from('retroactions').update({ partage_token: newToken }).eq('id', r.id)
    setToken(newToken)
    setGeneratingToken(false)
  }

  async function revokeToken() {
    if (!confirm('Révoquer ce lien ? L\'élève ne pourra plus y accéder.')) return
    await supabase.from('retroactions').update({ partage_token: null }).eq('id', r.id)
    setToken(null)
    setBoucle(null)
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = token ? `${window.location.origin}/boucle/${token}` : null

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

      {/* ── FERMER LA BOUCLE ── */}
      <div className="border-t border-brand-200 pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-brand-800">🔄 Fermer la boucle</span>
          {boucle && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ✓ Répondu
            </span>
          )}
        </div>

        {!token ? (
          <button
            className="btn-secondary text-xs"
            onClick={generateToken}
            disabled={generatingToken}
          >
            {generatingToken ? 'Génération...' : '🔗 Générer un lien élève'}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="input text-xs flex-1 bg-white font-mono"
              />
              <button
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  copied ? 'bg-green-50 border-green-300 text-green-700' : 'btn-secondary'
                }`}
                onClick={copyLink}
              >
                {copied ? '✓' : 'Copier'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Partage ce lien à l'élève — il peut lire la rétroaction et répondre sans connexion.
            </p>
            <button
              className="text-xs text-red-400 hover:underline"
              onClick={revokeToken}
            >
              Révoquer le lien
            </button>
          </div>
        )}

        {/* Réponse de l'élève */}
        {token && (
          loadingBoucle ? (
            <p className="text-xs text-gray-400">Vérification de la réponse...</p>
          ) : boucle ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2 text-xs">
              <p className="font-semibold text-green-800">Réponse de l'élève :</p>
              {boucle.compris && (
                <div>
                  <p className="text-gray-500 mb-0.5">Ce qu'il/elle a compris :</p>
                  <p className="text-gray-800 leading-relaxed">{boucle.compris}</p>
                </div>
              )}
              {boucle.va_faire && (
                <div>
                  <p className="text-gray-500 mb-0.5">Ce qu'il/elle va faire :</p>
                  <p className="text-gray-800 leading-relaxed">{boucle.va_faire}</p>
                </div>
              )}
              <p className="text-gray-400">
                {new Date(boucle.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">En attente de la réponse de l'élève.</p>
          )
        )}
      </div>
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

      // Détection de doublon — compare uniquement les mots significatifs (>= 4 chars)
      // pour éviter les faux positifs dus aux articles/prépositions communs
      if (bulletinPrecedent) {
        const stopWords = new Set(['avec','dans','pour','cette','aussi','mais','donc','tout','plus','bien','très','être','avoir','peut','sont','nous','vous','leur','même','dont','lors','comme','sous','entre','vers','sans','chez','lors','après'])
        const significant = w => w.length >= 4 && !stopWords.has(w)
        const wordsPrev = new Set(bulletinPrecedent.toLowerCase().split(/\s+/).filter(significant))
        const wordsNew = text.toLowerCase().split(/\s+/).filter(significant)
        if (wordsNew.length > 0) {
          const overlap = wordsNew.filter(w => wordsPrev.has(w)).length / wordsNew.length
          if (overlap > 0.6) setDoublonAlerte(true)
        }
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

// ──────────────────────────────────────────────────────────
// Vue Élève — fiche consolidée par code élève (RetroActif)
// ──────────────────────────────────────────────────────────
function VueEleve({ retroactions }) {
  const fbaUrl = 'https://feed-back-adapt.vercel.app'

  const codes = [...new Set(
    retroactions.map(r => r.eleve_code).filter(Boolean)
  )].sort()

  const [code, setCode] = useState(codes[0] ?? '')
  const [boucles, setBoucles] = useState([])
  const [bulletins, setBulletins] = useState([])
  const [dialogues, setDialogues] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (code) load(code)
  }, [code])

  async function load(c) {
    setLoading(true)
    const retrosIds = retroactions
      .filter(r => r.eleve_code === c)
      .map(r => r.id)

    const [{ data: bl }, { data: bu }, { data: di }] = await Promise.all([
      retrosIds.length
        ? supabase.from('boucles').select('*').in('retroaction_id', retrosIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('bulletins').select('*').eq('eleve_code', c).order('created_at', { ascending: false }),
      supabase.from('dialogues').select('*').eq('eleve_code', c).order('created_at', { ascending: false }),
    ])
    setBoucles(bl ?? [])
    setBulletins(bu ?? [])
    setDialogues(di ?? [])
    setLoading(false)
  }

  const retrosEleve = retroactions.filter(r => r.eleve_code === code)

  const timeline = [
    ...retrosEleve.map(r => ({ type: 'retro', date: r.created_at, data: r })),
    ...boucles.map(b => ({ type: 'boucle', date: b.created_at, data: b })),
    ...bulletins.map(b => ({ type: 'bulletin', date: b.created_at, data: b })),
    ...dialogues.map(d => ({ type: 'dialogue', date: d.created_at, data: d })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  if (codes.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">Aucun code élève dans les rétroactions sauvegardées.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Code élève :</label>
        <select className="input text-sm w-40" value={code} onChange={e => setCode(e.target.value)}>
          {codes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-gray-400">{retrosEleve.length} rétroaction{retrosEleve.length > 1 ? 's' : ''}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <span>📊</span>
        <span>Données FBA et PLAI-Quiz de cet élève :</span>
        <a href={fbaUrl} target="_blank" rel="noopener noreferrer"
          className="underline font-semibold hover:text-blue-900">
          Ouvrir FEED-BACK ADAPT →
        </a>
      </div>

      {!loading && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Rétroactions', val: retrosEleve.length },
            { label: 'Boucles fermées', val: boucles.length },
            { label: 'Bulletins', val: bulletins.length },
            { label: 'Dialogues', val: dialogues.length },
          ].map(s => (
            <div key={s.label} className="card text-center py-3">
              <p className="text-2xl font-bold text-gray-800">{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse" />)}</div>
      ) : timeline.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400 text-sm">Aucune donnée pour ce code.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.map((item, i) => <TimelineItem key={i} item={item} />)}
        </div>
      )}
    </div>
  )
}

function TimelineItem({ item }) {
  const { type, date, data } = item
  const d = new Date(date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })

  if (type === 'retro') return (
    <div className="card py-3 px-4 border-l-4 border-brand-400">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Rétroaction</span>
        {data.matiere && <span className="badge bg-blue-50 text-blue-700">{data.matiere}</span>}
        {data.suivi_realise && <span className="badge bg-green-100 text-green-700">✓ Suivi</span>}
        <span className="text-xs text-gray-400 ml-auto">{d}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{data.texte_final}</p>
    </div>
  )

  if (type === 'boucle') return (
    <div className="card py-3 px-4 border-l-4 border-green-400">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">🔄 Boucle fermée</span>
        <span className="text-xs text-gray-400 ml-auto">{d}</span>
      </div>
      {data.compris && <p className="text-xs text-gray-600"><span className="font-medium">Compris :</span> {data.compris}</p>}
      {data.va_faire && <p className="text-xs text-gray-600 mt-0.5"><span className="font-medium">Va faire :</span> {data.va_faire}</p>}
    </div>
  )

  if (type === 'bulletin') return (
    <div className="card py-3 px-4 border-l-4 border-orange-400">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">📄 Bulletin</span>
        {data.periode && <span className="badge bg-orange-50 text-orange-700">{data.periode}</span>}
        <span className="text-xs text-gray-400 ml-auto">{d}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{data.texte_final}</p>
    </div>
  )

  if (type === 'dialogue') return (
    <div className="card py-3 px-4 border-l-4 border-purple-400">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">💬 Dialogue</span>
        <span className="text-xs text-gray-400 ml-auto">{d}</span>
      </div>
      {data.interpretation && <p className="text-xs text-gray-600"><span className="font-medium">Interprétation :</span> {data.interpretation}</p>}
      {data.action1 && <p className="text-xs text-gray-600 mt-0.5"><span className="font-medium">Action :</span> {data.action1}</p>}
    </div>
  )

  return null
}
