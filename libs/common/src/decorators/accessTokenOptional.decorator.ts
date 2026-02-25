import { SetMetadata } from '@nestjs/common';

/**
 * When applied, AccessTokenGuard will pass through (return true) if no token is present,
 * allowing subsequent guards to handle authentication.
 * Use this when combining AccessTokenGuard with another guard using OR logic.
 */
export const AccessTokenOptional = () => SetMetadata('accessToken.optional', true);
