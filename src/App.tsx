import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, LayoutDashboard, MessageSquare, BookOpen, Settings, LogOut, LogIn, AlertTriangle, User, ShieldCheck, Megaphone, FileText, Timer, Link as LinkIcon, Search, Sun, Moon, Sparkles, Plus, Trash2, X } from 'lucide-react';
import { ALL_SUBJECTS } from './constants';
import { SubjectSelector } from './components/SubjectSelector';
import { LanguageToggle } from './components/LanguageToggle';
import { ChatBox } from './components/ChatBox';
import { Dashboard } from './components/Dashboard';
import { Onboarding } from './components/Onboarding';
import { AdminDashboard } from './components/AdminDashboard';
import { QuizSimulation } from './components/QuizSimulation';
import { Language, Subject, ChatMessage, ProgressRecord, UserProfile, Announcement, Resource, ExamBoard } from './types';
import { getTutorResponse, solvePastPaperQuestion } from './services/geminiService';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Tooltip } from './components/Tooltip';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc,
  limit,
  updateDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

// Error Boundary Component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorInfo(event.error?.message || 'An unexpected error occurred.');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-slate-500 text-sm">{errorInfo}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <DzidzoApp />
    </ErrorBoundary>
  );
}

function DzidzoApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'tutor' | 'dashboard' | 'revision' | 'admin' | 'resources' | 'quiz' | 'settings'>('tutor');
  const [language, setLanguage] = useState<Language>('English');
  const [subject, setSubject] = useState<Subject>('Maths');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [revisionPlan, setRevisionPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dzidzo-theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [tutorStyle, setTutorStyle] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    console.log('Applying theme:', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dzidzo-theme', theme);
  }, [theme]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            setLanguage(data.languagePreference);
            if (data.selectedSubjects?.length > 0) {
              setSubject(data.selectedSubjects[0]);
            }
            if (data.tutorStyle) {
              setTutorStyle(data.tutorStyle);
            }
          } else {
            setProfile(null); // Trigger onboarding
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        setMessages([]);
        setProgress([]);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Global Listeners (Announcements & Resources)
  useEffect(() => {
    if (!user) return;
    console.log('Setting up global listeners...');
    const unsubAnn = onSnapshot(query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(5)), (snapshot) => {
      console.log('Announcements snapshot:', snapshot.size, 'docs');
      setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    }, (error) => {
      console.error('Announcements error:', error);
      handleFirestoreError(error, OperationType.GET, 'announcements');
    });
    const unsubRes = onSnapshot(query(collection(db, 'resources'), orderBy('timestamp', 'desc')), (snapshot) => {
      setResources(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Resource)));
    });
    return () => { unsubAnn(); unsubRes(); };
  }, [user]);

  // User-specific Listeners
  useEffect(() => {
    if (!user || !isAuthReady || !profile) return;

    const messagesPath = `users/${user.uid}/messages`;
    const qMessages = query(collection(db, messagesPath), orderBy('timestamp', 'asc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs);
    }, (error) => handleFirestoreError(error, OperationType.GET, messagesPath));

    const progressPath = `users/${user.uid}/progress`;
    const unsubProgress = onSnapshot(collection(db, progressPath), (snapshot) => {
      const prog = snapshot.docs.map(doc => doc.data() as ProgressRecord);
      setProgress(prog);
    }, (error) => handleFirestoreError(error, OperationType.GET, progressPath));

    return () => {
      unsubMessages();
      unsubProgress();
    };
  }, [user, isAuthReady, profile]);

  const handleOnboardingComplete = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const newProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || 'Student',
      grade: data.level || 'O-Level',
      level: data.level || 'O-Level',
      languagePreference: 'English',
      examBoard: data.examBoard!,
      selectedSubjects: data.selectedSubjects!,
      studyStreak: 1,
      lastActive: new Date().toISOString(),
      role: (user.email === 'douglasnkowo0145@gmail.com' || user.email === 'douglasnkowo3036@gmail.com') ? 'admin' : 'student'
    };
    
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
      if (newProfile.selectedSubjects.length > 0) setSubject(newProfile.selectedSubjects[0]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSendMessage = async (text: string) => {
    if (!user || !profile) return;
    
    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: text,
      timestamp: Date.now(),
      subject,
      uid: user.uid
    };
    
    const messagesPath = `users/${user.uid}/messages`;
    try {
      await addDoc(collection(db, messagesPath), userMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messagesPath);
    }

    setIsLoading(true);
    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));

    // RAG: Filter resources relevant to the current subject and board
    const relevantResources = resources.filter(r => r.subject === subject && r.examBoard === profile.examBoard);

    const response = await getTutorResponse(text, language, subject, profile.examBoard, profile.level, history, relevantResources, tutorStyle);
    
    const botMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: response,
      timestamp: Date.now(),
      subject,
      uid: user.uid
    };

    try {
      await addDoc(collection(db, messagesPath), botMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messagesPath);
    }
    setIsLoading(false);
  };

  const handleUploadImage = async (base64: string) => {
    if (!user || !profile) return;
    setIsLoading(true);
    const response = await solvePastPaperQuestion(base64, language, subject, profile.examBoard, profile.level);
    
    const botMsg = {
      id: Date.now().toString(),
      role: 'assistant' as const,
      content: response,
      timestamp: Date.now(),
      subject,
      uid: user.uid
    };

    const messagesPath = `users/${user.uid}/messages`;
    try {
      await addDoc(collection(db, messagesPath), botMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messagesPath);
    }
    setIsLoading(false);
  };

  const generateRevisionPlan = async () => {
    if (!profile) return;
    setIsGeneratingPlan(true);
    const weakTopics = progress.filter(p => p.weaknessLevel === 'high').map(p => p.topic).join(', ');
    const prompt = `Generate a 7-day ${profile.examBoard} revision plan for a student who is struggling with these topics in ${subject}: ${weakTopics}. 
    The plan should be in ${language} and include daily goals, practice question types, and study tips.`;
    
    const response = await getTutorResponse(prompt, language, subject, profile.examBoard, profile.level);
    setRevisionPlan(response);
    setIsGeneratingPlan(false);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white animate-pulse">
            <GraduationCap size={28} />
          </div>
          <p className="text-slate-400 font-medium">Loading Dzidzo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-200 dark:shadow-none">
            <GraduationCap size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Dzidzo Learning</h1>
            <p className="text-slate-500 dark:text-slate-400">Your AI-powered ZIMSEC & Cambridge tutor. Learn in English, Shona, or Ndebele.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl active:scale-[0.98]"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500">By signing in, you agree to our Terms of Service.</p>
        </motion.div>
      </div>
    );
  }

  if (!profile || !profile.level) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const isAdmin = profile?.role === 'admin' || user?.email === 'douglasnkowo0145@gmail.com' || user?.email === 'douglasnkowo3036@gmail.com';

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const filteredResources = (resources || []).filter(r => 
    r.examBoard === profile?.examBoard && 
    (r.title.toLowerCase().includes(resourceSearch.toLowerCase()) || 
     r.subject.toLowerCase().includes(resourceSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden border-b p-4 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <img 
            src="https://picsum.photos/seed/dzidzo-learning-logo/200/200" 
            alt="Dzidzo Logo" 
            className="w-10 h-10 rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-lg font-bold dark:text-white">Dzidzo</h1>
            {profile && <p className="text-[10px] text-slate-500 font-medium dark:text-slate-400">Hi, {profile.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl transition-colors text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600"
          >
            <MessageSquare size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 bg-white dark:bg-slate-900 z-[60] p-6 flex flex-col lg:hidden transition-colors duration-300"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-2">
                <img 
                  src="https://picsum.photos/seed/dzidzo-learning-logo/200/200" 
                  alt="Dzidzo Logo" 
                  className="w-10 h-10 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-lg font-bold dark:text-white">Dzidzo</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400">✕</button>
            </div>
            
            <nav className="flex-1 space-y-4">
              {[
                { id: 'tutor', label: 'AI Tutor', icon: MessageSquare },
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'quiz', label: 'Quiz Mode', icon: Timer },
                { id: 'resources', label: 'Resources', icon: FileText },
                { id: 'revision', label: 'Revision Plan', icon: BookOpen },
                ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }] : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg transition-all",
                    activeTab === item.id 
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <item.icon size={24} />
                  {item.label}
                </button>
              ))}
              
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={toggleTheme}
                  className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm">
                    {theme === 'dark' ? <Moon className="text-amber-400" /> : <Sun className="text-amber-500" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold dark:text-white">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Switch to {theme === 'dark' ? 'light' : 'dark'} theme</p>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-slate-200 dark:bg-blue-600 relative transition-colors">
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                      theme === 'dark' ? "right-1" : "left-1"
                    )} />
                  </div>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 hidden lg:flex flex-col transition-colors duration-300">
        <div className="flex items-center gap-3 mb-12">
          <img 
            src="https://picsum.photos/seed/dzidzo-learning-logo/200/200" 
            alt="Dzidzo Logo" 
            className="w-12 h-12 rounded-xl object-cover shadow-lg shadow-blue-200 dark:shadow-none"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl font-bold tracking-tight dark:text-white">Dzidzo</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'tutor', label: 'AI Tutor', icon: MessageSquare, tooltip: 'Chat with your AI tutor' },
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'View your progress and stats' },
            { id: 'quiz', label: 'Quiz Mode', icon: Timer, tooltip: 'Practice with exam simulations' },
            { id: 'resources', label: 'Resources', icon: FileText, tooltip: 'Study materials and notes' },
            { id: 'revision', label: 'Revision Plan', icon: BookOpen, tooltip: 'Your personalized study schedule' },
            { id: 'settings', label: 'Settings', icon: Settings, tooltip: 'App preferences and profile' },
            ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck, tooltip: 'Admin controls' }] : []),
          ].map((item) => (
            <Tooltip key={item.id} text={item.tooltip} position="right">
              <button 
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            </Tooltip>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-500" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate dark:text-white">{profile?.name}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{profile?.examBoard} • {profile?.grade}</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('settings')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Settings size={20} />
            Settings
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-12 max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-300">
              {activeTab === 'tutor' ? 'AI Exam Tutor' : 
               activeTab === 'dashboard' ? 'My Progress' : 
               activeTab === 'quiz' ? 'Exam Simulation' :
               activeTab === 'resources' ? 'Study Resources' :
               activeTab === 'admin' ? 'Admin Control' : 'Revision Planner'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">
              {activeTab === 'tutor' ? `Get step-by-step help with ${profile.examBoard} studies.` : 
               activeTab === 'dashboard' ? 'Track your performance across subjects.' : 
               activeTab === 'quiz' ? 'Test your knowledge with AI-generated questions.' :
               activeTab === 'resources' ? 'Access curated notes and materials.' :
               activeTab === 'admin' ? 'Manage announcements and resources.' : 'Your personalized study schedule.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageToggle selected={language} onSelect={setLanguage} />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'tutor' && (
            <motion.div
              key="tutor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <SubjectSelector 
                selected={subject} 
                onSelect={setSubject} 
                availableSubjects={profile.selectedSubjects?.length > 0 ? profile.selectedSubjects : ALL_SUBJECTS}
              />
              <ChatBox 
                messages={messages} 
                onSendMessage={handleSendMessage}
                onUploadImage={handleUploadImage}
                isLoading={isLoading}
                language={language}
                subject={subject}
                onSpeak={speak}
                onStopSpeaking={stopSpeaking}
                isSpeaking={isSpeaking}
              />
            </motion.div>
          )}

          {activeTab === 'dashboard' && profile && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Dashboard 
                progress={progress} 
                streak={profile.studyStreak || 0} 
                subject={subject}
                board={profile.examBoard}
                level={profile.level}
                language={language}
                announcements={announcements}
                theme={theme}
                onStartSimulation={() => setActiveTab('quiz')}
              />
            </motion.div>
          )}

          {activeTab === 'quiz' && profile && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <SubjectSelector 
                selected={subject} 
                onSelect={setSubject} 
                availableSubjects={profile.selectedSubjects?.length > 0 ? profile.selectedSubjects : ALL_SUBJECTS}
              />
              <QuizSimulation 
                subject={subject} 
                board={profile.examBoard} 
                level={profile.level}
                language={language}
                onComplete={(score) => {
                  // Save progress logic
                  const newRecord: ProgressRecord = {
                    topic: `Mock Exam: ${subject}`,
                    score: Math.round(score),
                    lastAttempt: new Date().toISOString(),
                    subject: subject,
                    weaknessLevel: score < 50 ? 'high' : score < 80 ? 'medium' : 'low',
                    uid: user.uid
                  };
                  setProgress(prev => [newRecord, ...prev]);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search resources by title or subject..."
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map(res => (
                  <a 
                    key={res.id} 
                    href={res.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-slate-100 p-3 rounded-xl text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {res.type === 'Link' ? <LinkIcon size={24} /> : <FileText size={24} />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                        {res.subject}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors">{res.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{res.description}</p>
                  </a>
                ))}
                {filteredResources.length === 0 && (
                  <div className="col-span-full p-12 text-center text-slate-400 italic">
                    {resourceSearch ? "No resources match your search." : "No resources uploaded yet. Check back soon!"}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && profile && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className={cn(
                "p-8 rounded-[2.5rem] border shadow-sm space-y-6",
                theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                    <User size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Profile Settings</h2>
                    <p className="text-slate-500">Manage your learning preferences.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.name} 
                      disabled
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">AI Tutor Personality/Style</label>
                    <div className="relative">
                      <Sparkles className="absolute left-4 top-4 text-indigo-500" size={20} />
                      <textarea 
                        value={tutorStyle}
                        onChange={(e) => setTutorStyle(e.target.value)}
                        placeholder="e.g., Talk like a friendly mentor, use lots of analogies, or be very formal and strict."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 h-24"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Dzidzo will adapt its teaching style based on your instructions.</p>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={async () => {
                        if (!user) return;
                        const userDocRef = doc(db, 'users', user.uid);
                        try {
                          await updateDoc(userDocRef, { tutorStyle });
                          setProfile({ ...profile, tutorStyle });
                          alert('Preferences updated!');
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
                        }
                      }}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      Save Preferences
                    </button>
                  </div>

                  <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4">Manage Subjects</h3>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {profile.selectedSubjects.map(s => (
                          <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium">
                            {s}
                            <button 
                              onClick={async () => {
                                if (!user) return;
                                const newSubjects = profile.selectedSubjects.filter(item => item !== s);
                                if (newSubjects.length === 0) {
                                  alert('You must have at least one subject.');
                                  return;
                                }
                                try {
                                  await updateDoc(doc(db, 'users', user.uid), { selectedSubjects: newSubjects });
                                  if (subject === s) {
                                    setSubject(newSubjects[0]);
                                  }
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
                                }
                              }}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="Search or add new subjects..."
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val && !profile.selectedSubjects.includes(val)) {
                                if (!user) return;
                                try {
                                  await updateDoc(doc(db, 'users', user.uid), { 
                                    selectedSubjects: [...profile.selectedSubjects, val] 
                                  });
                                  (e.target as HTMLInputElement).value = '';
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
                                }
                              }
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">Type a subject name and press Enter to add it.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-xl font-bold mb-4 dark:text-white">Appearance</h3>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="text-amber-400" /> : <Sun className="text-amber-500" />}
                    <span className="font-semibold dark:text-white">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      theme === 'dark' ? "bg-blue-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                      theme === 'dark' ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminDashboard />
            </motion.div>
          )}

          {activeTab === 'revision' && (
            <motion.div
              key="revision"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!revisionPlan ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <BookOpen size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Personalized Revision Plan</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Based on your performance in {subject}, we're generating a custom 7-day schedule to tackle your weak topics.
                  </p>
                  <button 
                    onClick={generateRevisionPlan}
                    disabled={isGeneratingPlan}
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                  >
                    {isGeneratingPlan ? 'Generating...' : 'Generate My Plan'}
                  </button>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold">Your 7-Day Revision Plan</h3>
                    <button 
                      onClick={() => setRevisionPlan(null)}
                      className="text-sm text-blue-600 font-medium"
                    >
                      Reset Plan
                    </button>
                  </div>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{revisionPlan}</ReactMarkdown>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
