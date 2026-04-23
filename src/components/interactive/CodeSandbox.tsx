import { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import { Play, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils';

interface CodeSandboxProps {
  language: 'python' | 'javascript';
  initialCode: string;
  instructions?: string;
}

export function CodeSandbox({ language, initialCode, instructions }: CodeSandboxProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput([]);
    setError(null);

    if (language === 'javascript') {
      try {
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.map(String).join(' '));
        
        // Execute JS - Note: This is a basic evaluation for educational purposes
        // In a real production app, use a safer sandbox like an iframe or web worker
        new Function(code)();
        
        console.log = originalLog;
        setOutput(logs.length > 0 ? logs : ['Code executed successfully (no output).']);
      } catch (err: any) {
        setError(err.message || 'Execution error');
      } finally {
        setIsRunning(false);
      }
    } else if (language === 'python') {
      // Python via Pyodide
      try {
        if (!(window as any).pyodide) {
          setOutput(['Loading Python environment...']);
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
          script.onload = async () => {
            const pyodide = await (window as any).loadPyodide();
            (window as any).pyodide = pyodide;
            executePython(pyodide);
          };
          document.head.appendChild(script);
        } else {
          executePython((window as any).pyodide);
        }
      } catch (err: any) {
        setError(err.message || 'Execution error');
        setIsRunning(false);
      }
    }
  };

  const executePython = async (pyodide: any) => {
    try {
      // Capture stdout
      await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.String()
      `);
      
      await pyodide.runPythonAsync(code);
      
      const out = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      setOutput(out ? out.split('\n') : ['Code executed successfully (no output).']);
    } catch (err: any) {
      setError(err.message || 'Python error');
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    setOutput([]);
    setError(null);
  };

  return (
    <div className="my-6 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl font-sans">
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{language} sandbox</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={resetCode}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Reset code"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20"
          >
            {isRunning ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
            Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="min-h-[300px] border-r border-slate-800 bg-slate-950 p-4 overflow-auto scrollbar-hide">
          {instructions && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-xl text-xs text-blue-300 italic">
              {instructions}
            </div>
          )}
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={code => Prism.highlight(code, Prism.languages[language] || Prism.languages.javascript, language)}
            padding={10}
            className="font-mono text-sm dark:text-slate-100 outline-none"
            textareaClassName="outline-none"
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 14,
            }}
          />
        </div>

        <div className="bg-slate-950 p-4 font-mono text-sm flex flex-col h-full min-h-[300px]">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Output
            <div className="h-[1px] flex-1 bg-slate-800" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {error ? (
              <div className="flex items-start gap-2 text-rose-500">
                <AlertCircle size={14} className="mt-1 shrink-0" />
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            ) : output.length > 0 ? (
              output.map((line, i) => (
                <div key={i} className="text-emerald-400">
                  <span className="text-slate-600 mr-2">{'>'}</span>
                  {line}
                </div>
              ))
            ) : (
              <div className="text-slate-700 italic">Ready for execution...</div>
            )}
          </div>
          {output.length > 0 && !error && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-emerald-500/50 text-xs">
              <CheckCircle2 size={12} />
              Process finished.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
