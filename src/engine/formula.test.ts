import { describe, expect, it } from 'vitest';
import { FormulaError, parseFormula } from './formula';
import { STAT_VARIABLES } from './value';

const vars = { v: 6, a: 70, di: 40, dc: 25, s: 35, ds: 20, c: 50, cu: 1, t: 0.5, tc: 600 };
const evalOf = (src: string) => parseFormula(src, STAT_VARIABLES).evaluate(vars);

describe('formula parser', () => {
  it('respects operator precedence', () => {
    expect(evalOf('1 + 2 * 3')).toBe(7);
    expect(evalOf('(1 + 2) * 3')).toBe(9);
    expect(evalOf('8 / 4 / 2')).toBe(1);
  });

  it('makes exponentiation right associative', () => {
    expect(evalOf('2 ^ 3 ^ 2')).toBe(512);
  });

  it('handles unary minus', () => {
    expect(evalOf('-a + 100')).toBe(30);
    expect(evalOf('10 - -5')).toBe(15);
  });

  it('reads unit variables', () => {
    expect(evalOf('a / tc')).toBeCloseTo(70 / 600, 12);
    expect(evalOf('v * (di + dc) / cu')).toBe(6 * 65);
  });

  it('supports functions', () => {
    expect(evalOf('sqrt(16)')).toBe(4);
    expect(evalOf('max(a, di, dc)')).toBe(70);
    expect(evalOf('pow(2, 10)')).toBe(1024);
    expect(evalOf('round(a / 3)')).toBe(23);
  });

  it('expands k and kk suffixes', () => {
    expect(evalOf('2k')).toBe(2000);
    expect(evalOf('1.5kk')).toBe(1_500_000);
  });

  it('accepts typographic operators', () => {
    expect(evalOf('a ÷ tc')).toBeCloseTo(70 / 600, 12);
    expect(evalOf('v × 2')).toBe(12);
  });

  it('reports which variables an expression uses', () => {
    expect(parseFormula('a / (cu * t)', STAT_VARIABLES).variables.sort()).toEqual(['a', 'cu', 't']);
  });

  it('rejects unknown names', () => {
    expect(() => evalOf('a / hp')).toThrow(FormulaError);
    expect(() => evalOf('a / hp')).toThrow(/don.t know the name/i);
  });

  it('rejects unbalanced brackets', () => {
    expect(() => evalOf('a / (di + dc')).toThrow(FormulaError);
    expect(() => evalOf('a) + 1')).toThrow(FormulaError);
  });

  it('rejects an empty expression', () => {
    expect(() => evalOf('   ')).toThrow(/empty/i);
  });

  it('does not execute code', () => {
    // The expression box round-trips through a shareable URL, so anything
    // that smells like JavaScript must be refused rather than run.
    expect(() => evalOf('globalThis')).toThrow(FormulaError);
    expect(() => evalOf('constructor')).toThrow(FormulaError);
    expect(() => evalOf('a; alert(1)')).toThrow(FormulaError);
    expect(() => evalOf('[].constructor')).toThrow(FormulaError);
  });

  it('checks function arity', () => {
    expect(() => evalOf('sqrt(1, 2)')).toThrow(/takes 1 argument/);
    expect(() => evalOf('pow(2)')).toThrow(/takes 2 arguments/);
  });
});
