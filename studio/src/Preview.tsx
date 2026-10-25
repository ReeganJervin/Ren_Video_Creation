// The live preview: the engine's own player (engine/page.html) embedded, with play/pause, a timeline with scene and
// voice markers, "Make voices" and "Save still".
import { useEffect, useRef, useState } from 'react';
import { api, clock, type CheckResult, type Job } from './api';

interface PreviewWindow extends Window {
  PREVIEW?: { ready: Promise<{ duration: number }>; play(t: number): Promise<string[]>; pause(): void; seek(t: number): Promise<void>; onTime(cb: (t: number, playing: boolean) => void): void; still(): string };
}
export interface PreviewApi { jump(t: number): void }

interface Props {
  file: string; check: CheckResult | null; stale: boolean; voicesJob: Job | undefined; apiRef: { current: PreviewApi | null };
  onTime(t: number, playing: boolean): void; onMakeVoices(): void;
}

export function Preview({ file, check, stale, voicesJob, apiRef, onTime, onMakeVoices }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  // starts 1 s in: at 0 s the picture is still black (the opening fade)
  const [t, setT] = useState(1), [playing, setPlaying] = useState(false), [ready, setReady] = useState(false);
  const [note, setNote] = useState('');
  const tRef = useRef(1), playingRef = useRef(false);
  const plan = check?.planUrl || null, duration = check?.duration || 0;
  const P = () => (frame.current?.contentWindow as PreviewWindow | null)?.PREVIEW;

  // a new plan (the story changed): the player reloads and goes back to the same moment
  useEffect(() => { setReady(false); }, [plan]);
  const loaded = async () => {
    const pv = P();
    if (!pv) return;
    await pv.ready;
    pv.onTime((now, isPlaying) => { tRef.current = now; setT(now); onTime(now, isPlaying); if (!isPlaying && playingRef.current) { playingRef.current = false; setPlaying(false); } });
    await pv.seek(Math.min(tRef.current, duration));
    setReady(true);
    if (playingRef.current) pv.play(tRef.current);
  };
  const play = async () => {
    const pv = P(); if (!pv) return;
    playingRef.current = true; setPlaying(true);
    const missing = await pv.play(tRef.current >= duration - 0.05 ? 0 : tRef.current);
    setNote(missing.length ? `${missing.length} voice line${missing.length > 1 ? 's are' : ' is'} not made yet, so ${missing.length > 1 ? 'they are' : 'it is'} silent. Press "Make voices".` : '');
  };
  const pause = () => { playingRef.current = false; setPlaying(false); P()?.pause(); };
  const jump = (to: number) => { const x = Math.max(0, Math.min(duration, to)); tRef.current = x; setT(x); const pv = P(); if (!pv) return; if (playingRef.current) pv.play(x); else pv.seek(x); };
  apiRef.current = { jump };

  const still = async () => {
    const pv = P(); if (!pv) return;
    try { const r = await api.post<{ file: string }>('/api/still', { file, t: tRef.current, png: pv.still() }); setNote(`Saved ${r.file}`); }
    catch (e) { setNote((e as Error).message); }
  };

  // the timeline: click or drag to move
  const bar = useRef<HTMLDivElement>(null);
  const fromMouse = (e: React.PointerEvent) => { const r = bar.current!.getBoundingClientRect(); jump((e.clientX - r.left) / r.width * duration); };
  const pct = (x: number) => `${duration ? Math.min(100, x / duration * 100) : 0}%`;
  const making = voicesJob && (voicesJob.state === 'running' || voicesJob.state === 'queued');
  const voicesLeft = check?.voicesToMake || 0;

  return (
    <section className="preview">
      <div className="player">
        {plan ? <iframe key={plan} ref={frame} title="Preview" src={`/engine/page.html?plan=${encodeURIComponent(plan)}&embed=1`} onLoad={loaded} />
          : <div className="player-empty">{check ? 'Fix the red lines to see the preview.' : 'Checking the story…'}</div>}
      </div>
      <div className="transport">
        <button className="primary" disabled={!ready} onClick={playing ? pause : play} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
        <span className="time">{clock(t)} / {clock(duration)}</span>
        <div className="grow" />
        <button disabled={!ready} onClick={still}>Save still</button>
        <button disabled={!plan || making || voicesLeft === 0} onClick={onMakeVoices} title={voicesLeft ? `${voicesLeft} voice line(s) still to make` : 'Every voice line is made'}>
          {making ? `Making voices… ${voicesJob!.voices ? `${voicesJob!.voices.done}/${voicesJob!.voices.total}` : ''}` : voicesLeft ? `Make voices (${voicesLeft})` : 'Voices ready ✓'}
        </button>
      </div>
      <div className="timeline" ref={bar} onPointerDown={e => { if (!ready) return; (e.target as HTMLElement).setPointerCapture(e.pointerId); fromMouse(e); }} onPointerMove={e => { if (e.buttons === 1 && ready) fromMouse(e); }}>
        {check?.scenes.map((s, i) => <div key={'s' + i} className="scene-mark" style={{ left: pct(s.t0), width: `calc(${pct(s.t1 - s.t0)} - 2px)` }} title={`Scene: ${s.name}`}><span>{s.name}</span></div>)}
        {check?.voices.map((v, i) => <div key={'v' + i} className={`voice-mark who-${['narrator', 'ren', 'yuki'].includes(v.who) ? v.who : 'other'}${v.ready ? '' : ' silent'}`} style={{ left: pct(v.t), width: pct(v.len) }} title={`${v.who}: ${v.text}`} />)}
        <div className="playhead" style={{ left: pct(t) }} />
      </div>
      {stale && <p className="muted small note">The preview shows the story as it was before the red lines.</p>}
      {note && <p className="muted small note">{note}</p>}
      {voicesJob?.state === 'failed' && <p className="bad-text small">Making the voices failed: {voicesJob.message}</p>}
    </section>
  );
}
