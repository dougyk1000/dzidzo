import { useState } from 'react';
import { Mafs, Coordinates, Plot, Theme, useMovablePoint } from 'mafs';
import 'mafs/core.css';
import { Sliders, FunctionSquare, Info } from 'lucide-react';
import { cn } from '../../utils';

interface GraphParam {
  name: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
}

interface InteractiveGraphProps {
  type: 'parabola' | 'linear' | 'sine' | 'cosine' | 'exponential';
  title: string;
  equation: string;
  params: GraphParam[];
}

export function InteractiveGraph({ type, title, equation, params }: InteractiveGraphProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    params.forEach(p => {
      initial[p.name] = p.defaultValue;
    });
    return initial;
  });

  const getFunction = () => {
    switch (type) {
      case 'parabola':
        return (x: number) => (values.a || 0) * Math.pow(x, 2) + (values.b || 0) * x + (values.c || 0);
      case 'linear':
        return (x: number) => (values.m || 0) * x + (values.c || 0);
      case 'sine':
        return (x: number) => (values.a || 1) * Math.sin((values.b || 1) * x + (values.c || 0));
      case 'cosine':
        return (x: number) => (values.a || 1) * Math.cos((values.b || 1) * x + (values.c || 0));
      case 'exponential':
        return (x: number) => (values.a || 1) * Math.pow(values.b || 2, x) + (values.c || 0);
      default:
        return (x: number) => x;
    }
  };

  return (
    <div className="my-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden font-sans">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <FunctionSquare size={14} className="text-blue-500" />
            <code className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold">{equation}</code>
          </div>
        </div>
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
          <Info size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 relative h-[400px] bg-slate-50 dark:bg-slate-950/50">
          <Mafs zoom={true}>
            <Coordinates.Cartesian />
            <Plot.OfX y={getFunction()} color={Theme.blue} />
          </Mafs>
          
          <div className="absolute bottom-6 left-6 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg pointer-events-none">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Live Equation</span>
            <code className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              y = {Object.entries(values).map(([name, val], i) => (
                <span key={name}>
                  {i > 0 && ' + '}
                  <span className="text-blue-500">{val.toFixed(1)}</span>
                  {name === 'a' && type === 'parabola' ? 'x²' : name === 'm' ? 'x' : name === 'b' && type === 'parabola' ? 'x' : ''}
                </span>
              ))}
            </code>
          </div>
        </div>

        <div className="p-8 space-y-8 bg-slate-50/30 dark:bg-slate-900/30 border-l border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Sliders size={18} className="text-blue-500" />
            <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Parameters</span>
          </div>
          
          <div className="space-y-6">
            {params.map(p => (
              <div key={p.name} className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Constant {p.name}</label>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-mono font-bold">
                    {values[p.name]?.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step || 0.1}
                  value={values[p.name]}
                  onChange={(e) => setValues(prev => ({ ...prev, [p.name]: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>{p.min}</span>
                  <span>{p.max}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 leading-relaxed italic">
              Slide the parameters to see how the curve changes in real-time. This helps visualize how the constants affect the function's shape and position.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
