export const BCRYPT_ROUNDS = 12;
export const REFRESH_TOKEN_TTL_SECONDS = 604800; // 7 days

export function refreshTokenKey(
  tenantId: string,
  userId: string,
  jti: string,
): string {
  return `refresh:${tenantId}:${userId}:${jti}`;
}
