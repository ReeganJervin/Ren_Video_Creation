// Home: every story with its length, last change and status, and New / Open / Duplicate / Rename / Delete.
import { useEffect, useState, type ReactNode } from 'react';
import { api, clock, type StoryInfo } from './api';
import { go } from './App';

type Ask = { title: string; text?: string; input?: string; ok: string; danger?: boolean; run: (value: string) => Promise<void> };

export function Home({ themeButton }: { themeButton: ReactNode }) {
  const [stories, setStories] = useState<StoryInfo[] | null>(null);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState<Ask | null>(null);
  const [note, setNote] = useState('');
  const load = () => api.get<{ stories: StoryInfo[] }>('/api/stories').then(r => setStories(r.stories)).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const act = (a: Ask) => setAsk(a);
  const newStory = () => act({ title: 'New story', text: 'What is the story called?', input: '', ok: 'Create', run: async name => { const r = await api.post<{ file: string }>('/api/stories/new', { name }); go(r.file); } });
  const duplicate = (s: StoryInfo) => act({ title: 'Duplicate', text: `A copy of "${s.title}", called:`, input: s.name + '-copy', ok: 'Duplicate', run: async name => { await api.post('/api/stories/duplicate', { file: s.file, name }); load(); } });
  const rename = (s: StoryInfo) => act({ title: 'Rename', text: 'New file name:', input: s.name, ok: 'Rename', run: async name => { await api.post('/api/stories/rename', { file: s.file, name }); load(); } });
  const remove = (s: StoryInfo) => act({
    title: 'Delete this story?', text: `"${s.title}" (${s.file}) is moved to ${s.folder}/_deleted/, so you can still get it back.`, ok: 'Delete', danger: true,
    run: async () => { const r = await api.post<{ movedTo: string }>('/api/stories/delete', { file: s.file }); setNote(`Moved to ${r.movedTo}`); load(); },
  });

  return (
    <div className="home">
      <header className="bar">
        <h1><span className="logo">◆</span> Kitsu Studio</h1>
        <div className="grow" />
        <button className="primary" onClick={newStory}>＋ New story</button>
        {themeButton}
      </header>
      <main className="home-main">
        {error && <p className="banner bad">{error}</p>}
        {note && <p className="banner">{note} <button className="link" onClick={() => setNote('')}>OK</button></p>}
        {!stories ? <p className="muted">Loading your stories…</p> : (
          <table className="stories">
            <thead><tr><th>Story</th><th>Length</th><th>Last changed</th><th>Status</th><th /></tr></thead>
            <tbody>
              {stories.map(s => (
                <tr key={s.file} onDoubleClick={() => go(s.file)}>
                  <td><button className="title-link" onClick={() => go(s.file)}>{s.title}</button><div className="muted small">{s.file}</div></td>
                  <td>{clock(s.duration)}</td>
                  <td>{new Date(s.mtime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><span className={`badge ${s.status.replace(/\s+/g, '-').toLowerCase()}`}>{s.status}</span></td>
                  <td className="row-actions">
                    <button onClick={() => go(s.file)}>Open</button>
                    <button className="ghost" onClick={() => duplicate(s)}>Duplicate</button>
                    <button className="ghost" onClick={() => rename(s)}>Rename</button>
                    <button className="ghost danger" onClick={() => remove(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
      {ask && <Dialog ask={ask} close={() => setAsk(null)} />}
    </div>
  );
}

function Dialog({ ask, close }: { ask: Ask; close: () => void }) {
  const [value, setValue] = useState(ask.input ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setError('');
    try { await ask.run(value); close(); } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return (
    <div className="modal-back" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <form className="modal" role="dialog" aria-label={ask.title} onSubmit={e => { e.preventDefault(); run(); }}>
        <h2>{ask.title}</h2>
        {ask.text && <p>{ask.text}</p>}
        {ask.input !== undefined && <input autoFocus value={value} onChange={e => setValue(e.target.value)} />}
        {error && <p className="bad-text">{error}</p>}
        <div className="modal-buttons">
          <button type="button" className="ghost" onClick={close}>Cancel</button>
          <button type="submit" className={ask.danger ? 'danger-solid' : 'primary'} disabled={busy}>{ask.ok}</button>
        </div>
      </form>
    </div>
  );
}
