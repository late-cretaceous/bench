// Expressions, with two habits borrowed from how chemistry is written down:
// juxtaposition means multiply (2 g), and it binds tighter than an explicit
// slash, so 2 g / 3 mol reads as (2 g) / (3 mol).

import { lex } from './lexer.js';

export function parse(input) {
  const tokens = lex(input);
  let p = 0;

  const peek = (k = 0) => tokens[p + k];
  const at = (t, text) => peek().t === t && (text === undefined || peek().text === text);
  const next = () => tokens[p++];
  const expect = (text) => {
    if (!at('op', text)) throw new Error(`expected "${text}"`);
    return next();
  };

  function statement() {
    if (at('name') && peek(1).t === 'op' && peek(1).text === '=') {
      const name = next().text;
      next();
      const value = expression();
      done();
      return { t: 'assign', name, value };
    }
    const value = expression();
    done();
    return value;
  }

  const done = () => {
    if (!at('end')) throw new Error(`unexpected "${peek().text}"`);
  };

  function expression() {
    let left = additive();
    while (peek().t === 'keyword') {
      next();
      left = { t: 'convert', value: left, unit: additive() };
    }
    return left;
  }

  function additive() {
    let left = multiplicative();
    while (at('op', '+') || at('op', '-')) {
      const op = next().text;
      left = { t: 'binary', op, a: left, b: multiplicative() };
    }
    return left;
  }

  function multiplicative() {
    let left = juxtaposed();
    while (at('op', '*') || at('op', '/') || at('op', '·') || at('op', '×') || at('op', '÷')) {
      const op = next().text;
      const norm = op === '/' || op === '÷' ? '/' : '*';
      left = { t: 'binary', op: norm, a: left, b: juxtaposed() };
    }
    return left;
  }

  const startsValue = () => {
    const tok = peek();
    if (tok.t === 'num' || tok.t === 'name' || tok.t === 'ref') return true;
    return tok.t === 'op' && tok.text === '(';
  };

  function juxtaposed() {
    let left = unary();
    while (startsValue()) {
      left = { t: 'binary', op: '*', implicit: true, a: left, b: unary() };
    }
    return left;
  }

  function unary() {
    if (at('op', '-')) { next(); return { t: 'negate', value: unary() }; }
    if (at('op', '+')) { next(); return unary(); }
    return power();
  }

  function power() {
    const base = postfix();
    if (at('op', '^') || at('op', '**')) {
      next();
      return { t: 'binary', op: '^', a: base, b: unary() };
    }
    return base;
  }

  function postfix() {
    let value = primary();
    while (at('op', '%')) { next(); value = { t: 'percent', value }; }
    return value;
  }

  function primary() {
    const tok = peek();
    if (tok.t === 'num') { next(); return { t: 'number', value: tok.value, sig: tok.sig, text: tok.text }; }
    if (tok.t === 'ref') { next(); return { t: 'ref', line: tok.line, text: tok.text }; }
    if (tok.t === 'name') {
      next();
      // A bracket touching the name is a call; a space before it is a product.
      if (at('op', '(') && !peek().spaced) {
        next();
        const args = [];
        if (!at('op', ')')) {
          args.push(expression());
          while (at('op', ',')) { next(); args.push(expression()); }
        }
        expect(')');
        return { t: 'call', name: tok.text, args };
      }
      return { t: 'name', name: tok.text };
    }
    if (at('op', '(')) {
      next();
      const value = expression();
      expect(')');
      return value;
    }
    if (tok.t === 'end') throw new Error('the line stops early');
    throw new Error(`unexpected "${tok.text}"`);
  }

  return statement();
}
