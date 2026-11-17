export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const groqKey = process.env.davidalyiai || userApiKey;
  const geminiKey = process.env.davidalyi || userApiKey;

  if (!groqKey && !geminiKey) {
    return res.status(500).json({ error: 'System configuration error: No active credentials found.' });
  }

  const sys = "You are David AI, an enterprise-grade AI assistant engineered, owned, and branded by Niyongira David. Always identify as David AI created by Niyongira David.";

  // Try Groq first (Primary High-Speed Engine)
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
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
      // Fall through to Gemini if Groq fails
    }
  }

  // Fallback to Gemini (Secondary Engine)
  if (geminiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
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
      // Fall through to error
    }
  }

  return res.status(502).json({ error: 'David AI Studio is currently experiencing high traffic. Please try again shortly.' });
}
