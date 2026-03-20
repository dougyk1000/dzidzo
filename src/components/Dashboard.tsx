import { useState, useMemo } from 'react';
import { ProgressRecord, Subject, ExamBoard, Language, Announcement } from '../types';
import { TrendingUp, AlertCircle, CheckCircle2, BookOpen, GraduationCap, Sparkles, Loader2, Megaphone, BarChart3 } from 'lucide-react';
import { cn } from '../utils';
import { analyzeStudentProgress } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Tooltip } from './Tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  progress: ProgressRecord[];
  streak: number;
  subject: Subject;
  board: ExamBoard;
  level: string;
  language: Language;
  announcements: Announcement[];
  theme: 'light' | 'dark';
  onStartSimulation: () => void;
}

export function Dashboard({ progress = [], streak, subject, board, level, language, announcements = [], theme, onStartSimulation }: DashboardProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getWeakTopics = () => progress.filter(p => p.weaknessLevel === 'high');

  const chartData = useMemo(() => {
    return progress
      .filter(p => p.subject === subject)
      .sort((a, b) => new Date(a.lastAttempt).getTime() - new Date(b.lastAttempt).getTime())
      .map(p => ({
        topic: p.topic.length > 15 ? p.topic.substring(0, 12) + '...' : p.topic,
        fullTopic: p.topic,
        score: p.score,
        date: new Date(p.lastAttempt).toLocaleDateString()
      }));
  }, [progress, subject]);

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeStudentProgress(progress, subject, board, level, language);
    setAnalysis(result);
    setIsAnalyzing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="relative h-48 rounded-[2.5rem] overflow-hidden mb-8 shadow-lg">
        <img 
          src={`https://picsum.photos/seed/dzidzo-dashboard-${subject.toLowerCase()}/1200/400`} 
          alt="Dashboard Header" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent flex items-center p-12">
          <div className="text-white">
            <h2 className="text-3xl font-bold mb-2">Welcome back, {board} Scholar!</h2>
            <p className="text-slate-200">Your {subject} journey is progressing well.</p>
          </div>
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
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Tooltip text="Your consecutive study days" position="top">
            <div className="flex items-center gap-3 text-amber-600 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Study Streak</span>
            </div>
          </Tooltip>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{streak} Days</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Keep it up! Consistency is key.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
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

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold dark:text-slate-100">Performance Trend</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your score progress in {subject}.</p>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="topic" 
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
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                    border: '1px solid ' + (theme === 'dark' ? '#1e293b' : '#e2e8f0'), 
                    borderRadius: '12px',
                    color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: '#2563eb' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
              Complete more topics in {subject} to see your performance graph.
            </div>
          )}
        </div>
      </div>

      {/* AI Deep Analysis Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-slate-100">AI Deep Analysis</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Get personalized insights on your performance.</p>
            </div>
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

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2">Ready for a Mock Exam?</h3>
          <p className="text-blue-100 max-w-md mb-6">
            Test your knowledge with a timed {board} simulation. Auto-marking and detailed feedback included.
          </p>
          <Tooltip text="Start a timed exam simulation" position="top">
            <button 
              onClick={onStartSimulation}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-lg"
            >
              Start Simulation
            </button>
          </Tooltip>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <GraduationCap size={200} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Topic Performance</h3>
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
