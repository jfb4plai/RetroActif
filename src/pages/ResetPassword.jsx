import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LogoPlai from '../components/LogoPlai'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase extrait automatiquement le token de l'URL (#access_token=...)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-jfb-beige to-jfb-beige-dk flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoPlai size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-jfb-noir">RetroActif</h1>
          <p className="text-jfb-gris mt-1 text-sm">Littératie à la rétroaction — PLAI</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Nouveau mot de passe</h2>

          {success ? (
            <div className="py-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-green-700 font-medium">Mot de passe modifié avec succès.</p>
              <p className="text-sm text-gray-500 mt-1">Redirection en cours...</p>
            </div>
          ) : !validSession ? (
            <div className="py-6 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-gray-600 text-sm">
                Lien invalide ou expiré. Recommencez la procédure de réinitialisation.
              </p>
              <button onClick={() => navigate('/login')} className="btn-primary mt-4 text-sm">
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  className="input"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
