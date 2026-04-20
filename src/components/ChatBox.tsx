import { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Loader2, User, Bot, Volume2, VolumeX, Sparkles, ClipboardCheck, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage, Language, Subject, Homework } from '../types';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

import { translations } from '../translations';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onUploadImage: (base64: string) => void;
  isLoading: boolean;
  language: Language;
  onSpeak?: (text: string) => void;
  onStopSpeaking?: () => void;
  isSpeaking?: boolean;
  homeworkList?: Homework[];
  chatbotName?: string;
  onStartAssessment?: (type: 'quiz' | 'exam', subject: string, topic?: string) => void;
}

export function ChatBox({ 
  messages = [], 
  onSendMessage, 
  onUploadImage, 
  isLoading, 
  language, 
  onSpeak,
  onStopSpeaking,
  isSpeaking,
  chatbotName = 'Dzidzo',
  onStartAssessment
}: ChatBoxProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const t = translations[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onUploadImage(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-80">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <img 
                src="https://picsum.photos/seed/dzidzo-learning/400/300" 
                alt="Learning" 
                className="w-64 h-48 rounded-3xl object-cover shadow-2xl border-4 border-white dark:border-slate-800"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Bot size={24} />
              </div>
            </motion.div>
            <div className="max-w-xs space-y-2">
              <h3 className="text-xl font-bold dark:text-white">{t.readyToStudy}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {t.tutorIntro.replace('{name}', chatbotName)}
              </p>
            </div>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
              )}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed transition-colors duration-300 relative group",
                msg.role === 'user' 
                  ? "bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none shadow-md" 
                  : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none shadow-sm"
              )}>
                {msg.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden border-2 border-white/20">
                    <img 
                      src={msg.imageUrl} 
                      alt="Uploaded document" 
                      className="max-w-full h-auto object-contain max-h-64"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {msg.role === 'assistant' && onSpeak && (
                  <button
                    onClick={() => isSpeaking ? onStopSpeaking?.() : onSpeak(msg.content)}
                    className="absolute -right-10 top-0 p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isSpeaking ? "Stop speaking" : "Listen to response"}
                  >
                    {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                )}
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 dark:prose-invert">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {msg.assessmentSuggestion && onStartAssessment && (
                  <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                       <Sparkles size={14} className="text-emerald-500" />
                       {t.assessmentSuggestion}
                    </p>
                    <button
                      onClick={() => onStartAssessment(msg.assessmentSuggestion!.type, msg.assessmentSuggestion!.subject, msg.assessmentSuggestion!.topic)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 group"
                    >
                      <ClipboardCheck size={18} className="group-hover:scale-110 transition-transform" />
                      {t.takeAssessment.replace('{type}', msg.assessmentSuggestion.type)}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mr-auto"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 italic text-sm">
              {t.thinking.replace('{name}', chatbotName)}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-blue-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm transition-all active:scale-95 shrink-0"
            title="Upload image or past paper"
          >
            <ImageIcon size={22} />
          </button>
          
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.askAnything}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 dark:text-slate-100"
            />
            
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-2 rounded-xl transition-all",
                input.trim() && !isLoading 
                  ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95" 
                  : "text-slate-300"
              )}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
