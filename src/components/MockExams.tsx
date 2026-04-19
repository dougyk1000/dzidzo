import { useState, useEffect, useRef } from 'react';
import { QuizQuestion, Subject, ExamBoard, Language, ChatMessage } from '../types';
import { generateMockExam, generateDiagram } from '../services/geminiService';
import { Loader2, CheckCircle2, XCircle, ArrowRight, RefreshCw, ClipboardCheck, Search, Sparkles, Timer as TimerIcon, AlertCircle } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { playBeep } from '../utils/audio';

interface MockExamsProps {
  board: ExamBoard;
  level: string;
  language: Language;
  chatHistory: ChatMessage[];
  availableSubjects: Subject[];
  onComplete: (score: number, subject: Subject) => void;
  autoStartSubject?: Subject;
  autoStartTopic?: string;
}

export function MockExams({ board, level, language, chatHistory, availableSubjects, onComplete, autoStartSubject, autoStartTopic }: MockExamsProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(autoStartSubject || null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [topic, setTopic] = useState(autoStartTopic || '');
  const [timeLeft, setTimeLeft] = useState(0);
  const [examDuration, setExamDuration] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Load image if diagramPrompt exists
  useEffect(() => {
    async function fetchImage() {
      const currentQ = questions[currentIndex];
      if (currentQ && currentQ.diagramPrompt && !currentQ.imageUrl && !isImageLoading) {
        setIsImageLoading(true);
        try {
          const url = await generateDiagram(currentQ.diagramPrompt);
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
  }, [currentIndex, questions]);

  // Timer logic
  useEffect(() => {
    if (!questions.length || isFinished || timeLeft <= 0 || isLoading) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 1);
        
        // Beeping logic for high pressure
        if (next === 600) playBeep(440, 400); // 10 mins warning
        if (next === 300) playBeep(440, 400); // 5 mins warning
        if (next === 60) playBeep(660, 600);  // 1 min warning
        if (next <= 10 && next > 0) playBeep(880, 100); // Final 10 seconds heartbeat
        if (next === 0) {
          playBeep(220, 1500);
          setIsFinished(true);
        }
        
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions.length, isFinished, timeLeft, isLoading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start if initial props are provided
  useEffect(() => {
    if (autoStartSubject && questions.length === 0 && !isLoading) {
      startExam(autoStartSubject, autoStartTopic);
    }
  }, [autoStartSubject, autoStartTopic]);

  const startExam = async (subject: Subject, customTopic?: string) => {
    setIsLoading(true);
    setSelectedSubject(subject);
    if (customTopic) setTopic(customTopic);
    
    // Format history for Gemini
    const history = chatHistory.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));

    const q = await generateMockExam(subject, board, level, language, history, customTopic || topic, 10);
    setQuestions(q);
    const duration = q.length * 90; // 1.5 minutes per question
    setTimeLeft(duration);
    setExamDuration(duration);
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
        <div className="flex flex-col items-center justify-center h-96 space-y-6 transition-colors duration-300">
          <div className="relative">
            <Loader2 className="animate-spin text-blue-600" size={64} />
            <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-bounce" size={24} />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold dark:text-white">Preparing Your Mock Exam...</p>
            <p className="text-slate-500 dark:text-slate-400">Analyzing your chat history for relevant questions.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
          <img src="https://picsum.photos/seed/exam-start/400/400" alt="exam" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        
        <div className="w-24 h-24 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200 dark:shadow-none relative z-10 mb-8">
          <ClipboardCheck size={48} />
        </div>
        
        <div className="space-y-4 relative z-10 text-center mb-12">
          <h3 className="text-3xl font-black dark:text-white tracking-tight">Full Mock Exam</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Select a subject to test your knowledge. This exam is generated based on your recent lessons and the {board} syllabus.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
          {availableSubjects.map(s => (
            <button
              key={s}
              onClick={() => startExam(s)}
              className="p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-center group"
            >
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                <ClipboardCheck size={24} />
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
      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-center space-y-8 shadow-sm relative overflow-hidden">
        <div className={cn(
          "absolute top-0 inset-x-0 h-2",
          percentage >= 80 ? "bg-emerald-500" : percentage >= 50 ? "bg-amber-500" : "bg-rose-500"
        )} />
        
        <div className="space-y-2">
          <div className={cn(
            "text-7xl font-black mb-2",
            percentage >= 80 ? "text-emerald-500" : percentage >= 50 ? "text-amber-500" : "text-rose-500"
          )}>
            {Math.round(percentage)}%
          </div>
          <h3 className="text-3xl font-bold dark:text-white">Exam Results</h3>
          <p className="text-slate-500 dark:text-slate-400">
            You achieved {score} out of {questions.length} correct answers in this {selectedSubject} mock exam.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl text-left space-y-4">
          <h4 className="font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" />
            AI Performance Analysis
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {percentage >= 80 
              ? "Excellent work! You have a strong grasp of the concepts discussed in our sessions. You're well-prepared for the actual exam."
              : percentage >= 50 
              ? "Good effort. You understand the basics, but there are some specific areas we should revisit in our chat to boost your confidence."
              : "This was a tough one. It looks like we need to spend more time on the core concepts. Let's go back to the tutor and ask more questions!"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => selectedSubject && startExam(selectedSubject)}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
          >
            Retake Exam
          </button>
          <button 
            onClick={() => setQuestions([])}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="space-y-8">
      {/* Exam Header with Timer */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">
              {currentIndex + 1}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question</p>
              <p className="text-sm font-bold dark:text-white">{currentIndex + 1} of {questions.length}</p>
            </div>
          </div>
          <div className="flex-1 max-w-xs mx-8 hidden sm:block">
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500" 
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold text-emerald-500">{score} Correct</p>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all duration-300 shadow-sm",
          timeLeft < 60 ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 animate-pulse" : 
          timeLeft < 300 ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400" :
          "bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
        )}>
          <TimerIcon size={24} className={timeLeft < 60 ? "animate-spin-slow" : ""} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Time Remaining</p>
            <p className="text-xl font-black font-mono">{formatTime(timeLeft)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
        
        {currentQ.imageUrl ? (
          <div className="mb-6 rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 max-h-96">
            <img 
              src={currentQ.imageUrl} 
              alt="Question diagram" 
              className="w-full h-full object-contain bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : currentQ.diagramPrompt && (
          <div className="mb-6 rounded-3xl h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-medium">Generating visual aid...</p>
            </div>
          </div>
        )}

        <h3 className="text-2xl font-bold leading-relaxed dark:text-white">{currentQ.question}</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {currentQ.options.map((opt, i) => {
            const isCorrect = i === currentQ.correctAnswer;
            const isSelected = i === selectedOption;
            
            return (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => handleAnswer(i)}
                className={cn(
                  "p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group relative overflow-hidden",
                  !isAnswered && "border-slate-100 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 dark:text-slate-300",
                  isAnswered && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400",
                  isAnswered && isSelected && !isCorrect && "border-rose-500 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400",
                  isAnswered && !isSelected && !isCorrect && "border-slate-100 dark:border-slate-800 opacity-50 dark:text-slate-500"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors",
                    !isAnswered ? "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-600 group-hover:text-white" :
                    isCorrect ? "bg-emerald-500 text-white" :
                    isSelected ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-medium">{opt}</span>
                </div>
                {isAnswered && isCorrect && <CheckCircle2 size={24} />}
                {isAnswered && isSelected && !isCorrect && <XCircle size={24} />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sparkles size={20} />
                <p className="text-sm font-bold uppercase tracking-widest">Explanation</p>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{currentQ.explanation}</p>
              <button 
                onClick={nextQuestion}
                className="mt-6 w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-blue-700 shadow-xl shadow-slate-200 dark:shadow-none"
              >
                {currentIndex === questions.length - 1 ? 'Complete Exam' : 'Next Question'}
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
