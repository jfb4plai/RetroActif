/**
 * BouclePage — Page publique "Fermer la boucle"
 *
 * Accessible sans connexion via /boucle/:token
 * L'élève lit la rétroaction de son enseignant et répond :
 *   - Ce que j'ai compris
 *   - Ce que je vais faire
 *
 * Références pédagogiques :
 * - Nicol & Macfarlane-Dick (2006) — hal-04621117 (RISS ✓)
 * - De Khovrine (2023) — tel-04860619 (RISS ✓)
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LS_KEY = 'ra_boucle_done'

export default function BouclePage() {
  const { token } = useParams()

  const [retro, setRetro] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | not-found | form | done | already-done
  const [compris, setCompris] = useState('')
  const [vaFaire, setVaFaire] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [token])

  async function load() {
    // Vérification anti-double soumission côté client
    try {
      const done = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
      if (done.includes(token)) {
        setPhase('already-done')
        return
      }
    } catch {}

    const { data, error } = await supabase
      .from('retroactions')
      .select('id, texte_final, matiere, eleve_code, niveau, partage_token')
      .eq('partage_token', token)
      .single()

    if (error || !data) {
      setPhase('not-found')
      return
    }

    setRetro(data)
    setPhase('form')
  }

  async function submit() {
    if (!compris.trim() && !vaFaire.trim()) {
      setError('Remplis au moins un des deux champs.')
      return
    }
    setError('')
    setSubmitting(true)

    const { error } = await supabase.from('boucles').insert({
      retroaction_id: retro.id,
      token,
      eleve_code: retro.eleve_code ?? null,
      compris: compris.trim() || null,
      va_faire: vaFaire.trim() || null,
    })

    if (error) {
      setError('Erreur lors de l\'envoi. Réessaie dans un moment.')
      setSubmitting(false)
      return
    }

    // Mémoriser côté client pour éviter double soumission
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
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">RetroActif</p>
            <p className="text-xs text-gray-500">Pôle Liégeois d'Accompagnement vers une École Inclusive</p>
          </div>
        </div>

        {/* États */}
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

        {phase === 'already-done' && (
          <div className="card text-center py-16 space-y-3">
            <p className="text-4xl">✅</p>
            <h1 className="font-bold text-gray-800">Réponse déjà envoyée</h1>
            <p className="text-sm text-gray-500">Tu as déjà répondu à cette rétroaction. Ton enseignant peut voir ta réponse.</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="card text-center py-16 space-y-3">
            <p className="text-4xl">✅</p>
            <h1 className="font-bold text-gray-800">Réponse envoyée</h1>
            <p className="text-sm text-gray-500">Ton enseignant peut maintenant voir ce que tu as compris et ce que tu vas faire.</p>
          </div>
        )}

        {phase === 'form' && retro && (
          <div className="space-y-5">
            {/* Rétroaction */}
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📩</span>
                <h1 className="font-bold text-gray-900">Rétroaction de ton enseignant</h1>
              </div>

              {(retro.matiere || retro.eleve_code) && (
                <div className="flex gap-3 text-xs text-gray-500">
                  {retro.matiere && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{retro.matiere}</span>}
                  {retro.eleve_code && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Élève : {retro.eleve_code}</span>}
                </div>
              )}

              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{retro.texte_final}</p>
              </div>
            </div>

            {/* Formulaire de réponse */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <h2 className="font-bold text-gray-900">Ferme la boucle</h2>
              </div>
              <p className="text-xs text-gray-500">
                Lis la rétroaction, puis réponds aux deux questions. Ton enseignant verra ta réponse dans RetroActif.
              </p>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Ce que j'ai compris de cette rétroaction
                </label>
                <textarea
                  className="input min-h-[90px] resize-y text-sm"
                  placeholder="Dis avec tes propres mots ce que tu as retenu..."
                  value={compris}
                  onChange={e => setCompris(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Ce que je vais faire concrètement
                </label>
                <textarea
                  className="input min-h-[90px] resize-y text-sm"
                  placeholder="Une action précise que tu vas poser..."
                  value={vaFaire}
                  onChange={e => setVaFaire(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                className="btn-primary w-full"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? 'Envoi...' : 'Envoyer ma réponse →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
