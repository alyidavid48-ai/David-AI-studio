export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { model, prompt, localGroqKey, localGeminiKey } = req.body;

    try {
        if (model === 'groq') {
            const apiKey = localGroqKey || process.env.davidalyiai;
            if (!apiKey) {
                return res.status(400).json({ error: 'Groq API key missing. Set davidalyiai in Vercel or via Settings.' });
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            const text = data.choices?.[0]?.message?.content || 'No response';
            return res.status(200).json({ text });

        } else {
            const apiKey = localGeminiKey || process.env.davidalyi;
            if (!apiKey) {
                return res.status(400).json({ error: 'Gemini API key missing. Set davidalyi in Vercel or via Settings.' });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
            return res.status(200).json({ text });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
