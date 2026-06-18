import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, User, Mic, Volume2, Square } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const LANGUAGES = [
  { code: 'en-US', name: 'English' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'hi-IN', name: 'हिन्दी' },
  { code: 'zh-CN', name: '中文' },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Climora AI assistant. I can help you understand pollution levels, provide health guidance, suggest carbon footprint reductions, or assist with emergency instructions. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = (text: string, index: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(index);
      
      const cleanText = text.replace(/[#*`_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language;
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const targetLangPrefix = language.split('-')[0].toLowerCase();
        
        // 1. Try to find an exact language match (e.g. 'hi-IN')
        // 2. Try to find any voice starting with the language prefix (e.g. 'hi')
        let voice = voices.find(v => v.lang.replace('_', '-').toLowerCase() === language.toLowerCase()) || 
                    voices.find(v => v.lang.toLowerCase().startsWith(targetLangPrefix));
        
        // Google voices are often better quality online if available
        const googleVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLangPrefix) && v.name.includes('Google'));
        if (googleVoice) {
          voice = googleVoice;
        }

        // Special fallback for Hindi if the OS uses non-standard language codes
        if (!voice && targetLangPrefix === 'hi') {
          voice = voices.find(v => v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी'));
        }

        if (voice) {
          utterance.voice = voice;
        }
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
      } else {
        setVoiceAndSpeak();
      }

      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    }
  };

  const handleListen = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', 
        { message: userMessage, context: { previousMessages: messages.slice(-4), targetLanguage: language } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const aiResponse = res.data.text;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error connecting to my servers. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between shadow-md">
         <div className="flex items-center text-white">
            <Bot className="h-6 w-6 mr-3" />
            <div>
               <h2 className="text-lg font-bold tracking-tight">Climora Assistant</h2>
               <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1">AI-Powered Environmental Guide</p>
            </div>
         </div>
         <div>
            <select 
               value={language} 
               onChange={(e) => setLanguage(e.target.value)}
               className="bg-emerald-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 border border-emerald-500 cursor-pointer"
            >
               {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
               ))}
            </select>
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-emerald-50 ml-3' : 'bg-emerald-600 mr-3 shadow-md shadow-emerald-200/50'}`}>
                 {msg.role === 'user' ? <User className="h-4 w-4 text-emerald-600" /> : <Bot className="h-4 w-4 text-white" />}
              </div>
              <div className={`px-5 py-4 rounded-3xl relative group ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-200/50' : 'bg-white border border-slate-100 shadow-sm text-slate-800 rounded-tl-none'}`}>
                 {msg.role === 'user' ? (
                     <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                 ) : (
                     <div>
                       <div className="prose prose-sm prose-emerald max-w-none text-sm font-medium markdown-body">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                       </div>
                       <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {speakingIndex === idx ? (
                             <button onClick={stopSpeaking} className="flex items-center text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-md transition-colors">
                                <Square className="h-3 w-3 mr-1 fill-current" /> Stop
                             </button>
                          ) : (
                             <button onClick={() => speak(msg.content, idx)} className="flex items-center text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md transition-colors">
                                <Volume2 className="h-3 w-3 mr-1" /> Listen
                             </button>
                          )}
                       </div>
                     </div>
                 )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex flex-row">
               <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-600 mr-3 flex items-center justify-center shadow-md shadow-emerald-200/50">
                  <Bot className="h-4 w-4 text-white" />
               </div>
               <div className="px-5 py-4 bg-white border border-slate-100 shadow-sm rounded-3xl rounded-tl-none flex items-center space-x-2">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex relative items-center space-x-3">
          <button 
             type="button" 
             onClick={handleListen}
             className={`p-3 rounded-full flex-shrink-0 transition-colors ${isListening ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-100'}`}
          >
             <Mic className="h-5 w-5" />
          </button>
          <input
            type="text"
            className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800 placeholder-slate-400"
            placeholder="Ask about AQI, health tips, or carbon footprint..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-emerald-600 text-white rounded-full flex-shrink-0 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-emerald-200/50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
