// The sheet is a list of source lines. Running it from the top is the only way
// results and variables are ever produced, so editing any line and re-running
// is the same operation as typing a new one.

import { parse } from './parser.js';
import { evaluate } from './evaluate.js';

const KEY = 'bench.sheet.v1';

export function isNote(source) {
  return source.trim().startsWith('//');
}

export function run(sources) {
  const vars = new Map();
  const lines = [];
  const results = [];

  sources.forEach((source, index) => {
    const notes = [];
    const ctx = {
      vars,
      lines,
      assigned: null,
      note(name, about, kind) {
        if (!about) return;
        if (notes.some((n) => n.name === name)) return;
        notes.push({ name, about, kind });
      },
    };

    if (!source.trim() || isNote(source)) {
      lines.push(null);
      results.push({ source, kind: isNote(source) ? 'note' : 'blank', notes: [] });
      return;
    }

    try {
      const quantity = evaluate(parse(source), ctx);
      lines.push(quantity);
      vars.set('_', quantity);
      results.push({ source, kind: 'value', quantity, notes, assigned: ctx.assigned });
    } catch (error) {
      lines.push(null);
      results.push({ source, kind: 'error', error: error.message, notes });
    }
  });

  return { results, vars };
}

// Every line's result is named after its line number, #7 for line 7. That is
// a position, so deleting a line above one rewrites the references below it
// rather than silently pointing them somewhere else.
export function removeLine(sources, index) {
  const kept = sources.filter((_, i) => i !== index);
  return kept.map((source) =>
    source.replace(/#(\d+)/g, (whole, digits) => {
      const line = parseInt(digits, 10);
      if (line === index + 1) return '#?';
      return line > index + 1 ? `#${line - 1}` : whole;
    }),
  );
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.sources)) return null;
    // Line references were briefly written $7 rather than #7.
    saved.sources = saved.sources.map((source) => source.replace(/\$(\d+)/g, '#$1'));
    return saved;
  } catch {
    return null;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* a full or blocked store is not worth interrupting anyone over */ }
}
