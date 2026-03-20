import React, { useState } from 'react';
import { Subject } from '../types';
import { Calculator, Beaker, Atom, BookOpen, GraduationCap, ChevronDown, Search } from 'lucide-react';
import { cn } from '../utils';

interface SubjectSelectorProps {
  selected: Subject;
  onSelect: (subject: Subject) => void;
  availableSubjects: Subject[];
}

const subjectIcons: Record<string, React.ElementType> = {
  'Maths': Calculator,
  'Physics': Atom,
  'Chemistry': Beaker,
  'Biology': GraduationCap,
  'English': BookOpen,
  'Combined Science': Atom,
};

const defaultIcon = BookOpen;

export function SubjectSelector({ selected, onSelect, availableSubjects = [] }: SubjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredSubjects = (availableSubjects || []).filter(s => 
    s.toLowerCase().includes(search.toLowerCase())
  );

  const SelectedIcon = subjectIcons[selected] || defaultIcon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-blue-500 transition-all min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
            <SelectedIcon size={18} />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">{selected}</span>
        </div>
        <ChevronDown size={20} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[70] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="Search subjects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredSubjects.map((s) => {
                const Icon = subjectIcons[s] || defaultIcon;
                const isSelected = selected === s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      onSelect(s);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                      isSelected 
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon size={16} />
                    {s}
                  </button>
                );
              })}
              {filteredSubjects.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 italic">No subjects found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
