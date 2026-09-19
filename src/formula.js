// A chemical formula is read, not looked up, so any compound works without
// anyone having listed it: H2O, Ca(OH)2, CuSO4·5H2O.

import { BY_SYMBOL } from './elements.js';

function parse(text) {
  let i = 0;

  const number = () => {
    let n = '';
    while (i < text.length && /[0-9]/.test(text[i])) n += text[i++];
    return n ? parseInt(n, 10) : 1;
  };

  const merge = (into, from, times) => {
    from.forEach((n, sym) => into.set(sym, (into.get(sym) || 0) + n * times));
  };

  const group = (depth) => {
    const out = new Map();
    while (i < text.length) {
      const ch = text[i];
      if (ch === '(' || ch === '[') {
        i++;
        const inner = group(depth + 1);
        if (text[i] === ')' || text[i] === ']') i++;
        else throw new Error('unclosed bracket');
        merge(out, inner, number());
      } else if (ch === ')' || ch === ']') {
        if (depth === 0) throw new Error('unmatched bracket');
        return out;
      } else if (ch === '·' || ch === '•') {
        // A hydrate dot restarts the formula and scales everything after it.
        i++;
        const times = number();
        merge(out, group(depth), times);
        return out;
      } else if (/[A-Z]/.test(ch)) {
        let sym = text[i++];
        while (i < text.length && /[a-z]/.test(text[i])) sym += text[i++];
        if (!BY_SYMBOL.has(sym)) throw new Error(`${sym} is not an element`);
        out.set(sym, (out.get(sym) || 0) + number());
      } else {
        throw new Error(`${ch} does not belong in a formula`);
      }
    }
    return out;
  };

  if (!/^[A-Z]/.test(text)) throw new Error('a formula starts with an element');
  const counts = group(0);
  if (i < text.length) throw new Error('unmatched bracket');
  return counts;
}

export const formulaCounts = parse;

export function isFormula(text) {
  try {
    parse(text);
    return true;
  } catch {
    return false;
  }
}

// Molar mass in g/mol. Its precision is that of the least precise atomic
// weight in the compound.
export function molarMass(counts) {
  let mass = 0;
  let sig = Infinity;
  counts.forEach((n, sym) => {
    const el = BY_SYMBOL.get(sym);
    mass += el.mass * n;
    sig = Math.min(sig, sigFigsOf(el.mass));
  });
  return { mass, sig };
}

function sigFigsOf(x) {
  const digits = String(x).replace('.', '').replace(/^0+/, '');
  return Math.max(1, digits.replace(/0+$/, '').length || 1);
}
