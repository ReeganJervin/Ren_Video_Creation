// The story language in the editor: colours for each kind of line, and suggestions while typing.
// Every word comes from the engine's registries (GET /api/vocab), so new places, props and extras appear by themselves.
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Tag, tags } from '@lezer/highlight';
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import type { Vocab } from './api';

const T = { scene: Tag.define(), setting: Tag.define(), value: Tag.define(), narrator: Tag.define(), ren: Tag.define(), yuki: Tag.define(), speaker: Tag.define(), speech: Tag.define(), action: Tag.define() };
const SETTINGS = /^\s*(thumbnail text|thumbnail shot|thumbnail|ending text|ending|intro|format|title card|title|place|time|music|camera|shot|editing|reveal)\s*:/i;

interface LineState { head: boolean; speech: boolean; setting: boolean }
export const storyLanguage = StreamLanguage.define<LineState>({
  name: 'kitsu-story',
  startState: () => ({ head: true, speech: false, setting: false }),
  token(stream, st) {
    if (stream.sol()) {
      st.head = true; st.speech = false; st.setting = false;
      if (stream.match(/^\s*#.*/)) return 'comment';
      if (stream.match(/^\s*\+\s*/)) return 'plus';   // "+": at the same time as the line before
    }
    if (st.head) {
      st.head = false;
      if (stream.match(/^\s*scene\s*:.*/i)) return 'scene';
      if (stream.match(SETTINGS)) { st.setting = true; return 'setting'; }
      const m = stream.match(/^\s*([a-z][a-z' ]{0,30}?)\s*(\(\s*[a-z]+\s*\))?\s*:/i) as RegExpMatchArray | null;
      if (m) { st.speech = true; const who = m[1].toLowerCase(); return who === 'narrator' || who === 'ren' || who === 'yuki' ? who : 'speaker'; }
      stream.skipToEnd(); return 'action';
    }
    stream.skipToEnd();
    return st.speech ? 'speech' : st.setting ? 'value' : null;
  },
  tokenTable: { plus: tags.operator, scene: T.scene, setting: T.setting, value: T.value, narrator: T.narrator, ren: T.ren, yuki: T.yuki, speaker: T.speaker, speech: T.speech, action: T.action },
});
// colours live in styles.css (tok-*), so the dark theme can change them
export const storyHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.comment, class: 'tok-comment' }, { tag: tags.operator, class: 'tok-plus' }, { tag: T.scene, class: 'tok-scene' },
  { tag: T.setting, class: 'tok-setting' }, { tag: T.value, class: 'tok-value' }, { tag: T.narrator, class: 'tok-narrator' },
  { tag: T.ren, class: 'tok-ren' }, { tag: T.yuki, class: 'tok-yuki' }, { tag: T.speaker, class: 'tok-speaker' },
  { tag: T.speech, class: 'tok-speech' }, { tag: T.action, class: 'tok-action' },
]));

// "<name> walks to left|center|right" -> ["walks to left", "walks to center", "walks to right"] (an optional "[...]" part
// and anything after a "<text>" placeholder are left for the writer). "<other name>", "<mood>" and "<prop>" are filled in.
function expand(template: string, v: Vocab, self: string): string[] {
  let out = [''];
  for (const tok of template.split(' ')) {
    if (!tok || tok.startsWith('[') || /^<(text|seconds|WORD|name\|.*)>$/.test(tok)) break;
    let alts: string[];
    if (tok === '<other' || tok === '<name>') alts = v.characters.filter(c => c !== self);
    else if (tok === 'name>') continue;
    else if (tok === '<mood>') alts = v.moods;
    else if (tok === '<prop>') alts = v.props;
    else if (tok.includes('|') && !tok.includes('<')) alts = tok.split('|');
    else if (tok.startsWith('<')) break;
    else alts = [tok];
    out = out.flatMap(o => alts.map(a => (o ? o + ' ' : '') + a));
    if (out.length > 60) break;
  }
  return out.filter(Boolean);
}

export function storyCompletions(getVocab: () => Vocab | null) {
  return (cx: CompletionContext): CompletionResult | null => {
    const v = getVocab();
    if (!v) return null;
    const line = cx.state.doc.lineAt(cx.pos), before = line.text.slice(0, cx.pos - line.from);
    const opt = (label: string, detail?: string, type = 'keyword'): Completion => ({ label, detail, type });
    const word = /[\w' ]*$/;
    let m: RegExpMatchArray | null;
    // settings: place:, time:, music:
    if ((m = before.match(/^\s*(place|time|music|thumbnail|thumbnail shot|intro|ending|format)\s*:\s*([\w ]*)$/i))) {
      const lists: Record<string, string[]> = { place: v.places, time: v.times, music: v.music, thumbnail: ['auto', 'scene 1'], 'thumbnail shot': ['medium', 'close', 'wide'], intro: ['series', 'after scene 1', 'none'], ending: ['end screen', 'none'], format: ['wide', 'vertical'] };
      const list = lists[m[1].toLowerCase().replace(/\s+/g, ' ')];
      return { from: cx.pos - m[2].length, options: list.map(x => opt(x, m![1].toLowerCase(), 'enum')), validFor: word };
    }
    const actors = [...v.characters, ...v.extras], who = actors.join('|').replace(/ /g, '\\s+');
    // a mood after "ren (" -> "ren (happy): "
    if ((m = before.match(new RegExp(`^\\s*\\+?\\s*(${who})\\s*\\(\\s*([a-z]*)$`, 'i')))) {
      return { from: cx.pos - m[2].length, options: v.moods.map(x => ({ label: x, apply: x + '): ', detail: 'mood', type: 'enum' })), validFor: /^[a-z]*$/ };
    }
    // the things a character or extra can do, after its name
    if ((m = before.match(new RegExp(`^\\s*\\+?\\s*(${who})((?:\\s+and\\s+(?:${who}))*)\\s+([a-z' ]*)$`, 'i')))) {
      const name = m[1].toLowerCase(), extra = v.extras.includes(name), typed = m[3];
      const items = new Map<string, string>();
      for (const h of v.help) {
        const k = extra ? h.match(/^<extra> (.+)$/) : h.match(/^<name> (.+)$/);
        if (!k || k[1].startsWith('and ')) continue;
        const parts = k[1].includes(' | ') ? k[1].split(' | ') : [k[1]];
        parts.forEach(p => {
          // "looks up|down|at you|at the star": everything after the verb is one list (choices can have spaces)
          const i = p.split(' ').findIndex(t => t.includes('|'));
          const list = !p.includes('[') && !p.includes('<') && i > 0 ? p.split(' ').slice(i).join(' ').split('|').map(a => p.split(' ').slice(0, i).join(' ') + ' ' + a) : expand(p, v, name);
          list.forEach(x => { if (!items.has(x)) items.set(x, h); });
        });
      }
      if (!extra) v.props.forEach(p => { items.set(`walks to the ${p}`, '<name> walks to the <prop>'); items.set(`looks at the ${p}`, '<name> looks at the <prop>'); });
      return { from: cx.pos - typed.length, options: [...items].map(([x, h]) => opt(x, h.replace(/<name>|<extra>/, name), 'function')), validFor: /^[a-z' ]*$/ };
    }
    // "the lantern glows"
    if ((m = before.match(/^\s*\+?\s*the\s+([a-z' ]*)$/i))) {
      const options = v.props.flatMap(p => ['glows', 'stops glowing', 'opens', 'closes'].map(a => opt(`${p} ${a}`, 'prop', 'function')));
      return { from: cx.pos - m[1].length, options, validFor: /^[a-z' ]*$/ };
    }
    // the start of a line: names, settings and things
    if ((m = before.match(/^\s*\+?\s*([a-z' ]*)$/i)) && (m[1].length || cx.explicit)) {
      const options: Completion[] = [
        ...v.characters.map(c => opt(c, 'character', 'variable')), opt('narrator: ', 'the narrator says', 'variable'),
        ...v.extras.map(e => opt(e, 'extra', 'variable')),
        ...['title: ', 'place: ', 'time: ', 'music: ', 'scene: ', 'shot: ', 'camera: ', 'wait ', 'beat', 'title card: ', 'thumbnail: ', 'thumbnail shot: ', 'thumbnail text: ', 'intro: ', 'ending: ', 'ending text: ', 'format: '].map(s => opt(s, 'setting')),
        ...v.props.flatMap(p => [`${p} appears at center`, `${p} appears next to ren`, `${p} disappears`].map(x => opt(x, 'prop', 'function'))),
        ...['star appears', 'star falls', 'star glows', 'star twinkles', 'star rises', 'star disappears', 'hearts float up', 'sparkles'].map(x => opt(x, 'star and effects', 'function')),
      ];
      return { from: cx.pos - m[1].length, options, validFor: /^[a-z' ]*$/ };
    }
    return null;
  };
}
