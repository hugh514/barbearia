import { describe, it, expect } from 'vitest';
import { splitTeam, teamPermissions } from './team';
import type { User } from './schemas';

const user = (id: string, name: string, role: User['role'], active = true): User => ({
  id,
  tenantId: 't',
  name,
  email: `${id}@x.example`,
  role,
  active,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
});

describe('splitTeam', () => {
  it('separa ativos e desativados, cada grupo por nome', () => {
    const { active, inactive } = splitTeam([
      user('b', 'Bruno', 'BARBEIRO'),
      user('x', 'Xavier', 'BARBEIRO', false),
      user('a', 'Ana', 'GERENTE'),
      user('c', 'Caio', 'BARBEIRO', false),
    ]);
    expect(active.map((u) => u.name)).toEqual(['Ana', 'Bruno']);
    expect(inactive.map((u) => u.name)).toEqual(['Caio', 'Xavier']);
  });

  it('cliente com login no app não é da equipe', () => {
    const { active } = splitTeam([user('a', 'Ana', 'GERENTE'), user('j', 'João', 'CLIENTE')]);
    expect(active.map((u) => u.name)).toEqual(['Ana']);
  });
});

describe('teamPermissions', () => {
  const admin = { id: 'adm', role: 'ADMIN' as const };
  const gerente = { id: 'ger', role: 'GERENTE' as const };

  it('admin edita, troca papel e desativa outra pessoa', () => {
    expect(teamPermissions(admin, user('b', 'Bruno', 'BARBEIRO'))).toEqual({
      canEdit: true,
      canChangeRole: true,
      canDeactivate: true,
    });
  });

  it('ninguém desativa a si mesmo nem troca o próprio papel', () => {
    expect(teamPermissions(admin, user('adm', 'Admin', 'ADMIN'))).toEqual({
      canEdit: true,
      canChangeRole: false,
      canDeactivate: false,
    });
  });

  it('quem já está desativado não tem o botão de desativar', () => {
    expect(teamPermissions(admin, user('b', 'Bruno', 'BARBEIRO', false)).canDeactivate).toBe(false);
  });

  it('gerente só edita o próprio nome, como na API', () => {
    expect(teamPermissions(gerente, user('b', 'Bruno', 'BARBEIRO'))).toEqual({
      canEdit: false,
      canChangeRole: false,
      canDeactivate: false,
    });
    expect(teamPermissions(gerente, user('ger', 'Gê', 'GERENTE'))).toEqual({
      canEdit: true,
      canChangeRole: false,
      canDeactivate: false,
    });
  });
});
