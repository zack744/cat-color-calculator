/** Client-side Mendelian cat color genetics (B / A / O / D). */

export type Sex = 'M' | 'F';
export type ParentGenes = { B: string; A: string; O: string; D: string };
export type Outcome = { color: string; probability: number; genotype: string; sex?: Sex };

function isDominantPhenotype(g: string): boolean {
  return g.endsWith('_') || g === 'B_' || g === 'A_' || g === 'D_';
}

/** Autosomal locus: dominant phenotype vs recessive genotype. */
export function autosomalProbs(s: string, d: string): Record<string, number> {
  if (s === d) return { [s]: 1 };
  const sDom = isDominantPhenotype(s);
  const dDom = isDominantPhenotype(d);
  if (sDom && dDom) return { [s]: 1 };
  if (!sDom && !dDom) return { [s]: 0.5, [d]: 0.5 };
  // dominant x recessive → 50% dominant phenotype, 50% recessive
  return { [s]: 0.5, [d]: 0.5 };
}

/** X-linked Orange: sire is OO or oo (male), dam OO/Oo/oo. */
export function xLinkedOOutcomes(
  sire: string,
  dam: string,
): { genotype: string; prob: number; sex: Sex }[] {
  const out: { genotype: string; prob: number; sex: Sex }[] = [];
  const damAlleles: ('O' | 'o')[] =
    dam === 'OO' ? ['O'] : dam === 'oo' ? ['o'] : ['O', 'o']; // Oo or unknown
  const sireX: 'O' | 'o' = sire === 'OO' ? 'O' : 'o';

  for (const x of damAlleles) {
    const p = 0.5 / damAlleles.length;
    // sons get Y from sire + X from dam
    out.push({ genotype: x === 'O' ? 'OO' : 'oo', prob: p, sex: 'M' });
    // daughters get X from sire + X from dam
    let alleles: string;
    if (sireX === 'O' && x === 'O') alleles = 'OO';
    else if (sireX === 'o' && x === 'o') alleles = 'oo';
    else alleles = 'Oo';
    out.push({ genotype: alleles, prob: p, sex: 'F' });
  }
  return out;
}

function baseName(B: string, dilute: boolean): string {
  if (B === 'bb') return dilute ? 'Lilac' : 'Chocolate';
  if (B === 'blbl') return dilute ? 'Fawn' : 'Cinnamon';
  return dilute ? 'Blue' : 'Black';
}

export function mapToColor(B: string, A: string, O: string, D: string, sex: Sex): string {
  const isTabby = A === 'A_';
  const isDilute = D === 'dd';
  const hasOrange = O !== 'oo';

  if (hasOrange) {
    // Full orange (male O, or female OO)
    if (sex === 'M' || O === 'OO') {
      if (isTabby) return isDilute ? 'Cream Tabby' : 'Red Tabby';
      return isDilute ? 'Cream' : 'Red';
    }
    // Tortie / Torbie (female Oo)
    const base = baseName(B, isDilute);
    if (isTabby) {
      if (isDilute) return base === 'Blue' ? 'Blue-Cream Torbie' : `${base}-Cream Torbie`;
      return base === 'Black' ? 'Brown Torbie' : `${base} Torbie`;
    }
    if (isDilute) return base === 'Blue' ? 'Blue-Cream' : `${base}-Cream`;
    return base === 'Black' ? 'Tortoiseshell' : `${base} Tortie`;
  }

  const base = baseName(B, isDilute);
  if (isTabby) return base === 'Black' ? 'Brown Tabby' : `${base} Tabby`;
  return base === 'Black' ? 'Black' : base;
}

export function calculateKittenColors(sire: ParentGenes, dam: ParentGenes): Outcome[] {
  const bProbs = autosomalProbs(sire.B, dam.B);
  const aProbs = autosomalProbs(sire.A, dam.A);
  const dProbs = autosomalProbs(sire.D, dam.D);
  const oOutcomes = xLinkedOOutcomes(sire.O, dam.O);

  const all: Outcome[] = [];
  for (const [b, pB] of Object.entries(bProbs)) {
    for (const [a, pA] of Object.entries(aProbs)) {
      for (const [d, pD] of Object.entries(dProbs)) {
        for (const o of oOutcomes) {
          const p = pB * pA * pD * o.prob;
          if (p < 1e-6) continue;
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
    const key = `${r.color}|${r.sex ?? ''}`;
    const ex = agg.get(key);
    if (ex) ex.probability += r.probability;
    else agg.set(key, { ...r });
  }

  return Array.from(agg.values())
    .filter((r) => r.probability > 0.005)
    .sort((a, b) => b.probability - a.probability);
}
