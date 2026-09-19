// The sheet on screen. Every line is the same thing: a source box, its result
// and what its names turned out to mean. The empty line at the bottom is not a
// special composer, it is simply the last line with nothing in it yet.

import { run, load, save, removeLine } from './session.js';
import {
  simplify, displayValue, formatNumber, unitHtml, plainText,
} from './format.js';
import { ELEMENTS, BY_SYMBOL, placement, block } from './elements.js';
import { CONSTANTS, UNIT_NAMES } from './units.js';
import { FUNCTIONS } from './evaluate.js';

const STARTER = [
  '// Anything you name with = stays available on every line below.',
  'm = 4.50 g',
  'n = m / NaCl',
  'n in mmol',
  '',
  '// Units travel with the numbers, and convert with "in".',
  '(1.00 atm * 2.50 L) / (R * 298 K) in mmol',
  'p(2.5e-4 M)',
  '',
];

const sheet = document.getElementById('sheet');
const hint = document.getElementById('hint');
const varsBox = document.getElementById('vars');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const toastAction = document.getElementById('toastAction');
const sigfigsBox = document.getElementById('sigfigs');

const saved = load();
const state = {
  sources: saved ? saved.sources : STARTER.slice(),
  useSig: saved ? saved.useSig !== false : true,
};
if (!state.sources.length) state.sources = [''];

let rows = [];
let focused = null;
let undoStack = [];

/* building a line --------------------------------------------------------- */

const escape = (text) => String(text).replace(/[&<>]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]
));

function buildRow(source) {
  const li = document.createElement('li');
  li.className = 'entry';
  li.innerHTML = `
    <span class="line-no"></span>
    <textarea class="source" rows="1" spellcheck="false"
      autocapitalize="off" autocorrect="off"></textarea>
    <button type="button" class="tag"></button>
    <div class="value"></div>
    <div class="unit"></div>
    <button type="button" class="remove" title="Delete this line">&times;</button>
    <div class="meta"></div>`;

  const row = {
    li,
    number: li.querySelector('.line-no'),
    source: li.querySelector('.source'),
    tag: li.querySelector('.tag'),
    value: li.querySelector('.value'),
    unit: li.querySelector('.unit'),
    meta: li.querySelector('.meta'),
  };
  row.source.value = source;

  // A half-typed line is not wrong yet, so its errors wait until the person
  // leaves it or presses Return. Results still appear as soon as they exist.
  row.source.addEventListener('input', () => {
    state.sources[indexOf(row)] = row.source.value;
    row.typing = true;
    recall.index = null;
    autosize(row.source);
    refresh();
  });
  row.source.addEventListener('focus', () => { focused = row; recall.index = null; });
  row.source.addEventListener('blur', () => {
    if (!row.typing) return;
    row.typing = false;
    refresh();
  });
  row.source.addEventListener('keydown', (event) => onKey(event, row));
  li.querySelector('.remove').addEventListener('click', () => deleteLine(indexOf(row)));
  row.value.addEventListener('click', () => copyResult(row));
  row.tag.addEventListener('click', () => insertText(row.tag.textContent));
  row.number.addEventListener('click', () => focusLine(indexOf(row)));

  return row;
}

const indexOf = (row) => rows.indexOf(row);

function autosize(area) {
  area.style.height = 'auto';
  area.style.height = `${Math.max(26, area.scrollHeight)}px`;
}

// Heights depend on how wide the column ends up, which is not known until the
// sheet has been laid out, so they are taken again once it has.
function autosizeAll() {
  rows.forEach((row) => autosize(row.source));
}

/* keyboard ---------------------------------------------------------------- */

// The bottom line is the prompt, and on it the arrow keys walk back through
// earlier lines the way a console does. Everything above it is edited in
// place instead, so there the arrows move between lines.
const recall = { index: null, draft: '' };

function onKey(event, row) {
  const index = indexOf(row);
  const area = row.source;
  const last = index === rows.length - 1;

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    recall.index = null;
    if (state.sources[index + 1] === '') focusLine(index + 1);
    else {
      state.sources.splice(index + 1, 0, '');
      draw();
      focusLine(index + 1);
    }
    return;
  }

  if (last && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    event.preventDefault();
    recallLine(row, event.key === 'ArrowUp' ? -1 : 1);
    return;
  }

  if (event.key === 'Backspace' && area.value === '' && state.sources.length > 1) {
    event.preventDefault();
    state.sources.splice(index, 1);
    draw();
    focusLine(Math.max(0, index - 1));
    return;
  }

  if (event.key === 'ArrowUp' && area.selectionStart === 0 && index > 0) {
    event.preventDefault();
    focusLine(index - 1);
    return;
  }

  if (event.key === 'ArrowDown' && area.selectionStart === area.value.length
      && index < rows.length - 1) {
    event.preventDefault();
    focusLine(index + 1);
  }
}

function recallLine(row, step) {
  const earlier = state.sources.slice(0, indexOf(row)).filter((s) => s.trim());
  if (!earlier.length) return;
  if (recall.index === null) {
    if (step > 0) return;
    recall.draft = row.source.value;
    recall.index = earlier.length - 1;
  } else {
    recall.index += step;
  }
  let text;
  if (recall.index < 0) { recall.index = 0; return; }
  if (recall.index >= earlier.length) { recall.index = null; text = recall.draft; }
  else text = earlier[recall.index];
  row.source.value = text;
  state.sources[indexOf(row)] = text;
  row.typing = true;
  autosize(row.source);
  refresh();
  row.source.setSelectionRange(text.length, text.length);
}

function focusLine(index) {
  const row = rows[index];
  if (!row) return;
  row.source.focus();
  const at = row.source.value.length;
  row.source.setSelectionRange(at, at);
  focused = row;
}

/* drawing ----------------------------------------------------------------- */

function draw() {
  sheet.textContent = '';
  rows = state.sources.map((source) => {
    const row = buildRow(source);
    sheet.appendChild(row.li);
    return row;
  });
  autosizeAll();
  refresh();
  requestAnimationFrame(autosizeAll);
}

function refresh() {
  const { results, vars } = run(state.sources);
  results.forEach((result, i) => paint(rows[i], result, i));
  paintVars(vars);
  hint.hidden = state.sources.filter((s) => s.trim()).length > 2;
  save(state);
}

function paint(row, result, index) {
  row.number.textContent = index + 1;
  row.li.classList.toggle('is-note', result.kind === 'note');

  // A value is also a name, and the name sits beside it.
  const named = result.kind === 'value';
  row.tag.textContent = named ? `#${index + 1}` : '';
  row.tag.hidden = !named;
  row.tag.title = named ? `Click to use #${index + 1}` : '';

  if (result.kind === 'value') {
    const shown = simplify(result.quantity);
    const { mantissa, exponent } = formatNumber(
      displayValue(shown), shown.s, state.useSig,
    );
    row.value.className = 'value';
    row.value.innerHTML = escape(mantissa)
      + (exponent === null ? '' : `&thinsp;×10<sup>${exponent}</sup>`);
    row.value.title = 'Click to copy';
    row.value.dataset.copy = plainText(result.quantity, state.useSig);
    row.unit.innerHTML = unitHtml(shown);
  } else {
    row.value.className = 'value';
    row.value.textContent = '';
    row.value.title = '';
    delete row.value.dataset.copy;
    row.unit.textContent = '';
  }

  row.meta.innerHTML = metaHtml(result, row.typing);
}

// Only the names that could have meant something else are worth reporting.
// K is worth a word; mol is not.
const contested = (name) => BY_SYMBOL.has(name) || Boolean(CONSTANTS[name]);

function metaHtml(result, typing) {
  const parts = [];
  if (result.kind === 'error' && !typing) {
    parts.push(`<span class="error">${escape(result.error)}</span>`);
  }
  if (result.kind === 'value' && state.useSig) {
    parts.push(`<span class="sig">${
      isFinite(result.quantity.s) ? `${result.quantity.s} s.f.` : 'exact'
    }</span>`);
  }
  (result.notes || []).forEach((note) => {
    const worth = note.kind === 'constant' || note.kind === 'formula'
      || (note.kind === 'unit' && contested(note.name))
      || note.kind === undefined;
    if (worth) parts.push(`<span><b>${escape(note.name)}</b> ${escape(note.about)}</span>`);
  });
  return parts.join('');
}

function paintVars(vars) {
  const named = [...vars.entries()].filter(([name]) => name !== '_');
  varsBox.textContent = '';
  if (!named.length) {
    varsBox.innerHTML = '<p class="empty">Nothing yet. Write <code>x = 2 mol</code>.</p>';
    return;
  }
  named.forEach(([name, quantity]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'var';
    button.innerHTML = `<span class="name">${escape(name)}</span>`
      + `<span class="value">${escape(plainText(quantity, state.useSig))}</span>`;
    button.title = 'Go to the line that sets it';
    button.addEventListener('click', () => revealDefinition(name));
    varsBox.appendChild(button);
  });
}

function revealDefinition(name) {
  const index = state.sources.findIndex(
    (source) => new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`).test(source),
  );
  if (index < 0) return;
  const row = rows[index];
  row.li.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.li.classList.add('flash');
  setTimeout(() => row.li.classList.remove('flash'), 900);
}

/* changes that need taking back ------------------------------------------- */

function remember() {
  undoStack.push(state.sources.slice());
  if (undoStack.length > 40) undoStack.shift();
}

function deleteLine(index) {
  remember();
  const next = removeLine(state.sources, index);
  state.sources = next.length ? next : [''];
  draw();
  showToast(`Deleted line ${index + 1}.`);
}

function clearSheet() {
  remember();
  state.sources = [''];
  draw();
  showToast('Cleared the sheet.');
  focusLine(0);
}

function undo() {
  if (!undoStack.length) return;
  state.sources = undoStack.pop();
  draw();
  hideToast();
}

let toastTimer = null;
function showToast(text) {
  toastText.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 12000);
}
const hideToast = () => { toast.hidden = true; };

toastAction.addEventListener('click', undo);
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !toast.hidden) {
    event.preventDefault();
    undo();
  }
});

/* copying ----------------------------------------------------------------- */

function copyResult(row) {
  const text = row.value.dataset.copy;
  if (!text) return;
  navigator.clipboard?.writeText(text).then(
    () => showToastBriefly(`Copied ${text}`),
    () => {},
  );
}

function showToastBriefly(text) {
  toastText.textContent = text;
  toastAction.hidden = true;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; toastAction.hidden = false; }, 2200);
}

/* the wall chart ---------------------------------------------------------- */

const readout = document.getElementById('ptableReadout');

function buildTable() {
  const table = document.getElementById('ptable');
  const gap = document.createElement('div');
  gap.className = 'gap';
  gap.style.gridRow = 8;
  table.appendChild(gap);
  ELEMENTS.forEach(([symbol, name, mass], i) => {
    const z = i + 1;
    const spot = placement(z);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `el ${block(z)}`;
    cell.textContent = symbol;
    cell.style.gridColumn = spot.col;
    cell.style.gridRow = spot.row >= 8 ? spot.row + 1 : spot.row;
    const label = `${symbol} · ${name} · ${mass} g/mol · Z ${z}`;
    cell.title = label;
    cell.addEventListener('mouseenter', () => { readout.textContent = label; });
    cell.addEventListener('focus', () => { readout.textContent = label; });
    cell.addEventListener('click', () => insertText(symbol));
    table.appendChild(cell);
  });
}

function insertText(text) {
  const row = focused || rows[rows.length - 1];
  const area = row.source;
  const at = area.selectionStart ?? area.value.length;
  area.value = area.value.slice(0, at) + text + area.value.slice(area.selectionEnd ?? at);
  state.sources[indexOf(row)] = area.value;
  row.typing = true;
  autosize(area);
  refresh();
  area.focus();
  area.setSelectionRange(at + text.length, at + text.length);
}

/* reference --------------------------------------------------------------- */

function buildReference() {
  const box = document.getElementById('reference');
  const list = (pairs) => `<dl>${pairs
    .map(([term, meaning]) => `<dt>${escape(term)}</dt><dd>${escape(meaning)}</dd>`)
    .join('')}</dl>`;

  const functions = Object.entries(FUNCTIONS)
    .map(([name, fn]) => [`${name}()`, fn.about]);

  const constants = Object.entries(CONSTANTS)
    .filter(([name]) => name !== 'π')
    .map(([name, c]) => [name, c.about]);

  box.innerHTML = `
    <div>
      <h3>Writing</h3>
      ${list([
        ['2.50 g', 'a space means multiply, so this is 2.50 grams'],
        ['m / 2 mol', 'juxtaposition binds first: this is m / (2 mol)'],
        ['x = 3.0 L', 'names anything, and it stays set below'],
        ['#4', 'the value on line 4; each one is labelled'],
        ['_', 'the result of the line above'],
        ['↑ ↓', 'on the bottom line, bring back earlier lines'],
        ['NaCl', 'a formula gives its molar mass'],
        ['mw(K)', 'molar mass when the symbol is a unit too'],
        ['250 mL in L', 'shows the same value another way'],
        ['// a note', 'a line that is only for you'],
      ])}
    </div>
    <div>
      <h3>When names collide</h3>
      <p>A name is looked up in this order: what you set on this sheet, then a
      constant, then a unit, then a chemical formula. So <code>K</code> is
      kelvin and <code>F</code> is the Faraday constant, and
      <code>mw(K)</code> gets you potassium. Setting a name of your own takes
      it back: <code>V = 250 mL</code> makes V your volume rather than the
      volt. Every line says underneath it which meaning it used.</p>
    </div>
    <div>
      <h3>Significant figures</h3>
      <p>A whole number with no decimal point is a count, and counts are exact.
      Write 2.0 rather than 2 when you mean two figures. Multiplying keeps the
      fewest figures, adding keeps the fewest decimal places, and a logarithm
      keeps as many decimals as its input had figures.</p>
    </div>
    <div>
      <h3>Functions</h3>
      ${list(functions)}
    </div>
    <div>
      <h3>Constants</h3>
      ${list(constants)}
    </div>
    <div>
      <h3>Units</h3>
      <p>${Object.keys(UNIT_NAMES).join(', ')}, each with the usual SI prefixes
      (mL, mmol, kPa, nm). A name you set yourself takes precedence over a unit
      of the same name.</p>
    </div>`;
}

/* start ------------------------------------------------------------------- */

sigfigsBox.checked = state.useSig;
sigfigsBox.addEventListener('change', () => {
  state.useSig = sigfigsBox.checked;
  refresh();
});
document.getElementById('clear').addEventListener('click', clearSheet);

window.addEventListener('resize', autosizeAll);
window.addEventListener('load', autosizeAll);
document.fonts?.ready.then(autosizeAll);

buildTable();
buildReference();
draw();
focusLine(state.sources.length - 1);
