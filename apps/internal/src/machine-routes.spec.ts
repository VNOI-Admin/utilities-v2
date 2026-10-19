import { MachineGuard } from '@libs/common/guards/machine.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { ContestController } from './contest/contest.controller';
import { RemoteControlController } from './remote-control/remote-control.controller';

describe.each([
  [ContestController, 'findCurrent'],
  [RemoteControlController, 'getScript'],
  [RemoteControlController, 'agentUpdate'],
] as const)('%p', (controller, handler) => {
  it(`${handler} ends its guard chain with MachineGuard`, () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.prototype[handler]).at(-1)).toBe(MachineGuard);
  });
});
