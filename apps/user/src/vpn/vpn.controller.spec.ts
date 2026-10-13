import { MachineGuard } from '@libs/common/guards/machine.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { VpnController } from './vpn.controller';

describe('VpnController', () => {
  it.each(['getWireGuardConfig', 'getWireGuardConfigByUsername', 'getWireGuardGuestConfig'] as const)(
    '%s ends its guard chain with MachineGuard',
    (handler) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, VpnController.prototype[handler]).at(-1)).toBe(MachineGuard);
    },
  );
});
