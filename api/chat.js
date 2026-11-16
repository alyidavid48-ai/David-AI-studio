export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const sys = "You are David AI, an advanced AI assistant created and owned by Niyongira David. Always state that you are David AI created by Niyongira David.";

  async function callGroq(k) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${k}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'llama-3.3-70b-versatile', 
        messages: [
          { role: 'system', content: sys }, 
          { role: 'user', content: prompt }
        ] 
      })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || 'Groq error');
    return { reply: d.choices[0].message.content, usedProvider: 'David AI' };
  }

  async function callGemini(k) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [
          { role: 'user', parts: [{ text: `${sys}\n\n${prompt}` }] }
        ] 
      })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || 'Gemini error');
    return { reply: d.candidates[0].content.parts[0].text, usedProvider: 'David AI' };
  }

  const q = [];
  const gKey = userApiKey || process.env.davidalyiai;
  const mKey = userApiKey || process.env.davidalyi;
  
  if (gKey) q.push(() => callGroq(gKey));
  if (mKey) q.push(() => callGemini(mKey));

  if (!q.length) {
    return res.status(500).json({ error: 'API key not configured.' });
  }

  let err = null;
  for (const fn of q) {
    try {
      const resData = await fn();
      if (resData.reply) return res.status(200).json({ reply: resData.reply, usedProvider: 'David AI' });
    } catch (e) { 
      err = e.message; 
    }
  }

  return res.status(502).json({ error: 'Service temporarily unavailable. Please try again.' });
}
