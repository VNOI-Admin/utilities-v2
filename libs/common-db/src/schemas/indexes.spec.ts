import { FloorPlanSchema } from './floorPlan.schema';
import { RemoteControlScriptSchema } from './remoteControlScript.schema';

const indexesOn = (schema: { indexes(): [Record<string, unknown>, unknown][] }, field: string) =>
  schema.indexes().filter(([keys]) => Object.keys(keys).join() === field);

describe('schema indexes', () => {
  it('declares FloorPlan.code once', () => expect(indexesOn(FloorPlanSchema, 'code')).toHaveLength(1));
  it('declares RemoteControlScript.name once', () =>
    expect(indexesOn(RemoteControlScriptSchema, 'name')).toHaveLength(1));
});
