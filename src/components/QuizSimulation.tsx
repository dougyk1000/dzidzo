import { useState } from 'react';
import { QuizQuestion, Subject, ExamBoard, Language } from '../types';
import { generateQuizQuestions } from '../services/geminiService';
import { Loader2, CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface QuizSimulationProps {
  subject: Subject;
  board: ExamBoard;
  level: string;
  language: Language;
  onComplete: (score: number) => void;
}

export function QuizSimulation({ subject, board, level, language, onComplete }: QuizSimulationProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const startQuiz = async () => {
    setIsLoading(true);
    const q = await generateQuizQuestions(subject, board, level, language);
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
      onComplete((score / questions.length) * 100);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 transition-colors duration-300">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Generating {board} {subject} questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-center space-y-6 shadow-sm">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto">
          <RefreshCw size={40} />
        </div>
        <h3 className="text-2xl font-bold dark:text-white">Ready for a Quiz?</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          We'll generate 5 random questions based on the {board} syllabus for {subject}.
        </p>
        <button 
          onClick={startQuiz}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          Start Simulation
        </button>
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
            onClick={startQuiz}
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
        <h3 className="text-xl font-bold leading-relaxed dark:text-white">{currentQ.question}</h3>
        
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
                <span className="font-medium">{opt}</span>
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
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{currentQ.explanation}</p>
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
