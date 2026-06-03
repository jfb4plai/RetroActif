import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'

import Login         from './pages/Login'
import Onboarding    from './pages/Onboarding'
import Dashboard     from './pages/Dashboard'
import Module1_Atelier      from './pages/Module1_Atelier'
import Module2_Suivi        from './pages/Module2_Suivi'
import Module3_Dialogue     from './pages/Module3_Dialogue'
import Module4_Bibliotheque from './pages/Module4_Bibliotheque'
import Module5_Progression  from './pages/Module5_Progression'
import Module6_Constructeur from './pages/Module6_Constructeur'
import ResetPassword       from './pages/ResetPassword'
import References          from './pages/References'
import BouclePage          from './pages/BouclePage'
import PeerPage            from './pages/PeerPage'
import Module7_Pairs       from './pages/Module7_Pairs'

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jfb-beige">
        <div className="text-center">
          <div className="w-12 h-12 bg-jfb-noir rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-white text-lg font-bold">RA</span>
          </div>
          <p className="text-jfb-rose text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  // Route publique — accessible sans connexion (lien élève "Fermer la boucle")
  // Vérifiée en premier pour éviter la redirection vers /login
  if (window.location.pathname.startsWith('/boucle/')) {
    return <Routes><Route path="/boucle/:token" element={<BouclePage />} /></Routes>
  }
  if (window.location.pathname.startsWith('/peer/')) {
    return <Routes><Route path="/peer/:token" element={<PeerPage />} /></Routes>
  }

  // Non connecté → login (reset-password accessible sans auth car Supabase gère la session via le token URL)
  if (!user) {
    return (
      <Routes>
        <Route path="/login"          element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*"               element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Connecté mais pas encore de profil → onboarding
  if (!profile) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/boucle/:token" element={<BouclePage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  // Connecté avec profil → app complète
  return (
    <Layout>
      <Routes>
        <Route path="/"             element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"        element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/constructeur" element={<Module6_Constructeur />} />
        <Route path="/atelier"      element={<Module1_Atelier />} />
        <Route path="/suivi"        element={<Module2_Suivi />} />
        <Route path="/dialogue"     element={<Module3_Dialogue />} />
        <Route path="/bibliotheque" element={<Module4_Bibliotheque />} />
        <Route path="/progression"  element={<Module5_Progression />} />
        <Route path="/references"   element={<References />} />
        <Route path="/boucle/:token" element={<BouclePage />} />
        <Route path="/peer/:token"   element={<PeerPage />} />
        <Route path="/pairs"         element={<Module7_Pairs />} />
        <Route path="*"             element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
