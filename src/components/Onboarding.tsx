import { useState } from 'react';
import { ExamBoard, Subject, UserProfile, StudentLevel } from '../types';
import { GraduationCap, Check, Search, Plus } from 'lucide-react';
import { cn } from '../utils';

interface OnboardingProps {
  onComplete: (data: Partial<UserProfile>) => void;
}

const levels: StudentLevel[] = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7',
  'Form 1', 'Form 2', 'Form 3', 'Form 4', 'O-Level',
  'Form 5', 'Form 6', 'A-Level'
];

import { ALL_SUBJECTS as allSubjects } from '../constants';

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [role, setRole] = useState<'student' | 'staff' | 'admin'>('student');
  const [board, setBoard] = useState<ExamBoard | null>(null);
  const [level, setLevel] = useState<StudentLevel | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [customSubjects, setCustomSubjects] = useState<Subject[]>([]);
  const [chatbotName, setChatbotName] = useState('DzidzoBot');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  const TEACHER_CODE = 'MST2026'; 
  const ADMIN_CODE = 'KLABS99';

  const handleRoleNext = () => {
    if (role === 'student') {
      setStep(3);
    } else {
      setStep(2.5); // Verification step
    }
  };

  const verifyRole = () => {
    if (role === 'staff' && verificationCode === TEACHER_CODE) {
      setStep(3);
      setVerificationError('');
    } else if (role === 'admin' && verificationCode === ADMIN_CODE) {
      setStep(3);
      setVerificationError('');
    } else {
      setVerificationError(`Invalid ${role === 'admin' ? 'Administrative' : 'Staff'} verification code.`);
    }
  };

  const toggleSubject = (s: Subject) => {
    setSelectedSubjects(prev => 
      prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]
    );
  };

  const addCustomSubject = () => {
    if (subjectSearch && !allSubjects.includes(subjectSearch) && !customSubjects.includes(subjectSearch)) {
      setCustomSubjects(prev => [...prev, subjectSearch]);
      setSelectedSubjects(prev => [...prev, subjectSearch]);
      setSubjectSearch('');
    }
  };

  const combinedSubjects = [...allSubjects, ...customSubjects];
  const filteredSubjects = combinedSubjects.filter(s => 
    s.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl space-y-8 border border-slate-200 dark:border-slate-800 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
          <img src={`https://picsum.photos/seed/onboarding-step-${step}/800/800`} alt="bg" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
            <img src="/marchwood-logo.png" alt="Marchwood Logo" className="w-10 h-10 object-contain" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white tracking-tight">Welcome to Marchwood</h2>
        </div>

        {step === 1 && (
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Tell us about yourself</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Please provide your basic details.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Class</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-bold text-slate-900 dark:text-white"
                >
                  <option value="" disabled>Select your class</option>
                  {[
                    'Form 1 West', 'Form 1 East', 'Form 1 Cambridge',
                    'Form 2 West', 'Form 2 East', 'Form 2 Cambridge',
                    'Form 3 West', 'Form 3 East', 'Form 3 Cambridge',
                    'Form 4 West', 'Form 4 East', 'Form 4 Cambridge',
                    'Lower Six Sciences', 'Lower Six Commercials', 'Lower Six Arts',
                    'Upper Six Sciences', 'Upper Six Commercial', 'Upper Six Arts'
                  ].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              disabled={!fullName || !className}
              onClick={() => setStep(2)}
              className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
            >
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Who are you?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Select your role in the school.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'student', label: 'Student', desc: 'I want to learn and do homework.' },
                { id: 'staff', label: 'Staff / Teacher', desc: 'I want to manage homework and students.' },
                { id: 'admin', label: 'Administrator', desc: 'I want to manage the entire school system.' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id as any)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group",
                    role === r.id 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                  )}
                >
                  <div>
                    <span className={cn(
                      "text-lg font-bold block",
                      role === r.id ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"
                    )}>{r.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</span>
                  </div>
                  {role === r.id && <Check className="text-blue-600 dark:text-blue-400" size={20} />}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold"
              >
                Back
              </button>
              <button
                onClick={handleRoleNext}
                className="flex-2 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 2.5 && (
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="text-lg font-bold dark:text-white">{role === 'admin' ? 'Admin' : 'Staff'} Verification</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Please enter the security code provided by the school management.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Security Code</label>
                <input
                  type="password"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono",
                    verificationError ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
                  )}
                />
                {verificationError && <p className="text-xs text-rose-500 mt-2 font-bold">{verificationError}</p>}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold"
              >
                Back
              </button>
              <button
                disabled={!verificationCode}
                onClick={verifyRole}
                className="flex-2 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50 shadow-lg"
              >
                Verify Credentials
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Which examination board are you under?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">We'll tailor your experience based on your board.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['ZIMSEC', 'Cambridge'].map((b) => (
                <button
                  key={b}
                  onClick={() => setBoard(b as ExamBoard)}
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all text-center",
                    board === b 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span className="text-xl font-bold">{b}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold"
              >
                Back
              </button>
              <button
                disabled={!board}
                onClick={() => setStep(4)}
                className="flex-2 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="text-lg font-bold dark:text-white">What is your current level?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">This helps us provide grade-appropriate content.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2">
              {levels.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    "p-3 rounded-xl border text-sm transition-all text-center font-medium",
                    level === l 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold"
              >
                Back
              </button>
              <button
                disabled={!level}
                onClick={() => setStep(5)}
                className="flex-2 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Select your subjects</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Choose the subjects you are currently studying.</p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search subjects..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2">
              {filteredSubjects.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl border transition-all flex items-center gap-2 text-sm",
                    selectedSubjects.includes(s)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  {selectedSubjects.includes(s) && <Check size={14} />}
                  {s}
                </button>
              ))}
              {subjectSearch && !combinedSubjects.some(s => s.toLowerCase() === subjectSearch.toLowerCase()) && (
                <button
                  onClick={addCustomSubject}
                  className="px-4 py-2 rounded-xl border border-dashed border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-sm flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add "{subjectSearch}"
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold"
              >
                Back
              </button>
              <button
                disabled={selectedSubjects.length === 0}
                onClick={() => setStep(6)}
                className="flex-2 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Name your AI Tutor</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Give your chatbot a name that you'll remember.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chatbot Name</label>
                <input
                  type="text"
                  value={chatbotName}
                  onChange={(e) => setChatbotName(e.target.value)}
                  placeholder="e.g. DzidzoBot"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(5)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold"
              >
                Back
              </button>
              <button
                disabled={!chatbotName}
                onClick={() => onComplete({ 
                  name: fullName, 
                  class: className, 
                  role, 
                  status: role === 'staff' ? 'pending' : 'approved',
                  examBoard: board!, 
                  selectedSubjects, 
                  level: level!, 
                  grade: level!,
                  chatbotName
                })}
                className="flex-2 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
              >
                Start Learning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
