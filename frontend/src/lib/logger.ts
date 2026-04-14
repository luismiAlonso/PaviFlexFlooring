/**
 * Logger cliente — guarda en localStorage, se resetea en cada nueva foto.
 * Visible en /debug para diagnóstico.
 */

const KEY = "paviflex_log";
const MAX = 200; // líneas máximas

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  data?: unknown;
}

function now() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function write(level: LogLevel, msg: string, data?: unknown) {
  if (typeof window === "undefined") return;
  const entry: LogEntry = { ts: now(), level, msg, ...(data !== undefined ? { data } : {}) };

  // También a consola
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[${entry.ts}] [${level.toUpperCase()}] ${msg}`, data ?? "");

  const existing: LogEntry[] = readLog();
  existing.push(entry);
  // Mantener solo las últimas MAX entradas
  const trimmed = existing.slice(-MAX);
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)); } catch { /* quota */ }
}

export function clearLog() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, "[]");
  write("info", "--- Log reiniciado (nueva foto) ---");
}

export function readLog(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export const log = {
  info:  (msg: string, data?: unknown) => write("info",  msg, data),
  warn:  (msg: string, data?: unknown) => write("warn",  msg, data),
  error: (msg: string, data?: unknown) => write("error", msg, data),
  debug: (msg: string, data?: unknown) => write("debug", msg, data),
};
