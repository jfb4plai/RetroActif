-- ============================================================
-- RetroActif — Migration : préfixage des tables avec retro_
-- Projet partagé dfoaumjleqtxjeaplnna
-- À exécuter dans Supabase > SQL Editor
-- profiles intentionnellement NON renommée (table partagée inter-apps)
-- ============================================================

ALTER TABLE public.retroactions    RENAME TO retro_retroactions;
ALTER TABLE public.bulletins       RENAME TO retro_bulletins;
ALTER TABLE public.dialogues       RENAME TO retro_dialogues;
ALTER TABLE public.auto_evaluations RENAME TO retro_auto_evaluations;
ALTER TABLE public.boucles         RENAME TO retro_boucles;
ALTER TABLE public.peer_feedbacks  RENAME TO retro_peer_feedbacks;

-- Index
ALTER INDEX IF EXISTS retroactions_user_id_idx        RENAME TO retro_retroactions_user_id_idx;
ALTER INDEX IF EXISTS retroactions_eleve_code_idx     RENAME TO retro_retroactions_eleve_code_idx;
ALTER INDEX IF EXISTS retroactions_created_at_idx     RENAME TO retro_retroactions_created_at_idx;
ALTER INDEX IF EXISTS retroactions_type_obstacle_idx  RENAME TO retro_retroactions_type_obstacle_idx;
ALTER INDEX IF EXISTS retroactions_partage_token_idx  RENAME TO retro_retroactions_partage_token_idx;
ALTER INDEX IF EXISTS bulletins_user_id_idx           RENAME TO retro_bulletins_user_id_idx;
ALTER INDEX IF EXISTS bulletins_eleve_code_idx        RENAME TO retro_bulletins_eleve_code_idx;
ALTER INDEX IF EXISTS peer_feedbacks_user_id_idx      RENAME TO retro_peer_feedbacks_user_id_idx;
ALTER INDEX IF EXISTS peer_feedbacks_token_idx        RENAME TO retro_peer_feedbacks_token_idx;
