import { useState, useMemo, useEffect } from 'react';
import { ProgressRecord, Subject, ExamBoard, Language, Announcement } from '../types';
import { TrendingUp, AlertCircle, CheckCircle2, BookOpen, GraduationCap, Sparkles, Loader2, Megaphone, BarChart3, ClipboardCheck, Star } from 'lucide-react';
import { cn, cacheImage, getCachedImage } from '../utils';
import { analyzeStudentProgress } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Tooltip } from './Tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  progress: ProgressRecord[];
  streak: number;
  board: ExamBoard;
  level: string;
  language: Language;
  announcements: Announcement[];
  theme: 'light' | 'dark';
  onStartSimulation: () => void;
  onStartExam: () => void;
  onStartHomework: () => void;
  weeklySummary?: {
    weaknesses: string[];
    potential: string;
    rating: number;
    summary: string;
  } | null;
  onGenerateSummary?: () => void;
  isGeneratingSummary?: boolean;
  chatbotName?: string;
  studentName: string;
  tutorStyle?: string;
  selectedSubjects: Subject[];
}

export function Dashboard({ 
  progress = [], 
  streak, 
  board, 
  level, 
  language, 
  announcements = [], 
  theme, 
  onStartSimulation, 
  onStartExam, 
  onStartHomework,
  weeklySummary,
  onGenerateSummary,
  isGeneratingSummary,
  chatbotName = 'Dzidzo',
  studentName,
  tutorStyle,
  selectedSubjects = []
}: DashboardProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject>(selectedSubjects[0] || 'Maths');

  useEffect(() => {
    if (selectedSubjects.length > 0 && !selectedSubjects.includes(activeSubject)) {
      setActiveSubject(selectedSubjects[0]);
    }
  }, [selectedSubjects]);

  const headerImg = useMemo(() => `https://picsum.photos/seed/dzidzo-dashboard-${activeSubject.toLowerCase()}/1200/400`, [activeSubject]);

  const getWeakTopics = () => progress.filter(p => p.weaknessLevel === 'high');

  const subjectColors: Record<string, string> = {
    'Maths': '#2563eb',
    'Mathematics': '#2563eb',
    'Science': '#10b981',
    'Physics': '#10b981',
    'Biology': '#ef4444',
    'Chemistry': '#f59e0b',
    'History': '#8b5cf6',
    'English': '#ec4899',
    'Geography': '#06b6d4'
  };

  const getSubjectColor = (s: string, index: number) => {
    return subjectColors[s] || ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][index % 7];
  };

  const chartData = useMemo(() => {
    const subjects = selectedSubjects;
    const recordsBySubject: Record<string, ProgressRecord[]> = {};
    
    subjects.forEach(s => {
      recordsBySubject[s] = progress
        .filter(p => p.subject === s)
        .sort((a, b) => new Date(a.lastAttempt).getTime() - new Date(b.lastAttempt).getTime());
    });

    const maxAttempts = Math.max(...Object.values(recordsBySubject).map(arr => arr.length), 0);
    
    return Array.from({ length: maxAttempts }, (_, i) => {
      const entry: any = { attempt: `Attempt ${i + 1}`, effortIndex: i + 1 };
      subjects.forEach(s => {
        if (recordsBySubject[s][i]) {
          entry[s] = recordsBySubject[s][i].score;
          entry[`${s}_topic`] = recordsBySubject[s][i].topic;
          entry[`${s}_date`] = new Date(recordsBySubject[s][i].lastAttempt).toLocaleDateString();
        }
      });
      return entry;
    });
  }, [progress, selectedSubjects]);

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeStudentProgress(progress, selectedSubjects, board, level, language, studentName, tutorStyle);
    setAnalysis(result);
    setIsAnalyzing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="relative h-48 rounded-[2.5rem] overflow-hidden mb-8 shadow-lg">
        <img 
          src={headerImg} 
          alt="Dashboard Header" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent flex items-center p-12">
          <div className="text-white">
            <h2 className="text-3xl font-bold mb-2">Welcome back, {studentName}!</h2>
            <p className="text-slate-200">Your {board} education journey encompasses {selectedSubjects.join(', ')}.</p>
          </div>
        </div>
      </div>

      {/* Subject Filter Chips - Internal to Dashboard */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedSubjects.map(s => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all border-2",
              activeSubject === s
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-300"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Weekly Summary Section */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden mb-8 group">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <img src="https://picsum.photos/seed/weekly-summary/400/400" alt="Summary" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Weekly Progress Summary</h3>
                <p className="text-indigo-100 text-sm">Insights from {chatbotName}</p>
              </div>
            </div>
            {!weeklySummary && (
              <button 
                onClick={onGenerateSummary}
                disabled={isGeneratingSummary || progress.length === 0}
                className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50"
              >
                {isGeneratingSummary ? <Loader2 className="animate-spin" size={20} /> : 'Generate Summary'}
              </button>
            )}
          </div>

          {weeklySummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={20} 
                      className={cn(
                        "fill-current",
                        i < weeklySummary.rating ? "text-amber-300" : "text-white/20"
                      )} 
                    />
                  ))}
                  <span className="ml-2 font-bold">{weeklySummary.rating}/5 Rating</span>
                </div>
                <p className="text-indigo-50 leading-relaxed italic">"{weeklySummary.summary}"</p>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider mb-2 text-indigo-200">Your Potential</h4>
                  <p className="text-white">{weeklySummary.potential}</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-indigo-200">Areas to Improve</h4>
                <ul className="space-y-2">
                  {weeklySummary.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                  {weeklySummary.weaknesses.length === 0 && (
                    <li className="text-indigo-200 italic">No major weaknesses identified! Keep it up.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-indigo-100 italic">
              {progress.length === 0 
                ? "Complete some topics to get your first weekly summary!" 
                : "Click the button above to generate your weekly performance analysis."}
            </div>
          )}
        </div>
        <div className="absolute right-[-40px] bottom-[-40px] opacity-10">
          <Sparkles size={240} />
        </div>
      </div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Megaphone size={20} className="text-blue-600" />
            <h3 className="font-bold text-lg">Latest Announcements</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-start gap-3 transition-colors">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl text-amber-600 dark:text-amber-400">
                  <Megaphone size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{ann.title}</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{ann.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity">
            <img src="https://picsum.photos/seed/streak/200/200" alt="streak" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <Tooltip text="Your consecutive study days" position="top">
            <div className="flex items-center gap-3 text-amber-600 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Study Streak</span>
            </div>
          </Tooltip>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{streak} Days</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Keep it up! Consistency is key.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity">
            <img src="https://picsum.photos/seed/mastery/200/200" alt="mastery" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <Tooltip text="Topics where you scored above 80%" position="top">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <BookOpen size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Topics Mastered</span>
            </div>
          </Tooltip>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            {progress.filter(p => p.score > 80).length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Out of {progress.length} total topics.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity">
            <img src="https://picsum.photos/seed/warning/200/200" alt="warning" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <Tooltip text="Topics that need more practice" position="top">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <AlertCircle size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Weak Topics</span>
            </div>
          </Tooltip>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{getWeakTopics().length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Topics needing urgent review.</p>
        </div>
      </div>

      {/* Performance Graph Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
          <BarChart3 size={128} />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold dark:text-slate-100">Performance Comparison</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Comparing your progress across all subjects.</p>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 mb-4">
                {selectedSubjects.map((s, i) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSubjectColor(s, i) }} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{s}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {selectedSubjects.map((s, i) => (
                    <linearGradient key={s} id={`color${s.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getSubjectColor(s, i)} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={getSubjectColor(s, i)} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="attempt" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xl min-w-[200px] z-50">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">{label}</p>
                          <div className="space-y-4">
                            {payload.map((p: any) => (
                              <div key={p.name} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span className="font-bold text-[11px] dark:text-white uppercase">{p.name}</span>
                                  </div>
                                  <span className="font-black text-blue-600 text-sm whitespace-nowrap">{p.value}%</span>
                                </div>
                                {p.payload[`${p.name}_topic`] && (
                                  <div className="pl-4">
                                    <p className="text-[10px] text-slate-400 truncate max-w-[180px] font-medium italic">
                                      {p.payload[`${p.name}_topic`]}
                                    </p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">
                                      {p.payload[`${p.name}_date`]}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {selectedSubjects.map((s, i) => (
                  <Area 
                    key={s}
                    type="monotone" 
                    dataKey={s}
                    name={s}
                    stroke={getSubjectColor(s, i)} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill={`url(#color${s.replace(/\s+/g, '')})`} 
                    animationDuration={1500}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
              Complete topics in your subjects to see your performance comparison graph.
            </div>
          )}
        </div>
      </div>

      {/* AI Deep Analysis Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5 pointer-events-none">
          <Sparkles size={192} />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-slate-100">AI Deep Analysis</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Personalized insights for {studentName}.</p>
            </div>
          </div>
          <div className="hidden md:block w-32 h-12 opacity-20">
             <img src="https://picsum.photos/seed/ai-analysis/200/100" alt="AI" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          {!analysis && (
            <div className="flex flex-col items-end gap-2">
              <Tooltip text="Get AI-powered insights on your strengths and weaknesses" position="left">
                <button
                  onClick={handleDeepAnalysis}
                  disabled={isAnalyzing}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Analyze Progress
                </button>
              </Tooltip>
              {progress.length === 0 && (
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">Need study data to analyze</p>
              )}
            </div>
          )}
        </div>

        {analysis && (
          <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 prose prose-indigo max-w-none dark:prose-invert">
            <ReactMarkdown>{analysis}</ReactMarkdown>
            <button 
              onClick={() => setAnalysis(null)}
              className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              Refresh Analysis
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200 dark:shadow-none relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <ClipboardCheck size={24} />
            </div>
            <h3 className="text-2xl font-bold mb-2">Mock Exam</h3>
            <p className="text-blue-100 mb-6 text-sm">
              Take a full 10-question exam based on your recent chat history.
            </p>
            <button 
              onClick={onStartExam}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-lg"
            >
              Start Exam
            </button>
          </div>
          <div className="absolute right-[-40px] bottom-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-500">
            <ClipboardCheck size={200} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <BookOpen size={24} />
            </div>
            <h3 className="text-2xl font-bold mb-2">Homework</h3>
            <p className="text-emerald-100 mb-6 text-sm">
              Check your current assignments and due dates.
            </p>
            <button 
              onClick={onStartHomework}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all active:scale-95 shadow-lg"
            >
              View Homework
            </button>
          </div>
          <div className="absolute right-[-40px] bottom-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-500">
            <BookOpen size={200} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <Sparkles size={24} className="text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Quick Quiz</h3>
            <p className="text-slate-300 mb-6 text-sm">
              5 rapid-fire questions to test your general {activeSubject} knowledge.
            </p>
            <button 
              onClick={onStartSimulation}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg"
            >
              Start Quiz
            </button>
          </div>
          <div className="absolute right-[-40px] bottom-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-500">
            <GraduationCap size={200} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Topic Performance</h3>
          </div>
          <div className="hidden sm:block">
            <img src="https://picsum.photos/seed/topic-performance/200/100" alt="Performance" className="h-10 opacity-20 object-contain" referrerPolicy="no-referrer" />
          </div>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {progress.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">
              No study data yet. Start learning to see your progress!
            </div>
          ) : (
            progress.map((p, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    p.weaknessLevel === 'high' ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600" :
                    p.weaknessLevel === 'medium' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600" :
                    "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"
                  )}>
                    {p.score > 80 ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{p.topic}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.subject}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{p.score}%</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    p.weaknessLevel === 'high' ? "text-rose-500" :
                    p.weaknessLevel === 'medium' ? "text-amber-500" :
                    "text-emerald-500"
                  )}>
                    {p.weaknessLevel} priority
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
