import { Language } from '../types';
import { cn } from '../utils';

interface LanguageToggleProps {
  selected: Language;
  onSelect: (lang: Language) => void;
}

const languages: Language[] = ['English', 'Shona', 'Ndebele'];

export function LanguageToggle({ selected, onSelect }: LanguageToggleProps) {
  return (
    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onSelect(lang)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            selected === lang
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
