-- Planification du backup automatique hebdomadaire
-- À exécuter dans Supabase SQL Editor (nécessite l'extension pg_cron activée)
-- Déclenche la sauvegarde tous les lundis à 8h UTC

select cron.schedule(
  'weekly-backup',
  '0 8 * * 1',
  $$ select net.http_post(
    url := current_setting('supabase.functions_endpoint') || '/weekly-backup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) $$
);
