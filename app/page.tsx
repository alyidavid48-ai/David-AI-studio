'import React, { useState } from 'react';

export default function Home() {
  const [model, setModel] = useState('groq');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    { role: 'system', text: 'System ready. Connected securely to Vercel environment variables (davidalyi & davidalyiai).' }
  ]);
  const [loading, setLoading] = useState(false);
  const [showPwa, setShowPwa] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMsg = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: userMsg })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#030712] text-gray-100 min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {showPwa && (
        <div className="bg-gradient-to-r from-cyan-500 to-purple-600 text-black px-4 py-2 text-xs font-semibold flex justify-between items-center shadow-md">
          <span>📱 DAVID Alyi studio is installable as a PWA</span>
          <button onClick={() => alert('PWA installation prompt triggered.')} className="bg-black text-white px-3 py-1 rounded-lg text-[11px] hover:bg-gray-900 transition">Install PWA</button>
        </div>
      )}

      <header className="border-b border-gray-800/60 bg-[#030712]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">D2</div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-white">DAVID Alyi</h1>
            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">STUDIO</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="bg-[#0b0f19] border border-gray-800 text-xs rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-cyan-500">
            <option value="groq">Groq (davidalyiai)</option>
            <option value="gemini">Gemini (davidalyi)</option>
          </select>
          <button onClick={() => alert('Auth modal active.')} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition">Sign In / Sign Up</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b0f19] border border-cyan-500/30 text-cyan-400 text-xs font-medium shadow-inner">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          Public SaaS & PWA Template • Built on Technical Blueprint v2.0
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
          The Multimodal <br/>
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">AI Creative & Development</span> <br/>
          Workspace
        </h1>

        <p className="text-gray-400 text-sm md:text-base max-w-2xl">
          Type, speak, upload pictures, plan productions with AI Director, build full-stack apps with autonomous agents, and plug in your cloud API key for real generation.
        </p>

        <div className="w-full bg-[#0b0f19] border border-gray-800/80 rounded-2xl p-4 shadow-2xl mt-4 text-left space-y-3">
          <div className="h-60 overflow-y-auto space-y-3 pr-2 font-mono text-xs text-gray-300">
            {messages.map((m, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${m.role === 'user' ? 'bg-cyan-950/30 border-cyan-800/50 text-cyan-200 text-right' : 'bg-gray-900/60 border-gray-800 text-cyan-400'}`}>
                <b>{m.role === 'user' ? 'You' : 'DAVID AI'}:</b> {m.text}
              </div>
            ))}
            {loading && <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 animate-pulse">Processing via {model}...</div>}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-gray-800/60">
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Message DAVID Alyi studio workspace..." className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-100 focus:outline-none focus:border-cyan-500" />
            <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-cyan-500/20">Send Prompt</button>
          </form>
        </div>
      </main>

      <footer className="border-t border-gray-800/60 bg-[#030712] py-6 px-6 text-center text-xs text-gray-500">
        DAVID Alyi studio &copy; 2026 • Powered by Vercel Serverless Architecture
      </footer>
    </div>
  );
}
