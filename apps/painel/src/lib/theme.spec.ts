import { describe, expect, it } from 'vitest';
import {
  BRAND_PRESETS,
  DEFAULT_BRAND,
  contrastRatio,
  normalizeHex,
  themeFrom,
} from './theme';

const INK = '#15181c';
const SURFACE_LIGHT = '#ffffff';
const SURFACE_DARK = '#1b1e22';

describe('normalizeHex', () => {
  it('aceita #rrggbb e #rgb, devolve minúsculo com 6 dígitos', () => {
    expect(normalizeHex('#1F4FB8')).toBe('#1f4fb8');
    expect(normalizeHex(' #abc ')).toBe('#aabbcc');
  });

  it('recusa o que não é hex', () => {
    expect(normalizeHex('azul')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('red; background:url(x)')).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });
});

describe('themeFrom', () => {
  it('sem dados usa Cobalto no modo claro', () => {
    const t = themeFrom(null);
    expect(t.mode).toBe('light');
    expect(t.vars['--brand']).toBe(DEFAULT_BRAND.toLowerCase());
  });

  it('hex inválido cai no padrão', () => {
    const t = themeFrom({ brandColor: 'nada', themeMode: 'dark' });
    expect(t.vars['--brand']).toBe(DEFAULT_BRAND.toLowerCase());
    expect(t.mode).toBe('dark');
  });

  it('modo desconhecido cai no claro', () => {
    expect(themeFrom({ themeMode: 'roxo' }).mode).toBe('light');
  });

  it('texto sobre a marca é branco em marca escura e ink em marca clara', () => {
    expect(themeFrom({ brandColor: '#1F4FB8' }).vars['--brand-fg']).toBe('#ffffff');
    expect(themeFrom({ brandColor: '#F5D90A' }).vars['--brand-fg']).toBe(INK);
  });

  it('brand-soft mistura a marca com a surface do modo', () => {
    expect(themeFrom(null).vars['--brand-soft']).toMatch(
      /^color-mix\(in srgb, #1f4fb8 \d+%, var\(--surface\)\)$/,
    );
  });

  it.each(BRAND_PRESETS.map((p) => [p.name, p.hex]))(
    'brand-text de %s tem contraste AA nos dois modos',
    (_name, hex) => {
      const light = themeFrom({ brandColor: hex, themeMode: 'light' });
      const dark = themeFrom({ brandColor: hex, themeMode: 'dark' });
      expect(contrastRatio(light.vars['--brand-text'], SURFACE_LIGHT)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.vars['--brand-text'], SURFACE_DARK)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('marca clara demais escurece o brand-text no modo claro', () => {
    const t = themeFrom({ brandColor: '#F5D90A', themeMode: 'light' });
    expect(t.vars['--brand-text']).not.toBe('#f5d90a');
    expect(contrastRatio(t.vars['--brand-text'], SURFACE_LIGHT)).toBeGreaterThanOrEqual(4.5);
  });

  it('marca que já passa no claro fica como está', () => {
    expect(themeFrom({ brandColor: '#1F4FB8' }).vars['--brand-text']).toBe('#1f4fb8');
  });
});
