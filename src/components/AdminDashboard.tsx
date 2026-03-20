import { useState, useEffect } from 'react';
import { Announcement, Resource, Subject, ExamBoard } from '../types';
import { Plus, Trash2, Megaphone, FileText, Loader2, Link as LinkIcon, RefreshCw, Sparkles } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../utils';

export function AdminDashboard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resSubject, setResSubject] = useState<Subject>('Maths');
  const [resBoard, setResBoard] = useState<ExamBoard>('ZIMSEC');
  const [resType, setResType] = useState<'PDF' | 'Link' | 'Note'>('Link');

  // Quiz Gen states
  const [quizSubject, setQuizSubject] = useState<Subject>('Maths');
  const [quizBoard, setQuizBoard] = useState<ExamBoard>('ZIMSEC');
  const [quizTopic, setQuizTopic] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  useEffect(() => {
    const unsubAnn = onSnapshot(query(collection(db, 'announcements'), orderBy('timestamp', 'desc')), (snapshot) => {
      setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    });
    const unsubRes = onSnapshot(query(collection(db, 'resources'), orderBy('timestamp', 'desc')), (snapshot) => {
      setResources(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Resource)));
    });
    return () => { unsubAnn(); unsubRes(); };
  }, []);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: annTitle,
        content: annContent,
        timestamp: Date.now(),
        author: 'Admin'
      });
      setAnnTitle('');
      setAnnContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    }
    setIsLoading(false);
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'resources'), {
        title: resTitle,
        description: resDesc,
        url: resUrl,
        subject: resSubject,
        examBoard: resBoard,
        type: resType,
        timestamp: Date.now()
      });
      setResTitle('');
      setResDesc('');
      setResUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resources');
    }
    setIsLoading(false);
  };

  const handleGenerateQuiz = async () => {
    if (!quizTopic) return;
    setIsGeneratingQuiz(true);
    try {
      // In a real app, this would call Gemini to generate a quiz
      // and then save it to a 'quizzes' collection
      await addDoc(collection(db, 'resources'), {
        title: `AI Quiz: ${quizTopic} (${quizBoard})`,
        description: `Automatically generated quiz for ${quizSubject} - ${quizTopic}.`,
        url: "#", // Placeholder for quiz link
        subject: quizSubject,
        examBoard: quizBoard,
        type: 'Note',
        timestamp: Date.now(),
        isAI: true
      });
      setQuizTopic('');
      alert("AI Quiz generated and added to resources!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resources');
    }
    setIsGeneratingQuiz(false);
  };

  const handleDelete = async (coll: string, id: string) => {
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${coll}/${id}`);
    }
  };

  const handleSyncResources = async () => {
    setIsLoading(true);
    // Simulate syncing from an external source (like Google Drive or Notion via n8n)
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockExternalResources = [
      {
        title: "External: Advanced Calculus Guide",
        description: "Imported from Google Drive",
        url: "https://example.com/calculus",
        subject: "Maths" as Subject,
        examBoard: "Cambridge" as ExamBoard,
        type: "PDF" as const,
        timestamp: Date.now()
      },
      {
        title: "External: Biology Lab Notes",
        description: "Imported from Notion",
        url: "https://example.com/biology",
        subject: "Biology" as Subject,
        examBoard: "ZIMSEC" as ExamBoard,
        type: "Note" as const,
        timestamp: Date.now()
      }
    ];

    try {
      for (const res of mockExternalResources) {
        await addDoc(collection(db, 'resources'), res);
      }
      alert("Resources synced successfully from external sources!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resources');
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-12 pb-12">
      <div className="flex justify-end">
        <button
          onClick={handleSyncResources}
          disabled={isLoading}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          Sync from External Sources
        </button>
      </div>
      {/* Announcements Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <Megaphone className="text-blue-600" />
          <h2 className="text-2xl font-bold">Manage Announcements</h2>
        </div>
        
        <form onSubmit={handleAddAnnouncement} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <input
            type="text"
            placeholder="Announcement Title"
            value={annTitle}
            onChange={(e) => setAnnTitle(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
            required
          />
          <textarea
            placeholder="Content"
            value={annContent}
            onChange={(e) => setAnnContent(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 h-32 dark:text-slate-100"
            required
          />
          <button
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
            Post Announcement
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map(ann => (
            <div key={ann.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <h3 className="font-bold dark:text-slate-100">{ann.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{ann.content}</p>
              </div>
              <button onClick={() => handleDelete('announcements', ann.id)} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Resources Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-900 dark:text-white">
            <FileText className="text-emerald-600" />
            <h2 className="text-2xl font-bold dark:text-slate-100">Manage Study Resources</h2>
          </div>
          
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
            <Sparkles className="text-indigo-600" size={18} />
            <input 
              type="text" 
              placeholder="Topic for AI Quiz..." 
              value={quizTopic}
              onChange={(e) => setQuizTopic(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-40 dark:text-slate-100"
            />
            <button 
              onClick={handleGenerateQuiz}
              disabled={isGeneratingQuiz || !quizTopic}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGeneratingQuiz ? <Loader2 className="animate-spin" size={14} /> : "Gen Quiz"}
            </button>
          </div>
        </div>

        <form onSubmit={handleAddResource} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Resource Title"
              value={resTitle}
              onChange={(e) => setResTitle(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
              required
            />
            <textarea
              placeholder="Description"
              value={resDesc}
              onChange={(e) => setResDesc(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 h-24 dark:text-slate-100"
              required
            />
          </div>
          <div className="space-y-4">
            <input
              type="url"
              placeholder="URL (Google Drive, PDF, etc.)"
              value={resUrl}
              onChange={(e) => setResUrl(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={resSubject} onChange={(e) => setResSubject(e.target.value as Subject)} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-slate-100">
                {['Maths', 'Physics', 'Chemistry', 'Biology', 'English'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={resBoard} onChange={(e) => setResBoard(e.target.value as ExamBoard)} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-slate-100">
                {['ZIMSEC', 'Cambridge'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <select value={resType} onChange={(e) => setResType(e.target.value as any)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-slate-100">
              {['PDF', 'Link', 'Note'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            disabled={isLoading}
            className="md:col-span-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
            Add Resource
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map(res => (
            <div key={res.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                  {res.type === 'Link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                </div>
                <button onClick={() => handleDelete('resources', res.id)} className="text-rose-500 p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-bold text-sm dark:text-slate-100">{res.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{res.subject} • {res.examBoard}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
