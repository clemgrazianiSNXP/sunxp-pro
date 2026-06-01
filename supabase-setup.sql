-- ============================================================
-- SunXP Pro — Création des tables Supabase
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. Table des stations
CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  ville TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des chauffeurs (répertoire)
CREATE TABLE IF NOT EXISTS chauffeurs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT DEFAULT '',
  id_amazon TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chauffeurs_station ON chauffeurs(station_id);
CREATE INDEX IF NOT EXISTS idx_chauffeurs_amazon ON chauffeurs(id_amazon);

-- 3. Table des heures journalières
CREATE TABLE IF NOT EXISTS heures (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  date_jour DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, date_jour)
);

-- 4. Table des statistiques (DS/DPMO, POD, DWC)
CREATE TABLE IF NOT EXISTS stats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'dsdpmo', 'pod', 'dwc'
  semaine TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, type, semaine)
);

-- 5. Table des primes
CREATE TABLE IF NOT EXISTS primes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  annee INT NOT NULL,
  mois INT NOT NULL, -- 1-12
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, annee, mois)
);

-- 6. Table de l'activité journalière
CREATE TABLE IF NOT EXISTS activite (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  date_jour DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, date_jour)
);

-- 7. Table des concessions
CREATE TABLE IF NOT EXISTS concessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  semaine TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, semaine)
);

-- 8. Table des retards
CREATE TABLE IF NOT EXISTS retards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  semaine TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, semaine)
);

-- 9. Table des dégâts véhicules
CREATE TABLE IF NOT EXISTS degats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  degat_id TEXT NOT NULL,
  plaque TEXT NOT NULL,
  chauffeur TEXT NOT NULL,
  date_incident DATE NOT NULL,
  description TEXT DEFAULT '',
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_degats_station ON degats(station_id);

-- 10. Table des camions
CREATE TABLE IF NOT EXISTS camions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);

-- 11. Table des documents
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);

-- 12. Table des demandes de repos
CREATE TABLE IF NOT EXISTS repos_demandes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);

-- ============================================================
-- Row Level Security (RLS) — Désactivé pour l'instant
-- On l'activera quand on ajoutera l'authentification
-- ============================================================
-- Pour l'instant, toutes les tables sont accessibles avec la clé anon
-- C'est OK pour le développement, on sécurisera après

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chauffeurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE heures ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE primes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activite ENABLE ROW LEVEL SECURITY;
ALTER TABLE concessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE retards ENABLE ROW LEVEL SECURITY;
ALTER TABLE degats ENABLE ROW LEVEL SECURITY;
ALTER TABLE camions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos_demandes ENABLE ROW LEVEL SECURITY;

-- Policies temporaires : accès total avec la clé anon (à remplacer par auth plus tard)
CREATE POLICY "allow_all" ON stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON chauffeurs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON heures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON primes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON activite FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON concessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON retards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON degats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON camions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON repos_demandes FOR ALL USING (true) WITH CHECK (true);

-- 13. Table EOS (extraction)
CREATE TABLE IF NOT EXISTS eos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  date_jour DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, date_jour)
);
ALTER TABLE eos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON eos FOR ALL USING (true) WITH CHECK (true);

-- 14. Table Acomptes (demandes chauffeurs)
CREATE TABLE IF NOT EXISTS acomptes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);
ALTER TABLE acomptes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON acomptes FOR ALL USING (true) WITH CHECK (true);

-- 15. Table Congés Payés (demandes chauffeurs)
CREATE TABLE IF NOT EXISTS conges_payes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);
ALTER TABLE conges_payes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON conges_payes FOR ALL USING (true) WITH CHECK (true);

-- 16. Table Clés & Codes (partagés entre chauffeurs)
CREATE TABLE IF NOT EXISTS cles_codes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);
ALTER TABLE cles_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON cles_codes FOR ALL USING (true) WITH CHECK (true);

-- 17. Table Problèmes Camions (signalements partagés)
CREATE TABLE IF NOT EXISTS problemes_camions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);
ALTER TABLE problemes_camions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON problemes_camions FOR ALL USING (true) WITH CHECK (true);

-- 18. Table Profils Utilisateurs (auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'chauffeur' CHECK (role IN ('responsable', 'chauffeur')),
  station_id TEXT REFERENCES stations(id) ON DELETE SET NULL,
  chauffeur_id TEXT DEFAULT '',
  nom TEXT DEFAULT '',
  prenom TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "allow_all_anon" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 19. Table App Settings (admin — mode maintenance, config)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT ''
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- 20. Table Activity Logs (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  station_id TEXT REFERENCES stations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_email ON activity_logs(email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- Fonction utilitaire : taille de la base de données en MB
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS NUMERIC
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database()) / (1024.0 * 1024.0);
$$;

-- 21. Table Suivi Entretien (véhicules)
CREATE TABLE IF NOT EXISTS suivi_entretien (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);
ALTER TABLE suivi_entretien ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON suivi_entretien FOR ALL USING (true) WITH CHECK (true);

-- 22. Table Suivi Papiers (documents véhicules)
CREATE TABLE IF NOT EXISTS suivi_papiers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id)
);
ALTER TABLE suivi_papiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON suivi_papiers FOR ALL USING (true) WITH CHECK (true);
