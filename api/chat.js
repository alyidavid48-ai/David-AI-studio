export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const sys = "You are David AI, an advanced AI assistant created and owned by Niyongira David.";

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
    return { reply: d.choices[0].message.content };
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
    return { reply: d.candidates[0].content.parts[0].text };
  }

  const gKey = process.env.davidalyiai || userApiKey;
  const mKey = process.env.davidalyi || userApiKey;
  let lastErr = "No keys configured";

  if (gKey) {
    try {
      const resData = await callGroq(gKey);
      if (resData.reply) return res.status(200).json({ reply: resData.reply, usedProvider: "David AI" });
    } catch (e) { lastErr = e.message; }
  }

  if (mKey) {
    try {
      const resData = await callGemini(mKey);
      if (resData.reply) return res.status(200).json({ reply: resData.reply, usedProvider: "David AI" });
    } catch (e) { lastErr = e.message; }
  }

  return res.status(502).json({ error: `Connection failed: ${lastErr}` });
}
