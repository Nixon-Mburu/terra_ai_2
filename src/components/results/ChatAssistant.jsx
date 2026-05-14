import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import useTerraStore from '../../store/useTerraStore';

/**
 * ChatAssistant — floating chat panel.
 * Uses POST /api/spatial/chat (the dedicated chat endpoint per INTEGRATION.md).
 * NOT /api/spatial/analyze — that is for full analysis only.
 */
export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your Terra AI assistant. Ask me anything about this land's risk assessment.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const { engineState } = useTerraStore();

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    scrollToBottom();

    try {
      // CORRECT endpoint: /api/spatial/chat
      // Engine expects 'question' (not 'message'), returns 'answer'
      const res = await fetch('/api/spatial/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,          // ← engine field name is 'question'
          payload: engineState.payload,
          report: engineState.report,
        }),
      });

      if (!res.ok) throw new Error(`Chat API error ${res.status}`);
      const data = await res.json();
      const reply = data.answer ?? data.reply ?? data.response ?? data.message
        ?? 'I could not find an answer right now.';
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: "I'm unable to connect to the engine right now. Please ensure the Flask server is running." },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <>
      {/* ── Floating trigger ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-colors duration-200',
          open ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
        )}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="fixed bottom-24 right-6 z-40 w-[340px] md:w-[380px] bg-white rounded-2xl shadow-2xl border border-terra-border flex flex-col overflow-hidden"
            style={{ maxHeight: '480px' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Terra Assistant</p>
                <p className="text-indigo-200 text-xs">Powered by Gemini · /api/spatial/chat</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={clsx('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={clsx('flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs',
                    msg.role === 'user' ? 'bg-indigo-500' : 'bg-emerald-500')}>
                    {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>
                  <div className={clsx('max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-terra-body rounded-tl-sm')}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 text-terra-muted animate-spin" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-terra-border flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about this land…"
                className="flex-1 text-xs bg-slate-50 border border-terra-border rounded-xl px-3 py-2 text-terra-heading placeholder:text-terra-muted focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 text-white transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
