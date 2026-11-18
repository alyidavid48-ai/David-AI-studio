export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { model, prompt, localGroqKey, localGeminiKey } = req.body;

    const systemInstruction = `You are DAVID AI, the official intelligent assistant of DAVID Alyi studio, created and engineered by N. David (David Alyi). 
Never identify yourself as Qwen, ChatGPT, OpenAI, Alibaba, Google, Meta, or any third-party model. 
If asked who created you or who you are, state clearly and professionally that you are DAVID AI, developed by N. David for DAVID Alyi studio. 
Maintain a sharp, helpful, and international executive tone.`;

    try {
        if (model === 'groq') {
            const apiKey = localGroqKey || process.env.davidalyiai;
            if (!apiKey) {
                return res.status(400).json({ error: 'Groq API key missing (davidalyiai).' });
            }

            // Use verified active models on your key in order of speed/reliability
            const activeGroqModels = ['openai/gpt-oss-20b', 'allam-2-7b', 'openai/gpt-oss-120b'];
            let data = null;

            for (const targetModel of activeGroqModels) {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: targetModel,
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 1024
                    })
                });
                data = await response.json();
                if (!data.error) break;
            }

            if (data?.error) throw new Error(data.error.message || JSON.stringify(data.error));
            const text = data.choices?.[0]?.message?.content || 'No response';
            return res.status(200).json({ text });

        } else {
            const apiKey = localGeminiKey || process.env.davidalyi;
            if (!apiKey) {
                return res.status(400).json({ error: 'Gemini API key missing (davidalyi).' });
            }

            const activeGeminiModels = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];
            let data = null;

            for (const targetModel of activeGeminiModels) {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemInstruction }] },
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    })
                });
                data = await response.json();
                if (!data.error) break;
            }

            if (data?.error) throw new Error(data.error.message || JSON.stringify(data.error));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
            return res.status(200).json({ text });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
