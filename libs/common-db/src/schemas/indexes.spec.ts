import { FIREWALL_PROBE_RESULT_TTL_SECONDS, FirewallProbeResultSchema } from './firewallProbe.schema';
import { FloorPlanSchema } from './floorPlan.schema';
import { MachineNonceSchema } from './machineNonce.schema';
import { LuksRecoverySchema } from './luksRecovery.schema';
import { RemoteControlScriptSchema } from './remoteControlScript.schema';

const indexesOn = (schema: { indexes(): [Record<string, unknown>, unknown][] }, field: string) =>
  schema.indexes().filter(([keys]) => Object.keys(keys).join() === field);

describe('schema indexes', () => {
  it('declares FloorPlan.code once', () => expect(indexesOn(FloorPlanSchema, 'code')).toHaveLength(1));
  it('declares RemoteControlScript.name once', () =>
    expect(indexesOn(RemoteControlScriptSchema, 'name')).toHaveLength(1));
  it('expires MachineNonce documents at expiresAt', () =>
    expect(indexesOn(MachineNonceSchema, 'expiresAt')).toEqual([[{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })]]));
  it('expires FirewallProbeResult documents after the retention window', () =>
    expect(indexesOn(FirewallProbeResultSchema, 'createdAt')).toEqual([
      [{ createdAt: 1 }, expect.objectContaining({ expireAfterSeconds: FIREWALL_PROBE_RESULT_TTL_SECONDS })],
    ]));
  it('declares LuksRecovery.username once', () =>
    expect(indexesOn(LuksRecoverySchema, 'username')).toHaveLength(1));
});
