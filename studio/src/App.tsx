// The app: the home screen (#/) or a story (#/story/stories/my-story.txt), and the light/dark theme.
import { useEffect, useState } from 'react';
import { Home } from './Home';
import { StoryScreen } from './StoryScreen';

const route = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''));
const saved = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export function App() {
  const [r, setR] = useState(route());
  const [theme, setTheme] = useState(saved('kitsu-theme') || 'light');
  useEffect(() => { const f = () => setR(route()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('kitsu-theme', theme); } catch { /* private window */ } }, [theme]);
  const toggle = <button className="ghost theme" title="Light or dark" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾ Dark' : '☀ Light'}</button>;
  return r.startsWith('story/') ? <StoryScreen file={r.slice(6)} themeButton={toggle} /> : <Home themeButton={toggle} />;
}

export const go = (file?: string) => { location.hash = file ? '#/story/' + file : '#/'; };
