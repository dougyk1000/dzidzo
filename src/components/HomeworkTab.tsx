import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Send,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Clock4,
  AlertTriangle,
  Lightbulb,
  Upload
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ALL_SUBJECTS } from '../constants';
import { Homework, UserProfile, Subject, StudentLevel, ExamBoard } from '../types';
import { cn } from '../utils';

const STUDENT_LEVELS: StudentLevel[] = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7',
  'Form 1', 'Form 2', 'Form 3', 'Form 4', 'O-Level',
  'Form 5', 'Form 6', 'A-Level'
];

const EXAM_BOARDS: ExamBoard[] = ['ZIMSEC', 'Cambridge'];

interface HomeworkTabProps {
  userProfile: UserProfile | null;
}

export const HomeworkTab: React.FC<HomeworkTabProps> = ({ userProfile }) => {
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState<Subject>('Mathematics');
  const [level, setLevel] = useState<StudentLevel>('O-Level');
  const [examBoard, setExamBoard] = useState<ExamBoard>('ZIMSEC');
  const [dueDate, setDueDate] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const isStaffOrAdmin = userProfile?.role === 'staff' || userProfile?.role === 'admin';
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'homework'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const homework = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Homework[];
      setHomeworkList(homework);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching homework:", err);
      setError("Failed to load homework assignments.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      const newHomework = {
        title,
        description,
        subject,
        level,
        examBoard,
        dueDate,
        content,
        imageUrl,
        authorId: userProfile.id,
        authorName: userProfile.name,
        timestamp: Date.now()
      };

      await addDoc(collection(db, 'homework'), newHomework);
      setIsAdding(false);
      resetForm();
    } catch (err) {
      console.error("Error adding homework:", err);
      setError("Failed to upload homework.");
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('Mathematics');
    setLevel('O-Level');
    setExamBoard('ZIMSEC');
    setDueDate('');
    setContent('');
    setImageUrl('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this homework?")) return;
    try {
      await deleteDoc(doc(db, 'homework', id));
    } catch (err) {
      console.error("Error deleting homework:", err);
      setError("Failed to delete homework.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadingFile(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImageUrl(base64);
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert("Only image files are supported for preview currently. Use external links for other files.");
    }
  };

  const isExpired = (date: string) => {
    return new Date(date) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-12">
      <div className="relative h-48 rounded-[2.5rem] overflow-hidden mb-8 shadow-lg">
        <img src="https://picsum.photos/seed/homework/1200/400" alt="Homework" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-900/40 to-transparent flex items-center p-12">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl font-black">Homework Central</h1>
            </div>
            <p className="text-blue-100">
              {isStaffOrAdmin ? 'Manage and upload assignments for your students.' : 'View your current and upcoming assignments.'}
            </p>
          </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div></div>

        {isStaffOrAdmin && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
          >
            {isAdding ? <ChevronRight className="w-5 h-5 rotate-90" /> : <Plus className="w-5 h-5" />}
            {isAdding ? 'Cancel' : 'Upload Homework'}
          </button>
        )}
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 mb-8"
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignment Title</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Quadratic Equations Practice"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief overview of the assignment..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as Subject)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
                    >
                      {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                    <input
                      required
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Homework Content (Text)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste the questions or instructions here..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Image Assignment (Upload or Link)</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/homework-image.jpg"
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                      <Upload className={cn("w-5 h-5", uploadingFile ? "animate-bounce text-blue-500" : "text-slate-500")} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Publish Assignment
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homeworkList.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400">No homework assigned yet</h3>
              <p className="text-slate-400 dark:text-slate-500">Check back later or upload one if you're staff.</p>
            </div>
          ) : (
            homeworkList.map((hw) => {
              const expired = isExpired(hw.dueDate);
              return (
                <motion.div
                  layout
                  key={hw.id}
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border transition-all relative group flex flex-col",
                    expired 
                      ? "border-slate-100 dark:border-slate-800 opacity-80" 
                      : "border-blue-100 dark:border-blue-900 shadow-blue-500/5 hover:shadow-xl hover:scale-[1.02]"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                      expired 
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30" 
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                    )}>
                      {expired ? <AlertTriangle size={12} /> : <Clock4 size={12} />}
                      {expired ? 'Past Due' : 'Active'}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(hw.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-grow">
                    <h3 className={cn(
                      "text-xl font-black mb-2 tracking-tight",
                      expired ? "text-slate-500 dark:text-slate-400 line-through decoration-rose-500/30" : "text-slate-900 dark:text-white"
                    )}>
                      {hw.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2 italic">
                      {hw.description}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>Subject: {hw.subject}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs">
                        {hw.authorName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Teacher</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">{hw.authorName}</span>
                      </div>
                    </div>
                    
                    {hw.imageUrl && (
                      <div className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {!expired && (
                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                      <button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                        onClick={() => alert("This feature will open the AI Tutor with this homework context in the next update!")}
                      >
                        <Lightbulb size={18} />
                        Solve with AI Tutor
                      </button>
                    </div>
                  )}

                  {hw.content && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-500 dark:text-slate-500 font-mono overflow-hidden max-h-16 border border-slate-100 dark:border-slate-800">
                      {hw.content.substring(0, 100)}...
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {error && (
        <div className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <AlertCircle className="w-6 h-6" />
          <span className="font-semibold">{error}</span>
          <button onClick={() => setError(null)} className="ml-4 hover:underline">Dismiss</button>
        </div>
      )}
    </div>
  );
};
