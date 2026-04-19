import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, LayoutDashboard, MessageSquare, BookOpen, Settings, LogOut, LogIn, AlertTriangle, User, ShieldCheck, Megaphone, FileText, Timer, Link as LinkIcon, Search, Sun, Moon, Sparkles, Plus, Trash2, X, ClipboardCheck, Menu, Loader2, Check, RefreshCw, Bookmark, BookmarkCheck } from 'lucide-react';
import { ALL_SUBJECTS } from './constants';
import { LanguageToggle } from './components/LanguageToggle';
import { ChatBox } from './components/ChatBox';
import { Dashboard } from './components/Dashboard';
import { Onboarding } from './components/Onboarding';
import { AdminDashboard } from './components/AdminDashboard';
import { QuizSimulation } from './components/QuizSimulation';
import { MockExams } from './components/MockExams';
import { Language, Subject, ChatMessage, ProgressRecord, UserProfile, Announcement, Resource, ExamBoard, Homework } from './types';
import { getTutorResponse, solvePastPaperQuestion, generateWeeklySummary } from './services/geminiService';
import { HomeworkTab } from './components/HomeworkTab';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Tooltip } from './components/Tooltip';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestore-errors';

// Error Boundary Component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorInfo(event.error?.message || 'An unexpected error occurred.');
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      setHasError(true);
      setErrorInfo(event.reason?.message || 'A network or asynchronous error occurred.');
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-[2rem] border border-slate-700 shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-900/20">
            <AlertTriangle size={32} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Portal Error</h2>
            <p className="text-slate-400">The application encountered a critical error. This usually happens due to connection issues or missing data.</p>
          </div>
          {errorInfo && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-700">
              <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Error Log</p>
              <pre className="text-xs text-rose-400 overflow-auto max-h-32">
                {errorInfo}
              </pre>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            Refresh Portal
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
  
  const [activeTab, setActiveTab] = useState<'tutor' | 'dashboard' | 'revision' | 'admin' | 'resources' | 'quiz' | 'exams' | 'settings' | 'homework'>('tutor');
  const [language, setLanguage] = useState<Language>('English');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [revisionPlan, setRevisionPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<{
    weaknesses: string[];
    potential: string;
    rating: number;
    summary: string;
  } | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceSubjectFilter, setResourceSubjectFilter] = useState('');
  const [resourceBoardFilter, setResourceBoardFilter] = useState('');
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
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [pendingAssessment, setPendingAssessment] = useState<{ type: 'quiz' | 'exam', subject: string, topic?: string } | null>(null);

  const mapMessagesToHistory = useCallback((msgs: ChatMessage[]) => {
    return msgs.map(m => {
      const parts: any[] = [{ text: m.content }];
      if (m.imageUrl) {
        const base64Data = m.imageUrl.split(',')[1];
        parts.unshift({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
      }
      return {
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts
      };
    });
  }, []);

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
            const profileData = userDoc.data() as UserProfile;
            setProfile(profileData);
            setLanguage(profileData.languagePreference);
            if (profileData.tutorStyle) {
              setTutorStyle(profileData.tutorStyle);
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
    
    const annQuery = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(5));
    const unsubAnn = onSnapshot(annQuery, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'announcements'));

    const resQuery = query(collection(db, 'resources'), orderBy('timestamp', 'desc'));
    const unsubRes = onSnapshot(resQuery, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'resources'));

    const hwQuery = query(collection(db, 'homework'), orderBy('timestamp', 'desc'));
    const unsubHw = onSnapshot(hwQuery, (snapshot) => {
      setHomeworkList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Homework)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'homework'));

    return () => {
      unsubAnn();
      unsubRes();
      unsubHw();
    };
  }, [user]);

  // User-specific Listeners
  useEffect(() => {
    if (!user || !isAuthReady || !profile) return;

    const msgQuery = query(
      collection(db, 'messages'), 
      where('uid', '==', user.uid),
      orderBy('timestamp', 'asc')
    );
    const unsubMsg = onSnapshot(msgQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages'));

    const progQuery = query(collection(db, 'progress'), where('uid', '==', user.uid));
    const unsubProg = onSnapshot(progQuery, (snapshot) => {
      setProgress(snapshot.docs.map(doc => doc.data() as ProgressRecord));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'progress'));

    return () => {
      unsubMsg();
      unsubProg();
    };
  }, [user, isAuthReady, profile]);

  const handleOnboardingComplete = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // Determine role: hardcoded admin check OR selected role
    let finalRole: 'student' | 'staff' | 'admin' = data.role || 'student';
    if (user.email === 'douglasnkowo3036@gmail.com') {
      finalRole = 'admin';
    }

    const newProfile: UserProfile = {
      id: user.uid,
      name: data.name || user.displayName || 'Student',
      class: data.class || '',
      grade: data.level || 'O-Level',
      level: data.level || 'O-Level',
      languagePreference: 'English',
      examBoard: data.examBoard!,
      selectedSubjects: data.selectedSubjects!,
      studyStreak: 1,
      lastActive: new Date().toISOString(),
      role: finalRole
    };
    
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
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
  
  const handleToggleBookmark = async (resourceId: string) => {
    if (!user || !profile) return;
    
    const currentBookmarks = profile.bookmarkedResourceIds || [];
    const isBookmarked = currentBookmarks.includes(resourceId);
    
    const newBookmarks = isBookmarked 
      ? currentBookmarks.filter(id => id !== resourceId)
      : [...currentBookmarks, resourceId];
      
    setProfile({ ...profile, bookmarkedResourceIds: newBookmarks });
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        bookmarkedResourceIds: newBookmarks
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      // Revert state on error if needed, though profile state update is optimistic
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!user || !profile) return;
    
    const userMsg = {
      role: 'user' as const,
      content: text,
      timestamp: Date.now(),
      uid: user.uid
    };
    
    try {
      await addDoc(collection(db, 'messages'), userMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }

    setIsLoading(true);
    
    const history = mapMessagesToHistory(messages);

    // RAG: Filter resources relevant to any of the student's subjects
    const relevantResources = resources.filter(r => 
      profile.selectedSubjects.includes(r.subject as Subject) && 
      r.examBoard === profile.examBoard
    );

    const aiResponse = await getTutorResponse(
      text, 
      language, 
      profile.selectedSubjects as Subject[], 
      profile.examBoard, 
      profile.level, 
      history, 
      relevantResources, 
      tutorStyle, 
      homeworkList, 
      profile.chatbotName || 'Dzidzo',
      profile.name,
      progress
    );
    
    let botMsg: ChatMessage = {
      id: doc(collection(db, 'messages')).id,
      role: 'assistant' as const,
      content: aiResponse.text,
      timestamp: Date.now(),
      uid: user.uid
    };

    if (aiResponse.imageUrl) {
      botMsg.imageUrl = aiResponse.imageUrl;
    }

    if (aiResponse.toolCall && aiResponse.toolCall.name === 'start_assessment') {
      const { type, subject, topic } = aiResponse.toolCall.args;
      botMsg.assessmentSuggestion = { type, subject, topic };
    }

    try {
      await addDoc(collection(db, 'messages'), botMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
    setIsLoading(false);
  };

  const handleUploadImage = async (base64: string) => {
    if (!user || !profile) return;
    
    // Add user message with image first
    const userMsg = {
      role: 'user' as const,
      content: "I've uploaded an image. Can you help me with this?",
      imageUrl: `data:image/jpeg;base64,${base64}`,
      timestamp: Date.now(),
      uid: user.uid
    };

    try {
      await addDoc(collection(db, 'messages'), userMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }

    setIsLoading(true);
    
    const history = mapMessagesToHistory(messages);

    const response = await solvePastPaperQuestion(
      base64, 
      language, 
      profile.selectedSubjects as Subject[], 
      profile.examBoard, 
      profile.level, 
      history,
      profile.name
    );
    
    const botMsg = {
      role: 'assistant' as const,
      content: response,
      timestamp: Date.now(),
      uid: user.uid
    };

    try {
      await addDoc(collection(db, 'messages'), botMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
    setIsLoading(false);
  };

  const generateWeeklySummaryData = async () => {
    if (!profile || progress.length === 0) return;
    setIsGeneratingSummary(true);
    try {
      const summary = await generateWeeklySummary(progress, profile.examBoard, profile.level, language, profile.name, tutorStyle);
      if (summary) {
        setWeeklySummary(summary);
        // Save to Firestore
        if (user) {
          await setDoc(doc(db, 'weekly_summaries', user.uid), {
            ...summary,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate weekly summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const generateRevisionPlan = async () => {
    if (!profile) return;
    setIsGeneratingPlan(true);
    const weakTopics = progress.filter(p => p.weaknessLevel === 'high').map(p => `${p.subject}: ${p.topic}`).join(', ');
    const prompt = `Generate a 7-day ${profile.examBoard} revision plan for ${profile.name} who is struggling with these topics: ${weakTopics || 'general subjects: ' + profile.selectedSubjects.join(', ')}. 
    The plan should be in ${language} and include daily goals, practice question types, and study tips.
    TUTOR STYLE: ${tutorStyle || 'Professional and encouraging'}`;
    
    const response = await getTutorResponse(
      prompt, 
      language, 
      profile.selectedSubjects as Subject[], 
      profile.examBoard, 
      profile.level, 
      [], 
      [], 
      tutorStyle, 
      [], 
      profile.chatbotName || 'Dzidzo',
      profile.name,
      progress
    );
    setRevisionPlan(response.text);
    setIsGeneratingPlan(false);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white animate-pulse">
            <GraduationCap size={28} />
          </div>
          <p className="text-slate-400 font-medium">Loading Marchwood Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <img src="https://picsum.photos/seed/education-pattern/1920/1080" alt="background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8 relative z-10"
        >
          <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-200 dark:shadow-none">
            <GraduationCap size={48} />
          </div>
          <div>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Marchwood</h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">The official learning platform for Marchwood Senior School. AI-powered tutor (Dzidzo), full-length mock exams, and homework management.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Sparkles className="text-amber-500 mx-auto mb-2" size={24} />
              <p className="text-xs font-bold dark:text-white">AI Powered</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ClipboardCheck className="text-blue-500 mx-auto mb-2" size={24} />
              <p className="text-xs font-bold dark:text-white">Exam Ready</p>
            </div>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-blue-600 text-white px-8 py-5 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl active:scale-[0.98]"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500">Empowering students across Zimbabwe and beyond.</p>
        </motion.div>
      </div>
    );
  }

  if (!profile || !profile.level) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const isAdmin = user?.email === 'douglasnkowo3036@gmail.com' || profile?.role === 'admin';
  const isStaff = profile?.role === 'staff' || isAdmin;

  useEffect(() => {
    if (profile?.examBoard && !resourceBoardFilter) {
      setResourceBoardFilter(profile.examBoard);
    }
  }, [profile?.examBoard]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const filteredResources = (resources || []).filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                         r.subject.toLowerCase().includes(resourceSearch.toLowerCase());
    const matchesSubject = !resourceSubjectFilter || r.subject === resourceSubjectFilter;
    const matchesBoard = !resourceBoardFilter || r.examBoard === resourceBoardFilter;
    
    return matchesSearch && matchesSubject && matchesBoard;
  });

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden border-b p-4 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold dark:text-white">Marchwood</h1>
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
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55]"
            />
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 z-[60] shadow-2xl overflow-y-auto"
            >
              <div className="flex flex-col p-6 min-h-full">
                <div className="flex items-center justify-between mb-8 shrink-0">
                  <div className="flex items-center gap-2">
                    <img 
                      src="https://picsum.photos/seed/marchwood-senior-school-logo/200/200" 
                      alt="Marchwood Logo" 
                      className="w-10 h-10 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <h1 className="text-lg font-bold dark:text-white">Marchwood</h1>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">✕</button>
                </div>
                
                <nav className="flex-1 space-y-2">
                  {[
                    { id: 'tutor', label: 'AI Tutor', icon: MessageSquare },
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'homework', label: 'Homework', icon: BookOpen },
                    { id: 'exams', label: 'Mock Exams', icon: ClipboardCheck },
                    { id: 'quiz', label: 'Quiz Mode', icon: Timer },
                    { id: 'resources', label: 'Resources', icon: FileText },
                    { id: 'revision', label: 'Revision Plan', icon: BookOpen },
                    { id: 'settings', label: 'Settings', icon: Settings },
                    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }] : []),
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-base transition-all",
                        activeTab === item.id 
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold" 
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <item.icon size={20} />
                      {item.label}
                    </button>
                  ))}
                </nav>
                
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 pb-8 shrink-0">
                  <button 
                    onClick={toggleTheme}
                    className="flex items-center gap-4 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 transition-colors mb-4"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm">
                      {theme === 'dark' ? <Moon size={18} className="text-amber-400" /> : <Sun size={18} className="text-amber-500" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold dark:text-white">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all font-semibold"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col transition-colors duration-300 overflow-y-auto scrollbar-hide">
        <div className="p-6 flex flex-col min-h-full">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <GraduationCap size={28} />
            </div>
            <h1 className="text-xl font-bold tracking-tight dark:text-white">Marchwood</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'tutor', label: 'AI Tutor', icon: MessageSquare, tooltip: 'Chat with your AI tutor' },
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'View your progress and stats' },
              { id: 'homework', label: 'Homework', icon: BookOpen, tooltip: 'View and manage assignments' },
              { id: 'exams', label: 'Mock Exams', icon: ClipboardCheck, tooltip: 'Full exam simulations based on chat' },
              { id: 'quiz', label: 'Quiz Mode', icon: Timer, tooltip: 'Practice with quick quizzes' },
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

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2 mt-auto">
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
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{profile?.examBoard} • {profile?.level}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-12 max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-300">
              {activeTab === 'tutor' ? 'AI Exam Tutor' : 
               activeTab === 'dashboard' ? 'My Progress' : 
               activeTab === 'exams' ? 'Mock Exams' :
               activeTab === 'quiz' ? 'Quick Quizzes' :
               activeTab === 'resources' ? 'Study Resources' :
               activeTab === 'admin' ? 'Admin Control' : 'Revision Planner'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">
              {activeTab === 'tutor' ? `Get step-by-step help with ${profile.examBoard} studies.` : 
               activeTab === 'dashboard' ? 'Track your performance across subjects.' : 
               activeTab === 'exams' ? 'Full exams generated from your chat history.' :
               activeTab === 'quiz' ? 'Test your knowledge with quick AI questions.' :
               activeTab === 'resources' ? 'Access curated notes and materials.' :
               activeTab === 'admin' ? 'Manage announcements and resources.' : 'Your personalized study schedule.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageToggle selected={language} onSelect={setLanguage} />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'tutor' && profile && (
            <motion.div
              key="tutor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <ChatBox 
                messages={messages} 
                onSendMessage={handleSendMessage}
                onUploadImage={handleUploadImage}
                isLoading={isLoading}
                language={language}
                onSpeak={speak}
                onStopSpeaking={stopSpeaking}
                isSpeaking={isSpeaking}
                homeworkList={homeworkList}
                chatbotName={profile.chatbotName}
                onStartAssessment={(type, subject, topic) => {
                  setPendingAssessment({ type, subject, topic });
                  setActiveTab(type === 'exam' ? 'exams' : 'quiz');
                }}
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
                board={profile.examBoard}
                level={profile.level}
                language={language}
                announcements={announcements}
                theme={theme}
                onStartSimulation={() => setActiveTab('quiz')}
                onStartExam={() => setActiveTab('exams')}
                onStartHomework={() => setActiveTab('homework')}
                weeklySummary={weeklySummary}
                onGenerateSummary={generateWeeklySummaryData}
                isGeneratingSummary={isGeneratingSummary}
                chatbotName={profile.chatbotName || 'Dzidzo'}
                studentName={profile.name}
                tutorStyle={tutorStyle}
                selectedSubjects={profile.selectedSubjects as Subject[]}
              />
            </motion.div>
          )}

          {activeTab === 'homework' && profile && (
            <motion.div
              key="homework"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HomeworkTab userProfile={profile} />
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
              <QuizSimulation 
                board={profile.examBoard} 
                level={profile.level}
                language={language}
                availableSubjects={profile.selectedSubjects as Subject[]}
                chatHistory={messages}
                autoStartSubject={pendingAssessment?.type === 'quiz' ? pendingAssessment.subject : undefined}
                autoStartTopic={pendingAssessment?.type === 'quiz' ? pendingAssessment.topic : undefined}
                onComplete={async (score, selectedSubject) => {
                  setPendingAssessment(null);
                  if (!user) return;
                  // Save progress logic
                  const newRecord: ProgressRecord = {
                    topic: `Quiz: ${selectedSubject}`,
                    score: Math.round(score),
                    lastAttempt: new Date().toISOString(),
                    subject: selectedSubject,
                    weaknessLevel: score < 50 ? 'high' : score < 80 ? 'medium' : 'low',
                    uid: user.uid,
                    type: 'quiz'
                  };
                  
                  try {
                    await addDoc(collection(db, 'progress'), {
                      ...newRecord,
                      timestamp: Date.now()
                    });
                    setProgress(prev => [newRecord, ...prev]);
                  } catch (error) {
                    handleFirestoreError(error, OperationType.WRITE, 'progress');
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === 'exams' && profile && (
            <motion.div
              key="exams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <MockExams 
                board={profile.examBoard} 
                level={profile.level}
                language={language}
                chatHistory={messages}
                availableSubjects={profile.selectedSubjects as Subject[]}
                autoStartSubject={pendingAssessment?.type === 'exam' ? pendingAssessment.subject : undefined}
                autoStartTopic={pendingAssessment?.type === 'exam' ? pendingAssessment.topic : undefined}
                onComplete={async (score, selectedSubject) => {
                  setPendingAssessment(null);
                  if (!user) return;
                  const newRecord: ProgressRecord = {
                    topic: `Mock Exam: ${selectedSubject}`,
                    score: Math.round(score),
                    lastAttempt: new Date().toISOString(),
                    subject: selectedSubject,
                    weaknessLevel: score < 50 ? 'high' : score < 80 ? 'medium' : 'low',
                    uid: user.uid,
                    type: 'test'
                  };
                  
                  try {
                    await addDoc(collection(db, 'progress'), {
                      ...newRecord,
                      timestamp: Date.now()
                    });
                    setProgress(prev => [newRecord, ...prev]);
                  } catch (error) {
                    handleFirestoreError(error, OperationType.WRITE, 'progress');
                  }
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
              <div className="relative h-48 rounded-[2.5rem] overflow-hidden mb-8 shadow-lg">
                <img src="https://picsum.photos/seed/resources/1200/400" alt="Resources" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent flex items-center p-12">
                  <div className="text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-8 h-8 text-blue-400" />
                      <h1 className="text-4xl font-black">Study Resources</h1>
                    </div>
                    <p className="text-slate-200">Access curated notes, PDFs, and links for your subjects.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end max-w-4xl">
                <div className="relative flex-1 w-full">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Search Keyword</label>
                  <Search className="absolute left-4 top-10 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search resources by title or content..."
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-900 transition-all dark:text-white"
                  />
                </div>

                <div className="w-full md:w-48">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Subject</label>
                  <select
                    value={resourceSubjectFilter}
                    onChange={(e) => setResourceSubjectFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-900 appearance-none transition-all dark:text-white"
                  >
                    <option value="">All Subjects</option>
                    {(profile?.selectedSubjects || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Exam Board</label>
                  <select
                    value={resourceBoardFilter}
                    onChange={(e) => setResourceBoardFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-900 appearance-none transition-all dark:text-white"
                  >
                    <option value="">All Boards</option>
                    <option value="ZIMSEC">ZIMSEC</option>
                    <option value="Cambridge">Cambridge</option>
                  </select>
                </div>

                <button 
                  onClick={() => {
                    setResourceSearch('');
                    setResourceSubjectFilter('');
                    setResourceBoardFilter(profile?.examBoard || '');
                  }}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-xl mb-0.5 transition-colors"
                  title="Reset Filters"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map(res => {
                  const isBookmarked = profile?.bookmarkedResourceIds?.includes(res.id);
                  return (
                    <div 
                      key={res.id} 
                      className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
                          {res.type === 'Link' ? <LinkIcon size={24} /> : <FileText size={24} />}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleBookmark(res.id);
                            }}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              isBookmarked 
                                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" 
                                : "bg-slate-50 text-slate-400 dark:bg-slate-800 hover:text-amber-500"
                            )}
                            title={isBookmarked ? "Remove Bookmark" : "Bookmark Resource"}
                          >
                            {isBookmarked ? <BookmarkCheck size={18} fill="currentColor" /> : <Bookmark size={18} />}
                          </button>
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg dark:text-slate-300">
                            {res.subject}
                          </span>
                        </div>
                      </div>
                      <a 
                        href={res.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 dark:text-white transition-colors">{res.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{res.description}</p>
                      </a>
                    </div>
                  );
                })}
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
              <div className="relative h-48 rounded-[2.5rem] overflow-hidden mb-8 shadow-lg">
                <img src="https://picsum.photos/seed/settings/1200/400" alt="Settings" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent flex items-center p-12">
                  <div className="text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <Settings className="w-8 h-8 text-blue-400" />
                      <h1 className="text-4xl font-black">Preferences</h1>
                    </div>
                    <p className="text-slate-200">Personalize your AI tutor and manage your profile.</p>
                  </div>
                </div>
              </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chatbot Name</label>
                      <input 
                        type="text" 
                        value={profile.chatbotName || ''} 
                        onChange={async (e) => {
                          const newName = e.target.value;
                          setProfile({ ...profile, chatbotName: newName });
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
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
                        if (!user || !profile) return;
                        setIsUpdatingPreferences(true);
                        setUpdateSuccess(false);
                        const userDocRef = doc(db, 'users', user.uid);
                        try {
                          await updateDoc(userDocRef, { 
                            tutorStyle,
                            chatbotName: profile.chatbotName
                          });
                          setUpdateSuccess(true);
                          setTimeout(() => setUpdateSuccess(false), 3000);
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
                        } finally {
                          setIsUpdatingPreferences(false);
                        }
                      }}
                      disabled={isUpdatingPreferences}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2",
                        updateSuccess 
                          ? "bg-emerald-500 text-white shadow-emerald-200" 
                          : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
                      )}
                    >
                      {isUpdatingPreferences ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Saving...
                        </>
                      ) : updateSuccess ? (
                        <>
                          <Check size={20} />
                          Preferences Saved!
                        </>
                      ) : (
                        'Save Preferences'
                      )}
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

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <Bookmark className="text-amber-500" size={24} />
                    My Bookmarks
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {(resources || []).filter(r => profile.bookmarkedResourceIds?.includes(r.id)).length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {(resources || []).filter(r => profile.bookmarkedResourceIds?.includes(r.id)).map(res => (
                        <div key={res.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-amber-200 dark:hover:border-amber-900/30">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400">
                              {res.type === 'Link' ? <LinkIcon size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm truncate dark:text-white">{res.title}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{res.subject} • {res.examBoard}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a 
                              href={res.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <LinkIcon size={18} />
                            </a>
                            <button 
                              onClick={() => handleToggleBookmark(res.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <Bookmark size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-400 text-sm">No bookmarked resources yet.</p>
                      <button 
                        onClick={() => setActiveTab('resources')}
                        className="text-blue-600 text-sm font-bold mt-2 hover:underline"
                      >
                        Explore resources
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="text-xl font-bold dark:text-white">About Dzidzo</h3>
                <div className="space-y-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  <p>
                    <strong>Dzidzo</strong> is a next-generation AI-powered learning platform designed to democratize high-quality education. Our mission is to provide every student with a personalized AI tutor that adapts to their unique learning style and pace.
                  </p>
                  <p>
                    <strong>The School:</strong> Dzidzo Academy is a forward-thinking institution committed to integrating technology with traditional pedagogy to create an immersive learning environment.
                  </p>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white mb-2">Developer Portfolio</p>
                    <p>
                      Developed with ❤️ by a passionate engineer dedicated to building tools that empower people. 
                      <br />
                      <a href="#" className="text-blue-600 hover:underline">View Portfolio</a> | <a href="#" className="text-blue-600 hover:underline">LinkedIn</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 pb-12">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                >
                  <LogOut size={20} />
                  Log Out
                </button>
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
              <div className="relative h-48 rounded-[2.5rem] overflow-hidden mb-8 shadow-lg">
                <img src="https://picsum.photos/seed/revision-plan/1200/400" alt="Revision" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-900/40 to-transparent flex items-center p-12">
                  <div className="text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="w-8 h-8 text-blue-400" />
                      <h1 className="text-4xl font-black">Revision Plan</h1>
                    </div>
                    <p className="text-blue-100">Your personalized 7-day study schedule generated by Dzidzo AI.</p>
                  </div>
                </div>
              </div>

              {!revisionPlan ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <BookOpen size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Personalized Revision Plan</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Based on your performance, we're generating a custom 7-day schedule to tackle your weak topics.
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
