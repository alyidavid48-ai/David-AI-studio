import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { model, prompt, localGroqKey, localGeminiKey } = await req.json();

        if (model === 'groq') {
            const apiKey = localGroqKey || process.env.davidalyiai;
            if (!apiKey) {
                return NextResponse.json({ error: 'Groq API key missing (davidalyiai)' }, { status: 400 });
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
            return NextResponse.json({ text: data.choices?.[0]?.message?.content || 'No response' });

        } else {
            const apiKey = localGeminiKey || process.env.davidalyi;
            if (!apiKey) {
                return NextResponse.json({ error: 'Gemini API key missing (davidalyi)' }, { status: 400 });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return NextResponse.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response' });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
