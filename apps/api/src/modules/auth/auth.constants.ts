export const BCRYPT_ROUNDS = 12;
export const REFRESH_TOKEN_TTL_SECONDS = 604800; // 7 days
export const PASSWORD_RESET_TTL_SECONDS = 1800; // 30 min

export function refreshTokenKey(
  tenantId: string,
  userId: string,
  jti: string,
): string {
  return `refresh:${tenantId}:${userId}:${jti}`;
}

/** Padrão de chave para varrer todos os refresh tokens de um usuário. */
export function refreshTokenPattern(tenantId: string, userId: string): string {
  return `refresh:${tenantId}:${userId}:*`;
}

export function passwordResetKey(token: string): string {
  return `pwreset:${token}`;
}
