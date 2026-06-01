const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chauffeurNom, documentNom, signatureDate, envoyePar, signatureData } = await req.json();

    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0066cc;">✅ Document signé — SunXP Pro</h2>
        <p>Le document suivant a été signé électroniquement :</p>
        <div style="background:#f5f8ff;border:1px solid #ccd9ff;border-radius:8px;padding:16px;margin:16px 0;">
          <p><strong>Document :</strong> ${documentNom}</p>
          <p><strong>Signé par :</strong> ${chauffeurNom}</p>
          <p><strong>Date et heure :</strong> ${signatureDate}</p>
        </div>
        <div style="margin:16px 0;">
          <p><strong>Signature :</strong></p>
          <img src="${signatureData}" style="border:1px solid #ccc;border-radius:4px;max-width:300px;">
        </div>
        <p style="font-size:11px;color:#999;">Ce document a été signé électroniquement via SunXP Pro. Cette signature a valeur de preuve conformément à l'article 1366 du Code civil français.</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SunXP Pro <onboarding@resend.dev>',
        to: ['amazon.grazianisnxp@gmail.com'],
        subject: `✅ Document signé — ${documentNom} — ${chauffeurNom}`,
        html: emailBody,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
