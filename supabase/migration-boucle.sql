-- ══════════════════════════════════════════════════════════════
-- RetroActif — Migration "Fermer la boucle"
-- À exécuter dans l'éditeur SQL Supabase (projet dfoaumjleqtxjeaplnna)
-- ══════════════════════════════════════════════════════════════

-- 1. Token de partage sur les rétroactions
ALTER TABLE public.retroactions
  ADD COLUMN IF NOT EXISTS partage_token uuid DEFAULT NULL;

CREATE INDEX IF NOT EXISTS retroactions_partage_token_idx
  ON public.retroactions(partage_token)
  WHERE partage_token IS NOT NULL;

-- 2. Permettre la lecture publique d'une rétroaction via son token
--    (token UUID 128 bits = lien non-devinable, modèle "lien partagé")
CREATE POLICY "Lecture via token de partage" ON public.retroactions
  FOR SELECT USING (partage_token IS NOT NULL);

-- 3. Table des réponses élèves
CREATE TABLE IF NOT EXISTS public.boucles (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  retroaction_id   uuid REFERENCES public.retroactions(id) ON DELETE CASCADE NOT NULL,
  token            uuid NOT NULL,       -- doit correspondre à retroactions.partage_token
  eleve_code       text,                -- code anonyme (optionnel, saisi par l'élève)
  compris          text,                -- "Ce que j'ai compris"
  va_faire         text,                -- "Ce que je vais faire"
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.boucles ENABLE ROW LEVEL SECURITY;

-- L'enseignant lit les réponses de ses propres rétroactions
CREATE POLICY "Lecture enseignant" ON public.boucles
  FOR SELECT USING (
    retroaction_id IN (
      SELECT id FROM public.retroactions WHERE user_id = auth.uid()
    )
  );

-- Tout le monde peut soumettre une réponse si le token est valide
CREATE POLICY "Réponse élève" ON public.boucles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.retroactions
      WHERE id = retroaction_id
        AND partage_token = token
    )
  );
