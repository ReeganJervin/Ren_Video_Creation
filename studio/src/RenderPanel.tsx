// Make the video: options, live progress (step, %, scene, speed, time left), Cancel / Resume, and when it's done the
// video, the checks as green and red rows, "Copy report" and "Open folder".
import { useEffect, useState } from 'react';
import { api, clock, type CheckResult, type CheckRow, type Job } from './api';

// what a failed check means, in plain words
const EXPLAIN: Record<string, string> = {
  'Length': 'The picture and the sound are not the same length, or not the length the story planned. Making the video again usually fixes it.',
  'Picture': 'The video is not 1920×1080 at 30 frames a second, or frames are missing. Make the video again; if it happens again, ask Claude Code.',
  'Sound and picture start together': 'The sound starts a little before or after the picture. Make the video again.',
  'Voices start on time': 'A voice line starts at the wrong moment. Make the voices and the video again.',
  'No overlapping or cut-off voices': 'Two voice lines overlap, or a line is cut off at the end. Add a "wait" line between them, or shorten the line.',
  'Speech bubbles and captions stay up for their lines': 'A speech bubble or caption disappears before its line is finished.',
  'Sound effects fire on their cues': 'A sound effect is missing or late.',
  'Loudness, no clipping': 'The video is too loud or too quiet, or the sound distorts.',
  'No sudden volume changes': 'The volume jumps suddenly somewhere. Ask Claude Code to look at that moment.',
  'Music fades in and out cleanly': 'The music starts or stops abruptly.',
  'Something happens at least every 90 s': 'A long stretch has no voice or action. Add a line or a scene there.',
};
const STEPS: Record<string, string> = { starting: 'Starting', waiting: 'Waiting for another job', voices: 'Making voices', soundtrack: 'Making the soundtrack', drawing: 'Drawing the frames', joining: 'Joining the parts', checking: 'Checking the video', done: 'Done' };

interface Props { file: string; name: string; check: CheckResult | null; job: Job | undefined; dirty: boolean; save(): Promise<boolean> }

export function RenderPanel({ file, name, check, job, dirty, save }: Props) {
  const [workers, setWorkers] = useState<number | ''>('');
  const [allow, setAllow] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [last, setLast] = useState<{ results: CheckRow[] | null; video: string | null } | null>(null);
  useEffect(() => { api.get<{ workers: number }>('/api/defaults').then(d => setWorkers(w => (w === '' ? d.workers : w))); }, []);
  // the result of the last render, also when it was made before the app was opened
  useEffect(() => { api.get<{ results: CheckRow[] | null; video: string | null }>('/api/report?file=' + encodeURIComponent(file)).then(setLast).catch(() => {}); }, [file, job?.state]);

  const missing = check?.missing.length || 0, errors = check?.errors.length || 0;
  const running = job && (job.state === 'running' || job.state === 'queued');
  const start = async (resume = false) => {
    setError('');
    if (dirty && !(await save())) { setError('Save the story first.'); return; }
    try { await api.post('/api/jobs', { kind: 'render', file, workers: workers || undefined, allowPlaceholders: allow, resume }); }
    catch (e) { setError((e as Error).message); }
  };
  const cancel = () => job && api.post('/api/jobs/cancel', { id: job.id }).catch(e => setError(e.message));
  const results = job?.state === 'done' ? job.results : running ? null : last?.results;
  const video = job?.state === 'done' ? job.video : running ? null : last?.video;
  const report = (rows: CheckRow[]) => `Kitsu Studio check report for ${file}\n` + rows.map(r => `${r.status}  ${r.name}: ${r.detail}`).join('\n');
  const copy = async (rows: CheckRow[]) => { try { await navigator.clipboard.writeText(report(rows)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Copying did not work. The report is also in videos/' + name + '-report.txt'); } };
  const failed = results?.filter(r => r.status === 'FAIL') || [];

  return (
    <section className="render">
      <h3>Make video</h3>
      {!running && (
        <div className="render-options">
          <label>Workers <input type="number" min={1} max={64} value={workers} onChange={e => setWorkers(e.target.value ? +e.target.value : '')} /></label>
          {missing > 0 && <label className="check"><input type="checkbox" checked={allow} onChange={e => setAllow(e.target.checked)} /> Allow placeholders (a test video)</label>}
          <button className="primary" disabled={!check || errors > 0 || (missing > 0 && !allow)} onClick={() => start(false)}>Make video</button>
          {job && ['cancelled', 'stopped', 'failed'].includes(job.state) && <button onClick={() => start(true)}>Resume</button>}
        </div>
      )}
      {errors > 0 && !running && <p className="muted small">Fix the red lines first.</p>}
      {missing > 0 && !allow && !running && <p className="muted small">This story still needs {missing} new thing{missing > 1 ? 's' : ''} (see "Missing" on the left). Tick "Allow placeholders" for a test video.</p>}
      {running && job && (
        <div className="progress">
          <div className="progress-head"><b>{STEPS[job.step] || job.step}</b><span>{Math.floor(job.progress * 100)}%</span></div>
          <div className="progress-bar"><div style={{ width: `${job.progress * 100}%` }} /></div>
          <div className="muted small">
            {job.step === 'voices' && job.voices && <>voice line {job.voices.done + 1} of {job.voices.total}</>}
            {job.step === 'drawing' && <>{job.scene} · {job.fps} frames/s · about {clock(job.left ?? null)} left</>}
          </div>
          <button className="danger" onClick={cancel}>Cancel</button>
        </div>
      )}
      {job && !running && job.state !== 'done' && job.message && <p className={job.state === 'failed' ? 'bad-text small pre' : 'muted small'}>{job.message}</p>}
      {error && <p className="bad-text small">{error}</p>}
      {video && results && (
        <div className="result">
          <video controls preload="metadata" src={`${video}?v=${job?.ended || ''}#t=1`} />
          <ul className="checks">
            {results.map((r, i) => (
              <li key={i} className={'row-' + r.status.toLowerCase()}>
                <span className="mark">{r.status === 'FAIL' ? '✗' : r.status === 'PASS' ? '✓' : 'i'}</span>
                <div><b>{r.name}</b> <span className="muted small">{r.detail}</span>
                  {r.status === 'FAIL' && EXPLAIN[r.name] && <div className="explain">{EXPLAIN[r.name]}</div>}</div>
              </li>
            ))}
          </ul>
          <div className="result-buttons">
            <button onClick={() => api.post('/api/open-folder', { path: `videos/${name}.mp4` })}>Open folder</button>
            <button onClick={() => copy(results)}>{copied ? 'Copied ✓' : failed.length ? 'Copy report for Claude Code' : 'Copy report'}</button>
          </div>
        </div>
      )}
    </section>
  );
}
