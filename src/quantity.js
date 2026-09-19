// A quantity is a number with a dimension, a display unit and a count of
// significant figures. Every value in the app is one: literals, units,
// constants, molar masses and results differ only in what they hold.
//
// `v` is always the value in SI base units. `u` records how the user wrote it
// so results can be shown back in the same units they came from.

export const DIM_LABELS = ['kg', 'm', 's', 'mol', 'A', 'K', 'cd'];

export const D = (kg = 0, m = 0, s = 0, mol = 0, A = 0, K = 0, cd = 0) =>
  [kg, m, s, mol, A, K, cd];

export const NONE = D();

export function q(v, d = NONE, s = Infinity, u = []) {
  return { v, d, s, u };
}

export const addDim = (a, b) => a.map((x, i) => x + b[i]);
export const subDim = (a, b) => a.map((x, i) => x - b[i]);
export const scaleDim = (a, n) => a.map((x) => x * n);
export const sameDim = (a, b) => a.every((x, i) => x === b[i]);
export const isDimless = (d) => d.every((x) => x === 0);

export function dimName(d) {
  const parts = [];
  d.forEach((e, i) => {
    if (e === 0) return;
    parts.push(e === 1 ? DIM_LABELS[i] : `${DIM_LABELS[i]}^${e}`);
  });
  return parts.length ? parts.join('·') : 'dimensionless';
}

// Display units multiply and divide symbolically, so 2 g / 0.5 mol keeps
// "g/mol" rather than collapsing to kilograms per mole.
export function mulUnits(a, b, sign = 1) {
  const out = [];
  const push = (term, exp) => {
    const found = out.find((o) => o.sym === term.sym);
    if (found) found.exp += exp;
    else out.push({ ...term, exp });
  };
  a.forEach((t) => push(t, t.exp));
  b.forEach((t) => push(t, t.exp * sign));
  return out.filter((t) => t.exp !== 0);
}

export const unitFactor = (u) =>
  u.reduce((f, t) => f * Math.pow(t.factor, t.exp), 1);

// Significant figures. Infinity means exact: units, counting numbers and
// anything the user marked with exact().
export function decimals(v, s) {
  if (!isFinite(s)) return Infinity;
  if (v === 0) return s;
  return s - 1 - Math.floor(Math.log10(Math.abs(v)));
}

export function sigFromDecimals(v, dec) {
  if (!isFinite(dec)) return Infinity;
  if (v === 0) return Math.max(1, Math.round(dec));
  return Math.max(1, Math.round(dec + 1 + Math.floor(Math.log10(Math.abs(v)))));
}

export function mul(a, b) {
  return {
    v: a.v * b.v,
    d: addDim(a.d, b.d),
    s: Math.min(a.s, b.s),
    u: mulUnits(a.u, b.u),
  };
}

export function div(a, b) {
  if (b.v === 0) throw new Error('division by zero');
  return {
    v: a.v / b.v,
    d: subDim(a.d, b.d),
    s: Math.min(a.s, b.s),
    u: mulUnits(a.u, b.u, -1),
  };
}

export function add(a, b, sign = 1) {
  if (!sameDim(a.d, b.d)) {
    throw new Error(
      `cannot add ${dimName(a.d)} and ${dimName(b.d)}`,
    );
  }
  const v = a.v + sign * b.v;
  // Addition keeps decimal places, not significant figures.
  const dec = Math.min(decimals(a.v, a.s), decimals(b.v, b.s));
  return { v, d: a.d, s: sigFromDecimals(v, dec), u: a.u.length ? a.u : b.u };
}

export function pow(a, b) {
  if (!isDimless(b.d)) throw new Error('exponent must be a plain number');
  const n = b.v;
  if (!isDimless(a.d) && !Number.isInteger(n)) {
    throw new Error('a quantity with units needs a whole-number exponent');
  }
  return {
    v: Math.pow(a.v, n),
    d: scaleDim(a.d, n),
    s: a.s,
    u: a.u.map((t) => ({ ...t, exp: t.exp * n })),
  };
}

export const neg = (a) => ({ ...a, v: -a.v });
