export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, userApiKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const activeKey = (userApiKey || process.env.davidalyiai || process.env.davidalyi || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!activeKey) {
    return res.status(400).json({ error: 'API Key missing. Please click the key icon (🔑) and enter your key.' });
  }

  const sys = "You are David AI, an enterprise-grade AI assistant engineered, owned, and branded by Niyongira David. Always identify as David AI created by Niyongira David.";

  // 1. Dynamic Groq Auto-Discovery with Multi-Model Fallback
  if (activeKey.startsWith('gsk_')) {
    try {
      const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${activeKey}` }
      });
      const modelsData = await modelsRes.json();
      if (!modelsRes.ok) {
        return res.status(500).json({ error: `Groq Auth Error: ${modelsData.error?.message || 'Invalid Key'}` });
      }

      // Filter out audio, TTS, and guard models
      const blocked = ['whisper', 'guard', 'tts', 'orpheus', 'playai', 'distil-whisper'];
      const allTextModels = (modelsData.data || [])
        .map(m => m.id)
        .filter(id => !blocked.some(b => id.toLowerCase().includes(b)));

      // Prioritize standard chat families first, then try any remaining text models
      const preferred = allTextModels.filter(id => /llama|qwen|gemma|mixtral|deepseek|gpt/i.test(id));
      const others = allTextModels.filter(id => !preferred.includes(id));
      const candidates = [...preferred, ...others];

      if (candidates.length === 0) {
        return res.status(500).json({ error: 'No text chat models are enabled on this Groq API key. Enable a model in console.groq.com/settings/limits.' });
      }

      let lastError = '';
      for (const modelId of candidates) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
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
        lastError = data.error?.message || JSON.stringify(data);
      }

      return res.status(500).json({ error: `Groq Error across available models: ${lastError}` });
    } catch (e) {
      return res.status(500).json({ error: `Groq Network Error: ${e.message}` });
    }
  }

  // 2. Dynamic Gemini Auto-Discovery with Multi-Model Fallback
  if (activeKey.startsWith('AIza')) {
    try {
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`);
      const modelsData = await modelsRes.json();
      if (!modelsRes.ok) {
        return res.status(500).json({ error: `Gemini Auth Error: ${modelsData.error?.message || 'Invalid Key'}` });
      }

      const validModels = (modelsData.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      const preferred = validModels.filter(id => id.includes('flash') || id.includes('pro'));
      const candidates = [...preferred, ...validModels.filter(id => !preferred.includes(id))];

      let lastError = '';
      for (const modelId of candidates) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${activeKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${sys}\n\n${prompt}` }] }]
          })
        });
        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return res.status(200).json({
            reply: data.candidates[0].content.parts[0].text,
            usedProvider: 'David AI'
          });
        }
        lastError = data.error?.message || JSON.stringify(data);
      }

      return res.status(500).json({ error: `Gemini Error: ${lastError}` });
    } catch (e) {
      return res.status(500).json({ error: `Gemini Network Error: ${e.message}` });
    }
  }

  return res.status(400).json({
    error: 'Unrecognized API key format. Please enter a valid Groq (gsk_...) or Gemini (AIza...) key.'
  });
}
