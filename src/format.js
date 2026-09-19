// Turning a quantity back into something readable. The display unit the value
// carries decides what it is shown in; significant figures decide how much of
// it is shown.

import { DIM_LABELS, unitFactor, sameDim, D } from './quantity.js';
import { lookupUnit } from './units.js';

// When units cancel down to something with a plain name, say the plain name:
// mL·M is a mole. Only applied when the leftover dimension is simpler than the
// unit expression, so L·atm and g/mol are left as written.
const PREFERRED = [
  [D(0, 0, 0, 1), 'mol'], [D(1), 'g'], [D(0, 1), 'm'], [D(0, 3), 'L'],
  [D(0, 0, 1), 's'], [D(0, 0, 0, 0, 0, 1), 'K'], [D(0, 0, 0, 0, 1), 'A'],
  [D(1, 2, -2), 'J'], [D(1, -1, -2), 'Pa'], [D(1, 1, -2), 'N'],
  [D(1, 2, -3), 'W'], [D(0, 0, 1, 0, 1), 'C'], [D(0, -3, 0, 1), 'M'],
  [D(0, 0, -1), 'Hz'], [D(1, 2, -3, 0, -1), 'V'],
];

export function simplify(quantity) {
  if (quantity.u.length < 2) return quantity;
  if (quantity.u.some((t) => t.affine)) return quantity;
  const spread = quantity.d.filter((x) => x !== 0).length;
  if (quantity.u.length <= spread) return quantity;
  if (spread === 0) return { ...quantity, u: [] };
  const match = PREFERRED.find(([d]) => sameDim(d, quantity.d));
  if (!match) return quantity;
  return { ...quantity, u: [{ ...lookupUnit(match[1]), exp: 1 }] };
}

export function displayValue(quantity) {
  const affine = quantity.u.length === 1 && quantity.u[0].affine;
  if (affine) {
    const { factor, offset } = quantity.u[0].affine;
    return (quantity.v - offset) / factor;
  }
  return quantity.v / unitFactor(quantity.u);
}

export function unitTerms(quantity) {
  if (quantity.u.length) return quantity.u.map((t) => ({ sym: t.sym, exp: t.exp }));
  const derived = [];
  quantity.d.forEach((e, i) => { if (e !== 0) derived.push({ sym: DIM_LABELS[i], exp: e }); });
  return derived;
}

export function unitText(quantity) {
  const terms = unitTerms(quantity);
  if (!terms.length) return '';
  const top = terms.filter((t) => t.exp > 0);
  const bottom = terms.filter((t) => t.exp < 0);
  const part = (t, exp) => (exp === 1 ? t.sym : `${t.sym}^${exp}`);
  const topText = top.length ? top.map((t) => part(t, t.exp)).join('·') : '1';
  if (!bottom.length) return topText;
  const bottomText = bottom.map((t) => part(t, -t.exp)).join('·');
  return `${topText}/${bottom.length > 1 ? `(${bottomText})` : bottomText}`;
}

export function unitHtml(quantity) {
  return unitText(quantity).replace(/\^(-?[\d.]+)/g, (_, n) => `<sup>${n}</sup>`);
}

export function roundToSig(value, sig) {
  if (!isFinite(sig) || value === 0 || !isFinite(value)) return value;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const places = sig - 1 - magnitude;
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

// Returns the parts rather than a string, so ×10 can be set as an exponent
// instead of written out as "e-7".
export function formatNumber(value, sig, useSig) {
  if (!isFinite(value)) {
    return { mantissa: Number.isNaN(value) ? 'undefined' : (value > 0 ? '∞' : '−∞'), exponent: null };
  }
  const significant = useSig && isFinite(sig) ? sig : null;
  const rounded = significant ? roundToSig(value, significant) : value;
  if (rounded === 0) return { mantissa: '0', exponent: null };

  const magnitude = Math.floor(Math.log10(Math.abs(rounded)));
  const scientific = magnitude >= 7 || magnitude <= -5
    || (significant !== null && magnitude >= significant + 4);

  if (scientific) {
    const mantissa = rounded / Math.pow(10, magnitude);
    const places = significant !== null ? significant - 1 : null;
    return {
      mantissa: places !== null ? mantissa.toFixed(Math.max(0, Math.min(15, places))) : trim(mantissa),
      exponent: magnitude,
    };
  }
  if (significant !== null) {
    const places = Math.max(0, Math.min(15, significant - 1 - magnitude));
    return { mantissa: rounded.toFixed(places), exponent: null };
  }
  return { mantissa: trim(rounded), exponent: null };
}

function trim(x) {
  return String(parseFloat(x.toPrecision(10)));
}

export function plainText(raw, useSig) {
  const quantity = simplify(raw);
  const { mantissa, exponent } = formatNumber(displayValue(quantity), quantity.s, useSig);
  const number = exponent === null ? mantissa : `${mantissa}e${exponent}`;
  const unit = unitText(quantity);
  return unit ? `${number} ${unit}` : number;
}

export function sigNote(quantity, useSig) {
  if (!useSig) return '';
  if (!isFinite(quantity.s)) return 'exact';
  return `${quantity.s} s.f.`;
}
