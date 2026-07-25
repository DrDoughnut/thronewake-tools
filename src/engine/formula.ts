/**
 * A tiny arithmetic evaluator for user-entered formulas.
 *
 * Deliberately NOT `eval` / `new Function`: the expression box is
 * shareable through the URL, so a link from a stranger must not be able to
 * run code in your browser. This parser only ever produces numbers.
 *
 * Grammar (recursive descent, standard precedence):
 *
 *   expr    := term (('+' | '-') term)*
 *   term    := power (('*' | '/') power)*
 *   power   := unary ('^' power)?          -- right associative
 *   unary   := ('+' | '-') unary | primary
 *   primary := number | ident '(' args ')' | ident | '(' expr ')'
 */

export type Vars = Record<string, number>;

export const FUNCTIONS: Record<string, { arity: number | 'any'; fn: (...a: number[]) => number }> = {
  abs: { arity: 1, fn: Math.abs },
  sqrt: { arity: 1, fn: Math.sqrt },
  cbrt: { arity: 1, fn: Math.cbrt },
  round: { arity: 1, fn: Math.round },
  floor: { arity: 1, fn: Math.floor },
  ceil: { arity: 1, fn: Math.ceil },
  log: { arity: 1, fn: Math.log },
  log2: { arity: 1, fn: Math.log2 },
  log10: { arity: 1, fn: Math.log10 },
  pow: { arity: 2, fn: Math.pow },
  min: { arity: 'any', fn: Math.min },
  max: { arity: 'any', fn: Math.max },
};

export class FormulaError extends Error {}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: string };

const OPERATOR_ALIASES: Record<string, string> = {
  '·': '*', '×': '*', '⋅': '*',
  '÷': '/', '⁄': '/', ':': '/',
  '−': '-', '–': '-',
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const raw = input.slice(i, j);
      let value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new FormulaError(`“${raw}” is not a number I can read.`);
      }
      // `2k` = 2000, `2kk` = 2000000 — a convenience for cost thresholds.
      if (input.slice(j, j + 2).toLowerCase() === 'kk') { value *= 1e6; j += 2; }
      else if (input[j]?.toLowerCase() === 'k' && !/[a-z]/i.test(input[j + 1] ?? '')) {
        value *= 1e3; j += 1;
      }
      tokens.push({ kind: 'num', value });
      i = j;
      continue;
    }

    if (/[a-z_]/i.test(ch)) {
      let j = i;
      while (j < input.length && /[a-z0-9_]/i.test(input[j])) j++;
      tokens.push({ kind: 'ident', value: input.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }

    const op = OPERATOR_ALIASES[ch] ?? ch;
    if ('+-*/^(),'.includes(op)) {
      tokens.push({ kind: 'op', value: op });
      i++;
      continue;
    }

    throw new FormulaError(`I don’t know the symbol “${ch}”.`);
  }
  return tokens;
}

/** A parsed formula: evaluate it against any set of variables. */
export interface Formula {
  evaluate(vars: Vars): number;
  /** Variable names the expression actually reads. */
  variables: string[];
  source: string;
}

type Node = (vars: Vars) => number;

/**
 * Parse an expression. Throws `FormulaError` with a message meant for the
 * person typing, not for a log file.
 *
 * `known` is the set of legal variable names; anything else is rejected at
 * parse time rather than silently evaluating to NaN.
 */
export function parseFormula(source: string, known: readonly string[]): Formula {
  const trimmed = source.trim();
  if (!trimmed) throw new FormulaError('The formula is empty.');

  const tokens = tokenize(trimmed);
  const knownSet = new Set(known);
  const used = new Set<string>();
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const eatOp = (value: string): boolean => {
    const t = peek();
    if (t?.kind === 'op' && t.value === value) { pos++; return true; }
    return false;
  };
  const expectOp = (value: string) => {
    if (!eatOp(value)) throw new FormulaError(`Expected “${value}” here.`);
  };

  function parseExpr(): Node {
    let left = parseTerm();
    for (;;) {
      if (eatOp('+')) { const r = parseTerm(); const l = left; left = (v) => l(v) + r(v); }
      else if (eatOp('-')) { const r = parseTerm(); const l = left; left = (v) => l(v) - r(v); }
      else return left;
    }
  }

  function parseTerm(): Node {
    let left = parsePower();
    for (;;) {
      if (eatOp('*')) { const r = parsePower(); const l = left; left = (v) => l(v) * r(v); }
      else if (eatOp('/')) { const r = parsePower(); const l = left; left = (v) => l(v) / r(v); }
      else return left;
    }
  }

  function parsePower(): Node {
    const base = parseUnary();
    if (eatOp('^')) {
      const exp = parsePower(); // right associative
      return (v) => base(v) ** exp(v);
    }
    return base;
  }

  function parseUnary(): Node {
    if (eatOp('-')) { const inner = parseUnary(); return (v) => -inner(v); }
    if (eatOp('+')) return parseUnary();
    return parsePrimary();
  }

  function parsePrimary(): Node {
    const t = peek();
    if (!t) throw new FormulaError('The formula ends too early — something is missing.');

    if (t.kind === 'num') { pos++; return () => t.value; }

    if (t.kind === 'op' && t.value === '(') {
      pos++;
      const inner = parseExpr();
      expectOp(')');
      return inner;
    }

    if (t.kind === 'ident') {
      pos++;
      const name = t.value;

      if (eatOp('(')) {
        const def = FUNCTIONS[name];
        if (!def) throw new FormulaError(`“${name}” is not a function I know.`);
        const args: Node[] = [];
        if (!eatOp(')')) {
          do { args.push(parseExpr()); } while (eatOp(','));
          expectOp(')');
        }
        if (def.arity !== 'any' && args.length !== def.arity) {
          throw new FormulaError(
            `${name}() takes ${def.arity} argument${def.arity === 1 ? '' : 's'}, got ${args.length}.`,
          );
        }
        return (v) => def.fn(...args.map((a) => a(v)));
      }

      if (!knownSet.has(name)) {
        if (FUNCTIONS[name]) throw new FormulaError(`“${name}” is a function — write ${name}(…).`);
        throw new FormulaError(`I don’t know the name “${name}”.`);
      }
      used.add(name);
      return (v) => v[name];
    }

    throw new FormulaError(`“${t.value}” doesn’t belong here.`);
  }

  const root = parseExpr();
  if (pos < tokens.length) {
    const rest = tokens[pos];
    throw new FormulaError(`Unexpected “${rest.value}” — check your brackets and operators.`);
  }

  return {
    evaluate: (vars) => root(vars),
    variables: [...used],
    source: trimmed,
  };
}
