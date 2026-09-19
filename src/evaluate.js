// Walks an expression. Names are looked up in one order and the lookup that
// won is recorded, so the sheet can say what K meant on this line.

import {
  q, D, NONE, add, div, mul, pow, neg, sameDim, isDimless, dimName,
  decimals, sigFromDecimals,
} from './quantity.js';
import { CONSTANTS, lookupUnit, unitQuantity } from './units.js';
import { formulaCounts, molarMass } from './formula.js';
import { BY_SYMBOL } from './elements.js';

export const GRAM_PER_MOL = () => {
  const g = lookupUnit('g');
  const mol = lookupUnit('mol');
  return [{ ...g, exp: 1 }, { ...mol, exp: -1 }];
};

export function resolve(name, ctx) {
  if (ctx.vars.has(name)) {
    return { value: ctx.vars.get(name), kind: 'variable', about: 'set on this sheet' };
  }
  if (CONSTANTS[name]) {
    return { value: CONSTANTS[name].q, kind: 'constant', about: CONSTANTS[name].about };
  }
  const unit = lookupUnit(name);
  if (unit) {
    return { value: unitQuantity(unit), kind: 'unit', about: unit.about };
  }
  if (/^[A-Z]/.test(name)) {
    try {
      const counts = formulaCounts(name);
      const { mass, sig } = molarMass(counts);
      const single = counts.size === 1 && [...counts.values()][0] === 1;
      const about = single
        ? `${BY_SYMBOL.get([...counts.keys()][0]).name}, molar mass`
        : `molar mass of ${name}`;
      return {
        value: q(mass * 1e-3, D(1, 0, 0, -1), sig, GRAM_PER_MOL()),
        kind: 'formula',
        about,
      };
    } catch { /* not a formula either */ }
  }
  return null;
}

const dimlessOnly = (x, fn) => {
  if (!isDimless(x.d)) throw new Error(`${fn} needs a plain number, not ${dimName(x.d)}`);
  return x.v;
};

// A logarithm keeps as many decimal places as its input had significant
// figures, which is the rule that makes pH come out right.
const logSig = (x) => (isFinite(x.s) ? x.s : Infinity);

function logResult(value, input) {
  const dec = logSig(input);
  return q(value, NONE, sigFromDecimals(value, dec));
}

export const FUNCTIONS = {
  sqrt: { arity: 1, about: 'square root', apply: ([x]) => pow(x, q(0.5)) },
  cbrt: { arity: 1, about: 'cube root', apply: ([x]) => pow(x, q(1 / 3)) },
  abs: { arity: 1, about: 'absolute value', apply: ([x]) => ({ ...x, v: Math.abs(x.v) }) },
  exp: { arity: 1, about: 'e to the power', apply: ([x]) => q(Math.exp(dimlessOnly(x, 'exp')), NONE, x.s) },
  ln: { arity: 1, about: 'natural logarithm', apply: ([x]) => logResult(Math.log(dimlessOnly(x, 'ln')), x) },
  log: { arity: 1, about: 'logarithm base 10', apply: ([x]) => logResult(Math.log10(dimlessOnly(x, 'log')), x) },
  log2: { arity: 1, about: 'logarithm base 2', apply: ([x]) => logResult(Math.log2(dimlessOnly(x, 'log2')), x) },
  p: {
    arity: 1,
    about: 'minus log base 10, as in pH and pKa',
    apply: ([x], ctx) => {
      let value = x.v;
      if (!isDimless(x.d)) {
        const molar = lookupUnit('M');
        if (!sameDim(x.d, molar.d)) {
          throw new Error('p() takes a plain number or a concentration');
        }
        value = x.v / molar.factor;
        ctx.note('p()', 'read as a concentration in mol/L');
      }
      return logResult(-Math.log10(value), x);
    },
  },
  invp: { arity: 1, about: 'undoes p(): 10 to the minus x', apply: ([x]) => q(Math.pow(10, -x.v), NONE, isFinite(x.s) ? Math.max(1, decimals(x.v, x.s)) : Infinity) },
  round: { arity: 1, about: 'nearest whole number', apply: ([x]) => ({ ...x, v: Math.round(x.v), s: Infinity }) },
  floor: { arity: 1, about: 'round down', apply: ([x]) => ({ ...x, v: Math.floor(x.v), s: Infinity }) },
  ceil: { arity: 1, about: 'round up', apply: ([x]) => ({ ...x, v: Math.ceil(x.v), s: Infinity }) },
  min: { arity: 2, about: 'smaller of two', apply: ([a, b]) => (a.v <= b.v ? a : b) },
  max: { arity: 2, about: 'larger of two', apply: ([a, b]) => (a.v >= b.v ? a : b) },
  sin: { arity: 1, about: 'sine, in radians', apply: ([x]) => q(Math.sin(dimlessOnly(x, 'sin')), NONE, x.s) },
  cos: { arity: 1, about: 'cosine, in radians', apply: ([x]) => q(Math.cos(dimlessOnly(x, 'cos')), NONE, x.s) },
  tan: { arity: 1, about: 'tangent, in radians', apply: ([x]) => q(Math.tan(dimlessOnly(x, 'tan')), NONE, x.s) },
  asin: { arity: 1, about: 'inverse sine', apply: ([x]) => q(Math.asin(dimlessOnly(x, 'asin')), NONE, x.s) },
  acos: { arity: 1, about: 'inverse cosine', apply: ([x]) => q(Math.acos(dimlessOnly(x, 'acos')), NONE, x.s) },
  atan: { arity: 1, about: 'inverse tangent', apply: ([x]) => q(Math.atan(dimlessOnly(x, 'atan')), NONE, x.s) },
  exact: { arity: 1, about: 'treat as exact, with no rounding', apply: ([x]) => ({ ...x, s: Infinity }) },
  sf: {
    arity: 2,
    about: 'set the significant figures of a value',
    apply: ([x, n]) => ({ ...x, s: Math.max(1, Math.round(n.v)) }),
  },
};

// mw() takes a formula rather than a value, so it is handled before the
// arguments are evaluated. It is the way past a name a unit already owns.
const SPECIAL = {
  mw: (args, ctx) => {
    const node = args[0];
    if (!node || node.t !== 'name') throw new Error('mw() takes a formula, as in mw(K)');
    const counts = formulaCounts(node.name);
    const { mass, sig } = molarMass(counts);
    ctx.note(`mw(${node.name})`, `molar mass of ${node.name}`);
    return q(mass * 1e-3, D(1, 0, 0, -1), sig, GRAM_PER_MOL());
  },
};

export function evaluate(node, ctx) {
  switch (node.t) {
    case 'number':
      return q(node.value, NONE, node.sig);

    case 'ref': {
      if (node.line > ctx.lines.length) {
        throw new Error(`${node.text} is not above this line yet`);
      }
      const found = ctx.lines[node.line - 1];
      if (!found) throw new Error(`line ${node.line} has no value`);
      return found;
    }

    case 'name': {
      const found = resolve(node.name, ctx);
      if (!found) throw new Error(`${node.name} is not set, and is not a unit or a formula`);
      ctx.note(node.name, found.about, found.kind);
      return found.value;
    }

    case 'call': {
      if (SPECIAL[node.name]) return SPECIAL[node.name](node.args, ctx);
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new Error(`${node.name} is not a function`);
      if (node.args.length !== fn.arity) {
        throw new Error(`${node.name}() takes ${fn.arity} value${fn.arity === 1 ? '' : 's'}`);
      }
      return fn.apply(node.args.map((a) => evaluate(a, ctx)), ctx);
    }

    case 'negate':
      return neg(evaluate(node.value, ctx));

    case 'percent': {
      const x = evaluate(node.value, ctx);
      return { ...x, v: x.v / 100 };
    }

    case 'binary': {
      // 25 °C is a temperature, not 25 times a degree.
      if (node.op === '*' && node.b.t === 'name') {
        const unit = lookupUnit(node.b.name) || {};
        if (unit.affine && !ctx.vars.has(node.b.name)) {
          const scale = evaluate(node.a, ctx);
          if (!isDimless(scale.d)) throw new Error('a temperature scale needs a plain number');
          ctx.note(node.b.name, 'temperature scale', 'unit');
          return q(
            scale.v * unit.affine.factor + unit.affine.offset,
            unit.d,
            scale.s,
            [{ ...unit, exp: 1 }],
          );
        }
      }
      const a = evaluate(node.a, ctx);
      const b = evaluate(node.b, ctx);
      switch (node.op) {
        case '+': return add(a, b, 1);
        case '-': return add(a, b, -1);
        case '*': return mul(a, b);
        case '/': return div(a, b);
        case '^': return pow(a, b);
        default: throw new Error(`unknown operator ${node.op}`);
      }
    }

    case 'convert': {
      const value = evaluate(node.value, ctx);
      const target = evaluateUnit(node.unit, ctx);
      if (!sameDim(value.d, target.d)) {
        throw new Error(`cannot show ${dimName(value.d)} as ${dimName(target.d)}`);
      }
      return { ...value, u: target.u };
    }

    case 'assign': {
      const value = evaluate(node.value, ctx);
      ctx.vars.set(node.name, value);
      ctx.assigned = node.name;
      return value;
    }

    default:
      throw new Error('I could not read that');
  }
}

// The right-hand side of `in` is a unit, so an affine scale is allowed there
// even though it cannot take part in arithmetic.
function evaluateUnit(node, ctx) {
  if (node.t === 'name') {
    const unit = lookupUnit(node.name);
    if (unit && unit.affine) return q(1, unit.d, Infinity, [{ ...unit, exp: 1 }]);
  }
  return evaluate(node, ctx);
}
