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

            // 1. Fetch exact models enabled on this specific Groq API key
            const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const modelsData = await modelsRes.json();

            if (modelsData.error) {
                throw new Error(modelsData.error.message || JSON.stringify(modelsData.error));
            }

            // 2. Keep only standard chat models (exclude audio/TTS/safety/oversized 27b)
            const blockedKeywords = ['whisper', 'orpheus', 'tts', 'guard', 'vision', '27b', 'compound'];
            const availableModels = (modelsData.data || [])
                .map(m => m.id)
                .filter(id => !blockedKeywords.some(word => id.toLowerCase().includes(word)));

            if (availableModels.length === 0) {
                throw new Error('No active text models found on your Groq account.');
            }

            // Prioritize smaller/faster models first so free-tier token limits never trigger
            availableModels.sort((a, b) => {
                const aSmall = a.includes('8b') || a.includes('9b') || a.includes('20b') || a.includes('instant') ? -1 : 1;
                const bSmall = b.includes('8b') || b.includes('9b') || b.includes('20b') || b.includes('instant') ? -1 : 1;
                return aSmall - bSmall;
            });

            // 3. Try each enabled model on your key until one succeeds
            let data = null;
            for (const validModel of availableModels) {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: validModel,
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 512
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
