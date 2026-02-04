import { SetMetadata } from '@nestjs/common';

export const OptionalAccessTokenAuth = () => SetMetadata('access_token_guard.optional', true);

