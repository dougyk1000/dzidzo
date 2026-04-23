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
import { OperationType } from '../utils/firestore-errors';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { cn } from '../utils';

export function AdminDashboard() {
  const { handleError, showSuccess } = useErrorHandler();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [pendingTeachers, setPendingTeachers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterBoard, setFilterBoard] = useState<ExamBoard | 'All'>('All');

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
  const [resContent, setResContent] = useState('');
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
    }, (error) => handleError(error, OperationType.LIST, 'announcements'));

    const resQuery = query(collection(db, 'resources'), orderBy('timestamp', 'desc'));
    const unsubRes = onSnapshot(resQuery, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
    }, (error) => handleError(error, OperationType.LIST, 'resources'));

    // Fetch pending accounts
    const pendingQuery = query(
      collection(db, 'users'), 
      where('status', '==', 'pending')
    );
    const unsubTeachers = onSnapshot(pendingQuery, (snapshot) => {
      setPendingTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => handleError(error, OperationType.LIST, 'users'));

    // Fetch all registered users for administration
    const usersQuery = query(
      collection(db, 'users')
    );
    const unsubStudents = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      const sortedStudents = users
        .filter(u => u.role === 'student')
        .sort((a, b) => a.name.localeCompare(b.name));
      setAllUsers(sortedStudents);
    }, (error) => handleError(error, OperationType.LIST, 'students'));

    return () => {
      unsubAnn();
      unsubRes();
      unsubTeachers();
      unsubStudents();
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
      showSuccess('Announcement posted successfully');
    } catch (error) {
      handleError(error, OperationType.WRITE, 'announcements');
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
        content: resContent,
        subject: resSubject,
        examBoard: resBoard,
        type: resType,
        timestamp: Date.now()
      });
      setResTitle('');
      setResDesc('');
      setResUrl('');
      setResContent('');
      showSuccess('Resource added successfully');
    } catch (error) {
      handleError(error, OperationType.WRITE, 'resources');
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        handleError(new Error('File size exceeds 2MB limit'), OperationType.WRITE, 'resources');
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
      showSuccess('AI Quiz generated and added to resources!');
    } catch (error) {
      handleError(error, OperationType.WRITE, 'resources');
    }
    setIsGeneratingQuiz(false);
  };

  const handleDelete = async (table: string, id: string) => {
    try {
      await deleteDoc(doc(db, table, id));
      showSuccess('Item deleted successfully');
    } catch (error) {
      handleError(error, OperationType.DELETE, `${table}/${id}`);
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
      showSuccess('Resources synced successfully from external sources!');
    } catch (error) {
      handleError(error, OperationType.WRITE, 'resources');
    }
    setIsLoading(false);
  };

  const handleApproveTeacher = async (teacherId: string, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'users', teacherId), {
        status: approve ? 'approved' : 'rejected'
      });
      showSuccess(`Account ${approve ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      handleError(error, OperationType.UPDATE, `users/${teacherId}`);
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
              {pendingTeachers.length} New Requests
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingTeachers.map(account => (
            <div key={account.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl uppercase relative">
                  {account.name.charAt(0)}
                  <span className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900",
                    account.role === 'admin' ? "bg-rose-500" : "bg-amber-500"
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold dark:text-white">{account.name}</h3>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                      account.role === 'admin' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                    )}>{account.role}</span>
                  </div>
                  <p className="text-xs text-slate-500">{account.class} • {account.examBoard}</p>
                  <p className="text-[10px] text-blue-500 font-mono mt-1">{account.selectedSubjects.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleApproveTeacher(account.id, true)}
                  className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                  title="Approve"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => handleApproveTeacher(account.id, false)}
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
              <p className="text-slate-400 italic">No pending signup requests to review.</p>
            </div>
          )}
        </div>
      </section>

      {/* Registered Students Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <Check className="text-emerald-500" />
          <h2 className="text-2xl font-bold">Registered Students</h2>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-3 py-1 rounded-full font-bold">
            {allUsers.length} Total
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Class</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Exam Board</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {allUsers.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold text-xs">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
                        {student.class}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {student.examBoard}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.selectedSubjects.slice(0, 3).map((sub, i) => (
                          <span key={i} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-medium">
                            {sub}
                          </span>
                        ))}
                        {student.selectedSubjects.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{student.selectedSubjects.length - 3} more</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {allUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                      No students registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500 ml-2 uppercase tracking-tight">Filter:</span>
              <select 
                value={filterBoard} 
                onChange={(e) => setFilterBoard(e.target.value as any)}
                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer dark:text-slate-100"
              >
                <option value="All">All Boards</option>
                <option value="ZIMSEC">ZIMSEC</option>
                <option value="Cambridge">Cambridge</option>
              </select>
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
            
            {resType === 'Note' && (
              <textarea
                placeholder="Write your note content here..."
                value={resContent}
                onChange={(e) => setResContent(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 h-32 dark:text-slate-100"
                required
              />
            )}
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
          {resources
            .filter(r => filterBoard === 'All' || r.examBoard === filterBoard)
            .map(res => (
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
              {res.content && (
                <p className="text-[10px] text-slate-400 line-clamp-2 italic border-l-2 border-slate-200 pl-2">
                  {res.content}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
