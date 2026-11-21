import type { Role } from '@/lib/zod/base';
import type { User } from './schemas';

const byName = (a: User, b: User) => a.name.localeCompare(b.name, 'pt-BR');

/** GET /users também traz quem é CLIENTE (login do app); esses não são da equipe. */
export function splitTeam(users: User[]): { active: User[]; inactive: User[] } {
  const staff = users.filter((u) => u.role !== 'CLIENTE');
  return {
    active: staff.filter((u) => u.active).sort(byName),
    inactive: staff.filter((u) => !u.active).sort(byName),
  };
}

/**
 * Espelha as regras da API (UsersService): ADMIN edita qualquer um e troca o
 * papel de outra pessoa; os demais só editam o próprio cadastro. Só ADMIN
 * desativa, e nunca a si mesmo.
 */
export function teamPermissions(actor: { id: string; role: Role }, target: User) {
  const isAdmin = actor.role === 'ADMIN';
  const isSelf = actor.id === target.id;
  return {
    canEdit: isAdmin || isSelf,
    canChangeRole: isAdmin && !isSelf,
    canDeactivate: isAdmin && !isSelf && target.active,
  };
}
