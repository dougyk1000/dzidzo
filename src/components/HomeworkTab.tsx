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
  ChevronRight
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

  const isStaffOrAdmin = userProfile?.role === 'staff' || userProfile?.role === 'admin';

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

  const isExpired = (date: string) => {
    return new Date(date) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-12">
      <div className="relative h-48 rounded-[2.5rem] overflow-hidden mb-8 shadow-lg">
        <img src="https://picsum.photos/seed/homework/1200/400" alt="Homework" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 via-indigo-900/40 to-transparent flex items-center p-12">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-indigo-400" />
              <h1 className="text-4xl font-black">Homework Central</h1>
            </div>
            <p className="text-indigo-100">
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
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
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
            className="bg-white rounded-2xl p-6 shadow-xl border border-indigo-100 mb-8"
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assignment Title</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Quadratic Equations Practice"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief overview of the assignment..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as Subject)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none"
                    >
                      {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                    <input
                      required
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Homework Content (Text)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste the questions or instructions here..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL (Optional)</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/homework-image.jpg"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
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
            <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">No homework assigned yet</h3>
              <p className="text-gray-400">Check back later or upload one if you're staff.</p>
            </div>
          ) : (
            homeworkList.map((hw) => (
              <motion.div
                layout
                key={hw.id}
                className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-all relative group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isExpired(hw.dueDate) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {isExpired(hw.dueDate) ? 'Expired' : 'Active'}
                  </div>
                  {isStaffOrAdmin && (
                    <button
                      onClick={() => handleDelete(hw.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{hw.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{hw.description}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {new Date(hw.dueDate).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Subject: {hw.subject}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {hw.authorName.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-500">By {hw.authorName}</span>
                  </div>
                  
                  {hw.imageUrl && (
                    <div className="text-indigo-600">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {hw.content && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 font-mono overflow-hidden max-h-20">
                    {hw.content}
                  </div>
                )}
              </motion.div>
            ))
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
