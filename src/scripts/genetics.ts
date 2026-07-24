/** Mendelian cat coat color (B series, A, D, O/X). Carrier-aware. */

export type Sex = 'M' | 'F';

export type BKey = 'BB' | 'Bb' | 'Bbl' | 'bb' | 'bbl' | 'blbl';
export type AKey = 'AA' | 'Aa' | 'aa';
export type DKey = 'DD' | 'Dd' | 'dd';
export type OKey = 'OY' | 'oY' | 'OO' | 'Oo' | 'oo';

export type ParentGenes = { B: BKey; A: AKey; O: OKey; D: DKey };
export type Outcome = { color: string; probability: number; genotype: string; sex: Sex };

const B_RANK: Record<string, number> = { B: 3, b: 2, bl: 1 };

function parseB(g: BKey): [string, string] {
  const map: Record<BKey, [string, string]> = {
    BB: ['B', 'B'],
    Bb: ['B', 'b'],
    Bbl: ['B', 'bl'],
    bb: ['b', 'b'],
    bbl: ['b', 'bl'],
    blbl: ['bl', 'bl'],
  };
  return map[g];
}

function parseA(g: AKey): [string, string] {
  if (g === 'AA') return ['A', 'A'];
  if (g === 'Aa') return ['A', 'a'];
  return ['a', 'a'];
}

function parseD(g: DKey): [string, string] {
  if (g === 'DD') return ['D', 'D'];
  if (g === 'Dd') return ['D', 'd'];
  return ['d', 'd'];
}

function gametes(alleles: [string, string]): Record<string, number> {
  if (alleles[0] === alleles[1]) return { [alleles[0]]: 1 };
  return { [alleles[0]]: 0.5, [alleles[1]]: 0.5 };
}

function combineAD(sireA: [string, string], damA: [string, string], dom: string, rec: string): Record<string, number> {
  const sg = gametes(sireA);
  const dg = gametes(damA);
  const out: Record<string, number> = {};
  for (const [a, pa] of Object.entries(sg)) {
    for (const [b, pb] of Object.entries(dg)) {
      let k: string;
      if (a === dom && b === dom) k = dom + dom;
      else if (a === rec && b === rec) k = rec + rec;
      else k = dom + rec;
      out[k] = (out[k] ?? 0) + pa * pb;
    }
  }
  return out;
}

function combineB(sire: BKey, dam: BKey): Record<string, number> {
  const sg = gametes(parseB(sire));
  const dg = gametes(parseB(dam));
  const out: Record<string, number> = {};
  for (const [a, pa] of Object.entries(sg)) {
    for (const [b, pb] of Object.entries(dg)) {
      const pair = [a, b].sort((x, y) => (B_RANK[y] ?? 0) - (B_RANK[x] ?? 0));
      let k: string;
      if (pair[0] === 'B' && pair[1] === 'B') k = 'BB';
      else if (pair[0] === 'B' && pair[1] === 'b') k = 'Bb';
      else if (pair[0] === 'B' && pair[1] === 'bl') k = 'Bbl';
      else if (pair[0] === 'b' && pair[1] === 'b') k = 'bb';
      else if (pair[0] === 'b' && pair[1] === 'bl') k = 'bbl';
      else k = 'blbl';
      out[k] = (out[k] ?? 0) + pa * pb;
    }
  }
  return out;
}

function bPhenotype(g: string): 'black' | 'chocolate' | 'cinnamon' {
  if (g.startsWith('B')) return 'black';
  if (g === 'bb' || g === 'bbl') return 'chocolate';
  return 'cinnamon';
}

function baseName(bClass: 'black' | 'chocolate' | 'cinnamon', dilute: boolean): string {
  if (bClass === 'chocolate') return dilute ? 'Lilac' : 'Chocolate';
  if (bClass === 'cinnamon') return dilute ? 'Fawn' : 'Cinnamon';
  return dilute ? 'Blue' : 'Black';
}

export function mapToColor(B: string, A: string, O: string, D: string, sex: Sex): string {
  const isTabby = A === 'AA' || A === 'Aa';
  const isDilute = D === 'dd';
  const bClass = bPhenotype(B);

  const fullOrange = (sex === 'M' && O === 'OY') || (sex === 'F' && O === 'OO');
  const tortie = sex === 'F' && O === 'Oo';

  if (fullOrange) {
    return isTabby ? (isDilute ? 'Cream Tabby' : 'Red Tabby') : isDilute ? 'Cream' : 'Red';
  }

  if (tortie) {
    const base = baseName(bClass, isDilute);
    if (isTabby) {
      if (isDilute) return base === 'Blue' ? 'Blue-Cream Torbie' : `${base}-Cream Torbie`;
      return base === 'Black' ? 'Brown Torbie' : `${base} Torbie`;
    }
    if (isDilute) return base === 'Blue' ? 'Blue-Cream' : `${base}-Cream`;
    return base === 'Black' ? 'Tortoiseshell' : `${base} Tortie`;
  }

  const base = baseName(bClass, isDilute);
  if (isTabby) return base === 'Black' ? 'Brown Tabby' : `${base} Tabby`;
  return base === 'Black' ? 'Black' : base;
}

export function xLinkedOOutcomes(
  sire: OKey,
  dam: OKey,
): { genotype: string; prob: number; sex: Sex }[] {
  const sireX: 'O' | 'o' = sire === 'OY' ? 'O' : 'o';
  const damAlleles: ('O' | 'o')[] =
    dam === 'OO' ? ['O', 'O'] : dam === 'oo' ? ['o', 'o'] : ['O', 'o'];

  const out: { genotype: string; prob: number; sex: Sex }[] = [];
  for (const x of damAlleles) {
    const p = 0.5 / damAlleles.length;
    out.push({ genotype: x === 'O' ? 'OY' : 'oY', prob: p, sex: 'M' });
    let alleles: string;
    if (sireX === 'O' && x === 'O') alleles = 'OO';
    else if (sireX === 'o' && x === 'o') alleles = 'oo';
    else alleles = 'Oo';
    out.push({ genotype: alleles, prob: p, sex: 'F' });
  }
  return out;
}

export function calculateKittenColors(sire: ParentGenes, dam: ParentGenes): Outcome[] {
  const bProbs = combineB(sire.B, dam.B);
  const aProbs = combineAD(parseA(sire.A), parseA(dam.A), 'A', 'a');
  const dProbs = combineAD(parseD(sire.D), parseD(dam.D), 'D', 'd');
  const oOutcomes = xLinkedOOutcomes(sire.O, dam.O);

  const all: Outcome[] = [];
  for (const [b, pB] of Object.entries(bProbs)) {
    for (const [a, pA] of Object.entries(aProbs)) {
      for (const [d, pD] of Object.entries(dProbs)) {
        for (const o of oOutcomes) {
          const p = pB * pA * pD * o.prob;
          if (p < 1e-9) continue;
          all.push({
            color: mapToColor(b, a, o.genotype, d, o.sex),
            probability: p,
            genotype: `${b} ${a} ${o.genotype} ${d}`,
            sex: o.sex,
          });
        }
      }
    }
  }

  const agg = new Map<string, Outcome>();
  for (const r of all) {
    const key = `${r.color}|${r.sex}`;
    const ex = agg.get(key);
    if (ex) ex.probability += r.probability;
    else agg.set(key, { ...r });
  }

  return Array.from(agg.values())
    .filter((r) => r.probability > 1e-6)
    .sort((a, b) => b.probability - a.probability);
}

export function colorSwatch(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('tort') || n.includes('torb') || n.includes('blue-cream')) return '#a67c52';
  if (n.includes('cream')) return '#e8c98a';
  if (n.includes('red')) return '#d97706';
  if (n.includes('blue')) return '#6b7c8a';
  if (n.includes('lilac')) return '#b8a0b8';
  if (n.includes('chocolate')) return '#6b3a2a';
  if (n.includes('cinnamon') || n.includes('fawn')) return '#c4a484';
  if (n.includes('brown') || n.includes('tabby')) return '#8b5a2b';
  if (n.includes('black')) return '#2a2a2a';
  return '#8d4b00';
}
