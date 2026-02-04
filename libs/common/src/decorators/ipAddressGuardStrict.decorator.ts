import { SetMetadata } from '@nestjs/common';

export const IpAddressGuardStrict = (strict: boolean) => SetMetadata('ip_address_guard.strict', strict);

