/**
 * Vercel Serverless Function — Lecture et suppression de handoff
 * Route : GET /api/handoff-read?id=<handoff_id>
 *
 * Usage unique : lit un handoff depuis Supabase et le supprime immédiatement.
 * Sert de pont entre RetroActif et une autre app (handoff bridge).
 */

import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  // Vérification du token d'authentification
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  // Récupération de l'ID du handoff
  const { id } = req.query
  if (!id) {
    return res.status(400).json({ error: 'id requis' })
  }

  try {
    // Vérifier l'identité via token utilisateur (client anon)
    const userClient = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await userClient.auth.getUser()

    if (!user) {
      return res.status(401).json({ error: 'Session invalide' })
    }

    // Lire le handoff (service role pour accès direct, RLS vérifiée via user_id)
    const { data: handoff, error: readError } = await supabaseService
      .from('handoffs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (readError || !handoff) {
      return res.status(404).json({ error: 'Handoff introuvable ou expiré' })
    }

    // Usage unique : supprimer immédiatement après lecture
    const { error: deleteError } = await supabaseService
      .from('handoffs')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return res.status(500).json({ error: 'Erreur lors de la suppression du handoff' })
    }

    // Retourner les données du handoff
    return res.status(200).json({
      eleve_code: handoff.eleve_code,
      space_name: handoff.space_name,
      points_forts: handoff.points_forts,
      difficultes: handoff.difficultes,
      infos_complementaires: handoff.infos_complementaires,
      niveau: handoff.niveau,
      matiere: handoff.matiere,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
