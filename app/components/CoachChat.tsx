'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function CoachChat({ userContext }: { userContext?: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar historial de chat al iniciar
    const loadHistory = async () => {
      const { data } = await supabase
        .from('chat_logs')
        .select('role, content')
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    loadHistory();
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, userContext }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white flex flex-col h-[450px] shadow-lg">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <span className="text-2xl">🏋️‍♂️</span>
        <div>
          <h3 className="font-bold text-sm">Coach Rudo Chileno</h3>
          <p className="text-xs text-emerald-400 font-medium">En línea • Cero excusas</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-1">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8">
            Pídele consejos, cuéntale si entrenaste o pregúntale por la técnica.
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] p-3 rounded-lg text-sm ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white ml-auto rounded-br-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
              }`}
            >
              {m.content}
            </div>
          ))
        )}
        {loading && (
          <div className="bg-slate-800 text-slate-400 p-3 rounded-lg text-xs italic animate-pulse w-fit border border-slate-700">
            El coach está respondiendo...
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t border-slate-800">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu duda o cuéntale tu rutina..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}