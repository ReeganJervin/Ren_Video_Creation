// Talking to the studio server (studio/server/server.js).
import { useEffect, useState } from 'react';

export type Status = 'Has errors' | 'Missing assets' | 'Ready' | 'Rendered';
export interface StoryInfo { file: string; name: string; folder: string; title: string; duration: number | null; status: Status; errors: number; missing: number; mtime: number; video: string | null }
export interface LineProblem { line: number; message: string }
export interface Missing { kind: string; name: string; lines: number[] }
export interface Scene { name: string; line: number; t0: number; t1: number }
export interface VoiceLine { line: number; who: string; text: string; t: number; len: number; ready: boolean }
export interface CheckResult {
  name: string; title: string; errors: LineProblem[]; missing: Missing[]; warnings: string[]; duration: number | null;
  scenes: Scene[]; voices: VoiceLine[]; lineTimes: [number, number][]; planUrl: string | null; voicesToMake: number;
}
export interface CheckRow { status: 'PASS' | 'FAIL' | 'WARN' | 'NOTE'; name: string; detail: string }
export interface Job {
  id: number; kind: 'voices' | 'render'; file: string; name: string; opts: { workers?: number; resume?: boolean; allowPlaceholders?: boolean };
  state: 'queued' | 'running' | 'done' | 'failed' | 'cancelled' | 'stopped'; step: string; progress: number;
  scene?: string; fps?: number; left?: number; voices?: { done: number; total: number };
  log: string[]; results: CheckRow[] | null; message?: string; video?: string; created: number; started?: number; ended?: number;
}
export interface Vocab { characters: string[]; moods: string[]; music: string[]; places: string[]; times: string[]; props: string[]; extras: string[]; help: string[]; holdable?: string[] }

export class ApiError extends Error { constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message); } }

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data.error || `The studio server answered ${r.status}.`, data);
  return data as T;
}
export const api = {
  get: <T,>(url: string) => call<T>('GET', url),
  post: <T,>(url: string, body: unknown) => call<T>('POST', url, body),
  put: <T,>(url: string, body: unknown) => call<T>('PUT', url, body),
};

// Every job, kept up to date over Server-Sent Events (survives refreshes: the server sends the recent jobs again).
export function useJobs(): Job[] {
  const [jobs, setJobs] = useState<Record<number, Job>>({});
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('job', e => { const j: Job = JSON.parse((e as MessageEvent).data); setJobs(s => ({ ...s, [j.id]: j })); });
    return () => es.close();
  }, []);
  return Object.values(jobs).sort((a, b) => a.id - b.id);
}

export const clock = (s: number | null | undefined) => {
  if (s == null || !isFinite(s)) return '–';
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
};
