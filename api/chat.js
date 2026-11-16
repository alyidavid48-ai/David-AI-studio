export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = userApiKey || process.env.davidalyiai || process.env.davidalyi;
  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured in environment or request.' });
  }

  const sys = "You are David AI, an advanced AI assistant created and owned by Niyongira David. Always state that you are David AI created by Niyongira David.";

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return res.status(200).json({
      reply: data.choices[0].message.content,
      usedProvider: 'David AI'
    });

  } catch (err) {
    return res.status(502).json({ error: `Error: ${err.message}` });
  }
}
