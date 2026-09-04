import React, { useState } from 'react';
import { 
  Calculator, 
  Users, 
  Calendar, 
  BarChart3, 
  Flame, 
  Scale, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const ToolsView: React.FC = () => {
  const [calculatorGrade1, setCalculatorGrade1] = useState<number | ''>('');
  const [calculatorGrade2, setCalculatorGrade2] = useState<number | ''>('');
  const [calculatorGrade3, setCalculatorGrade3] = useState<number | ''>('');
  const [calculatedAverage, setCalculatedAverage] = useState<number | null>(null);

  const calculateGrade = () => {
    const g1 = Number(calculatorGrade1) || 0;
    const g2 = Number(calculatorGrade2) || 0;
    const g3 = Number(calculatorGrade3) || 0;
    const avg = (g1 * 0.3) + (g2 * 0.3) + (g3 * 0.4);
    setCalculatedAverage(Number(avg.toFixed(2)));
  };

  const tools = [
    {
      icon: <Scale className="w-5 h-5 text-red-500" />,
      title: 'Comparador de Profesores',
      desc: 'Compara dos docentes lado a lado por tasa de aprobación y popularidad.',
      badge: 'Popular'
    },
    {
      icon: <Calendar className="w-5 h-5 text-red-500" />,
      title: 'Generador de Horarios',
      desc: 'Arma tu horario semestral optimizado según las calificaciones de profesores.',
      badge: 'Graderz 5'
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-red-500" />,
      title: 'Estadísticas del Campus',
      desc: 'Métricas de facultades, promedios generales y tendencias de votación.',
      badge: 'En vivo'
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Flame className="w-3.5 h-3.5" />
          Herramientas Académicas
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
          HERRAMIENTAS <span className="text-red-500">GRADERZ5</span>
        </h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto mt-2">
          Calculadoras, comparadores y recursos para dominar tu semestre.
        </p>
      </div>

      {/* Grade Calculator Box */}
      <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Calculadora Rápida de Promedio Semestral</h3>
            <p className="text-xs text-zinc-400">Ponderación: Parcial 1 (30%), Parcial 2 (30%), Final (40%)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Nota Parcial 1 (0-10)</label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="Ej: 8.5"
              value={calculatorGrade1}
              onChange={(e) => setCalculatorGrade1(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-[#181820] border border-white/10 focus:border-red-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Nota Parcial 2 (0-10)</label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="Ej: 9.0"
              value={calculatorGrade2}
              onChange={(e) => setCalculatorGrade2(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-[#181820] border border-white/10 focus:border-red-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Examen Final (0-10)</label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="Ej: 7.8"
              value={calculatorGrade3}
              onChange={(e) => setCalculatorGrade3(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-[#181820] border border-white/10 focus:border-red-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/5">
          <button
            onClick={calculateGrade}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-red-950/50 transition-all cursor-pointer"
          >
            Calcular Promedio
          </button>

          {calculatedAverage !== null && (
            <div className="flex items-center gap-2 bg-[#181820] border border-red-500/30 px-4 py-2 rounded-xl">
              <span className="text-xs text-zinc-400">Promedio Ponderado:</span>
              <span className="text-lg font-black text-red-400">{calculatedAverage}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${calculatedAverage >= 7 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {calculatedAverage >= 7 ? 'Aprobado' : 'Por Mejorar'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Other Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tools.map((tool, idx) => (
          <div 
            key={idx}
            className="bg-[#121217] border border-white/10 hover:border-red-500/40 rounded-2xl p-5 transition-all hover:-translate-y-1 duration-200 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#1a1a22] flex items-center justify-center group-hover:bg-red-950/40 transition-colors">
                  {tool.icon}
                </div>
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  {tool.badge}
                </span>
              </div>
              <h4 className="font-bold text-white text-base mb-1 group-hover:text-red-400 transition-colors">
                {tool.title}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {tool.desc}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300">
              <span>Disponible</span>
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
