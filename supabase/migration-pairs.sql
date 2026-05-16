-- ══════════════════════════════════════════════════════════════
-- RetroActif — Migration "Feedback entre pairs"
-- À exécuter dans l'éditeur SQL Supabase (projet dfoaumjleqtxjeaplnna)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.peer_feedbacks (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  token                 uuid DEFAULT uuid_generate_v4(),   -- lien partageable (élève donneur)

  eleve_donneur         text NOT NULL,   -- code élève qui donne le retour
  eleve_receveur        text NOT NULL,   -- code élève qui reçoit le retour
  description_travail   text,            -- description du travail à évaluer (rédigée par l'enseignant)
  criteres              jsonb NOT NULL DEFAULT '[]',  -- ["Clarté", "Organisation", "Pertinence"]

  -- Réponse soumise par l'élève donneur
  feedback_notes        jsonb,           -- {0: 3, 1: 2, 2: 4}  (1–4 par critère)
  feedback_commentaires jsonb,           -- {0: "...", 1: "...", 2: "..."}
  soumis                boolean DEFAULT false,

  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS peer_feedbacks_user_id_idx ON public.peer_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS peer_feedbacks_token_idx ON public.peer_feedbacks(token) WHERE token IS NOT NULL;

ALTER TABLE public.peer_feedbacks ENABLE ROW LEVEL SECURITY;

-- L'enseignant gère ses propres assignments
CREATE POLICY "Pairs — lecture/création enseignant" ON public.peer_feedbacks
  FOR ALL USING (auth.uid() = user_id);

-- Lecture publique via token (affichage de la fiche pour l'élève donneur)
CREATE POLICY "Pairs — lecture via token" ON public.peer_feedbacks
  FOR SELECT USING (token IS NOT NULL);

-- Soumission publique : UPDATE uniquement si token valide et pas encore soumis
CREATE POLICY "Pairs — soumission élève" ON public.peer_feedbacks
  FOR UPDATE USING (token IS NOT NULL AND soumis = false);
