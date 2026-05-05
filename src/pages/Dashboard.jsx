import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { TYPES_RETROACTION, DIMENSIONS_LITTERATIE } from '../lib/constants'

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, semaine: 0, bulletins: 0, suivis: 0 })
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: retros }, { data: bulletins }] = await Promise.all([
      supabase.from('retroactions').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('bulletins').select('id').limit(50),
    ])

    const semaineDerniere = new Date()
    semaineDerniere.setDate(semaineDerniere.getDate() - 7)
    const cettesSemaine = (retros ?? []).filter(r => new Date(r.created_at) > semaineDerniere)

    setStats({
      total: (retros ?? []).length,
      semaine: cettesSemaine.length,
      bulletins: (bulletins ?? []).length,
      suivis: (retros ?? []).filter(r => r.suivi_prevu).length,
    })
    setRecentes(retros ?? [])
    setLoading(false)
  }

  const typeLabel = (val) => TYPES_RETROACTION.find(t => t.value === val)?.label ?? val
  const typeIcon = (val) => TYPES_RETROACTION.find(t => t.value === val)?.icon ?? '•'

  const ACTIONS_RAPIDES = [
    {
      icon: '✨',
      title: 'Nouvelle rétroaction',
      desc: 'Construire avec assistance IA',
      color: 'bg-brand-600 hover:bg-brand-700 text-white',
      to: '/constructeur',
    },
    {
      icon: '🔀',
      title: 'Logigramme',
      desc: 'Vérifier une rétroaction existante',
      color: 'bg-purple-600 hover:bg-purple-700 text-white',
      to: '/atelier',
    },
    {
      icon: '📄',
      title: 'Générer un bulletin',
      desc: 'Depuis les rétroactions sauvegardées',
      color: 'bg-accent-500 hover:bg-accent-600 text-white',
      to: '/suivi?action=bulletin',
    },
    {
      icon: '📚',
      title: 'Bibliothèque',
      desc: 'Exemples par niveau et matière',
      color: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
      to: '/bibliotheque',
    },
  ]

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour{profile?.prenom ? `, ${profile.prenom}` : ''} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.matiere && `${profile.matiere} • `}
          {new Date().toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Rétroactions', value: stats.total, icon: '✏️', color: 'text-brand-600' },
          { label: 'Cette semaine', value: stats.semaine, icon: '📅', color: 'text-purple-600' },
          { label: 'Bulletins générés', value: stats.bulletins, icon: '📄', color: 'text-accent-500' },
          { label: 'Suivis prévus', value: stats.suivis, icon: '✅', color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card py-4">
            <div className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS_RAPIDES.map(a => (
            <button key={a.to} onClick={() => navigate(a.to)}
              className={`${a.color} rounded-xl p-4 text-left transition-colors shadow-sm`}>
              <div className="text-2xl mb-2">{a.icon}</div>
              <div className="font-semibold text-sm">{a.title}</div>
              <div className="text-xs opacity-80 mt-0.5">{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Guide de démarrage (visible uniquement si aucune rétroaction) */}
      {!loading && stats.total === 0 && (
        <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <h2 className="text-sm font-semibold text-brand-700 uppercase tracking-wider mb-4">
            Par où commencer ?
          </h2>
          <div className="space-y-3">
            {[
              {
                step: 1,
                icon: '📚',
                title: 'Découvrir des exemples',
                desc: 'Consultez la bibliothèque pour voir des rétroactions concrètes par niveau et matière.',
                to: '/bibliotheque',
                cta: 'Ouvrir la bibliothèque',
              },
              {
                step: 2,
                icon: '✨',
                title: 'Créer votre première rétroaction',
                desc: 'Le constructeur vous guide pas à pas. L\'IA propose, vous personnalisez (mode débutant recommandé).',
                to: '/constructeur',
                cta: 'Aller au constructeur',
                primary: true,
              },
              {
                step: 3,
                icon: '🔀',
                title: 'Vérifier avec le logigramme',
                desc: 'Entrez une rétroaction existante et suivez l\'arbre de décision pour l\'améliorer.',
                to: '/atelier',
                cta: 'Ouvrir le logigramme',
              },
              {
                step: 4,
                icon: '📊',
                title: 'Suivre vos élèves',
                desc: 'Retrouvez l\'historique par élève (code anonyme) et générez les commentaires de bulletin.',
                to: '/suivi',
                cta: 'Voir le suivi',
              },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg hover:bg-brand-50 transition-colors group">
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span className="text-sm font-semibold text-gray-800">{item.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => navigate(item.to)}
                  className={`text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${
                    item.primary
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 group-hover:bg-brand-100 group-hover:text-brand-700'
                  }`}
                >
                  {item.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rétroactions récentes */}
      {(!loading && stats.total > 0) && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Dernières rétroactions</h2>
            <button onClick={() => navigate('/suivi')} className="text-xs text-brand-600 hover:underline">
              Voir tout
            </button>
          </div>
          <div className="space-y-2">
            {recentes.map(r => (
              <div key={r.id} className="card py-3 px-4 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => navigate(`/suivi?id=${r.id}`)}>
                <span className="text-lg">{typeIcon(r.type_retroaction)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{typeLabel(r.type_retroaction)}</span>
                    {r.eleve_code && (
                      <span className="badge bg-gray-100 text-gray-600">{r.eleve_code}</span>
                    )}
                    {r.suivi_prevu && (
                      <span className="badge bg-green-100 text-green-700">Suivi prévu</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-1 line-clamp-2">{r.texte_final}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleDateString('fr-BE')}
                    {r.matiere && ` • ${r.matiere}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="card animate-pulse h-32" />}

      {/* Rappel dimensions */}
      <div className="card bg-gradient-to-r from-brand-50 to-purple-50 border-brand-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Les 4 dimensions de la littératie à la rétroaction
          <span className="text-xs font-normal text-gray-400 ml-2">Carless & Boud (2018)</span>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DIMENSIONS_LITTERATIE.map(d => (
            <div key={d.id} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${d.dot}`} />
              <div>
                <div className="text-xs font-medium text-gray-700">{d.label}</div>
                <div className="text-xs text-gray-400">{d.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
