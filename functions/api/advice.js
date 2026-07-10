// Cloudflare Pages Function: /api/advice
// This file lives at functions/api/advice.js and Cloudflare Pages automatically
// turns it into a serverless endpoint at yoursite.pages.dev/api/advice
//
// Setup:
// 1. Connect this GitHub repo to Cloudflare Pages (Workers & Pages -> Create -> Pages -> Connect to Git).
// 2. In your Cloudflare Pages project settings -> Environment Variables, add:
//      Name:  ANTHROPIC_API_KEY
//      Value: your key from https://console.anthropic.com/
// 3. Redeploy (Cloudflare redeploys automatically on every push to GitHub).

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const habits = body && body.habits;
  if (!Array.isArray(habits) || habits.length === 0) {
    return new Response(JSON.stringify({ error: 'No habit data provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const summary = habits
    .map(h => `- ${h.name}: current streak ${h.streak} din, pichle 7 din mein ${h.last7Done}/7 din complete`)
    .join('\n');

  const prompt =
    'Aap ek dosaana, samajhdaar habit coach hain. Neeche user ki habits ka data hai:\n\n' +
    summary +
    '\n\nIss data ko dekh kar Roman Urdu (Hinglish nahi, khaalis Roman Urdu) mein, garmjoshi bhare lekin seedhe andaaz mein, chhota sa (120 se 160 lafzon ka) mashware dein. Jo habits kamzor hain unke liye ek chhota practical tip dein, aur jo strong hain unki tareef karein. Koi headings ya bullet points na lagayein, sirf rawan paragraph likhein.';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    return new Response(JSON.stringify({ advice: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
