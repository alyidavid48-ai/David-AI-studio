export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { model, prompt, localGroqKey, localGeminiKey } = req.body;

    // Enforce professional international identity for DAVID Alyi studio
    const systemInstruction = `You are DAVID AI, the official intelligent assistant of DAVID Alyi studio, created and engineered by N. David (David Alyi). 
Never identify yourself as Qwen, ChatGPT, OpenAI, Alibaba, Google, or any third-party model. 
If asked who created you or who you are, state clearly and professionally that you are DAVID AI, developed by N. David for DAVID Alyi studio. 
Maintain a sharp, helpful, and international executive tone.`;

    try {
        if (model === 'groq') {
            const apiKey = localGroqKey || process.env.davidalyiai;
            if (!apiKey) {
                return res.status(400).json({ error: 'Groq API key missing (davidalyiai).' });
            }

            // Use fast, high-limit production models first
            const preferredGroqModels = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
            let data = null;

            for (const targetModel of preferredGroqModels) {
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

            // Fallback to safe, small active models only (avoids 27B/70B rate limits)
            if (data?.error) {
                const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const modelsData = await modelsRes.json();
                const safeModel = modelsData.data?.find(m => 
                    !m.id.includes('whisper') && 
                    !m.id.includes('guard') && 
                    !m.id.includes('27b') &&
                    !m.id.includes('70b')
                )?.id;

                if (safeModel) {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: safeModel,
                            messages: [
                                { role: 'system', content: systemInstruction },
                                { role: 'user', content: prompt }
                            ],
                            max_tokens: 1024
                        })
                    });
                    data = await response.json();
                }
            }

            if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
            const text = data.choices?.[0]?.message?.content || 'No response';
            return res.status(200).json({ text });

        } else {
            const apiKey = localGeminiKey || process.env.davidalyi;
            if (!apiKey) {
                return res.status(400).json({ error: 'Gemini API key missing (davidalyi).' });
            }

            const geminiPayload = {
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            };

            let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiPayload)
            });
            let data = await response.json();

            if (data.error) {
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const listData = await listRes.json();
                const validModel = listData.models?.find(m => 
                    m.supportedGenerationMethods?.includes('generateContent') && 
                    m.name.includes('flash') && 
                    !m.name.includes('2.5') &&
                    !m.name.includes('1.5')
                )?.name;

                if (validModel) {
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${validModel}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(geminiPayload)
                    });
                    data = await response.json();
                }
            }

            if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
            return res.status(200).json({ text });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
