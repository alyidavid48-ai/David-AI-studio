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

  // 1. Dynamic Groq Auto-Discovery (keys starting with gsk_)
  if (activeKey.startsWith('gsk_')) {
    try {
      const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${activeKey}` }
      });
      const modelsData = await modelsRes.json();
      if (!modelsRes.ok) {
        return res.status(500).json({ error: `Groq Auth Error: ${modelsData.error?.message || 'Invalid Key'}` });
      }

      // Automatically pick an active text chat model (exclude whisper/guard/vision-only models)
      const validModels = (modelsData.data || [])
        .map(m => m.id)
        .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('tts'));
      
      const chosenModel = validModels.find(id => id.includes('llama')) || validModels[0];
      if (!chosenModel) {
        return res.status(500).json({ error: 'No active chat models available on this Groq account.' });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: chosenModel,
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
      return res.status(500).json({ error: `Groq Error: ${data.error?.message || JSON.stringify(data)}` });
    } catch (e) {
      return res.status(500).json({ error: `Groq Network Error: ${e.message}` });
    }
  }

  // 2. Dynamic Gemini Auto-Discovery (keys starting with AIza)
  if (activeKey.startsWith('AIza')) {
    try {
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`);
      const modelsData = await modelsRes.json();
      if (!modelsRes.ok) {
        return res.status(500).json({ error: `Gemini Auth Error: ${modelsData.error?.message || 'Invalid Key'}` });
      }

      // Automatically pick the best available generateContent model
      const validModels = (modelsData.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      const chosenModel = validModels.find(id => id.includes('flash')) || validModels[0];
      if (!chosenModel) {
        return res.status(500).json({ error: 'No active generateContent models available on this Gemini key.' });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${activeKey}`, {
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
      return res.status(500).json({ error: `Gemini Error: ${data.error?.message || JSON.stringify(data)}` });
    } catch (e) {
      return res.status(500).json({ error: `Gemini Network Error: ${e.message}` });
    }
  }

  return res.status(400).json({ 
    error: 'Unrecognized API key format. Please enter a valid Groq (gsk_...) or Gemini (AIza...) key.' 
  });
}
