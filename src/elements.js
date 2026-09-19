// Standard atomic weights, in order of atomic number. Values in brackets in
// the IUPAC table (no stable isotope) are given as the longest-lived isotope.

export const ELEMENTS = [
  ['H', 'Hydrogen', 1.008], ['He', 'Helium', 4.0026],
  ['Li', 'Lithium', 6.94], ['Be', 'Beryllium', 9.0122],
  ['B', 'Boron', 10.81], ['C', 'Carbon', 12.011],
  ['N', 'Nitrogen', 14.007], ['O', 'Oxygen', 15.999],
  ['F', 'Fluorine', 18.998], ['Ne', 'Neon', 20.180],
  ['Na', 'Sodium', 22.990], ['Mg', 'Magnesium', 24.305],
  ['Al', 'Aluminium', 26.982], ['Si', 'Silicon', 28.085],
  ['P', 'Phosphorus', 30.974], ['S', 'Sulfur', 32.06],
  ['Cl', 'Chlorine', 35.45], ['Ar', 'Argon', 39.95],
  ['K', 'Potassium', 39.098], ['Ca', 'Calcium', 40.078],
  ['Sc', 'Scandium', 44.956], ['Ti', 'Titanium', 47.867],
  ['V', 'Vanadium', 50.942], ['Cr', 'Chromium', 51.996],
  ['Mn', 'Manganese', 54.938], ['Fe', 'Iron', 55.845],
  ['Co', 'Cobalt', 58.933], ['Ni', 'Nickel', 58.693],
  ['Cu', 'Copper', 63.546], ['Zn', 'Zinc', 65.38],
  ['Ga', 'Gallium', 69.723], ['Ge', 'Germanium', 72.630],
  ['As', 'Arsenic', 74.922], ['Se', 'Selenium', 78.971],
  ['Br', 'Bromine', 79.904], ['Kr', 'Krypton', 83.798],
  ['Rb', 'Rubidium', 85.468], ['Sr', 'Strontium', 87.62],
  ['Y', 'Yttrium', 88.906], ['Zr', 'Zirconium', 91.224],
  ['Nb', 'Niobium', 92.906], ['Mo', 'Molybdenum', 95.95],
  ['Tc', 'Technetium', 98], ['Ru', 'Ruthenium', 101.07],
  ['Rh', 'Rhodium', 102.91], ['Pd', 'Palladium', 106.42],
  ['Ag', 'Silver', 107.87], ['Cd', 'Cadmium', 112.41],
  ['In', 'Indium', 114.82], ['Sn', 'Tin', 118.71],
  ['Sb', 'Antimony', 121.76], ['Te', 'Tellurium', 127.60],
  ['I', 'Iodine', 126.90], ['Xe', 'Xenon', 131.29],
  ['Cs', 'Caesium', 132.91], ['Ba', 'Barium', 137.33],
  ['La', 'Lanthanum', 138.91], ['Ce', 'Cerium', 140.12],
  ['Pr', 'Praseodymium', 140.91], ['Nd', 'Neodymium', 144.24],
  ['Pm', 'Promethium', 145], ['Sm', 'Samarium', 150.36],
  ['Eu', 'Europium', 151.96], ['Gd', 'Gadolinium', 157.25],
  ['Tb', 'Terbium', 158.93], ['Dy', 'Dysprosium', 162.50],
  ['Ho', 'Holmium', 164.93], ['Er', 'Erbium', 167.26],
  ['Tm', 'Thulium', 168.93], ['Yb', 'Ytterbium', 173.05],
  ['Lu', 'Lutetium', 174.97], ['Hf', 'Hafnium', 178.49],
  ['Ta', 'Tantalum', 180.95], ['W', 'Tungsten', 183.84],
  ['Re', 'Rhenium', 186.21], ['Os', 'Osmium', 190.23],
  ['Ir', 'Iridium', 192.22], ['Pt', 'Platinum', 195.08],
  ['Au', 'Gold', 196.97], ['Hg', 'Mercury', 200.59],
  ['Tl', 'Thallium', 204.38], ['Pb', 'Lead', 207.2],
  ['Bi', 'Bismuth', 208.98], ['Po', 'Polonium', 209],
  ['At', 'Astatine', 210], ['Rn', 'Radon', 222],
  ['Fr', 'Francium', 223], ['Ra', 'Radium', 226],
  ['Ac', 'Actinium', 227], ['Th', 'Thorium', 232.04],
  ['Pa', 'Protactinium', 231.04], ['U', 'Uranium', 238.03],
  ['Np', 'Neptunium', 237], ['Pu', 'Plutonium', 244],
  ['Am', 'Americium', 243], ['Cm', 'Curium', 247],
  ['Bk', 'Berkelium', 247], ['Cf', 'Californium', 251],
  ['Es', 'Einsteinium', 252], ['Fm', 'Fermium', 257],
  ['Md', 'Mendelevium', 258], ['No', 'Nobelium', 259],
  ['Lr', 'Lawrencium', 266], ['Rf', 'Rutherfordium', 267],
  ['Db', 'Dubnium', 268], ['Sg', 'Seaborgium', 269],
  ['Bh', 'Bohrium', 270], ['Hs', 'Hassium', 269],
  ['Mt', 'Meitnerium', 278], ['Ds', 'Darmstadtium', 281],
  ['Rg', 'Roentgenium', 282], ['Cn', 'Copernicium', 285],
  ['Nh', 'Nihonium', 286], ['Fl', 'Flerovium', 289],
  ['Mc', 'Moscovium', 290], ['Lv', 'Livermorium', 293],
  ['Ts', 'Tennessine', 294], ['Og', 'Oganesson', 294],
];

export const BY_SYMBOL = new Map(
  ELEMENTS.map(([sym, name, mass], i) => [sym, { sym, name, mass, z: i + 1 }]),
);

// Where an element sits on the wall chart. Derived from atomic number rather
// than stored, so the table is the periodic law and not a picture of it.
export function placement(z) {
  if (z === 1) return { row: 1, col: 1 };
  if (z === 2) return { row: 1, col: 18 };
  if (z <= 10) return { row: 2, col: z <= 4 ? z - 2 : z + 8 };
  if (z <= 18) return { row: 3, col: z <= 12 ? z - 10 : z };
  if (z <= 36) return { row: 4, col: z - 18 };
  if (z <= 54) return { row: 5, col: z - 36 };
  if (z <= 56) return { row: 6, col: z - 54 };
  if (z <= 71) return { row: 8, col: z - 54 };  // lanthanides
  if (z <= 86) return { row: 6, col: z - 68 };
  if (z <= 88) return { row: 7, col: z - 86 };
  if (z <= 103) return { row: 9, col: z - 86 }; // actinides
  return { row: 7, col: z - 100 };
}

// Blocks are read off the same numbers, so nothing is hand-assigned.
export function block(z) {
  const { row, col } = placement(z);
  if (row >= 8) return 'f';
  if (z === 2) return 's';
  if (col <= 2) return 's';
  if (col >= 13) return 'p';
  return 'd';
}
