import { describe, expect, it } from 'vitest';
import { isTenantSlug, slugFromLink, withTenant } from './tenant-slug';

describe('slugFromLink', () => {
  it('usa o ?b= válido', () => {
    expect(slugFromLink('navalha-centro')).toBe('navalha-centro');
  });

  it('parâmetro repetido usa o primeiro', () => {
    expect(slugFromLink(['a-1', 'b-2'])).toBe('a-1');
  });

  it.each([undefined, '', 'Com Espaço', '../etc', 'a'.repeat(65), '<script>'])(
    'ausente ou inválido %s vira null',
    (b) => {
      expect(slugFromLink(b)).toBeNull();
    },
  );
});

describe('withTenant', () => {
  it('acrescenta o ?b= ao caminho', () => {
    expect(withTenant('/cadastro', 'navalha')).toBe('/cadastro?b=navalha');
  });

  it('sem slug devolve o caminho como está', () => {
    expect(withTenant('/login', null)).toBe('/login');
  });

  it('junta com query que já existe', () => {
    expect(withTenant('/login?from=%2Fplanos', 'navalha')).toBe('/login?from=%2Fplanos&b=navalha');
  });
});

describe('isTenantSlug', () => {
  it('aceita slug minúsculo com hífen', () => {
    expect(isTenantSlug('barbearia-modelo')).toBe(true);
  });
  it.each(['Navalha', 'a b', '-a', '', undefined])('recusa %s', (b) => {
    expect(isTenantSlug(b)).toBe(false);
  });
});
