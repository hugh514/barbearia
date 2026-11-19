import { User } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash'>;

export function withoutPasswordHash(user: User): SafeUser {
  const result = { ...user };
  delete (result as Partial<User>).passwordHash;
  return result as SafeUser;
}
