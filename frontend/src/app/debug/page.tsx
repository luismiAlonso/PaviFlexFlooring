"use client";

import { useEffect, useState } from "react";
import { readLog, clearLog, type LogEntry } from "@/lib/logger";

const COLORS: Record<string, string> = {
  info:  "text-blue-400",
  warn:  "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-500",
};

export default function DebugPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const refresh = () => setEntries([...readLog()].reverse());

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-mono text-xs p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-bold text-white">PaviFlexFlooring — Debug Log</h1>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
          >
            Refrescar
          </button>
          <button
            onClick={() => { clearLog(); refresh(); }}
            className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded text-xs"
          >
            Limpiar
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-600">Sin entradas. Sube una foto en /visualizer primero.</p>
      ) : (
        <div className="space-y-0.5">
          {entries.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-600 shrink-0">{e.ts}</span>
              <span className={`shrink-0 w-12 ${COLORS[e.level]}`}>[{e.level}]</span>
              <span className="text-gray-200 break-all">{e.msg}</span>
              {e.data !== undefined && (
                <span className="text-gray-500 break-all">
                  {typeof e.data === "object"
                    ? JSON.stringify(e.data).slice(0, 300)
                    : String(e.data).slice(0, 300)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-gray-700 text-[10px]">
        Auto-refresca cada 1s. URL: /debug
      </p>
    </div>
  );
}
