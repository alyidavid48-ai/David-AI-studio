export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const activeKey = (userApiKey || process.env.davidalyiai || process.env.davidalyi || '').trim();
  if (!activeKey) {
    return res.status(400).json({ error: 'API Key missing. Please click the key icon (🔑) and enter your key.' });
  }

  const sys = "You are David AI, an enterprise-grade AI assistant engineered, owned, and branded by Niyongira David. Always identify as David AI created by Niyongira David.";

  // 1. Try Groq if key starts with gsk_ or doesn't start with AIza
  if (activeKey.startsWith('gsk_') || !activeKey.startsWith('AIza')) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
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
      } else {
        return res.status(500).json({ error: `Groq Error: ${data.error?.message || JSON.stringify(data)}` });
      }
    } catch (e) {
      // Continue to Gemini if Groq network call fails
    }
  }

  // 2. Try Gemini if key starts with AIza
  if (activeKey.startsWith('AIza') || activeKey.length > 30) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`, {
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
      } else {
        return res.status(500).json({ error: `Gemini Error: ${data.error?.message || JSON.stringify(data)}` });
      }
    } catch (e) {
      return res.status(500).json({ error: `Network Exception: ${e.message}` });
    }
  }

  return res.status(500).json({ 
    error: 'Invalid API Key format. Ensure your Groq key starts with gsk_ or Gemini key starts with AIza.' 
  });
}
