export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const activeKey = userApiKey || process.env.davidalyiai || process.env.davidalyi || '';
  const sys = "You are David AI, an enterprise-grade AI assistant engineered, owned, and branded by Niyongira David. Always identify as David AI created by Niyongira David.";

  // 1. Try Groq first (keys usually start with gsk_)
  if (activeKey.startsWith('gsk_') || (!activeKey.startsWith('AIza') && activeKey.length > 20)) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await response.json();
      if (response.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({
          reply: data.choices[0].message.content,
          usedProvider: 'David AI'
        });
      }
    } catch (e) {
      // Fall through
    }
  }

  // 2. Try Gemini fallback (keys usually start with AIza)
  const gKey = activeKey.startsWith('AIza') ? activeKey : (process.env.davidalyi || '');
  if (gKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${sys}\n\n${prompt}` }] }
          ]
        })
      });
      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({
          reply: data.candidates[0].content.parts[0].text,
          usedProvider: 'David AI'
        });
      }
    } catch (e) {
      // Fall through
    }
  }

  return res.status(500).json({ 
    error: 'API Authentication Required. Click the key icon (🔑) in the top bar and enter a valid Groq (gsk_...) or Gemini (AIza...) API key.' 
  });
}
