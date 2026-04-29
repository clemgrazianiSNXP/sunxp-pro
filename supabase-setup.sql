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
