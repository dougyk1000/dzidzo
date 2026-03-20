export type Language = 'English' | 'Shona' | 'Ndebele';

export type Subject = string; // Allow dynamic subjects

export type ExamBoard = 'ZIMSEC' | 'Cambridge';

export type StudentLevel = 
  | 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6' | 'Grade 7'
  | 'Form 1' | 'Form 2' | 'Form 3' | 'Form 4' | 'O-Level'
  | 'Form 5' | 'Form 6' | 'A-Level';

export interface UserProfile {
  id: string;
  name: string;
  grade: string; // Keep for backward compatibility or use level
  level: StudentLevel;
  languagePreference: Language;
  examBoard: ExamBoard;
  selectedSubjects: Subject[];
  studyStreak: number;
  lastActive: string;
  role?: 'student' | 'admin';
  tutorStyle?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  subject?: Subject;
  uid: string;
}

export interface ProgressRecord {
  subject: Subject;
  topic: string;
  score: number;
  weaknessLevel: 'low' | 'medium' | 'high';
  lastAttempt: string;
  uid: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  author: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  subject: Subject;
  examBoard: ExamBoard;
  type: 'PDF' | 'Link' | 'Note';
  timestamp: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
