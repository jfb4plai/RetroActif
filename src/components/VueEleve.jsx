import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STOP_WORDS = new Set([
  'avec','dans','pour','cette','aussi','mais','donc','tout','plus','bien',
  'très','être','avoir','peut','sont','nous','vous','leur','même','dont',
  'lors','comme','sous','entre','vers','sans','après','elle','lui','ils',
  'elles','pas','sur','par','les','des','une','que','qui','est','son','ses',
  'plus','peu','trop','fait','doit','fait','dans','plus','lors','encore',
])

function computePatterns(retros) {
  const freq = {}
  retros.forEach(r => {
    if (!r.difficultes) return
    r.difficultes
      .toLowerCase()
      .split(/[\s,;.!?()]+/)
      .filter(w => w.length >= 4 && !STOP_WORDS.has(w))
      .forEach(w => { freq[w] = (freq[w] ?? 0) + 1 })
  })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mot, n]) => ({ mot, n }))
}

export default function VueEleve({ retroactions }) {
  const fbaUrl = 'https://feed-back-adapt.vercel.app'

  const codes = [...new Set(
    retroactions.map(r => r.eleve_code).filter(Boolean)
  )].sort()

  const [code, setCode] = useState(codes[0] ?? '')
  const [boucles, setBoucles] = useState([])
  const [bulletins, setBulletins] = useState([])
  const [dialogues, setDialogues] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('liste') // 'liste' | 'detail'
  const [bouclesEnAttente, setBouclesEnAttente] = useState(new Set())

  useEffect(() => {
    if (code) load(code)
  }, [code])

  useEffect(() => {
    loadBouclesEnAttente()
  }, [retroactions])

  async function loadBouclesEnAttente() {
    const avecToken = retroactions.filter(r => r.partage_token)
    if (avecToken.length === 0) return

    const ids = avecToken.map(r => r.id)
    const { data } = await supabase
      .from('retro_boucles')
      .select('retroaction_id')
      .in('retroaction_id', ids)

    const fermeesIds = new Set((data ?? []).map(b => b.retroaction_id))
    const enAttente = new Set(
      avecToken
        .filter(r => !fermeesIds.has(r.id))
        .map(r => r.eleve_code)
        .filter(Boolean)
    )
    setBouclesEnAttente(enAttente)
  }

  async function load(c) {
    setLoading(true)
    const retrosIds = retroactions
      .filter(r => r.eleve_code === c)
      .map(r => r.id)

    const [{ data: bl }, { data: bu }, { data: di }] = await Promise.all([
      retrosIds.length
        ? supabase.from('retro_boucles').select('*').in('retroaction_id', retrosIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('retro_bulletins').select('*').eq('eleve_code', c).order('created_at', { ascending: false }),
      supabase.from('retro_dialogues').select('*').eq('eleve_code', c).order('created_at', { ascending: false }),
    ])
    setBoucles(bl ?? [])
    setBulletins(bu ?? [])
    setDialogues(di ?? [])
    setLoading(false)
  }

  const navigate = useNavigate()

  const retrosEleve = retroactions.filter(r => r.eleve_code === code)
  const patterns = computePatterns(retrosEleve)

  const timeline = [
    ...retrosEleve.map(r => ({ type: 'retro', date: r.created_at, data: r })),
    ...boucles.map(b => ({ type: 'boucle', date: b.created_at, data: b })),
    ...bulletins.map(b => ({ type: 'bulletin', date: b.created_at, data: b })),
    ...dialogues.map(d => ({ type: 'dialogue', date: d.created_at, data: d })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const elevesListe = codes.map(c => {
    const retros = retroactions.filter(r => r.eleve_code === c)
    const derniere = retros[0]
    return {
      code: c,
      nbRetros: retros.length,
      derniereDate: derniere?.created_at,
      derniereMatiere: derniere?.matiere,
      enAttente: bouclesEnAttente.has(c),
    }
  })

  if (codes.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">Aucun code élève dans les rétroactions sauvegardées.</p>
      </div>
    )
  }

  if (mode === 'liste') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">{codes.length} élève{codes.length > 1 ? 's' : ''} avec rétroactions sauvegardées</p>
        <div className="grid grid-cols-1 gap-2">
          {elevesListe.map(e => (
            <button
              key={e.code}
              onClick={() => { setCode(e.code); setMode('detail') }}
              className="card py-3 px-4 text-left hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{e.code}</span>
                  {e.enAttente && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Boucle en attente
                    </span>
                  )}
                  {e.derniereMatiere && (
                    <span className="badge bg-blue-50 text-blue-700">{e.derniereMatiere}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {e.nbRetros} rétroaction{e.nbRetros > 1 ? 's' : ''} —
                  dernière le {e.derniereDate
                    ? new Date(e.derniereDate).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // mode === 'detail': existing view, wrapped with back button
  return (
    <div className="space-y-4">
      <button
        onClick={() => setMode('liste')}
        className="text-sm text-jfb-rose hover:underline flex items-center gap-1"
      >
        ← Tous les élèves
      </button>

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
            { label: 'retro_bulletins', val: bulletins.length },
            { label: 'retro_dialogues', val: dialogues.length },
          ].map(s => (
            <div key={s.label} className="card text-center py-3">
              <p className="text-2xl font-bold text-gray-800">{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && patterns.length > 0 && (
        <div className="card border-l-4 border-jfb-rose space-y-2 py-3 px-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Difficultés récurrentes</p>
          <div className="flex flex-wrap gap-2">
            {patterns.map(({ mot, n }) => (
              <span key={mot} className="bg-red-50 text-red-700 text-xs px-3 py-1 rounded-full border border-red-200">
                {mot} <span className="opacity-60">×{n}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400">Termes les plus fréquents dans les champs "difficultés" — analyse locale, non exhaustive.</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/constructeur?eleve_code=${encodeURIComponent(code)}`)}
          className="text-sm text-jfb-rose border border-jfb-rose rounded-lg px-4 py-2 hover:bg-jfb-beige transition-colors"
        >
          + Nouvelle rétroaction pour {code}
        </button>
      </div>

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
    <div className="card py-3 px-4 border-l-4 border-jfb-rose">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-jfb-rose uppercase tracking-wide">Rétroaction</span>
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
