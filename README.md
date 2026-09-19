# Bench

A chemistry calculator that works the way the browser console does: type an
expression, get an answer, and anything you name with `=` stays available on
every line below it. On top of that it carries units through the arithmetic,
reads chemical formulas, and tracks significant figures.

## Running it

```
python3 serve.py
```

Then open <http://localhost:4173>. It is plain ES modules with no build step,
so it needs to be served rather than opened from the filesystem. `serve.py` is
the standard library server with caching switched off, so edits show up on
reload. The sheet is kept in localStorage and comes back when you return.

## How it is put together

There is one basic piece, a **quantity**: a number, a dimension, the units it
was written in, and a count of significant figures. Units, constants, molar
masses, variables and results are all quantities in one namespace, and differ
only in where they came from.

There is one other piece, an **entry**: a line of source that produces a
quantity. Variables are what entries leave behind. The empty line at the
bottom is not a separate composer, it is the last entry with nothing in it
yet, so editing an old line and typing a new one are the same operation and
the sheet re-runs from the top either way.

| file | what it holds |
| --- | --- |
| `src/quantity.js` | the quantity, its arithmetic, and the significant-figure rules |
| `src/units.js` | units, SI prefixes and constants |
| `src/elements.js` | atomic weights, and where each element sits on the wall chart |
| `src/formula.js` | reads `Ca(OH)2` and `CuSO4·5H2O` into element counts |
| `src/lexer.js`, `src/parser.js` | tokens and expressions |
| `src/evaluate.js` | name resolution, operators, functions |
| `src/format.js` | choosing the unit to show and how many digits |
| `src/session.js` | running the sheet, storage, line references |
| `src/ui.js` | the sheet on screen |
