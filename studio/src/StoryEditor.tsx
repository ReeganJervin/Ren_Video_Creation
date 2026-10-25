// The story editor: CodeMirror 6 with the story colours, suggestions, the live check and the playing-line highlight.
import { useEffect, useRef } from 'react';
import { EditorState, StateEffect, StateField, type Extension } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { linter, lintGutter, forceLinting, type Diagnostic } from '@codemirror/lint';
import { api, type CheckResult, type Vocab } from './api';
import { storyLanguage, storyHighlight, storyCompletions } from './storyLang';

export interface EditorApi { setText(text: string): void; recheck(): void; goToLine(line: number): void; text(): string }

// "check again" without a change to the text (voices made, new assets): forceLinting alone only runs a pending check
const recheckNow = StateEffect.define<null>();
const recheck = (v: EditorView) => { v.dispatch({ effects: recheckNow.of(null) }); forceLinting(v); };

// the line being played in the preview
const setPlaying = StateEffect.define<number | null>();
const playingLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) if (e.is(setPlaying)) {
      if (e.value == null || e.value < 1 || e.value > tr.state.doc.lines) return Decoration.none;
      return Decoration.set([Decoration.line({ class: 'cm-playing' }).range(tr.state.doc.line(e.value).from)]);
    }
    return deco.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f),
});

interface Props {
  file: string; initialText: string; vocab: Vocab | null; playing: number | null;
  onChange(text: string): void; onSave(): void; onCheck(r: CheckResult): void; onLineClick(line: number): void;
  apiRef: { current: EditorApi | null };
}

export function StoryEditor(p: Props) {
  const host = useRef<HTMLDivElement>(null), view = useRef<EditorView | null>(null);
  // the latest props, for CodeMirror's callbacks
  const cur = useRef(p); cur.current = p;

  useEffect(() => {
    // the live check, about half a second after typing stops: errors in red, missing things in orange
    const check = linter(async v => {
      const text = v.state.doc.toString();
      let r: CheckResult;
      try { r = await api.post<CheckResult>('/api/check', { file: cur.current.file, text }); } catch { return []; }
      if (v.state.doc.toString() !== text) return [];   // typed again meanwhile: the next check follows
      cur.current.onCheck(r);
      const doc = v.state.doc, at = (n: number) => doc.line(Math.min(Math.max(1, n), doc.lines));
      const out: Diagnostic[] = r.errors.map(e => { const l = at(e.line); return { from: l.from, to: l.to, severity: 'error', message: e.message }; });
      r.missing.forEach(m => m.lines.forEach(n => {
        const l = at(n);
        out.push({ from: l.from, to: l.to, severity: 'warning', message: `Missing ${m.kind}: "${m.name}". It shows as a grey placeholder for now. To create it, type /new-asset in Claude Code.` });
      }));
      return out;
    }, { delay: 500, needsRefresh: u => u.transactions.some(tr => tr.effects.some(e => e.is(recheckNow))) });
    const ext: Extension[] = [
      lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(), EditorView.lineWrapping,
      storyLanguage, storyHighlight, playingLine, check, lintGutter(),
      autocompletion({ override: [storyCompletions(() => cur.current.vocab)], activateOnTyping: true, maxRenderedOptions: 60 }),
      keymap.of([{ key: 'Mod-s', preventDefault: true, run: () => { cur.current.onSave(); return true; } }, ...completionKeymap, ...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of(u => { if (u.docChanged) cur.current.onChange(u.state.doc.toString()); }),
      EditorView.domEventHandlers({
        mouseup(e, v) {
          if (e.button !== 0 || !v.state.selection.main.empty) return false;
          const pos = v.posAtCoords({ x: e.clientX, y: e.clientY });
          if (pos != null) cur.current.onLineClick(v.state.doc.lineAt(pos).number);
          return false;
        },
      }),
    ];
    const v = new EditorView({ parent: host.current!, state: EditorState.create({ doc: p.initialText, extensions: ext }) });
    view.current = v;
    p.apiRef.current = {
      setText: text => v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } }),
      recheck: () => recheck(v),
      goToLine: n => { const l = v.state.doc.line(Math.min(Math.max(1, n), v.state.doc.lines)); v.dispatch({ selection: { anchor: l.from }, effects: EditorView.scrollIntoView(l.from, { y: 'center' }) }); v.focus(); },
      text: () => v.state.doc.toString(),
    };
    return () => { v.destroy(); view.current = null; p.apiRef.current = null; };
  }, [p.file]);   // the editor is made once per story file

  useEffect(() => { view.current?.dispatch({ effects: setPlaying.of(p.playing) }); }, [p.playing]);
  // new words (a new asset): check again so they're known
  useEffect(() => { if (view.current) recheck(view.current); }, [p.vocab]);

  return <div className="editor" ref={host} />;
}
