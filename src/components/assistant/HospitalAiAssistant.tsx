import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  RefreshCw,
  Copy,
  Check,
  Building2,
  Clock,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { queryHospitalAi } from '../../services/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'gemini' | 'local_engine';
  timestamp: string;
}

export const HospitalAiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hello Administrator! I am **HospitalAI Assistant**, connected in real time to the hospital attendance database.
      
You can ask me questions about today's workforce, department presence, late arrivals, or specific staff members like *Rahul Sharma*.`,
      source: 'local_engine',
      timestamp: '09:02 AM',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Who has not arrived today?',
    'Which staff members arrived after 9:15 AM?',
    'Show today\'s ICU attendance',
    'Who is currently inside the hospital?',
    'Is Rahul Sharma on duty today?',
    'Generate September attendance summary',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await queryHospitalAi(q);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        source: res.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I was unable to retrieve database context for this query. Please verify server connectivity.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              HospitalAI Assistant
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Gemini 3.8 Intelligence</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Natural language queries grounded on live hospital workforce databases and facial recognition telemetry.
          </p>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: `reset-${Date.now()}`,
                sender: 'assistant',
                text: 'Conversation cleared. How can I assist you with hospital workforce metrics?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="text-xs text-slate-500 hover:text-slate-800 self-start sm:self-auto px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
        >
          Clear Chat
        </button>
      </div>

      {/* Suggested Questions Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-400 shrink-0">Quick Queries:</span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-900 transition-colors shrink-0 shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Display Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col h-[560px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-slate-800 text-white'
                      : 'bg-gradient-to-tr from-indigo-600 to-teal-500 text-white shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-xl rounded-2xl p-4 text-xs space-y-2 relative group leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {/* Message formatted with basic markdown bullets / bold */}
                  <div className="whitespace-pre-wrap font-sans">
                    {m.text.split('\n').map((line, idx) => {
                      if (line.startsWith('• ') || line.startsWith('* ')) {
                        return (
                          <div key={idx} className="flex items-start space-x-1.5 my-1">
                            <span className="text-teal-600 font-bold shrink-0">•</span>
                            <span>
                              {line.substring(2).split('**').map((seg, sIdx) =>
                                sIdx % 2 === 1 ? <strong key={sIdx} className="font-bold">{seg}</strong> : seg
                              )}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className={line === '' ? 'h-2' : ''}>
                          {line.split('**').map((seg, sIdx) =>
                            sIdx % 2 === 1 ? <strong key={sIdx} className="font-bold">{seg}</strong> : seg
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className={`flex items-center justify-between text-[10px] pt-1 border-t ${
                      isUser ? 'border-white/10 text-slate-400' : 'border-slate-200/60 text-slate-400'
                    }`}
                  >
                    <span>
                      {m.source === 'gemini' ? 'Grounded with Gemini 3.8 Flash' : 'Hospital Ground Truth Engine'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span>{m.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(m.id, m.text)}
                          title="Copy Answer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-700"
                        >
                          {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-4 text-xs text-slate-500 flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                <span>Querying live database records and calculating metrics...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask anything about hospital attendance, late staff, ICU coverage, Rahul Sharma..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30 shrink-0"
            >
              <span>Ask AI</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="text-[10px] text-center text-slate-400 mt-2">
            Answers are strictly grounded on actual attendance records and never fabricated.
          </div>
        </div>
      </div>
    </div>
  );
};
