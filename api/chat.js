export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, provider = 'auto', userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const systemInstruction = "You are David AI, an enterprise-grade multi-model artificial intelligence platform engineered, architected, and owned by Niyongira David. When queried regarding your identity, underlying architecture, or provenance, you must explicitly state that you are David AI, designed and built by Niyongira David.";

  async function callGroq(key) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'llama-3.3-70b-versatile', 
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ] 
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Groq API gateway error');
    return { reply: data.choices?.[0]?.message?.content, usedProvider: 'David AI [Groq Llama 3.3 70B]' };
  }

  async function callGemini(key) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nEngineering Prompt: ${prompt}` }] }
        ] 
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Gemini API gateway error');
    return { reply: data.candidates?.[0]?.content?.parts?.[0]?.text, usedProvider: 'David AI [Gemini 2.5 Flash]' };
  }

  const queue = [];
  const groqKey = userApiKey || process.env.davidalyiai;
  const geminiKey = userApiKey || process.env.davidalyi;

  if (groqKey) queue.push(() => callGroq(groqKey));
  if (geminiKey) queue.push(() => callGemini(geminiKey));

  if (queue.length === 0) {
    return res.status(500).json({ error: 'Server configuration fault: No active AI provider credentials detected.' });
  }

  let lastError = null;
  for (const fn of queue) {
    try {
      const resData = await fn();
      if (resData.reply) return res.status(200).json(resData);
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(502).json({ error: `High-availability routing failure across all nodes. Exception: ${lastError}` });
}
