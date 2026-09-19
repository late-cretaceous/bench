// Units and constants. Both are just named quantities, so they live in the
// same table and are looked up the same way as a variable the user set.

import { D, q } from './quantity.js';

export const UNITS = {};

function unit(sym, factor, d, opts = {}) {
  UNITS[sym] = { sym, factor, d, prefixable: false, ...opts };
}

function alias(from, to) {
  UNITS[to] = { ...UNITS[from], sym: to };
}

const P = true; // takes SI prefixes

// mass
unit('g', 1e-3, D(1), { prefixable: P });
unit('t', 1000, D(1));
unit('u', 1.66053906660e-27, D(1));
alias('u', 'amu');
alias('u', 'Da');
unit('lb', 0.45359237, D(1));
unit('oz', 0.028349523125, D(1));

// length
unit('m', 1, D(0, 1), { prefixable: P });
unit('Å', 1e-10, D(0, 1));
alias('Å', 'angstrom');
unit('inch', 0.0254, D(0, 1));
unit('ft', 0.3048, D(0, 1));
unit('mi', 1609.344, D(0, 1));

// volume
unit('L', 1e-3, D(0, 3), { prefixable: P });
alias('L', 'l');

// time
unit('s', 1, D(0, 0, 1), { prefixable: P });
unit('min', 60, D(0, 0, 1));
unit('hr', 3600, D(0, 0, 1));
unit('day', 86400, D(0, 0, 1));
unit('yr', 31557600, D(0, 0, 1));

// amount
unit('mol', 1, D(0, 0, 0, 1), { prefixable: P });

// temperature
unit('K', 1, D(0, 0, 0, 0, 0, 1), { prefixable: P });
unit('°C', 1, D(0, 0, 0, 0, 0, 1), { affine: { factor: 1, offset: 273.15 } });
alias('°C', 'degC');
unit('°F', 5 / 9, D(0, 0, 0, 0, 0, 1), {
  affine: { factor: 5 / 9, offset: 459.67 * 5 / 9 },
});
alias('°F', 'degF');

// electrical
unit('A', 1, D(0, 0, 0, 0, 1), { prefixable: P });
unit('C', 1, D(0, 0, 1, 0, 1), { prefixable: P });
unit('V', 1, D(1, 2, -3, 0, -1), { prefixable: P });
unit('Ω', 1, D(1, 2, -3, 0, -2), { prefixable: P });
alias('Ω', 'ohm');
unit('farad', 1, D(-1, -2, 4, 0, 2));

// mechanical and thermal
unit('N', 1, D(1, 1, -2), { prefixable: P });
unit('J', 1, D(1, 2, -2), { prefixable: P });
unit('cal', 4.184, D(1, 2, -2), { prefixable: P });
unit('eV', 1.602176634e-19, D(1, 2, -2), { prefixable: P });
unit('W', 1, D(1, 2, -3), { prefixable: P });
unit('Hz', 1, D(0, 0, -1), { prefixable: P });

// pressure
unit('Pa', 1, D(1, -1, -2), { prefixable: P });
unit('bar', 1e5, D(1, -1, -2), { prefixable: P });
unit('atm', 101325, D(1, -1, -2));
unit('torr', 101325 / 760, D(1, -1, -2));
unit('mmHg', 101325 / 760, D(1, -1, -2));
unit('psi', 6894.757293168, D(1, -1, -2));

// concentration
unit('M', 1000, D(0, -3, 0, 1), { prefixable: P });
unit('molal', 1, D(-1, 0, 0, 1));

// dimensionless
unit('rad', 1, D());
unit('deg', Math.PI / 180, D());
unit('ppm', 1e-6, D());
unit('ppb', 1e-9, D());

const PREFIXES = {
  T: [1e12, 'tera'], G: [1e9, 'giga'], M: [1e6, 'mega'], k: [1e3, 'kilo'],
  d: [1e-1, 'deci'], c: [1e-2, 'centi'], m: [1e-3, 'milli'],
  µ: [1e-6, 'micro'], μ: [1e-6, 'micro'], n: [1e-9, 'nano'],
  p: [1e-12, 'pico'], f: [1e-15, 'femto'],
};

export const UNIT_NAMES = {
  g: 'gram', t: 'tonne', u: 'atomic mass unit', amu: 'atomic mass unit',
  Da: 'dalton', lb: 'pound', oz: 'ounce',
  m: 'metre', 'Å': 'angstrom', angstrom: 'angstrom', inch: 'inch', ft: 'foot', mi: 'mile',
  L: 'litre', l: 'litre',
  s: 'second', min: 'minute', hr: 'hour', day: 'day', yr: 'year',
  mol: 'mole',
  K: 'kelvin', '°C': 'degrees Celsius', degC: 'degrees Celsius',
  '°F': 'degrees Fahrenheit', degF: 'degrees Fahrenheit',
  A: 'ampere', C: 'coulomb', V: 'volt', 'Ω': 'ohm', ohm: 'ohm', farad: 'farad',
  N: 'newton', J: 'joule', cal: 'calorie', eV: 'electronvolt', W: 'watt', Hz: 'hertz',
  Pa: 'pascal', bar: 'bar', atm: 'atmosphere', torr: 'torr', mmHg: 'millimetre of mercury',
  psi: 'pound per square inch',
  M: 'molar, mol/L', molal: 'molal, mol/kg',
  rad: 'radian', deg: 'degree of angle', ppm: 'parts per million', ppb: 'parts per billion',
};

// Exact names win, so `min` stays minutes and never becomes milli-inches.
export function lookupUnit(name) {
  if (UNITS[name]) {
    const b = UNITS[name];
    return {
      sym: name, factor: b.factor, d: b.d, exp: 1, affine: b.affine,
      about: UNIT_NAMES[name] || 'unit',
    };
  }
  for (const [prefix, [mult, prefixName]] of Object.entries(PREFIXES)) {
    if (!name.startsWith(prefix) || name.length <= prefix.length) continue;
    const rest = name.slice(prefix.length);
    const base = UNITS[rest];
    if (base && base.prefixable) {
      return {
        sym: name, factor: base.factor * mult, d: base.d, exp: 1,
        about: `${prefixName}${UNIT_NAMES[rest] || rest}`,
      };
    }
  }
  return null;
}

export function unitQuantity(term) {
  return q(term.factor, term.d, Infinity, [term]);
}

// Constants carry their own display units, so results come out reading the way
// a chemist would write them.
function withUnits(value, expr, sig) {
  const parsed = expr.map(([sym, exp]) => {
    const t = lookupUnit(sym);
    return { ...t, exp };
  });
  return q(value, parsed.reduce(
    (d, t) => d.map((x, i) => x + t.d[i] * t.exp),
    D(),
  ), sig, parsed);
}

export const CONSTANTS = {
  NA: { q: withUnits(6.02214076e23, [['mol', -1]], Infinity), about: "Avogadro's number" },
  R: { q: withUnits(8.314462618, [['J', 1], ['mol', -1], ['K', -1]], 10), about: 'gas constant' },
  kB: { q: withUnits(1.380649e-23, [['J', 1], ['K', -1]], Infinity), about: 'Boltzmann constant' },
  h: { q: withUnits(6.62607015e-34, [['J', 1], ['s', 1]], Infinity), about: 'Planck constant' },
  c: { q: withUnits(299792458, [['m', 1], ['s', -1]], Infinity), about: 'speed of light' },
  F: { q: withUnits(96485.33212, [['C', 1], ['mol', -1]], 10), about: 'Faraday constant' },
  qe: { q: withUnits(1.602176634e-19, [['C', 1]], Infinity), about: 'elementary charge' },
  me: { q: withUnits(9.1093837015e-31, [['kg', 1]], 11), about: 'electron mass' },
  mp: { q: withUnits(1.67262192369e-27, [['kg', 1]], 12), about: 'proton mass' },
  mn: { q: withUnits(1.67492749804e-27, [['kg', 1]], 12), about: 'neutron mass' },
  Vm: { q: withUnits(0.022413969545, [['L', 1], ['mol', -1]], 5), about: 'molar volume at STP (0 °C, 1 atm)' },
  Kw: { q: q(1.0e-14, D(), 2), about: 'water ion product at 25 °C' },
  g0: { q: withUnits(9.80665, [['m', 1], ['s', -2]], Infinity), about: 'standard gravity' },
  pi: { q: q(Math.PI, D(), Infinity), about: 'π' },
  π: { q: q(Math.PI, D(), Infinity), about: 'π' },
  e: { q: q(Math.E, D(), Infinity), about: "Euler's number" },
};
