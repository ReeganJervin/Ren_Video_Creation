// A story: the side panel (length, scenes, missing things), the editor, and the preview with "Make video".
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, clock, useJobs, ApiError, type CheckResult, type Vocab } from './api';
import { StoryEditor, type EditorApi } from './StoryEditor';
import { Preview, type PreviewApi } from './Preview';
import { RenderPanel } from './RenderPanel';
import { go } from './App';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

export function StoryScreen({ file, themeButton }: { file: string; themeButton: ReactNode }) {
  const [story, setStory] = useState<{ text: string; mtime: number; name: string } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [vocab, setVocab] = useState<Vocab | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  // the last check without errors: the preview keeps showing it while a line is being fixed
  const [good, setGood] = useState<CheckResult | null>(null);
  const onCheck = (r: CheckResult) => { setCheck(r); if (r.planUrl) setGood(r); };
  const [save, setSave] = useState<SaveState>('saved'), [saveError, setSaveError] = useState('');
  const [changedOnDisk, setChangedOnDisk] = useState(false);
  const [playingLine, setPlayingLine] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const editor = useRef<EditorApi | null>(null), preview = useRef<PreviewApi | null>(null);
  const mtime = useRef(0), text = useRef(''), timer = useRef<number>(0), saveRef = useRef<SaveState>('saved');
  const setSaveState = (s: SaveState) => { saveRef.current = s; setSave(s); };
  const jobs = useJobs();
  const latest = (kind: string) => [...jobs].reverse().find(j => j.kind === kind && j.file === file);
  const voicesJob = latest('voices'), renderJob = latest('render');

  useEffect(() => {
    api.get<{ text: string; mtime: number; name: string }>('/api/story?file=' + encodeURIComponent(file))
      .then(s => { mtime.current = s.mtime; text.current = s.text; setStory(s); }).catch(e => setLoadError(e.message));
    api.get<Vocab>('/api/vocab').then(setVocab);
  }, [file]);

  // saving: shortly after typing stops, on Ctrl+S, and before leaving
  const doSave = useCallback(async (force = false): Promise<boolean> => {
    clearTimeout(timer.current);
    if (saveRef.current === 'saved' && !force) return true;
    setSaveState('saving');
    try {
      const r = await api.put<{ mtime: number }>('/api/story', { file, text: text.current, mtime: mtime.current, force });
      mtime.current = r.mtime; setSaveState('saved'); setSaveError(''); setChangedOnDisk(false);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { setChangedOnDisk(true); setSaveState('unsaved'); return false; }
      setSaveState('error'); setSaveError((e as Error).message); return false;
    }
  }, [file]);
  const onChange = (t: string) => { text.current = t; setSaveState('unsaved'); clearTimeout(timer.current); timer.current = window.setTimeout(() => doSave(), 1000); };
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (saveRef.current !== 'saved') { doSave(); e.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [doSave]);

  // the file changed on disk (for example Claude Code edited it): offer to load it
  useEffect(() => {
    const id = window.setInterval(async () => {
      try { const s = await api.get<{ mtime: number | null }>('/api/story/stat?file=' + encodeURIComponent(file)); if (s.mtime && Math.abs(s.mtime - mtime.current) > 1 && saveRef.current !== 'saving') setChangedOnDisk(true); } catch { /* server away for a moment */ }
    }, 2000);
    return () => clearInterval(id);
  }, [file]);
  const reload = async () => {
    const s = await api.get<{ text: string; mtime: number }>('/api/story?file=' + encodeURIComponent(file));
    mtime.current = s.mtime; text.current = s.text; editor.current?.setText(s.text); setSaveState('saved'); setChangedOnDisk(false);
  };
  const keepMine = async () => { await doSave(true); };

  // the preview's moment <-> story lines
  const lineAt = (t: number) => { let best: number | null = null, bt = -1; for (const [l, s] of check?.lineTimes || []) if (s <= t + 1e-3 && s >= bt) { best = l; bt = s; } return best; };
  const timeOfLine = (line: number) => {
    const lt = check?.lineTimes || [];
    const exact = lt.find(([l]) => l === line) || lt.find(([l]) => l > line);
    return exact ? exact[1] : null;
  };
  const onTime = (t: number, playing: boolean) => setPlayingLine(playing ? lineAt(t) : null);
  const onLineClick = (line: number) => { const t = timeOfLine(line); if (t != null) preview.current?.jump(t); };
  // voices made: check again, so the preview uses them
  useEffect(() => { if (voicesJob?.state === 'done') editor.current?.recheck(); }, [voicesJob?.state]);

  const makeVoices = async () => { if (await doSave()) api.post('/api/jobs', { kind: 'voices', file }).catch(() => {}); };
  const copyCmd = async (cmd: string) => { try { await navigator.clipboard.writeText(cmd); setCopied(cmd); setTimeout(() => setCopied(''), 2000); } catch { /* not allowed */ } };

  if (loadError) return <div className="home"><header className="bar"><button className="ghost" onClick={() => go()}>← Stories</button></header><p className="banner bad">{loadError}</p></div>;
  if (!story) return <p className="muted pad">Opening the story…</p>;
  const ready = check?.voices.filter(v => v.ready).length || 0, lines = check?.voices.length || 0;
  return (
    <div className="story-screen">
      <header className="bar">
        <button className="ghost" onClick={async () => { await doSave(); go(); }}>← Stories</button>
        <h1 className="story-title">{check?.title || story.name}<span className="muted small"> {file}</span></h1>
        <span className={`save-state ${save}`}>{{ saved: 'Saved', unsaved: 'Not saved yet', saving: 'Saving…', error: 'Not saved: ' + saveError }[save]}</span>
        <div className="grow" />
        {themeButton}
      </header>
      {changedOnDisk && (
        <div className="banner warn">This story was changed outside the studio (for example by Claude Code or Notepad).
          <button onClick={reload}>Load the new version</button><button className="ghost" onClick={keepMine}>Keep mine</button></div>
      )}
      <div className="story-body">
        <aside className="side">
          <div className="side-block">
            <div className="label">Length</div>
            <div className="big">{clock(check?.duration)}</div>
            <div className="muted small">{lines ? (ready === lines ? 'with every voice made' : `estimated (${ready} of ${lines} voice lines made)`) : ''}</div>
          </div>
          <div className="side-block">
            <div className="label">Scenes</div>
            <ol className="scene-list">
              {check?.scenes.map((s, i) => (
                <li key={i}><button className="link" onClick={() => { if (s.line) editor.current?.goToLine(s.line); preview.current?.jump(s.t0); }}>{s.name}</button><span className="muted small">{clock(s.t1 - s.t0)}</span></li>
              ))}
            </ol>
          </div>
          <div className="side-block">
            <div className="label">Missing {check?.missing.length ? `(${check.missing.length})` : ''}</div>
            {check && !check.missing.length && <div className="muted small">Nothing. Every place, prop and voice exists.</div>}
            {check?.missing.map((m, i) => {
              const cmd = `/new-asset ${m.name}`;
              return (
                <div key={i} className="missing">
                  <div><b>{m.name}</b> <span className="muted small">{m.kind}{m.lines.length ? `, line ${m.lines.join(', ')}` : ''}</span></div>
                  <button className="small-btn" onClick={() => copyCmd(cmd)}>{copied === cmd ? 'Copied ✓' : <>Copy <code>{cmd}</code></>}</button>
                </div>
              );
            })}
          </div>
          {!!check?.errors.length && (
            <div className="side-block">
              <div className="label bad-text">Lines to fix ({check.errors.length})</div>
              {check.errors.map((e, i) => <button key={i} className="link error-link" onClick={() => editor.current?.goToLine(e.line || 1)}>{e.line ? `Line ${e.line}: ` : ''}{e.message}</button>)}
            </div>
          )}
          {!!check?.warnings.length && (
            <div className="side-block"><div className="label">Notes</div>{check.warnings.map((w, i) => <p key={i} className="muted small">{w}</p>)}</div>
          )}
        </aside>
        <StoryEditor file={file} initialText={story.text} vocab={vocab} playing={playingLine} apiRef={editor}
          onChange={onChange} onSave={() => doSave()} onCheck={onCheck} onLineClick={onLineClick} />
        <div className="right">
          <Preview file={file} check={check?.planUrl ? check : good || check} stale={!!check && !check.planUrl && !!good} voicesJob={voicesJob} apiRef={preview} onTime={onTime} onMakeVoices={makeVoices} />
          <RenderPanel file={file} name={story.name} check={check} job={renderJob} dirty={save !== 'saved'} save={() => doSave()} />
        </div>
      </div>
    </div>
  );
}
