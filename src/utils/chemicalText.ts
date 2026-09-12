/** 通常文中の化学式だけを装飾する。元の文字列・採点値は変更しない。 */
export interface ChemicalPart { text: string; script?: 'sub' | 'sup' }
const elements = new Set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' '));
const candidate = /(?:\d+(?:\.\d+)?)?(?:[A-Z][a-z]?\d*|[([]|[)\]]\d*)+(?:\^(?:\{\d*[+−-]\}|\d*[+−-])|[+−-](?![A-Za-z0-9>]))?/g;
function formulaParts(value: string): ChemicalPart[] | null {
  const explicit = value.match(/\^(?:\{(\d*[+−-])\}|(\d*[+−-]))$/);
  const bare = !explicit && value.match(/[+−-]$/);
  const charge = explicit?.[1] || explicit?.[2] || (bare ? bare[0] : '');
  let body = value.slice(0, value.length - (explicit?.[0].length || (bare ? 1 : 0)));
  const coefficient = body.match(/^\d+(?:\.\d+)?/)?.[0] || '';
  body = body.slice(coefficient.length);
  // Fe3+ は単原子イオン。NH4+ の4は組成数として維持する。
  const mono = bare && body.match(/^([A-Z][a-z]?)(\d+)$/);
  let finalCharge = charge;
  if (mono) { body = mono[1]; finalCharge = mono[2] + charge; }
  const tokens = body.match(/[A-Z][a-z]?|\d+|[()[\]]/g) || [];
  if (tokens.join('') !== body) return null;
  const stack: string[] = [];
  let atomCount = 0;
  const parts: ChemicalPart[] = coefficient ? [{ text: coefficient }] : [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^[A-Z]/.test(token)) {
      if (!elements.has(token)) return null;
      atomCount++;
    } else if (token === '(' || token === '[') stack.push(token);
    else if (token === ')' || token === ']') {
      if (stack.pop() !== (token === ')' ? '(' : '[') || !i || /[([]/.test(tokens[i - 1])) return null;
    } else if (!i || !(/[A-Za-z)\]]$/.test(tokens[i - 1]))) return null;
    parts.push({ text: token, ...(/^\d+$/.test(token) ? { script: 'sub' as const } : {}) });
  }
  if (!atomCount || stack.length) return null;
  if (finalCharge) parts.push({ text: finalCharge, script: 'sup' });
  return parts;
}
export function splitChemicalText(text: string): ChemicalPart[] {
  const out: ChemicalPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(candidate)) {
    const start = match.index!;
    const end = start + match[0].length;
    // 英単語・識別子の一部や既存Unicode添字は加工しない。
    if (/[A-Za-z0-9_₀-₉⁰-⁹]/.test(text[start - 1] || '') || /[A-Za-z0-9_₀-₉⁰-⁹]/.test(text[end] || '')) continue;
    const parts = formulaParts(match[0]);
    if (!parts) continue;
    if (cursor < start) out.push({ text: text.slice(cursor, start) });
    out.push(...parts);
    cursor = end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}
