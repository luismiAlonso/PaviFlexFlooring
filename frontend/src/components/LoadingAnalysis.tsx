"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { at: 0,  text: "Subiendo imagen..." },
  { at: 2,  text: "Conectando con IA..." },
  { at: 5,  text: "Analizando el espacio..." },
  { at: 12, text: "Detectando el suelo..." },
  { at: 20, text: "Calculando perspectiva..." },
  { at: 28, text: "Casi listo..." },
];

export default function LoadingAnalysis() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentStep = [...STEPS].reverse().find((s) => seconds >= s.at) ?? STEPS[0];

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Anillo animado con contador */}
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          {/* Track */}
          <circle cx="40" cy="40" r="34" fill="none" stroke="#1f2937" strokeWidth="6" />
          {/* Progress — gira indefinidamente */}
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke="#22c55e"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="213"
            strokeDashoffset={213 - (213 * ((seconds % 30) / 30))}
            className="transition-all duration-1000"
          />
        </svg>
        {/* Segundos en el centro */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white tabular-nums">{seconds}s</span>
        </div>
      </div>

      {/* Mensaje de estado */}
      <p className="text-sm text-gray-300 font-medium">{currentStep.text}</p>

      {/* Barra de pasos */}
      <div className="flex gap-1.5">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`h-1 w-6 rounded-full transition-colors duration-500 ${
              seconds >= step.at ? "bg-brand-500" : "bg-gray-700"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-gray-600 max-w-[200px] text-center">
        El modelo IA puede tardar hasta 30s la primera vez
      </p>
    </div>
  );
}
