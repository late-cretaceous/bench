// Turns a line into tokens. The only unusual part is that a run like
// Ca(OH)2·2H2O is pulled out whole, so brackets inside a formula are never
// mistaken for a function call.

import { isFormula } from './formula.js';

const IDENT_START = /[A-Za-z_°µμΩπΔ]/;
const IDENT_PART = /[A-Za-z0-9_°µμΩπΔ]/;
const FORMULA_PART = /[A-Za-z0-9()\[\]·•]/;
const OPERATORS = ['**', '+', '-', '*', '/', '^', '(', ')', ',', '=', '%', '·', '×', '÷'];

export const KEYWORDS = new Set(['in', 'to']);

export function lex(input) {
  const tokens = [];
  let i = 0;
  let spaced = false;

  const push = (t, text, extra = {}) => {
    tokens.push({ t, text, spaced, start: i, ...extra });
    spaced = false;
  };

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) { i++; spaced = true; continue; }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] || ''))) {
      const start = i;
      while (i < input.length && /[0-9]/.test(input[i])) i++;
      if (input[i] === '.') { i++; while (i < input.length && /[0-9]/.test(input[i])) i++; }
      if (/[eE]/.test(input[i] || '') && /[0-9+-]/.test(input[i + 1] || '')) {
        i++;
        if (/[+-]/.test(input[i])) i++;
        while (i < input.length && /[0-9]/.test(input[i])) i++;
      }
      const text = input.slice(start, i);
      push('num', text, { value: parseFloat(text), sig: sigFigsOf(text) });
      continue;
    }

    if (ch === '#' && /[0-9]/.test(input[i + 1] || '')) {
      const start = i;
      i++;
      while (i < input.length && /[0-9]/.test(input[i])) i++;
      const text = input.slice(start, i);
      push('ref', text, { line: parseInt(text.slice(1), 10) });
      continue;
    }

    if (IDENT_START.test(ch)) {
      const start = i;
      i++;
      while (i < input.length) {
        if (IDENT_PART.test(input[i])) { i++; continue; }
        // A middot belongs to a hydrate, not to a unit product.
        if ((input[i] === '·' || input[i] === '•') && /[0-9A-Z]/.test(input[i + 1] || '')) {
          i++;
          continue;
        }
        break;
      }
      let text = input.slice(start, i);

      // Brackets right after an element symbol mean a formula, not a call.
      if (/[A-Z]/.test(ch) && (input[i] === '(' || input[i] === '[')) {
        let end = i;
        while (end < input.length && FORMULA_PART.test(input[end])) end++;
        for (let stop = end; stop > i; stop--) {
          const candidate = input.slice(start, stop);
          if (isFormula(candidate)) { text = candidate; i = stop; break; }
        }
      }
      push(KEYWORDS.has(text) ? 'keyword' : 'name', text);
      continue;
    }

    const op = OPERATORS.find((o) => input.startsWith(o, i));
    if (op) { const text = op; i += op.length; push('op', text); continue; }

    throw new Error(`I do not understand "${ch}"`);
  }

  tokens.push({ t: 'end', text: '', spaced });
  return tokens;
}

// A whole number with no decimal point is a count, and counts are exact.
// Write 2.0 to mean two significant figures.
export function sigFigsOf(text) {
  const [mantissa, exponent] = text.toLowerCase().split('e');
  if (!mantissa.includes('.') && exponent === undefined) return Infinity;
  const digits = mantissa.replace('.', '').replace(/^0+/, '');
  return Math.max(1, digits.length || 1);
}
