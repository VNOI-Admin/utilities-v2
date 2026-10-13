import { MachineGuard } from '@libs/common/guards/machine.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { PrintingController } from './printing.controller';

describe('PrintingController', () => {
  it('createPrintJob ends its guard chain with MachineGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PrintingController.prototype.createPrintJob).at(-1)).toBe(
      MachineGuard,
    );
  });
});
