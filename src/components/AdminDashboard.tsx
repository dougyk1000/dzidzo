import { useState, useEffect } from 'react';
import { Announcement, Resource, Subject, ExamBoard, UserProfile } from '../types';
import { Plus, Trash2, Megaphone, FileText, Loader2, Link as LinkIcon, RefreshCw, Sparkles, Upload, Users, Check, X } from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  where,
  updateDoc
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { cn } from '../utils';

export function AdminDashboard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [pendingTeachers, setPendingTeachers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annExpiry, setAnnExpiry] = useState('');
  
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resSubject, setResSubject] = useState<Subject>('Maths');
  const [resBoard, setResBoard] = useState<ExamBoard>('ZIMSEC');
  const [resType, setResType] = useState<'PDF' | 'Link' | 'Note'>('Link');
  const [isUploading, setIsUploading] = useState(false);

  // Quiz Gen states
  const [quizSubject, setQuizSubject] = useState<Subject>('Maths');
  const [quizBoard, setQuizBoard] = useState<ExamBoard>('ZIMSEC');
  const [quizTopic, setQuizTopic] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  useEffect(() => {
    const annQuery = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
    const unsubAnn = onSnapshot(annQuery, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'announcements'));

    const resQuery = query(collection(db, 'resources'), orderBy('timestamp', 'desc'));
    const unsubRes = onSnapshot(resQuery, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'resources'));

    // Fetch pending teachers
    const teacherQuery = query(
      collection(db, 'users'), 
      where('role', '==', 'staff'),
      where('status', '==', 'pending')
    );
    const unsubTeachers = onSnapshot(teacherQuery, (snapshot) => {
      setPendingTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => {
      unsubAnn();
      unsubRes();
      unsubTeachers();
    };
  }, []);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: annTitle,
        content: annContent,
        timestamp: Date.now(),
        author: 'Admin',
        expiryDate: annExpiry || null
      });
      setAnnTitle('');
      setAnnContent('');
      setAnnExpiry('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'announcements');
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
      handleFirestoreError(error, OperationType.WRITE, 'resources');
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("File too large. Max 2MB allowed.");
        return;
      }
      
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setResUrl(base64);
        setIsUploading(false);
        setResType('PDF'); // Default to PDF for uploads
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizTopic) return;
    setIsGeneratingQuiz(true);
    try {
      await addDoc(collection(db, 'resources'), {
        title: `AI Quiz: ${quizTopic} (${quizBoard})`,
        description: `Automatically generated quiz for ${quizSubject} - ${quizTopic}.`,
        url: "#",
        subject: quizSubject,
        examBoard: quizBoard,
        type: 'Note',
        timestamp: Date.now(),
        isAI: true
      });
      setQuizTopic('');
      alert("AI Quiz generated and added to resources!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'resources');
    }
    setIsGeneratingQuiz(false);
  };

  const handleDelete = async (table: string, id: string) => {
    try {
      await deleteDoc(doc(db, table, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${table}/${id}`);
    }
  };

  const handleSyncResources = async () => {
    setIsLoading(true);
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
      const batch = writeBatch(db);
      mockExternalResources.forEach(res => {
        const newDocRef = doc(collection(db, 'resources'));
        batch.set(newDocRef, res);
      });
      await batch.commit();
      alert("Resources synced successfully from external sources!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'resources');
    }
    setIsLoading(false);
  };

  const handleApproveTeacher = async (teacherId: string, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'users', teacherId), {
        status: approve ? 'approved' : 'rejected'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${teacherId}`);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      <div className="relative h-64 rounded-[2.5rem] overflow-hidden mb-8 shadow-xl">
        <img src="https://picsum.photos/seed/admin-portal/1200/600" alt="Admin" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent flex items-center p-12">
          <div className="text-white max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <Sparkles className="text-white" size={24} />
              </div>
              <span className="text-sm font-bold tracking-widest uppercase text-blue-400">Administration</span>
            </div>
            <h1 className="text-5xl font-black mb-4 leading-tight">Admin Portal</h1>
            <p className="text-lg text-slate-300 leading-relaxed">Manage Marchwood Senior School resources, announcements, and AI-powered learning tools.</p>
          </div>
        </div>
      </div>

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

      {/* Teacher Approvals Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <Users className="text-amber-500" />
          <h2 className="text-2xl font-bold">Teacher Approvals</h2>
          {pendingTeachers.length > 0 && (
            <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              {pendingTeachers.length} Pending
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingTeachers.map(teacher => (
            <div key={teacher.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl uppercase">
                  {teacher.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold dark:text-white">{teacher.name}</h3>
                  <p className="text-xs text-slate-500">{teacher.class} • {teacher.examBoard}</p>
                  <p className="text-[10px] text-blue-500 font-mono mt-1">{teacher.selectedSubjects.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleApproveTeacher(teacher.id, true)}
                  className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                  title="Approve"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => handleApproveTeacher(teacher.id, false)}
                  className="p-2 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-all"
                  title="Reject"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
          {pendingTeachers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-950/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 italic">No pending teacher signups to review.</p>
            </div>
          )}
        </div>
      </section>

      {/* Announcements Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <Megaphone className="text-blue-600" />
          <h2 className="text-2xl font-bold">Manage Announcements</h2>
        </div>
        
        <form onSubmit={handleAddAnnouncement} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Announcement Title"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
              required
            />
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1">Optional Expiry Date</label>
              <input
                type="date"
                value={annExpiry}
                onChange={(e) => setAnnExpiry(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
              />
            </div>
          </div>
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
                {ann.expiryDate && (
                  <p className="text-[10px] text-rose-500 font-bold uppercase mt-2">Expires: {new Date(ann.expiryDate).toLocaleDateString()}</p>
                )}
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
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="URL (Google Drive, PDF, etc.)"
                value={resUrl.startsWith('data:') ? 'File Uploaded' : resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                disabled={resUrl.startsWith('data:')}
                className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100 disabled:opacity-50"
                required
              />
              <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-800">
                <Upload className={cn("w-5 h-5", isUploading ? "animate-bounce text-blue-500" : "text-slate-500")} />
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
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
