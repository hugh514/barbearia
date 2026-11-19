/**
 * Tema por barbearia: uma cor de marca e o modo claro/escuro. Funções puras,
 * usadas no servidor (layout raiz) e na prévia da tela de Aparência.
 * As demais cores ficam fixas em globals.css.
 */

export type ThemeMode = 'light' | 'dark';

export const DEFAULT_BRAND = '#1F4FB8';

export const BRAND_PRESETS = [
  { name: 'Cobalto', hex: '#1F4FB8' },
  { name: 'Grafite', hex: '#2B3036' },
  { name: 'Bordô', hex: '#6E1F2A' },
  { name: 'Verde-garrafa', hex: '#1F5A43' },
  { name: 'Petróleo', hex: '#0A6A82' },
  { name: 'Ameixa', hex: '#4B2A5E' },
] as const;

const WHITE = '#ffffff';
const INK = '#15181c';
const SURFACE: Record<ThemeMode, string> = { light: '#ffffff', dark: '#1b1e22' };

/** '#rgb' ou '#rrggbb' (com ou sem espaços) para '#rrggbb' minúsculo; senão null. */
export function normalizeHex(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${h.toLowerCase()}`;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores hex. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(hex: string, target: string, amount: number): string {
  const a = rgb(hex);
  const b = rgb(target);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

/** Marca ajustada até 4.5:1 sobre a surface: escurece no claro, clareia no escuro. */
function readableOn(brand: string, mode: ThemeMode): string {
  const surface = SURFACE[mode];
  const target = mode === 'light' ? '#000000' : WHITE;
  for (let step = 0; step <= 20; step++) {
    const c = mix(brand, target, step * 0.05);
    if (contrastRatio(c, surface) >= 4.5) return c;
  }
  return mode === 'light' ? INK : WHITE;
}

/**
 * Marca usada como fundo de botão, com texto que passe de 4.5:1. Se nem branco
 * nem ink passam, escurece (texto branco) ou clareia (texto ink) aos poucos,
 * pelo caminho mais curto.
 */
function buttonSafe(brand: string): { brand: string; fg: string } {
  for (let step = 0; step <= 20; step++) {
    const darker = mix(brand, '#000000', step * 0.05);
    if (contrastRatio(WHITE, darker) >= 4.5) return { brand: darker, fg: WHITE };
    const lighter = mix(brand, WHITE, step * 0.05);
    if (contrastRatio(INK, lighter) >= 4.5) return { brand: lighter, fg: INK };
  }
  return { brand: INK, fg: WHITE };
}

export interface TenantTheme {
  mode: ThemeMode;
  vars: Record<'--brand' | '--brand-fg' | '--brand-soft' | '--brand-text', string>;
}

export function themeFrom(
  settings: { brandColor?: unknown; themeMode?: unknown } | null | undefined,
): TenantTheme {
  const chosen = normalizeHex(settings?.brandColor) ?? DEFAULT_BRAND.toLowerCase();
  const mode: ThemeMode = settings?.themeMode === 'dark' ? 'dark' : 'light';
  const { brand, fg } = buttonSafe(chosen);
  return {
    mode,
    vars: {
      '--brand': brand,
      '--brand-fg': fg,
      '--brand-soft': `color-mix(in srgb, ${brand} ${mode === 'dark' ? 24 : 10}%, var(--surface))`,
      '--brand-text': readableOn(brand, mode),
    },
  };
}
