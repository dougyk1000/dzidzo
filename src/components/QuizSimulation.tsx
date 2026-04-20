import { useState, useEffect } from 'react';
import { QuizQuestion, Subject, ExamBoard, Language, ChatMessage, Difficulty } from '../types';
import { generateQuizQuestions, generateDiagram } from '../services/geminiService';
import { Loader2, CheckCircle2, XCircle, ArrowRight, RefreshCw, BookOpen, BarChart, Settings2 } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface QuizSimulationProps {
  board: ExamBoard;
  level: string;
  language: Language;
  availableSubjects: Subject[];
  chatHistory: ChatMessage[];
  onComplete: (score: number, subject: Subject) => void;
  autoStartSubject?: Subject;
  autoStartTopic?: string;
}

export function QuizSimulation({ board, level, language, availableSubjects, chatHistory, onComplete, autoStartSubject, autoStartTopic }: QuizSimulationProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(autoStartSubject || null);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [topic, setTopic] = useState(autoStartTopic || '');
  const [questionCount, setQuestionCount] = useState(5);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Load image if diagramPrompt exists
  useEffect(() => {
    async function fetchImage() {
      const currentQ = questions[currentIndex];
      if (currentQ && currentQ.diagramPrompt && !currentQ.imageUrl && !isImageLoading) {
        setIsImageLoading(true);
        try {
          const url = await generateDiagram(currentQ.diagramPrompt, selectedSubject || undefined, difficulty);
          setQuestions(prev => {
            const next = [...prev];
            next[currentIndex] = { ...next[currentIndex], imageUrl: url };
            return next;
          });
        } catch (error) {
          console.error("Failed to load question diagram", error);
        } finally {
          setIsImageLoading(false);
        }
      }
    }
    fetchImage();
  }, [currentIndex, questions, selectedSubject, difficulty]);

  // Auto-start if initial props are provided
  useEffect(() => {
    if (autoStartSubject && questions.length === 0 && !isLoading) {
      startQuiz(autoStartSubject, autoStartTopic);
    }
  }, [autoStartSubject, autoStartTopic]);

  const startQuiz = async (subject: Subject, customTopic?: string, customDifficulty?: Difficulty) => {
    setIsLoading(true);
    setSelectedSubject(subject);
    if (customTopic) setTopic(customTopic);
    const finalDiff = customDifficulty || difficulty;

    // Format full history for Gemini (removed truncation)
    const history = chatHistory.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));

    const q = await generateQuizQuestions(subject, board, level, language, history, customTopic || topic, questionCount, finalDiff);
    setQuestions(q);
    setIsLoading(false);
    setCurrentIndex(0);
    setScore(0);
    setIsAnswered(false);
    setIsFinished(false);
  };

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    if (index === questions[currentIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      if (selectedSubject) {
        onComplete((score / questions.length) * 100, selectedSubject);
      }
    }
  };

  if (!selectedSubject || questions.length === 0) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4 transition-colors duration-300">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Generating {board} questions...</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
          <img src="https://picsum.photos/seed/quiz-start/400/400" alt="quiz" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto relative z-10 mb-8">
          <RefreshCw size={40} />
        </div>
        
        <div className="relative z-10 text-center space-y-4 max-w-xl mx-auto mb-12">
          <h3 className="text-3xl font-bold dark:text-white">Ready for a Quiz?</h3>
          <p className="text-slate-500 dark:text-slate-400">
            Pick a difficulty and choose a subject to generate 5 tailored questions.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-6 relative z-20">
          {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={cn(
                "px-8 py-3 rounded-2xl text-sm font-bold transition-all border-2 flex items-center gap-2",
                difficulty === d 
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-900/50"
              )}
            >
              <BarChart size={16} />
              {d}
            </button>
          ))}
          
          <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700">
            <Settings2 size={16} className="text-slate-400" />
            <select 
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="bg-transparent border-none text-sm font-bold text-slate-600 dark:text-slate-300 focus:ring-0 outline-none cursor-pointer"
            >
              <option value={3} className="bg-white dark:bg-slate-900">3 Questions</option>
              <option value={5} className="bg-white dark:bg-slate-900">5 Questions</option>
              <option value={10} className="bg-white dark:bg-slate-900">10 Questions</option>
              <option value={20} className="bg-white dark:bg-slate-900">20 Questions</option>
            </select>
          </div>
        </div>

        <div className="max-w-md mx-auto mb-10 relative z-20">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Specify Topic (Optional)</label>
          <div className="relative">
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Algebra, Photosynthesis, WW2..."
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-900 outline-none transition-all dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
          {availableSubjects.map(s => (
            <button
              key={s}
              onClick={() => startQuiz(s)}
              className="p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-center group"
            >
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                <BookOpen size={24} />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{s}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isFinished) {
    const percentage = (score / questions.length) * 100;
    return (
      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-center space-y-6 shadow-sm">
        <div className="text-6xl font-black text-slate-900 dark:text-white">{percentage}%</div>
        <h3 className="text-2xl font-bold dark:text-white">Quiz Completed!</h3>
        <p className="text-slate-500 dark:text-slate-400">
          You got {score} out of {questions.length} questions correct.
        </p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => selectedSubject && startQuiz(selectedSubject)}
            className="bg-slate-900 dark:bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700"
          >
            Try Again
          </button>
          <button 
            onClick={() => setQuestions([])}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500" 
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        {currentQ.imageUrl ? (
          <div className="mb-6 rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 max-h-[400px] group/diagram transition-all hover:border-blue-300 dark:hover:border-blue-700">
            <img 
              src={currentQ.imageUrl} 
              alt="Quiz diagram" 
              className="w-full h-full object-contain bg-white transition-transform group-hover/diagram:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : currentQ.diagramPrompt && (
          <div className="mb-6 rounded-3xl h-48 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="animate-spin" size={24} />
              <p className="text-xs font-medium">Generating diagram...</p>
            </div>
          </div>
        )}
        <div className="text-xl font-bold leading-relaxed dark:text-white prose dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {currentQ.question}
          </ReactMarkdown>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((opt, i) => {
            const isCorrect = i === currentQ.correctAnswer;
            const isSelected = i === selectedOption;
            
            return (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => handleAnswer(i)}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between",
                  !isAnswered && "border-slate-100 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 dark:text-slate-300",
                  isAnswered && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400",
                  isAnswered && isSelected && !isCorrect && "border-rose-500 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400",
                  isAnswered && !isSelected && !isCorrect && "border-slate-100 dark:border-slate-800 opacity-50 dark:text-slate-500"
                )}
              >
                <div className="font-medium prose dark:prose-invert prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {opt}
                  </ReactMarkdown>
                </div>
                {isAnswered && isCorrect && <CheckCircle2 size={20} />}
                {isAnswered && isSelected && !isCorrect && <XCircle size={20} />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2"
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">Explanation:</p>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert prose-sm">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {currentQ.explanation}
                </ReactMarkdown>
              </div>
              <button 
                onClick={nextQuestion}
                className="mt-4 w-full bg-slate-900 dark:bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-blue-700"
              >
                {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                <ArrowRight size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
