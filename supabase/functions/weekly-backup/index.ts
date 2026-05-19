import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const tables = [
    'stations', 'chauffeurs', 'responsables', 'heures', 'stats', 'primes',
    'activite', 'planning', 'planning_meta', 'planning_published', 'degats',
    'camions', 'repos_demandes', 'acomptes', 'conges_payes', 'cles_codes',
    'problemes_camions', 'user_profiles', 'eos', 'concessions', 'retards', 'suivi_papiers'
  ]

  const today = new Date().toISOString().slice(0, 10)
  const backup: Record<string, any> = {
    version: '1.0',
    date: new Date().toISOString(),
    tables_count: 0,
    tables: {}
  }

  // Récupérer toutes les données
  for (const table of tables) {
    try {
      const { data } = await supabase.from(table).select('*')
      backup.tables[table] = data || []
    } catch (_) {
      backup.tables[table] = []
    }
  }
  backup.tables_count = Object.keys(backup.tables).filter(k => backup.tables[k].length > 0).length

  // Convertir en JSON
  const jsonStr = JSON.stringify(backup, null, 2)
  const jsonBase64 = btoa(unescape(encodeURIComponent(jsonStr)))

  // Envoyer par email via Resend
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  let emailSent = false
  let emailError = ''

  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: 'amazon.grazianisnxp@gmail.com',
          subject: `[SunXP Pro] Backup automatique du ${today}`,
          html: `
            <h2>📦 Backup SunXP Pro</h2>
            <p><strong>Date :</strong> ${today}</p>
            <p><strong>Tables sauvegardées :</strong> ${backup.tables_count}</p>
            <p><strong>Taille :</strong> ${(jsonStr.length / 1024).toFixed(0)} KB</p>
            <hr>
            <p style="color:#666;font-size:12px;">Ce backup a été généré automatiquement par SunXP Pro.</p>
          `,
          attachments: [{
            filename: `sunxp-backup-${today}.json`,
            content: jsonBase64
          }]
        })
      })

      if (res.ok) {
        emailSent = true
      } else {
        const errBody = await res.text()
        emailError = `HTTP ${res.status}: ${errBody}`
      }
    } catch (e) {
      emailError = e.message
    }
  } else {
    emailError = 'RESEND_API_KEY non configurée'
  }

  // Sauvegarder dans app_settings
  try {
    const { data: histData } = await supabase.from('app_settings').select('value').eq('key', 'backup_history').maybeSingle()
    const history = (histData?.value && Array.isArray(histData.value)) ? histData.value : []
    history.unshift({
      date: new Date().toISOString(),
      email: 'auto (weekly-backup)',
      tables: backup.tables_count,
      status: emailSent ? 'sent' : 'error',
      error: emailError || undefined
    })
    if (history.length > 20) history.length = 20
    await supabase.from('app_settings').upsert({
      key: 'backup_history',
      value: history,
      updated_at: new Date().toISOString(),
      updated_by: 'weekly-backup'
    })
  } catch (_) {}

  return new Response(JSON.stringify({
    success: emailSent,
    date: today,
    tables: backup.tables_count,
    error: emailError || undefined
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
